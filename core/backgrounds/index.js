// core/backgrounds/index.js: THE RUNNER. Presets (./presets.js) are DATA: a name, a blurb, and a
// build(P, grain, dark) that composes the painters in ./fx.js into a `{ base, fx }` spec. This file
// is the generic machinery around that data: it derives BG_NAMES/BG_BLURBS from the presets, resolves
// a name to its spec (bgPreset), reads the opts vocabulary straight off each painter's own source
// (FX_PARAMS), applies per-video overrides (applyBgOver), dispatches an fx list to the right painter
// at render time (renderBg), and publishes the registry. Adding a preset means adding one entry to
// presets.js; nothing here changes. core/backgrounds.js re-exports this whole surface so every
// existing importer keeps its `from './backgrounds.js'` path.
import { defineRegistry } from '../registry/registry.js';
import { paintBase, dotGrid, particles, aurora, softwash, spotlight, metallic, liquid, grain, gradientFill } from './fx.js';
import { PAL_PLINTH, PAL, bgPaletteFrom } from './palette.js';
import { PRESETS } from './presets.js';

export { paintBase, dotGrid, particles, aurora, softwash, spotlight, metallic, liquid, grain, gradientFill };
export { PAL_PLINTH, PAL, bgPaletteFrom };

// BG_NAMES: the background presets bgPreset() understands, DERIVED from presets.js (there is no other
// way to enumerate a switch, so this used to be a hand-kept list; now it is the presets' own names).
export const BG_NAMES = PRESETS.map((p) => p.name);
// BG_BLURBS: one line per preset, DERIVED from presets.js. Consumed by the generated docs table and by
// any catalog/MCP surface.
export const BG_BLURBS = Object.fromEntries(PRESETS.map((p) => [p.name, p.blurb]));

const BY_NAME = new Map(PRESETS.map((p) => [p.name, p]));

// `name` defaults to `paper` HERE rather than at each call site, where `b.preset || 'paper'` was
// written three times. Absence has one documented answer; a WRONG name throws (#361).
export function bgPreset(name = 'paper', value, P = PAL_PLINTH) {
  if (name == null) name = 'paper';
  const preset = BY_NAME.get(name);
  if (!preset) throw new Error(`unknown background preset "${name}", one of: ${BG_NAMES.join(', ')}. `
    + `An unknown name used to render aurora, which looks deliberate and is not what was asked for.`);
  const dark = value === 'dark' || value === 'ink';
  const grainFx = { type: 'grain', alpha: dark ? 0.035 : 0.02, fps: 30 };
  return preset.build(P, grainFx, dark);
}

// ---------- bg `opts`: what a window may actually tune ----------
// The fx implementations in ./fx.js are the ONLY authority on which knobs exist, so the accepted-key
// list is READ OUT OF THEM rather than restated here. A hand-kept list is the bug it is trying to
// prevent: it goes stale the moment an fx grows a parameter, and the stale half fails silently
// (docs/MISTAKES.md #159). Each fx takes its options as its LAST parameter and reads them as `bag.<key>`,
// so the keys are exactly the property reads on that parameter.
const FX_IMPL = { dots: dotGrid, particles, aurora, softwash, spotlight, metallic, liquid, grain, gradientFill };
function paramsOf(fn) {
  const src = String(fn);
  const sig = src.slice(src.indexOf('(') + 1, src.indexOf(')'));
  const bag = sig.split(',').pop().split('=')[0].trim();
  const keys = new Set();
  for (const m of src.matchAll(new RegExp(`\\b${bag}\\.([A-Za-z_$][\\w$]*)`, 'g'))) keys.add(m[1]);
  return keys;
}
export const FX_PARAMS = Object.fromEntries(Object.entries(FX_IMPL).map(([k, fn]) => [k, [...paramsOf(fn)].sort()]));
// If the derivation ever stops working (a bundler rewrote the source, an fx changed shape) it must say
// so at load, not quietly accept nothing: an empty key set would reject every legal opt.
for (const [k, v] of Object.entries(FX_PARAMS))
  if (v.length < 2) throw new Error(`backgrounds.js: cannot derive the option keys of fx "${k}" from its implementation (got ${v.length}). The bg \`opts\` contract is read from the fx source; fix paramsOf() rather than hand-listing keys.`);

// META knobs are NOT fx parameters: they scale/derive what the preset baked in, across whichever fx are
// present. Each maps to the fx types it can act on; a window naming one with no such fx is an error, the
// same as naming a knob that does not exist.
const META = {
  intensity: ['dots', 'aurora', 'spotlight', 'softwash'],
  dotAlpha: ['dots'], drift: ['dots'], grain: ['grain'],
};

// bgOptKeys(spec) → every key THIS window's fx set accepts, sorted. The vocabulary is per-preset: a
// `liquid` window takes scale/speed/warp/edge0…, a `paperDots` window takes spacing/period/driftX…
export function bgOptKeys(spec) {
  const types = new Set((spec?.fx || []).map((f) => f.type));
  const keys = new Set();
  for (const t of types) for (const k of FX_PARAMS[t] || []) keys.add(k);
  for (const [k, on] of Object.entries(META)) if (on.some((t) => types.has(t))) keys.add(k);
  return [...keys].sort();
}

// bgOverErrors(spec, over, at) → one message per key this window cannot act on, naming the ones it can.
// Shared by core/validate.mjs (pre-render, with a `bg[i]` label) and applyBgOver below (the backstop).
export function bgOverErrors(spec, over, at = 'bg opts') {
  if (!over || !spec) return [];
  const ok = bgOptKeys(spec);
  const types = (spec.fx || []).map((f) => f.type).join(' + ') || 'none';
  return Object.keys(over).filter((k) => !ok.includes(k)).map((k) =>
    `${at}: \`${k}\` is not a knob this background has, so it would be read by nothing. This window's fx are ${types}; it accepts ${ok.join(', ')}.`);
}

// applyBgOver(spec, over): per-video tuning of a preset's baked numbers (the palette still owns colour
// by default, though `color` is a real fx parameter and may be overridden deliberately).
//   • META keys (intensity · dotAlpha · drift · grain) SCALE the preset's baked values.
//   • every other key is written straight through to each fx in this window that reads it, so the
//     documented fx parameters (scale, speed, warp, edge0/edge1, gloss, res, count, waves, glow,
//     sweep, spacing, period, …) work by name instead of being accepted and dropped.
// A key no fx here reads THROWS: it was accepted and ignored before, which is how a `liquid` window
// carrying scale/speed/edge0 rendered completely unchanged with nothing said (docs/MISTAKES.md #157).
// Mutates the freshly-built spec (each bg window builds its own), so no shared state. over falsy = no-op.
export function applyBgOver(spec, over) {
  if (!over || !spec) return spec;
  const bad = bgOverErrors(spec, over);
  if (bad.length) throw new Error(bad.join('\n'));
  for (const fx of spec.fx || []) {
    if (fx.type === 'dots') {
      if (over.dotAlpha != null) { fx.peakAlpha = over.dotAlpha; fx.baseAlpha = +(over.dotAlpha * 0.3).toFixed(3); }
      else if (over.intensity != null) fx.peakAlpha = +((fx.peakAlpha ?? 0.2) * over.intensity).toFixed(3);
      if (over.drift != null) { fx.driftX = (fx.driftX ?? 0) * over.drift; fx.driftY = (fx.driftY ?? 0) * over.drift; }
    } else if (fx.type === 'aurora' || fx.type === 'spotlight' || fx.type === 'softwash') {
      if (over.intensity != null) fx.intensity = +((fx.intensity ?? (fx.type === 'softwash' ? 1 : 0.5)) * over.intensity).toFixed(3);
    } else if (fx.type === 'grain') {
      if (over.grain != null) fx.alpha = over.grain;
    }
    // pass-through: the real fx parameters, by their own names.
    for (const [k, v] of Object.entries(over)) if (!(k in META) && (FX_PARAMS[fx.type] || []).includes(k)) fx[k] = v;
  }
  return spec;
}

// renderBg(canvas, t, spec): paint a full scene background from a spec (base + ordered fx list).
// spec = { base:{...}, fx:[{type:'aurora'|'dots'|'particles'|'spotlight'|'grain', ...opts}] }
export function renderBg(ctx, w, h, t, spec) {
  ctx.clearRect(0, 0, w, h);
  if (spec.base) paintBase(ctx, w, h, spec.base);
  for (const fx of spec.fx || []) {
    if (fx.type === 'aurora') aurora(ctx, w, h, t, fx);
    else if (fx.type === 'dots') dotGrid(ctx, w, h, t, fx);
    else if (fx.type === 'particles') particles(ctx, w, h, t, fx);
    else if (fx.type === 'spotlight') spotlight(ctx, w, h, t, fx);
    else if (fx.type === 'metallic') metallic(ctx, w, h, t, fx);
    else if (fx.type === 'softwash') softwash(ctx, w, h, t, fx);
    else if (fx.type === 'liquid') liquid(ctx, w, h, t, fx);
    else if (fx.type === 'grain') grain(ctx, w, h, t, fx);
    else if (fx.type === 'gradientFill') gradientFill(ctx, w, h, t, fx);
  }
}

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a background preset" when someone writes it somewhere else. core/registry.js.
export const BG_REGISTRY = defineRegistry('background preset', Object.fromEntries(BG_NAMES.map((n) => [n, n])), { slot: 'bg[].preset', blurbs: BG_BLURBS,
  catalog: {
    title: 'Backgrounds',
    tag: 'background',
    intro: '`bg:[{preset,from,to}]`. The field behind everything; moving ones (aurora/constellation/mesh/…) animate.',
    usage: (n, { j }) => j({ bg: [{ preset: n, from: 0, to: 6 }] }),
    preview: (n, { base, HERO }) => base({ bg: [{ preset: n, from: 0, to: 6 }], layers: [{ ...HERO, text: n, size: 110 }] }),
  },
});
