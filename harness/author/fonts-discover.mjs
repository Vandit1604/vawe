// fonts-discover.mjs: surface typefaces this repo has never used. A pure data query over the Google
// Fonts catalogue, carrying no taste of its own. It exists because every other look tool here SELECTS
// (a theme, a vendored face) or REFLECTS (a real site), so an author asked to invent a look reaches for
// the same handful of faces every time. That is a training-data default, not a decision. Sampling by
// popularity BAND and by recency, with the used and the obvious names removed, makes the default
// unreachable and forces a real choice.
//
//   node harness/author/fonts-discover.mjs --seed 7 [--count 12] [--category serif] [--json]
//   make fonts-discover SEED=7 COUNT=12 CATEGORY=display
//
// Distinct from `make fonts` (DOWNLOADS a fixed vendored set) and `make font-audit` (verifies the
// vendored faces actually painted). Neither can name a face you have not already used; this one only does that.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const METADATA_URL = 'https://fonts.google.com/metadata/fonts';

// The training-data defaults. These are the faces that arrive unbidden, so they are barred by name even
// when no theme here has used them.
const BANNED = [
  'Inter', 'Poppins', 'Playfair Display', 'Syne', 'Space Grotesk', 'Montserrat',
  'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Nunito', 'Oswald',
];

const die = (msg) => { console.error(`fonts-discover: ${msg}`); process.exit(1); };

// ---------------------------------------------------------------- seeded RNG
// mulberry32. Math.random() is banned engine-side because a render must be pure in n, and a habit of
// reaching for it spreads. A seed is an argument here for the same reason: a look must be reproducible.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Each band draws from its own stream, so changing --count or one band's pool cannot reshuffle another.
function bandSeed(seed, band) {
  let h = seed >>> 0;
  for (const ch of band) h = (Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0);
  return h;
}
function shuffled(list, seed) {
  const rnd = mulberry32(seed);
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------- exclusions
// Parsed, never hardcoded: there are 35 theme files and they change. Any string under a theme's `type`
// block is a family name the library has already committed to.
function usedFamilies() {
  const dir = path.join(ROOT, 'themes');
  if (!fs.existsSync(dir)) die(`no themes directory at ${dir}`);
  const names = new Set();
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    let raw, theme;
    try { raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { die(`themes/${f} is not valid JSON: ${e.message}`); }
    try { theme = isTokenFile(raw) ? expandTheme(raw, { parseColor, colorAlpha }) : raw; }
    catch (e) { die(`themes/${f} failed to resolve: ${e.message}`); }
    for (const v of Object.values(theme.type || {})) {
      // `type` also carries switches such as {optical:true}; only the strings are families.
      if (typeof v === 'string' && v.trim()) names.add(v.trim());
    }
  }
  if (!names.size) die('parsed themes/*.json and found no family names. The theme shape has changed');
  return names;
}

// ---------------------------------------------------------------- catalogue
async function fetchCatalogue() {
  let res;
  try { res = await fetch(METADATA_URL, { headers: { accept: 'application/json' } }); }
  catch (e) { die(`could not reach ${METADATA_URL}: ${e.message}`); }
  if (!res.ok) die(`${METADATA_URL} returned HTTP ${res.status} ${res.statusText}. No fallback list exists on purpose: a hardcoded set would reinstate the exact default this tool removes.`);
  const raw = await res.text();
  // Google has historically prefixed this response with an anti-JSON-hijack guard, so start at the
  // first brace rather than trusting the body to be clean.
  const start = raw.indexOf('{');
  if (start < 0) die(`${METADATA_URL} returned no JSON body (first 200 chars: ${JSON.stringify(raw.slice(0, 200))})`);
  let json;
  try { json = JSON.parse(raw.slice(start)); }
  catch (e) { die(`could not parse the metadata body: ${e.message} (first 200 chars: ${JSON.stringify(raw.slice(start, start + 200))})`); }
  const list = json.familyMetadataList;
  if (!Array.isArray(list) || !list.length) die(`metadata has no familyMetadataList. The API shape has changed (top-level keys: ${Object.keys(json).join(', ')})`);
  const sample = list[0];
  for (const key of ['family', 'category', 'popularity', 'dateAdded', 'fonts']) {
    if (!(key in sample)) die(`metadata entries are missing "${key}". The API shape has changed (keys seen: ${Object.keys(sample).join(', ')})`);
  }
  return list;
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');

function describe(f) {
  const keys = Object.keys(f.fonts || {});
  const weights = [...new Set(keys.map((k) => parseInt(k, 10)).filter(Number.isFinite))].sort((a, b) => a - b);
  const axes = (f.axes || []).map((a) => `${a.tag} ${a.min}-${a.max}`);
  return {
    family: f.family,
    category: f.category,
    weights,
    italics: keys.some((k) => k.endsWith('i')),
    axes,
    variable: axes.length > 0,
    dateAdded: f.dateAdded || null,
    popularityRank: f.popularity,
    designers: f.designers || [],
  };
}

// ---------------------------------------------------------------- main
const seedArg = flag('--seed', null);
if (seedArg === null) die('--seed is required. The seed is the record of a look: same seed, same faces.');
const seed = Number(seedArg);
if (!Number.isInteger(seed)) die(`--seed must be an integer, got ${JSON.stringify(seedArg)}`);
const count = Number(flag('--count', '12'));
if (!Number.isInteger(count) || count < 1) die(`--count must be a positive integer, got ${JSON.stringify(flag('--count', '12'))}`);
const categoryArg = flag('--category', null);
const asJson = has('--json');

const catalogue = await fetchCatalogue();
const used = usedFamilies();
const bannedSet = new Set(BANNED);

// Noto covers 200+ scripts and would flood the long tail with faces nobody is choosing for a latin
// title card; a family with no latin subset cannot render our copy at all.
const latin = catalogue.filter((f) => !f.isNoto && (f.subsets || []).includes('latin'));

let pool = latin;
if (categoryArg) {
  const want = norm(categoryArg);
  const cats = [...new Set(latin.map((f) => f.category))];
  const match = cats.find((c) => norm(c) === want);
  if (!match) die(`unknown --category ${JSON.stringify(categoryArg)}. Known: ${cats.map((c) => c.toLowerCase().replace(/ /g, '-')).join(', ')}`);
  pool = latin.filter((f) => f.category === match);
}

const excludedFromThemes = pool.filter((f) => used.has(f.family)).length;
const excludedBanned = pool.filter((f) => bannedSet.has(f.family) && !used.has(f.family)).length;
const eligible = pool.filter((f) => !used.has(f.family) && !bannedSet.has(f.family));
if (eligible.length < count) die(`only ${eligible.length} families survive the exclusions, fewer than the ${count} asked for`);

// Bands. `popularity` is a rank, 1 being the most downloaded, so percentiles over the eligible set give
// three popularity strata; `recent` cuts across all three by date, because a face added this year has
// no rank worth trusting yet and is the least likely to be in anyone's training default.
const byRank = eligible.slice().sort((a, b) => a.popularity - b.popularity);
const cut = (lo, hi) => byRank.slice(Math.floor(byRank.length * lo), Math.floor(byRank.length * hi));
const byDate = eligible.slice().sort((a, b) => String(b.dateAdded).localeCompare(String(a.dateAdded)));
const BANDS = [
  ['popular', cut(0, 0.10)],
  ['mid', cut(0.10, 0.40)],
  ['tail', cut(0.40, 1.00)],
  ['recent', byDate.slice(0, Math.max(count, Math.floor(byDate.length * 0.10)))],
];

// Even split across the four bands, remainder to the earlier ones. A run of 12 is 3/3/3/3.
const quota = BANDS.map((_, i) => Math.floor(count / BANDS.length) + (i < count % BANDS.length ? 1 : 0));
const picked = [];
const seen = new Set();
BANDS.forEach(([name, members], i) => {
  let want = quota[i];
  for (const f of shuffled(members, bandSeed(seed, name))) {
    if (want <= 0) break;
    if (seen.has(f.family)) continue;   // `recent` overlaps the rank bands by construction
    seen.add(f.family);
    picked.push({ band: name, ...describe(f) });
    want--;
  }
});
// A narrow --category can leave a band short. Top up from the whole eligible set rather than returning
// fewer faces than asked for.
if (picked.length < count) {
  for (const f of shuffled(eligible, bandSeed(seed, 'topup'))) {
    if (picked.length >= count) break;
    if (seen.has(f.family)) continue;
    seen.add(f.family);
    picked.push({ band: 'topup', ...describe(f) });
  }
}

const meta = {
  seed, count: picked.length, category: categoryArg || 'all',
  catalogue: catalogue.length, latinNonNoto: latin.length, eligible: eligible.length,
  excluded: { fromThemes: excludedFromThemes, banned: excludedBanned },
  bands: Object.fromEntries(BANDS.map(([n, m], i) => [n, { pool: m.length, quota: quota[i] }])),
};

if (asJson) {
  console.log(JSON.stringify({ ...meta, fonts: picked }, null, 2));
} else {
  const cols = [
    ['FAMILY', (f) => f.family],
    ['CATEGORY', (f) => f.category],
    ['BAND', (f) => f.band],
    ['RANK', (f) => String(f.popularityRank)],
    ['ADDED', (f) => f.dateAdded || '?'],
    ['WEIGHTS', (f) => (f.weights.join(' ') || '?') + (f.italics ? ' +ital' : '')],
    ['AXES', (f) => (f.axes.join(', ') || 'static')],
  ];
  const widths = cols.map(([h, get]) => Math.max(h.length, ...picked.map((f) => get(f).length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  console.log(line(cols.map(([h]) => h)));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const f of picked) console.log(line(cols.map(([, get]) => get(f))));
  console.log();
  console.log(`seed ${seed} · ${picked.length} of ${eligible.length} eligible · catalogue ${catalogue.length}, latin non-Noto ${latin.length}`);
  console.log(`excluded: ${excludedFromThemes} already in themes/*.json, ${excludedBanned} banned defaults`);
  console.log(`bands: ${BANDS.map(([n, m], i) => `${n} ${quota[i]}/${m.length}`).join(' · ')}`);
}
