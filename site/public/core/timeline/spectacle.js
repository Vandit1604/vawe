// core/timeline/spectacle.js: the film NOMINATES its loud moment, and the engine makes room for it.
//
// THE DEFECT THIS CLOSES. A `SPECTACLE` line was added to the authoring brief and the storyboard
// parser reads it. Nothing consumed it. A field an author must fill and no code reads is worse than
// no field, because the storyboard looks complete and the film is unchanged, the bug class logged
// most in this repo (engine-doctrine/MISTAKES.md #213, #369, #373).
//
//   "spectacle": { "at": 6.2, "of": "logo", "device": "flash", "why": "the mark lands" }
//
// TWO-SIDED, AND THAT IS THE ENTIRE POINT. Naming the loud moment is simultaneously a promise that
// every other beat stays restrained. So this resolver does two things and neither is optional:
//
//   1. THE PEAK. Reading 34 storyboards' own `spectacle:` lines, about five meant a shader sting; the
//      other 27 meant a match cut, a camera push, a ground change, a kinetic preset, a shape morph, an
//      anticipation snap, or a punch cut. Forcing all of them through a shader was worse than leaving
//      the block unbuilt: it injected a decorative effect nobody designed AND quietened the film to buy
//      it. `device` therefore names a mechanism from ANY registry that can carry a peak, never a second
//      vocabulary of its own (ONE OWNER PER FACT: the registries below already say which names exist).
//      The KIND of the name decides what happens next, and the two kinds are NOT symmetric:
//        - a SHADER STING (SPECTACLE_DEVICES, the twelve this always supported): the film has not
//          built it, so the engine INJECTS it, byte-identical to every scene that already uses one.
//        - a CUT, a SEAM, a KINETIC PRESET or another LAYER already in this film: the film has ALREADY
//          built the peak (that is the whole point of naming an existing mechanism instead of a
//          shader). Nothing is injected. The resolver only VERIFIES the named thing is really there, at
//          `at`, so a typo or a moved beat cannot claim a peak that silently stopped existing.
//   2. THE FLOOR. Every competing amplitude dial in the film is multiplied by SPECTACLE_GAIN.rest.
//      Not "warned about": pulled down, here, before any DOM exists.
//
// `of` is load-bearing on both sides: it is the subject the moment is ABOUT, and it is exempted from
// the floor along with the device's own layer (when the device names one). The named layer(s) keep
// full amplitude while the film quietens around them, which is the difference between a peak and a
// raised floor.
//
// A NAME FROM EVERY OTHER MECHANISM, `<kind>:<name>`. Names collide across registries (`fade` is
// plausibly a cut, a seam, or a kinetic preset), so this mirrors the SAME idiom `use:` already uses
// (harness/lib/contract.mjs resolveUse): a bare name resolves when it is unambiguous, and an ambiguous
// one is refused, listing every kind it could mean, never silently guessed. Do not invent a second
// syntax for this.
//
// WHAT "VERIFIES" CAN HONESTLY MEAN HERE. This file runs before any DOM exists (see below), so it
// cannot render a frame and look at it: that was `ground-arc.mjs`'s job, post-render,
// before it was retired (a TASTE gate, engine-doctrine/SAFEGUARDS.md); a human/agent judge does it now.
// What this file CAN see is the scene JSON itself, already lowered from
// `transitions[]` into `cuts`/`seams` by the time it runs. So "verify" means: the named cut/seam is
// declared at `at` (by name, by time), the named kinetic preset sits on a layer active at `at`, or the
// named layer exists and is active at `at`. That is honest and useful (a moved beat or a renamed layer
// breaks the check) and it is NOT a claim that the moment will look right; nothing here can see that.
//
// WHERE THIS RUNS. First thing in the scene callback, straight after `loadScene`, because stings and
// seams are parsed further down and layers further down still. It mutates the JSON and nothing else.
// The same shape as resolveBecomes and resolveAnchors, so renderFrame(n) is untouched and stays a
// pure function of n.
//
// A SCENE WITH NO `spectacle` RETURNS ON THE FIRST LINE. That is the acceptance test, not a courtesy:
// every scene that only ever used a shader device must keep rendering byte-identical, and the only way
// to promise that is to leave the shader branch untouched and add every other kind beside it.
import { SPECTACLE_DEVICES, SPECTACLE_GAIN, SPECTACLE_DUR, attenuated, attenuatedKick } from '../registry/knobs.js';
import { isLook, lookName, baseStrength, LOOK_NAMES } from '../looks/index.js';
import { CUT_REGISTRY } from '../cuts/index.js';
import { SEAM_REGISTRY } from './seams.js';
import { PRESET_REGISTRY } from '../kinetic/presets.js';

export const SPECTACLE_KEYS = ['at', 'of', 'device', 'why'];

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const fin = (v) => typeof v === 'number' && Number.isFinite(v);
// The join tolerance for "is this declared boundary AT `at`": beat-sync can snap an authored time by a
// couple of frames, so this is generous enough to survive that and still tight enough that a spectacle
// naming a cut three beats away is refused rather than waved through.
const NEAR_S = 0.15;

/** Every layer in the tree, children included: `of` may name one inside a group. */
function allLayers(layers, out = []) {
  for (const L of layers || []) {
    if (!isObj(L)) continue;
    out.push(L);
    if (L.children) allLayers(L.children, out);
  }
  return out;
}

/** activeAt(L, at): is layer L on screen at `at`. `duration` unset means "cannot see the far end", so
 * existence is all that can honestly be asked, and this returns true rather than guessing an end. */
function activeAt(L, at, tol = NEAR_S) {
  const start = fin(L.start) ? L.start : 0;
  if (start - tol > at) return false;
  const dur = fin(L.duration) ? L.duration : null;
  return dur == null || at <= start + dur + tol;
}

// ── THE OTHER KINDS A DEVICE CAN NAME ────────────────────────────────────────────────────────────
//
// Each entry: `has(name)` resolves the name against the registry that already owns it (never a second
// list here), and `find(name, at, layers, data)` returns the thing found (for exemption from the
// floor) or throws naming what IS there, the same voice `pick()` uses. `shader` is handled separately
// below because its outcome (inject) differs from every kind here (verify only).
const OTHER_KINDS = {
  cut: {
    has: (name) => CUT_REGISTRY.has(name),
    find(name, at, layers, data) {
      const cuts = Array.isArray(data.cuts) ? data.cuts : [];
      const hit = cuts.find((c) => isObj(c) && c.style === name && fin(+c.t) && Math.abs(+c.t - at) <= NEAR_S);
      if (!hit) throw new Error(`spectacle.device "cut:${name}" is not built: this film has no "${name}" cut within `
        + `${NEAR_S}s of ${at}s. Declared cuts: ${cuts.map((c) => `${c.style}@${c.t}s`).join(', ') || '(none)'}. `
        + `A non-shader device names a mechanism the film ALREADY builds; author the cut in transitions[] at ${at}s `
        + `first, or point \`at\` at the cut's own time.`);
      return { cut: hit };
    },
  },
  seam: {
    has: (name) => SEAM_REGISTRY.has(name),
    find(name, at, layers, data) {
      const seams = Array.isArray(data.seams) ? data.seams : [];
      const hit = seams.find((s) => isObj(s) && s.fx === name && fin(+s.t) && Math.abs(+s.t - at) <= NEAR_S);
      if (!hit) throw new Error(`spectacle.device "seam:${name}" is not built: this film has no "${name}" seam within `
        + `${NEAR_S}s of ${at}s. Declared seams: ${seams.map((s) => `${s.fx}@${s.t}s`).join(', ') || '(none)'}. `
        + `Author the seam in transitions[] at ${at}s first, or point \`at\` at the seam's own time.`);
      return { seam: hit };
    },
  },
  kinetic: {
    has: (name) => PRESET_REGISTRY.has(name),
    find(name, at, layers) {
      const hit = layers.find((L) => L.preset === name && activeAt(L, at));
      if (!hit) throw new Error(`spectacle.device "kinetic:${name}" is not built: no layer active at ${at}s carries `
        + `\`"preset": "${name}"\`. Layers carrying it: `
        + `${layers.filter((L) => L.preset === name).map((L) => `${L.id || '?'}@${L.start ?? 0}s`).join(', ') || '(none in this film)'}.`);
      return { layerId: hit.id };
    },
  },
  // A LAYER, not a registry vocabulary at all: the layer namespace already has one owner (the same
  // tree `of` is checked against), so naming one directly covers a ground change, a shape morph, a
  // match-cut target, or anything else authored as its own layer with no dedicated registry entry.
  layer: {
    has: (name, layers) => layers.some((L) => L.id === name),
    find(name, at, layers) {
      const hit = layers.find((L) => L.id === name);
      if (!activeAt(hit, at)) throw new Error(`spectacle.device "layer:${name}" is not on screen at ${at}s: `
        + `layer "${name}" runs ${hit.start ?? 0}s${fin(hit.duration) ? `-${(hit.start ?? 0) + hit.duration}s` : ' onward'}. `
        + `Point \`at\` inside that window, or name the layer that actually carries the moment.`);
      return { layerId: name };
    },
  },
};

/** parseDevice("cut:whipCut") -> {kindHint: "cut", name: "whipCut"}; "flash" -> {kindHint: null, name: "flash"} */
function parseDevice(raw) {
  const s = String(raw ?? '').trim();
  const colon = s.indexOf(':');
  return colon > 0 ? { kindHint: s.slice(0, colon).trim().toLowerCase(), name: s.slice(colon + 1).trim() }
    : { kindHint: null, name: s };
}

/**
 * resolveDevice(raw, at, layers, data) -> { shader } | { kind, name, ...exempt }
 * A shader resolves exactly as before (SPECTACLE_DEVICES.pick, same error voice, same twelve names).
 * Anything else resolves against OTHER_KINDS, mirroring `use: <kind>:<name>` (harness/lib/contract.mjs
 * resolveUse): unambiguous bare name wins, an ambiguous one is refused naming every kind it could mean,
 * and a `kind:name` prefix picks one outright.
 */
function resolveDevice(raw, at, layers, data) {
  const { kindHint, name } = parseDevice(raw);
  if (!name) throw new Error('spectacle.device is empty. Name a shader sting, or "<kind>:<name>" where kind is '
    + `one of: ${Object.keys(OTHER_KINDS).join(', ')}.`);

  if (kindHint) {
    if (kindHint === 'shader') return { shader: SPECTACLE_DEVICES.pick(name) };
    const kind = OTHER_KINDS[kindHint];
    if (!kind) throw new Error(`spectacle.device: "${kindHint}" is not a known kind. Known: shader, `
      + `${Object.keys(OTHER_KINDS).join(', ')}.`);
    if (!kind.has(name, layers)) throw new Error(`spectacle.device: no ${kindHint} named "${name}". `
      + (kindHint === 'layer' ? `This film's layer ids: ${layers.map((L) => L.id).filter(Boolean).join(', ') || '(none)'}.`
        : `Run \`make arsenal Q="${name}"\` to search.`));
    return { kind: kindHint, name, ...kind.find(name, at, layers, data) };
  }

  // BARE NAME, SHADER WINS. The twelve shader names were the WHOLE vocabulary before this change, so
  // every existing scene's bare (unprefixed) device string means a shader and nothing else, even where
  // a newer registry happens to reuse the same word (`cinematicZoom` is both a shader sting and a seam
  // fx). Byte-identical output for every scene that already ships one depends on this: an ambiguity
  // check here would turn a working film into a refusal the moment a second registry grew a matching
  // name, for a distinction no existing author ever meant to draw. `kind:name` is the escape hatch for
  // the rare case an author DOES want the other meaning.
  if (SPECTACLE_DEVICES.has(name)) return { shader: name };

  const matches = Object.keys(OTHER_KINDS).filter((k) => OTHER_KINDS[k].has(name, layers));
  if (matches.length > 1)
    throw new Error(`spectacle.device "${name}" names more than one kind: ${matches.map((k) => `${k}:${name}`).join(', ')}. `
      + `Write "device": "<kind>:${name}" to pick one.`);
  if (matches.length === 1)
    return { kind: matches[0], name, ...OTHER_KINDS[matches[0]].find(name, at, layers, data) };

  // Nothing knows this name at all: throw the same "unknown spectacle device" message
  // (core/registry/registry.js hint()) this always threw, with the legal shader names listed, and
  // append that the other kinds exist too, never replacing that message.
  try {
    SPECTACLE_DEVICES.pick(name);
  } catch (e) {
    throw new Error(`${e.message} Or name a mechanism this film ALREADY builds, with its kind: `
      + `${Object.keys(OTHER_KINDS).map((k) => `"${k}:<name>"`).join(', ')}.`, { cause: e });
  }
}

// The film's amplitude dials, pulled down one layer at a time. Everything here is a knob whose whole
// job is HOW LOUD, and whose resting value is owned by exactly one place that is asked for it rather
// than restated. A dial whose default lives in a preset and varies per preset (a glow's `intensity`,
// which presetSpec resolves as `o.i ?? 0.4` and friends) is touched only when the author SET it,
// inventing the unset default here would put a second copy of it in a second file, which is the
// duplicate-vocabulary shape this codebase keeps logging.
function quietenLayer(L) {
  if (L.type === 'glow' && L.intensity != null) L.intensity = attenuated(L.intensity, null);
  if (L.type === 'beam' && L.intensity != null) L.intensity = attenuated(L.intensity, null);
  // A COMPOSITE LOOK's master dial. `filter: "neon"` and `filter: "neon:0.9"` are the same knob
  // written two ways, so both resolve through the look's own merge and come back as the positional
  // form. baseStrength is looks.js answering what IT would have used; this file never guesses 0.7.
  if (typeof L.filter === 'string' && isLook(L.filter)) {
    const name = lookName(L.filter);
    const after = L.filter.slice(name.length + 1).trim();
    const positional = after !== '' && !isNaN(+after) ? +after : undefined;
    const base = baseStrength(name, L.lookOpts || {}, positional);
    if (base == null) throw new Error(`spectacle: layer "${L.id || '?'}" wears an unknown look "${name}", one of: ${LOOK_NAMES.join(', ')}`);
    L.filter = `${name}:${attenuated(base, null)}`;
  }
  // A KICK is the frame FEELING the edit, so under a declared spectacle it feels it less. Pulled
  // toward 1 rather than multiplied, see attenuatedKick.
  for (const m of (Array.isArray(L.modifiers) ? L.modifiers : [])) {
    if (!isObj(m) || m.kick == null) continue;
    if (m.kick === true) { m.kick = { scale: attenuatedKick(1.06) }; continue; }
    if (isObj(m.kick)) m.kick = { ...m.kick, scale: attenuatedKick(m.kick.scale == null ? 1.06 : m.kick.scale) };
  }
}

function validateSpectacleSpec(sp) {
  if (!isObj(sp))
    throw new Error(`spectacle must be an object like { "at": 6.2, "of": "logo", "device": "flash", "why": "the mark lands" }, got ${JSON.stringify(sp)}.`);
  for (const k of Object.keys(sp))
    if (!SPECTACLE_KEYS.includes(k))
      throw new Error(`spectacle: unknown key "${k}", known: ${SPECTACLE_KEYS.join(', ')}.`);
  if (!fin(sp.at) || sp.at < 0)
    throw new Error(`spectacle.at is the second the loud moment lands on, got ${JSON.stringify(sp.at)}.`);
  if (typeof sp.why !== 'string' || !sp.why.trim())
    throw new Error(`spectacle.why says what the moment is FOR, in one line. It is required: a peak nobody `
      + `can name is a volume setting, and this block quietens the whole rest of the film to buy it.`);
}

// Checked against the tree, listing what is there: an id typo is otherwise indistinguishable from a
// layer renamed three edits ago.
function resolveSpectacleSubject(data, sp) {
  const layers = allLayers(data.layers);
  const ids = layers.map((L) => L.id).filter(Boolean);
  if (typeof sp.of !== 'string' || !ids.includes(sp.of))
    throw new Error(`spectacle.of names the layer the moment is about, and no layer has id ${JSON.stringify(sp.of)}, `
      + `this film's ids: ${ids.length ? ids.join(', ') : '(none, no layer declares an id)'}.`);
  return layers;
}

// ONE MOMENT, ONE OWNER. An authored sting on the same instant would fire alongside the device, the
// exact opposite of nominating one peak.
function checkSpectacleClash(stings, sp) {
  const clash = stings.find((s) => isObj(s) && fin(+s.t) && Math.abs(+s.t - sp.at) < 0.05);
  if (clash)
    throw new Error(`spectacle at ${sp.at}s collides with the sting "${clash.fx}" already declared at ${clash.t}s. `
      + `The spectacle OWNS its moment: drop that sting, or move one of the two.`);
}

// Everything that competes, pulled down. The device's own layer is exempted alongside `of`: a kinetic
// preset or a ground layer named as the device is the peak itself.
function applySpectacleFloor(data, sp, resolved, layers, stings) {
  const exempt = new Set([sp.of, resolved.layerId].filter(Boolean));
  for (const s of stings) if (isObj(s)) s.intensity = attenuated(s.intensity, 1);
  for (const s of (Array.isArray(data.seams) ? data.seams : [])) if (isObj(s) && s !== resolved.seam) s.intensity = attenuated(s.intensity, 1);
  for (const L of layers) if (!exempt.has(L.id)) quietenLayer(L);
}

/**
 * resolveSpectacle(data): mutates the scene JSON in place. No-op without a `spectacle` block.
 * Refuses rather than substitutes: an unknown device, an unknown layer id and a moment already
 * occupied by an authored sting each throw with the legal names listed.
 */
export function resolveSpectacle(data) {
  const sp = data && data.spectacle;
  if (sp == null) return data;

  validateSpectacleSpec(sp);
  // Subject checked before the device so a non-shader device's own verification (which also reads
  // `layers`) has it ready.
  const layers = resolveSpectacleSubject(data, sp);
  // `pick`/`find` have no fallback parameter, so a near-miss cannot resolve to something else.
  const resolved = resolveDevice(sp.device, sp.at, layers, data);

  const stings = Array.isArray(data.stings) ? data.stings : (data.stings = []);
  checkSpectacleClash(stings, sp);
  applySpectacleFloor(data, sp, resolved, layers, stings);

  // A shader: written as a sting at `at`, above everything left. Anything else: already built,
  // already verified above; nothing to write.
  if (resolved.shader) stings.push({ t: sp.at, fx: resolved.shader, dur: SPECTACLE_DUR, intensity: SPECTACLE_GAIN.peak });
  return data;
}
