import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality/baselines/gate-census.json'), 'utf8'));

const rows = data.results
  .filter((r) => r.kind === 'film' || r.kind === 'repo')
  .map((r) => ({ ...r, everFired: r.filmsFired > 0 || r.filmsBlocked > 0 }))
  .sort((a, b) => (a.everFired === b.everFired ? a.file.localeCompare(b.file) : a.everFired ? 1 : -1));

console.log('check                           kind   run  fired  blocked  medianMs  referenced-by');
for (const r of rows) {
  console.log(
    `${r.file.padEnd(32)}${r.kind.padEnd(7)}${String(r.filmsRun).padStart(3)}  ${String(r.filmsFired).padStart(5)}  ${String(r.filmsBlocked).padStart(7)}  ${String(Math.round(r.medianMs ?? 0)).padStart(8)}  ${r.referencedBy.join(',') || '(none)'}`
  );
}

const skipped = data.results.filter((r) => r.kind !== 'film' && r.kind !== 'repo');
console.log('\nskipped (not censused):');
for (const r of skipped) console.log(`  ${r.file.padEnd(32)} ${r.kind.padEnd(16)} ${r.note || ''}`);

const zero = rows.filter((r) => !r.everFired);
console.log(`\n${zero.length} check(s) with 0 fires AND 0 blocks across the census: ${zero.map((r) => r.file).join(', ')}`);
