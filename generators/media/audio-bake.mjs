// audio-bake.mjs: bake every sound the engine can use, from parameters, with no network.
//
//   node generators/media/audio-bake.mjs            bake the cues
//   node generators/media/audio-bake.mjs --list     print the cue table
//   make gen X=audio
//
// Synthesis lives in core/audio-kit.mjs. This file is the CATALOGUE: which cues exist, which
// engine role each fills. Deterministic, same input, same bytes, so
// re-baking never changes a shipped mix.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES, renderCue, encodeWav, wavDuration, normalize, SR } from '../../core/audio/kit.mjs';
// The duration class per role name, owned by the gate that grades it. A role is an ALIAS onto a
// voicing, and an alias must inherit the envelope its own name implies, not the one its target has.
import { capFor } from '../../harness/lib/sfx-classes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SFX = path.join(root, 'assets/sfx');
fs.mkdirSync(SFX, { recursive: true });

// Engine role -> cue voicing. The Go mixer looks up assets/sfx/<name>.wav by cue name, so the
// engine's own role names (whoosh/reveal/...) must exist as files even though the voicings are
// Cuelume's. A role is an alias, not a copy: one spec, several names.
// THIRTEEN OF THESE POINTED AT DELETED CUES, and the loop below exits 1 on the first one, so `make
// audio` could not bake anything at all after the listening pass. A role is an alias, not a copy, and
// the deleted names are KEPT as aliases here on purpose: a shipped scene may already write
// `audio.cues[{name:"tick"}]`, and resolving that to the nearest surviving voicing is kinder than
// refusing to bake. What a role must never be again is an alias onto a cue that is not there.
// EXPORTED so quality/gates/sfx-audit.mjs can ask what this bake actually writes. It diffed the
// baked .wav files against core/audio/kit.mjs's CUES and called the 15 aliases below orphans, which
// is a false positive: they are deliberate redirects for scenes that already name a retired cue, and
// `make gen X=audio` writes a file for every one of them on every run. The bake's own name set is the only
// honest answer to "should this file exist".
export const ROLES = {
  // auto sound-design roles the scene builder emits
  whoosh: 'whoosh',    // a real voicing now, not an alias onto a soft hiss
  reveal: 'chime',     // a sting, the thing that lands
  // the pitched cues that survived the listening pass, available to an author by name
  chime: 'chime', sparkle: 'sparkle', droplet: 'droplet', bloom: 'bloom',
  pluck: 'pluck', success: 'success', ready: 'ready',
  // movement and weight, designed here for a film rather than ported from a UI library
  riser: 'riser', drop: 'drop', impact: 'impact', swell: 'swell',
  // aliases onto the real cues, NOT new voicings. `click` and `pop` are names people reach for; the
  // rest are the deleted cues, redirected so an existing scene that names one still bakes.
  click: 'pluck', pop: 'droplet', tick: 'pluck', key: 'pluck', press: 'pluck',
  release: 'pluck', toggle: 'pluck', page: 'whoosh', loading: 'swell', error: 'impact',
  whisper: 'swell', thud: 'impact', travel: 'whoosh', sweep: 'whoosh',
};

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
  // `make gen X=audio` and `make sfx` write the SAME directory, so baking used to silently replace every
  // recorded sample with a synthesized one. Additive by default; --force to re-bake everything.
  if (!FORCE && fs.existsSync(path.join(SFX, `${role}.wav`))) { kept++; continue; }
  // seed from the ROLE name so each file is stable and independent of table order
  const seed = [...role].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  // Normalized to a common ceiling; per-cue balance is the mixer's job (sfxGain in audio.go).
  let buf = normalize(renderCue(spec, seed), 0.8);
  // TRIM TO THE ROLE, NOT THE VOICING. `click` aliases `pluck`, a musical note for which 0.696s is
  // right; a click fires every 0.09s and 0.7s of it is the drone this whole cue set was rebuilt over.
  // Truncate to the role's own cap and fade the last 12ms so the cut does not click audibly.
  const capS = capFor(role);
  if (capS != null) {
    const cap = Math.floor(capS * SR);
    if (buf.length > cap) {
      buf = buf.slice(0, cap);
      const fade = Math.min(Math.floor(SR * 0.012), buf.length);
      for (let i = 0; i < fade; i++) buf[buf.length - 1 - i] *= i / fade;
    }
  }
  fs.writeFileSync(path.join(SFX, `${role}.wav`), encodeWav(buf));
  const dur = wavDuration(buf);
  total += dur; n++;
}

console.log(`✓ baked ${n} file(s), ${total.toFixed(1)}s of audio @ ${SR}Hz. Synthesized, deterministic, no licence`);
console.log(`  sfx   → assets/sfx/     (${n} written, ${kept} kept, --force to re-bake)`);
