// sheets.mjs, BOTH review contact sheets from ONE browser, and the rule that keeps them honest.
//
// `make beats` and `make reveal` answer two halves of the same question (where a beat lands, and how it
// arrives) and used to cost two of everything: two HTTP servers, two puppeteer launches, two scene boots,
// two full passes of renderFrame. Nearly 27s for a pair of images that share every expensive step. Here
// the scene is opened once (scripts/author/scene-page.mjs) and both sheets are built off that one page.
//
//   node scripts/author/sheets.mjs <scene.json> [--vs brand]
//   make sheets D=formats/scene/x.json
//   make dev / make ship                       run this after the render (NOSHEETS=1 opts out)
//
// THE RECEIPT SPLIT, which is the whole reason this file is careful. `quality/runs/beats-seen/` exists to
// prove a PERSON LOOKED at a sheet, and beat-check fires `beats-unseen` when no receipt matches the
// scene's hash. Producing sheets automatically inside the iteration loop would make every receipt
// permanently fresh, so the gate could never fire again and would report green for scenes nobody has
// read. A gate that manufactures confidence, which is worse than no gate.
//
// So the two facts the receipt used to conflate are now separate:
//   the sheet is CURRENT for this scene content  → automatic, stamped here with `auto: true`
//   a person READ it                             → still only `make beats` / `make reveal`
// beat-check reads `auto` and keeps nagging, but names the sheet that is already on disk instead of
// asking for a command that has already been run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openScene } from './scene-page.mjs';
import { readReceipt, writeReceipt } from '../lib/receipt.mjs';

/** Make a string safe to hand ffmpeg's drawtext. The text goes through a filter-graph parser, so a
 *  colon or a quote inside it ends the argument and the whole graph fails to build, which is how
 *  `--vs` produced no sheet at all while printing a tick (the label was `SITE: <name>`). Strip rather
 *  than escape: this is a caption, and a caption that costs a debugging session is not worth the
 *  extra character. */
export const drawtext = (s, max = 46) => String(s).replace(/[^\w @.,%·/+-]/g, ' ').slice(0, max);

/** True when a fresh, human-granted receipt already covers this scene. An automatic sheet must never
 *  overwrite one: that would silently downgrade "somebody read this" to "a script made a picture". */
function alreadyRead(dataArg) {
  const r = readReceipt('beats', dataArg);
  return r.exists && !r.stale && !r.receipt.auto;
}

/** Both sheets off one open scene. Returns the two paths; throws if either cannot be built. */
export async function bothSheets(dataArg, { vs = null, auto = true } = {}) {
  // Imported here, not at module load: beats.mjs and reveal.mjs both import `drawtext` from this file,
  // so a top-level import either way round is a cycle.
  const [{ beatSheet }, { revealSheet }] = await Promise.all([import('./beats.mjs'), import('./reveal.mjs')]);
  const keep = auto && alreadyRead(dataArg);
  const s = await openScene(dataArg);
  try {
    const b = await beatSheet(s, { dataArg, vs, auto: auto && !keep });
    const r = await revealSheet(s, { dataArg, auto: auto && !keep });
    // Both writers stamp their own receipt as they go, so the last one wins and the file names only the
    // reveal sheet. Restamp with both, so beat-check can tell the author which two files to open.
    writeReceipt('beats', dataArg, { sheet: b.sheet, reveal: r.sheet, tool: 'sheets', ...(auto && !keep ? { auto: true } : {}) });
    return { beats: b.sheet, reveal: r.sheet, read: !auto || keep };
  } finally { await s.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/author/sheets.mjs <scene.json> [--vs brand]'); process.exit(1); }
  // `--read` is the explicit-look form: same sheets, but the receipt says a person asked for them.
  const auto = !argv.includes('--read');
  // No top-level await here: beats.mjs and reveal.mjs import `drawtext` from this module, and a module
  // that is still settling its own TLA never finishes evaluating for them. The cycle deadlocks silently
  // (node prints "unsettled top-level await" and exits 13 with no sheet).
  bothSheets(dataArg, { vs: flag('--vs', null), auto }).then(({ beats, reveal, read }) => {
    console.log(`\n  READ BOTH. Neither is scored by any gate.`);
    console.log(`    beats  ${beats}   - where each beat LANDS (in - mid - out)`);
    console.log(`    reveal ${reveal}   - how each beat ARRIVES (green enter arc - white settled - orange exit arc)`);
    if (!read) console.log('  Made automatically, so they do NOT count as read: `make beats D=...` signs the look off.');
  }, (e) => {
    console.error(`\u2717 contact sheets: ${e.message}`);
    process.exit(1);
  });
}
