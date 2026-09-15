// generators/media/voice-cue.mjs: turn a `{voice, params}` cue into an ordinary named cue.
//
// A `voice` cue asks for a synthesised sound tuned by per-cue numbers (freq, gain, attack, decay,
// seed), which the static bake catalogue (generators/media/audio-bake.mjs, run once by `make audio`)
// cannot cover: its ROLES table is fixed at build time, one file per role, no per-scene parameters.
// So a voice cue is baked HERE, on demand, keyed by a content hash of (voice, params, sample rate),
// into assets/sfx/ alongside the static roles. Once written it is an ordinary named sample: the Go
// mixer (internal/audio/audio.go loadSfx) never learns a "voice" concept exists.
//
// Called from harness/author/expand-blocks.mjs, which is the Node step Go already shells out to
// before a render (internal/render/expand.go), so a `voice` cue is resolved to a file before the
// browser or the Go mixer ever sees the scene. Node-only (uses node:fs, node:crypto): never imported
// by core/audio/kit.mjs or any browser-reachable module.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { CUES, renderCue, normalize, encodeWav, SR } from '../../core/audio/kit.mjs';

// The only params a voice cue may set. Listed here, not just in the schema label, so an unknown key
// is refused instead of silently doing nothing (the same failure class this whole mechanism exists to
// close: a param a caller thinks is heard and is not).
export const VOICE_PARAM_KEYS = ['freq', 'gain', 'attack', 'decay', 'seed'];

// Apply params to a cloned CUES[voice] spec.
//   freq   scales every tone layer's frequency (and glideTo) by the same ratio, so a chord or an
//          interval keeps its shape and only its register moves.
//   gain   scales masterGain.
//   attack/decay  MULTIPLIERS on every layer's own attack/decay (1 = unchanged), so a voice can be
//          made snappier or longer without hand-editing each layer.
//   seed   picked by the caller instead of derived from the voice name, so two cues that want
//          different noise texture on the SAME voice do not collide.
// ponytail: five scalar knobs, not a general DSL over renderCue's spec. Add a key here (and to
// VOICE_PARAM_KEYS + the schema label) when a film needs one params can't already reach.
function applyParams(spec, params = {}) {
  const s = JSON.parse(JSON.stringify(spec)); // deep clone, renderCue must not see the shared table entry
  const baseFreq = s.layers.find((l) => l.kind === 'tone')?.frequency;
  if (params.freq != null && baseFreq) {
    const ratio = params.freq / baseFreq;
    for (const l of s.layers) if (l.kind === 'tone') {
      l.frequency *= ratio;
      if (l.glideTo != null) l.glideTo *= ratio;
    }
  }
  if (params.gain != null) s.masterGain = params.gain;
  // attack/decay are MULTIPLIERS on every layer's own value (1 = unchanged), applied against the
  // untouched original `spec`, never the clone being built, so the two params stay independent.
  spec.layers.forEach((orig, i) => {
    const l = s.layers[i];
    if (params.attack != null && orig.attack) l.attack = orig.attack * params.attack;
    if (params.decay != null && orig.decay) l.decay = orig.decay * params.decay;
  });
  return s;
}

function cacheKey(voice, params) {
  const h = createHash('sha1').update(JSON.stringify({ voice, params: params || {}, sr: SR })).digest('hex');
  return `voice-${h.slice(0, 12)}`;
}

/**
 * Resolve one {voice, params} cue to a baked name under `sfxDir` (assets/sfx by convention).
 * Returns the name (no extension, no directory) a `name` cue can use unchanged.
 * Throws on an unknown voice: the caller (expand-blocks.mjs) is a build step, not a place to
 * swallow a typo into silence.
 */
export function resolveVoiceCue(voice, params, sfxDir) {
  const spec = CUES[voice];
  if (!spec) throw new Error(`voice "${voice}" is not a cue core/audio/kit.mjs can synthesize. Known voices: ${Object.keys(CUES).join(', ')}.`);
  if (params) {
    const bad = Object.keys(params).filter((k) => !VOICE_PARAM_KEYS.includes(k));
    if (bad.length) throw new Error(`voice "${voice}" params has unknown key(s) ${bad.join(', ')}. Known: ${VOICE_PARAM_KEYS.join(', ')}.`);
  }
  const name = cacheKey(voice, params);
  const file = path.join(sfxDir, `${name}.wav`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(sfxDir, { recursive: true });
    const built = applyParams(spec, params);
    // seed: caller's params.seed if given, else the same "seed from the name" rule audio-bake.mjs
    // uses for static roles, so two default-seeded voice cues of the same voice+params always match.
    const seed = params?.seed ?? [...name].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
    const buf = normalize(renderCue(built, seed), 0.8);
    fs.writeFileSync(file, encodeWav(buf));
  }
  return name;
}

// Mutate `data.audio.cues` in place: every {voice, params} cue gets a `_bakedName`, the file under
// `sfxDir` core/audio/kit.mjs just rendered for it (or already had cached). `voice`/`params` are left
// UNTOUCHED, not folded into `name`: schema.json's `name` enum is a closed, hand-kept list (the same
// list core/validate/validate.mjs drift-guards against live CUES), and a generated cache key like
// "voice-a1b2c3d4e5f6" is never going to be a member of it, so writing one into `name` would fail the
// scene at boot (core/engine/boot.js runs the SAME schema check the browser and the CLI both share).
// `_bakedName` is a `_`-prefixed field (this repo's own "author note" convention, `_why`/`_template`)
// that the schema does not declare, so the generic validator never looks at it: `core/validate/
// validate.mjs`'s `walk()` only visits keys the schema's `fields` object names. The one line
// films/scene/scene.js is allowed to touch (its cue-meta push) reads `_bakedName` first, `name`
// second, bare `voice` last (a param-less voice already matches a statically baked role file).
export function bakeVoiceCues(data, sfxDir) {
  const cues = data?.audio?.cues;
  if (!Array.isArray(cues)) return data;
  for (const c of cues) {
    if (!c || typeof c.voice !== 'string' || !c.voice.trim()) continue;
    c._bakedName = resolveVoiceCue(c.voice, c.params, sfxDir);
  }
  return data;
}
