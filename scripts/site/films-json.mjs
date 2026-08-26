// scripts/site/films-json.mjs — how long each showcase film runs, read from the film.
//
//   node scripts/site/films-json.mjs            # check, and name every stale figure
//   node scripts/site/films-json.mjs --write    # rewrite site/lib/films.json
//
// WHY THIS EXISTS. `site/app/showcase/page.tsx` hand-typed a `dur` string per film. `creed-launch` was
// rewritten from 53s to 35.6s and the page still said `0:53`: the same hand-kept-number class that has
// already cost this repo eight stale counts across five files (#site-counts) and a poster nobody was
// watching (#471). A duration is a fact about the mp4, so ask the mp4.
//
// The films themselves are what ships: four of the six sources are gitignored as content, so the
// scene JSON is not always on disk and cannot be the source of this number. The encoded file always
// is, because the site serves it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILMS = path.join(ROOT, 'site/public/assets/films');
const OUT = path.join(ROOT, 'site/lib/films.json');
const write = process.argv.includes('--write');

if (!spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0) {
  console.error('✗ ffprobe is not on PATH. A duration is measured from the file, so there is nothing to read without it.');
  process.exit(2);
}

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const rows = {};
for (const f of fs.readdirSync(FILMS).filter((n) => n.endsWith('.mp4')).sort()) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
    path.join(FILMS, f)], { encoding: 'utf8' });
  const secs = parseFloat(String(r.stdout).trim());
  if (!(secs > 0)) { console.error(`✗ ${f}: ffprobe read no duration`); process.exit(1); }
  rows[f.replace(/\.mp4$/, '')] = { seconds: +secs.toFixed(2), label: clock(secs) };
}

const next = JSON.stringify(rows, null, 1) + '\n';
const prior = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
if (prior === next) { console.log(`✓ ${Object.keys(rows).length} film duration(s) match their mp4`); process.exit(0); }

if (write) {
  fs.writeFileSync(OUT, next);
  console.log(`✓ wrote ${Object.keys(rows).length} film duration(s) → ${path.relative(ROOT, OUT)}`);
  for (const [k, v] of Object.entries(rows)) console.log(`    ${k}  ${v.label}`);
  process.exit(0);
}
console.error(`✗ site/lib/films.json disagrees with the rendered films.`);
for (const [k, v] of Object.entries(rows)) {
  const was = prior ? (JSON.parse(prior)[k] || {}).label : undefined;
  if (was !== v.label) console.error(`    ${k}  says ${was ?? 'nothing'}, the mp4 runs ${v.label}`);
}
console.error(`  Fix: make films-json WRITE=1`);
process.exit(1);
