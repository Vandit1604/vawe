// sfx-local.mjs: map YOUR OWN downloaded sound files onto the engine's cue names.
//
//   node harness/media/sfx-local.mjs --dir <path>
//   make sfx-local DIR=<path>
//
// This does not fetch anything. The owner's preferred sound source is soundeffect-lab.info: its
// terms permit commercial use and need no credit, but explicitly PROHIBIT redistribution
// ("re-distribution prohibited", https://soundeffect-lab.info/agreement/). Building a scraper or
// bulk downloader for that site would bundle their files into a tool other people run, which is
// redistribution wearing a script. So you download what you want from the site yourself, point this
// at the folder, and it copies your files onto assets/sfx/<role>.wav (never the other way round).
//
// The mapping is data, not code: harness/media/sfx-local-map.json, one role per line, edit it and
// fill in your filenames. A role left null keeps playing the synth cue from `make audio`, same
// override-not-replacement rule as `make sfx-pack`.
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
