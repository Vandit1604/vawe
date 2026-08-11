// scripts/author/panels.mjs — the storyboard stop, as a picture.
//
// docs/CRAFT/APPROVAL-STOPS.md states the rule: "a stop is a picture, not a report." The storyboard
// stop was the one with no picture. A storyboard here is prose, so a reviewer was asked to approve a
// film from `picture:` and `onscreen:` written in English, and prose hides the two things that decide
// whether a plan is any good: how much of the frame is used, and how the beats compare to each other.
// `onefilm` was approved as text and later rejected on its beats sheet for a dead opening. That
// rejection was decidable before a line of JSON existed.
//
// So: one rough still per beat, tiled into a sheet, rendered from the markdown alone.
//
// WHAT MAKES THIS DIFFERENT FROM `make animatic`, which also draws grey boxes. The animatic is a CLOCK
// check — it synthesizes a scratch read and asks whether each beat has room for its own words. This is
// a COMPOSITION check, and it asks where things sit and how big they are. The animatic draws every
// beat's slot the same size, so a `wide` and a `close` look identical in it. Here `shot:` drives the
// subject box, which is the one field that turns a storyboard into blocking.
//
// DELIBERATELY GREY. No theme, no accent, no real assets. Nobody may mistake a panel for a finished
// frame; palette and type are judged later, at `make styleframes`. A panel is blocking, not drawing.
//
//   node scripts/author/panels.mjs <STORYBOARD.md> [--out /tmp/panels]
//   make panels SB=formats/scene/<name>.storyboard.md
import fs from 'node:fs';
import path from 'node:path';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { openScene } from './scene-page.mjs';
import { frameTile, tileGrid, tileBox, baseOf } from '../gates/tile.mjs';
import { writeReceipt } from '../lib/receipt.mjs';

const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!SB || !fs.existsSync(SB)) {
  console.error('usage: panels <STORYBOARD.md> [--out /tmp/panels]');
  console.error('       template: docs/CRAFT/STORYBOARD-TEMPLATE.md');
  process.exit(2);
}

const sb = parseStoryboard(fs.readFileSync(SB, 'utf8'));
if (!sb.beats.length) { console.error(`✗ no beats in ${SB} — beats are "## Beat N: Title (0s-6s)" headings.`); process.exit(1); }
const { beats, guessed } = timeline(sb);

const NAME = baseOf(SB).replace(/\.storyboard$/i, '');
const OUTDIR = path.join(flag('--out', '/tmp/panels'), NAME);
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

// ── the shot vocabulary → how much of the frame the subject occupies ───────────────────────────────
// This is the whole reason the file exists. The template already glosses its own terms in exactly these
// terms — "wide (establishing, the frame is mostly empty)", "medium (the object arrives and owns the
// middle third)" — so the box is sized to what the words already mean rather than to a new convention.
// A `shot:` value is often a sentence ("medium, the caret dead centre with the frame deliberately empty
// around it"), so the keyword is found inside it and the rest is kept and shown as written.
const SHOTS = [
  [/\b(macro|extreme[\s-]?close(?:[\s-]?up)?|ecu)\b/i, 'extreme close', 0.94, 0.90],
  [/\b(close(?:[\s-]?up)?|cu)\b/i, 'close', 0.78, 0.72],
  [/\b(extreme[\s-]?wide|very[\s-]?wide|establishing|ews)\b/i, 'extreme wide', 0.20, 0.16],
  [/\b(wide|ws|long)\b/i, 'wide', 0.34, 0.28],
  [/\b(medium|mid|full|ms)\b/i, 'medium', 0.55, 0.48],
];
const DEFAULT_SHOT = SHOTS.find((s) => s[1] === 'medium');
const readShot = (raw) => {
  if (!raw) return { kind: 'medium', sx: DEFAULT_SHOT[2], sy: DEFAULT_SHOT[3], note: '', why: 'missing' };
  for (const [re, kind, sx, sy] of SHOTS) {
    if (re.test(raw)) return { kind, sx, sy, note: raw.replace(re, '').replace(/^[\s,(–—-]+|[\s,)]+$/g, '').trim(), why: 'named' };
  }
  return { kind: 'medium', sx: DEFAULT_SHOT[2], sy: DEFAULT_SHOT[3], note: raw.trim(), why: 'unknown' };
};

// ── where the subject sits, when the plan says ─────────────────────────────────────────────────────
// `shot:` sizes the box; nothing in the contract positions it. Centring every box by default would be a
// convention masquerading as a finding: a reviewer would read "the bottom third is empty" off a panel
// whose bottom third is empty because this file put it there. So placement words are read out of the
// prose when they are there, and a panel that has none SAYS it has none. An unread placement is a fact
// about the storyboard, and it is the one a reviewer must know before trusting the blocking.
const PLACE = [
  [/\b(?:on the |the )?left(?:\s+(?:half|third|side|two[\s-]?thirds))?\b/i, 'left'],
  [/\b(?:on the |the )?right(?:\s+(?:half|third|side|two[\s-]?thirds))?\b/i, 'right'],
  [/\b(?:lower|bottom)\s+(?:half|third|two[\s-]?thirds|edge)\b/i, 'bottom'],
  [/\b(?:upper|top)\s+(?:half|third|two[\s-]?thirds|edge)\b/i, 'top'],
  [/\b(?:dead )?cent(?:re|er)(?:d|red)?\b/i, 'centre'],
];
// The FIRST placement word wins. In "a caret blinking on the left, the right half empty" both halves
// are named and only one holds the subject; the one named first is it.
const readPlace = (...sources) => {
  for (const src of sources) {
    if (!src) continue;
    let best = null;
    for (const [re, where] of PLACE) {
      const m = re.exec(src);
      if (m && (!best || m.index < best.at)) best = { where, at: m.index };
    }
    if (best) {
      const axis = best.where === 'top' || best.where === 'bottom' ? 'vertical'
        : best.where === 'centre' ? 'both' : 'horizontal';
      return { where: best.where, axis, stated: true };
    }
  }
  return { where: 'centre', axis: 'none', stated: false };
};
// What the panel says about its own placement, because the half it did not read is the half a reviewer
// would otherwise mistake for a decision. `onefilm` states a left/right split on every beat and states
// nothing vertical, so the empty bottom of its panels is this file talking, not the plan.
const placeLabel = (p) => p.axis === 'none' ? 'placement not stated · centred here by default'
  : p.axis === 'both' ? 'centred, as the plan states'
  : p.axis === 'horizontal' ? `placed ${p.where} · nothing vertical stated`
  : `placed ${p.where} · nothing horizontal stated`;

// ── the canvas ─────────────────────────────────────────────────────────────────────────────────────
const fmt = /(\d+)\s*[x×]\s*(\d+)/.exec(sb.format || '');
const W = fmt ? +fmt[1] : 1920, H = fmt ? +fmt[2] : 1080;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const g = gcd(W, H);
const ASPECT = `${W / g}:${H / g}`;

const INK = '#111111', GREY = '#bdbdbd', SLOT = '#e8e8e8', MUTED = '#7a7a7a', FAINT = '#a8a8a8', RED = '#b00020';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[—–]/g, ',');
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// The drawn frame, inset so the panel can carry a slate above it and a caption below without either
// eating picture space. The inset keeps the film's real ratio: a panel whose frame is not the shape of
// the film would lie about every placement inside it.
const FRAME_W = Math.round(W * 0.72), FRAME_H = Math.round(FRAME_W * H / W);
const FRAME_X = Math.round((W - FRAME_W) / 2), FRAME_Y = Math.round(H * 0.115);
const PAD = Math.round(FRAME_W * 0.045);

// rough line count for a block of text at a size, so the copy stack advances like real copy does
const linesOf = (text, size, box) => Math.max(1, Math.ceil(text.length * size * 0.5 / box));

const layers = [];
const rows = [];

for (const b of beats) {
  const start = b.start, dur = Math.max(0.4, (b.end ?? b.start + 2) - b.start);
  const hold = { start: +start.toFixed(2), duration: +dur.toFixed(2), exitDur: 0, enterDur: 0 };
  const shot = readShot(b.shot);
  const hasPic = !!(b.picture || b.blueprint);

  // ── the slate ────────────────────────────────────────────────────────────────────────────────────
  layers.push({ type: 'text', text: esc(`${b.i + 1} · ${b.name}`), x: Math.round(W * 0.04), y: Math.round(H * 0.035),
    w: Math.round(W * 0.55), size: Math.round(H * 0.030), weight: 700, color: INK, align: 'left', ...hold });
  layers.push({ type: 'text',
    text: esc(`${start.toFixed(1)}s to ${(start + dur).toFixed(1)}s · ${dur.toFixed(1)}s · ${shot.kind.toUpperCase()}${shot.why === 'missing' ? ' (assumed)' : ''}${b.type ? ' · ' + b.type : ''}`),
    x: Math.round(W * 0.41), y: Math.round(H * 0.038), w: Math.round(W * 0.55), size: Math.round(H * 0.024),
    weight: 500, color: shot.why === 'missing' ? RED : MUTED, align: 'right', ...hold });
  if (shot.note) layers.push({ type: 'text', text: esc(clip(`shot: ${shot.note}`, 150)),
    x: Math.round(W * 0.04), y: Math.round(H * 0.076), w: Math.round(W * 0.92), size: Math.round(H * 0.020),
    weight: 400, color: FAINT, align: 'left', ...hold });

  // ── the frame, drawn, so emptiness inside it is visible as emptiness ─────────────────────────────
  layers.push({ type: 'rect', x: FRAME_X, y: FRAME_Y, w: FRAME_W, h: FRAME_H, radius: 2,
    bg: '#fcfcfc', border: `2px solid ${GREY}`, ...hold });

  // ── the subject, at the size the shot says ───────────────────────────────────────────────────────
  const bw = Math.round(FRAME_W * shot.sx), bh = Math.round(FRAME_H * shot.sy);
  // `placement` FIRST, because a field whose entire job is to say where things go should outrank a
  // placement word that happens to appear in a prose description. It was not read at all until now: a
  // storyboard stating "HUD top-left" on every beat still drew seven centred boxes and labelled them
  // "placement not stated", which is a declaration accepted and ignored.
  const place = readPlace(b.placement, b.picture, b.shot);
  const EDGE = 0.06;
  let bx = FRAME_X + Math.round((FRAME_W - bw) / 2), by = FRAME_Y + Math.round((FRAME_H - bh) / 2);
  if (place.where === 'left') bx = FRAME_X + Math.round(FRAME_W * EDGE);
  if (place.where === 'right') bx = FRAME_X + FRAME_W - bw - Math.round(FRAME_W * EDGE);
  if (place.where === 'top') by = FRAME_Y + Math.round(FRAME_H * EDGE);
  if (place.where === 'bottom') by = FRAME_Y + FRAME_H - bh - Math.round(FRAME_H * EDGE);
  layers.push({ type: 'rect', x: bx, y: by, w: bw, h: bh, radius: 4,
    bg: hasPic ? SLOT : 'transparent', border: hasPic ? `2px solid ${GREY}` : `3px dashed ${RED}`, ...hold });
  const capt = b.picture || (b.blueprint ? `blueprint: ${b.blueprint}` : 'NO PICTURE NAMED · this beat is type only');
  layers.push({ type: 'text', text: esc(clip(capt, 230)), x: bx + 18, y: by + 16, w: bw - 36,
    size: Math.round(H * 0.020), weight: 400, color: hasPic ? MUTED : RED, align: 'left', ...hold });

  // ── the on-screen copy, at plausible scale, over the picture the way copy really sits ────────────
  // First line large because a first line is large. The point is not the wording, it is the MASS: a
  // beat holding two seconds and one character is a hole, and prose never reads as one.
  let cy = FRAME_Y + Math.round(FRAME_H * 0.06);
  const copyBox = FRAME_W - PAD * 2;
  b.onscreen.slice(0, 4).forEach((line, j) => {
    const big = j === 0;
    const txt = esc(clip(line, 90));
    const size = Math.round(FRAME_H * (big ? 0.105 : 0.042));
    layers.push({ type: 'text', text: txt, x: FRAME_X + PAD, y: cy, w: copyBox, size,
      weight: big ? 700 : 400, color: big ? INK : MUTED, align: 'left', ls: big ? '-0.02em' : '0', ...hold });
    cy += Math.round(size * 1.16 * linesOf(txt, size, copyBox)) + (big ? 12 : 6);
  });

  // ── camera and change, under the frame ───────────────────────────────────────────────────────────
  const underY = FRAME_Y + FRAME_H + Math.round(H * 0.018);
  layers.push({ type: 'text', text: esc(clip(`camera: ${b.camera || 'not named'}`, 50)),
    x: FRAME_X, y: underY, w: Math.round(FRAME_W * 0.52), size: Math.round(H * 0.021),
    weight: 500, color: b.camera ? MUTED : FAINT, align: 'left', ...hold });
  layers.push({ type: 'text', text: esc(placeLabel(place)),
    x: FRAME_X + Math.round(FRAME_W * 0.54), y: underY, w: Math.round(FRAME_W * 0.46),
    size: Math.round(H * 0.021), weight: 400, color: place.stated ? MUTED : FAINT, align: 'right', ...hold });
  layers.push({ type: 'text', text: esc(clip(`becomes: ${b.becomes || 'no change named'}`, 150)),
    x: FRAME_X, y: FRAME_Y + FRAME_H + Math.round(H * 0.050), w: FRAME_W, size: Math.round(H * 0.021),
    weight: 400, color: b.becomes ? INK : RED, align: 'left', ...hold });

  rows.push({ b, shot, place, hasPic, start, dur, fill: shot.sx * shot.sy,
    words: b.onscreen.join(' ').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length });
}

const total = +Math.max(...beats.map((b) => b.end ?? 0)).toFixed(2);
const scene = {
  module: 'scene',
  theme: 'vawe',
  aspect: ASPECT,
  duration: total,
  authoringNote: `PANELS of ${path.basename(SB)}: blocking only. Grey by design; judge WHERE things sit and HOW BIG they are, never the look.`,
  authoring: { allow: ['dead-air', 'ends-on-nothing', 'plain-slideshow', 'no-continuous-object',
    'no-continuous-object-inferred', 'static-bg', 'overlap', 'contrast', 'safe', 'no-visual-vocabulary'],
    _why: { panels: 'Generated blocking panels, never a deliverable. The taste gates are waived by construction rather than by an author arguing themselves into it.' } },
  layers,
  bg: [{ t: 0, preset: 'plain', from: 0, to: total }],
};
// The scene has to live inside the repo: the render server serves core/, themes/, formats/, assets/
// and .vawe-data/ only, so a scene written to /tmp boots to a 404. The pictures still go to /tmp; this
// is scratch, gitignored, and overwritten every run.
const SCENE_JSON = path.join('.vawe-data', 'scenes', `panels-${NAME}.json`);
fs.mkdirSync(path.dirname(SCENE_JSON), { recursive: true });
fs.writeFileSync(SCENE_JSON, JSON.stringify(scene, null, 2) + '\n');

// ── shoot one still per beat, then tile ────────────────────────────────────────────────────────────
const page = await openScene(SCENE_JSON, { scale: 1, fps: 30 });
const shots = [];
for (const r of rows) {
  const f = path.join(OUTDIR, `beat-${String(r.b.i + 1).padStart(2, '0')}.png`);
  await page.grab(r.start + r.dur / 2, f);
  shots.push(f);
}
await page.close();

const { tw, th } = tileBox(W >= H);
// No tile label: the panel already carries its own slate, and drawing the beat name twice puts an
// opaque box over the shot line the slate is there to show.
const tiles = shots.map((f, i) => frameTile(f, 0, path.join(OUTDIR, `.tile-${i}.png`), { tw, th }));
const SHEET = path.join(path.dirname(OUTDIR), `${NAME}.png`);
tileGrid(tiles, { cols: Math.min(3, tiles.length), tw, th, out: SHEET });
for (const t of tiles) fs.unlinkSync(t);

writeReceipt('panels', SB, { sheet: SHEET, beats: rows.length, dir: OUTDIR });

// ── the report ─────────────────────────────────────────────────────────────────────────────────────
console.log(`\n  PANELS · ${path.basename(SB)} · ${rows.length} beat(s) at ${W}x${H} (${ASPECT})`);
console.log('\n  beat                          span        shot            subject  placement  copy');
for (const r of rows) {
  console.log(`  ${(r.b.i + 1 + '. ' + r.b.name).slice(0, 28).padEnd(30)}`
    + `${(r.start.toFixed(1) + '-' + (r.start + r.dur).toFixed(1) + 's').padEnd(12)}`
    + `${(r.shot.why === 'missing' ? 'medium (assumed)' : r.shot.kind).padEnd(16)}`
    + `${(Math.round(r.fill * 100) + '%').padStart(6)}   `
    + `${(r.place.stated ? r.place.where : '—').padEnd(11)}`
    + `${r.words} word(s)${r.hasPic ? '' : '   NO PICTURE'}`);
}

const noShot = rows.filter((r) => r.shot.why === 'missing').map((r) => r.b.name);
const oddShot = rows.filter((r) => r.shot.why === 'unknown').map((r) => `${r.b.name} ("${r.b.shot}")`);
const noPic = rows.filter((r) => !r.hasPic).map((r) => r.b.name);
console.log('');
if (noShot.length) console.log(`  ~ ${noShot.length} beat(s) name no \`shot:\`, drawn as medium: ${noShot.join(', ')}. A panel can only block what the plan states.`);
if (oddShot.length) console.log(`  ~ ${oddShot.length} beat(s) name a shot this reader does not know, drawn as medium: ${oddShot.join(', ')}.`);
if (noPic.length) console.log(`  ~ ${noPic.length} beat(s) name no picture; they are the red dashed boxes. A type-only beat is what that looks like.`);
if (guessed.length) console.log(`  ~ ${guessed.length} span(s) were inferred, not stated: ${guessed.join(', ')}.`);
const noPlace = rows.filter((r) => !r.place.stated).map((r) => r.b.name);
if (noPlace.length) console.log(`  ~ ${noPlace.length} beat(s) place nothing in the frame, so their box is centred by default: ${noPlace.join(', ')}. Where the empty part of those panels falls is this tool's convention, not your plan.`);

console.log(`\n  sheet:  ${SHEET}`);
console.log(`  stills: ${OUTDIR}/beat-NN.png`);
console.log('\n  READ IT. These are BLOCKING, not drawing: where things sit, how big they are, and how the');
console.log('  beats compare. They cannot show motion (that is `make animatic`) and they cannot show the');
console.log('  look (that is `make styleframes`). They are only ever as good as the storyboard.\n');
