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
  const [{ beatSheet }, { revealSheet }] = await Promise.all([import('./beats.mjs'), import('./reveal.mjs')]);
  const keep = auto && alreadyRead(dataArg);
  const s = await openScene(dataArg);
  try {
    const b = await beatSheet(s, { dataArg, vs, auto: auto && !keep });
    const r = await revealSheet(s, { dataArg, auto: auto && !keep });
    writeReceipt('beats', dataArg, { sheet: b.sheet, reveal: r.sheet, tool: 'sheets', ...(auto && !keep ? { auto: true } : {}) });
    return { beats: b.sheet, reveal: r.sheet, read: !auto || keep };
  } finally { await s.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node harness/author/sheets.mjs <scene.json> [--vs brand]'); process.exit(1); }
  const auto = !argv.includes('--read');
  bothSheets(dataArg, { vs: flag('--vs', null), auto }).then(({ beats, reveal, read }) => {
    console.log(`\n  READ BOTH. Neither is scored by any gate.`);
    console.log(`    beats  ${beats}   - where each beat LANDS (in - mid - out)`);
    console.log(`    reveal ${reveal}   - how each beat ARRIVES (green enter arc - white settled - orange exit arc)`);
    if (!read) console.log('  Made automatically, so they do NOT count as read: `make beats D=...` signs the look off.');
    console.log(`\nLook at this before you change anything: ${beats}`);
  }, (e) => {
    console.error(`\u2717 contact sheets: ${e.message}`);
    process.exit(1);
  });
}
