import { glContext } from '../engine/webgl.js';
import { buildInlinedCss, domToCanvas } from '../resample/raster.js';
import { DIRS } from '../cuts/index.js';
import { defineRegistry } from '../registry/registry.js';
import { UNITS, SEAM_FX, SEAM_BLURBS } from '../transitions/units.js';
// core/seams.js, SEAM D: two-scene shader transitions.
//
// A `sting` (core/stings.js) paints a GENERATIVE overlay on top of one beat; a `cut` (core/cuts.js)
// transforms ONE scene root. Neither can blend the OUTGOING beat INTO the INCOMING one, because
// neither samples both as textures. A SEAM does: the two beats either side of a boundary are
// rasterised ONCE (at build) into textures u_from / u_to, and a fragment shader keyed on u_progress
// smears / reveals / bends BOTH across the boundary.
//
//   const seam = createSeamCompositor(stageEl, W, H);   // once, at build
//   const from = await stageToCanvas({...});            // once, at build (rasterise the leaving beat)
//   const to   = await stageToCanvas({...});            // once, at build (rasterise the arriving beat)
//   seam.draw('whipPan', p, from, to, { dir:'left', seed:3 });  // every frame in the seam window
//   seam.clear();                                        // every frame otherwise
//
// DETERMINISM: from/to are baked ONCE from two fixed frames and are STATIC rasters. draw() is a pure
// function of (fx, progress, from, to, opts). No wall clock, no per-frame rasterisation, no feedback.
// So renderFrame(n) stays pure in n and 8 out-of-order workers agree. This is the bake-then-pure
// pattern of core/canvas-fx.js / core/resample-fx.js, applied to the whole stage.
//
// FALLBACK: no WebGL (headless without GL) or a raster that came back empty → a plain opacity
// cross-fade on a 2D canvas. A seam never crashes a render; at worst it dissolves.

// THE VOCABULARY now lives with the units in core/transitions/units.js: SEAM_FX and SEAM_BLURBS are
// DERIVED from that library and re-exported here so every existing importer (core/transitions.js,
// formats/scene/scene.js, the schema) keeps its `from './seams.js'` path. Adding a transition is adding
// a unit file, never editing this runner.
export { SEAM_FX, SEAM_BLURBS };

const VERT = 'attribute vec2 a; varying vec2 v_uv; void main(){ v_uv = a*0.5+0.5; gl_Position = vec4(a, 0.0, 1.0); }';

// THE PREAMBLE: the contract every unit's GLSL compiles against (core/transitions/units.js documents
// it). getFrom/getTo flip Y (canvas rows top-down, GL bottom-up); the #defines alias the canonical
// gl-transitions names so a vendored shader runs verbatim. ONE PROGRAM PER UNIT is compiled below, so
// units never share a name/uniform space and a helper in one cannot collide with another.
const PREAMBLE = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_p;
uniform float u_seed;
uniform vec2  u_dir;
uniform float u_intensity;
uniform float u_feather;
uniform vec2  u_res;
const float PI = 3.14159265;
vec4 getFrom(vec2 uv){ return texture2D(u_from, vec2(uv.x, 1.0 - uv.y)); }
vec4 getTo(vec2 uv){ return texture2D(u_to, vec2(uv.x, 1.0 - uv.y)); }
#define getFromColor getFrom
#define getToColor getTo
#define progress clamp(u_p, 0.0, 1.0)
#define ratio (u_res.x / u_res.y)
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21) + u_seed); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
`;
// Appended AFTER each unit's transition(): the entry the runner calls. Opaque output; the seam fully
// covers the live stage during its window.
const MAIN = `
void main(){ gl_FragColor = vec4(transition(v_uv).rgb, 1.0); }
`;

// compile ONE program per unit: PREAMBLE (the shared contract) + the unit's own transition() + MAIN.
// Each unit is its own program, so a helper or uniform in one can never collide with another, which is
// what lets the library grow to many vendored gl-transitions shaders without one giant shader.
// The exact fragment source a unit compiles to: preamble + its transition() + main. Exported so an
// offline compile-check (harness/dev/seam-compile-check.mjs) tests the SAME source the runner builds.
export const seamFrag = (unit) => PREAMBLE + '\n' + unit.glsl + '\n' + MAIN;
export const SEAM_VERT = VERT;

function buildProgram(gl, unit) {
  const frag = seamFrag(unit);
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`seam shader "${unit.name}": ` + gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('seam link: ' + gl.getProgramInfoLog(prog));
  return prog;
}

// The shader's uv.y is GL y-UP (uv.y=1 is the top of the frame), so "up" is +y and "down" is -y here.
// (Screen-space y-down would invert the vertical seams, up would push down. MISTAKES: seam y-flip.)
const DIR_VEC = { left: [-1, 0], right: [1, 0], up: [0, 1], down: [0, -1] };
// One direction vocabulary for the whole engine (core/cuts.js). This file held the third copy of the
// same four names and the same silent fall back to left.
export const okDir = (d) => { if (d == null) return 'left'; if (DIRS.includes(d)) return d;
  throw new Error(`unknown seam direction "${d}", one of: ${DIRS.join(', ')}`); };

// ANGLE: `dir` also accepts a number, in degrees, resolved to a unit vector (0deg = right, 90deg = up,
// matching DIR_VEC's own axes). A name still goes through okDir (validated, defaults to left); a number
// is trusted as-is, mod nothing, so 370 and 10 land at the same vector (harmless, never worth refusing).
export const dirVec = (d) => (typeof d === 'number' ? [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)] : DIR_VEC[okDir(d)]);

// FEATHER: every edge-based unit used to bake its own edge softness as a GLSL literal. This is that
// literal, moved out to a per-fx JS default so `opts.feather` can override it. irisRound's default was
// never a constant, it grew with `u_intensity`, so its entry stays a function of the resolved intensity
// to keep an unset-feather render byte-identical to before this knob existed.
const DEFAULT_FEATHER = {
  wipe: 0.015,
  irisRound: (intensity) => 0.02 + 0.04 * intensity,
  clockWipe: 0.02,
  barnDoor: 0.03,
  blindsWipe: 0.06,
  burnThrough: 0.05,
  lumaWipe: 0.04,
};
export const featherFor = (fx, intensity, opts) => {
  if (opts.feather != null) return +opts.feather;
  const d = DEFAULT_FEATHER[fx];
  return typeof d === 'function' ? d(intensity) : (d ?? 0);
};

// createSeamCompositor(parent, w, h): a full-frame canvas above the stings overlay (z 85, below the
// caption bar at z 90) that either runs the two-scene shader or, without GL, cross-fades in 2D.
export function createSeamCompositor(parent, w = 1920, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.setAttribute('data-motion', 'loop'); // transition chrome. Exempt from motion-audit reveal rules
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: 85, pointerEvents: 'none', display: 'none' });
  parent.appendChild(canvas);

  const gl = glContext(canvas, { alpha: false, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true }, 'seam', { soft: true });

  // ---- 2D fallback: plain opacity cross-fade (no GL, or a program failed to compile) ----
  if (!gl) return make2dFallback(canvas, w, h);

  // ONE PROGRAM PER UNIT, compiled independently so a single bad unit degrades to `fade` for THAT fx
  // only, never dropping every seam to the 2D fallback. (The library grows by adding units; a typo in
  // one vendored shader must not blank the rest.) Only `fade` itself failing to compile, a real driver
  // problem, falls the whole compositor back to 2D.
  let programs, fadeProg = null;
  const fadeUnit = UNITS.find((u) => u.name === 'fade') || UNITS[0];
  try { fadeProg = buildProgram(gl, fadeUnit); }
  catch (e) { return make2dFallback(canvas, w, h, gl); }
  programs = UNITS.map((u) => {
    if (u === fadeUnit) return fadeProg;
    try { return buildProgram(gl, u); }
    catch (e) { try { console.warn(`seam "${u.name}" failed to compile, using fade: ${e.message}`); } catch (_) {} return fadeProg; }
  });
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  // upload a baked raster canvas to a GL texture ONCE (cached on the element, the raster is static).
  const uploadTex = (srcCanvas) => {
    if (!srcCanvas) return null;
    if (srcCanvas.__seamTex) return srcCanvas.__seamTex;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas); }
    catch (e) { gl.deleteTexture(tex); return null; }
    srcCanvas.__seamTex = tex;
    return tex;
  };

  gl.viewport(0, 0, w, h);
  let last = '';
  return {
    canvas,
    // fx name, progress 0..1, from/to baked HTMLCanvasElements, opts { dir, seed, intensity }
    draw(fx, progress, from, to, opts = {}) {
      let idx = SEAM_FX.indexOf(fx);
      if (idx < 0) idx = 0; // unknown fx → fade (schema/validate reject unknowns; this is belt-and-braces)
      const fromTex = uploadTex(from), toTex = uploadTex(to);
      if (!fromTex || !toTex) return this.clear(); // nothing baked → show live stage (safer than black)
      const seed = +opts.seed || 0, intensity = opts.intensity != null ? +opts.intensity : 1;
      // The third copy of `[dir] || left`. core/cuts.js owns the vocabulary; this asks it. #361.
      // `opts.dir` is either one of the 4 cardinal names or a number of degrees (dirVec above).
      const dir = dirVec(opts.dir);
      const feather = featherFor(fx, intensity, opts);
      const key = idx + ':' + progress.toFixed(4) + ':' + seed + ':' + intensity + ':' + feather + ':' + dir.join(',') + ':' + (from.__seamId || '') + ':' + (to.__seamId || '');
      if (canvas.style.display !== 'block') canvas.style.display = 'block';
      if (key === last) return; last = key;
      const prog = programs[idx];
      gl.useProgram(prog);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_p'), progress);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_seed'), seed);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), intensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_feather'), feather);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_dir'), dir[0], dir[1]);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fromTex);
      gl.uniform1i(gl.getUniformLocation(prog, 'u_from'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, toTex);
      gl.uniform1i(gl.getUniformLocation(prog, 'u_to'), 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    clear() {
      if (canvas.style.display === 'none') return;
      last = '';
      canvas.style.display = 'none';
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
  };
}

// 2D cross-fade compositor: the required no-GL fallback. draw() ignores fx and dissolves from→to.
function make2dFallback(canvas, w, h) {
  const ctx = canvas.getContext('2d');
  let shown = false;
  return {
    canvas,
    draw(fx, progress, from, to) {
      if (!from || !to) { this.clear(); return; }
      if (!shown) { canvas.style.display = 'block'; shown = true; }
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1; ctx.drawImage(from, 0, 0, w, h);
      ctx.globalAlpha = Math.max(0, Math.min(1, progress)); ctx.drawImage(to, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
    clear() { if (!shown) return; shown = false; canvas.style.display = 'none'; ctx.clearRect(0, 0, w, h); },
  };
}

// ---- stage rasterisation (the DOM-as-texture bake) -----------------------------------------------
// CHOICE: in-browser SVG <foreignObject> serialisation, compositing the 2D background canvas UNDER the
// DOM layers. Reasons this path (option (a)) over a Go screenshot pre-pass (option (b)):
//   • self-contained in the page: no Go/JS coordination, so `make probe`/`make snap`/`make
//     canvas-purity` on existing scenes are untouched (a scene with no `seams` never bakes).
//   • the bake is one-shot at build; the textures are static, so renderFrame(n) stays pure in n.
// The two <foreignObject> gotchas are both handled here: (1) external stylesheets and CSS custom
// properties do NOT apply inside the isolated SVG render, so tokens.css + the scene <style> + the
// :root vars are INLINED into the SVG; (2) @font-face url()s are not fetched during the SVG→image
// rasterisation, so every USED face is fetched and embedded as a data: URI. Same-origin only.
// A true <canvas>/WebGL background is captured by drawing the live #cv bitmap under the DOM raster.
// Limitation: cross-origin <img>/captured components can render blank inside the foreignObject; those
// beats degrade toward the background + text, and a fully empty raster trips the cross-fade fallback.

// The <foreignObject> serialiser those two gotchas belong to now lives in core/raster.js: a resample
// pass wants the same DOM-to-pixels step for ONE layer, and a second copy of it would drift.

// stageToCanvas({ w, h, cv, cam, root, useCanvasBg }): composite the CURRENT stage into one raster.
//   • useCanvasBg (bg windows present, #cv is the opaque backdrop): draw the live #cv bitmap, then the
//     #cam DOM layers on top.
//   • otherwise (theme-gradient stage, #cv hidden): rasterise #root, whose CSS gradient IS the
//     background and which contains #cam; the blank #cv inside is harmless (transparent).
// Returns a canvas, or throws/returns a mostly-empty canvas the caller can treat as a bake miss.
export async function stageToCanvas({ w, h, cv, cam, root, useCanvasBg }) {
  const target = useCanvasBg ? cam : root;
  const css = await buildInlinedCss(target);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const octx = out.getContext('2d', { willReadFrequently: true });
  if (useCanvasBg && cv && cv.width) {
    octx.drawImage(cv, 0, 0, w, h);
    const dom = await domToCanvas(cam, w, h, css);
    octx.drawImage(dom, 0, 0);
  } else {
    // No canvas bg window: the live frame's background comes from the .hs-stage CSS (the theme --bg
    // fallback). Rasterising `root` ALONE yields a TRANSPARENT snapshot, which the seam's WebGL then
    // composites as BLACK. A black flash on every seam of a white-first scene (docs/MISTAKES.md #138).
    // Fill the theme base bg first so the snapshot matches what the viewer actually sees.
    const stage = (root.closest && root.closest('.hs-stage')) || document.body;
    const cs = getComputedStyle(stage);
    let bg = (cs.getPropertyValue('--bg') || '').trim();
    if (!bg || bg === 'transparent') { const bc = cs.backgroundColor; bg = (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') ? bc : '#ffffff'; }
    octx.fillStyle = bg;
    octx.fillRect(0, 0, w, h);
    const dom = await domToCanvas(root, w, h, css);
    octx.drawImage(dom, 0, 0);
  }
  return out;
}

// isBlankRaster moved to core/raster.js with the serialiser it grades; re-exported so the seam
// compositor's callers keep importing it from here.
export { isBlankRaster } from '../resample/raster.js';


// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a seam fx" when someone writes it somewhere else. core/registry.js.
export const SEAM_REGISTRY = defineRegistry('seam fx', Object.fromEntries(SEAM_FX.map((n) => [n, n])), { slot: 'seam', blurbs: SEAM_BLURBS,
  catalog: {
    title: 'Seams (2-scene blends)',
    tag: 'transition',
    intro: '`seams:[{t,fx,dur}]`. One earned expressive transition, reserved for the payoff.',
    usage: (n, { j }) => j({ seams: [{ t: 2.2, fx: n, dur: 0.8 }] }),
    preview: (n, { base, TWO }) => base({ layers: TWO(2.6), seams: [{ t: 2.2, fx: n, dur: 0.8 }] }),
  },
});
