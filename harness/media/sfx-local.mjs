// ("re-distribution prohibited", https://soundeffect-lab.info/agreement/). Building a scraper or
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEST = path.join(repoRoot, 'assets/sfx');
const CREDITS = path.join(DEST, 'credits.json');
const MAP_FILE = path.join(repoRoot, 'harness/media/sfx-local-map.json');

const argv = process.argv.slice(2);
const dirAt = argv.indexOf('--dir');
const DIR = dirAt >= 0 ? argv[dirAt + 1] : null;
if (!DIR) { console.error('usage: node harness/media/sfx-local.mjs --dir <path-to-your-downloaded-sounds>  (or make sfx-local DIR=<path>)'); process.exit(1); }
if (!fs.existsSync(DIR) || !fs.statSync(DIR).isDirectory()) { console.error(`✗ sfx-local: ${DIR} is not a directory`); process.exit(1); }

const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
const roster = execFileSync('node', [path.join(repoRoot, 'generators/media/audio-bake.mjs'), '--list'])
  .toString().match(/^roles: (.+)$/m)[1].split(', ').map((r) => r.split('<-')[0]);
for (const role of Object.keys(map)) {
  if (role.startsWith('_')) continue;
  if (!roster.includes(role)) { console.error(`✗ ${MAP_FILE} maps role "${role}", which audio-bake.mjs no longer recognizes`); process.exit(1); }
}

fs.mkdirSync(DEST, { recursive: true });
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : { sounds: {} };
let ok = 0, missing = 0, skipped = 0;
for (const [role, file] of Object.entries(map)) {
  if (role.startsWith('_')) continue;
  if (!file) { skipped++; continue; }
  const src = path.join(DIR, file);
  if (!fs.existsSync(src)) { console.error(`  ✗ ${role}: ${file} not found in ${DIR}`); missing++; continue; }
  const wav = path.join(DEST, `${role}.wav`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', wav]);
  credits.sounds[role] = {
    file, sourceDir: DIR, pack: 'user-supplied (soundeffect-lab.info or your own choice)',
    licence: 'not verified by this tool: confirm the terms of wherever you got this file',
    licenceVerified: false,
  };
  console.log(`  ✓ ${role}.wav  (from ${file})`);
  ok++;
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + '\n');

console.log(`sfx-local: ${ok} role(s) mapped, ${missing} named but not found, ${skipped} left for the synth fallback.`);
console.log(`  edit ${path.relative(repoRoot, MAP_FILE)} to change the mapping. credits -> assets/sfx/credits.json`);
if (missing) process.exit(1);
