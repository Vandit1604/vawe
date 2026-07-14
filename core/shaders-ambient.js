// core/shaders-ambient.js — smooth LOOPING ambient shaders for the `shader` layer primitive. Where
// core/stings.js is transient cut-covers, these are continuous, slow, low-contrast colour fields you
// place behind content. Pure in (time, seed) so renderFrame(n) stays deterministic.
//
// BEAUTY RECIPE (why these look premium, not like noise soup):
//   • FEW colours (2-4 palette stops), never a rainbow.
//   • VERY LOW frequency — a handful of big soft gaussian blobs, not high-octave fbm.
//   • Blobs DRIFT slowly (sin/cos on small coefficients) and BLEND (mix by exp falloff) → mesh gradient.
//   • Slight desaturation + intensity as a brightness dial. No hard edges anywhere.
export const AMBIENT_FX = ['flow', 'aurora', 'plasma', 'drift', 'mist'];

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_seed; uniform int u_fx;
uniform vec3 u_pal[4]; uniform int u_palN; uniform float u_intensity;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
vec3 P(int i, vec3 df){                                   // palette stop, or a tasteful default
  if(i==0) return u_palN>0 ? u_pal[0] : df;
  if(i==1) return u_palN>1 ? u_pal[1] : df;
  if(i==2) return u_palN>2 ? u_pal[2] : df;
  return u_palN>3 ? u_pal[3] : df; }
float blob(vec2 p, vec2 c, float s){ vec2 d=p-c; return exp(-dot(d,d)*s); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float ar = u_res.x/u_res.y;
  vec2 p = vec2(uv.x*ar, uv.y); float t = u_time + u_seed*9.3;
  vec3 c0=P(0,vec3(0.36,0.34,0.86)), c1=P(1,vec3(0.20,0.55,0.55)),
       c2=P(2,vec3(0.95,0.58,0.36)), c3=P(3,vec3(0.84,0.36,0.52));
  vec3 col; float alpha = 1.0;

  if(u_fx==0){                                            // flow — soft mesh gradient (the premium one)
    col = mix(c0, c1, smoothstep(0.0,1.0,uv.y));          // gentle base wash
    col = mix(col, c2, blob(p, vec2((0.30+0.16*sin(t*0.10))*ar, 0.34+0.13*cos(t*0.08)), 2.4)*0.8);
    col = mix(col, c3, blob(p, vec2((0.74+0.13*sin(t*0.07+2.1))*ar, 0.64+0.15*cos(t*0.09+1.0)), 2.7)*0.75);
    col = mix(col, c1, blob(p, vec2((0.50+0.20*sin(t*0.06+4.0))*ar, 0.80+0.11*cos(t*0.11+3.0)), 3.0)*0.6);
  } else if(u_fx==1){                                     // aurora — soft undulating curtain
    float w = noise(vec2(p.x*1.1, t*0.07))*0.6 + noise(vec2(p.x*2.2+9.0, t*0.045))*0.4;
    float y = uv.y + (w-0.5)*0.55;
    col = mix(c0, c1, smoothstep(0.12,0.9,y));
    col = mix(col, c2, smoothstep(0.55,1.05,y)*0.55);
    alpha = 0.35 + 0.65*exp(-pow((y-0.55)*2.0, 2.0));
  } else if(u_fx==2){                                     // plasma — gentle two-tone interference
    float v = 0.5 + 0.5*sin(p.x*1.8+t*0.14) + 0.5*sin(p.y*2.0-t*0.11); v *= 0.5;
    col = mix(c0, c2, smoothstep(0.15,0.85,v));
    col = mix(col, c1, 0.35 + 0.35*sin(v*3.14159 + t*0.1));
  } else if(u_fx==3){                                     // drift — big soft bokeh, blended
    col = mix(c0, c1, uv.y) * 0.7;
    for(int i=0;i<7;i++){ float fi=float(i);
      vec2 c = vec2(hash(vec2(fi,u_seed))*ar, fract(hash(vec2(fi*1.7,u_seed)) - t*0.02*(0.5+hash(vec2(fi,9.0)))));
      float r = 0.20 + 0.14*hash(vec2(fi,3.0));
      col = mix(col, P(int(mod(fi,4.0)), c2), blob(p, c, 1.0/(r*r))*0.5); }
  } else {                                                // mist — near-still soft haze
    float n = noise(p*1.2 + vec2(t*0.025,-t*0.018))*0.6 + noise(p*0.6 + t*0.012)*0.4;
    col = mix(c0, c1, smoothstep(0.32,0.68,n));
    alpha = 0.5 + 0.4*n;
  }
  col = mix(vec3(dot(col, vec3(0.333))), col, 0.9);       // slight desaturate → premium, not garish
  col *= (0.6 + 0.4*u_intensity);
  alpha *= clamp(u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(col*alpha, alpha);
}`;

export function createAmbientLayer(w = 1920, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return { canvas, draw: () => {}, dispose: () => {} };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('ambient shader: ' + gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = { res: gl.getUniformLocation(prog, 'u_res'), time: gl.getUniformLocation(prog, 'u_time'),
    seed: gl.getUniformLocation(prog, 'u_seed'), fx: gl.getUniformLocation(prog, 'u_fx'),
    pal: gl.getUniformLocation(prog, 'u_pal'), palN: gl.getUniformLocation(prog, 'u_palN'),
    intensity: gl.getUniformLocation(prog, 'u_intensity') };
  gl.viewport(0, 0, w, h); gl.uniform2f(U.res, w, h);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return {
    canvas,
    draw(fx, time, seed = 0, palette = null, intensity = 0.35) {
      const idx = AMBIENT_FX.indexOf(fx); if (idx < 0) return;
      gl.useProgram(prog);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.time, time); gl.uniform1f(U.seed, seed); gl.uniform1i(U.fx, idx);
      gl.uniform1f(U.intensity, intensity);
      const flat = new Float32Array(12); const n = palette ? Math.min(4, palette.length) : 0;
      for (let i = 0; i < n; i++) { flat[i * 3] = palette[i][0]; flat[i * 3 + 1] = palette[i][1]; flat[i * 3 + 2] = palette[i][2]; }
      gl.uniform3fv(U.pal, flat); gl.uniform1i(U.palN, n);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}
