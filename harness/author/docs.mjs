// docs.mjs: which ONE document settles this question?
//
//   make docs Q="how do I pick a transition"
//   node harness/author/docs.mjs "how do I pick a transition" [--n 3] [--json]
//
// WHY THIS REPLACED A SKILL. The same map used to be generated as `skills/vawe-docs/SKILL.md`: 157
// docs, 7,163 words, about 9,500 tokens, 158 outbound links. It was a table of contents wearing a
// skill's clothes, and it spent an always-loaded metadata slot to advertise itself. Two measured facts
// say a ranked lookup is the better shape:
//
//   Anthropic's published skill contract puts a SKILL.md body under 500 lines and about 5,000 tokens
//   (platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). That body was nearly
//   double the token half, and it could not be trimmed, because a generator wrote it from a corpus
//   that only grows.
//
//   Chroma's Context Rot study (18 frontier models) measures that a structurally coherent LONG
//   document performs WORSE than short independent chunks, even on simple retrieval
//   (trychroma.com/research/context-rot). So a bigger, better-organised router is the wrong direction
//   by evidence, not by taste: reading 157 rows to find one is the cost this removes.
//
// THE MAP ITSELF IS UNCHANGED and still generated: `engine-doctrine/INDEX.md` carries the full table
// for a human who wants to browse, and `quality/gates/doc-map.mjs` still owns and verifies it. This
// only adds the one-question door beside it.
//
// WHY IT DOES NOT REUSE ARSENAL'S SCORER, measured, because reusing it was the first design and it
// ranked badly. Two independent reasons, both about a 157-doc corpus being a different corpus:
//
//   `coverageIn`'s filler rule zeroes any word carried by over 6% of the corpus. That is calibrated
//   for 918 short blurbs. At 157 docs the threshold is 9 docs, so an ordinary domain word is filler:
//   Q="how do I pick a transition" gave TRANSITIONS.md coverage 0.000. CONFIDENT = 0.47 is calibrated
//   against that same corpus too. Transplanting either number here is the unsourced-constant move
//   `quality/gates/threshold-provenance.mjs` exists to refuse.
//
//   `score` matches a query word against the name as a SUBSTRING. Registry names are long and
//   distinctive so it rarely bites; hyphenated filenames are not, and `name.includes("do")` paid
//   SHOW-DONT-TELL.md +6 for a two-letter word, beating TRANSITIONS.md on that query.
//
// So this ranks on TOKENS, with idf computed over THIS corpus, and it makes no confidence claim it
// cannot support. There is no threshold here because nothing has calibrated one: the doc corpus has no
// labelled query set, the way `harness/dev/family-coverage.mjs` gives the effect corpus 148 of them.
// Until it does, saying "closest by wording" is the honest report and a borrowed 0.47 would not be.
//
// `harness/author/mistakes.mjs` is the cautionary case in the other direction: it grew its own scorer
// AND presented its best match as the answer whatever the score, which is the failure
// engine-doctrine/MISTAKES.md #552 records. Ranking locally is fine; claiming confidence is not.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docMap } from '../../quality/gates/doc-map.mjs';
import { toks } from './arsenal.mjs';
// filteredToks is toks minus PROSE_STOP: the words a QUESTION carries that the thing being described
// would not. harness/author/discovery.mjs owns that list because it hit the same problem first, and a
// second copy here is the drift this repo keeps paying for.
import { filteredToks } from './discovery.mjs';
import { emitJson } from '../lib/findings.mjs';

/** A doc entry as the ranker sees it: the same shape arsenal scores, built from the doc's frontmatter. */
const asEntry = (e) => ({
  // A doc entry carries no `name`, only `file` (skills do, docs do not), and the bare filename is what
  // an author says out loud: "that is in TRANSITIONS.md", never the full path.
  name: e.name || path.basename(e.file),
  kind: 'doc', slot: null,
  // `when` and `answers` ARE the description a doc author wrote for exactly this question, which is
  // why nothing here needs a second hand-kept keyword list.
  blurb: [e.when, e.answers].filter(Boolean).join(' · '),
  aka: [e.group].filter(Boolean), pitfall: null, doc: e.file,
});

/**
 * Rank every doc against the question. Token overlap, idf-weighted over this corpus, with a doc's own
 * NAME worth more than its description: `TRANSITIONS.md` is the answer to a question about transitions
 * and the filename is the strongest signal a doc carries.
 */
export function rankDocs(query, { n = 3 } = {}) {
  const entries = docMap().entries.map(asEntry).filter((e) => e.blurb);
  const qt = [...new Set(filteredToks(query))];
  if (!qt.length) return { query, all: entries.length, hits: [], matched: false };

  const nameToks = new Map(entries.map((e) => [e, new Set(toks(e.name))]));
  const blurbToks = new Map(entries.map((e) => [e, new Set(toks(`${e.blurb} ${(e.aka || []).join(' ')}`))]));

  // idf over THIS corpus, so a word every doc uses is worth little and a word one doc uses is worth
  // a lot. Computed here rather than imported, because the arsenal's is computed over its own corpus.
  const df = (q) => entries.filter((e) => nameToks.get(e).has(q) || blurbToks.get(e).has(q)).length;
  const idf = new Map(qt.map((q) => [q, Math.log(entries.length / (df(q) + 1))]));

  const hits = entries
    .map((e) => {
      let s = 0;
      for (const q of qt) {
        const w = Math.max(idf.get(q), 0);
        if (nameToks.get(e).has(q)) s += 3 * w;        // the filename is the strongest signal
        else if (blurbToks.get(e).has(q)) s += w;
      }
      return { ...e, s };
    })
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s || a.name.localeCompare(b.name));

  return { query, all: entries.length, matched: hits.length > 0, hits: hits.slice(0, n) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const nFlag = argv.indexOf('--n');
  // `nFlag + 1` only names a value to skip when the flag is actually present: at nFlag === -1 it
  // points at argv[0] and silently ate the first word of every unflagged query.
  const query = argv.filter((a, i) => !a.startsWith('--') && !(nFlag >= 0 && i === nFlag + 1))
    .join(' ').trim();
  if (!query) {
    console.error(`usage: make docs Q="<your question>"\n`
      + `       node harness/author/docs.mjs "<your question>" [--n 3] [--json]\n\n`
      + `  The full table, to browse rather than ask: engine-doctrine/INDEX.md\n`);
    process.exit(2);
  }
  const r = rankDocs(query, { n: Number(nFlag >= 0 ? argv[nFlag + 1] : 3) || 3 });
  if (argv.includes('--json')) { emitJson(r); process.exit(0); }

  console.log(`\n  DOCS \u00b7 "${query}"`);
  if (!r.matched) {
    console.log(`  nothing in the ${r.all} indexed documents uses any of those words.`);
    console.log(`  Try one word instead of a sentence, or browse engine-doctrine/INDEX.md.\n`);
    process.exit(0);
  }
  // "Closest", never "the answer": nothing has calibrated a confidence threshold for this corpus, so
  // the report says what it actually knows. See the header.
  console.log(`  closest of ${r.all} documents, by wording:\n`);
  for (const e of r.hits) {
    console.log(`  ${e.name}`);
    console.log(`      ${e.doc}`);
    console.log(`      ${e.blurb}\n`);
  }
}
