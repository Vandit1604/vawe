// engine-doctrine/MISTAKES.md #552 records. Ranking locally is fine; claiming confidence is not.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docMap } from '../../quality/gates/doc-map.mjs';
import { toks } from './arsenal.mjs';
import { filteredToks } from './discovery.mjs';
import { emitJson } from '../lib/findings.mjs';

/** A doc entry as the ranker sees it: the same shape arsenal scores, built from the doc's frontmatter. */
const asEntry = (e) => ({
  name: e.name || path.basename(e.file),
  kind: 'doc', slot: null,
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
  console.log(`  closest of ${r.all} documents, by wording:\n`);
  for (const e of r.hits) {
    console.log(`  ${e.name}`);
    console.log(`      ${e.doc}`);
    console.log(`      ${e.blurb}\n`);
  }
}
