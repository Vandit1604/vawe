import { glContext } from '../engine/webgl.js';
import { defineRegistry } from '../registry/registry.js';
// core/raymarch-fx.js: REAL 3D, without a 3D engine. A fullscreen quad plus a distance field is a
// renderer: march a ray per pixel, hit an implicit surface, shade it. No geometry, no scene graph, no
// three.js, and no new determinism story, because a raymarched frame is already a pure function of
// (uv, time) exactly like every other shader in this repo.
//
// WHY THIS EXISTS AS ITS OWN LAYER rather than another AMBIENT_FX entry: an ambient effect is a
// low-contrast VEIL you place behind or over content, and its vocabulary (intensity, palette, "no
// hard edges anywhere") is the opposite of what a lit 3D object needs. These have a camera, a
// surface normal, a specular highlight and a silhouette. Mixing them into the veil registry would
// have meant one of the two families lying about what it is.
//
// WHAT THIS DOES NOT COVER: anything needing real geometry, extruded 3D text, a device showcase, a
// point cloud, cloth. An SDF cannot import a font outline or a mesh. That half of Tier 4 is where a
// three.js dependency would actually earn itself; see engine-doctrine/ROADMAP.md.
//
// DETERMINISM: pure in (local time, seed). The camera orbit is f(t), never accumulated. No frame
// feedback, nothing read back. Guarded by `make probe` (DOM) and `make canvas-purity` (real pixels),
// because a canvas's contents are invisible to a DOM signature.
//
// COST: this is the most expensive primitive in the engine. Every pixel marches up to MAX_STEPS times.
// Use it for ONE hero shot, size the layer to what it needs, and do not put two on screen at once.

// EACH SURFACE DESCRIBES ITSELF, and as in core/shaders-ambient.js the ORDER IS THE WIRE FORMAT: the
// index here is the `u_fx` both map() and the shading branch switch on, so a name may not be moved.
// The map is the source and the array is derived, so the two cannot drift (THREE_SCENES, same shape).
export const RAYMARCH_SURFACES = {
  metaballs: 'five spheres orbiting and smooth-union-ing into one blob of soft glossy candy, two palette stops shading it top to bottom',
  mandelbulb: 'the mandelbulb fractal, depth-shaded near-to-far, its exponent breathing between 5.5 and 8.5 on a slow sine',
  chromeGlass: 'a tumbling torus and a bobbing sphere in mirror chrome, reflecting a studio horizon with a hard specular glint',
  caustics: 'a water surface built from crossed low-frequency waves, lit so the caustic bands come from the same field that shapes it rather than sitting on top',
  holoFoil: 'a rippling disc of foil: thin-film interference over bright metal, the hue turning with viewing angle. the band is deliberately NARROW, so it reads as one colour sliding rather than a rainbow, and it is bounded to a disc so it keeps a silhouette',
  glassRefract: 'a tumbling block of clear glass. the ray bends going in, crosses the body, and bends again coming out, and the exit is taken three times at three slightly different indices, so edges split into red and blue the way a prism does. thick parts drink the light and take the palette colour. transparent, dispersive, refractive: the crystal, the diamond, the ice cube',
};
export const RAYMARCH_FX = Object.keys(RAYMARCH_SURFACES);

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

const FRAG = `precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_seed;
uniform int   u_fx;
uniform vec3  u_pal[4];
uniform int   u_palN;
uniform float u_intensity;
uniform float u_spin;     // camera orbit speed; 0 freezes the camera and lets the SUBJECT move

#define MAX_STEPS 72
#define MAX_DIST  16.0
#define SURF_EPS  0.0015

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }
float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }
// The rounded box, from Inigo Quilez's distance-functions article (iquilezles.org/articles/distfunctions).
// The max(q,0) length is the distance outside the box and the min(max(...),0) term is the interior
// distance; adding both and subtracting r is what makes ONE expression exact both inside and out,
// which a refracted ray marching from within the body needs and a naive outside-only box cannot give.
float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float hash1(float n){ return fract(sin(n + u_seed) * 43758.5453123); }

// palette lookup with a sane fallback, so a scene never depends on the author passing colours
vec3 pal(int i, vec3 dflt){
  if (u_palN > i) {
    for (int k = 0; k < 4; k++) { if (k == i) return u_pal[k]; }
  }
  return dflt;
}

// ---- distance fields, one per scene -------------------------------------------------------------
float mapMetaballs(vec3 p){
  float d = 1e9;
  // Closed form: each ball's position is f(t). Never "last position + velocity", that would make the
  // frame depend on how many frames ran before it, which is the one thing this engine cannot allow.
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float a = u_time * (0.35 + fi * 0.11) + fi * 2.399;
    vec3 c = vec3(cos(a) * (0.55 + 0.10 * fi), sin(a * 0.9 + fi) * 0.45, sin(a * 1.3) * 0.5);
    d = smin(d, sdSphere(p - c, 0.34 - fi * 0.02), 0.34);
  }
  return d;
}

float mapMandelbulb(vec3 p){
  vec3 z = p; float dr = 1.0; float r = 0.0;
  float power = 7.0 + 1.5 * sin(u_time * 0.25);
  for (int i = 0; i < 8; i++) {
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(clamp(z.z / max(r, 1e-6), -1.0, 1.0));
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;
    float zr = pow(r, power);
    theta *= power; phi *= power;
    z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta)) + p;
  }
  return 0.5 * log(max(r, 1e-6)) * r / dr;
}

float mapChromeGlass(vec3 p){
  vec3 q = p; q.xz *= rot(u_time * 0.4); q.xy *= rot(u_time * 0.27);
  return min(sdTorus(q, vec2(0.75, 0.26)), sdSphere(p - vec3(0.0, sin(u_time * 0.8) * 0.35, 0.0), 0.34));
}

float mapCaustics(vec3 p){
  // a water surface: a plane displaced by crossed low-frequency waves
  float w = sin(p.x * 2.6 + u_time * 1.1) * 0.09
          + sin(p.z * 3.1 - u_time * 0.8) * 0.07
          + sin((p.x + p.z) * 1.7 + u_time * 0.5) * 0.05;
  return p.y + 0.6 - w;
}

float mapHoloFoil(vec3 p){
  // a rippling sheet, thin enough to read as foil rather than as a landscape. BOUNDED to a disc:
  // unbounded it filled the frame edge to edge, and with no silhouette the iridescence read as a
  // flat rainbow gradient instead of as a physical piece of foil catching the light.
  float w = sin(p.x * 2.2 + u_time * 0.9) * 0.13 + sin(p.z * 1.7 - u_time * 0.7) * 0.11;
  float sheet = abs(p.y - w) - 0.030;
  return max(sheet, length(p.xz) - 0.95);
}

float mapGlassRefract(vec3 p){
  // ONE convex-ish solid, deliberately. A refracted ray has to march the field from INSIDE, and a
  // union of two bodies puts an interior wall in the middle of that march: the ray exits the first
  // object into the second and the picture stops reading as one piece of glass. A rounded cube also
  // gives the two things refraction needs to be legible: flat faces that carry a clean image of the
  // environment, and fat corners where the bending is strong enough to split colour.
  // The tumble is aimed at the CORNERS. A flat face of glass presented to the camera refracts a flat
  // image and reads as a tinted panel; the corners are where the exit angle changes fastest and where
  // both the caustic pinch and the colour split live. So the second axis is biased away from face-on
  // and swings past it rather than resting there.
  vec3 q = p;
  q.xz *= rot(u_time * 0.26);
  q.xy *= rot(0.62 + 0.42 * sin(u_time * 0.17));
  return sdRoundBox(q, vec3(0.46), 0.18);
}

float map(vec3 p){
  if (u_fx == 0) return mapMetaballs(p);
  else if (u_fx == 1) return mapMandelbulb(p);
  else if (u_fx == 2) return mapChromeGlass(p);
  else if (u_fx == 3) return mapCaustics(p);
  else if (u_fx == 4) return mapHoloFoil(p);
  else return mapGlassRefract(p);
}

// tetrahedron normal: 4 taps instead of the naive 6, same accuracy
vec3 normalAt(vec3 p){
  vec2 e = vec2(1.0, -1.0) * 0.0008;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx)
                 + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

// a cheap studio environment, so reflective materials have something to reflect. A chrome object in
// front of a void reads as a flat grey blob; the horizon gradient plus one bright key is what makes
// it read as metal.
vec3 envColor(vec3 rd){
  float up = rd.y * 0.5 + 0.5;
  // A MIRROR SHOWS ITS SURROUNDINGS. The first version reflected a near-black room, so chromeGlass
  // rendered as a dark matte pill: correct lighting maths, no material read. A bright gradient plus
  // a visible horizon line plus two lights is the minimum for metal to look like metal.
  vec3 floorC = vec3(0.10, 0.11, 0.14);
  vec3 skyC   = mix(vec3(0.62, 0.68, 0.80), vec3(0.95, 0.97, 1.00), smoothstep(0.5, 1.0, up));
  vec3 col = mix(floorC, skyC, smoothstep(0.44, 0.56, up));      // a horizon a reflection can bend
  float key  = pow(max(dot(rd, normalize(vec3(0.5, 0.7, -0.4))), 0.0), 32.0);
  float fill = pow(max(dot(rd, normalize(vec3(-0.6, 0.35, 0.5))), 0.0), 12.0);
  return col + vec3(1.0, 0.97, 0.92) * key * 3.2 + vec3(0.75, 0.82, 1.0) * fill * 0.55;
}

// THE ROOM A TRANSMITTED RAY LANDS IN. envColor above is a studio built for a MIRROR, and a mirror
// mostly looks upward: its floor sits at 0.10 because almost nothing reflects off it. A refracted ray
// does the opposite, it leaves the body pointing DOWN, so every transmitted ray in the first version
// landed on the darkest surface in the room and a block of clear glass rendered as a black stone.
// Glass needs something under it to carry an image, and it needs that something to have a GRADIENT in
// it: refraction can only show what the room contains, and a flat white table refracts into an even
// wash that reads as pale plastic. So the table recedes, and the two lamps are opposed in colour, to
// give the dispersion at a corner something warm on one side and something cool on the other.
vec3 transmitEnv(vec3 d){
  vec3 e = envColor(d);
  // The table sits HIGH and its edge is soft: a ray leaving a flat face of the block barely bends, so
  // it exits only a little below horizontal, and a table that starts 30 degrees down leaves the whole
  // face showing the dark studio floor.
  vec3 table = mix(vec3(0.95, 0.97, 1.00), vec3(0.38, 0.46, 0.62), smoothstep(-0.06, -0.90, d.y));
  e = mix(e, table, smoothstep(0.26, -0.26, d.y) * 0.86);
  e += vec3(1.00, 0.72, 0.42) * pow(max(dot(d, normalize(vec3(-0.75, -0.10, 0.55))), 0.0), 8.0) * 0.70;
  e += vec3(0.34, 0.56, 1.00) * pow(max(dot(d, normalize(vec3(0.80, 0.22, 0.42))), 0.0), 14.0) * 0.85;
  return e;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / max(u_res.y, 1.0);

  // camera: orbits the origin as a function of t. u_spin 0 holds it still.
  float ang = u_time * 0.35 * u_spin;
  float dist = (u_fx == 1) ? 2.6 : 3.0;
  vec3 ro = vec3(sin(ang) * dist, 0.55, cos(ang) * dist);
  if (u_fx == 3) ro = vec3(sin(ang) * 2.2, 1.15, cos(ang) * 2.2);
  if (u_fx == 4) ro = vec3(sin(ang) * 3.4, 2.30, cos(ang) * 3.4);   // above the disc, looking down
  vec3 ta = vec3(0.0);
  vec3 fw = normalize(ta - ro), rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.5 * fw);

  float t = 0.0; float d = 0.0; bool hit = false;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    d = map(p);
    if (d < SURF_EPS) { hit = true; break; }
    t += d;
    if (t > MAX_DIST) break;
  }

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 ld = normalize(vec3(0.6, 0.8, -0.35));
    float diff = max(dot(n, ld), 0.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 refl = reflect(rd, n);

    if (u_fx == 0) {                                   // metaballs, soft glossy candy
      vec3 a = pal(0, vec3(0.29, 0.47, 0.95)), b = pal(1, vec3(0.95, 0.35, 0.62));
      col = mix(a, b, clamp(n.y * 0.5 + 0.5, 0.0, 1.0));
      col = col * (0.30 + 0.70 * diff) + envColor(refl) * (0.16 + 0.55 * fres);

    } else if (u_fx == 1) {                            // mandelbulb, depth-shaded, palette-tinted
      float ao = 1.0 - clamp(t / MAX_DIST, 0.0, 1.0);
      vec3 a = pal(0, vec3(0.95, 0.62, 0.22)), b = pal(1, vec3(0.35, 0.18, 0.55));
      col = mix(b, a, ao) * (0.25 + 0.85 * diff) + envColor(refl) * fres * 0.35;

    } else if (u_fx == 2) {                            // chromeGlass, mirror metal
      col = envColor(refl) * (0.90 + 0.55 * fres);
      col += vec3(1.0) * pow(max(dot(refl, ld), 0.0), 64.0) * 2.2;
      col = mix(col, col * pal(0, vec3(0.82, 0.88, 1.0)), 0.25);

    } else if (u_fx == 3) {                            // caustics, water, lit from below the surface
      // caustic bands from the same wave field that shapes the surface, so the light agrees with the
      // geometry instead of being a texture laid over it
      float c = sin(p.x * 6.0 + u_time * 1.6) * sin(p.z * 6.6 - u_time * 1.2);
      c = pow(clamp(c * 0.5 + 0.5, 0.0, 1.0), 3.0);
      vec3 deep = pal(0, vec3(0.04, 0.22, 0.38)), lit = pal(1, vec3(0.55, 0.92, 0.98));
      col = mix(deep, lit, c * 0.85) * (0.35 + 0.65 * diff) + envColor(refl) * fres * 0.55;

    } else if (u_fx == 4) {                            // holoFoil, iridescent, angle-shifted hue
      // thin-film interference over metal. The hue band is NARROW (x2.6, not x7) and sits on a
      // bright silver base: a full-spectrum sweep reads as a pride gradient, not as foil.
      // Balance matters more than either term: the env is bright, so weighting metal above the film
      // washed the iridescence out into pale plastic. The film has to CARRY the colour and the metal
      // supplies the brightness and the highlight.
      float shift = dot(n, -rd) * 1.6 + fres * 1.2;
      vec3 film = 0.5 + 0.5 * cos(vec3(0.0, 2.09, 4.19) + shift * 4.2 + u_time * 0.35);
      vec3 metal = envColor(refl);
      col = film * (0.55 + 0.45 * metal) + metal * 0.22;
      col = mix(col, col * pal(0, vec3(1.0)), 0.20);
      col *= (0.55 + 0.45 * diff);
      col += vec3(1.0) * pow(max(dot(refl, ld), 0.0), 42.0) * 1.6;   // the glint that sells foil

    } else {                                           // glassRefract, dispersive transparent glass
      // WHAT MAKES GLASS LOOK LIKE GLASS, and it is three things in an order, none of which is
      // "make it transparent". Read: Inigo Quilez on raymarching refraction, and Schlick's 1994
      // approximation to the Fresnel term, which every real-time renderer uses.
      //
      // 1. FRESNEL decides how much of the pixel is reflection and how much is transmission, and it
      //    depends on the viewing angle: face-on you see through, edge-on you see a mirror. Schlick:
      //    F = F0 + (1-F0)(1-cos)^5, F0 = 0.04 for glass. A constant blend instead of this reads as
      //    tinted plastic, which is the usual failure and the reason it is step one.
      // 2. THE RAY CROSSES THE BODY. Refract in, march the field NEGATED (inside the solid the
      //    distance is negative, so -map is the distance to the far wall), refract out at the exit
      //    normal. Skipping the interior march and refracting straight into the environment gives a
      //    lens with no thickness: no caustic pinch, no inverted image, no weight.
      // 3. DISPERSION IS TAKEN AT THE EXIT ONLY. Red, green and blue have different indices, so a
      //    prism splits them. Marching three times to get that would triple the cost of the most
      //    expensive primitive in the engine; refracting the ONE interior ray out three times and
      //    reading the environment for each costs three cheap lookups. The colour fringe appears at
      //    the corners, where the exit angle changes fastest, which is where a real prism puts it.
      float ior = 1.47;
      vec3 rin = refract(rd, n, 1.0 / ior);
      vec3 ip = p - n * 0.02;
      float it = 0.0;
      for (int i = 0; i < 40; i++) {
        float dd = -map(ip + rin * it);
        if (dd < SURF_EPS) break;
        it += max(dd, 0.012);
        if (it > 5.0) break;
      }
      vec3 xp = ip + rin * it;
      vec3 xn = -normalAt(xp);                          // the far wall faces INWARD, hence the sign
      // The three indices are spread WIDE, well past a real crown glass. A physical Abbe number puts
      // the red and blue exits inside a degree of each other, which at 1080p is a fringe under two
      // pixels: correct, and invisible. This is the same exaggeration a colourist makes; the effect
      // has to survive a viewer who is not looking for it.
      vec3 eR = refract(rin, xn, ior * 0.960);
      vec3 eG = refract(rin, xn, ior);
      vec3 eB = refract(rin, xn, ior * 1.040);
      // refract() returns the zero vector on total internal reflection, and an env lookup along zero
      // is a flat grey patch. TIR is not an error case here, it is the bright silvered edge a thick
      // glass corner actually has, so fall back to the mirror ray rather than to a default colour.
      vec3 mir = reflect(rin, xn);
      if (dot(eR, eR) < 0.5) eR = mir;
      if (dot(eG, eG) < 0.5) eG = mir;
      if (dot(eB, eB) < 0.5) eB = mir;
      // BEER-LAMBERT: the further the ray travelled through the body, the more of the palette's
      // complement it lost. This is what makes thickness visible and is why the corners read darker
      // and more saturated than the faces.
      // The palette stop is pulled most of the way to white before it becomes an absorption
      // coefficient. A saturated brand colour used raw makes (1 - tint) near 1 on two channels, and
      // glass a centimetre thick then drinks nearly everything: the body goes black and the effect is
      // gone. What an author means by "blue glass" is a faint cast over a bright body.
      vec3 tint = mix(vec3(1.0), pal(0, vec3(0.55, 0.80, 0.95)), 0.55);
      vec3 absorb = exp(-(vec3(1.0) - tint) * it * 0.85);
      vec3 tr = vec3(transmitEnv(eR).r, transmitEnv(eG).g, transmitEnv(eB).b) * absorb;
      float f = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);   // Schlick
      col = mix(tr, envColor(refl), clamp(f, 0.0, 1.0));
      col += vec3(1.0) * pow(max(dot(refl, ld), 0.0), 110.0) * 3.4;    // the hard specular pin
    }

    // distance fog toward transparent, so the subject sits IN the composition rather than being
    // pasted onto it, and the layer's edges never show as a hard rectangle
    float fog = 1.0 - smoothstep(MAX_DIST * 0.45, MAX_DIST * 0.95, t);
    alpha = fog;
    col *= fog;
  }

  col *= (0.55 + 0.45 * u_intensity);
  alpha *= clamp(u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);   // premultiplied, matching every other GL layer here
}`;

export function createRaymarchLayer(w = 1080, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = glContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }, 'raymarch surface');

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('raymarch shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('raymarch link: ' + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res: gl.getUniformLocation(prog, 'u_res'), time: gl.getUniformLocation(prog, 'u_time'),
    seed: gl.getUniformLocation(prog, 'u_seed'), fx: gl.getUniformLocation(prog, 'u_fx'),
    pal: gl.getUniformLocation(prog, 'u_pal'), palN: gl.getUniformLocation(prog, 'u_palN'),
    intensity: gl.getUniformLocation(prog, 'u_intensity'), spin: gl.getUniformLocation(prog, 'u_spin'),
  };
  gl.viewport(0, 0, w, h);
  gl.uniform2f(U.res, w, h);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return {
    canvas,
    draw(fx, time, seed = 0, palette = null, intensity = 1, spin = 1) {
      const idx = RAYMARCH_FX.indexOf(fx);
      if (idx < 0) throw new Error(`unknown raymarch "${fx}", one of: ${RAYMARCH_FX.join(', ')}`);
      gl.useProgram(prog);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.time, time); gl.uniform1f(U.seed, seed); gl.uniform1i(U.fx, idx);
      gl.uniform1f(U.intensity, intensity); gl.uniform1f(U.spin, spin);
      const flat = new Float32Array(12);
      const n = palette ? Math.min(4, palette.length) : 0;
      for (let i = 0; i < n; i++) { flat[i * 3] = palette[i][0]; flat[i * 3 + 1] = palette[i][1]; flat[i * 3 + 2] = palette[i][2]; }
      gl.uniform3fv(U.pal, flat); gl.uniform1i(U.palN, n);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // off-window must wipe: otherwise the buffer holds whichever frame a worker drew last, and frames
    // render across 8 workers in arbitrary order (core/layers/shader.js, core/layers/paint.js).
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a raymarch" when someone writes it somewhere else. core/registry.js.
const RAYMARCH_AKA = {
  metaballs: ['glossy candy blob', 'merging spheres', 'soft blob of orbiting spheres'],
  mandelbulb: ['3D fractal', 'a mandelbulb shape', 'breathing fractal'],
  chromeGlass: ['mirror chrome shapes', 'reflective chrome torus', 'shiny metal object'],
  caustics: ['water surface with light bands', 'ocean caustics', 'light through water'],
  holoFoil: ['holographic foil', 'iridescent foil disc', 'rainbow foil sheen'],
  glassRefract: ['glass block', 'refractive crystal', 'a diamond or ice cube look'],
};

export const RAYMARCH_REGISTRY = defineRegistry('raymarch', Object.fromEntries(RAYMARCH_FX.map((n) => [n, n])), { slot: 'raymarch', blurbs: RAYMARCH_SURFACES, aka: RAYMARCH_AKA,
  catalog: {
    title: 'Raymarched surfaces',
    tag: 'layer',
    intro: '`{ "type":"raymarch", "raymarch":"<name>" }`. Implicit surfaces from a distance field. A subject you place, not a field behind everything.',
    usage: (n, { full }) => full({ type: 'raymarch', raymarch: n }),
    preview: (n, { base, OVER }) => base({ layers: [{ type: 'raymarch', raymarch: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  },
});
