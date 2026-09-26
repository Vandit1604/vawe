import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'engine-doctrine/MISTAKES.md');

// The commit holding the last full-prose version of engine-doctrine/MISTAKES.md, set once by the migration and
// never moved: every entry number below was resolvable against this tree the moment it was recorded.
const ARCHIVE_HASH = '77993ff0799dcc41efd2f948204e95531a15ed9f';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const ONE = flag('n', null);
const LIMIT = Number(flag('limit', 3));
const FULL = argv.includes('--full');
const QUERY = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--')).join(' ').trim();

if (FULL) {
  if (!ONE) { console.error('✗ --full needs --n <number>: it prints one entry\'s original prose.'); process.exit(2); }
  let archived;
  try {
    archived = execFileSync('git', ['show', `${ARCHIVE_HASH}:engine-doctrine/MISTAKES.md`], { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
  } catch {
    console.error(`✗ could not read engine-doctrine/MISTAKES.md at ${ARCHIVE_HASH}. Is this a shallow clone?`);
    process.exit(2);
  }
  const alines = archived.split('\n');
  const aheads = alines.map((l, i) => (/^## /.test(l) ? i : -1)).filter((i) => i >= 0);
  const AHEAD = /^## (?:#)?(\d+)[.:) ]*\s*(.*)$/;
  let found = null;
  for (let k = 0; k < aheads.length; k++) {
    const m = AHEAD.exec(alines[aheads[k]]);
    if (m && Number(m[1]) === Number(ONE)) {
      const end = k + 1 < aheads.length ? aheads[k + 1] : alines.length;
      found = alines.slice(aheads[k], end).join('\n').trim();
      break;
    }
  }
  if (!found) { console.error(`✗ no entry #${ONE} in the archived MISTAKES.md at ${ARCHIVE_HASH}.`); process.exit(2); }
  console.log(`\n  ── #${ONE} · original prose, from ${ARCHIVE_HASH}\n`);
  console.log(found);
  console.log('');
  process.exit(0);
}

const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

const entries = [];
const unnumbered = [];
const HEAD = /^## (?:#)?(\d+)[.:) ]*\s*(.*)$/;
const heads = lines.map((l, i) => (/^## /.test(l) ? i : -1)).filter((i) => i >= 0);
for (let k = 0; k < heads.length; k++) {
  const i = heads[k];
  let end = k + 1 < heads.length ? heads[k + 1] : lines.length;
  const footer = lines.findIndex((l, j) => j > i && j < end && /^<!--/.test(l));
  if (footer >= 0) end = footer;
  const body = lines.slice(i + 1, end).join('\n').trim();
  const m = HEAD.exec(lines[i]);
  if (m) entries.push({ n: Number(m[1]), title: m[2].trim(), body, line: i + 1, text: `${m[2]} ${body}`.toLowerCase() });
  else {
    const title = lines[i].replace(/^## /, '').trim();
    const e = { n: null, title, body, line: i + 1, text: `${title} ${body}`.toLowerCase() };
    entries.push(e); unnumbered.push(e);
  }
}

if (!entries.length) { console.error(`✗ parsed 0 entries from ${path.relative(ROOT, FILE)}. Its heading shape changed.`); process.exit(2); }

const AREAS = [
  [/\bcore\/layers\//g, 'core/layers'],
  [/\bcore\/tracks\//g, 'core/tracks'],
  [/\bcore\/fx\//g, 'core/fx'],
  [/\bcore\/surfaces\//g, 'core/surfaces'],
  [/\bcore\/[a-z-]+\.js/g, 'core (top level)'],
  [/\bquality\/gates\//g, 'quality/gates'],
  [/\bquality\/ledger\//g, 'quality/gates'],
  [/\bscripts\/(author|media|site|brand|hooks|lib|dev)\//g, 'scripts (tooling)'],
  [/\bharness\/(author|media|lib|dev|live)\//g, 'scripts (tooling)'],
  [/\bgenerators\//g, 'scripts (tooling)'],
  [/\bresearch\/lightfield\//g, 'scripts (tooling)'],
  [/\bformats\/scene\/scene\.(js|html)/g, 'films/scene engine'],
  [/\bformats\/scene\/[a-z0-9_-]+\.json/g, 'a scene file'],
  [/\binternal\/|\bcmd\//g, 'Go renderer'],
  [/\bblocks\//g, 'blocks'],
  [/\bsite\/|\bdocs-site\//g, 'site'],
  [/\bverify\//g, 'verify'],
  [/\bthemes\//g, 'themes'],
  [/\bengine-doctrine\/(?!MISTAKES)/g, 'docs'],
];

const CLASSES = [
  [/silent(ly)? (substitut|ignor|drop|discard|swallow)|accepted and (then )?ignor|written and (never )?read|no-op|read by nothing|consumed by nothing/i, 'silent substitution'],
  [/order[- ]depend|render order|frame N-1|out of order|accumulat|purity|pure in n/i, 'order / purity'],
  [/two owners|one fact|drift|second (copy|source|spelling|implementation)|hand-kept|restated|stale/i, 'one fact, two owners'],
  [/measur(ed|ement) (wrongly|the wrong)|squared|mis-?measur|wrong (metric|number)|manufactur/i, 'measured the wrong thing'],
  [/absence|silence read|reported .*pass|green .*(over|while)|blind sweep|confident green/i, 'absence read as a pass'],
  [/wrong (colour|color|font|face|palette)|off-palette|contrast|readab/i, 'look / legibility'],
  [/timing|too fast|too slow|dead air|held|pacing|duration/i, 'timing'],
  [/crash|threw|stack trace|exit(ed)? [0-9]|failed to (launch|parse)/i, 'crash'],
];

const classify = (e) => {
  const areas = new Set();
  for (const [re, name] of AREAS) if (re.test(e.body)) areas.add(name);
  const classes = CLASSES.filter(([re]) => re.test(e.body)).map(([, n]) => n);
  return { areas: [...areas], classes };
};
for (const e of entries) Object.assign(e, classify(e));

const tally = (key) => {
  const t = new Map();
  for (const e of entries) for (const v of e[key]) t.set(v, (t.get(v) || 0) + 1);
  return [...t.entries()].sort((a, b) => b[1] - a[1]);
};

const show = (e) => {
  console.log(`\n  ── ${e.n == null ? '(unnumbered section)' : `#${e.n}`} · ${e.title}`);
  console.log(`     ${path.relative(ROOT, FILE)}:${e.line}`
    + `${e.areas.length ? `  ·  ${e.areas.join(', ')}` : ''}`
    + `${e.classes.length ? `  ·  ${e.classes.join(' + ')}` : ''}\n`);
  console.log(e.body.split('\n').map((l) => `  ${l}`).join('\n'));
};

if (ONE) {
  const e = entries.find((x) => x.n === Number(ONE));
  if (!e) { const ns = entries.map((x) => x.n).filter((n) => n != null); console.error(`✗ no entry #${ONE}. The log runs #${Math.min(...ns)} to #${Math.max(...ns)}.`); process.exit(2); }
  show(e); console.log('');
  process.exit(0);
}

if (!QUERY) {
  const words = src.split(/\s+/).length;
  const withField = (re) => entries.filter((e) => re.test(e.body)).length;
  const ns = entries.map((e) => e.n).filter((n) => n != null);
  console.log(`\n  MISTAKES · ${entries.length} sections · ${lines.length} lines · ${words.toLocaleString('en-US')} words`);
  console.log(`  ${ns.length} numbered defects, #${Math.min(...ns)} to #${Math.max(...ns)}`
    + `${unnumbered.length ? `, plus ${unnumbered.length} unnumbered section(s): method notes, waiver lists, hunt summaries` : ''}\n`);
  console.log(`  ${String(withField(/^holds: (?!none$)/m)).padStart(4)} held by a named gate or live check today`);
  console.log(`  ${String(withField(/^holds: none$/m)).padStart(4)} still just a sentence (\`holds: none\`), nothing enforces them\n`);

  const areas = tally('areas'), classes = tally('classes');
  const uncat = entries.filter((e) => !e.areas.length).length;
  console.log(`  WHERE THEY HAPPEN (from the repo paths each entry cites)\n`);
  for (const [a, n] of areas) console.log(`  ${String(n).padStart(4)}  ${a}`);
  if (uncat) console.log(`  ${String(uncat).padStart(4)}  (cites no repo path: a method note, or an entry that never named the file)`);
  console.log(`\n  WHAT KIND THEY ARE (from this repo's own vocabulary for its defect classes)\n`);
  for (const [c, n] of classes) console.log(`  ${String(n).padStart(4)}  ${c}`);
  const unclassed = entries.filter((e) => !e.classes.length).length;
  if (unclassed) console.log(`  ${String(unclassed).padStart(4)}  unclassified`);
  console.log(`\n  An entry can carry more than one class, so these sum past ${entries.length}.`);
  console.log(`  Filter: make arsenal MISTAKES=1 Q="<area or class>"\n`);
  console.log(`  This file used to be 17,797 lines of prose nobody could read whole. It is now an index:`);
  console.log(`  title, one lesson, what holds it. The full reasoning for any entry is one command away:\n`);
  console.log(`    make arsenal MISTAKES=1 Q="a prop the engine accepted and ignored"`);
  console.log(`    make arsenal MISTAKES=1 N=496`);
  console.log(`    make arsenal MISTAKES=1 N=496 FULL=1   # the original write-up, from git history\n`);
  process.exit(0);
}

const terms = QUERY.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
const scored = entries.map((e) => {
  const t = e.title.toLowerCase();
  let s = 0;
  for (const w of terms) {
    if (t.includes(w)) s += 6;
    const hits = e.text.split(w).length - 1;
    if (hits) s += Math.min(hits, 4);
  }
  return { e, s };
}).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);

if (!scored.length) {
  console.log(`\n  Nothing in ${entries.length} entries matches "${QUERY}".`);
  console.log(`  That is a real answer: this defect has not been logged. Log it when you fix it.\n`);
  process.exit(0);
}
const strong = scored.filter((x) => x.s >= scored[0].s * 0.5).length;
console.log(`\n  MISTAKES · "${QUERY}" · ${strong} strong match(es) of ${entries.length}, showing ${Math.min(LIMIT, scored.length)}`);
for (const { e } of scored.slice(0, LIMIT)) show(e);
if (scored.length > LIMIT) {
  console.log(`\n  ${scored.length - LIMIT} more, by title:`);
  for (const { e } of scored.slice(LIMIT, LIMIT + 12)) console.log(`    #${String(e.n).padStart(4)}  ${e.title.slice(0, 92)}`);
  console.log(`  Show one: make arsenal MISTAKES=1 N=<number>`);
}
console.log('');
