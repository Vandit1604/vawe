// core/fx/kick.js — kick the layer on the film's own joints. On a cut, a seam or a sting the frame
// changes and everything in it should feel the hit: a logo that flinches, a card that snaps a fraction
// bigger and settles, a rule that jumps. Editors cut to this and it is why a montage reads as one
// piece rather than as a stack of clips.
//
//   "modifiers": [{ "kick": true }]                                  // every joint, house default
//   "modifiers": [{ "kick": { "on": "cut", "scale": 1.08, "frames": 6 } }]
//   "modifiers": [{ "kick": { "on": ["seam", "sting"], "scale": 0.94 } }]
//
// FIRST CONSUMER OF scene.marks. Where a film turns was known only to scene.js: an author wanting a
// kick on every cut had to copy the cut times into the layer by hand, and that copy is wrong the
// first time anyone moves a cut, silently, because nothing relates the two lists. Reading the joints
// from the scene means a re-cut re-times every kick in the film for free.
//
// NAMED `kick` AND NOT `punch` because `punch` is already a CUT STYLE (core/cuts.js), and that one is
// this same gesture applied to the whole frame. Two spellings of one idea at two scopes, told apart by
// which key they sit under, is the confusion the modifier slot was named to avoid.
//
// FRAMES, NOT SECONDS, and it consumes scene.clock for both halves. A kick is 4 to 8 FRAMES — that is
// how it is specified in an edit, and it is the unit that keeps the same snap when the same film is
// rendered at 60. The mark test is on the integer frame too, because `t >= mark.t` re-derives a
// boundary out of t = f/fps and lands on the wrong side of it for some fps: a cut on frame 60 at 24fps
// is t = 2.5 exactly, and at 30fps t = 2.0000000000000004.
//
// WHY THE `scale` LONGHAND. The composition-order contract (core/fx/index.js) forbids a modifier from
// touching `transform`, which the cross-cutting tracks own and rewrite. `scale` is a separate CSS
// property (Transforms Level 2), the engine writes it nowhere else, and the used transform is
// `translate · rotate · scale · transform` — so the kick multiplies cleanly over whatever the tracks
// composed, is never read back, and renderFrame(n) stays pure in n. It is written IN FULL every frame,
// including the frames between marks, so a seek into the middle of the film cannot inherit a kick.
//
// It scales about the element's own centre, so on a layer that is not centred the corner moves. That
// is what a kick is; if a corner must stay pinned, put the modifier on a wrapper group.

export const KICK_KEYS = ['on', 'scale', 'frames'];
export const KICK_KINDS = ['cut', 'seam', 'sting'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

function resolve(spec) {
  const s = spec === true ? {} : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`kick: expected true or an object like { "on": "cut", "scale": 1.06 } — got `
      + `${JSON.stringify(spec)}. Keys: ${KICK_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!KICK_KEYS.includes(k))
      throw new Error(`kick: unknown key "${k}" — known: ${KICK_KEYS.join(', ')}.`);
  const on = s.on == null || s.on === 'any' ? KICK_KINDS
    : typeof s.on === 'string' ? [s.on] : s.on;
  if (!Array.isArray(on) || !on.length || !on.every((k) => KICK_KINDS.includes(k)))
    throw new Error(`kick: \`on\` names the joints to fire on — "any" (the default) or one or more `
      + `of ${KICK_KINDS.join(', ')}. Got ${JSON.stringify(s.on)}. There is no "beat": a beat boundary `
      + `in this engine IS a cut time, so it would be the same instant under a second name.`);
  const scale = s.scale == null ? 1.06 : s.scale;
  // A scale of 0 or less turns the layer inside out, and CSS accepts it silently.
  if (!num(scale) || scale <= 0)
    throw new Error(`kick: scale must be a positive multiplier — got ${JSON.stringify(s.scale)}. `
      + `Above 1 kicks out (1.06 is the default), below 1 kicks in.`);
  const frames = s.frames == null ? 5 : s.frames;
  if (!num(frames) || frames < 1)
    throw new Error(`kick: frames must be 1 or more — got ${JSON.stringify(s.frames)}. It is how many `
      + `FRAMES the kick takes to settle, which is how an edit specifies one; 4 to 8 reads as a hit.`);
  return { on, scale, frames };
}

export function build(kit, el, L, spec) { resolve(spec); }

export function frame(kit, el, L, t, scene, spec) {
  const { on, scale, frames } = resolve(spec);
  const { frame: f, fps } = scene.clock;
  // The most recent joint at or before this frame. The list is sorted at build, so this walks
  // backwards and stops; nothing is cached, so any frame can be rendered on its own.
  let since = Infinity;
  for (let i = scene.marks.length - 1; i >= 0; i--) {
    const m = scene.marks[i];
    if (!on.includes(m.kind)) continue;
    const mf = Math.round(m.t * fps);
    if (mf > f) continue;
    since = f - mf;
    break;
  }
  // (1-u)^2 decay: full kick on the mark's own frame, settling into 1 with no step at the end. A
  // linear settle reads as a slide back rather than as a hit.
  const u = since / frames;
  const s = u >= 1 || !Number.isFinite(u) ? 1 : 1 + (scale - 1) * (1 - u) * (1 - u);
  el.style.scale = s === 1 ? 'none' : s.toFixed(5);
}
