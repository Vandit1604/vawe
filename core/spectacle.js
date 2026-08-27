// core/spectacle.js: the film NOMINATES its loud moment, and the engine makes room for it.
//
// THE DEFECT THIS CLOSES. A `SPECTACLE` line was added to the authoring brief and the storyboard
// parser reads it. Nothing consumed it. A field an author must fill and no code reads is worse than
// no field, because the storyboard looks complete and the film is unchanged, the bug class logged
// most in this repo (docs/MISTAKES.md #213, #369, #373).
//
//   "spectacle": { "at": 6.2, "of": "logo", "device": "flash", "why": "the mark lands" }
//
// TWO-SIDED, AND THAT IS THE ENTIRE POINT. Naming the loud moment is simultaneously a promise that
// every other beat stays restrained. So this resolver does two things and neither is optional:
//
//   1. THE PEAK. `device` is written as a shader sting at `at`, at SPECTACLE_GAIN.peak. One instant,
//      one gesture, and no new effect anywhere. The twelve legal devices are already in SHADER_FX.
//   2. THE FLOOR. Every competing amplitude dial in the film is multiplied by SPECTACLE_GAIN.rest.
//      Not "warned about": pulled down, here, before any DOM exists.
//
// `of` is load-bearing on both sides: it is the subject the moment is ABOUT, and it is the ONE layer
// the attenuation exempts. The named layer keeps its full amplitude while the film quietens around it,
// which is the difference between a peak and a raised floor.
//
// WHERE THIS RUNS. First thing in the scene callback, straight after `lowerScene`, because stings and
// seams are parsed further down and layers further down still. It mutates the JSON and nothing else.
// The same shape as resolveBecomes and resolveAnchors, so renderFrame(n) is untouched and stays a
// pure function of n.
//
// A SCENE WITH NO `spectacle` RETURNS ON THE FIRST LINE. That is the acceptance test, not a courtesy:
// 104 shipped scenes must render byte-identical, and the only way to promise that is to do nothing.
import { SPECTACLE_DEVICES, SPECTACLE_GAIN, SPECTACLE_DUR, attenuated, attenuatedKick } from './knobs.js';
import { isLook, lookName, baseStrength, LOOK_NAMES } from './looks.js';

export const SPECTACLE_KEYS = ['at', 'of', 'device', 'why'];

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const fin = (v) => typeof v === 'number' && Number.isFinite(v);

/** Every layer in the tree, children included: `of` may name one inside a group. */
function allLayers(layers, out = []) {
  for (const L of layers || []) {
    if (!isObj(L)) continue;
    out.push(L);
    if (L.children) allLayers(L.children, out);
  }
  return out;
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

/**
 * resolveSpectacle(data): mutates the scene JSON in place. No-op without a `spectacle` block.
 * Refuses rather than substitutes: an unknown device, an unknown layer id and a moment already
 * occupied by an authored sting each throw with the legal names listed.
 */
export function resolveSpectacle(data) {
  const sp = data && data.spectacle;
  if (sp == null) return data;

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

  // The device. `pick` has no fallback parameter, so a near-miss cannot resolve to something else.
  const device = SPECTACLE_DEVICES.pick(sp.device);

  // The subject. Checked against the tree, and the error LISTS what is there, an id typo is
  // otherwise indistinguishable from a layer that was renamed three edits ago.
  const layers = allLayers(data.layers);
  const ids = layers.map((L) => L.id).filter(Boolean);
  if (typeof sp.of !== 'string' || !ids.includes(sp.of))
    throw new Error(`spectacle.of names the layer the moment is about, and no layer has id ${JSON.stringify(sp.of)}, `
      + `this film's ids: ${ids.length ? ids.join(', ') : '(none, no layer declares an id)'}.`);

  // ONE MOMENT, ONE OWNER. An authored sting sitting on the same instant would fire alongside the
  // device and the peak would be two things at once, which is the exact opposite of nominating one.
  // In place, like every other resolver here: the caller holds this array and a replacement would
  // leave whoever captured it earlier reading the un-attenuated original.
  const stings = Array.isArray(data.stings) ? data.stings : (data.stings = []);
  const clash = stings.find((s) => isObj(s) && fin(+s.t) && Math.abs(+s.t - sp.at) < 0.05);
  if (clash)
    throw new Error(`spectacle at ${sp.at}s collides with the sting "${clash.fx}" already declared at ${clash.t}s. `
      + `The spectacle OWNS its moment: drop that sting, or move one of the two.`);

  // ---- THE FLOOR: everything that competes, pulled down --------------------------------------
  for (const s of stings) if (isObj(s)) s.intensity = attenuated(s.intensity, 1);
  for (const s of (Array.isArray(data.seams) ? data.seams : [])) if (isObj(s)) s.intensity = attenuated(s.intensity, 1);
  for (const L of layers) if (L.id !== sp.of) quietenLayer(L);

  // ---- THE PEAK: the device, on its own instant, above everything left --------------------------
  stings.push({ t: sp.at, fx: device, dur: SPECTACLE_DUR, intensity: SPECTACLE_GAIN.peak });
  return data;
}
