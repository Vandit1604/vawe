// BACKGROUND WINDOWS. Two rules the schema walk cannot express, both about the hand-authored (`html`)
// backdrop introduced alongside the canvas presets.
import { isObj, nearest } from './util.mjs';
import { junctionTable, marksOf, bindWindowsToJunctions } from '../timeline/junctions.js';
import { resolveSpectacle } from '../timeline/spectacle.js';
import { lowerScene } from '../transitions/lower.js';
import { bgPreset, bgOverErrors, bgOptKeys, BG_NAMES, FX_PARAMS } from '../backgrounds/index.js';
import { timeCssUsed } from '../type/sanitize-html.js';

// The keys a bg WINDOW owns. Everything else that matches a preset parameter belongs under `opts`.
// Listed rather than derived: a window's own vocabulary is small and stable, and deriving it from the
// schema would make this check silently weaker the moment the schema grew a key.
const BG_WINDOW_KEYS = new Set(['preset', 'use', 'value', 'html', 'src', 'from', 'to', 't', 'tone', 'opts', 'mode', 'seed', 'base', 'fx', 'breathe']);

// The fx vocabulary a COMPOSED window (`base`+`fx`, no preset) may draw on: exactly the painters a
// preset itself compiles down to (core/backgrounds/fx.js via FX_IMPL, core/backgrounds/index.js). A
// preset is a named recipe over this vocabulary; composing directly means writing the same vocabulary
// yourself, never a second one.
const BG_BASE_KINDS = new Set(['solid', 'linear', 'radial', 'conic']);

// Windows that name no times at all are bound to the film's own joints, one each, in order
// (core/timeline/junctions.js bindWindowsToJunctions). That needs one junction fewer than there are windows.
// Checked HERE as well as at render because the render throw arrives 60 seconds and one ffmpeg pass
// later, and the answer is the same either way. Lowered first: a scene written with the unified
// `transitions` surface has no `cuts` key yet, and counting the raw form would refuse a film whose
// cuts are real (engine-doctrine/MISTAKES.md #358 is the same grammar, one layer up).
function junctionBindingErrors(cfg, bgList, out) {
  if (!(bgList.length > 1 && bgList.every((b) => isObj(b) && b.from == null && b.to == null))) return;
  // CLONED. lowerScene mutates and `delete`s `transitions` off what it is given, which is right for
  // the renderer (it lowers once, at the top) and wrong here: a validator that rewrites the object it
  // is grading changes what every later check sees, and the author's own data with it.
  const table = junctionTable(marksOf(lowerScene(structuredClone(cfg))));
  try { bindWindowsToJunctions(bgList, table, Number(cfg.duration) || Infinity); } catch (e) { out.push(e.message); }
}

// SPECTACLE, checked here because boot REFUSES it and this file did not. `resolveSpectacle` throws on
// an unknown device, on a `spectacle.of` that names no layer id, and on a sting already sitting on the
// moment. Every one of those is knowable from the JSON alone, so every one of them belongs in the
// validator, and none of them was: a scene naming a subject that does not exist passed `make check GATE=validate`
// clean and then died at boot with a stack trace and no file name. Found by writing one.
//
// CLONED for the same reason as the binder above: resolveSpectacle attenuates amplitude dials and
// appends a sting IN PLACE, and a validator must not rewrite the thing it is grading.
function spectacleErrors(cfg, out) {
  if (!isObj(cfg.spectacle)) return;
  try { resolveSpectacle(structuredClone(cfg)); } catch (e) { out.push(e.message); }
}

// ONE source per window. `html` paints in the DOM and `preset` paints on canvas; a window naming
// both looks like a layered backdrop and is not one. The html wins and the preset is silently
// dropped, which is the silent-substitution failure this codebase keeps paying for.
// `src` is `html` in a file, so it belongs in the same one-source set: it does not layer over a
// preset, and naming it beside `html` is the same ambiguity one level down.
function sourceConflictError(b, at) {
  const composed = b.base != null || b.fx != null;
  const sources = ['html', 'src', 'preset', 'use', ...(composed ? ['base/fx'] : [])].filter((k) => k === 'base/fx' || b[k] != null);
  if (sources.length <= 1) return null;
  // The message names the PAIR that actually collided. It used to explain html-versus-preset
  // whatever the conflict was, so `html` beside `src` was refused with a sentence about canvas
  // that had nothing to do with it. A gate that names the wrong cause costs more than silence.
  return `${at} declares ${sources.map((s) => `\`${s}\``).join(' and ')}, a window has ONE backdrop. `
    + (b.html != null && b.src != null
      ? '`src` IS `html`, in a file, so naming both says the same backdrop twice and only one can win. Keep the file and drop the inline copy, or the other way round.'
      : '`html`/`src` paint in the DOM, `preset` and `base`+`fx` paint on canvas; they do not layer. Split them into two windows (with `from`/`to`) if you want both in one video.');
}

function composedWindowErrors(b, at, out) {
  if (b.preset != null || b.html != null || b.src != null) return; // already reported as a source conflict
  if (b.base != null && (!isObj(b.base) || !BG_BASE_KINDS.has(b.base.kind)))
    out.push(`${at}.base needs a \`kind\`: one of ${[...BG_BASE_KINDS].join(', ')} (core/backgrounds/fx.js paintBase).`);
  if (b.base == null)
    out.push(`${at} composes \`fx\` with no \`base\`. A preset always paints a base under its fx; without one the canvas stays transparent and the frame is whatever sits behind it.`);
  if (b.fx != null && !Array.isArray(b.fx))
    out.push(`${at}.fx must be an array of {type, ...} painters, the same vocabulary a preset compiles to.`);
  (Array.isArray(b.fx) ? b.fx : []).forEach((f, fi) => {
    if (!isObj(f) || !f.type) { out.push(`${at}.fx[${fi}] needs a \`type\`: one of ${Object.keys(FX_PARAMS).join(', ')}.`); return; }
    if (!(f.type in FX_PARAMS)) out.push(`${at}.fx[${fi}] type "${f.type}" is not a known painter.${nearest(f.type, Object.keys(FX_PARAMS))}`);
  });
  if (b.opts != null)
    out.push(`${at} sets \`opts\` on a composed (\`base\`/\`fx\`) backdrop, \`opts\` retunes a named PRESET's fx. Composing directly, just write the values on each \`fx\` entry.`);
  if (b.tone != null)
    out.push(`${at} sets \`tone\` on a composed backdrop, \`tone\` is for a hand-authored (\`html\`) one. The engine reads a composed window's lightness off \`base\` itself.`);
}

// `opts` tunes the fx a preset is made of, so the vocabulary is PER PRESET: `liquid` takes
// scale/speed/warp/edge0…, `paperDots` takes spacing/period/drift…. Anything else used to be
// accepted by the schema, dropped by applyBgOver and never read, correct-looking JSON, unchanged
// render (engine-doctrine/MISTAKES.md #157). Say which keys this preset actually has.
// A `use:"theme"` window names no preset here (it comes from themes/<name>.json), so it cannot be
// resolved without the theme; applyBgOver throws on it at build time instead.
// bgPreset now THROWS on an unknown preset (#361). The validator must REPORT a bad name, never
// crash on one, so it only resolves a preset the registry knows, the enum check above has
// already recorded the error for anything else.
function presetOptsErrors(b, at, out) {
  const bgKnown = BG_NAMES.includes(b.preset || 'paper');
  if (isObj(b.opts) && b.use == null && bgKnown)
    out.push(...bgOverErrors(bgPreset(b.preset || 'paper', b.value), b.opts, at));
  // ...AND THE SAME KEY ONE LEVEL UP. #157 made an unknown key INSIDE `opts` throw. Nothing checked
  // a real fx parameter written OUTSIDE it: `{"preset":"gradientWash","intensity":0.3}` is read by
  // films/scene/scene.js:146 as `applyBgOver(spec, b.opts)` with `b.opts` undefined, so the whole
  // override is dropped and the film renders exactly as if the key were not there. That is the
  // identical failure the earlier fix was written for, at the level nobody looked at: I authored one
  // myself, changed the numbers twice, and got a byte-identical contact sheet both times before
  // reading the call site (engine-doctrine/MISTAKES.md #327).
  if (b.use == null && bgKnown) {
    const known = new Set(bgOptKeys(bgPreset(b.preset || 'paper', b.value)));
    const stray = Object.keys(b).filter((k) => known.has(k) && !BG_WINDOW_KEYS.has(k));
    if (stray.length)
      out.push(`${at} sets ${stray.map((k) => `\`${k}\``).join(', ')} at the top level of the window, `
        + `where nothing reads ${stray.length > 1 ? 'them' : 'it'}. ${stray.length > 1 ? 'These are' : 'This is'} `
        + `a preset PARAMETER, and parameters live under \`opts\`: `
        + `{"preset":"${b.preset || 'paper'}", "opts": {${stray.map((k) => `"${k}": …`).join(', ')}}}. `
        + `Written where you have it, the render is unchanged and nothing says so.`);
  }
}

function namedPresetWindowErrors(b, at, sources, out) {
  const authored = b.html != null || b.src != null;
  if (authored) return false;
  if (b.tone != null) out.push(`${at} sets \`tone\` but has no \`html\`, tone declares the lightness of a HAND-AUTHORED backdrop so the engine knows which text ink to default to. A preset's lightness is already known.`);
  // No `preset` and no `use`: the "no source" error above already said so. There is no name here
  // to resolve a known-preset shape against any more (the `|| 'paper'` default is gone), so the
  // preset-parameter checks below have nothing to check.
  if (b.preset == null && b.use == null) return true;
  presetOptsErrors(b, at, out);
  return true;
}

function authoredWindowErrors(b, at, out) {
  if (b.opts != null)
    out.push(`${at} sets \`opts\` on a hand-authored (\`html\`) backdrop, \`opts\` tunes the canvas fx a PRESET is built from, and an html window paints no fx, so nothing would read it. Style the fragment itself.`);
  const timeCss = b.html != null ? timeCssUsed(b.html) : null; // a `src` fragment is read off disk by fragmentFileErrors
  if (timeCss)
    out.push(`${at} uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Drive motion from \`var(--t)\` (seconds) or \`var(--p)\` (0→1 across this window) instead, e.g. \`transform: rotate(calc(var(--t) * 12deg))\`. Both are written every frame.`);
  if (b.tone == null)
    out.push(`${at} is hand-authored but declares no \`tone\` ("light" or "dark"). The engine cannot read the lightness out of your CSS, so a layer with no explicit \`color\` falls back to the theme's ink and may land white-on-white. Say which it is.`);
}

function windowSourceErrors(b, i, out) {
  const at = `bg[${i}]`;
  const sourceConflict = sourceConflictError(b, at);
  if (sourceConflict) out.push(sourceConflict);
  // NO SOURCE AT ALL used to fall back to `preset: "paper"` in silence, exactly the "the engine picked
  // it, so nobody ever designed one again" failure the schema's own hint warns against, one level down
  // from theme.bgDefault (core/backgrounds/theme-rotation.js). Decide it: a preset, a composition, the
  // theme's own default, or a hand-authored fragment.
  const composed = b.base != null || b.fx != null;
  const sources = ['html', 'src', 'preset', 'use', ...(composed ? ['base/fx'] : [])].filter((k) => k === 'base/fx' || b[k] != null);
  if (!sources.length && b.use == null)
    out.push(`${at} names no backdrop: no \`preset\`, no \`base\`/\`fx\` composition, no \`use\`, no \`html\`/\`src\`. The engine will not pick one for you. Say \`{"preset": "plain"}\` for a deliberately flat field, compose one from \`{"base": {...}, "fx": [...]}\`, or hand-author with \`html\`/\`src\`.`);
  if (composed) { composedWindowErrors(b, at, out); return; }
  if (namedPresetWindowErrors(b, at, sources, out)) return;
  authoredWindowErrors(b, at, out);
}

export function bgErrors(cfg) {
  const out = [];
  const bgList = Array.isArray(cfg.bg) ? cfg.bg : [];
  junctionBindingErrors(cfg, bgList, out);
  spectacleErrors(cfg, out);
  bgList.forEach((b, i) => { if (isObj(b)) windowSourceErrors(b, i, out); });
  return out;
}
