// scripts/author/mistakes.mjs: ASK the mistake log instead of reading it.
//
//   node scripts/author/mistakes.mjs                     # the census, and why you cannot read it whole
//   node scripts/author/mistakes.mjs "silent fallback"   # the entries that match, in full
//   node scripts/author/mistakes.mjs --n 496             # one entry by number
//   make mistakes [Q="…"] [N=496]
//
// WHY. docs/MISTAKES.md is 16,142 lines and 533 entries, which is 45% of every word of documentation
// in this repo. Its own header says "Read this before authoring a brand video", and that stopped being
// possible a long time ago: no agent ingests it, so in practice nobody reads any of it, and the file
// that exists so a mistake is never made twice is the one file nothing consults.
//
// THE FIX IS NOT TO COMPRESS IT. Every entry is a real defect with a real root cause, and shortening
// them would throw away the only part that stops a repeat: the reasoning. The entries are already
// structured (`## #N: title`, then What / Root cause / Fix), so the file is a store that was missing
// its reader. Ask it a question and it answers with the two or three entries that matter, in full.
//
// Same shape as `make arsenal`, deliberately: that tool solved the identical problem for the 337 named
// things an author cannot remember, and a second shape for the same job would be a second thing to learn.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'docs/MISTAKES.md');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const ONE = flag('n', null);
const LIMIT = Number(flag('limit', 3));
const QUERY = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--')).join(' ').trim();

const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

// PARSED, NEVER MAINTAINED AS A SECOND LIST. A hand-kept index of 533 entries would be the drift this
// repo logs more than anything else, and it would be 533 lines nobody reads either.
const entries = [];
const unnumbered = [];
const HEAD = /^## (?:#)?(\d+)[.:) ]*\s*(.*)$/;
const heads = lines.map((l, i) => (/^## /.test(l) ? i : -1)).filter((i) => i >= 0);
for (let k = 0; k < heads.length; k++) {
  const i = heads[k];
  const end = k + 1 < heads.length ? heads[k + 1] : lines.length;
  const body = lines.slice(i + 1, end).join('\n').trim();
  const m = HEAD.exec(lines[i]);
  // A SECTION THAT IS NOT A NUMBERED DEFECT IS STILL SEARCHABLE, and dropping it would be this file's
  // own most-logged failure inside the tool that reads it. Twelve of the 533 headings are method notes,
  // waiver lists and hunt summaries rather than defects: real content, no number. They are searched
  // like everything else and counted separately, never silently skipped.
  if (m) entries.push({ n: Number(m[1]), title: m[2].trim(), body, line: i + 1, text: `${m[2]} ${body}`.toLowerCase() });
  else {
    const title = lines[i].replace(/^## /, '').trim();
    const e = { n: null, title, body, line: i + 1, text: `${title} ${body}`.toLowerCase() };
    entries.push(e); unnumbered.push(e);
  }
}

if (!entries.length) { console.error(`✗ parsed 0 entries from ${path.relative(ROOT, FILE)}. Its heading shape changed.`); process.exit(2); }

// ── categories, DERIVED, never a taxonomy anybody maintains ──────────────────────────────────────
//
// "A very long file is not helpful for anyone" is right, and the useful question underneath it is not
// "how do we shorten this" but "what kind of mistake happens WHERE". That is answerable without a
// rewrite, because every entry already cites the files it was about and describes itself in vocabulary
// this repo uses consistently.
//
// SPLITTING THE FILE WAS THE OBVIOUS MOVE AND IT IS THE WRONG ONE. 643 places in this codebase cite
// `MISTAKES.md #N`. Per-area files would churn every one of them and break the numbering that makes a
// citation mean anything, to gain a grouping that can be computed from the text in a millisecond.
//
// AREA comes from the repo paths an entry names. A hand-kept map from entry to package would be stale
// within a week and would be a second place to update on every append.
const AREAS = [
  [/\bcore\/layers\//g, 'core/layers'],
  [/\bcore\/tracks\//g, 'core/tracks'],
  [/\bcore\/fx\//g, 'core/fx'],
  [/\bcore\/surfaces\//g, 'core/surfaces'],
  [/\bcore\/[a-z-]+\.js/g, 'core (top level)'],
  [/\bscripts\/gates\//g, 'scripts/gates'],
  [/\bscripts\/(author|media|site|lib|dev)\//g, 'scripts (tooling)'],
  [/\bformats\/scene\/scene\.(js|html)/g, 'formats/scene engine'],
  [/\bformats\/scene\/[a-z0-9_-]+\.json/g, 'a scene file'],
  [/\binternal\/|\bcmd\//g, 'Go renderer'],
  [/\bblocks\//g, 'blocks'],
  [/\bsite\/|\bdocs-site\//g, 'site'],
  [/\bverify\//g, 'verify'],
  [/\bthemes\//g, 'themes'],
  [/\bdocs\/(?!MISTAKES)/g, 'docs'],
];

// CLASS comes from the words. This repo names its defect classes over and over, in the same phrases,
// because the same failures recur: that consistency is what makes the derivation possible at all. The
// patterns are the repo's OWN vocabulary, not a scheme invented here.
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
  // Grouped with an explicit locale. `toLocaleString()` takes the machine's, and on this one it printed
  // "1,81,974", which is correct Indian grouping and reads as a typo in a doc everyone else will see.
  const ns = entries.map((e) => e.n).filter((n) => n != null);
  console.log(`\n  MISTAKES · ${entries.length} sections · ${lines.length} lines · ${words.toLocaleString('en-US')} words`);
  console.log(`  ${ns.length} numbered defects, #${Math.min(...ns)} to #${Math.max(...ns)}`
    + `${unnumbered.length ? `, plus ${unnumbered.length} unnumbered section(s): method notes, waiver lists, hunt summaries` : ''}\n`);
  console.log(`  ${String(withField(/\*\*What/)).padStart(4)} carry a **What**`);
  console.log(`  ${String(withField(/\*\*Root cause/)).padStart(4)} carry a **Root cause**`);
  console.log(`  ${String(withField(/\*\*Fix/)).padStart(4)} carry a **Fix**`);
  console.log(`  ${String(withField(/Gate:|gate now catches|→ \*\*Gate/i)).padStart(4)} name the gate that now catches it\n`);

  // THE ANSWER TO "what kind of mistake happens where", which is the question a 16,000-line log cannot
  // be asked directly. Both tables are derived from the entries' own text on every run, so an append
  // updates them and there is nothing to keep in sync.
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
  console.log(`  Filter: make mistakes Q="<area or class>"\n`);
  console.log(`  This file is 45% of every word of documentation in this repo and its own header says to`);
  console.log(`  read it before authoring. Nothing can: at ${words.toLocaleString('en-US')} words it does not fit in a context window,`);
  console.log(`  so in practice no entry is read at all. ASK it instead:\n`);
  console.log(`    make mistakes Q="a prop the engine accepted and ignored"`);
  console.log(`    make mistakes N=496\n`);
  process.exit(0);
}

// Scored on the words of the query, title weighted over body, because a title is somebody's own summary
// of the defect and a body mentions everything the defect touched.
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
// A LOOSE MATCH IS NOT A MATCH. Scoring on any shared word makes "533 of 533 match" the answer to
// every question, which is true and tells the reader nothing. The headline counts entries scoring
// within half the best, which is the set actually worth a look; the rest stay reachable below.
const strong = scored.filter((x) => x.s >= scored[0].s * 0.5).length;
console.log(`\n  MISTAKES · "${QUERY}" · ${strong} strong match(es) of ${entries.length}, showing ${Math.min(LIMIT, scored.length)}`);
for (const { e } of scored.slice(0, LIMIT)) show(e);
if (scored.length > LIMIT) {
  console.log(`\n  ${scored.length - LIMIT} more, by title:`);
  for (const { e } of scored.slice(LIMIT, LIMIT + 12)) console.log(`    #${String(e.n).padStart(4)}  ${e.title.slice(0, 92)}`);
  console.log(`  Show one: make mistakes N=<number>`);
}
console.log('');
