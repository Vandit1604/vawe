import { glContext } from './webgl.js';
import { buildInlinedCss, domToCanvas } from './raster.js';
import { DIRS } from './cuts.js';
import { defineRegistry } from './registry.js';
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

// The curated two-scene fx set (adapted from the MIT gl-transitions catalog into this two-sampler
// model). `fade` is always available and is the fallback everything degrades to.
// Basics first (fade + the directional set every tool has), then the expressive shaders. Appended so
// existing indices never shift. The directional five (slide/push/uncover/wipe + the grainy dissolve)
// are the "cover the basics" set, real two-scene transitions, dir-aware via u_dir (left/right/up/down).
export const SEAM_FX = ['fade', 'dissolve', 'slide', 'push', 'uncover', 'wipe', 'crossWarp', 'whipPan', 'sdfIris', 'dispersion', 'lens', 'flashWhite', 'cinematicZoom', 'portal'];

// SEAM_BLURBS: one line per fx, next to the thing it describes (the `blurb` pattern of
// blocks/catalog.mjs). Consumed by the generated docs table and any catalog/MCP surface; a name in
// SEAM_FX with no entry here is a bug the transitions catalog reports.
// Read every line knowing what only a seam can do: it samples BOTH beats as textures, so it can carry
// the leaving beat INTO the arriving one. A cut transforms one root; a sting paints over one beat.
// `dir` (left/right/up/down) steers the directional five; `seed` varies noise and shape; `intensity`
// scales strength. Browser file, plain data only, no node APIs.
export const SEAM_BLURBS = {
  fade: 'flat cross-dissolve of both beats. The universal fallback every seam degrades to with no WebGL or a blank raster',
  dissolve: 'grainy film dissolve, each pixel flipping as a noise front passes it, time/place change',
  slide: 'the arriving beat slides in over a held outgoing one (cover), dir-aware, the basic every tool has',
  push: 'both beats shove together toward dir, the arriving one following the leaving one off screen, dir-aware basic',
  uncover: 'the leaving beat slides off toward dir and reveals a held arriving beat under it, dir-aware basic',
  wipe: 'a soft-edged line sweeps toward dir, the arriving beat revealed behind it, playful, "notice the cut"',
  crossWarp: 'both beats drag toward the centre and swap through a soft noise front. A wipe with grit, for organic brands and dark scenes',
  whipPan: 'momentum swipe between beats',
  sdfIris: 'the arriving beat revealed through an expanding seeded polygon iris (star, hex, diamond or triangle) with a bright rim. Playful reveal, the shape is the personality',
  dispersion: 'prism channel-split across the seam along a seeded axis, peaking mid-way, optical, techy pivots',
  lens: 'one moving optical centre bends BOTH beats through a single lens, with a warm flare. Premium product glamour, dark scenes',
  flashWhite: 'white flash on an energy pivot',
  cinematicZoom: 'dive-in zoom into a screen',
  portal: 'glowing portal reveal (once)',
};

const VERT = 'attribute vec2 a; varying vec2 v_uv; void main(){ v_uv = a*0.5+0.5; gl_Position = vec4(a, 0.0, 1.0); }';

// One program, both beats as samplers. getFrom/getTo flip Y (canvas rows are top-down, GL is
// bottom-up) and clamp so a warped/offset sample never wraps. Every branch returns an opaque colour;
// the beats are full frames, so the composite fully covers the live stage during the window.
const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_p;        /* 0..1 across the seam */
uniform float u_seed;
uniform vec2  u_dir;      /* travel direction for whipPan (unit-ish) */
uniform float u_intensity;
uniform vec2  u_res;
const float PI = 3.14159265;
vec4 getFrom(vec2 uv){ return texture2D(u_from, vec2(uv.x, 1.0 - uv.y)); }
vec4 getTo(vec2 uv){ return texture2D(u_to, vec2(uv.x, 1.0 - uv.y)); }
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21) + u_seed); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }

void main(){
  vec2 uv = v_uv;
  float p = clamp(u_p, 0.0, 1.0);
  vec2 aspect = vec2(u_res.x/u_res.y, 1.0);
  vec4 col;

  #define FX_FADE 0
  #define FX_DISSOLVE 1
  #define FX_SLIDE 2
  #define FX_PUSH 3
  #define FX_UNCOVER 4
  #define FX_WIPE 5
  #define FX_CROSSWARP 6
  #define FX_WHIPPAN 7
  #define FX_SDFIRIS 8
  #define FX_DISPERSION 9
  #define FX_LENS 10
  #define FX_FLASHWHITE 11
  #define FX_CINEZOOM 12
  #define FX_PORTAL 13

  int fx = FX_INDEX;

  /* travel axis helpers for the directional basics: u_dir is one of the 4 signs (left/right/up/down).
     ax = the uv coordinate along the travel axis; sg = its sign (-1 for left/up, +1 for right/down). */
  float ax = abs(u_dir.x) > 0.5 ? uv.x : uv.y;
  float sg = u_dir.x + u_dir.y;

  if (fx == FX_FADE) {
    col = mix(getFrom(uv), getTo(uv), p);

  } else if (fx == FX_DISSOLVE) {
    /* grainy film dissolve: each pixel flips from→to when p passes its noise threshold (a soft front),
       distinct from the flat opacity cross-fade of FX_FADE. */
    float n = fbm(uv * 6.0 + u_seed);
    float m = smoothstep(p - 0.14, p + 0.14, n);   /* 1 = still FROM, 0 = flipped to TO */
    col = mix(getTo(uv), getFrom(uv), m);

  } else if (fx == FX_SLIDE) {
    /* the arriving beat slides IN over a static outgoing (a.k.a. cover). Its panel is rigid, it shows
       its own content, entering from the u_dir edge. */
    vec2 tp = uv + (1.0 - p) * u_dir;
    float inr = step(0.0, tp.x) * step(tp.x, 1.0) * step(0.0, tp.y) * step(tp.y, 1.0);
    col = mix(getFrom(uv), getTo(tp), inr);

  } else if (fx == FX_PUSH) {
    /* both beats move together toward u_dir: outgoing exits that way, incoming follows in behind it
       (gl-transitions "directional"). fract() tiles the two frames edge-to-edge so it reads as one shove.
       uv - p*u_dir shifts screen content toward u_dir (a pixel at uv samples what was at uv - p*u_dir). */
    vec2 pp = uv - p * u_dir;
    vec2 f = fract(pp);
    float inr = step(0.0, pp.x) * step(pp.x, 1.0) * step(0.0, pp.y) * step(pp.y, 1.0);
    col = mix(getTo(f), getFrom(f), inr);   /* in range → the outgoing (shifted); outside → the incoming */

  } else if (fx == FX_UNCOVER) {
    /* the outgoing beat slides OFF toward u_dir, revealing a static incoming underneath. */
    vec2 fp = uv - p * u_dir;
    float inr = step(0.0, fp.x) * step(fp.x, 1.0) * step(0.0, fp.y) * step(fp.y, 1.0);
    col = mix(getTo(uv), getFrom(fp), inr);

  } else if (fx == FX_WIPE) {
    /* a hard (soft-edged) line sweeps toward u_dir; the incoming is revealed BEHIND the edge (on the
       side the edge travelled from), matching where slide/push/uncover put the arriving beat. */
    float edge = sg < 0.0 ? (1.0 - p) : p;
    float soft = 0.015;
    float m = sg < 0.0 ? smoothstep(edge - soft, edge + soft, ax)
                       : (1.0 - smoothstep(edge - soft, edge + soft, ax));
    col = mix(getFrom(uv), getTo(uv), m);

  } else if (fx == FX_CROSSWARP) {
    /* gl-transitions: crosswarp, both beats drag toward the centre and swap through a soft front */
    float x = smoothstep(0.0, 1.0, p*2.0 + uv.x - 1.0);
    col = mix(getFrom((uv - 0.5)*(1.0 - x) + 0.5), getTo((uv - 0.5)*x + 0.5), x);

  } else if (fx == FX_WHIPPAN) {
    /* directional smear of BOTH: from races out one way, to arrives from the other; a few taps along
       the travel axis give the motion-blur streak that reads as a whip. */
    vec2 d = normalize(u_dir + 1e-4) / aspect;
    float amt = 0.9 * u_intensity;
    vec3 acc = vec3(0.0); float wsum = 0.0;
    for (int i = 0; i < 6; i++) {
      float k = float(i)/5.0;
      float sm = (k - 0.5) * 0.06 * u_intensity;             /* smear spread */
      vec2 fuv = uv + d * (p*amt + sm);                      /* leaving beat slides out */
      vec2 tuv = uv + d * ((p - 1.0)*amt + sm);              /* arriving beat slides in */
      vec3 mixed = mix(getFrom(fuv).rgb, getTo(tuv).rgb, smoothstep(0.35, 0.65, p));
      float w = 1.0 - abs(k - 0.5);
      acc += mixed * w; wsum += w;
    }
    col = vec4(acc / wsum, 1.0);

  } else if (fx == FX_SDFIRIS) {
    /* masked reveal: the arriving beat is uncovered through an expanding seeded polygon iris */
    vec2 dd = (uv - 0.5) * aspect;
    float ang = atan(dd.y, dd.x);
    float k = floor(hash(vec2(u_seed, 11.0)) * 4.0);
    float n = k < 1.0 ? 5.0 : k < 2.0 ? 6.0 : k < 3.0 ? 4.0 : 3.0;   /* star / hex / diamond / triangle */
    float pinch = k < 1.0 ? 0.35 : 0.12;
    float rr = length(dd) * (1.0 + pinch * (0.5 + 0.5*cos(ang*n + u_seed)));
    float front = p * 0.95;
    float m = smoothstep(front + 0.03, front - 0.03, rr);           /* 1 inside the iris (shows the arriving beat) */
    float rim = smoothstep(0.04, 0.0, abs(rr - front));             /* bright edge on the wipe front */
    col = mix(getFrom(uv), getTo(uv), m);
    col.rgb += vec3(1.0) * rim * 0.35 * u_intensity;

  } else if (fx == FX_DISPERSION) {
    /* prism bend across the seam: the blend's channels split along a seeded axis, peaking mid-seam */
    float bell = sin(PI * p);
    vec2 dir = normalize(vec2(cos(u_seed*6.2831), sin(u_seed*6.2831)) + 1e-4) / aspect;
    float w = fbm(uv*4.0 + u_seed);
    float amt = (0.06 + 0.04*w) * bell * u_intensity;
    vec3 c;
    c.r = mix(getFrom(uv + dir*amt), getTo(uv + dir*amt), p).r;
    c.g = mix(getFrom(uv), getTo(uv), p).g;
    c.b = mix(getFrom(uv - dir*amt), getTo(uv - dir*amt), p).b;
    col = vec4(c, 1.0);

  } else if (fx == FX_LENS) {
    /* lens bend: a moving optical centre magnifies the frame; the crossfade rides the bend so both
       beats warp through one lens rather than dissolving flat. */
    float bell = sin(PI * p);
    vec2 c0 = vec2(0.5) + (vec2(hash(vec2(u_seed,1.0)), hash(vec2(u_seed,2.0))) - 0.5) * 0.4;
    vec2 dd = (uv - c0) * aspect;
    float r = length(dd);
    float bend = 1.0 - 0.35 * bell * u_intensity * exp(-r*r*4.0);   /* pull the centre in at mid-seam */
    vec2 buv = c0 + (uv - c0) * bend;
    float flare = smoothstep(0.25, 0.0, r) * bell * 0.4 * u_intensity;
    col = mix(getFrom(buv), getTo(buv), p);
    col.rgb += vec3(1.0, 0.95, 0.85) * flare;

  } else if (fx == FX_FLASHWHITE) {
    /* independent in/out windows: leaving beat blows to white, then white resolves to the arriving
       beat. The exposure blow-out hides the swap, a classic music-video hard cut. */
    if (p < 0.5) {
      float k = smoothstep(0.0, 1.0, p * 2.0);
      col = mix(getFrom(uv), vec4(1.0), k);
    } else {
      float k = smoothstep(0.0, 1.0, (p - 0.5) * 2.0);
      col = mix(vec4(1.0), getTo(uv), k);
    }

  } else if (fx == FX_CINEZOOM) {
    /* dolly: the leaving beat pushes IN (scales up) while the arriving beat settles FROM a punched-in
       frame back to 1.0; a crossfade rides the push so the camera appears to travel between beats. */
    float e = p*p*(3.0 - 2.0*p);
    vec2 dd = uv - 0.5;
    float sFrom = 1.0 + 0.25 * e * u_intensity;                     /* from zooms in */
    float sTo   = 1.0 + 0.25 * (1.0 - e) * u_intensity;             /* to arrives from zoomed-in */
    vec4 cf = getFrom(dd / sFrom + 0.5);
    vec4 ct = getTo(dd / sTo + 0.5);
    col = mix(cf, ct, e);

  } else if (fx == FX_PORTAL) {
    /* a glowing portal opens from the centre and swallows the frame: an expanding disc with an ORGANIC
       torn edge (angular fbm) reveals the arriving beat, content near the rim is sucked inward, and a
       chromatic energy ring burns brightest mid-seam. A shaped reveal like sdfIris, but with the warp +
       glow that reads as "stepping through" rather than a flat wipe. */
    vec2 dd = (uv - 0.5) * aspect;
    float r = length(dd);
    float ang = atan(dd.y, dd.x);
    float maxR = length(aspect) * 0.5 + 0.2;                 /* enough to clear the corners by p=1 */
    float edgeN = (fbm(vec2(ang * 3.0, u_seed * 7.0)) - 0.5) * 0.12 * u_intensity;   /* torn edge */
    float portalR = p * (maxR + 0.15) + edgeN;
    float ring = abs(r - portalR);
    float soft = 0.02 + 0.03 * (1.0 - p);
    /* radial suck: bend uvs toward the centre near the ring so the frame appears to pour in */
    float warp = 0.14 * u_intensity * exp(-ring * ring * 26.0);
    vec2 wuv = (dd - normalize(dd + 1e-4) * warp) / aspect + 0.5;
    float m = smoothstep(portalR + soft, portalR - soft, r);  /* 1 inside → the arriving beat */
    col = mix(getFrom(wuv), getTo(wuv), m);
    /* chromatic aberration across the rim: split the channels radially where the energy is */
    float rim = smoothstep(soft * 3.0, 0.0, ring);
    float ca = rim * 0.02 * u_intensity;
    vec2 rdir = normalize(dd + 1e-4) / aspect;
    col.r = mix(col.r, mix(getFrom(wuv + rdir * ca), getTo(wuv + rdir * ca), m).r, rim);
    col.b = mix(col.b, mix(getFrom(wuv - rdir * ca), getTo(wuv - rdir * ca), m).b, rim);
    /* glowing energy edge: a two-tone ring that pulses brightest mid-seam */
    vec3 glow = mix(vec3(0.35, 0.7, 1.0), vec3(1.0, 0.4, 0.9), 0.5 + 0.5 * sin(ang * 4.0 + u_seed * 6.2831));
    col.rgb += glow * rim * (0.5 + 0.9 * sin(PI * p)) * u_intensity;

  } else {
    col = mix(getFrom(uv), getTo(uv), p);
  }

  gl_FragColor = vec4(col.rgb, 1.0);
}`;

// compile FRAG once per fx index (WebGL1 has no non-constant sampler indexing games needed here, but
// the fx branch is a compile-time constant so the driver dead-strips the others → one tight program).
function buildProgram(gl, fxIndex) {
  const frag = FRAG.replace('FX_INDEX', String(fxIndex));
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('seam shader: ' + gl.getShaderInfoLog(s));
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

  let programs;
  try {
    programs = SEAM_FX.map((_, i) => buildProgram(gl, i));
  } catch (e) {
    // a driver that reports webgl but won't compile → degrade to the 2D cross-fade rather than crash
    return make2dFallback(canvas, w, h, gl);
  }
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
      const dir = DIR_VEC[okDir(opts.dir)];
      const key = idx + ':' + progress.toFixed(4) + ':' + seed + ':' + intensity + ':' + dir.join(',') + ':' + (from.__seamId || '') + ':' + (to.__seamId || '');
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
export { isBlankRaster } from './raster.js';


// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a seam fx" when someone writes it somewhere else. core/registry.js.
export const SEAM_REGISTRY = defineRegistry('seam fx', Object.fromEntries(SEAM_FX.map((n) => [n, n])), { slot: 'seam', blurbs: SEAM_BLURBS });
