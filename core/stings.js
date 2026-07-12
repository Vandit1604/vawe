// core/stings.js — procedural WebGL boundary effects (the "shader transition" layer another engine ships
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
// glitch (RGB slice bars), streak (radial zoom-blur rays), pixel (mosaic flicker),
// confetti, ripple, scan, warp, bokeh; and shape-wipes adapted from the MIT gl-transitions
// catalog (glslio/gl-transitions) into this overlay model: wipe, circle, blinds, squares,
// pinwheel, doors, polka, swirl. All generative (uv/progress/seed only) — palette+tint aware.
export const SHADER_FX = ['flash', 'burn', 'leak', 'grain', 'dissolve', 'ink', 'glitch', 'streak', 'pixel', 'confetti', 'ripple', 'scan', 'warp', 'bokeh', 'wipe', 'circle', 'blinds', 'squares', 'pinwheel', 'doors', 'polka', 'swirl'];

const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_p; uniform float u_seed; uniform int u_fx;
uniform vec3 u_tint; uniform float u_tintAmt; uniform float u_intensity;  /* optional recolour + strength */
uniform vec3 u_pal[4]; uniform int u_palN;                                /* author-chosen palette (leak) */
vec3 palAt(int k){ if(k<=0) return u_pal[0]; if(k==1) return u_pal[1]; if(k==2) return u_pal[2]; return u_pal[3]; }
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
  } else if (u_fx == 2) {                              /* light leak — seed-generative, multi-hue */
    vec3 col = vec3(0.0); float amax = 0.0;                              /* every seed = a different leak */
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 lp = vec2(0.12 + 0.76*hash(vec2(fi, u_seed)), 0.12 + 0.76*hash(vec2(fi+5.0, u_seed)));
      float rad = 0.32 + 0.5*hash(vec2(fi+9.0, u_seed));
      float l = smoothstep(rad, 0.0, length(uv - lp));
      vec3 hue;                                                          /* colours = your palette, else seed-generated */
      if (u_palN > 0) { hue = palAt(int(mod(fi, float(u_palN)))); }
      else { float h = hash(vec2(fi+13.0, u_seed)); hue = 0.5 + 0.5*cos(6.2831*(h + vec3(0.0, 0.33, 0.67))); }
      col += hue * l * (0.55 + 0.6*hash(vec2(fi+21.0, u_seed)));
      amax = max(amax, l);
    }
    float sd = hash(vec2(u_seed, 3.7)) - 0.5;                            /* a soft diagonal film streak */
    float streak = smoothstep(0.32, 0.0, abs(uv.x - uv.y - sd));
    vec3 sh;
    if (u_palN > 0) { sh = palAt(int(mod(hash(vec2(u_seed, 7.1))*4.0, float(u_palN)))); }
    else { sh = 0.5 + 0.5*cos(6.2831*(hash(vec2(u_seed, 7.1)) + vec3(0.0, 0.33, 0.67))); }
    col += sh * streak * 0.45; amax = max(amax, streak*0.55);
    c = vec4(min(col, vec3(1.5)), bell * 0.8 * clamp(amax, 0.0, 1.0));
  } else if (u_fx == 3) {                              /* film grain — dense fine specks */
    float g1 = hash(floor(uv*u_res*0.9) + floor(pp*40.0));
    float g2 = hash(floor(uv*u_res*0.9) + floor(pp*40.0) + 17.0);
    float sp = smoothstep(0.58, 1.0, g1) + 0.5*smoothstep(0.68, 1.0, g2);
    c = vec4(vec3(0.92), bell*0.55*sp);
  } else if (u_fx == 4) {                              /* dissolve to white */
    float n = fbm(uv*6.0 + u_seed);
    float a = smoothstep(n-0.18, n+0.18, bell*1.15);
    c = vec4(vec3(1.0), a*0.95);
  } else if (u_fx == 5) {                              /* ink bleed to near-black */
    float n = fbm(uv*5.0 + u_seed + 3.7);
    float a = smoothstep(n-0.14, n+0.14, bell*1.2);
    float rim = smoothstep(0.12, 0.0, abs(n - bell*1.2));
    c = vec4(mix(vec3(0.02, 0.015, 0.012), vec3(0.24, 0.1, 0.04), rim), a*0.96);
  } else if (u_fx == 6) {                              /* rgb glitch — channel-split displaced bars */
    float row = floor(uv.y*44.0);
    float stp = floor(pp*16.0);
    float on = step(0.66, hash(vec2(row, stp)));       /* which rows tear this step */
    float sh = (hash(vec2(row+9.0, stp)) - 0.5) * 0.16 * on;   /* per-row horizontal shift */
    float rc = step(0.45, hash(vec2(floor((uv.x+sh+0.014)*72.0), row+stp)));
    float gc = step(0.45, hash(vec2(floor((uv.x+sh)*72.0),        row+stp+3.0)));
    float bc = step(0.45, hash(vec2(floor((uv.x+sh-0.014)*72.0), row+stp+7.0)));
    vec3 col = vec3(rc, gc, bc);
    float a = on * max(rc, max(gc, bc)) * bell * 0.9;
    c = vec4(col, a);
  } else if (u_fx == 7) {                              /* light streaks — sharp radial rays + hot core */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float ang = atan(d.y, d.x);
    float r = length(d);
    float rays = pow(0.5 + 0.5*sin(ang*9.0 + u_seed*6.28), 6.0);       /* many fine rays */
    rays += pow(0.5 + 0.5*sin(ang*2.0 + 1.57), 26.0) * 1.4;            /* 2 dominant anamorphic streaks */
    float core = smoothstep(0.16, 0.0, r);                             /* bright hot centre */
    float fall = smoothstep(0.95, 0.04, r);                            /* reach the edges then fade */
    c = vec4(vec3(1.0), (rays*fall*0.5 + core*0.85) * bell);
  } else if (u_fx == 8) {                              /* pixelate — chunky mosaic fills then clears */
    float px = 30.0;
    vec2 cell = floor(uv * vec2(px*u_res.x/u_res.y, px));
    float cover = step(hash(cell), bell*1.15);                         /* more blocks as bell rises */
    float shade = mix(0.32, 1.0, hash(cell + 3.1));
    c = vec4(vec3(shade), cover * bell * 0.82);
  } else if (u_fx == 9) {                              /* confetti burst */
    for (int i = 0; i < 40; i++) {
      float fi = float(i);
      float ax = hash(vec2(fi, u_seed));
      float sp = 0.35 + 0.65*hash(vec2(fi+40.0, u_seed));
      float px = ax + (hash(vec2(fi+80.0, u_seed)) - 0.5) * 0.35 * pp;
      float py = 1.0 - pp*sp*1.4 + 0.35*pp*pp;         /* up then gravity */
      vec2 d = (uv - vec2(px, py)) * vec2(60.0, 90.0);
      float q = step(abs(d.x), 0.5) * step(abs(d.y), 0.9);
      vec3 col = 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67) + hash(vec2(fi+120.0, u_seed))));
      c.rgb = mix(c.rgb, col, q); c.a = max(c.a, q * (1.0 - pp*pp));
    }
  } else if (u_fx == 10) {                             /* ripple rings — expand across the whole frame */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float front = pp * 1.5;                            /* wavefront sweeps past the corners */
    float rings = sin((r - front) * 42.0);
    float behind = smoothstep(front, front - 0.55, r);  /* rings live behind the expanding front */
    float env = smoothstep(0.0, 0.12, pp) * smoothstep(1.0, 0.62, pp);
    c = vec4(vec3(1.0), max(0.0, rings) * behind * env * 0.5);
  } else if (u_fx == 11) {                             /* scanline sweep — CRT band + trailing glow + lines */
    float band = smoothstep(0.055, 0.0, abs(uv.y - pp));
    float trail = smoothstep(0.3, 0.0, pp - uv.y) * step(uv.y, pp);    /* glow trailing the band */
    float lines = (0.5 + 0.5*sin(uv.y * u_res.y * 0.5)) * 0.10;        /* CRT scanlines */
    c = vec4(vec3(1.0), (band*0.85 + trail*0.28 + lines*bell) * bell);
  } else if (u_fx == 12) {                             /* barrel warp — expanding refraction shock ring */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float edge = pp * 0.95;                            /* shock radius sweeps out past the corners */
    float ring = smoothstep(0.06, 0.0, abs(r - edge)); /* bright refraction front */
    float dark = smoothstep(0.16, 0.06, abs(r - edge)) * step(r, edge); /* compression darkens behind it */
    c = vec4(vec3(ring), (ring*0.8 + dark*0.35) * bell);
  } else if (u_fx == 13) {                             /* bokeh discs drift */
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 pcen = vec2(hash(vec2(fi, u_seed)), hash(vec2(fi+12.0, u_seed)));
      pcen.x += (pp - 0.5) * 0.25 * (0.5 + hash(vec2(fi+24.0, u_seed)));
      float rad = 0.03 + 0.06*hash(vec2(fi+36.0, u_seed));
      vec2 d = uv - pcen; d.x *= u_res.x/u_res.y;
      float disc = smoothstep(rad, rad*0.55, length(d));
      c.rgb = mix(c.rgb, vec3(1.0), disc*0.5); c.a = max(c.a, disc * bell * 0.22);
    }
  } else if (u_fx == 14) {                             /* wipe — directional band sweeps across (gl-transitions: Directional) */
    float k = floor(hash(vec2(u_seed, 2.0)) * 4.0);   /* seed picks one of 4 cardinal directions */
    vec2 nd = k < 1.0 ? vec2(1.0, 0.0) : k < 2.0 ? vec2(-1.0, 0.0) : k < 3.0 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    float proj = dot(uv - 0.5, nd) + 0.5;
    float edge = pp * 1.2 - 0.1;
    c = vec4(vec3(1.0), smoothstep(edge + 0.14, edge, proj) * bell);
  } else if (u_fx == 15) {                             /* circle — disc expands from centre (gl-transitions: circleopen) */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    c = vec4(vec3(1.0), smoothstep(pp*0.95 + 0.08, pp*0.95, length(d)) * bell);
  } else if (u_fx == 16) {                             /* blinds — venetian bars open together (gl-transitions: windowblinds) */
    float local = fract(uv.y * 14.0), open = pp * 1.1;
    c = vec4(vec3(1.0), smoothstep(open + 0.05, open - 0.05, local) * bell);
  } else if (u_fx == 17) {                             /* squares — grid cells fill in, staggered (gl-transitions: GridFlip) */
    vec2 cell = floor(uv * vec2(20.0*u_res.x/u_res.y, 20.0));
    float delay = hash(cell) * 0.55;
    c = vec4(vec3(1.0), smoothstep(delay, delay + 0.12, pp) * bell);
  } else if (u_fx == 18) {                             /* pinwheel — angular sweep, 3 arms (gl-transitions: pinwheel) */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float ang = fract((atan(d.y, d.x)/6.28318 + 0.5) * 3.0);
    c = vec4(vec3(1.0), step(ang, pp * 1.05) * bell);
  } else if (u_fx == 19) {                             /* doors — panels close from both sides (gl-transitions: DoorWay) */
    float hx = abs(uv.x - 0.5), close = pp * 0.5;
    c = vec4(vec3(1.0), smoothstep(0.5 - close - 0.03, 0.5 - close, hx) * bell);
  } else if (u_fx == 20) {                             /* polka — dot curtain grows to cover (gl-transitions: PolkaDotsCurtain) */
    vec2 cell = fract(uv * vec2(12.0*u_res.x/u_res.y, 12.0)) - 0.5;
    c = vec4(vec3(1.0), smoothstep(pp*0.72, pp*0.72 - 0.12, length(cell)) * bell);
  } else if (u_fx == 21) {                             /* swirl — rotational light streaks from centre (gl-transitions: Swirl) */
    vec2 d = uv - 0.5; d.x *= u_res.x/u_res.y;
    float r = length(d);
    float a0 = atan(d.y, d.x) + (1.0 - smoothstep(0.0, 0.7, r)) * bell * 6.2831;
    c = vec4(vec3(1.0), pow(0.5 + 0.5*sin(a0 * 8.0), 4.0) * smoothstep(0.85, 0.0, r) * bell * 0.6);
  }
  // optional tint: recolour by luminance → u_tint (amt 0 = untouched); u_intensity scales strength
  if (u_tintAmt > 0.0) {
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.rgb = mix(c.rgb, u_tint * clamp(lum * 1.8, 0.0, 1.0), u_tintAmt);
  }
  c.a *= u_intensity;
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
    seed: gl.getUniformLocation(prog, 'u_seed'), fx: gl.getUniformLocation(prog, 'u_fx'),
    tint: gl.getUniformLocation(prog, 'u_tint'), tintAmt: gl.getUniformLocation(prog, 'u_tintAmt'), intensity: gl.getUniformLocation(prog, 'u_intensity'),
    pal: gl.getUniformLocation(prog, 'u_pal'), palN: gl.getUniformLocation(prog, 'u_palN') };
  gl.viewport(0, 0, w, h);
  gl.uniform2f(U.res, w, h);
  let last = ''; // dedup identical draws (same args → same pixels; skip the GL work)
  return {
    canvas,
    // tint: [r,g,b] 0..1 mono recolour (null = native). intensity scales strength. palette: up to 4
    // [r,g,b] the leak is built from (the seed only arranges them) — art-directable multicolour leaks.
    draw(effect, progress, seed = 0, tint = null, intensity = 1, palette = null) {
      const idx = SHADER_FX.indexOf(effect);
      if (idx < 0) return this.clear();
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
