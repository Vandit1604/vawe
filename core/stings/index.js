import { glContext } from '../engine/webgl.js';
import { defineRegistry } from '../registry/registry.js';
import * as flash from './units/flash.js';
import * as burn from './units/burn.js';
import * as leak from './units/leak.js';
import * as grain from './units/grain.js';
import * as dissolve from './units/dissolve.js';
import * as ink from './units/ink.js';
import * as glitch from './units/glitch.js';
import * as streak from './units/streak.js';
import * as pixel from './units/pixel.js';
import * as confetti from './units/confetti.js';
import * as ripple from './units/ripple.js';
import * as scan from './units/scan.js';
import * as warp from './units/warp.js';
import * as bokeh from './units/bokeh.js';
import * as wipe from './units/wipe.js';
import * as circle from './units/circle.js';
import * as blinds from './units/blinds.js';
import * as squares from './units/squares.js';
import * as pinwheel from './units/pinwheel.js';
import * as doors from './units/doors.js';
import * as polka from './units/polka.js';
import * as swirl from './units/swirl.js';
import * as crossWarp from './units/crossWarp.js';
import * as domainWarp from './units/domainWarp.js';
import * as sdfIris from './units/sdfIris.js';
import * as vortex from './units/vortex.js';
import * as ridgedBurn from './units/ridgedBurn.js';
import * as lens from './units/lens.js';
import * as thermal from './units/thermal.js';
import * as whipPan from './units/whipPan.js';
import * as chromaticSplit from './units/chromaticSplit.js';
import * as dispersion from './units/dispersion.js';
import * as gridPixelateWipe from './units/gridPixelateWipe.js';
import * as iridescence from './units/iridescence.js';
import * as cinematicZoom from './units/cinematicZoom.js';
// core/stings/index.js: the generative shader-overlay registry, one fullscreen quad, one compiled
// program, and draw(effect, progress, seed) that depends ONLY on its arguments (see core/seams.js for
// the bake-then-pure model this shares). Adding a sting = adding a file under units/<name>.js exporting
// { glsl, blurb } and one import line here; nothing else in the engine changes.
//
// Each unit's `glsl` is the exact GLSL block that used to sit inside one `else if (u_fx == N)` branch
// of the old core/stings.js monolith, moved verbatim (a move, not a rewrite of the shader maths). This
// file's only job is to stitch them back into ONE fragment shader, in the SAME order, so u_fx keeps
// meaning what it always meant and the rendered pixels do not move.
const UNITS = {
  flash,
  burn,
  leak,
  grain,
  dissolve,
  ink,
  glitch,
  streak,
  pixel,
  confetti,
  ripple,
  scan,
  warp,
  bokeh,
  wipe,
  circle,
  blinds,
  squares,
  pinwheel,
  doors,
  polka,
  swirl,
  crossWarp,
  domainWarp,
  sdfIris,
  vortex,
  ridgedBurn,
  lens,
  thermal,
  whipPan,
  chromaticSplit,
  dispersion,
  gridPixelateWipe,
  iridescence,
  cinematicZoom,
};

// The array POSITION used to BE the shader branch number (`indexOf` fed u_fx), so inserting or
// reordering a name silently rendered every later effect as a different shader, deterministically,
// with no crash. The id is now the insertion order of UNITS above (i.e. of the import lines); ordering
// is cosmetic, but never reorder those imports without knowing that.
export const SHADER_ID = Object.fromEntries(Object.keys(UNITS).map((n, i) => [n, i]));
export const SHADER_FX = Object.keys(SHADER_ID);

// One line per fx, pulled straight off its unit. core/registry.js refuses to boot without one.
const STING_BLURBS = Object.fromEntries(SHADER_FX.map((n) => [n, UNITS[n].blurb]));

// The fragment shader is assembled ONCE, at module load, from the units above: same preamble/tail as
// the old monolith (a plain string, unchanged), same branch order, same u_fx numbering. Concatenation,
// not authoring: this file never edits a unit's GLSL, only where it sits in the chain.
const FRAG = "\nprecision highp float;\nuniform vec2 u_res; uniform float u_p; uniform float u_seed; uniform int u_fx;\nuniform vec3 u_tint; uniform float u_tintAmt; uniform float u_intensity;  /* optional recolour + strength */\nuniform vec3 u_pal[4]; uniform int u_palN;                                /* author-chosen palette (leak) */\nvec3 palAt(int k){ if(k<=0) return u_pal[0]; if(k==1) return u_pal[1]; if(k==2) return u_pal[2]; return u_pal[3]; }\nfloat hash(vec2 p){ p = fract(p*vec2(123.34, 456.21) + u_seed); p += dot(p, p+45.32); return fract(p.x*p.y); }\nfloat vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);\n  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }\nfloat fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }\nvoid main(){\n  vec2 uv = gl_FragCoord.xy/u_res;\n  float pp = clamp(u_p, 0.0, 1.0);\n  float bell = sin(3.14159*pp);                       /* 0 -> 1 -> 0 across the cut */\n  vec4 c = vec4(0.0);\n" + SHADER_FX.map((name, i) =>
  `  ${i === 0 ? 'if' : '} else if'} (u_fx == ${i}) {` + UNITS[name].glsl + '\n'
).join('') + "  // optional tint: recolour by luminance → u_tint (amt 0 = untouched); u_intensity scales strength\n  if (u_tintAmt > 0.0) {\n    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));\n    c.rgb = mix(c.rgb, u_tint * clamp(lum * 1.8, 0.0, 1.0), u_tintAmt);\n  }\n  c.a *= u_intensity;\n  gl_FragColor = vec4(c.rgb*c.a, c.a);                 /* premultiplied */\n}";

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

export function createShaderOverlay(parent, w = 1920, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.setAttribute('data-motion', 'loop'); // overlay chrome. Exempt from motion-audit reveal rules
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: 70, pointerEvents: 'none' });
  parent.appendChild(canvas);
  const gl = glContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }, 'sting', { soft: true });
  if (!gl) return { canvas, draw: () => {}, clear: () => {} }; // headless without GL: overlay is optional garnish
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = { res: gl.getUniformLocation(prog, 'u_res'), p: gl.getUniformLocation(prog, 'u_p'),
    seed: gl.getUniformLocation(prog, 'u_seed'), fx: gl.getUniformLocation(prog, 'u_fx'),
    tint: gl.getUniformLocation(prog, 'u_tint'), tintAmt: gl.getUniformLocation(prog, 'u_tintAmt'), intensity: gl.getUniformLocation(prog, 'u_intensity'),
    pal: gl.getUniformLocation(prog, 'u_pal'), palN: gl.getUniformLocation(prog, 'u_palN') };
  gl.viewport(0, 0, w, h);
  gl.uniform2f(U.res, w, h);
  let last = ''; // dedup identical draws (same args → same pixels; skip the GL work)
  return {
    canvas,
    // tint: [r,g,b] 0..1 mono recolour (null = native). intensity scales strength. palette: up to 4
    // [r,g,b] the leak is built from (the seed only arranges them), art-directable multicolour leaks.
    draw(effect, progress, seed = 0, tint = null, intensity = 1, palette = null) {
      const idx = SHADER_ID[effect];
      if (idx == null) throw new Error(`unknown sting fx "${effect}", one of: ${SHADER_FX.join(', ')}`);
      const pal = palette && palette.length ? palette.slice(0, 4) : null;
      const key = idx + ':' + progress.toFixed(4) + ':' + seed + ':' + (tint ? tint.join(',') : '') + ':' + intensity + ':' + (pal ? pal.flat().join(',') : '');
      if (key === last) return; last = key;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.p, progress); gl.uniform1f(U.seed, seed); gl.uniform1i(U.fx, idx);
      gl.uniform3f(U.tint, tint ? tint[0] : 1, tint ? tint[1] : 1, tint ? tint[2] : 1);
      gl.uniform1f(U.tintAmt, tint ? 1 : 0); gl.uniform1f(U.intensity, intensity);
      const flat = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (pal) pal.forEach((c, i) => { flat[i * 3] = c[0]; flat[i * 3 + 1] = c[1]; flat[i * 3 + 2] = c[2]; });
      gl.uniform3fv(U.pal, flat); gl.uniform1i(U.palN, pal ? pal.length : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    clear() { if (last === '') return; last = ''; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
  };
}

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a sting fx" when someone writes it somewhere else. core/registry.js.
// EVERY ONE OF THESE ALREADY EXISTED AS A COMMENT INSIDE THE FRAGMENT SHADER, describing exactly what
// the branch draws, and not one of them reached anywhere an author could search. `make arsenal Q="a film
// burn between two shots"` answered NOTHING HERE CLEARLY MATCHES while `burn` sat in this file with
// `/* film burn */` written beside it. A description that only the implementer reads is not documentation.
// AND ONE RULE LEARNED WHILE WRITING THESE. Keep generic transition wording OUT of a blurb. The first
// draft said whipPan raced "between two shots", so `Q="a film burn between two shots"` returned whipPan
// above `burn`: the search is honest token overlap with no notion of a common word, and three generic
// tokens beat two specific ones. A blurb earns its entry by the words only that entry deserves.

export const SHADER_REGISTRY = defineRegistry('sting fx', Object.fromEntries(SHADER_FX.map((n) => [n, n])), { slot: 'sting', blurbs: STING_BLURBS,
  catalog: {
    title: 'Shader stings',
    tag: 'transition',
    intro: '`stings:[{t,fx}]`. A full-frame shader accent on a reveal / background jump.',
    register: 'sting',
    usage: (n, { j }) => j({ stings: [{ t: 2.4, fx: n }] }),
    preview: (n, { base, TWO }) => base({ layers: TWO(2.4), stings: [{ t: 2.4, fx: n }] }),
  },
});
