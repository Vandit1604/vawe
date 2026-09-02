// scripts/site/effects-json.mjs: derive the site's effects index from the SAME family list that
// generates docs/EFFECTS.md, plus one playable scene per previewable effect.
//
//   node scripts/site/effects-json.mjs [--check]   ·   make effects-json
//
// Writes:
//   site/lib/effects.json                       the index the /showcase/effects page renders
//   site/public/assets/effects/<slug>.json      one scene per previewable effect, played live
//
// WHY IT IMPORTS effects-catalog.mjs RATHER THAN THE REGISTRIES. Both would be "derived", but two
// derivations is two family lists, and the moment they disagree the site shows a name the docs do
// not (or the other way round) with both files still valid. That is the blocks.json failure recorded
// in scripts/site/blocks-json.mjs, one layer up. `sections` is exported there; this reads it.
//
// THE JSON SNIPPET IS NOT INVENTED. Every family already documents its own authoring form in the
// intro string effects-catalog.mjs renders above its table. USAGE below carries that form, one per
// family, with the name substituted. A family with no USAGE entry FAILS this script rather than
// rendering an empty code block, for the same reason a family with a gap in its blurb map fails
// effects-catalog.mjs: a catalog that silently renders a blank is how blanks get shipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, d } from './effects-catalog.mjs';
import { FEEL, DURATION, CAMERA_WORDS } from '../../core/vocab.js';
import { ASPECTS } from '../../core/safe.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');
const INDEX = path.join(root, 'site/lib/effects.json');
const SCENES = path.join(root, 'site/public/assets/effects');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// The registry blurbs are written for a markdown doc and lean on the em-dash. No em-dash reaches a
// user-facing surface here (CLAUDE.md, hard rules), and the blurbs live in core/ where this script
// has no business editing them, so the dash is normalised on the way out. The middle dot is the
// sanctioned replacement and it is what the rest of the site already uses.
const prose = (s) => String(s).replace(/\s*[: –]\s*/g, ' · ');
const j = (o) => JSON.stringify(o, null, 2);

// ── the JSON an author writes, per family ───────────────────────────────────────────────────────
// Each returns the snippet shown in the drawer. The shape comes from that family's own intro in
// effects-catalog.mjs (or, where the intro names no form, from formats/scene/schema.json).
const text = (extra) => j({ type: 'text', text: 'Deterministic by design', x: 160, y: 420, w: 1600, size: 120, weight: 800, ...extra });
const full = (extra) => j({ x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6, ...extra });

const USAGE = {
  // PRE-EXISTING GAP, closed while adding the family above: `make effects` was already red on this
  // one, so the catalogue could not regenerate at all. A modifier is an array entry on a layer.
  // A glow preset is a whole LAYER, not a prop on somebody else's, so its usage shows the layer.
  'glow-presets': (n) => j({ type: 'glow', preset: n, x: 460, y: 240, w: 1000, h: 600, intensity: 0.4,
    start: 0, duration: 6 }),
  'per-layer-modifiers': (n) => text({ anim: 'rise', modifiers: [{ [n]: true }] }),
  // A motion voice is placed by the DERIVATION, not usually by hand, but it can be named directly and
  // an author reading the catalogue needs to see how.
  'motion-voices-tactile-sound': (n) => j({ audio: { cues: [{ t: 1.2, name: n }] } }),
  'kinetic-text-presets': (n) => text({ split: 'word', preset: n, each: 0.5, stagger: 0.05 }),
  'stagger-order-from': (n) => text({ split: 'char', preset: 'up', each: 0.5, stagger: { amount: 0.6, from: n } }),
  'scramble-charsets-chars': (n) => text({ split: 'word', preset: 'decode', each: 0.9, presetOpts: { chars: n, rate: 48, revealDelay: 0.25 } }),
  // THREE FAMILIES ADDED WITHOUT THEIR ROWS, and `make effects` was red for all three at once, so the
  // catalogue could not regenerate at all. A family is not shipped until it can be looked up: this
  // table is the only place that says how to WRITE one.
  // An interpolation mode is not an easing and does not go in `ease`'s usual slot mentally, so the
  // form matters: it is the key on a motion KEY, and it governs the segment arriving at that key.
  'interpolation-modes-not-easings': (n) => text({ anim: 'none', motion: [{ t: 0, x: -300 }, { t: 0.8, x: 0, ease: n }, { t: 1.6, x: 300, ease: n }] }),
  // A HANDLE is one SIDE of one key, and the slot says which side, so the form has to show both
  // sides of a segment at once or the name reads as a whole-segment easing, which is the thing it
  // is not. Written as a name here; the long form is { influence, speed }.
  'keyframe-handles-the-graph-editor': (n) => text({ anim: 'none', motion: [{ t: 0, x: -300, easeOut: n }, { t: 0.9, x: 300, easeIn: n }] }),
  // A depth is a NAMED PLANE, so it is one word on the layer and the camera does the rest.
  'depths-parallax-planes': (n) => text({ depth: n }),
  // An adjustment layer is a LAYER, not a prop, and `track` is the whole contract: everything with a
  // lower track is graded, everything above it is untouched.
  'adjustment-layers-grade-what-is-beneath': (n) => j({ layers: [{ type: 'adjust', kind: n, amount: 18, track: 6, start: 1.2, duration: 1.5 }] }),
  'enter-exit-anims': (n) => text({ anim: n, enterDur: 0.6, out: 'defocus' }),
  'idles-ambient-hold-motion': (n) => text({ idle: n }),
  'gsap-named-effects': (n) => text({ anim: 'none', fx: n }),
  'gsap-exits': (n) => text({ anim: 'rise', fxOut: n, exitDur: 0.6 }),
  'scene-cuts': (n) => j({ cuts: [{ t: 2.4, style: n }] }),
  'shader-stings': (n) => j({ stings: [{ t: 2.4, fx: n }] }),
  'spectacle-devices': (n) => j({ spectacle: { at: 2.4, of: 'hero', device: n, why: 'the one loud moment, and every other dial drops to 55%' } }),
  'seams-2-scene-blends': (n) => j({ seams: [{ t: 2.2, fx: n, dur: 0.8 }] }),
  'composite-looks-static': (n) => j({ type: 'image', src: 'assets/shot.png', x: 160, y: 140, w: 1600, filter: `${n}:0.9` }),
  'canvas-image-passes-baked': (n) => j({ type: 'image', src: 'assets/shot.png', x: 160, y: 140, w: 1600, canvasFx: n }),
  'generative-paint-fx-per-frame': (n) => full({ type: 'paint', paint: n }),
  backgrounds: (n) => j({ bg: [{ preset: n, from: 0, to: 6 }] }),
  // Two pseudo-names ("beam:border (border-beam)"), so the form is picked off the mode in the name.
  'per-frame-accent-layers': (n) => j({ type: 'beam', mode: n.includes('shine') ? 'shine' : 'border', x: 300, y: 430, w: 1320, h: 220, radius: 22, thickness: 3, speed: 0.5, start: 0, duration: 6 }),
  'vector-layer-logos-icons': (n) => (n.includes('morph')
    ? j({ type: 'svg', d: 'M60 8 L112 100 L8 100 Z', morph: { to: 'M60 8 L112 56 L60 104 L8 56 Z', spin: 6.28 }, x: 840, y: 420, w: 240 })
    : j({ type: 'svg', d: 'M60 8 L112 100 L8 100 Z', stroke: '#fff', strokeWidth: 6, x: 840, y: 420, w: 240, start: 0, duration: 6 })),
  'beat-blueprints': (n) => j({ type: 'beat', beat: n, start: 0.2, dur: 4.4, x: 160, y: 320, w: 1200 }),
  'camera-dials': () => j({ cameraBlur: true }),
  'camera-moves': (n) => j({ cameraMove: { move: n } }),
  'compositions-bespoke-per-beat-timeline': (n) => j({ type: 'composition', comp: n, props: {}, start: 0.2, dur: 4.4 }),
  'layer-types': (n) => j({ type: n }),
  'three-js-scenes-real-geometry': (n) => full({ type: 'three', three: n }),
  'raymarched-surfaces': (n) => full({ type: 'raymarch', raymarch: n }),
  'layer-as-texture-resample': (n) => j({ type: 'image', src: 'assets/shot.png', x: 160, y: 140, w: 1600, resample: { fx: n, amount: [0, 1] } }),
  'ambient-shader-fields': (n) => full({ type: 'shader', shader: n }),
  // `modifiers`, NOT `fx`: core/fx/index.js says so in its own header, and `fx` is the GSAP slot.
  'per-layer-fx': (n) => text({ modifiers: [{ type: n }] }),
  'part-entrances': (n) => j({ type: 'html', html: '<svg>…</svg>', x: 160, y: 200, w: 1600, parts: [{ select: 'rect', anim: n, each: 0.4, stagger: 0.06 }] }),
  'effector-falloffs': (n) => j({ type: 'html', html: '<div data-clone>…</div>×64', x: 160, y: 140, w: 1600, effector: { select: '[data-clone]', falloff: n, radius: 320, sticky: 1, drives: { scale: 0.75 }, path: [{ t: 0, x: -220, y: 300 }, { t: 2.2, x: 1820, y: 300 }] } }),
  'effector-drives': (n) => j({ type: 'html', html: '<div data-clone>…</div>×64', x: 160, y: 140, w: 1600, effector: { select: '[data-clone]', drives: { [n]: 0.6 }, radius: 320, sticky: 1, path: [{ t: 0, x: -220, y: 300 }, { t: 2.2, x: 1820, y: 300 }] } }),
  'blend-modes': (n) => text({ mixBlend: n }),
  'filter-presets': (n) => j({ type: 'image', src: 'assets/shot.png', x: 160, y: 140, w: 1600, filter: n }),
  easings: (n) => j({ motion: [{ t: 0, x: 160 }, { t: 1.2, x: 460, ease: n }] }),
  // A remap is one word on the layer whose clock it warps, and the motion track is there to say what
  // the clock is FOR: the same three keys read as a whip, a hold, a freeze or a rewind depending on
  // this one field, which is the whole argument for it being a clock and not a fourth easing.
  'time-remaps-the-layer-s-own-clock': (n) => j({ timeRemap: n, motion: [{ t: 0, x: -420 }, { t: 4, x: 420, ease: 'linear' }] }),
  // One slot each, and which slot depends on which registry the word came from.
  'plain-words-feel-duration-camera': (n) => (n in FEEL ? j({ ease: n })
    : n in DURATION ? j({ enterDur: n })
    : j({ cameraMove: { move: n } })),
  // THE SHAPE THIS PRINTED WAS NOT A SHAPE THE ENGINE ACCEPTS. It emitted
  // `captions: { style, cues: [...] }`, and the schema has `captionStyle` as a TOP-LEVEL string and
  // `captions` as an ARRAY of {t0,t1,text}. So every one of these rows handed the author JSON that
  // would fail `make validate` on the first line. Nothing checked it, because nothing renders a
  // USAGE snippet; it is prose about code, and prose about code goes stale silently.
  'caption-styles': (n) => j({
    captionStyle: n,
    captions: [{ t0: 0.3, t1: 4.6, text: 'Ship the payoff last', pin: 'center', size: 96 }],
  }),
  'drawn-icons': (n) => `svgIcon(${JSON.stringify(n)})`,
  'ransom-faces': (n) => text({ split: 'char', ransom: { faces: [n] } }),
  'output-targets': (n) => (n in ASPECTS ? j({ aspect: n }) : j({ destination: n })),
  'generators-the-playground': (n) => `// turn the dials at /playground?gen=${n}, then paste the markup:\n${j({ bg: [{ html: '…', from: 0, to: 6 }] })}`,
  'lightfield-dials': (n) => `// a lightfield option value, turned at /playground:\n${j({ pattern: n })}`,
};

// ── the scene a previewable effect plays ────────────────────────────────────────────────────────
// A preview is the REAL engine rendering a real scene, the same way /blocks plays a block. So a
// family is previewable when one small scene can honestly demonstrate it with nothing but the name
// substituted. Where that is not true the family says so on the page instead of faking it.
const base = (o) => ({ module: 'scene', aspect: '16:9', theme: 'vawe', duration: 6, audio: { silent: true }, bg: [{ preset: 'plain', from: 0, to: 6 }], ...o });
const HERO = { type: 'text', text: 'Deterministic', x: 160, y: 430, w: 1600, size: 150, weight: 800, align: 'center', start: 0.3, duration: 5.4 };
const TWO = (t) => [
  { ...HERO, text: 'Before the cut', start: 0, duration: 2.4, anim: 'rise', out: 'fade' },
  { ...HERO, text: 'After the cut', start: t, duration: 6 - t, anim: 'rise', color: '#ffd23d' },
];
const OVER = { ...HERO, text: '', size: 96, y: 860, start: 0.4, duration: 5.2, anim: 'fade' };

const PREVIEW = {
  // A glow is light, so it needs something to light and a ground dark enough to read against. The
  // headline sits UNDER the glow in the layer order, which is what makes the preset visible as an
  // effect on a subject rather than as a coloured rectangle on its own.
  'glow-presets': (n) => base({ bg: [{ preset: 'ink', from: 0, to: 6 }],
    layers: [{ ...HERO, y: 470 }, { type: 'glow', preset: n, x: 360, y: 240, w: 1200, h: 620, intensity: 0.45, start: 0, duration: 6 }] }),
  'kinetic-text-presets': (n) => base({ layers: [{ ...HERO, split: 'word', preset: n, each: 0.6, stagger: 0.06 }] }),
  'stagger-order-from': (n) => base({ layers: [{ ...HERO, split: 'char', preset: 'up', each: 0.5, stagger: { amount: 0.9, from: n } }] }),
  'scramble-charsets-chars': (n) => base({ layers: [{ ...HERO, split: 'word', preset: 'decode', each: 1.2, stagger: 0.12, presetOpts: { chars: n, revealDelay: 0.25 } }] }),
  'enter-exit-anims': (n) => base({ layers: [{ ...HERO, anim: n, enterDur: 0.8, out: n, exitDur: 0.8, start: 0.4, duration: 5 }] }),
  'idles-ambient-hold-motion': (n) => base({ layers: [{ ...HERO, idle: n }] }),
  'gsap-named-effects': (n) => base({ layers: [{ ...HERO, anim: 'none', fx: n }] }),
  'gsap-exits': (n) => base({ layers: [{ ...HERO, anim: 'rise', fxOut: n, exitDur: 1, start: 0.4, duration: 4.2 }] }),
  'scene-cuts': (n) => base({ layers: TWO(2.4), cuts: [{ t: 2.4, style: n }] }),
  'shader-stings': (n) => base({ layers: TWO(2.4), stings: [{ t: 2.4, fx: n }] }),
  'seams-2-scene-blends': (n) => base({ layers: TWO(2.6), seams: [{ t: 2.2, fx: n, dur: 0.8 }] }),
  backgrounds: (n) => base({ bg: [{ preset: n, from: 0, to: 6 }], layers: [{ ...HERO, text: n, size: 110 }] }),
  'generative-paint-fx-per-frame': (n) => base({ layers: [{ type: 'paint', paint: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  'ambient-shader-fields': (n) => base({ layers: [{ type: 'shader', shader: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  'raymarched-surfaces': (n) => base({ layers: [{ type: 'raymarch', raymarch: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  'three-js-scenes-real-geometry': (n) => base({ layers: [{ type: 'three', three: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  // CAPTIONS PLAY HERE, and the reason they did not is a claim the engine contradicts. This family
  // carried "captions need a voice track and cues, which the index does not carry", so eleven styles
  // sat on the page as names with no picture. core/captions.js opens by saying the opposite, in as
  // many words: a line with NO `words` array gets deterministic per-word windows distributed by word
  // length, "so every style still reads as intentional karaoke". Degradation is built in. The scene
  // below carries no audio at all and every one of the eleven animates.
  // It also places the caption at the CENTRE rather than in the bottom band, which is the only
  // honest way to make a caption the subject of a 640x360 swatch, and is itself a demonstration of
  // the placement grammar a caption gained in docs/MISTAKES.md #422.
  'caption-styles': (n) => base({
    captionStyle: n,
    captions: [{ t0: 0.3, t1: 5.4, text: 'Ship the payoff last', pin: 'center', size: 96 }],
    layers: [{ ...OVER, text: n, size: 44, y: 940, start: 0, duration: 6 }],
  }),
  // The subject travels the frame at an even rate under a `linear` track, so everything the eye reads
  // as speed here comes from the remap alone: `whip` crawls then bolts, `hold` sits in the middle,
  // `freeze` stops dead, `rewind` comes back. The counter rides along to show the clock reaching a
  // primitive, which is the part an easing on the motion track could never do.
  'time-remaps-the-layer-s-own-clock': (n) => base({ layers: [
    { ...HERO, text: n, y: 380, timeRemap: n, motion: [{ t: 0, x: -520 }, { t: 5.4, x: 520, ease: 'linear' }] },
    { type: 'count', to: 100, x: 160, y: 640, w: 1600, align: 'center', size: 200, weight: 800,
      start: 0.3, duration: 5.4, timeRemap: n },
  ] }),
  'per-frame-accent-layers': (n) => base({ layers: [
    { type: 'text', text: 'border-beam', x: 460, y: 480, w: 1000, align: 'center', size: 72, weight: 700, font: 'mono', bg: 'rgba(255,255,255,0.04)', pad: '44px', radius: 22, start: 0.3, duration: 5.4 },
    { type: 'beam', mode: n.includes('shine') ? 'shine' : 'border', x: 460, y: 470, w: 1000, h: 170, radius: 22, thickness: 3, tail: 90, speed: 0.5, glow: 0.6, start: 0.5, duration: 5.2 },
  ] }),
};

// Two effects are registered, are listed, and do not boot. Neither is a mistake in this file, and
// neither is hidden: the page names the effect and the reason. Both were found by booting all 229
// preview scenes in a real browser (the sweep is the check, and it is the only thing that can be:
// nothing in node can start the engine). Re-run it after adding a preview family.
//   `shapes` is exported by BG_NAMES and rejected by formats/scene/schema.json, so docs/EFFECTS.md
//   lists a background a scene may not use. That drift is a real bug, reported upstream, not ours.
//   `extrudeText` needs a 3D typeface baked by `make glyphs`, and the site ships no 3D fonts.
const UNPLAYABLE = {
  'backgrounds--shapes': 'the engine rejects it: `shapes` is a registered background name that the scene schema does not accept. The name is real, the preset is not reachable from JSON.',
  'three-js-scenes-real-geometry--extrudetext': 'it needs a 3D typeface baked by `make glyphs`, and the site ships no 3D fonts.',
};

// Why a family cannot be played here. Stated on the page, per family, in the author's own terms.
const NO_PREVIEW = {
  'per-layer-modifiers': 'each modifier is a treatment ON another layer, so it has no subject of its own to preview; the arsenal shows them through the scenes that use them.',
  // A SOUND has no still and no moving preview. The site could play it, but the arsenal's preview slot
  // renders a scene to frames, and frames cannot show a thud. Listed with its reason rather than left
  // as a gap, which is what this table is for.
  'motion-voices-tactile-sound': 'a sound has no visual preview: these are heard, not seen. `make audio` bakes them to assets/sfx and any film with `audio:{tactile:true}` plays them.',
  'spectacle-devices': 'a spectacle is a whole film turning its other dials down. One clip cannot show the restraint that makes it work.',
  'composite-looks-static': 'a grade needs a photographic source, and the index ships no photographs. See it on the looks clip on /showcase.',
  'canvas-image-passes-baked': 'a baked image pass needs a photographic source, and the index ships no photographs.',
  'layer-as-texture-resample': 'resampling reads the pixels of a layer that is already a raster, so it needs a real image to sample.',
  // MOSTLY TRUE AND NOT ENTIRELY, which is worth saying rather than leaving the blanket claim: most of
  // this family regrades a picture, but `thermalBlur` is built for TYPE and needs no photograph at all.
  // Its card is in the playground (`core/generators.js`), where its radius dial is on screen.
  'filter-presets': 'most of these regrade a photographic source, and the index ships no photographs. The exception is `thermalBlur`, which is a type effect: its live card with a radius dial is in the playground.',
  'interpolation-modes-not-easings': 'a mode is the SHAPE of the segment between two keys. A still frame is a point on that curve and shows nothing about it; it is only itself in motion.',
  'keyframe-handles-the-graph-editor': 'a handle is half the shape of a segment, so it has the same problem a mode has: a still frame is one point on the curve and says nothing about the curve. The playground card draws the curve itself with both handles on dials.',
  'depths-parallax-planes': 'a plane only reads when the camera moves past it. One frame of a parallax is a frame with nothing parallaxing in it.',
  'adjustment-layers-grade-what-is-beneath': 'a grade has no subject of its own: it is whatever is already under it. The arsenal shows them through the scenes that use them.',
  'vector-layer-logos-icons': 'a draw-on or a morph is only itself with real path data. Yours, not a placeholder triangle.',
  'beat-blueprints': 'a beat writes a whole cast of layers from content you supply. Run `make expand` to see what it writes.',
  'camera-dials': 'a shutter is only visible on a frame that is already moving fast, and the whole point is that it is invisible on a still. Its A/B is formats/scene/_camera-blur-probe.json, which renders the same whip pan with the dial up and down.',
  'camera-moves': 'a camera move is only legible against a scene laid out for it, which is the film, not a swatch.',
  'compositions-bespoke-per-beat-timeline': 'a composition is a hand-authored timeline over data you pass. There is no neutral data for it.',
  'layer-types': 'a layer type is the noun, not the effect. Every preview on this page is already one of them.',
  'per-layer-fx': 'a modifier acts on whatever layer is already there, so it has nothing to show on its own.',
  'part-entrances': "a part entrance staggers across a figure's own children, so it needs your figure.",
  'effector-falloffs': "a falloff is the SHAPE of one point's reach, and it is invisible without the clones it acts on. Turn it on the playground's `effector` card, where the same grid is redrawn as you change it.",
  'effector-drives': "a drive is what the influence is spent on, so it shows nothing without a falloff and a field of clones. The playground's `effector` card carries all six on one grid.",
  'blend-modes': 'a blend mode is a relationship with what is underneath, and the index has no underneath.',
  easings: 'a curve is a feeling over time. Read the table in docs/MOTION-CRAFT.md, then feel it in the editor.',
  'plain-words-feel-duration-camera': 'each word is an alias onto a value listed elsewhere on this page. Preview the thing it resolves to.',
  'drawn-icons': 'the name is the drawing. Every one of them is on the page already, at /blocks.',
  'ransom-faces': 'a typeface is judged by looking. The ransom clip on /showcase sets all eight.',
  'output-targets': 'an aspect or a platform safe area is a property of the canvas, not something that animates.',
  'generators-the-playground': 'generators have their own surface with every dial attached: /playground.',
  'lightfield-dials': 'a dial is a value, not an effect. Turn them together at /playground.',
};

// ── build ───────────────────────────────────────────────────────────────────────────────────────
const gaps = [];
const families = sections.map(([title, intro, list, tag, meta]) => {
  const id = slug(title);
  if (!USAGE[id]) gaps.push(`${title} (id ${id}): no USAGE form`);
  if (!PREVIEW[id] && !NO_PREVIEW[id]) gaps.push(`${title} (id ${id}): neither a PREVIEW scene nor a reason it has none`);
  const usage = USAGE[id] || (() => '');
  const preview = PREVIEW[id] || null;
  return {
    id,
    title,
    tag,
    intro: prose(intro),
    // `meta.skip` is the catalog's own decision that a family is self-describing (an easing named by
    // its curve, a blend mode defined by the CSS spec). Those are the families the reference system
    // collapses: one paragraph and one line of names, not 41 rows of near-identical description.
    // So the collapse is READ OFF the data rather than being a second judgement kept by hand.
    mode: meta && meta.skip ? 'chips' : 'table',
    note: (meta && meta.skip) ? prose(meta.skip) : null,
    noPreview: preview ? null : NO_PREVIEW[id],
    count: list.length,
    undescribed: list.filter((n) => d(n, meta) === '\u2014').length,
    entries: list.map((name) => ({
      name,
      // The canonical id for this effect's own page (site/app/showcase/effects/[stem]/page.tsx) and
      // its preview scene. Generated once here rather than re-slugged in three places (the index
      // page, the effect page, generateStaticParams): one wrong re-implementation of `slug()` and a
      // page 404s on a name with a character the copy missed.
      stem: `${id}--${slug(name)}`,
      // `d()` returns an em-dash when a family keeps no blurb for a name. That is a GAP, not a
      // description, so it becomes empty here and the family counts it out loud below.
      desc: d(name, meta) === '\u2014' ? '' : prose(d(name, meta)),
      scene: preview && !UNPLAYABLE[`${id}--${slug(name)}`] ? `/assets/effects/${id}--${slug(name)}.json` : null,
      // A family reason, unless this one name has its own.
      noPreview: UNPLAYABLE[`${id}--${slug(name)}`] || null,
    })),
  };
});

if (gaps.length) {
  console.error('✗ effects-json: a family is not described:');
  for (const g of gaps) console.error(`    ${g}`);
  console.error('  Add its authoring form to USAGE, and either a PREVIEW scene or a NO_PREVIEW reason.');
  process.exit(1);
}

// `--check`: the gap check above and nothing else, so a GATE can run it without regenerating 255
// preview scenes. It exists because this file failed correctly and far too late. Three families were
// added with no rows and the fault sat there until somebody happened to type `make effects`, which
// nothing in the ladder does, so the whole catalogue could not rebuild and no run said so. A check
// that only fires when a human invokes the build is not fail-early, it is fail-eventually.
// lib-test spawns this, so the run that ADDS a vocabulary is the run that goes red.
if (process.argv.includes('--check')) {
  console.log(`✓ effects-json: ${families.length} families, every one has a usage form and a preview or a reason`);
  process.exit(0);
}

const tags = [...families.reduce((m, f) => m.set(f.tag, (m.get(f.tag) ?? 0) + f.count), new Map())]
  .sort((a, z) => a[0].localeCompare(z[0]));
const total = families.reduce((n, f) => n + f.count, 0);
// Counted from the ENTRIES, not the families: two effects in previewable families do not boot.
const previewed = families.reduce((n, f) => n + f.entries.filter((e) => e.scene).length, 0);
const index = { total, previewed, families: families.length, tags, list: families };
// The three numbers on their own. /showcase quotes them in one link and must not import 189KB of
// index to do it: a JSON module bundles whole, and a marketing page paying for the whole arsenal is
// how a page gets slow for a reason nobody can see in the source.
const counts = { total, previewed, families: families.length };
const COUNTS = path.join(root, 'site/lib/effects-counts.json');

// The authoring snippet, keyed by `stem`, for EVERY effect (not just the 227 previewable ones, a
// family with no live preview still gets a page that shows the JSON that uses it). This is what used
// to be the `json` field on each index entry: 59KB of the 166KB the index shipped in the first byte,
// for text that /showcase/effects (the list) never renders. It moves here because
// site/app/showcase/effects/[stem]/page.tsx is a SERVER component, reading it there puts the text
// straight into that one effect's static HTML and never into the client bundle the list page ships.
const BODY = path.join(root, 'site/lib/effects-body.json');
const bodies = Object.fromEntries(
  sections.flatMap(([title, , list]) => {
    const id = slug(title);
    const usage = USAGE[id] || (() => '');
    return list.map((name) => [`${id}--${slug(name)}`, usage(name)]);
  }),
);

// The scenes. Written on change only: they are committed, so an unchanged effect must not churn git.
const want = new Map();
for (const [title, , list, , ] of sections) {
  const id = slug(title);
  if (!PREVIEW[id]) continue;
  for (const name of list) {
    if (UNPLAYABLE[`${id}--${slug(name)}`]) continue;
    want.set(`${id}--${slug(name)}.json`, j(PREVIEW[id](name)) + '\n');
  }
}

if (CHECK) {
  const cur = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  const curCounts = fs.existsSync(COUNTS) ? fs.readFileSync(COUNTS, 'utf8') : '';
  const curBody = fs.existsSync(BODY) ? fs.readFileSync(BODY, 'utf8') : '';
  const stale = cur.trim() !== (j(index) + '\n').trim()
    || curCounts.trim() !== (j(counts) + '\n').trim()
    || curBody.trim() !== (j(bodies) + '\n').trim()
    || [...want].some(([f, body]) => !fs.existsSync(path.join(SCENES, f)) || fs.readFileSync(path.join(SCENES, f), 'utf8') !== body);
  if (stale) { console.error('✗ site/lib/effects.json is stale, run `make effects-json`.'); process.exit(1); }
  console.log(`✓ effects index in sync: ${total} effects, ${previewed} previewable`);
  process.exit(0);
}

fs.mkdirSync(SCENES, { recursive: true });
let wrote = 0;
for (const [file, body] of want) {
  const p = path.join(SCENES, file);
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body) { fs.writeFileSync(p, body); wrote++; }
}
// A scene left behind by a renamed or deleted effect would keep serving a name the registry dropped.
let gone = 0;
for (const f of fs.existsSync(SCENES) ? fs.readdirSync(SCENES) : []) {
  if (f.endsWith('.json') && !want.has(f)) { fs.unlinkSync(path.join(SCENES, f)); gone++; }
}
fs.writeFileSync(INDEX, j(index) + '\n');
fs.writeFileSync(COUNTS, j(counts) + '\n');
fs.writeFileSync(BODY, j(bodies) + '\n');
console.log(`✓ site/lib/effects.json: ${total} effects across ${families.length} families, ${previewed} previewable`
  + `\n✓ site/lib/effects-body.json: ${Object.keys(bodies).length} authoring snippets, read only by the per-effect pages`
  + `\n✓ site/public/assets/effects: ${want.size} scenes (${wrote} written, ${gone} removed)`);
