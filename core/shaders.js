// shaders.js — procedural WebGL boundary effects (the "shader transition" layer another engine ships
// as GLSL blocks and another engine as shader presentations), adapted to the pure model: one fullscreen
// quad, one compiled program, and draw(effect, progress, seed) that depends ONLY on its arguments.
// No wall clock, no accumulating state — same (effect, progress, seed) → same pixels, any order.
//
//   const fx = createShaderOverlay(stageEl);        // once, at build
//   fx.draw('burn', p, seed);                       // every frame while a cut is active (p 0→1)
//   fx.clear();                                     // every frame otherwise
//
// Effects: flash (white pop), burn (film-burn ember front), leak (warm light leak),
// grain (noise burst), dissolve (fbm dissolve to white), ink (fbm bleed to near-black),
// glitch (RGB slice bars), streak (radial zoom-blur rays), pixel (mosaic flicker).
export const SHADER_FX = ['flash', 'burn', 'leak', 'grain', 'dissolve', 'ink', 'glitch', 'streak', 'pixel'];

const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_p; uniform float u_seed; uniform int u_fx;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21) + u_seed); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy/u_res;
  float pp = clamp(u_p, 0.0, 1.0);
  float bell = sin(3.14159*pp);                       /* 0 -> 1 -> 0 across the cut */
  vec4 c = vec4(0.0);
  if (u_fx == 0) {                                     /* flash */
    float v = 1.0 - 0.55*length(uv-0.5);
    c = vec4(vec3(1.0), bell*bell*v);
  } else if (u_fx == 1) {                              /* film burn */
    float n = fbm(uv*3.0 + u_seed);
    float front = 1.25*pp - 0.12;
    float d = n - front;
    float burned = smoothstep(0.05, -0.02, d);
    float rim = smoothstep(0.10, 0.0, abs(d));
    vec3 ember = vec3(1.0, 0.42, 0.08);
    vec3 col = mix(vec3(0.03, 0.012, 0.004), ember, rim);
    float a = max(burned*bell, rim*bell*0.95);
    c = vec4(col, a);
  } else if (u_fx == 2) {                              /* light leak */
    vec2 p1 = vec2(0.82 + 0.12*vnoise(vec2(u_seed, 1.7)), 0.18);
    float l1 = smoothstep(0.75, 0.0, length(uv-p1));
    float l2 = smoothstep(0.95, 0.0, length(uv-vec2(0.08, 0.92)));
    vec3 warm = vec3(1.0, 0.55, 0.25)*l1 + vec3(1.0, 0.8, 0.5)*l2*0.7;
    c = vec4(warm, bell*0.7*max(l1, l2*0.8));
  } else if (u_fx == 3) {                              /* grain burst */
    float g = hash(floor(uv*u_res*0.5) + floor(pp*24.0));
    c = vec4(vec3(g), bell*0.45*g);
  } else if (u_fx == 4) {                              /* dissolve to white */
    float n = fbm(uv*6.0 + u_seed);
    float a = smoothstep(n-0.18, n+0.18, bell*1.15);
    c = vec4(vec3(1.0), a*0.95);
  } else if (u_fx == 5) {                              /* ink bleed to near-black */
    float n = fbm(uv*5.0 + u_seed + 3.7);
    float a = smoothstep(n-0.14, n+0.14, bell*1.2);
    float rim = smoothstep(0.12, 0.0, abs(n - bell*1.2));
    c = vec4(mix(vec3(0.02, 0.015, 0.012), vec3(0.24, 0.1, 0.04), rim), a*0.96);
  } else if (u_fx == 6) {                              /* glitch slice bars */
    float row = floor(uv.y*36.0);
    float stp = floor(pp*14.0);
    float r1 = hash(vec2(row, stp));
    float on = step(0.78, r1);
    vec3 col = vec3(hash(vec2(row+7.0, stp)), hash(vec2(row+13.0, stp)), hash(vec2(row+29.0, stp)));
    float edge = step(0.965, hash(vec2(floor(uv.x*90.0), row+stp)));
    c = vec4(mix(col, vec3(1.0), edge), max(on*0.55, edge*0.8)*bell);
  } else if (u_fx == 7) {                              /* radial zoom streaks */
    vec2 d = uv - 0.5;
    float ang = atan(d.y, d.x);
    float r = length(d);
    float ray = 0.0;                                   /* 4-tap angular blur = deterministic motion smear */
    for (int i = 0; i < 4; i++) {
      float aa = ang + float(i)*0.012*bell;
      ray += pow(vnoise(vec2(aa*7.0 + u_seed, floor(pp*3.0))), 3.0);
    }
    c = vec4(vec3(1.0), (ray/4.0) * bell * smoothstep(0.1, 0.75, r) * 0.9);
  } else if (u_fx == 8) {                              /* mosaic flicker */
    float stp = floor(pp*12.0);
    float px = mix(12.0, 72.0, hash(vec2(stp, u_seed)));
    float g = hash(floor(uv*px) + stp);
    c = vec4(vec3(g), bell*0.4*step(0.55, g));
  }
  gl_FragColor = vec4(c.rgb*c.a, c.a);                 /* premultiplied */
}`;

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

export function createShaderOverlay(parent, w = 1920, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.setAttribute('data-motion', 'loop'); // overlay chrome — exempt from motion-audit reveal rules
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: 70, pointerEvents: 'none' });
  parent.appendChild(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
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
    seed: gl.getUniformLocation(prog, 'u_seed'), fx: gl.getUniformLocation(prog, 'u_fx') };
  gl.viewport(0, 0, w, h);
  gl.uniform2f(U.res, w, h);
  let last = ''; // dedup identical draws (same args → same pixels; skip the GL work)
  return {
    canvas,
    draw(effect, progress, seed = 0) {
      const idx = SHADER_FX.indexOf(effect);
      if (idx < 0) return this.clear();
      const key = idx + ':' + progress.toFixed(4) + ':' + seed;
      if (key === last) return; last = key;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.p, progress); gl.uniform1f(U.seed, seed); gl.uniform1i(U.fx, idx);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    clear() { if (last === '') return; last = ''; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
  };
}
