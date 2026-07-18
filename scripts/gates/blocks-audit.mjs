// blocks-audit.mjs — do the block FACTORIES obey the rules the videos are held to?
//
//   node scripts/gates/blocks-audit.mjs      ·   make blocks-audit
//
// Two defects shipped in the registry and were found by a human storyboarding a film, not by a gate:
//   • deploySuccess baked "Ready in 1.2s" into the factory, so every caller published a statistic
//     nobody could stand behind. The authoring rule is "an unbacked number is worse than no number" —
//     it was enforced on scene JSON and on nothing else.
//   • browserFrame defaulted `url` to a real company's domain, putting a brand into every caller that
//     did not override it, in a repo whose rule is to ship the SHAPE and never a lockup.
//
// A block is authored content that ships to every caller, so the copy rules apply to it exactly as
// they apply to a scene. This gate reads the factory source and holds it to them (docs/MISTAKES.md #67).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../../blocks/catalog.mjs';
import * as B from '../../blocks/index.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = fs.readFileSync(path.join(repoRoot, 'blocks/index.mjs'), 'utf8');
// THE MANIFEST IS A SECOND SOURCE OF DEFAULTS, and auditing only the factories misses it completely.
// Proven the hard way: the brand URL was removed from `browserFrame` and the catalog row put it
// straight back, and the invented "1.2s" was removed from `deploySuccess` and still shipped from a
// `terminal` row. This gate reported green with both sitting in a file it never opened — the rule was
// right and the thing it measured was a proxy for it, for the seventh time (MISTAKES #68).

// Real brands. Shipping the SHAPE is the rule; a brand belongs in a scene that deliberately reflects
// one, never in a factory default where it reaches callers who never asked for it.
const BRANDS = /\b(stripe|google|apple|spotify|youtube|reddit|twitter|netflix|amazon|meta|facebook|instagram|tiktok|linkedin|slack|notion|figma|github|vercel|openai|anthropic)\b/i;
// A number with a unit, a percentage, a money figure, a rating — the shapes a CLAIM takes.
const CLAIM = /(\b\d+(\.\d+)?\s?(ms|s|x|%|k|m|b)\b)|(\$\s?\d)|(\b\d+(\.\d+)?\s?\/\s?5\b)|(\b\d{1,3}(,\d{3})+\b)/i;
// CSS is not copy. `rgba(255,255,255,0.08)` trips the thousands-separator rule and `1px solid` trips
// the unit rule; neither is a claim anyone reads. A gate that cries wolf is ignored exactly like a
// gate that stays silent (MISTAKES #25), so the exclusion is part of the rule, not a patch on it.
const CSS_VALUE = /rgba?\(|^#[0-9a-f]{3,8}$|\b(px|em|rem|vh|vw|deg|fr)\b|solid|dashed|linear-gradient|cubic-bezier|var\(|calc\(|%\s*\d+%|blur\(/i;
// Superlatives are claims without even a number behind them.
const SUPERLATIVE = /\b(fastest|best|#1|number one|world.?class|industry.?leading|guaranteed)\b/i;

// A factory's source text, from `export function NAME(` to the next one.
function bodies() {
  const out = {};
  const re = /export function (\w+)\s*\(/g;
  const marks = [];
  let m; while ((m = re.exec(SRC))) marks.push({ name: m[1], at: m.index });
  marks.forEach((mk, i) => { out[mk.name] = SRC.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : SRC.length); });
  return out;
}
// string literals in the source, minus the ones inside a // comment line
const literals = (body) => body.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l))
  .flatMap((l) => [...l.matchAll(/'([^'\\]{2,80})'|"([^"\\]{2,80})"/g)].map((x) => x[1] ?? x[2]));

const issues = [];
const FACTORIES = bodies();

for (const [name, body] of Object.entries(FACTORIES)) {
  // 1. defaults in the signature: `prop = 'value'`
  const sig = body.slice(0, body.indexOf(') = {}') + 1 || 400);
  for (const d of [...sig.matchAll(/(\w+)\s*=\s*'([^']{2,60})'/g)]) {
    const [, prop, val] = d;
    if (BRANDS.test(val)) issues.push({ name, kind: 'brand-default', detail: `\`${prop}\` defaults to "${val}" — a real brand reaching every caller that does not override it. Ship the shape.` });
    if (CLAIM.test(val)) issues.push({ name, kind: 'claim-default', detail: `\`${prop}\` defaults to "${val}" — a figure shipped by default that no caller stood behind.` });
  }
  // 2. baked copy anywhere in the body
  for (const lit of literals(body)) {
    if (CLAIM.test(lit) && !CSS_VALUE.test(lit) && !/^[\d\s.,]+$/.test(lit)) issues.push({ name, kind: 'baked-claim', detail: `hardcoded "${lit}" — a claim a caller cannot override or stand behind. Make it a prop, defaulting to nothing.` });
    if (SUPERLATIVE.test(lit)) issues.push({ name, kind: 'baked-superlative', detail: `hardcoded "${lit}" — a superlative with nothing behind it.` });
    if (BRANDS.test(lit) && name !== 'stripeCard') issues.push({ name, kind: 'baked-brand', detail: `hardcoded "${lit}" — a real brand baked into a factory.` });
  }
}

// 3. prop-surface divergence: sibling blocks describing the same thing with different words.
// notification({title, body}) vs toast({message, action, icon}) is the case that motivated this.
const SYNONYMS = [['title', 'message', 'heading', 'label'], ['body', 'desc', 'text', 'sub']];
const props = (name) => {
  const sig = /\(\s*\{([^}]*)\}/.exec(FACTORIES[name] || '');
  return sig ? sig[1].split(',').map((t) => t.split(/[:=]/)[0].trim()).filter(Boolean) : [];
};
const FAMILIES = [['notification', 'toast', 'callout', 'banner']];
for (const fam of FAMILIES) {
  const have = fam.filter((f) => FACTORIES[f]);
  for (const group of SYNONYMS) {
    const used = have.map((f) => ({ f, hit: props(f).filter((p) => group.includes(p)) })).filter((x) => x.hit.length);
    if (used.length < 2) continue;
    // The defect is siblings sharing NO common word, not siblings having aliases. A block that accepts
    // both the canonical name and its old one is the CURE — flagging it would punish the fix and push
    // an author toward a breaking rename instead.
    const shared = used.reduce((acc, u) => acc.filter((p) => u.hit.includes(p)), [...used[0].hit]);
    if (!shared.length) issues.push({ name: have.join('/'), kind: 'prop-divergence',
      detail: `siblings share NO common name for the same slot: ${used.map((u) => `${u.f}(${u.hit.join(',')})`).join(' vs ')} — an author relearns the vocabulary per block. Pick one canonical name and accept the others as aliases.` });
  }
}

// 4. a catalog row passing a prop its factory does not accept (silently dropped, MISTAKES #60)
for (const e of CATALOG) {
  const fam = B[e.family]; if (!fam) continue;
  const known = new Set(props(e.family));
  if (!known.size) continue;
  const unknown = Object.keys(e.props || {}).filter((k) => !known.has(k));
  if (unknown.length) issues.push({ name: e.name, kind: 'dead-prop', detail: `manifest passes ${unknown.map((u) => `\`${u}\``).join(', ')}, which \`${e.family}\` does not accept — silently dropped.` });
}

// Blocks whose PURPOSE is to display a figure. A price on a pricing card is a specimen, not a claim:
// the block exists to show one, and a demo row without it shows nothing. The distinction that matters
// is a figure asserting something about the PRODUCT (a render time, a package count) versus a figure
// that IS the thing being demonstrated. Each entry carries its reason, so the list cannot quietly grow.
const FIGURE_IS_THE_POINT = {
  pricingCard: 'a pricing card exists to show a price',
  table: 'a data table exists to show data',
  kpiRow: 'a KPI row exists to show KPIs',
  statBig: 'a stat block exists to show a stat',
  statCard: 'a stat card exists to show a stat',
  barChart: 'a chart exists to show numbers', lineChart: 'a chart exists to show numbers',
  donutChart: 'a chart exists to show numbers', stackedBar: 'a chart exists to show numbers',
  gauge: 'a gauge exists to show a reading', progressRing: 'a ring exists to show a percentage',
  tweetCard: 'engagement counts are the specimen on a social card',
  videoLowerThird: 'a subscriber count is the specimen on a creator lower third',
  followCard: 'a follower count is the specimen', commitRow: 'a commit row shows relative times',
  nowPlaying: 'a player shows a track position', card: 'the pricing variant exists to show a price',
};

// every string a catalog row ships as content — the props ARE the block's default content
for (const e of CATALOG) {
  const walk = (v, at) => {
    if (typeof v === 'string') {
      if (BRANDS.test(v) && e.family !== 'stripeCard') issues.push({ name: e.name, kind: 'baked-brand', detail: `manifest \`${at}\` ships "${v}" — a real brand, straight into the registry, docs table and site grid.` });
      if (CLAIM.test(v) && !CSS_VALUE.test(v) && !FIGURE_IS_THE_POINT[e.family]) issues.push({ name: e.name, kind: 'baked-claim', detail: `manifest \`${at}\` ships "${v}" — a figure nobody stood behind, and it lands in docs/BLOCKS.md and the site thumbnails.` });
      if (SUPERLATIVE.test(v)) issues.push({ name: e.name, kind: 'baked-superlative', detail: `manifest \`${at}\` ships "${v}".` });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
  };
  walk(e.props || {}, 'props');
}

const ORDER = ['baked-claim', 'claim-default', 'baked-superlative', 'brand-default', 'baked-brand', 'dead-prop', 'prop-divergence'];
issues.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
console.log(`── block audit · ${Object.keys(FACTORIES).length} factories, ${CATALOG.length} catalog entries\n`);
if (!issues.length) { console.log('✓ no factory ships a claim, a brand, a dead prop or a divergent vocabulary'); process.exit(0); }
for (const i of issues) console.log(`   ✗ ${i.kind.padEnd(18)} ${i.name}\n       ${i.detail}`);
console.log(`\n✗ ${issues.length} issue(s). A block ships to EVERY caller, so the copy rules that apply to a scene apply here.`);
process.exit(1);
