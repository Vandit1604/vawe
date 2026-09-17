// core/engine/tempo.js: the ONE dial for global pace. `tempo` on a scene scales every AUTHORED
// time in the data by 1/tempo (0.85 = 15% slower, so every duration/start/delay grows ~18%) and every
// typing rate by tempo, so the two stay in lockstep. Resolved ONCE, in core/engine/expand.js
// `expandScene`, as a pure rewrite of the scene's own numbers: every downstream consumer (bake,
// lower, render) sees ordinary authored times and never has to know tempo existed.
//
// Footage and the music BED are excluded on purpose. A `video` layer's window (`start`/`duration`) is
// a TIME field like any other, so it grows too, but core/layers/video.js maps window time straight to
// source time at rate 1 (`raw = f + (t-start)*rate`), so a longer window just shows MORE of the source
// at its native speed, never a slowed frame. The music bed is untouched entirely: the mixer already
// trims or loops it to whatever window length it is given.
//
// A CUE is not a bed. `audio.cues[].t` is a point event pinned to one instant in the film's own
// clock, the same shape as `transitions[].t`, so it scales exactly like every other point-in-time
// field. (2026-09-17: this used to be lumped into the "audio is excluded" reasoning above, which is
// only true of a bed; see engine-doctrine/MISTAKES.md for the incident.)
//
// FRAME-GRID SNAPPING: two authored times that met exactly (a layer's end landing on the next layer's
// start) can drift apart after a /tempo division lands on a repeating decimal (4.85/0.85 =
// 5.7058823...). Snapping every scaled time to the nearest 1/60s frame keeps a join that met before
// scaling still meeting after it; a render can't show a sub-frame time anyway.
export const MIN_TEMPO = 0.5;
export const MAX_TEMPO = 2;

const GRID = 1 / 60;
const snapTime = (v) => Math.round(v / GRID) * GRID;

// ONE TABLE, every authored-time field this resolver touches. Grep films/scene/schema.json's
// `layerProps.shared`/`byType` lists before adding a key here.
const LAYER_TIME_KEYS = [
  'start', 'duration', 'delay', 'enterDur', 'exitDur', 'each', 'stagger',
  'motionDelay', 'varsDelay', 'varsDur', 'untype',
];
const PART_TIME_KEYS = ['delay', 'each', 'stagger', 'exitDur'];
const CAMERA_SPEC_TIME_KEYS = ['start', 'dur', 'dwell'];
const CAMERA_STATION_TIME_KEYS = ['dur', 'dwell'];
const TRANSITION_TIME_KEYS = ['at', 't', 'dur'];
const CAPTION_TIME_KEYS = ['start', 'duration'];
// `beats[]` (item 3, core/timeline/relative-time.js) is already resolved to plain numbers by the time
// tempo runs (expand.js calls the relative-time resolver first), so it is an authored time like any
// other and must scale the same way, or a film's `beats[]` would read stale against every layer start
// that scaled off it.
const BEAT_TIME_KEYS = ['start', 'duration'];
const AUDIO_CUE_TIME_KEYS = ['t'];

function scaleWindow(w, inv) {
  if (!w || typeof w !== 'object') return;
  if (typeof w.from === 'number') w.from = snapTime(w.from * inv);
  if (typeof w.to === 'number') w.to = snapTime(w.to * inv);
}

function scaleKeys(obj, keys, inv) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of keys) if (typeof obj[k] === 'number') obj[k] = snapTime(obj[k] * inv);
}

function scaleLayer(L, inv, mul) {
  if (!L || typeof L !== 'object') return;
  scaleKeys(L, LAYER_TIME_KEYS, inv);
  if (Array.isArray(L.motion)) for (const kf of L.motion) if (kf && typeof kf.t === 'number') kf.t = snapTime(kf.t * inv);
  if (Array.isArray(L.parts)) for (const p of L.parts) scaleKeys(p, PART_TIME_KEYS, inv);
  // A layer's own `bg` is a colour string almost always, but carries the same window-array shape
  // (`{preset,from,to}`) as the scene-level `bg` when a layer opts into its own backdrop windows.
  if (Array.isArray(L.bg)) for (const w of L.bg) scaleWindow(w, inv);
  // `typing` doubles as the cps number (`true` = the 24cps default, a number = a custom rate); a
  // custom rate is a SPEED, not a duration, so it scales the OTHER way: by tempo, not 1/tempo.
  if (typeof L.typing === 'number') L.typing *= mul;
  if (typeof L.untypeRate === 'number') L.untypeRate *= mul;
  if (Array.isArray(L.children)) for (const c of L.children) scaleLayer(c, inv, mul);
}

function scaleCameraSpec(spec, inv) {
  if (!spec || typeof spec !== 'object') return;
  scaleKeys(spec, CAMERA_SPEC_TIME_KEYS, inv);
  if (Array.isArray(spec.stations)) for (const st of spec.stations) scaleKeys(st, CAMERA_STATION_TIME_KEYS, inv);
}

function scaleCaptionWords(words, inv) {
  for (const w of words) {
    if (!w || typeof w !== 'object') continue;
    if (typeof w.t0 === 'number') w.t0 = snapTime(w.t0 * inv);
    if (typeof w.t1 === 'number') w.t1 = snapTime(w.t1 * inv);
  }
}

function scaleCaption(C, inv) {
  scaleKeys(C, CAPTION_TIME_KEYS, inv);
  if (Array.isArray(C.words)) scaleCaptionWords(C.words, inv);
}

function assertInRange(tempo) {
  if (typeof tempo !== 'number' || !(tempo >= MIN_TEMPO && tempo <= MAX_TEMPO))
    throw new Error(`tempo ${JSON.stringify(tempo)}: must be a number between ${MIN_TEMPO} and ${MAX_TEMPO} `
      + '(1 = unchanged, 0.85 = 15% slower). Past this range a scene needs re-timing, not a global dial.');
}

/**
 * resolveTempo(data) -> data, mutated in place and returned. `tempo` absent, or exactly `1`: no-op
 * (byte-identical expansion). Refuses a value outside [0.5, 2]: past that range a scene needs
 * re-timing by hand, not a global dial.
 */
export function resolveTempo(data) {
  if (!data || typeof data !== 'object' || data.tempo == null) return data;
  const tempo = data.tempo;
  delete data.tempo;
  if (tempo === 1) return data;
  assertInRange(tempo);

  const inv = 1 / tempo;   // every authored TIME grows by this factor when tempo < 1
  const mul = tempo;       // every authored RATE (cps) shrinks by this factor when tempo < 1

  if (typeof data.duration === 'number') data.duration = snapTime(data.duration * inv);
  if (Array.isArray(data.beats)) for (const b of data.beats) scaleKeys(b, BEAT_TIME_KEYS, inv);
  for (const L of data.layers || []) scaleLayer(L, inv, mul);
  if (Array.isArray(data.bg)) for (const w of data.bg) scaleWindow(w, inv);
  if (Array.isArray(data.transitions)) for (const T of data.transitions) scaleKeys(T, TRANSITION_TIME_KEYS, inv);
  if (Array.isArray(data.captions)) for (const C of data.captions) scaleCaption(C, inv);
  if (Array.isArray(data.audio?.cues)) for (const cue of data.audio.cues) scaleKeys(cue, AUDIO_CUE_TIME_KEYS, inv);
  if (data.cameraMove) {
    const specs = Array.isArray(data.cameraMove) ? data.cameraMove : [data.cameraMove];
    for (const s of specs) scaleCameraSpec(s, inv);
  }
  return data;
}
