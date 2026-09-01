// audio-bake.mjs: bake every sound the engine can use, from parameters, with no network.
//
//   node scripts/media/audio-bake.mjs            bake cues + the default beds
//   node scripts/media/audio-bake.mjs --list     print the cue table
//   make audio
//
// Synthesis lives in core/audio-kit.mjs. This file is the CATALOGUE: which cues exist, which
// engine role each fills, and which music beds ship. Deterministic, same input, same bytes, so
// re-baking never changes a shipped mix.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES, renderCue, musicBed, writeWav, normalize, SR } from '../../core/audio-kit.mjs';
import { CUT_CUE, SEAM_CUE } from '../../core/audio-cues.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SFX = path.join(root, 'assets/sfx');
const MUSIC = path.join(root, 'assets/music');
fs.mkdirSync(SFX, { recursive: true }); fs.mkdirSync(MUSIC, { recursive: true });

// Engine role -> cue voicing. The Go mixer looks up assets/sfx/<name>.wav by cue name, so the
// engine's own role names (whoosh/reveal/...) must exist as files even though the voicings are
// Cuelume's. A role is an alias, not a copy: one spec, several names.
const ROLES = {
  // auto sound-design roles the scene builder emits
  whoosh: 'whisper',   // a cut, soft air, never a swoosh cliché
  reveal: 'chime',     // a sting, the thing that lands
  // Cuelume's own 14, available to an author by name
  chime: 'chime', sparkle: 'sparkle', droplet: 'droplet', bloom: 'bloom', whisper: 'whisper',
  tick: 'tick', press: 'press', key: 'key', release: 'release', toggle: 'toggle',
  success: 'success', error: 'error', page: 'page', loading: 'loading', ready: 'ready',
  // MOTION roles, voiced in core/audio-kit.mjs. The fifteen above are INTERACTION sounds, for a UI
  // where a person clicked. These are for a film, where a card lands and a camera travels, and
  // core/audio-tactile.js derives them from the timeline rather than asking an author to place them.
  thud: 'thud', travel: 'travel',
  riser: 'riser', sweep: 'sweep', pluck: 'pluck',
  // aliases onto the real cues, NOT new voicings. `click` and `pop` are names people reach for;
  // both resolve to Cuelume cues rather than to something invented alongside them.
  click: 'press', pop: 'droplet',
};

// Cut/seam cue tables now live in core/audio-cues.js (pure data, shared by scene.html + lib-test) so
// they cannot drift. Re-exported here for anything already importing them from the bake catalogue.
export { CUT_CUE, SEAM_CUE };

if (process.argv.includes('--list')) {
  console.log('cues:', Object.keys(CUES).join(', '));
  console.log('roles:', Object.entries(ROLES).map(([r, c]) => `${r}<-${c}`).join(', '));
  process.exit(0);
}

const FORCE = process.argv.includes('--force');
let n = 0, total = 0, kept = 0;
for (const [role, cue] of Object.entries(ROLES)) {
  const spec = CUES[cue];
  if (!spec) { console.error(`✗ role "${role}" points at unknown cue "${cue}"`); process.exit(1); }
  // `make audio` and `make sfx` write the SAME directory, so baking used to silently replace every
  // recorded sample with a synthesized one. Additive by default; --force to re-bake everything.
  if (!FORCE && fs.existsSync(path.join(SFX, `${role}.wav`))) { kept++; continue; }
  // seed from the ROLE name so each file is stable and independent of table order
  const seed = [...role].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  // Normalized to a common ceiling; per-cue balance is the mixer's job (sfxGain in audio.go).
  const dur = writeWav(path.join(SFX, `${role}.wav`), normalize(renderCue(spec, seed), 0.8));
  total += dur; n++;
}

// ---- music beds. A bed is a parameter set, so a brand can have its own without a licence. ----
const BEDS = {
  // calm + airy: minimal product films on white (tpot). No pulse, nothing to march to.
  calm:    { loop: 8, root: 110, chord: [1, 1.5, 2, 3], gain: 0.05, air: 0.014, tremolo: 0.25, brightness: 1.0 },
  // warm + slow: brand films that want body under the voice.
  warm:    { loop: 8, root: 98, chord: [1, 1.25, 1.5, 2], gain: 0.06, air: 0.010, tremolo: 0.2, brightness: 0.8 },
  // tense: countdown / reveal formats, a heartbeat under the pad.
  tense:   { loop: 8, root: 110, chord: [1, 1.2, 1.5], gain: 0.05, air: 0.018, tremolo: 0.25, pulse: 0.5, pulseGain: 0.18 },
};
// PROVENANCE FOLLOWS THE FILE, not the name. `make music` and this script both write into
// assets/music/ and only one of them recorded where a bed came from, so baking `calm` over a
// downloaded `calm` left credits.json describing a track that was no longer on disk, a licence
// record for the wrong file, which is worse than none (docs/MISTAKES.md #246).
const CREDITS = path.join(MUSIC, 'credits.json');
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};
for (const [name, opts] of Object.entries(BEDS)) {
  // A bed sits UNDER everything: a much lower ceiling than a cue, before musicGain.
  const dur = writeWav(path.join(MUSIC, `${name}.wav`), normalize(musicBed(opts), 0.34));
  if (credits[name]?.source && !credits[name].generated)
    console.log(`  ⚠ ${name}: credits.json described a downloaded track (${credits[name].source}). This bake replaced that file, so the entry is being corrected.`);
  credits[name] = { generated: 'scripts/media/audio-bake.mjs', genre: 'synth pad',
    licence: 'none, synthesized from parameters, carries no rights', licenceVerified: true,
    seconds: +dur.toFixed(2) };
  total += dur; n++;
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + '\n');
// NOTE: no assets/music.wav default is written. The synth beds read as a drone, so silence is the
// default (internal/audio/audio.go) and the real-loop pack (`make music-pack`) is the opt-in bed.
// These synth beds stay available for anyone who names one explicitly, but nothing auto-selects them.

console.log(`✓ baked ${n} file(s), ${total.toFixed(1)}s of audio @ ${SR}Hz. Synthesized, deterministic, no licence`);
console.log(`  sfx   → assets/sfx/     (${n} written, ${kept} kept, --force to re-bake)`);
console.log(`  music → assets/music/   (${Object.keys(BEDS).join(', ')}). Synth beds, opt-in only (real loops: make music-pack)`);
