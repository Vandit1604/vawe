// core/layers/glow.js, soft light: radial centre-glow, a directional beam, or a named light
// PHENOMENON via `preset`. Pure gradient div(s), no WebGL.
//
// Why these five presets: they are the light jobs a motion-graphics scene actually needs, and each
// reads as a distinct phenomenon rather than "another blob":
//   bloom: light overflowing a bright source; puts energy AT a point (behind a logo, a number).
//   halation: film-style warm ring + tight core; nostalgia/glamour on a highlight, quiet by default.
//   diffusion: a broad veil that lifts blacks over an area (screen blend); softens a busy region.
//   rimLight: an off-centre crescent; edge-lights a subject placed beside it, gives it dimension.
//   spotlight: a directional soft-edged cone (angle in degrees); stages a reveal, directs the eye.
// Colours come from color-mix over var(--accent) / white so every theme reskins them, never a
// hardcoded brand colour. All geometry/colour maths lives in exported PURE string builders
// (smoke-testable with plain node, no DOM).
//
// Pulse purity: L.pulse breathes opacity sinusoidally from LOCAL t inside frame(kit,el,L,t), a pure
// function of t (no wall clock, no state), so renderFrame(n) stays deterministic and seek-safe.
// Amplitude is capped at 0.15 (a breath, not a strobe). The pulse writes to an INNER node, because
// scene.html's driveClips owns el.style.opacity for enter/exit fades. As in shader.js, frame() stamps
// el.dataset so a pulse-only frame always changes the DOM signature, otherwise the render's
// static-frame dedup could wrongly reuse a frame.
//
// Back-compat: a glow with NO preset takes the exact original code path (same node, same background
// string), existing scenes render byte-identical; the snap gate would catch any drift.
import { mergeProps, propsOf } from '../registry/props.js';
import { defineRegistry } from '../registry/registry.js';

// ---- pure helpers (exported for lib tests) -------------------------------------------------------

// translucent version of any CSS colour (works on var()/color-mix, unlike rgba(hex))
export const alphaMix = (c, a) => `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
// whiten a colour toward light: liftWhite(c, 70) = 30% colour + 70% white (a hot core)
export const liftWhite = (c, w) => `color-mix(in srgb, ${c} ${100 - w}%, white)`;

// The seven named looks. A REGISTRY, not an if-chain returning null: `presetSpec` used to answer an
// unknown name with null and the builder read that as "no preset", so `preset: "blom"` painted the
// plain gradient and said nothing. That is the one outcome indistinguishable from "I meant the plain
// gradient", and core/registry.js exists to make it inexpressible: pick() takes no fallback and its
// miss names every other registry that DOES know the word.
const GLOW_PRESETS = {
  bloom: (o, { c, at }) => {
      // hot near-white core → accent falloff: light overflowing a bright source
      const i = o.i ?? 0.4;
      return { background:
        `radial-gradient(50% 50% ${at}, ${alphaMix(liftWhite(c, 70), Math.min(1, i * 1.1))} 0%, ` +
        `${alphaMix(c, i * 0.55)} 28%, ${alphaMix(c, i * 0.18)} 52%, transparent 74%)` };
  },
  halation: (o, { c, at }) => {
      // tight warm core + a wide faint ring (film halation); intensity default is LOW on purpose
      const i = o.i ?? 0.3;
      const warm = `color-mix(in srgb, ${c} 55%, #ffe9c9)`;
      return { background:
        `radial-gradient(26% 26% ${at}, ${alphaMix(liftWhite(warm, 40), i * 0.8)} 0%, transparent 62%), ` +
        `radial-gradient(50% 50% ${at}, transparent 50%, ${alphaMix(warm, i * 0.28)} 66%, transparent 84%)` };
  },
  diffusion: (o, { at }) => {
      // broad low-alpha white veil, screen-blended: lifts blacks without recolouring content below
      const i = o.i ?? 0.4;
      return { blend: 'screen', background:
        `radial-gradient(75% 75% ${at}, ${alphaMix('white', i * 0.4)} 0%, ` +
        `${alphaMix('white', i * 0.16)} 55%, transparent 100%)` };
  },
  rimLight: (o, { c, at }) => {
      // bright radial with an offset circle masked OUT of it → an off-centre crescent. The mask circle
      // sits down-left of the centre, so the lit edge faces up-right: place the subject there.
      const i = o.i ?? 0.4;
      const mx = (Math.max(0, (o.cx ?? 0.5) - 0.14) * 100).toFixed(1);
      const my = (Math.min(1, (o.cy ?? 0.5) + 0.07) * 100).toFixed(1);
      return {
        background:
          `radial-gradient(50% 50% ${at}, ${alphaMix(liftWhite(c, 55), i * 0.9)} 0%, ` +
          `${alphaMix(c, i * 0.35)} 40%, transparent 68%)`,
        mask: `radial-gradient(55% 55% at ${mx}% ${my}%, transparent 58%, #000 74%)`,
      };
  },
  spotlight: (o, { c }) => {
      // soft-edged cone from an apex (default above-left), aimed by `angle` (CSS deg: 0 = up, cw);
      // a radial mask from the apex fades the beam with distance so it never hard-clips the box edge.
      const i = o.i ?? 0.4;
      const ax = ((o.cx ?? 0.12) * 100).toFixed(1), ay = ((o.cy ?? 0) * 100).toFixed(1);
      const ang = o.angle ?? 150, lc = liftWhite(c, 60);
      return {
        background:
          `conic-gradient(from ${ang - 28}deg at ${ax}% ${ay}%, transparent 0deg, ` +
          `${alphaMix(lc, i * 0.28)} 12deg, ${alphaMix(lc, i * 0.55)} 28deg, ` +
          `${alphaMix(lc, i * 0.28)} 44deg, transparent 56deg)`,
        mask: `radial-gradient(120% 120% at ${ax}% ${ay}%, #000 30%, transparent 88%)`,
      };
  },
  chromatic: (o, { px, py }) => {
      // RGB-split halo: red/green/blue radial copies offset left/centre/right, screen-blended so they
      // add to white in the core and fringe to colour at the edges. Chromatic is a SPECTRUM by
      // definition, so the channel hues are intentionally hard RGB, not theme tokens (the halo tints as
      // a whole via hue-rotate on chromaCycle, or leave it as the classic aberration).
      const i = o.i ?? 0.4;
      const gg = (col, ox) => `radial-gradient(46% 46% at ${(+px + ox).toFixed(1)}% ${py}%, ${alphaMix(col, i * 0.7)} 0%, transparent 66%)`;
      return { blend: 'screen', background: `${gg('#ff0033', -4.5)}, ${gg('#00ff5a', 0)}, ${gg('#0066ff', 4.5)}` };
  },
  chromaCycle: (o, { at }) => {
      // a saturated neon bloom whose HUE sweeps the spectrum over time (driven in frame()); the static
      // spec is the magenta starting state, screen-blended so it reads as emitted light.
      const i = o.i ?? 0.45;
      return { blend: 'screen', background:
        `radial-gradient(50% 50% ${at}, ${alphaMix(liftWhite('#ff2fd0', 30), i)} 0%, ` +
        `${alphaMix('#ff2fd0', i * 0.5)} 34%, transparent 72%)` };
  },
};

export const GLOW_BLURBS = {
  bloom: 'a hot near-white core falling off to the accent: light overflowing a bright source',
  halation: 'a tight warm core plus a wide faint ring, the film halation. Low intensity on purpose',
  diffusion: 'a broad low-alpha white veil, screen-blended: lifts blacks without recolouring below',
  rimLight: 'an off-centre crescent, lit edge up-right. Place the subject there',
  spotlight: 'a soft-edged cone from an apex, aimed by `angle`, faded with distance so it never clips',
  chromatic: 'an RGB-split halo: three channel copies offset and screen-blended, white core, colour fringe',
  chromaCycle: 'a saturated neon bloom whose hue sweeps the spectrum over `cycle` seconds',
};

const GLOW_AKA = {
  bloom: ['light source glow', 'overexposed light', 'bright point glow'],
  halation: ['film halo', 'warm highlight ring', 'nostalgic glow'],
  diffusion: ['soft veil', 'lifted blacks', 'screen wash light'],
  rimLight: ['edge light', 'crescent light', 'off-centre glow'],
  spotlight: ['light cone', 'directional beam', 'stage light'],
  chromatic: ['rgb split glow', 'colour fringe halo', 'rainbow edge glow'],
  chromaCycle: ['color cycling glow', 'hue shifting light', 'rainbow pulse glow'],
};

export const GLOW_REGISTRY = defineRegistry('glow preset', GLOW_PRESETS, { slot: 'preset', blurbs: GLOW_BLURBS, aka: GLOW_AKA,
  catalog: {
    title: 'Glow presets',
    tag: 'glow layer',
    intro: '`preset` on a `glow` layer, the same slot the kinetic presets use on a text layer and a different vocabulary, because a glow carries no split text. Each one is a named lighting behaviour rather than a gradient you tune by hand: `{ "type":"glow", "preset":"halation", "intensity":0.3 }`. `cx`/`cy` move the light centre, `angle` aims the spotlight cone, and `cycle` times the one preset that moves on its own. An unknown name THROWS and suggests the near word; it used to return null and paint the plain gradient in silence.',
    // PRE-EXISTING GAP, closed while adding the family above: `make regen` was already red on this
    // one, so the catalogue could not regenerate at all. A modifier is an array entry on a layer.
    // A glow preset is a whole LAYER, not a prop on somebody else's, so its usage shows the layer.
    usage: (n, { j }) => j({ type: 'glow', preset: n, x: 460, y: 240, w: 1000, h: 600, intensity: 0.4,
        start: 0, duration: 6 }),
    // A glow is light, so it needs something to light and a ground dark enough to read against. The
    // headline sits UNDER the glow in the layer order, which is what makes the preset visible as an
    // effect on a subject rather than as a coloured rectangle on its own.
    preview: (n, { base, HERO }) => base({ bg: [{ preset: 'ink', from: 0, to: 6 }],
        layers: [{ ...HERO, y: 470 }, { type: 'glow', preset: n, x: 360, y: 240, w: 1200, h: 620, intensity: 0.45, start: 0, duration: 6 }] }),
  },
});

// presetSpec(name, o) → { background, blend?, mask? }. THROWS on a name this vocabulary does not know.
// o: { i intensity 0..1, cx/cy centre 0..1 within the layer box, angle deg (spotlight), color }
export function presetSpec(name, o = {}) {
  const c = o.color || 'var(--accent)';
  const px = ((o.cx ?? 0.5) * 100).toFixed(1), py = ((o.cy ?? 0.5) * 100).toFixed(1);
  return GLOW_REGISTRY.pick(name)(o, { c, px, py, at: `at ${px}% ${py}%` });
}

// pure hue at local time lt: full 0..360 sweep every `cycle` seconds (default 6s). Pure in lt.
export function cycleHue(lt, cycle = 6) {
  return (((lt / Math.max(0.1, cycle)) % 1) * 360);
}

// pure pulse maths: opacity multiplier at local time lt, period p seconds, amplitude clamped ≤ 0.15
export function pulseOpacity(lt, p, amp = 0.12) {
  const a = Math.min(0.15, Math.max(0, amp));
  return 1 - a + a * Math.sin((2 * Math.PI * lt) / Math.max(0.1, p));
}

// pure FLASH envelope: a finite attack→decay bloom (a light SWELLING once, then settling), unlike the
// continuous breathe of pulseOpacity. Rises 0→peak over `attack`s, decays peak→0 over `decay`s, then
// holds 0. Peak capped ≤0.45 (HF doctrine: a swell, not a strobe). Absolute opacity, not a multiplier.
// The caller adds it to a base. Pure in lt → seek-safe.
export function flashEnvelope(lt, { attack = 0.35, decay = 0.9, peak = 0.4 } = {}) {
  const pk = Math.min(0.45, Math.max(0, peak));
  if (lt < 0) return 0;
  if (lt < attack) { const u = lt / Math.max(0.01, attack); return pk * (1 - (1 - u) * (1 - u)); }
  const u = (lt - attack) / Math.max(0.01, decay);
  return u >= 1 ? 0 : pk * (1 - u) * (1 - u);
}

// ---- layer builder -------------------------------------------------------------------------------

// Three shapes of glow in one file, and the guards say which prop belongs to which: the geometry knobs
// only reach a named PRESET, `pulseAmp` only scales a `pulse`, `cycle` only times the chromaCycle preset.
// A guard has no spelling in a signature, so these stay hand-written and union with the auto-derived
// set below. `color2` stays hand-written too: it is read only inside the liveColor() helper, taking
// `L` wholesale, never destructured directly in build() or frame().
const GUARDED = {
  cx: { when: 'preset' }, cy: { when: 'preset' }, angle: { when: 'preset' }, cycle: { when: 'preset' },
  pulseAmp: { when: 'pulse' },
};

// A GLOW THAT CANNOT CHANGE IS HALF A GLOW, and it took a recreation to make that concrete. The
// intensity was baked into the gradient string here at BUILD, so it was a constant for the layer's
// life: `pin-72761350251141725` contracts a halo toward a word across a whole shot and we could only
// fake it by scaling the box, which resizes the falloff instead of tightening it. Measured on
// `pin-583145851797705243`, the light is not a detail at all: its mean luma down the frame runs
// 60·64·69·46·55·86·84 while the subject arrives and collapses to 7·8·7·17·40·29·77 once it settles.
// The glow swelling and contracting IS the picture, and we had no way to author it.
//
// TWO CUSTOM PROPERTIES, BOTH DEFAULTING TO 1, so every existing film renders exactly as before and
// the `vars` track (core/tracks/vars.js) can drive either:
//
//   --glow-i   multiplies the ALPHA.  0 is out, 1 is as authored, above 1 is brighter
//   --glow-r   multiplies the RADIUS. The falloff tightens or spreads without the box changing size
//
//   { "type":"glow", "intensity":0.5, "vars":{ "--glow-i":[0,1], "--glow-r":[1.6,0.7] }, "varsDur":0.8 }
//
// Written as `rgb(r g b / calc(...))` rather than `rgba(...)`, because an alpha has to be a calc for a
// variable to reach it and the legacy comma form does not take one. `hexA` keeps its own shape: it has
// other callers and this is the only one that needs a live alpha.
// --glow-c JOINED THEM, and it is the third question a light can be asked. Intensity says how much
// light; radius says how far it reaches; colour says WHAT KIND of light, and it was the one still
// resolved at build. The reference technique that wanted it animates a ray from cold to hot ACROSS a
// beat, so the light does not merely appear, it changes character while the eye is on it.
//
//   --glow-c   crossfades from `color` toward `color2`. 0 is the authored colour, 1 is the second one.
//
//   { "type":"glow", "color":"#2b4cff", "color2":"#ff6a00",
//     "vars":{ "--glow-c":[0,1] }, "varsDur":1.2 }
//
// `color2` is REQUIRED when this var is keyed, and the absence throws by name. A crossfade with
// nothing to cross to is a var that drives a value nobody supplied: it would resolve to the authored
// colour on every frame and read as a light that simply refuses to change, which is the silent
// substitution this repo logs more than any other class of defect.
const GLOW_VARS = { i: '--glow-i', r: '--glow-r', c: '--glow-c' };

// ONLY EMITTED WHERE IT CAN BE DRIVEN, which is the difference between a safe change and a diff across
// the library. A `calc(72%)` computes to exactly `72%`, so the pixels never moved, but the SERIALISED
// string differs and eight shipped scenes reported a change in their snapshot for a rendering that was
// byte-identical. A baseline that moves for a cosmetic reason is a baseline nobody reads next time.
//
// The `vars` track is per-layer, so a layer that does not declare the property cannot have it driven,
// and the plain form is emitted for it. Nothing existing changes at all.
const drives = (L, name) => !!(L.vars && Object.prototype.hasOwnProperty.call(L.vars, name));

/** One colour at this layer's alpha, live only when the layer keys --glow-i. */
function atAlpha(kit, L, color, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!m || !drives(L, GLOW_VARS.i)) return kit.hexA(color, a);
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / calc(var(${GLOW_VARS.i}, 1) * ${a}))`;
}

/** The layer's glow colour: a live alpha, and a live HUE when the layer keys one. */
function liveColor(kit, L) {
  if (L.color === true || L.color == null) return 'var(--accent-glow)';
  const a = L.intensity ?? 0.25;
  const base = atAlpha(kit, L, L.color, a);
  if (!drives(L, GLOW_VARS.c)) return base;
  if (L.color2 == null)
    throw new Error(`glow "${L.id || 'layer'}" keys \`${GLOW_VARS.c}\` but declares no \`color2\`. `
      + `That var crossfades \`color\` toward \`color2\`, so with only one colour it would resolve to `
      + `the authored one on every frame and render a light that never changes. Add \`color2\`, or drop `
      + `the var.`);
  // color-mix carries the alpha of both sides, so a keyed --glow-i still reaches the result.
  return `color-mix(in srgb, ${atAlpha(kit, L, L.color2, a)} calc(var(${GLOW_VARS.c}, 0) * 100%), ${base})`;
}

/** The radial stop, scaled by --glow-r only when this layer keys one. */
const liveStop = (L, pct) => (drives(L, GLOW_VARS.r) ? `calc(var(${GLOW_VARS.r}, 1) * ${pct}%)` : `${pct}%`);

// classicBackground: the pre-preset gradient string, used both when the layer stays on the original
// no-inner-node path and when a preset-less glow still needs pulse/flash on an inner node.
function classicBackground(kit, L, beam) {
  const c = liveColor(kit, L);
  const ang = { right: '90deg', left: '270deg', up: '0deg', down: '180deg' }[beam];
  return ang ? `linear-gradient(${ang}, transparent, ${c})`
             : `radial-gradient(50% 50% at 50% 50%, ${c}, transparent ${liveStop(L, 72)})`;
}

// The props are read off this signature (propsOf, core/props.js), for what build() reads DIRECTLY.
// `cx`/`cy`/`angle` stay off it (guarded, see GUARDED above); `color2` stays hand-written (read only
// inside the liveColor() helper).
export function build(kit, el, L, { h, preset, intensity, color, pulse, flash, beam } = L) {
  if (h != null) el.style.height = h + 'px';
  el.style.pointerEvents = 'none';

  const spec = preset ? presetSpec(preset, {
    i: intensity, cx: L.cx, cy: L.cy, angle: L.angle,
    color: color && color !== true ? color : undefined,
  }) : null;

  if (!spec && !pulse && !flash) {
    // ORIGINAL path, untouched: no preset, no pulse → identical output to the pre-preset builder
    el.style.background = classicBackground(kit, L, beam);
    return;
  }

  // preset and/or pulse → paint on an inner node, so pulse opacity never fights driveClips's
  // enter/exit fade (scene.html owns el.style.opacity on the clip element)
  const inner = document.createElement('div');
  inner.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  if (spec) {
    inner.style.background = spec.background;
    if (spec.blend) inner.style.mixBlendMode = spec.blend;
    if (spec.mask) { inner.style.maskImage = spec.mask; inner.style.webkitMaskImage = spec.mask; }
  } else {
    // pulse on a classic (preset-less) glow: same gradient as the original path, one node deeper
    inner.style.background = classicBackground(kit, L, beam);
  }
  // .hs-layer is already position:absolute (a containing block), never override it here
  el.appendChild(inner);
  el.__glowInner = inner;
}

// breathe from LOCAL t (pure in t → deterministic, seek-safe). Stamp el.dataset.gp so a pulse-only
// frame always changes the DOM signature, same rationale as shader.js: without it the render's
// static-frame dedup could wrongly reuse a frame.
//
// The pattern sits in the SIXTH slot: core/layers/index.js calls frame(kit, el, L, t, scene) with
// five arguments, so a pattern any earlier destructures `scene` and every prop reads undefined
// (lib-test asserts the arity). `scene` itself is unused here. `pulseAmp`/`cycle` stay off it
// (guarded, see GUARDED above); `start`/`duration` stay `L.x` (shared vocabulary).
export function frame(kit, el, L, t, scene, { preset, pulse, flash } = L) {
  const cycling = preset === 'chromaCycle';
  if ((!pulse && !cycling && !flash) || !el.__glowInner) return;
  // Set the inner DETERMINISTICALLY for EVERY t, never early-return and leave a STALE value. Outside the
  // layer's own window driveClips normally hides the layer, so a stale inner used to be invisible; but
  // sceneUnits can EXTEND the visible window past L.duration, and then the stale inner shows AND becomes
  // render-order-dependent (a latent purity break sceneUnits exposed, MISTAKES). So compute a resting
  // value outside the window instead of skipping.
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  const inWindow = t >= start && t < end;
  if (flash) {
    // a one-shot bloom that swells then settles (attack-decay); flash may be `true` or {attack,decay,peak}.
    // flashEnvelope is already 0 before/after the swell, so it rests at 0 outside the window too.
    const o = inWindow ? flashEnvelope(t - start, flash === true ? {} : flash) : 0;
    el.__glowInner.style.opacity = o.toFixed(3);
    el.dataset.gf = o.toFixed(3);
  } else if (pulse) {
    const o = inWindow ? pulseOpacity(t - start, +pulse, L.pulseAmp) : 1; // rest at full opacity outside
    el.__glowInner.style.opacity = o.toFixed(3);
    el.dataset.gp = o.toFixed(3);
  }
  if (cycling) {
    // hue sweeps the spectrum over time; pure in local t → deterministic, seek-safe. Stamp dataset so
    // a hue-only frame changes the DOM signature (same rationale as pulse / shader.js).
    const h = inWindow ? cycleHue(t - start, L.cycle != null ? +L.cycle : 6) : 0; // rest at 0deg outside
    el.__glowInner.style.filter = `hue-rotate(${h.toFixed(1)}deg)`;
    el.dataset.gh = h.toFixed(1);
  }
}

// Both signatures declare, because a prop read only on the frame path is just as real as one read at
// build time. `GUARDED` is unioned in alongside them: a guard has no spelling in a signature (mergeProps,
// core/props.js). `color2` unions in too: read only inside liveColor(), never destructured directly.
export const PROPS = mergeProps(propsOf(build), propsOf(frame), GUARDED, { color2: {} });

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make regen`). core/layers/index.js refuses one without it.
export const blurb = "soft light with no WebGL: a radial centre glow, a directional beam, or a named phenomenon (bloom · halation · diffusion · rimLight · spotlight)";
