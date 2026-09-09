// harness/author/mistakes.mjs: ASK the mistake log instead of reading it.
//
//   node harness/author/mistakes.mjs                     # the census, and why you cannot read it whole
//   node harness/author/mistakes.mjs "silent fallback"   # the entries that match, one line each
//   node harness/author/mistakes.mjs --n 496             # one entry's title + lesson + what holds it
//   node harness/author/mistakes.mjs --n 496 --full      # the ORIGINAL prose, from git history
//   make mistakes [Q="…"] [N=496] [FULL=1]
//
// WHY THIS FILE CHANGED SHAPE. docs/MISTAKES.md was 17,797 lines and 569 entries, 45% of every word of
// documentation in this repo. Its own header used to say "read this before authoring", and that was
// never true in practice: nobody ingests 17,797 lines, so the log written so a mistake is never
// repeated was the one file nothing actually consulted. The previous version of this comment argued
// AGAINST compressing it, on the theory that shortening an entry throws away the reasoning that stops
// a repeat. That argument is superseded: a full-text entry nobody reads preserves nothing either, and
// git already preserves the reasoning without asking a working file to carry both jobs at once.
//
// THE CURRENT SHAPE. `harness/author/mistakes-compact.mjs` rewrote docs/MISTAKES.md to three lines
// per entry: the title, one lesson sentence, and what holds it now (a gate or live check, by file, or
// "none"). The full write-up, root cause and all, is unchanged and un-lost: it lives in git at
// ARCHIVE_HASH below, the commit taken immediately before that migration. `--full` fetches it with
// `git show <hash>:docs/MISTAKES.md` and slices out the one entry, so the reasoning is still one
// command away, just no longer paid for on every read that only wanted the lesson.
//
// Same shape as `make arsenal`, deliberately: that tool solved the identical problem for the 337 named
// things an author cannot remember, and a second shape for the same job would be a second thing to learn.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'docs/MISTAKES.md');

// The commit holding the last full-prose version of docs/MISTAKES.md, set once by the migration and
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
    archived = execFileSync('git', ['show', `${ARCHIVE_HASH}:docs/MISTAKES.md`], { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
  } catch {
    console.error(`✗ could not read docs/MISTAKES.md at ${ARCHIVE_HASH}. Is this a shallow clone?`);
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

// PARSED, NEVER MAINTAINED AS A SECOND LIST. A hand-kept index of 533 entries would be the drift this
// repo logs more than anything else, and it would be 533 lines nobody reads either.
const entries = [];
const unnumbered = [];
const HEAD = /^## (?:#)?(\d+)[.:) ]*\s*(.*)$/;
const heads = lines.map((l, i) => (/^## /.test(l) ? i : -1)).filter((i) => i >= 0);
for (let k = 0; k < heads.length; k++) {
  const i = heads[k];
  let end = k + 1 < heads.length ? heads[k + 1] : lines.length;
  // The compact file ends with a block of `<!-- doc-refs-allow … -->` waivers carried over from the
  // prose. They are not part of the last entry, so an entry's body stops at the first one.
  const footer = lines.findIndex((l, j) => j > i && j < end && /^<!--/.test(l));
  if (footer >= 0) end = footer;
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
  [/\bquality\/gates\//g, 'quality/gates'],
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
  console.log(`  ${String(withField(/^holds: (?!none$)/m)).padStart(4)} held by a named gate or live check today`);
  console.log(`  ${String(withField(/^holds: none$/m)).padStart(4)} still just a sentence (\`holds: none\`), nothing enforces them\n`);

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
  console.log(`  This file used to be 17,797 lines of prose nobody could read whole. It is now an index:`);
  console.log(`  title, one lesson, what holds it. The full reasoning for any entry is one command away:\n`);
  console.log(`    make mistakes Q="a prop the engine accepted and ignored"`);
  console.log(`    make mistakes N=496`);
  console.log(`    make mistakes N=496 FULL=1   # the original write-up, from git history\n`);
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
