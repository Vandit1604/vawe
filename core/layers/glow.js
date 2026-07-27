// core/layers/glow.js — soft light: radial centre-glow, a directional beam, or a named light
// PHENOMENON via `preset`. Pure gradient div(s), no WebGL.
//
// Why these five presets: they are the light jobs a motion-graphics scene actually needs, and each
// reads as a distinct phenomenon rather than "another blob":
//   bloom     — light overflowing a bright source; puts energy AT a point (behind a logo, a number).
//   halation  — film-style warm ring + tight core; nostalgia/glamour on a highlight, quiet by default.
//   diffusion — a broad veil that lifts blacks over an area (screen blend); softens a busy region.
//   rimLight  — an off-centre crescent; edge-lights a subject placed beside it, gives it dimension.
//   spotlight — a directional soft-edged cone (angle in degrees); stages a reveal, directs the eye.
// Colours come from color-mix over var(--accent) / white so every theme reskins them — never a
// hardcoded brand colour. All geometry/colour maths lives in exported PURE string builders
// (smoke-testable with plain node, no DOM).
//
// Pulse purity: L.pulse breathes opacity sinusoidally from LOCAL t inside frame(kit,el,L,t) — a pure
// function of t (no wall clock, no state), so renderFrame(n) stays deterministic and seek-safe.
// Amplitude is capped at 0.15 (a breath, not a strobe). The pulse writes to an INNER node, because
// scene.html's driveClips owns el.style.opacity for enter/exit fades. As in shader.js, frame() stamps
// el.dataset so a pulse-only frame always changes the DOM signature — otherwise the render's
// static-frame dedup could wrongly reuse a frame.
//
// Back-compat: a glow with NO preset takes the exact original code path (same node, same background
// string) — existing scenes render byte-identical; the snap gate would catch any drift.

// ---- pure helpers (exported for lib tests) -------------------------------------------------------

// translucent version of any CSS colour (works on var()/color-mix, unlike rgba(hex))
export const alphaMix = (c, a) => `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
// whiten a colour toward light: liftWhite(c, 70) = 30% colour + 70% white (a hot core)
export const liftWhite = (c, w) => `color-mix(in srgb, ${c} ${100 - w}%, white)`;

// presetSpec(name, o) → { background, blend?, mask? } or null for unknown names.
// o: { i intensity 0..1, cx/cy centre 0..1 within the layer box, angle deg (spotlight), color }
export function presetSpec(name, o = {}) {
  const c = o.color || 'var(--accent)';
  const px = ((o.cx ?? 0.5) * 100).toFixed(1), py = ((o.cy ?? 0.5) * 100).toFixed(1);
  const at = `at ${px}% ${py}%`;

  if (name === 'bloom') {
    // hot near-white core → accent falloff: light overflowing a bright source
    const i = o.i ?? 0.4;
    return { background:
      `radial-gradient(50% 50% ${at}, ${alphaMix(liftWhite(c, 70), Math.min(1, i * 1.1))} 0%, ` +
      `${alphaMix(c, i * 0.55)} 28%, ${alphaMix(c, i * 0.18)} 52%, transparent 74%)` };
  }

  if (name === 'halation') {
    // tight warm core + a wide faint ring (film halation); intensity default is LOW on purpose
    const i = o.i ?? 0.3;
    const warm = `color-mix(in srgb, ${c} 55%, #ffe9c9)`;
    return { background:
      `radial-gradient(26% 26% ${at}, ${alphaMix(liftWhite(warm, 40), i * 0.8)} 0%, transparent 62%), ` +
      `radial-gradient(50% 50% ${at}, transparent 50%, ${alphaMix(warm, i * 0.28)} 66%, transparent 84%)` };
  }

  if (name === 'diffusion') {
    // broad low-alpha white veil, screen-blended: lifts blacks without recolouring content below
    const i = o.i ?? 0.4;
    return { blend: 'screen', background:
      `radial-gradient(75% 75% ${at}, ${alphaMix('white', i * 0.4)} 0%, ` +
      `${alphaMix('white', i * 0.16)} 55%, transparent 100%)` };
  }

  if (name === 'rimLight') {
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
  }

  if (name === 'spotlight') {
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
  }

  if (name === 'chromatic') {
    // RGB-split halo: red/green/blue radial copies offset left/centre/right, screen-blended so they
    // add to white in the core and fringe to colour at the edges. Chromatic is a SPECTRUM by
    // definition, so the channel hues are intentionally hard RGB, not theme tokens (the halo tints as
    // a whole via hue-rotate on chromaCycle, or leave it as the classic aberration).
    const i = o.i ?? 0.4;
    const gg = (col, ox) => `radial-gradient(46% 46% at ${(+px + ox).toFixed(1)}% ${py}%, ${alphaMix(col, i * 0.7)} 0%, transparent 66%)`;
    return { blend: 'screen', background: `${gg('#ff0033', -4.5)}, ${gg('#00ff5a', 0)}, ${gg('#0066ff', 4.5)}` };
  }

  if (name === 'chromaCycle') {
    // a saturated neon bloom whose HUE sweeps the spectrum over time (driven in frame()); the static
    // spec is the magenta starting state, screen-blended so it reads as emitted light.
    const i = o.i ?? 0.45;
    return { blend: 'screen', background:
      `radial-gradient(50% 50% ${at}, ${alphaMix(liftWhite('#ff2fd0', 30), i)} 0%, ` +
      `${alphaMix('#ff2fd0', i * 0.5)} 34%, transparent 72%)` };
  }

  return null;
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
// holds 0. Peak capped ≤0.45 (HF doctrine: a swell, not a strobe). Absolute opacity, not a multiplier —
// the caller adds it to a base. Pure in lt → seek-safe.
export function flashEnvelope(lt, { attack = 0.35, decay = 0.9, peak = 0.4 } = {}) {
  const pk = Math.min(0.45, Math.max(0, peak));
  if (lt < 0) return 0;
  if (lt < attack) { const u = lt / Math.max(0.01, attack); return pk * (1 - (1 - u) * (1 - u)); }
  const u = (lt - attack) / Math.max(0.01, decay);
  return u >= 1 ? 0 : pk * (1 - u) * (1 - u);
}

// ---- layer builder -------------------------------------------------------------------------------

export function build(kit, el, L) {
  if (L.h != null) el.style.height = L.h + 'px';
  el.style.pointerEvents = 'none';

  const spec = L.preset ? presetSpec(L.preset, {
    i: L.intensity, cx: L.cx, cy: L.cy, angle: L.angle,
    color: L.color && L.color !== true ? L.color : undefined,
  }) : null;

  if (!spec && !L.pulse && !L.flash) {
    // ORIGINAL path, untouched: no preset, no pulse → identical output to the pre-preset builder
    const c = L.color === true || L.color == null ? 'var(--accent-glow)' : kit.hexA(L.color, L.intensity ?? 0.25);
    const ang = { right: '90deg', left: '270deg', up: '0deg', down: '180deg' }[L.beam];
    el.style.background = ang ? `linear-gradient(${ang}, transparent, ${c})`
                              : `radial-gradient(50% 50% at 50% 50%, ${c}, transparent 72%)`;
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
    const c = L.color === true || L.color == null ? 'var(--accent-glow)' : kit.hexA(L.color, L.intensity ?? 0.25);
    const ang = { right: '90deg', left: '270deg', up: '0deg', down: '180deg' }[L.beam];
    inner.style.background = ang ? `linear-gradient(${ang}, transparent, ${c})`
                                 : `radial-gradient(50% 50% at 50% 50%, ${c}, transparent 72%)`;
  }
  // .hs-layer is already position:absolute (a containing block) — never override it here
  el.appendChild(inner);
  el.__glowInner = inner;
}

// breathe from LOCAL t (pure in t → deterministic, seek-safe). Stamp el.dataset.gp so a pulse-only
// frame always changes the DOM signature — same rationale as shader.js: without it the render's
// static-frame dedup could wrongly reuse a frame.
export function frame(kit, el, L, t) {
  const cycling = L.preset === 'chromaCycle';
  if ((!L.pulse && !cycling && !L.flash) || !el.__glowInner) return;
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  if (L.flash) {
    // a one-shot bloom that swells then settles (attack-decay); flash may be `true` or {attack,decay,peak}.
    const o = flashEnvelope(t - start, L.flash === true ? {} : L.flash);
    el.__glowInner.style.opacity = o.toFixed(3);
    el.dataset.gf = o.toFixed(3);
  } else if (L.pulse) {
    const o = pulseOpacity(t - start, +L.pulse, L.pulseAmp);
    el.__glowInner.style.opacity = o.toFixed(3);
    el.dataset.gp = o.toFixed(3);
  }
  if (cycling) {
    // hue sweeps the spectrum over time; pure in local t → deterministic, seek-safe. Stamp dataset so
    // a hue-only frame changes the DOM signature (same rationale as pulse / shader.js).
    const h = cycleHue(t - start, L.cycle != null ? +L.cycle : 6);
    el.__glowInner.style.filter = `hue-rotate(${h.toFixed(1)}deg)`;
    el.dataset.gh = h.toFixed(1);
  }
}
