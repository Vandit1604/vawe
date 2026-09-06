// core/resample-fx.js: LAYER AS TEXTURE. A layer whose content is already a raster (an <img>, or the
// canvas a `paint`/`shader` layer draws into) is bound as a GL texture and re-sampled through a
// fragment shader. That is the one thing the sting/ambient shaders cannot do: they are fullscreen
// veils generated from uniforms, with no access to any pixels (core/shaders-ambient.js:13).
//
// Why this is the whole feature and not a pile of separate ones: radial blur, spin blur, fisheye,
// bit-crush, macroblocking, dissolve and glass refraction are all "read neighbouring pixels of an
// existing image". None of them can be expressed procedurally, and all of them are three lines once
// you can sample. See docs/ROADMAP.md. This cluster was blocked on exactly this.
//
// THE DETERMINISM CONTRACT (same as core/paint-fx.js):
//   · the shader is a pure function of (uv, u_amt, u_time, u_seed) and the source texture;
//   · the source is itself pure in local time. A static <img>, or a canvas whose own frame() drew it
//     from lt before we sample it. There is NO feedback: we never sample our own previous output.
//   · so renderFrame(n) is byte-identical regardless of which frames ran before it, on any worker.
// Sampling the COMPOSITED frame would break that (it is one frame behind, and Go-side); that is
// frame feedback and is deliberately not built.
//
// Everything is treated as PREMULTIPLIED alpha end to end: the source canvases are created with
// premultipliedAlpha:true, so their texels already are. Blur is a weighted average, which is only
// correct in premultiplied space anyway; alpha-modulating effects scale the whole vec4.

import { defineRegistry } from '../registry.js';

export const RESAMPLE_FX = ['zoomBlur', 'spinBlur', 'fisheye', 'bitCrush', 'macroblock', 'dissolve', 'refract', 'chromaShift'];

// RESAMPLE_BLURBS: one line per fx, next to the list the shader switches on (the `blurb` pattern of
// blocks/catalog.mjs). Consumed by the generated docs table and by any catalog/MCP surface; a key with
// no fx, or an fx with no key, is a bug the effects catalog reports.
// THE STANDING CAUTION, true of every entry: each resampled layer takes its own GL context (see
// createResampler below), so this is a HERO-SHOT effect. One per film, not decoration on fifty layers.
// The source may now be a BUILT layer and not only a raster one, core/resample.js bakes a text, rect,
// group or component subtree into a texture at boot, which makes over-reaching cheaper to write than
// it used to be. Ten resampled layers is ten contexts; the cap is around sixteen and core/boot.js
// refuses the frame that crosses it.
// And a constant `amount` is usually the wrong call: half of these only read as motion while they MOVE,
// so ramp them across the layer's window.
export const RESAMPLE_BLURBS = {
  zoomBlur: 'radial smear out from the centre, near samples kept crisp. An impact moment; ramp `amount:[0.6, 0]` so the frame rushes in and snaps sharp',
  spinBlur: 'smear along the arc with the radius preserved, so the pivot itself stays sharp, a rotating badge or seal',
  fisheye: 'real lens distortion: barrel above the middle of the dial, pincushion below, `0.5` the identity. Outside the source reads empty, never a stretched edge',
  bitCrush: 'quantise the palette down until it bands, each 0.25 of `amount` halving the bit depth, a degrade beat, never decoration',
  macroblock: 'the flat blocks and dropped tiles of a starved codec. A glitch/degrade beat, never decoration',
  dissolve: 'noise-thresholded erosion lit by an ember front. The way OUT of an image; ramp `amount:[0.05, 0.95]` to burn it away',
  refract: 'liquid glass: the image BENDS along a noise gradient with per-channel dispersion and a specular glint, what a blur cannot do',
  chromaShift: 'radial RGB separation, the channels pulling apart from the centre outwards',
};

// The registry, and with it the catalogue section that used to be hand-listed in
// scripts/site/effects-catalog.mjs beside this identical list, with its usage snippet and its
// no-preview reason keyed by a slug of the heading in scripts/site/effects-json.mjs.
//
// It also gives the family ONE refusal. `createResampler().draw` below and `attachResample` in
// core/resample.js were the same sentence written twice over the same eight names, so an unknown fx
// was rejected in two voices depending on which path reached it first, and neither could say that the
// name is really a paint fx or an ambient shader. RESAMPLE_FX stays the array it was: its ORDER is the
// `u_fx` index the fragment shader switches on, so it is a wire format, not just a name list.
export const RESAMPLE_REGISTRY = defineRegistry('resample fx', Object.fromEntries(RESAMPLE_FX.map((n) => [n, n])),
  { slot: 'resample.fx', blurbs: RESAMPLE_BLURBS,
    catalog: {
      title: 'Layer-as-texture (resample)',
      tag: 'per-frame',
      intro: '`"resample":{ "fx":"<name>", "amount":[from,to] }`. Bind a LAYER as a GL texture and re-sample it through a fragment shader. This is the family that needs to SEE pixels: real lens distortion, radial and spin blur.\n\nIt works on ANY layer. One that already owns a raster (`image` · `paint` · `shader`) is sampled LIVE, every frame, so the source keeps moving under the pass. Every other type, `text`, `rect`, `group`, `svg`, `component`, `html`, a whole composed beat. Is BAKED once at boot: the built subtree is serialised into an offscreen raster and sampled as a still. The motion then comes from the pass (the `amount` ramp, the noise clock), not from the source, so a `count` that ticks or a `type` that types is frozen at the state the build left it in. `raymarch`, `three`, `globe` and `video` are refused by name: their pixels live in a canvas or a video bitmap, which is not part of the DOM, so neither path can read them.\n\nEach resampled layer takes its own WebGL context and browsers cap those at roughly 16. This is a hero-shot effect: one or two per film, never decoration on fifty layers.',
      usage: (n, { j }) => j({ type: 'image', src: 'assets/shot.png', x: 160, y: 140, w: 1600, resample: { fx: n, amount: [0, 1] } }),
      noPreview: 'resampling reads the pixels of a layer that is already a raster, so it needs a real image to sample.',
    },
  });

const VERT = 'attribute vec2 a; varying vec2 v; void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.0,1.0); }';

const FRAG = `precision highp float;
varying vec2 v;
uniform sampler2D u_tex;
uniform vec2  u_res;
uniform int   u_fx;
uniform float u_amt;    // 0..1, the effect's strength: the only dial most effects need
uniform float u_time;   // local seconds, for the effects that move
uniform float u_seed;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed) * 43758.5453123); }

// value noise: smooth enough to differentiate for a refraction normal
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

void main(){
  vec2 uv = v;
  float ar = u_res.x / max(u_res.y, 1.0);
  vec4 col;

  if (u_fx == 0) {                                      // zoomBlur, smear along the radius from centre
    vec2 dir = (uv - 0.5) * (u_amt * 0.30);
    col = vec4(0.0); float wsum = 0.0;
    for (int i = 0; i < 16; i++) {
      float t = float(i) / 15.0;
      float w = 1.0 - t * 0.55;                         // near samples dominate, so the centre stays readable
      col += texture2D(u_tex, uv - dir * t) * w; wsum += w;
    }
    col /= wsum;

  } else if (u_fx == 1) {                               // spinBlur, smear along the arc, radius preserved
    vec2 d = uv - 0.5; d.x *= ar;
    float r = length(d), a0 = atan(d.y, d.x);
    float sweep = u_amt * 0.45 * min(1.0, r * 3.0);     // scaled by r: the pivot itself must not smear
    col = vec4(0.0); float wsum = 0.0;
    for (int i = 0; i < 16; i++) {
      float t = float(i) / 15.0 - 0.5;
      float a = a0 + sweep * t;
      vec2 p = vec2(cos(a), sin(a)) * r; p.x /= ar;
      float w = 1.0 - abs(t) * 0.8;
      col += texture2D(u_tex, p + 0.5) * w; wsum += w;
    }
    col /= wsum;

  } else if (u_fx == 2) {                               // fisheye, barrel (amt>0.5) or pincushion (amt<0.5)
    vec2 d = uv - 0.5; d.x *= ar;
    float r = length(d) * 2.0;
    float k = (u_amt - 0.5) * 2.0;                      // centred dial: 0.5 is the identity transform
    // MINUS, not plus. Sampling FURTHER out at the edges shrinks the image inward (pincushion), which
    // is the opposite of what "barrel" above the midpoint promises. Pulling the sample inward is what
    // makes the centre bulge. The sign was wrong and the comment described the intent, not the code.
    vec2 p = d * (1.0 - k * r * r * 0.6); p.x /= ar;
    p += 0.5;
    // outside the source is empty, not clamped: a stretched edge pixel reads as a smear artefact
    col = (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) ? vec4(0.0) : texture2D(u_tex, p);

  } else if (u_fx == 3) {                               // bitCrush, quantise the palette, 8-bit downgrade
    col = texture2D(u_tex, uv);
    // Bit DEPTH, not level count: colour banding is perceived geometrically, so a linear 32→3 ramp
    // spends most of the dial in a range where nothing visibly changes. Each 0.25 of amt now halves
    // the depth (32 · 16 · 8 · 4 · 2 levels), which makes the dial read evenly end to end.
    float levels = pow(2.0, mix(5.0, 1.0, clamp(u_amt, 0.0, 1.0)));
    // quantise UNpremultiplied, or transparent pixels quantise toward black and fringe
    float a = max(col.a, 0.001);
    vec3 straight = col.rgb / a;
    straight = floor(straight * levels + 0.5) / levels;
    col = vec4(straight * col.a, col.a);

  } else if (u_fx == 4) {                               // macroblock, the block artefact of a starved codec
    float blocks = mix(160.0, 12.0, clamp(u_amt, 0.0, 1.0));
    vec2 g = vec2(blocks, blocks / ar);
    vec2 cell = floor(uv * g) / g + 0.5 / g;            // sample the block CENTRE, so blocks read flat
    col = texture2D(u_tex, cell);
    // a codec drops chroma detail before luma, and drops whole blocks under stress
    float drop = step(0.985 - u_amt * 0.06, hash(floor(uv * g)));
    col = mix(col, texture2D(u_tex, cell + vec2(0.03, 0.0)) * vec4(1.1, 0.95, 1.05, 1.0), drop * 0.7);

  } else if (u_fx == 5) {                               // dissolve, noise-thresholded erosion, edge-lit
    col = texture2D(u_tex, uv);
    float n = vnoise(uv * vec2(48.0 * ar, 48.0) ) * 0.65 + vnoise(uv * vec2(11.0 * ar, 11.0)) * 0.35;
    float edge = smoothstep(u_amt - 0.10, u_amt + 0.02, n);
    col *= edge;
    col.rgb += vec3(1.0, 0.72, 0.34) * (1.0 - edge) * step(0.001, edge) * 1.4;  // ember at the burn front

  } else if (u_fx == 6) {                               // refract, liquid glass: bend by a noise gradient
    float sc = 6.0;
    vec2 q = uv * vec2(sc * ar, sc) + vec2(u_time * 0.10, u_time * 0.07);
    float e = 0.004;
    // finite-difference the noise field to get a surface normal, then offset along it. This is what
    // backdrop-filter:blur cannot do: blur softens, glass BENDS, and bending needs neighbour reads.
    // Divide by 2e or this is a DIFFERENCE, not a derivative: with e=0.004 the raw difference is
    // ~0.01, so the offset landed below one pixel and refract rendered as an identity transform.
    // The effect was "working" in the sense that every line ran; it just did nothing visible.
    vec2 grad = vec2(vnoise(q + vec2(e, 0.0)) - vnoise(q - vec2(e, 0.0)),
                     vnoise(q + vec2(0.0, e)) - vnoise(q - vec2(0.0, e))) / (2.0 * e);
    vec2 off = grad * u_amt * 0.030;
    // per-channel offset scale = dispersion, the thing that makes glass read as glass
    col.r = texture2D(u_tex, uv + off * 1.06).r;
    col.g = texture2D(u_tex, uv + off).g;
    col.b = texture2D(u_tex, uv + off * 0.94).b;
    col.a = texture2D(u_tex, uv + off).a;
    col.rgb += clamp(length(grad) * 0.06, 0.0, 1.0) * u_amt * 0.5 * col.a;      // specular glint along the ridges

  } else {                                              // chromaShift, radial RGB separation
    vec2 d = uv - 0.5;
    float s = u_amt * 0.035;
    col.r = texture2D(u_tex, uv + d * s).r;
    col.g = texture2D(u_tex, uv).g;
    col.b = texture2D(u_tex, uv - d * s).b;
    col.a = texture2D(u_tex, uv).a;
  }

  gl_FragColor = col;
}`;

// One GL context per resampled layer. Costly enough that it is worth saying out loud: do not put a
// resample on fifty layers. It is a hero-shot effect.
export function createResampler(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = glContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }, 'resample pass');

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('resample shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    tex: gl.getUniformLocation(prog, 'u_tex'), res: gl.getUniformLocation(prog, 'u_res'),
    fx: gl.getUniformLocation(prog, 'u_fx'), amt: gl.getUniformLocation(prog, 'u_amt'),
    time: gl.getUniformLocation(prog, 'u_time'), seed: gl.getUniformLocation(prog, 'u_seed'),
  };

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // CLAMP + LINEAR, and no mipmaps: the source is not guaranteed power-of-two.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);         // DOM origin is top-left, GL's is bottom-left

  gl.viewport(0, 0, w, h);
  gl.uniform2f(U.res, w, h);
  gl.uniform1i(U.tex, 0);
  gl.disable(gl.BLEND);                                  // we WRITE the composite, we do not blend into it

  let uploaded = false;

  return {
    canvas,
    // src: an HTMLImageElement or HTMLCanvasElement. `once` skips re-upload for static sources.
    // A still image is the same texels on every frame and re-uploading it 900 times is pure waste.
    draw(src, fx, amount = 0.5, time = 0, seed = 0, once = false) {
      const idx = RESAMPLE_FX.indexOf(fx);
      if (idx < 0) RESAMPLE_REGISTRY.pick(fx);   // throws, naming this vocabulary and any other the word lives in
      // An <img>'s .width is its LAYOUT width (set by our own CSS), not proof that pixels decoded.
      // A 404'd image reports width 1400 and naturalWidth 0. Uploading it leaves the texture
      // INCOMPLETE, and an incomplete texture samples as opaque black, so the layer renders as a
      // black rectangle with no error. Ask the source what it actually decoded.
      const sw = src.naturalWidth ?? src.width, shh = src.naturalHeight ?? src.height;
      if (!sw || !shh) throw new Error(`resample source has no pixels (${src.tagName === 'IMG' ? 'image failed to load: ' + src.src : 'empty canvas'}). A black rectangle is not an acceptable render`);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (!once || !uploaded) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        uploaded = true;
      }
      gl.uniform1i(U.fx, idx);
      gl.uniform1f(U.amt, amount);
      gl.uniform1f(U.time, time);
      gl.uniform1f(U.seed, seed);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // off-window must wipe, or the buffer holds whichever frame a worker drew last rather than a
    // function of t. Same reason as core/layers/paint.js and core/layers/shader.js.
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}

import { glContext } from '../webgl.js';