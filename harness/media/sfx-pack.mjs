// sfx-pack.mjs: fetch a real, CC0, shippable-by-licence sample pack and drop it over the synth cues.
//
//   node harness/media/sfx-pack.mjs        fetch Kenney "Interface Sounds" and map it onto engine roles
//   make sfx-pack
//
// SAMPLES ARE AN OVERRIDE, NEVER A REPLACEMENT. `make audio` (core/audio/kit.mjs) synthesizes every
// cue from parameters with no network and no licence at all; that is what makes a fresh clone sound
// right with zero downloads. This script only OVERWRITES the roles it has a real sample for. Any
// role it does not map (or that fails to fetch) is left for `make audio` to bake as before, so the
// fallback always plays.
//
// LICENCE, read before trusting this as the default: Kenney's "Interface Sounds" pack is Creative
// Commons Zero (CC0, public domain), confirmed from the pack's own License.txt:
//   "License: (Creative Commons Zero, CC0) http://creativecommons.org/publicdomain/zero/1.0/
//    This content is free to use in personal, educational and commercial projects."
// CC0 permits redistribution, which is why this pack (and only this pack) is the shippable default
// this repo suggests. See engine-doctrine/ASSET-SOURCES.md for every other source's terms. The
// engine's OWN policy stays the one in .gitignore: assets/sfx/*.wav is never committed regardless of
// licence, so nothing here changes what ships in git; it only decides what a build has by default.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEST = path.join(repoRoot, 'assets/sfx');
const CREDITS = path.join(DEST, 'credits.json');
const TMP = path.join(repoRoot, 'assets/sfx/.kenney-tmp');
const UA = { 'User-Agent': 'Mozilla/5.0 (vawe sfx-pack fetcher)' };

const PACK_URL = 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip';
const PACK_PAGE = 'https://kenney.nl/assets/interface-sounds';
const LICENCE = 'Creative Commons Zero (CC0), http://creativecommons.org/publicdomain/zero/1.0/';

// engine role -> file inside the pack's Audio/ folder. The engine's cue roster is owned by
// generators/media/audio-bake.mjs (`--list`), read here rather than retyped, so this table can only
// ever be a subset of the real roster and never drifts into inventing a role of its own.
const MAP = {
  whoosh: 'scroll_002', reveal: 'confirmation_002', chime: 'bong_001', sparkle: 'glass_002',
  droplet: 'drop_001', bloom: 'maximize_003', pluck: 'pluck_001', success: 'confirmation_001',
  ready: 'select_003', riser: 'question_002', drop: 'drop_003', impact: 'glitch_002',
  swell: 'minimize_004', braam: 'back_002', click: 'click_001', pop: 'click_004',
  tick: 'tick_001', key: 'click_002', press: 'click_003', release: 'click_005',
  toggle: 'toggle_001', page: 'open_001', loading: 'scroll_004', error: 'error_001',
  whisper: 'scratch_001', thud: 'close_002', travel: 'scroll_001', sweep: 'scroll_003',
};

// The one owner of the cue roster is the bake catalogue, not this list. A role this table names that
// the catalogue does not recognize any more is a stale mapping, not a role to invent.
const roster = execFileSync('node', [path.join(repoRoot, 'generators/media/audio-bake.mjs'), '--list'])
  .toString().match(/^roles: (.+)$/m)[1].split(', ').map((r) => r.split('<-')[0]);
for (const role of Object.keys(MAP)) {
  if (!roster.includes(role)) { console.error(`✗ sfx-pack maps role "${role}", which audio-bake.mjs no longer recognizes`); process.exit(1); }
}

fs.mkdirSync(DEST, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const zipPath = path.join(TMP, 'kenney_interface-sounds.zip');
const res = await fetch(PACK_URL, { headers: UA });
if (!res.ok) { console.error(`✗ sfx-pack: HTTP ${res.status} fetching ${PACK_URL}`); process.exit(1); }
fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
execFileSync('unzip', ['-oq', zipPath, '-d', TMP]);

const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : { sounds: {} };
let ok = 0, fail = 0;
for (const [role, file] of Object.entries(MAP)) {
  const ogg = path.join(TMP, 'Audio', `${file}.ogg`);
  const wav = path.join(DEST, `${role}.wav`);
  if (!fs.existsSync(ogg)) { console.error(`  ✗ ${role}: ${file}.ogg not in pack`); fail++; continue; }
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', ogg, '-ac', '1', '-ar', '44100', wav]);
  credits.sounds[role] = {
    file: `Audio/${file}.ogg`, pack: 'Kenney Interface Sounds', page: PACK_PAGE, source: PACK_URL,
    licence: LICENCE, licenceVerified: true,
  };
  console.log(`  ✓ ${role}.wav  (kenney ${file})`);
  ok++;
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + '\n');
fs.rmSync(TMP, { recursive: true, force: true });

const untouched = roster.length - ok - fail;
console.log(`sfx-pack: ${ok} role(s) overridden with real samples, ${fail} failed, ${untouched} untouched (synth fallback from \`make audio\`).`);
console.log(`  pack   → Kenney "Interface Sounds", CC0 (${PACK_PAGE})`);
console.log(`  credits → assets/sfx/credits.json (kept, never committed with the .wav files it describes)`);
if (fail) process.exit(1);
