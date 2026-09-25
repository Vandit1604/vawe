// core/backgrounds/presets.js: THE RECIPE LIBRARY, one entry per named background a scene author
// picks (`bg[].preset`). Each entry is { name, blurb, build(P, grain) }: `build` composes the
// palette P (see palette.js) and the shared `grain` fx object into a `{ base, fx:[...] }` spec, using
// the painters in ./fx.js. That `{base, fx}` shape IS the authored vocabulary: a scene author can
// write it directly (`bg[].base` + `bg[].fx`, films/scene/scene.js) instead of naming a recipe here,
// composing the same painters by hand. A preset is a recipe over that vocabulary, never a second one:
// adding a preset means adding one entry here, never touching the runner (core/backgrounds/index.js)
// or the fx painters themselves.
//
// EVERY blurb says whether the field MOVES, because that is the fact an author cannot read off a still
// and quality/gates/beat-check.mjs warns on a whole film built from flat ones. FLAT = base gradient +
// film grain and no moving fx: `plain` `paper` `accentPlain` `dark` `deep`. Everything else animates.
export const PRESETS = [
  // ---- LIGHT-FIRST presets (for white/editorial brands: paper bg + accent on top) ----
  {
    name: 'plain',
    blurb: 'a flat theme colour field with a 0.02 grain wash (0.035 on dark)',
    build: (P, grain, dark) => ({ base: dark ? { kind: 'solid', color: P.inkBase[1] } : { kind: 'solid', color: P.paperBase[0] }, fx: [grain] }),
  },
  {
    name: 'paper',
    blurb: 'the paper gradient with grain only, FLAT, the white-first default when the motion lives in the content',
    build: (P, grain) => ({ base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [grain] }),
  },
  {
    name: 'paperDots',
    blurb: 'a faint drifting dot grid on the light paper base, dots 54px apart waving between 0.14 and 0.34 alpha',
    build: (P, grain) => ({ base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'dots', mode: 'wave', color: P.dotLight, baseAlpha: 0.14, peakAlpha: 0.34, spacing: 54, r: 1.5, rPeak: 4, k: 0.03, period: 5, driftX: 11, driftY: 6 }, grain ] }),
  },
  {
    name: 'paperShapes',
    blurb: 'faint drifting geometric shapes on the light paper base, 64px apart waving between 0.05 and 0.13 alpha',
    build: (P, grain) => ({ base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'dots', mode: 'wave', color: P.accent, baseAlpha: 0.05, peakAlpha: 0.13, spacing: 64, r: 1.3, rPeak: 2.0 }, grain ] }),
  },
  {
    name: 'soft',
    blurb: 'gentle light radial with faint accent rings and discs drifting over it (moves)',
    // `intensity`, not `alpha`: softwash (core/backgrounds/fx.js) has no `alpha` option, only
    // `intensity` as its per-blob multiplier. `alpha` here was dead, baked in and never read.
    build: (P, grain) => ({ base: { kind: 'radial', from: P.softBase[0], to: P.softBase[1], cx: 0.5, cy: 0.44 }, fx: [
      { type: 'softwash', color: P.accent, intensity: 0.15, seed: 6 }, grain ] }),
  },
  {
    name: 'accent',
    blurb: 'the brand accent as a radial with rippling dots and a slow spotlight (moves), the loud brand field',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.accentBase[0], to: P.accentBase[1], cx: 0.5, cy: 0.42 }, fx: [
      { type: 'dots', mode: 'ripple', color: '255,255,255', baseAlpha: 0.05, peakAlpha: 0.22, spacing: 60, cx: 0.5, cy: 0.42, k: 0.024, period: 4, driftX: 6, driftY: -6 }, { type: 'spotlight', intensity: 0.08, period: 7, y: 0.42 }, grain ] }),
  },
  // accentPlain: the brand's accent colour as a clean full-bleed field (grain only, no dots/spotlight).
  // For PLAIN sites whose hero is a flat/gradient colour, not a textured one: match plain with plain.
  {
    name: 'accentPlain',
    blurb: 'the brand accent as a clean full-bleed field, grain only. FLAT, for plain sites whose hero is one colour',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.accentBase[0], to: P.accentBase[1], cx: 0.5, cy: 0.4 }, fx: [grain] }),
  },
  {
    name: 'dotmatrix',
    blurb: 'a light field ruled by dots 52px apart, whose size waves from 1.6px to 4.5px across it, the printed halftone look (moves)',
    build: (P, grain) => ({ base: { kind: 'linear', from: P.light[0], to: P.light[1] }, fx: [
      { type: 'dots', mode: 'wave', color: P.dotLight, baseAlpha: 0.06, peakAlpha: 0.24, spacing: 52, r: 1.6, rPeak: 4.5, k: 0.03, period: 5, driftX: 12, driftY: 6 }, grain ] }),
  },
  // `case 'aurora': default:` used to catch ANY unknown name too, byte-identically. The schema enum is
  // what catches a typo now (engine-doctrine/MISTAKES.md #361); this entry is only the named `aurora` preset.
  {
    name: 'aurora',
    blurb: 'three drifting colour blobs at 0.46 intensity over a dark radial, the northern-lights field (moves)',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.dark[0], to: P.dark[1], cx: 0.6, cy: 0.42 }, fx: [
      { type: 'aurora', intensity: 0.46, motionScale: 3.2, blobs: [ { color: P.accent, x: 0.34, y: 0.42, r: 720, ax: 130, ay: 98, px: 15, py: 19, ph: 0 }, { color: P.tint, x: 0.72, y: 0.55, r: 620, ax: 160, ay: 118, px: 18, py: 13, ph: 2 }, { color: P.tint2, x: 0.5, y: 0.28, r: 500, ax: 100, ay: 78, px: 12, py: 21, ph: 4 } ] }, grain ] }),
  },
  {
    name: 'mesh',
    blurb: 'soft gradient mesh, three colour blobs at 0.42 intensity over a dark radial (dark/saturated, check contrast, moves)',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.darkMesh[0], to: P.darkMesh[1], cx: 0.4, cy: 0.5 }, fx: [
      { type: 'aurora', intensity: 0.42, motionScale: 3.2, blobs: [ { color: P.tint, x: 0.3, y: 0.4, r: 680, ax: 140, ay: 96, px: 14, py: 19, ph: 0 }, { color: P.accent, x: 0.72, y: 0.55, r: 600, ax: 160, ay: 116, px: 18, py: 13, ph: 2 }, { color: P.tint2, x: 0.55, y: 0.3, r: 500, ax: 110, ay: 76, px: 12, py: 21, ph: 4 } ] }, grain ] }),
  },
  {
    name: 'constellation',
    blurb: 'drifting connected nodes (moves), telemetry/data feel: 78 particles connected within 150px',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.deep[0], to: P.deep[1], cx: 0.5, cy: 0.46 }, fx: [
      { type: 'particles', count: 78, connect: true, speed: 9, color: P.tint2, connectDist: 150, seed: 7 }, grain ] }),
  },
  {
    name: 'brandglow',
    blurb: 'a breathing accent glow at 0.5 intensity plus rippling dots, over an ink radial base',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.ink[0], to: P.ink[1], cx: 0.5, cy: 0.42 }, fx: [
      { type: 'aurora', intensity: 0.5, blobs: [ { color: P.accent, x: 0.5, y: 0.42, r: 820, ax: 70, ay: 46, px: 13, py: 17, ph: 1 }, { color: P.tint, x: 0.32, y: 0.6, r: 560, ax: 100, ay: 66, px: 16, py: 12, ph: 3 } ] },
      { type: 'dots', mode: 'ripple', color: P.tint2, baseAlpha: 0.06, peakAlpha: 0.32, spacing: 60, cx: 0.5, cy: 0.42, k: 0.024, period: 4, driftX: 6, driftY: -6 }, grain ] }),
  },
  {
    name: 'spotlight',
    blurb: 'a deep field with one soft pool of light wandering across it on a slow cycle, the eye follows the bright patch (moves)',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.deep[0], to: P.deep[1], cx: 0.5, cy: 0.4 }, fx: [
      { type: 'dots', mode: 'pulse', color: P.tint2, baseAlpha: 0.06, peakAlpha: 0.22, spacing: 64, period: 5, driftX: 9, driftY: 5 }, { type: 'spotlight', intensity: 0.12, period: 8 }, grain ] }),
  },
  // clean dark radial gradients (NO dots): what you reach for when you want a plain deep backdrop
  {
    name: 'dark',
    blurb: 'a plain dark radial, no dots. FLAT, the quiet backdrop for busy content',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.dark[0], to: P.dark[1], cx: 0.5, cy: 0.44 }, fx: [grain] }),
  },
  {
    name: 'deep',
    blurb: 'the deepest plain radial, no dots. FLAT, when the content must own the whole frame',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.deep[0], to: P.deep[1], cx: 0.5, cy: 0.42 }, fx: [grain] }),
  },
  {
    name: 'ink',
    blurb: 'dark radial with slow accent-tinted dots pulsing in place (moves), for a clean flat dark use `plain` + value:"dark"',
    build: (P, grain) => ({ base: { kind: 'radial', from: P.inkBase[0], to: P.inkBase[1], cx: 0.5, cy: 0.44 }, fx: [
      // baseAlpha is a FLOOR, not a starting point: at 0.06 the grid pulsed all the way to invisible and
      // back, so it read as flicker rather than as a field that breathes.
      { type: 'dots', mode: 'pulse', color: P.accent, baseAlpha: 0.11, peakAlpha: 0.22, spacing: 64, period: 5, driftX: 8, driftY: 5 }, grain ] }),
  },
  // BLACK MEANS #000000, and it is a preset because it was a rule (see AGENTS.md). NO GRAIN: grain is
  // noise painted over the base, which lifts the corners off zero, and the point here is true zero.
  {
    name: 'black',
    blurb: 'literally #000000, no tint, no wash, no grain. FLAT, when the only light in the film is the subject itself',
    build: () => ({ base: { kind: 'solid', color: '#000000' }, fx: [] }),
  },
  {
    name: 'metallic',
    blurb: 'vertical light rods with a travelling SHIMMER (brushed metal / lit equaliser), dramatic dark bg, brand-coloured',
    build: (P) => ({ base: { kind: 'solid', color: '#05070a' }, fx: [
      { type: 'metallic', color: P.accent, count: 70, speed: 0.9, waves: 2.2, glow: 0.5, alpha: 0.2, gx: 0.5, gy: 0.78 }, { type: 'grain', alpha: 0.04 } ] }),
  },
  {
    name: 'metallicSheen',
    blurb: 'the quieter metallic: fewer, slower rods with a sweep crossing them (moves), a dark field type can sit on',
    build: (P) => ({ base: { kind: 'solid', color: '#040806' }, fx: [
      { type: 'metallic', color: P.accent, count: 58, speed: 0.7, waves: 1.8, glow: 0.42, alpha: 0.16, gx: 0.78, gy: 0.6, sweep: 0.16, sweepSpeed: 0.1 }, { type: 'grain', alpha: 0.07 } ] }),
  },
  // gradientWash: one big saturated pool bleeding off a corner into white. A MESH GRADIENT, so the
  // colour has somewhere to come from and somewhere to go; three even pools just average to haze.
  {
    name: 'gradientWash',
    blurb: 'one big saturated pool bleeding off a corner into white, a mesh gradient (moves), light and premium',
    build: (P) => ({ base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'softwash', intensity: 1, motionScale: 3.0, blobs: [
        { color: P.accent, x: 0.14, y: 0.82, rf: 0.46, ax: 0.035, ay: 0.03, px: 24, py: 29, ph: 0, a: 0.78 },
        { color: P.tint2, x: 0.72, y: 0.16, rf: 0.32, ax: 0.045, ay: 0.038, px: 19, py: 23, ph: 2, a: 0.5 },
        { color: P.accent, x: 0.94, y: 0.62, rf: 0.2, ax: 0.03, ay: 0.026, px: 27, py: 17, ph: 4, a: 0.34 } ] },
      { type: 'grain', alpha: 0.03 } ] }),
  },
  // blobs. The OTHER light look: airier and more open. Smaller, better-separated pools that leave white
  // space between them. `grid` is opt-in by name on a softwash fx now, never baked into this preset
  // (silent substitution was the failure: engine-doctrine/MISTAKES.md, nobody who wrote "preset":"blobs" asked
  // for a blueprint).
  {
    name: 'blobs',
    blurb: 'the airier light wash: smaller, separated pools with white between them (moves). No grid: write `grid: true` on a softwash fx if you want the blueprint rules',
    build: (P) => ({ base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'softwash', intensity: 1, motionScale: 3.0, blobs: [
        { color: P.accent, x: 0.2, y: 0.26, rf: 0.24, ax: 0.04, ay: 0.034, px: 21, py: 26, ph: 0, a: 0.5 },
        { color: P.tint2, x: 0.8, y: 0.72, rf: 0.26, ax: 0.045, ay: 0.038, px: 25, py: 19, ph: 2.4, a: 0.44 },
        { color: P.accent, x: 0.52, y: 0.9, rf: 0.18, ax: 0.03, ay: 0.028, px: 17, py: 23, ph: 4.2, a: 0.3 } ] },
      { type: 'grain', alpha: 0.03 } ] }),
  },
  // liquid: folds of the brand hue against true black (the "liquid light" backdrop). Dramatic and
  // full-bleed by design: it OWNS the frame, so put quiet type on it, nothing else.
  {
    name: 'liquid',
    blurb: 'folds of the brand hue against true black (moves). It OWNS the frame, so quiet type on it and nothing else',
    build: (P) => ({ base: { kind: 'solid', color: '#000000' }, fx: [
      { type: 'liquid', color: P.accent }, { type: 'grain', alpha: 0.03 } ] }),
  },
  // gradient: the agent-controlled gradient family (core/backgrounds/fx.js#gradientFill).
  // `opts.recipe` names a curated combo; `opts.colors`/`type`/`angle`/`stops`/`cx`/`cy` override it or
  // replace it entirely. Paper base under it: a flat fill repaints the whole frame regardless, and a
  // mesh wash reads as colour pooling into white, same as `blobs`/`gradientWash` above.
  {
    name: 'gradient',
    blurb: 'an agent-controlled colour gradient backdrop, linear/radial/conic from your own hex colours, angle and stops, or a named recipe (`opts.recipe`). FLAT unless `opts.kind` is "mesh", which moves it',
    build: (P, grain) => ({ base: { kind: 'linear', from: P.paperBase[0], to: P.paperBase[1] }, fx: [
      { type: 'gradientFill', recipe: 'warm-dusk' }, grain ] }),
  },
];
