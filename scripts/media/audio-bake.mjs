// audio-bake.mjs — bake every sound the engine can use, from parameters, with no network.
//
//   node scripts/media/audio-bake.mjs            bake cues + the default beds
//   node scripts/media/audio-bake.mjs --list     print the cue table
//   make audio
//
// Synthesis lives in core/audio-kit.mjs. This file is the CATALOGUE: which cues exist, which
// engine role each fills, and which music beds ship. Deterministic — same input, same bytes — so
// re-baking never changes a shipped mix.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES, renderCue, musicBed, writeWav, normalize, SR } from '../../core/audio-kit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SFX = path.join(root, 'assets/sfx');
const MUSIC = path.join(root, 'assets/music');
fs.mkdirSync(SFX, { recursive: true }); fs.mkdirSync(MUSIC, { recursive: true });

// Engine role -> cue voicing. The Go mixer looks up assets/sfx/<name>.wav by cue name, so the
// engine's own role names (whoosh/reveal/...) must exist as files even though the voicings are
// Cuelume's. A role is an alias, not a copy: one spec, several names.
const ROLES = {
  // auto sound-design roles the scene builder emits
  whoosh: 'whisper',   // a cut — soft air, never a swoosh cliché
  reveal: 'chime',     // a sting — the thing that lands
  // named cues an author can place directly
  tick: 'tick', press: 'press', release: 'release', toggle: 'toggle', click: 'press',
  chime: 'chime', sparkle: 'sparkle', droplet: 'droplet', bloom: 'bloom', whisper: 'whisper',
  success: 'success', error: 'error', ready: 'ready', pop: 'droplet',
};

// Cut style -> cue. Sound design is not one whoosh on everything: a punch should snap and a
// softwipe should breathe. Consumed by the scene builder's auto sound-design.
export const CUT_CUE = {
  punch: 'press', whip: 'whisper', skewWhip: 'whisper', jitter: 'tick',
  softwipe: 'whisper', wipe: 'whisper', softiris: 'bloom', iris: 'bloom',
  rise: 'bloom', riseBlur: 'bloom', drop: 'droplet', zoom: 'droplet',
  slide: 'whisper', push: 'whisper', fade: 'whisper', blur: 'whisper',
  flip: 'toggle', spin: 'toggle', cube: 'toggle', roll: 'toggle',
  clock: 'tick', blinds: 'tick', barn: 'tick', squeeze: 'press', collapse: 'press', letterbox: 'press',
};

if (process.argv.includes('--list')) {
  console.log('cues:', Object.keys(CUES).join(', '));
  console.log('roles:', Object.entries(ROLES).map(([r, c]) => `${r}<-${c}`).join(', '));
  process.exit(0);
}

let n = 0, total = 0;
for (const [role, cue] of Object.entries(ROLES)) {
  const spec = CUES[cue];
  if (!spec) { console.error(`✗ role "${role}" points at unknown cue "${cue}"`); process.exit(1); }
  // seed from the ROLE name so each file is stable and independent of table order
  const seed = [...role].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  // Normalized to a common ceiling; per-cue balance is the mixer's job (sfxGain in audio.go).
  const dur = writeWav(path.join(SFX, `${role}.wav`), normalize(renderCue(spec, seed), 0.8));
  total += dur; n++;
}

// ---- music beds. A bed is a parameter set, so a brand can have its own without a licence. ----
const BEDS = {
  // calm + airy: minimal product films on white (tpot). No pulse — nothing to march to.
  calm:    { loop: 8, root: 110, chord: [1, 1.5, 2, 3], gain: 0.05, air: 0.014, tremolo: 0.25, brightness: 1.0 },
  // warm + slow: brand films that want body under the voice.
  warm:    { loop: 8, root: 98, chord: [1, 1.25, 1.5, 2], gain: 0.06, air: 0.010, tremolo: 0.2, brightness: 0.8 },
  // tense: countdown / reveal formats — a heartbeat under the pad.
  tense:   { loop: 8, root: 110, chord: [1, 1.2, 1.5], gain: 0.05, air: 0.018, tremolo: 0.25, pulse: 0.5, pulseGain: 0.18 },
};
for (const [name, opts] of Object.entries(BEDS)) {
  // A bed sits UNDER everything: a much lower ceiling than a cue, before musicGain.
  const dur = writeWav(path.join(MUSIC, `${name}.wav`), normalize(musicBed(opts), 0.34));
  total += dur; n++;
}
// default music.wav the Go mixer auto-discovers when a scene names no bed
fs.copyFileSync(path.join(MUSIC, 'calm.wav'), path.join(root, 'assets/music.wav'));

console.log(`✓ baked ${n} file(s), ${total.toFixed(1)}s of audio @ ${SR}Hz — synthesized, deterministic, no licence`);
console.log(`  sfx   → assets/sfx/     (${Object.keys(ROLES).length} roles)`);
console.log(`  music → assets/music/   (${Object.keys(BEDS).join(', ')}) + assets/music.wav default`);
