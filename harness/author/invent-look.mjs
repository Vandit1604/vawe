import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { themeErrors } from '../../core/registry/theme-contract.js';
import { bgBlock, mix, contrast, relLum, parseHex } from '../lib/theme-bg.mjs';
import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';
import { migrateOne } from './migrate-themes.mjs';

function asTokenFile(theme, dest) {
  const { next, ok, err } = migrateOne(theme);
  if (!ok) die(`${dest}: could not convert to a token file: ${err}`);
  return next;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const die = (msg) => { console.error(`invent-look: ${msg}`); process.exit(1); };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fnv = (str, h = 0x811c9dc5) => { for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0; return h >>> 0; };
const streamSeed = (...parts) => fnv(parts.join('|'));
function shuffled(list, seed) {
  const rnd = mulberry32(seed); const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const f2s = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const s2f = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
function oklabToLinear(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}
const inGamut = ([r, g, b]) => [r, g, b].every((v) => v >= -0.0002 && v <= 1.0002);
/** oklch(L 0..1, C 0..~0.37, H deg) → #rrggbb, chroma reduced until it fits sRGB rather than clipped. */
function oklch(L, C, H) {
  const rad = (H * Math.PI) / 180;
  let c = C;
  let lin = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad));
  for (let i = 0; i < 40 && !inGamut(lin); i++) { c *= 0.94; lin = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad)); }
  const hx = (v) => Math.max(0, Math.min(255, Math.round(f2s(Math.max(0, Math.min(1, v))) * 255))).toString(16).padStart(2, '0');
  return `#${hx(lin[0])}${hx(lin[1])}${hx(lin[2])}`;
}
const toOklab = (hex) => { const [r, g, b] = parseHex(hex).map((v) => s2f(v / 255)); return linearToOklab(r, g, b); };
/** Perceptual distance, scaled x100 so the numbers read like a familiar ΔE. ~2 is a hairline, ~15 is "two different colours". */
const dE = (a, b) => { const A = toOklab(a), B = toOklab(b); return 100 * Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const rgba = (hex, a) => { const [r, g, b] = parseHex(hex); return `rgba(${r},${g},${b},${a})`; };

const FIELDS = ['SUBJECT', 'DATA', 'PAYOFF', 'AUDIENCE', 'FEELING'];
function readBrief(file) {
  if (!fs.existsSync(file)) die(`no storyboard at ${file}`);
  const raw = fs.readFileSync(file, 'utf8');
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');           // frontmatter (threads:/object:) is structure, not brief
  const prose = body.replace(/```[\s\S]*?```/g, ' ');               // fenced code is never the subject
  const brief = {};
  for (const f of FIELDS) {
    const m = prose.match(new RegExp(`^[\\s>*_#]*${f}\\s*[:\\-|]\\s*(.+)$`, 'im'));
    if (m) brief[f] = m[1].replace(/[*_|`]/g, '').trim();
  }
  const title = (prose.match(/^#\s+(.+)$/m) || [])[1];
  if (!brief.SUBJECT) {
    if (!title) die(`${path.relative(ROOT, file)} carries no SUBJECT line and no "# " title, so there is nothing to invent a look FOR. Add a SUBJECT line (CLAUDE.md, "THE BRIEF").`);
    brief.SUBJECT = title.replace(/[*_`]/g, '').trim();
  }
  return { brief, title: title || brief.SUBJECT, prose, file };
}

const STOP = new Set(`the a an and or but of to in on at by for from with without into over under is are was
were be been being it its this that these those as if then than so such not no nor only own same too very
can will just should now what which who whom when where why how all any both each few more most other some
have has had do does did done get got make makes made say says said one two three first last next also
about after again against because before between during through until while your you they them he she his
her their our we us i me my mine here there does doing done up down out off again further once`.split(/\s+/));
const JARGON = new Set(`beat beats layer layers frame frames scene scenes theme themes film films video
videos camera cut cuts render renders json canvas motion palette colour color font fonts type shot shots
second seconds portrait landscape storyboard payoff hook subject audience feeling data bg text accent
make node script tool gate check rule rules
back front left right side wide close still open into onto whole huge small large real full`.split(/\s+/));
function mineNouns(key, body, seed, want) {
  const score = new Map();
  const add = (text, weight) => {
    for (const w of String(text).toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []) {
      const k = w.replace(/['-]+$/, '');
      if (k.length < 4 || STOP.has(k) || JARGON.has(k)) continue;
      score.set(k, (score.get(k) || 0) + weight);
    }
  };
  add(body, 1);
  add(key, 3);
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0])).slice(0, 16).map(([w]) => w);
  if (ranked.length < want) die(`the storyboard has only ${ranked.length} usable nouns and ${want} candidates need one each. Write more of the brief, or lower --count.`);
  return shuffled(ranked, seed).slice(0, want);
}
/** The lines where a storyboard says what it is ABOUT: title, brief fields, headings, bold, table cells. */
function keyText(prose, brief, title) {
  const parts = [title, ...Object.values(brief)];
  for (const re of [/^#{1,6}\s+(.+)$/gm, /\*\*(.+?)\*\*/g, /^\|(.+)\|$/gm]) for (const m of prose.matchAll(re)) parts.push(m[1]);
  return parts.join(' \n ');
}

const STANCES = [
  {
    key: 'ignition', world: 'ignition', family: 'heat', dominance: 'dark', arc: [22, 62],
    ground: { L: 0.17, C: 0.018, dh: -14 }, accent: { L: 0.72, C: 0.21 }, textL: 0.95, textC: 0.012,
    texture: 'halation: the accent bleeds a little light into the ground, and nothing else glows',
    bgPreset: 'brandglow', story: (n) => `${n} starts cold and catches fire, so the one warm colour IS the event`,
    motion: { easing: 'easeOutExpo', bounce: 0.10, settle: 0.5, enter: 30, durationScale: 0.8, stagger: 0.03, exitRatio: 0.45 },
    cues: ['fire', 'burn', 'launch', 'surge', 'growth', 'energy', 'loud', 'urgent', 'streak'],
  },
  {
    key: 'instrument', world: 'instrument', family: 'cold', dominance: 'light', arc: [198, 252],
    ground: { L: 0.965, C: 0.006, dh: 0 }, accent: { L: 0.55, C: 0.15 }, textL: 0.24, textC: 0.014,
    texture: 'no grain at all: hairlines, tabular figures and a lot of air. The flaw would be visible',
    bgPreset: 'paperDots', story: (n) => `${n} is measured rather than felt, and the frame behaves like a calibrated instrument`,
    motion: { easing: 'easeOutQuart', bounce: 0.02, settle: 0.45, enter: 26, durationScale: 0.9, stagger: 0.04, exitRatio: 0.6 },
    cues: ['precise', 'data', 'measure', 'clinical', 'technical', 'accurate', 'audit', 'proof'],
  },
  {
    key: 'residue', world: 'residue', family: 'earth', dominance: 'light', arc: [46, 84],
    ground: { L: 0.905, C: 0.028, dh: 6 }, accent: { L: 0.52, C: 0.13 }, textL: 0.28, textC: 0.02,
    texture: 'heavy paper: visible grain, ink that sits ON the surface, edges slightly soft',
    bgPreset: 'paper', story: (n) => `${n} has been handled before, so the world is worn, domestic and a little tired`,
    motion: { easing: 'easeInOutSine', bounce: 0.05, settle: 0.7, enter: 44, durationScale: 1.05, stagger: 0.06, exitRatio: 0.8 },
    cues: ['worn', 'home', 'craft', 'slow', 'hand', 'warm', 'old', 'archive', 'memory', 'bakery'],
  },
  {
    key: 'signal', world: 'signal', family: 'loud', dominance: 'light', arc: [286, 344],
    ground: { L: 0.72, C: 0.16, dh: 0 }, accent: { L: 0.18, C: 0.04 }, textL: 0.16, textC: 0.03,
    texture: 'flat and printed: no gradient, no glow, colour laid down like vinyl',
    bgPreset: 'accentPlain', story: (n) => `${n} is shouted, phone-first, and the colour arrives before any word does`,
    motion: { easing: 'easeOutBack', bounce: 0.28, settle: 0.5, enter: 22, durationScale: 0.7, stagger: 0.025, exitRatio: 0.35 },
    cues: ['loud', 'social', 'tiktok', 'reels', 'shorts', 'young', 'meme', 'fast', 'shout', 'bold'],
  },
  {
    key: 'nocturne', world: 'nocturne', family: 'deep', dominance: 'dark', arc: [196, 268],
    ground: { L: 0.145, C: 0.028, dh: 8 }, accent: { L: 0.86, C: 0.10 }, textL: 0.93, textC: 0.01,
    texture: 'soft bloom in the darks, everything a stop under, highlights allowed to smear',
    bgPreset: 'deep', story: (n) => `${n} happens after hours, and the film is quiet enough to hear it`,
    motion: { easing: 'easeInOutCubic', bounce: 0.04, settle: 0.8, enter: 52, durationScale: 1.15, stagger: 0.07, exitRatio: 0.7 },
    cues: ['night', 'quiet', 'calm', 'alone', 'deep', 'silent', 'sleep', 'focus', 'still'],
  },
  {
    key: 'civic', world: 'record', family: 'print', dominance: 'light', arc: [352, 24],
    ground: { L: 0.945, C: 0.012, dh: 60 }, accent: { L: 0.48, C: 0.17 }, textL: 0.20, textC: 0.008,
    texture: 'offset print: one plate slightly out of register, rules and stamps rather than shadows',
    bgPreset: 'paperShapes', story: (n) => `${n} is presented as a public record, stamped and filed rather than sold`,
    motion: { easing: 'snap', bounce: 0.18, settle: 0.55, enter: 28, durationScale: 0.85, stagger: 0.05, exitRatio: 0.5 },
    cues: ['record', 'public', 'official', 'report', 'history', 'ledger', 'document', 'receipt'],
  },
  {
    key: 'vernacular', world: 'workshop', family: 'made', dominance: 'dark', arc: [88, 148],
    ground: { L: 0.24, C: 0.035, dh: -30 }, accent: { L: 0.78, C: 0.17 }, textL: 0.94, textC: 0.015,
    texture: 'workbench: coarse grain, taped edges, a hand-drawn arrow allowed',
    bgPreset: 'shapes', story: (n) => `${n} was made by somebody, and the film keeps the tool marks in`,
    motion: { easing: 'spring-bouncy', bounce: 0.45, settle: 0.6, enter: 36, durationScale: 0.95, stagger: 0.055, exitRatio: 0.55 },
    cues: ['build', 'make', 'ship', 'diy', 'workshop', 'garage', 'indie', 'rough', 'playful', 'chaos'],
  },
  {
    key: 'vacuum', world: 'vacuum', family: 'mono', dominance: 'dark', arc: [0, 360],
    ground: { L: 0.13, C: 0.004, dh: 0 }, accent: { L: 0.90, C: 0.03 }, textL: 0.96, textC: 0.004,
    texture: 'nothing: no grain, no glow, no gradient. One material, lit once',
    bgPreset: 'plain', story: (n) => `${n} is given premium restraint, and the only luxury on screen is the empty part`,
    motion: { easing: 'springEase', bounce: 0.06, settle: 0.75, enter: 40, durationScale: 1.1, stagger: 0.05, exitRatio: 0.65 },
    cues: ['premium', 'luxury', 'restraint', 'minimal', 'expensive', 'quiet', 'clean', 'serious'],
  },
  {
    key: 'chlorophyll', world: 'bloom', family: 'bio', dominance: 'dark', arc: [128, 176],
    ground: { L: 0.155, C: 0.022, dh: 22 }, accent: { L: 0.82, C: 0.20 }, textL: 0.94, textC: 0.012,
    texture: 'wet: everything reads slightly luminous, as though lit from inside the surface',
    bgPreset: 'aurora', story: (n) => `${n} is treated as something alive and growing rather than something built`,
    motion: { easing: 'easeOutSine', bounce: 0.08, settle: 0.85, enter: 46, durationScale: 1.2, stagger: 0.065, exitRatio: 0.75 },
    cues: ['grow', 'living', 'organic', 'nature', 'health', 'green', 'bloom', 'seed', 'wild'],
  },
];

function buildPalette(stance, hue) {
  const dark = stance.dominance === 'dark';
  const gH = (hue + stance.ground.dh + 360) % 360;
  const step = (dL) => oklch(Math.max(0.02, Math.min(0.99, stance.ground.L + (dark ? dL : -dL))), stance.ground.C, gH);
  const bg = step(0);
  const text = oklch(stance.textL, stance.textC, gH);
  const accent = oklch(stance.accent.L, stance.accent.C, hue);
  const lineHex = dark ? oklch(Math.min(0.99, stance.ground.L + 0.35), stance.ground.C, gH) : oklch(Math.max(0.02, stance.ground.L - 0.35), stance.ground.C, gH);
  const warmAccent = hue < 60 || hue > 340;
  const down = oklch(0.58, 0.18, warmAccent ? 8 : 30);
  return {
    bg,
    bg2: step(0.035),
    surface: step(0.055),
    surface2: step(0.09),
    line: rgba(lineHex, dark ? 0.10 : 0.14),
    lineStrong: rgba(lineHex, dark ? 0.22 : 0.28),
    text,
    text2: mix(text, bg, 0.32),
    dim: mix(text, bg, 0.55),
    ink: text,
    accent,
    accentDim: rgba(accent, 0.16),
    accentGlow: rgba(accent, 0.45),
    up: accent,
    down,
    _lineHex: lineHex, // dropped before writing; bgBlock needs a solid line colour, palette.line is rgba
  };
}

const CHIP_MIN = 16;
const chipDistance = (a, b) => 0.55 * dE(a.palette.bg, b.palette.bg) + 0.45 * dE(a.palette.accent, b.palette.accent);

const LINEAGE_SUFFIXES = /\s+(sans|serif|slab|mono|display|text|condensed|narrow|expanded|extended|semicondensed|semiexpanded|looped|rounded|deck|caption|variable|flex|extra|pro|neue|new|code|micro|sc|tc|hk|jp|kr|thai|arabic|hebrew|devanagari|cyrillic|greek|georgian|armenian|khmer|lao|myanmar|tamil|telugu|bengali|sinhala|ethiopic|naskh|kufi|two|one)$/i;
const lineage = (family) => {
  let s = String(family).trim();
  for (let i = 0; i < 5; i++) s = s.replace(LINEAGE_SUFFIXES, '');   // "IBM Plex Sans Thai Looped" → "IBM Plex"
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const fontCache = new Map();
function discover(seed, category, count) {
  const key = `${seed}|${category}|${count}`;
  if (fontCache.has(key)) return fontCache.get(key);
  let out;
  try {
    out = execFileSync('node', [path.join(ROOT, 'harness/author/fonts-discover.mjs'), '--seed', String(seed), '--count', String(count), '--category', category, '--json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  } catch (e) {
    die(`fonts-discover failed for category "${category}": ${String(e.stderr || e.message).trim()}\n  This tool has no font list of its own on purpose: a hardcoded fallback would reinstate the default it exists to remove.`);
  }
  let parsed;
  try { parsed = JSON.parse(out); } catch (e) { die(`fonts-discover --json did not return JSON (${e.message})`); }
  fontCache.set(key, parsed.fonts);
  return parsed.fonts;
}
/** A pool of families in `category`, with every lineage of a used or banned face removed. */
function pool(seed, category, want, bannedLineages) {
  const raw = discover(seed, category, Math.max(want * 4, 16));
  const kept = raw.filter((f) => !bannedLineages.has(lineage(f.family)));
  if (kept.length < want) die(`only ${kept.length} ${category} faces survive the lineage ban, fewer than the ${want} needed. Raise --seed or lower --count.`);
  return kept;
}

const src = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--')) || flag('--sb', null);
if (!src) die('usage: node harness/author/invent-look.mjs <storyboard.md> [--seed n] [--count 5] [--pick n --name theme] [--json]');
const seed = Number(flag('--seed', '1'));
if (!Number.isInteger(seed)) die(`--seed must be an integer, got ${JSON.stringify(flag('--seed', '1'))}`);
const count = Number(flag('--count', '5'));
if (!Number.isInteger(count) || count < 4 || count > 6) die(`--count must be 4 to 6 (fewer is a menu of one idea, more is a menu), got ${JSON.stringify(flag('--count', '5'))}`);
const pick = flag('--pick', null);
if (pick != null && !(Number.isInteger(Number(pick)) && Number(pick) >= 1 && Number(pick) <= count)) die(`--pick must be 1..${count} (the candidate count), got ${JSON.stringify(pick)}`);
const asJson = has('--json');

const { brief, title, prose, file } = readBrief(path.resolve(src));

const fingerprint = fnv(`${brief.SUBJECT}\n${title}`.toLowerCase().replace(/[^a-z0-9 ]/g, ''));
const resolved = streamSeed(seed, fingerprint);

const hay = `${Object.values(brief).join(' ')} ${prose}`.toLowerCase();
const cueScore = (s) => s.cues.reduce((n, c) => n + (hay.includes(c) ? 1 : 0), 0);
const ordered = shuffled(STANCES, resolved).sort((a, b) => cueScore(b) - cueScore(a));
const chosen = [];
const families = new Set();
for (const pass of [0, 1]) {
  for (const s of ordered) {
    if (chosen.length >= count || chosen.includes(s)) continue;
    if (pass === 0 && families.has(s.family)) continue;      // first pass: one per family
    chosen.push(s); families.add(s.family);
  }
}
const doms = new Set(chosen.map((s) => s.dominance));
if (doms.size < 2) {
  const other = ordered.find((s) => !chosen.includes(s) && s.dominance !== chosen[0].dominance);
  if (!other) die('the stance table cannot produce both a light and a dark candidate. That is a bug in STANCES, not in the brief.');
  chosen[chosen.length - 1] = other;
}

const hueIn = (stance, r) => { const [a, b] = stance.arc; const span = ((b - a) + 360) % 360 || 360; return (a + r * span) % 360; };
const collisions = [];
const candidates = [];
const replacements = [];
const spare = ordered.filter((s) => !chosen.includes(s));
for (const first of chosen) {
  let cand = null, stance = first;
  for (const attemptStance of [first, ...spare]) {
    stance = attemptStance;
    const rnd = mulberry32(streamSeed(resolved, stance.key));
    for (let attempt = 0; attempt < 12 && !cand; attempt++) {
      const hue = hueIn(stance, rnd());
      const lift = attempt >= 6 ? (attempt - 5) * 0.05 : 0;
      const s2 = lift ? { ...stance, ground: { ...stance.ground, L: Math.max(0.08, Math.min(0.97, stance.ground.L + (stance.dominance === 'dark' ? lift : -lift))) } } : stance;
      const trial = { stance, hue, palette: buildPalette(s2, hue) };
      const clash = candidates.find((c) => chipDistance(c, trial) < CHIP_MIN);
      if (!clash) { cand = trial; break; }
      collisions.push({ stance: stance.key, against: clash.stance.key, distance: +chipDistance(clash, trial).toFixed(1), attempt: attempt + 1 });
    }
    if (cand) break;
  }
  if (!cand) die(`no stance in the table clears the 14px chip gate (min ΔE ${CHIP_MIN}) against the ${candidates.length} candidate(s) already generated. Lower --count, or widen the STANCES table.`);
  if (stance !== first) {
    replacements.push({ dropped: first.key, replacedBy: stance.key });
    spare.splice(spare.indexOf(stance), 1);
  }
  candidates.push(cand);
}

const bannedLineages = new Set();
for (const f of fs.readdirSync(path.join(ROOT, 'themes')).filter((n) => n.endsWith('.json'))) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', f), 'utf8'));
  let t; try { t = isTokenFile(raw) ? expandTheme(raw, { parseColor, colorAlpha }) : raw; } catch { continue; }
  for (const v of Object.values(t.type || {})) if (typeof v === 'string' && v.trim()) bannedLineages.add(lineage(v));
}
for (const b of ['Inter', 'Poppins', 'Playfair Display', 'Syne', 'Space Grotesk', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Nunito', 'Oswald']) bannedLineages.add(lineage(b));

const DISPLAY_CATEGORY = { ignition: 'display', instrument: 'sans-serif', residue: 'serif', signal: 'display', nocturne: 'serif', civic: 'serif', vernacular: 'display', vacuum: 'sans-serif', chlorophyll: 'display' };
const takenLineage = new Set();
const takeFace = (category, streamKey) => {
  const list = pool(resolved, category, count, bannedLineages);
  for (const f of shuffled(list, streamSeed(resolved, streamKey))) {
    if (takenLineage.has(lineage(f.family))) continue;
    takenLineage.add(lineage(f.family));
    return f;
  }
  die(`ran out of distinct ${category} faces for ${count} candidates`);
};

const nouns = mineNouns(keyText(prose, brief, title), prose, streamSeed(resolved, 'nouns'), count);
candidates.forEach((c, i) => {
  const displayCat = DISPLAY_CATEGORY[c.stance.key];
  c.type = {
    display: takeFace(displayCat, `display|${c.stance.key}`),
    body: takeFace('sans-serif', `body|${c.stance.key}`),
    mono: takeFace('monospace', `mono|${c.stance.key}`),
  };
  c.noun = nouns[i];
  c.name = `${c.noun}-${c.stance.world}`;
  c.sentence = c.stance.story(c.noun);
  c.texture = c.stance.texture;
  c.contrast = { text: +contrast(c.palette.text, c.palette.bg).toFixed(1), accent: +contrast(c.palette.accent, c.palette.bg).toFixed(1) };
});

function buildTheme(c, name) {
  const light = relLum(c.palette.bg) > 0.4;
  const P = { ...c.palette };
  const lineHex = P._lineHex; delete P._lineHex;
  const gradient = light
    ? [P.bg, mix(P.bg, P.accent, 0.05), mix(P.bg, '#000000', 0.06)]
    : [P.bg, mix(P.bg, P.accent, 0.06), mix(P.bg, '#000000', 0.45)];
  return {
    name,
    note: `INVENTED (not selected) by harness/author/invent-look.mjs from ${path.relative(ROOT, file)}, seed ${seed}. Stance "${c.stance.key}": ${c.sentence}. Texture: ${c.texture}.`,
    palette: P,
    gradient,
    type: {
      sans: c.type.body.family,
      serif: c.type.display.family,
      mono: c.type.mono.family,
      num: c.type.mono.family,
    },
    motion: c.stance.motion,
    bg: bgBlock({ ...P, line: lineHex }, light),
    bgDefault: { preset: c.stance.bgPreset },
    vars: {
      '--ink': P.text, '--paper': P.bg, '--muted': P.text2, '--em': P.accent,
      '--on-light': light ? P.text : P.bg, '--on-dark': light ? P.bg : P.text,
      '--border': lineHex, '--accent-soft': P.accentDim,
    },
    invented: {
      tool: 'harness/author/invent-look.mjs',
      storyboard: path.relative(ROOT, file),
      subject: brief.SUBJECT,
      seed, resolvedSeed: resolved, subjectFingerprint: fingerprint,
      stance: c.stance.key, story: c.sentence, texture: c.texture,
      fonts: {
        display: { family: c.type.display.family, category: c.type.display.category, variable: c.type.display.variable, weights: c.type.display.weights },
        body: { family: c.type.body.family, category: c.type.body.category, variable: c.type.body.variable, weights: c.type.body.weights },
        mono: { family: c.type.mono.family, category: c.type.mono.category, variable: c.type.mono.variable, weights: c.type.mono.weights },
      },
      chipGate: { metric: 'OKLab dE*100, 0.62*ground + 0.38*accent', min: CHIP_MIN },
      generated: new Date().toISOString().slice(0, 10),
    },
  };
}

const slug = (fam) => fam.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const fileName = (fam) => fam.replace(/[^A-Za-z0-9]/g, '') + '.woff2';
const isWoff2 = (b) => b.length > 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
async function vendor(face) {
  const s = slug(face.family);
  const w = face.weights.includes(400) ? 400 : face.weights[0] || 400;
  const urls = [
    face.variable && `https://cdn.jsdelivr.net/npm/@fontsource-variable/${s}/files/${s}-latin-wght-normal.woff2`,
    `https://cdn.jsdelivr.net/npm/@fontsource/${s}/files/${s}-latin-${w}-normal.woff2`,
  ].filter(Boolean);
  const tried = [];
  for (const url of urls) {
    let res;
    try { res = await fetch(url, { redirect: 'follow' }); } catch (e) { tried.push(`${url}, ${e.message}`); continue; }
    if (!res.ok) { tried.push(`${url}: HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isWoff2(buf)) { tried.push(`${url}, not a woff2 file`); continue; }
    const dest = path.join(ROOT, 'assets/fonts', fileName(face.family));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return { family: face.family, file: fileName(face.family), url, variable: url.includes('-variable/'), weight: w, kb: Math.round(buf.length / 1024) };
  }
  die(`cannot vendor "${face.family}": the theme would name a face with no @font-face and render in a substitute.\n  tried:\n    ${tried.join('\n    ')}`);
}

const FONT_MANIFEST = path.join(ROOT, 'assets/fonts/invented.json');
const TOKENS = path.join(ROOT, 'core/tokens.css');
const MARK = '/* ---- invented faces (generated by harness/author/invent-look.mjs) ---- */';
function register(vendored) {
  let css = fs.readFileSync(TOKENS, 'utf8');
  const added = [];
  for (const v of vendored) {
    if (css.includes(`font-family: '${v.family}'`)) continue;      // already registered by hand or by an earlier run
    const weight = v.variable ? '100 900' : String(v.weight);
    added.push(`@font-face { font-family: '${v.family}'; font-weight: ${weight}; font-display: block; src: url('/assets/fonts/${v.file}') format('woff2'); }`);
  }
  if (added.length) {
    if (!css.includes(MARK)) css += `\n${MARK}\n/* the woff2 files are gitignored; assets/fonts/invented.json lets `+'`make gen X=fonts`'+` re-fetch them. */\n`;
    css = css.trimEnd() + '\n' + added.join('\n') + '\n';
    fs.writeFileSync(TOKENS, css);
  }
  const manifest = fs.existsSync(FONT_MANIFEST) ? JSON.parse(fs.readFileSync(FONT_MANIFEST, 'utf8')) : {};
  for (const v of vendored) manifest[v.file] = { family: v.family, url: v.url, license: 'OFL/Apache (Google Fonts via Fontsource)' };
  fs.writeFileSync(FONT_MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  return added.length;
}

const OUT = '/tmp/invent-look';
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function specimen(c, theme) {
  const fams = [c.type.display, c.type.body, c.type.mono].map((f) => `family=${f.family.replace(/\s+/g, '+')}:wght@400;700`).join('&');
  const headline = (brief.PAYOFF || title).split(/\s+/).slice(0, 5).join(' ')
    .replace(/[\s·,:;-]*(?:\d+)?[\s·,:;-]*$/, '').replace(/\s+(a|an|the|and|of|to|in|on|is|are|that|with|by|for)$/i, '');
  const figures = (keyText(prose, brief, title).match(/\b\d[\d,.]{1,9}\b/g) || []);
  const figure = figures.find((n) => !/^(19|20)\d\d$/.test(n)) || figures[0] || String(count);
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fams}&display=block">
<div style="width:1180px;padding:56px 60px;background:var(--bg);border:1px solid var(--line);border-radius:20px;font-family:var(--font-sans)">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:34px">
    <div style="font-family:var(--font-mono);font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)">${esc(c.name)}</div>
    <div style="font-family:var(--font-mono);font-size:14px;color:var(--dim)">${esc(c.stance.key)} · ${esc(c.type.display.family)} + ${esc(c.type.body.family)}</div>
  </div>
  <div style="font-family:var(--font-serif);font-size:88px;line-height:.98;letter-spacing:-.03em;color:var(--text);margin-bottom:22px">${esc(headline)}</div>
  <div style="font-size:22px;line-height:1.5;color:var(--text-2);max-width:760px;margin-bottom:34px">${esc(c.sentence)}.</div>
  <div style="display:flex;gap:26px;align-items:center;margin-bottom:30px">
    <div style="background:var(--accent);color:var(--bg);font-size:19px;font-weight:700;padding:13px 26px;border-radius:8px">${esc(c.noun)}</div>
    <div style="font-family:var(--font-num);font-size:46px;color:var(--accent);letter-spacing:-.02em">${esc(figure)}</div>
    <div style="flex:1;height:1px;background:var(--line-strong)"></div>
    <div style="background:var(--surface-2);color:var(--text-2);border:1px solid var(--line);font-size:15px;padding:11px 20px;border-radius:8px">${esc(c.texture.split(':')[0])}</div>
  </div>
  <div style="display:flex;gap:7px;align-items:center">
    ${['bg', 'surface', 'surface2', 'line', 'text2', 'text', 'accent', 'down'].map((k) => `<div title="${k}" style="width:14px;height:14px;border-radius:3px;background:${theme.palette[k]};outline:1px solid rgba(128,128,128,.35)"></div>`).join('')}
    <div style="font-family:var(--font-mono);font-size:13px;color:var(--dim);margin-left:12px">14px chips · the distinctness test, at the size it is judged</div>
  </div>
</div>`;
}

if (asJson) {
  console.log(JSON.stringify({
    storyboard: path.relative(ROOT, file), brief, seed, resolvedSeed: resolved, subjectFingerprint: fingerprint,
    chipGate: { min: CHIP_MIN, collisions, replacements },
    pairwise: candidates.flatMap((a, i) => candidates.slice(i + 1).map((b) => ({ a: a.name, b: b.name, chipDistance: +chipDistance(a, b).toFixed(1) }))),
    candidates: candidates.map((c) => ({
      name: c.name, stance: c.stance.key, story: c.sentence, texture: c.texture, hue: +c.hue.toFixed(1),
      dominance: c.stance.dominance, bgPreset: c.stance.bgPreset, contrast: c.contrast,
      palette: (({ _lineHex, ...p }) => p)(c.palette),
      type: { display: c.type.display.family, body: c.type.body.family, mono: c.type.mono.family },
    })),
  }, null, 2));
  process.exit(0);
}

if (pick != null) {
  const c = candidates[Number(pick) - 1];
  const name = flag('--name', c.name);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) die(`--name must be lowercase letters, digits and dashes, got ${JSON.stringify(name)}`);
  const dest = path.join(ROOT, 'themes', `${name}.json`);
  if (fs.existsSync(dest) && !has('--force')) die(`themes/${name}.json already exists. Pass --name <other> or --force.`);
  const vendored = [];
  for (const face of [c.type.display, c.type.body, c.type.mono]) vendored.push(await vendor(face));
  const registered = register(vendored);
  const theme = buildTheme(c, name);
  const errs = themeErrors(theme);
  if (errs.length) die(`the invented theme is incomplete: missing ${errs.join(', ')}. That is a bug in this generator.`);
  fs.writeFileSync(dest, JSON.stringify(asTokenFile(theme, dest), null, 2) + '\n');
  console.log(`✓ invented themes/${name}.json: stance "${c.stance.key}", ${c.stance.dominance}-first`);
  console.log(`  story: ${c.sentence}`);
  console.log(`  bg ${theme.palette.bg} · accent ${theme.palette.accent} (${c.contrast.accent}:1) · text (${c.contrast.text}:1)`);
  console.log(`  type: ${theme.type.serif} (display) + ${theme.type.sans} (body) + ${theme.type.mono} (mono)`);
  console.log(`  fonts: ${vendored.map((v) => `${v.family} ${v.kb}KB`).join(' · ')} → assets/fonts/, ${registered} new @font-face in core/tokens.css`);
  if (c.contrast.text < 4.5) console.warn(`  ⚠ text contrast ${c.contrast.text}:1 is below AA. Fix it in the theme before you ship it.`);
  console.log(`  see it: make preview HTML=<any fragment> THEME=${name}`);
  process.exit(0);
}

fs.mkdirSync(path.join(OUT, 'themes'), { recursive: true });
const slugName = path.basename(file).replace(/\.(storyboard\.)?md$/, '');
const shots = [];
for (const [i, c] of candidates.entries()) {
  const theme = buildTheme(c, c.name);
  const errs = themeErrors(theme);
  if (errs.length) die(`candidate ${i + 1} (${c.name}) is an incomplete theme, missing ${errs.join(', ')}. That is a bug in this generator.`);
  const tf = path.join(OUT, 'themes', `${c.name}.json`);
  fs.writeFileSync(tf, JSON.stringify(asTokenFile(theme, tf), null, 2) + '\n');
  const frag = path.join(OUT, `${c.name}.html`);
  fs.writeFileSync(frag, specimen(c, theme));
  const png = path.join(OUT, `${c.name}.png`);
  try {
    execFileSync('node', [path.join(ROOT, 'harness/author/preview-fragment.mjs'), frag, '--theme-file', tf, '--out', png, '--w', '1180', '--no-detect'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    die(`preview-fragment could not photograph candidate "${c.name}", ${String(e.stderr || e.message).trim()}`);
  }
  shots.push({ c, png, theme });
  console.log(`  ${i + 1}. ${c.name}  ·  ${c.stance.key}  ·  ${c.type.display.family} + ${c.type.body.family}`);
}

const sheet = path.join(OUT, `${slugName}-sheet.html`);
fs.writeFileSync(sheet, `<meta charset="utf-8"><title>invent-look · ${esc(slugName)}</title>
<body style="margin:0;background:#101113;color:#e8e6e3;font:15px/1.5 ui-sans-serif,system-ui;padding:40px">
<h1 style="font-size:28px;margin:0 0 6px">${esc(title)}</h1>
<div style="color:#8b8b8b;margin-bottom:6px">${esc(brief.SUBJECT)}</div>
<div style="color:#6f6f6f;font:13px ui-monospace,monospace;margin-bottom:30px">seed ${seed} → resolved ${resolved} · ${candidates.length} candidates · 14px chip gate min ΔE ${CHIP_MIN}${collisions.length ? ` · ${collisions.length} collision(s) regenerated` : ''}</div>
${shots.map(({ c, png }, i) => `<section style="margin-bottom:34px">
  <div style="display:flex;gap:14px;align-items:baseline;margin-bottom:10px">
    <div style="font:700 19px ui-sans-serif">${i + 1}. ${esc(c.name)}</div>
    <div style="color:#8b8b8b">${esc(c.sentence)}</div>
  </div>
  <div style="color:#6f6f6f;font:13px ui-monospace,monospace;margin-bottom:10px">${esc(c.stance.dominance)}-first · texture: ${esc(c.texture)} · bg preset ${esc(c.stance.bgPreset)} · text ${c.contrast.text}:1 · accent ${c.contrast.accent}:1</div>
  <img src="file://${png}" style="width:100%;max-width:1180px;border-radius:12px;display:block">
</section>`).join('')}
<div style="color:#6f6f6f;font:13px ui-monospace,monospace">pick one:  make invent-look SB=${esc(path.relative(ROOT, file))} SEED=${seed} PICK=&lt;n&gt; NAME=&lt;theme&gt;</div>
</body>`);

const sheetPng = path.join(OUT, `${slugName}-sheet.png`);
{
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 1200, deviceScaleFactor: 1 });
  await page.goto(`file://${sheet}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: sheetPng, fullPage: true });
  await browser.close();
}

console.log(`\n✓ ${candidates.length} candidate looks for "${brief.SUBJECT}"`);
console.log(`  sheet: ${sheetPng}   (READ it. A palette is judged by eye, never by its hexes)`);
if (collisions.length) {
  console.log(`  14px chip gate fired ${collisions.length} time(s) and regenerated:`);
  for (const x of collisions.slice(-8)) console.log(`    ${x.stance} vs ${x.against}, ΔE ${x.distance} < ${CHIP_MIN} on attempt ${x.attempt}`);
  for (const r of replacements) console.log(`    "${r.dropped}" could not separate at all → the slot went to "${r.replacedBy}"`);
} else {
  console.log(`  14px chip gate: no collisions (closest pair ΔE ${Math.min(...candidates.flatMap((a, i) => candidates.slice(i + 1).map((b) => chipDistance(a, b)))).toFixed(1)}, min ${CHIP_MIN})`);
}
console.log(`  none of these right? Re-run with another --seed. Six options that could suit any subject would be a menu, not proposals.`);
console.log(`  write one:  make invent-look SB=${path.relative(ROOT, file)} SEED=${seed} PICK=<n> NAME=<theme>`);
