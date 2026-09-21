// core/audio-tactile.js: the film's own motion, turned into sound.
//
// THE DEFECT THIS CLOSES. The engine holds a complete description of what moves and when: every cut,
// every layer entrance, every camera keyframe, every counter and every `parts` stagger. Nothing read
// it as sound. `buildSfx` scored cuts, stings and seams and stopped there, so a card the size of the
// frame landed in silence while the cut before it ticked. An engine that knows every event in its own
// timeline and voices none of them is the class of failure this repo logs most: a fact known in one
// place and never handed to the consumer that needs it.
//
// THE DERIVATION IS THE DESIGN. A cue here is a function of the motion that caused it. A large card
// lands as a `thud` and a chip as a `pluck`, the same layer is louder when it travels further than
// when it fades in place, and a counter plucks on the number's own easing curve rather than on a
// metronome. Nothing is placed by hand.
//
// WHAT IT DOES NOT DO: cuts and seams. Those were already voiced, by CUT_CUE and SEAM_CUE in
// core/audio-cues.js, and that table already draws the distinction this module would have had to
// redraw (a punch presses, a dissolve whispers, an iris blooms). A second table would be two ways to
// say one thing, which is the drift that generates the bugs. The structural cues are passed IN as
// `fixed` so the density rules can rank against them, and handed back unchanged.
//
// PURE. Cues are a function of the scene JSON plus two facts the DOM owns (how many elements a
// `parts` selector matched, and the canvas size), both handed in. Same input, same list, every run.
//
// OPT IN, via `audio.tactile`. `audio.auto` already scores cuts and seams and the shipped films rely
// on that mix being what it is; folding motion into `auto` would rewrite the sound of every one of
// them. Silence stays the engine default and a film asks for this.
import { resolveEasing } from '../motion/motion.js';
import { defineRegistry } from '../registry/registry.js';
// The per-unit delay of a stagger spec has ONE reader (core/type.js), so the object form
// `{ each, from, amount }` cannot mean one thing to the picture and another to the sound. Before this
// import `+(p.stagger)` on an object was NaN, and a NaN step silently collapsed a whole train to one
// pluck.
import { staggerStep } from '../type/type.js';

// The cue names this module reaches for. `tick` and the rest of the interaction vocabulary already
// bake; the five motion voices live in CUES in core/audio-kit.mjs alongside them.
// JUDGED BY EAR, AND FOUR OF THE ORIGINAL FIVE WERE REJECTED. This list used to read
// ['thud', 'travel', 'riser', 'sweep', 'pluck'], and it is the set the engine places AUTOMATICALLY
// whenever a film writes `audio.tactile`. Every one of those films was therefore scored with sounds
// nobody had ever listened to, because the only way to hear a cue was to render a film with it in.
//
// A listening pass over all twenty (quality/baselines/sound-verdicts.json, via `node harness/dev/sound-lab.mjs`)
// rejected `travel` and `sweep` outright and called `thud` and `riser` weak. So four of the five sounds
// this engine reached for BY DEFAULT were ones a person did not want, and a film shipped that way today.
//
// THE MEASURED REASON, which is better than the notes it came from. Sorting the twenty verdicts against
// their own specs: every cue kept has ZERO noise layers, and the likelihood of rejection rises with the
// noise-layer count (keep 0.00, weak 1.00, reject 1.40). Attack and peak barely differ between the
// groups, so "too sharp and loud" was a symptom: filtered white noise is what reads as cheap, whatever
// its envelope. This list is now the pitched ones only.
// THE LIST WAS TRIMMED AND THE EMITTERS WERE NOT, which left the derivation naming three cues that
// no longer existed: `thud` at a layer arrival, `travel` at a camera move, `riser` at the spectacle.
// A trimmed list is not a fix if the code that WRITES the names is somewhere else, and it was.
// `thud` is now `impact` and `travel` is now `whoosh`; `riser` is a name again, rebuilt without noise.
// All three voicings are in core/audio-kit.mjs under `swarm`.
export const MOTION_CUES = ['pluck', 'droplet', 'chime', 'bloom', 'impact', 'whoosh'];

// THE FIVE ARE CATALOGUED AND THE OTHER FIFTEEN ARE NOT, and that looks like two decisions in
// opposite directions until you see that CUES is TWO vocabularies in one map.
//
// `CUES` in core/audio-kit.mjs is waived out of the catalogue as "sound. The catalogue is picture",
// the same waiver CUT_CUE, SEAM_CUE and PROFILE_BED carry. That judgement is right about fifteen of
// its twenty entries: press, toggle, success, error, loading, ready are INTERACTION sounds, ported
// from a UI library, and audio-kit.mjs says in its own comment that a film has nobody clicking. An
// author composing a film does not pick from them.
//
// These five are the other thing. They are the film's own physics, derived from the timeline the
// engine already holds, and any of them can also be placed by hand as `audio.cues[]`. That is a name
// an author writes into scene JSON, which is exactly and only what the catalogue is for.
//
// So the contradiction was never "sound in or out". It is that one map holds a UI vocabulary and a
// film vocabulary, and the waiver judged the whole map by its majority. What was actually broken is
// smaller and is fixed here: the section passed `{ skip: null }`, so all five rows rendered as a
// DASH, and a catalogue that renders a blank is how blanks get shipped. The blurbs below are the
// voicing comments in core/audio-kit.mjs, moved rather than rewritten.
//
// NOT the whole field an author may name. `audio.cues[].name` also accepts four BAKED-ONLY aliases
// (whoosh, reveal, click, pop) that are not CUES keys at all; core/validate.mjs:1288 records that and
// treats the schema enum as a superset on purpose. Owning "every cue name a scene may write" in one
// place is a real change and a separate one.
export const MOTION_CUE_REGISTRY = defineRegistry('motion voice', Object.fromEntries(MOTION_CUES.map((n) => [n, n])), {
  slot: 'audio.cues[].name',
  blurbs: {
    impact: 'something heavy ARRIVES and lands hard: a hit with an edge, a mass and a room, in that order. A frame-sized card reaching its mark, a panel slamming home',
    whoosh: 'air moving past. One camera gesture, one whoosh, never one per keyframe: the sound rises as the move starts and falls away as it passes',
    droplet: 'something falls into place: a short pitched drop, placed automatically on a `drop` or `zoom` cut. The lightest of the arrival sounds',
    chime: 'a small bright accent where a moment resolves. Noticed rather than announced, so it survives repetition better than a sting does',
    bloom: 'something OPENS: placed automatically on an `iris`, `softiris`, `rise` or `riseBlur` cut, and on a declared `spectacle`. Slower in than the others, because an opening is not an arrival',
    pluck: 'punctuation, for a small element or a counter digit. Quiet on purpose: this is the one that becomes a machine gun, and the density rules exist because of it',
  },
  catalog: {
    title: 'Motion voices (tactile sound)',
    tag: 'audio',
    intro: 'The film SOUNDS its own motion. `audio:{tactile:true}` and core/audio-tactile.js read the timeline you already wrote: a layer thuds or plucks by its footprint and how far it travelled, a camera move is one `whoosh` per gesture, a counter plucks on the number\'s own easing curve, a declared `spectacle` blooms on the moment. These six are motion voices, distinct from the fifteen INTERACTION cues (press, toggle, success) which are for a UI where somebody clicked and which a film never picks from. Any of the six can also be placed by hand as `audio.cues[]`. Doctrine: `engine-doctrine/CRAFT/SOUND.md`.',
    usage: (n, { j }) => j({ audio: { cues: [{ t: 1.2, name: n }] } }),
    noPreview: 'a sound has no visual preview: these are heard, not seen. `make audio` bakes them to assets/sfx and any film with `audio:{tactile:true}` plays them.',
  },
});

// DENSITY IS THE DESIGN PROBLEM, not the mapping. A 53s film with 103 layers offers ~150 events; every
// one voiced is a hailstorm, and the hailstorm is what makes derived sound feel cheap. Three rules,
// and the middle one does most of the work.
export const DENSITY = {
  minGap: 0.05,      // two cues closer than this flam into one smeared attack: keep the heavier
  maxPerSec: 5,      // measured over a +/-0.5s window around each candidate
  floorArea: 0.0015, // a layer smaller than 0.15% of the frame is punctuation, not an arrival
  groundArea: 0.92,  // a layer covering 92%+ of the frame is the GROUND, not a thing that arrived
};

const r3 = (v) => Math.round(v * 1000) / 1000;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Decorative layers never sound. A glow is not an event, it is a condition of the frame.
const SILENT_TYPES = new Set(['glow', 'paint', 'shader', 'beam']);

// How far a layer TRAVELS on its way in, in px, read off the entrance name. Travel scales the cue's
// LEVEL: with no per-cue parameters, loudness is the only handle on how hard something lands, so a
// slide is louder than a fade of the same layer. Approximate on purpose, the ear reads the order of
// magnitude, and the alternative is a second table that drifts from core/clips.js.
export function travelOf(anim) {
  const a = String(anim || 'fade');
  if (/^(slide|whip|swipe|fly|push)/.test(a)) return 220;
  if (/^(rise|fall|drop|lift|up|down)/.test(a)) return 90;
  if (/^(pop|scale|zoom|bounce|spring)/.test(a)) return 40;
  if (/^(fade|blur|defocus|dissolve|reveal|wipe)/.test(a)) return 0;
  return 60;
}

// The layer's footprint as a FRACTION of the frame. Authored w/h win; text is measured from its own
// copy and point size; a picture that states neither falls back to a stated default rather than to
// zero, because a zero would silently make every unsized layer a chip.
export function prominenceOf(L, canvas) {
  const cw = canvas.w || 1920, ch = canvas.h || 1080;
  const size = +(L.size ?? 96);
  let w = L.w != null ? +L.w : null;
  let h = L.h != null ? +L.h : null;
  if (w == null || h == null) {
    const text = String(L.text ?? '');
    if (text) {
      const lines = text.split(/<br\s*\/?>|\n/);
      const longest = Math.max(...lines.map((s) => s.replace(/<[^>]*>/g, '').length));
      if (w == null) w = Math.min(cw, longest * size * 0.52);
      if (h == null) h = size * 1.25 * lines.length;
    } else {
      if (w == null) w = cw * 0.3;   // a stated default, never 0: an unsized picture is not a chip
      if (h == null) h = w * 0.6;
    }
  }
  return { area: (w * h) / (cw * ch), w, h };
}

// ---- the derivations, one per kind of event -----------------------------------------------------

// A LAYER ARRIVING. The whole argument of this module in one function: read the layer's size and its
// travel, and let those pick the sound and set its level. A hero card thuds, a chip plucks.
function arrivalCues(layers, canvas, out) {
  for (const L of layers) {
    if (!L || SILENT_TYPES.has(L.type)) continue;
    if (L.anim === 'none' || L.sound === false) continue;
    if (Array.isArray(L.parts) && L.parts.length) continue;   // the parts ARE this layer's arrival
    if (L.type === 'count') continue;                         // and so are a counter's own plucks
    const { area, w, h } = prominenceOf(L, canvas);
    if (area < DENSITY.floorArea) continue;
    // AND THE CEILING, which the floor above always implied. SILENT_TYPES says a glow is not an event,
    // it is a condition of the frame; a full-bleed rect is the same thing wearing a different type. A
    // film that crossfades its ground (dark terminal -> dark editor -> white films, a tint per playing
    // clip) has one of these per act, each covering the whole canvas, so each passed the floor and took
    // the HEAVIEST cue available: seven thuds where nothing landed. The owner heard it immediately and
    // called it "off beat sounds", which is exactly right, the beat had no event on it.
    if (area >= DENSITY.groundArea) continue;
    if (L.type === 'rect' && Math.min(w, h) <= 6) continue;   // a hairline rule is decoration
    const p = clamp(Math.sqrt(clamp(area, 0, 1)), 0, 1);
    const travel = travelOf(L.anim);
    const force = 0.62 + 0.38 * clamp(travel / 220, 0, 1);    // a fade lands softer than a slide
    const heavy = p >= 0.28;
    out.push({
      t: +(L.start ?? 0),
      name: heavy ? 'impact' : 'pluck',
      gain: r3(((heavy ? 0.2 : 0.09) + (heavy ? 0.3 : 0.18) * p) * force),
      w: r3(0.25 + 0.5 * p),
    });
  }
}

// A CAMERA MOVE. Contiguous keyframes that actually change are ONE move, so a punch-in and its
// release whoosh once for their whole span instead of twice a third of a second apart.
function cameraCues(camera, out) {
  const kf = (camera || []).filter((k) => k && Number.isFinite(+k.t)).slice().sort((a, b) => +a.t - +b.t);
  const moved = (a, b) => Math.abs((b.s ?? 1) - (a.s ?? 1)) > 0.02
    || Math.abs((b.x ?? 0) - (a.x ?? 0)) + Math.abs((b.y ?? 0) - (a.y ?? 0)) > 15
    || Math.abs((b.rx ?? 0) - (a.rx ?? 0)) + Math.abs((b.ry ?? 0) - (a.ry ?? 0)) + Math.abs((b.roll ?? 0) - (a.roll ?? 0)) > 0.5;
  let i = 0;
  while (i < kf.length - 1) {
    if (!moved(kf[i], kf[i + 1])) { i++; continue; }
    let j = i + 1;
    while (j < kf.length - 1 && moved(kf[j], kf[j + 1])) j++;
    const dur = +kf[j].t - +kf[i].t;
    // A longer move is a bigger gesture, so it is louder. It cannot be LONGER: the cue is a baked
    // wav of fixed length and nothing here can stretch it (see the report note on parameters).
    if (dur >= 0.2) out.push({ t: +kf[i].t, name: 'whoosh', w: 0.7,
      gain: r3(0.16 + 0.16 * Math.min(1, dur / 2)) });
    i = j;
  }
}

// A COUNTER. One pluck per step of the number, placed where the EASED value crosses each step, so the
// plucks crowd at the start of an easeOut and thin out as it settles: the rhythm the digits are
// already making. A pluck per digit CHANGE would be a machine gun (a count to 84 changes its units
// digit dozens of times), so the ear gets the velocity, not the arithmetic.
function counterCues(layers, out) {
  for (const L of layers) {
    if (!L || L.type !== 'count' || L.sound === false) continue;
    const start = +(L.start ?? 0), cs = +(L.countStart ?? 0.2), cd = +(L.countDur ?? 1.6);
    if (!(cd > 0)) continue;
    const ease = resolveEasing(L.ease || 'easeOutCubic');
    const n = clamp(Math.round(cd / 0.25), 3, 7);
    for (let i = 1; i <= n; i++) {
      const target = i / n;
      let u = 1;
      for (let k = 0; k <= 240; k++) { const uu = k / 240; if (ease(uu) >= target) { u = uu; break; } }
      const last = i === n;
      out.push({ t: r3(start + cs + cd * u), name: 'pluck',
        w: last ? 0.45 : 0.3, gain: last ? 0.15 : 0.09 });
    }
  }
}

// A `parts` STAGGER. One quiet pluck per matched element, on the stagger the eye is already following.
// `count` comes from the caller because only the DOM knows how many elements a selector matched;
// absent, nothing sounds, because a guessed count would put plucks where nothing moves.
const PART_MIN_GAP = 0.2, PART_MAX = 6;
function partCues(layers, out) {
  for (const L of layers) {
    if (!L || !Array.isArray(L.parts) || L.sound === false) continue;
    for (const p of L.parts) {
      const n = +(p.count ?? 0);
      if (!(n > 0)) continue;
      const st = +(L.start ?? 0) + +(p.delay ?? 0), step = Math.max(0, staggerStep(p.stagger, n, 0.06));
      // THIN THE TRAIN HERE, not in the density cap. Twelve spokes at a 0.05s stagger is 240 cues a
      // second; handing that to the greedy cap would let it chew arbitrary holes and leave a rhythm
      // that is neither the stagger nor anything else. Taking every kth part keeps the train EVEN,
      // which is the only version of it the ear reads as the same gesture.
      const every = step > 0 ? Math.max(1, Math.ceil(PART_MIN_GAP / step)) : n;
      let emitted = 0;
      for (let i = 0; i < n && emitted < PART_MAX; i += every, emitted++)
        out.push({ t: r3(st + i * step), name: 'pluck', w: 0.2, gain: 0.08 });
    }
  }
}

// THE SPECTACLE. One cue ON the nominated moment, the one cue in the film allowed to be loud, and
// the one the density cap may not drop: the film named this instant.
//
// IT LANDS ON THE MOMENT, IT DOES NOT BUILD INTO IT. This used to be a `riser` starting RISER_LEAD
// seconds early so the build ended on the beat. Two things were wrong with that. The listening pass
// in quality/baselines/sound-verdicts.json had already filed `riser` under `weak`, and the owner
// rejected it again by ear: a build into a moment reads as a trailer, not as motion design. And a
// cue that starts early is the only cue in the derivation whose time is not the time it means, which
// is the same stale-number shape that put two cues a second early in vawe-flow-2.
//
// `bloom` is one of the six the same listening pass marked `keep`, and it opens rather than hits,
// which is what a spectacle is: the frame arriving at its loudest idea, not being struck.
function spectacleCue(spectacle, out) {
  const at = spectacle && +spectacle.at;
  if (!Number.isFinite(at) || at <= 0) return;
  out.push({ t: r3(at), name: 'bloom', w: 1, gain: 0.45, protect: true });
}

// ---- density: the part that decides what does NOT sound ------------------------------------------
//
// Greedy by weight, not by time. Sorting by time and dropping the overflow keeps whatever happened
// FIRST, which in a dense beat is usually the least important thing in it (a rule, a chip). Sorting
// by weight keeps the headline and the cut and drops the hairline, which is the whole reason cues
// carry a prominence at all.
export function capDensity(cues, { minGap = DENSITY.minGap, maxPerSec = DENSITY.maxPerSec } = {}) {
  const byT = (a, b) => a.t - b.t || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || a.gain - b.gain;
  const order = cues.slice().sort((a, b) =>
    (b.protect ? 1 : 0) - (a.protect ? 1 : 0) || b.w - a.w || byT(a, b));
  const window = (list, c) => list.filter((k) => Math.abs(k.t - c.t) < 0.5);
  const kept = [];
  for (const c of order) {
    if (!c.protect) {
      if (kept.some((k) => Math.abs(k.t - c.t) < minGap)) continue;
      if (window(kept, c).length >= maxPerSec) continue;
    }
    kept.push(c);
  }
  // THE REPAIR PASS, and it is not optional. The greedy loop only ever measures against the cues it
  // has ALREADY kept, so it counts a burst's past and never its future: 120 arrivals 0.12s apart each
  // saw four predecessors, none saw the four successors, and every one was accepted. One sweep, over
  // the finished set, drops the lightest cue out of any over-full second until the invariant holds.
  // ponytail: O(n^2) per sweep on a list of hundreds, which is free, and it converges by construction
  // because every sweep removes exactly one cue.
  for (let guard = kept.length; guard >= 0; guard--) {
    const hot = kept.find((c) => window(kept, c).length > maxPerSec);
    if (!hot) break;
    const worst = window(kept, hot).filter((k) => !k.protect).sort((a, b) => a.w - b.w || b.t - a.t
      || (a.name < b.name ? 1 : a.name > b.name ? -1 : 0))[0];
    if (!worst) break;   // a second full of protected cues: the film asked for every one of them
    kept.splice(kept.indexOf(worst), 1);
  }
  return kept.sort(byT);
}

// derive(): every motion cue the scene implies, before any density rule. Exported so a harness can
// report the cost of the cap as a number rather than a claim.
export function derive(scene = {}, opts = {}) {
  const canvas = opts.canvas || { w: 1920, h: 1080 };
  const cfg = opts.config === true ? {} : (opts.config || {});
  const out = [];
  arrivalCues(scene.layers || [], canvas, out);
  cameraCues(scene.camera, out);
  counterCues(scene.layers || [], out);
  partCues(scene.layers || [], out);
  spectacleCue(scene.spectacle, out);
  const dur = +scene.duration || Infinity;
  return out.filter((c) => Number.isFinite(c.t) && c.t >= 0 && c.t < dur);
}

// tactileCues: the whole derivation, capped. `layers` are the layer objects the scene built
// (`parts[].count` filled in by the caller from the DOM). `fixed` is the cue list the scene has
// ALREADY derived from its cuts, seams and stings: those are structure, they always sound, and they
// are passed in only so the density rules can rank a card's arrival against the cut it lands on.
// They are not returned; the caller already holds them. Cues come back sorted, in the existing
// { t, name, gain } shape, deterministic.
export function tactileCues(scene = {}, opts = {}) {
  const cfg = opts.config === true ? {} : (opts.config || {});
  const fixed = (opts.fixed || []).map((c) => ({ t: +c.t, name: c.name, gain: c.gain, w: 1, protect: true, _fixed: true }));
  const capped = capDensity(derive(scene, opts).concat(fixed), {
    minGap: cfg.minGap ?? DENSITY.minGap,
    maxPerSec: cfg.maxPerSec ?? DENSITY.maxPerSec,
  });
  const g = cfg.gain ?? 1;
  return capped.filter((c) => !c._fixed)
    .map((c) => ({ t: r3(c.t), name: c.name, gain: r3(c.gain * g) }));
}
