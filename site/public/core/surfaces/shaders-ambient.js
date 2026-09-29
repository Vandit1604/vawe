import { glContext } from '../engine/webgl.js';
import { defineRegistry } from '../registry/registry.js';
// Smooth LOOPING ambient shaders for the `shader` layer primitive: continuous, slow, low-contrast
// colour fields placed behind content (core/stings.js is the transient cut-cover kind instead). Pure
// in (time, seed) so renderFrame(n) stays deterministic.
//
// Wave 3's analog/retro + distortion family are OVERLAY looks (place on top of content, intensity
// ~0.6-0.9): this layer composites over siblings without sampling them, so "distortion" members are
// self-generated veils (heat haze, water caustics, a lens vignette), not true screen-space warps.
//
// The map order IS the wire format: index of a name here is the `u_fx` the fragment shader branches
// on, so a name may not move or be inserted mid-list. The array (AMBIENT_FX) is derived from this map
// so the two cannot drift.
export const AMBIENT_SHADERS = {
  flow: 'a soft mesh gradient: three big blobs drifting slowly over a vertical wash, the premium default',
  aurora: 'a drifting colour aurora: bands of colour slowly moving and blending across the whole frame',
  plasma: 'two crossed sine waves interfering into a slow two-tone swell',
  drift: 'seven big soft bokeh discs rising up the frame and blending as they pass',
  mist: 'near-still layered noise haze. The quietest field here, for a backdrop that must move without being noticed',
  vhs: 'tape: scanlines, magenta/cyan chroma snow, dropout streaks and a soft tracking band creeping up. an OVERLAY, place it ABOVE content',
  crt: 'a tube: 4px RGB phosphor stripes, scanlines, a corner vignette and a refresh bar rolling down. an OVERLAY',
  filmGrain: 'grain re-struck 24 times a second per ~2px cell, plus dust specks; bright or dark only, never mid-grey, so contrast survives. an OVERLAY',
  lightLeak: 'three warm blobs drifting in from the edges on a loop, tinted from the palette. an OVERLAY',
  barrel: 'the LENS, not the picture: a corner vignette with a faint violet chromatic fringe riding the far edge only',
  heatShimmer: 'rising warm haze in fine wavy bands, strongest low in the frame and thinning as it climbs. self-generated. It does not warp what is beneath it',
  ripple: 'gentle water caustics: three rings of cool light expanding and overlapping',
  kaleidoscope: 'a 6-fold mirrored mandala turning slowly and fading out toward the corners. A symmetric field of its own, never a mirror of your content',
  matrixDecode: 'digital rain: near-white heads falling down 44 glyph columns at per-column speeds, each dragging a fading tail. palette stop 0 tints it',
  nebula: 'deep-field gas clouds from three octaves of noise with a hot core, dusted with twinkling stars off a hashed grid',
  dotCrawl: 'the NTSC artifact: a fine diagonal chroma lattice creeping one subcarrier phase per frame, concentrated where there is detail. an OVERLAY',
  gateWeave: 'a projector gate: the soft dark frame border, dust re-struck each projected frame and a hair that catches for a second or two, all riding ONE drifting offset so the picture appears to float',
  domainWarp: 'marbled ink: fBm sampled through a domain that is itself two levels of fBm, so the field folds back over itself. the classic warp, and the only field here with real interior structure',
  voronoi: 'cellular (Worley) noise: seeded cells drifting on their own loops, each one flat-tinted, with a lit line along every shared border',
  metaballs: 'five signed-distance circles merging and parting on a polynomial smooth minimum, so they fuse into one body instead of overlapping',
  bands: 'a ramp repeated over a scalar field (rotated panels, concentric arcs or nested rounded boxes) tinted by a gradient with a shaped light behind it. the most dialled effect here; engine-doctrine/LIGHTFIELD.md',
  godRays: 'shafts of light: sun through a canopy, beams through a window, crepuscular rays. the light sits just off the top edge, a drifting cloud of leaves breaks it into blades, and dust turns slowly inside the bright ones. the deepest field here, because the beams recede toward one point. it is BRIGHT through the middle, so drop `intensity` toward 0.4 before putting white type over it',
  curlSmoke: 'a rising plume of ink or smoke that rolls into vortices as it climbs, its filaments stretching and folding. slow, continuous, and never repeating; the one field here with real fluid motion rather than a drifting pattern',
  // APPENDED, not inserted: see the note above about wire-format order. Ported from pbakaus/radiant
  // (chromatic-bloom.html, MIT); the shader source keeps the port's line references and rationale.
  chromaticBloom: 'twelve luminous colour orbs (five vivid, seven dim) drifting and blending on black, each on its own noisy orbit, with a vignette and grain over the top. ported from pbakaus/radiant',
  auroraCurtain: 'six vertical curtain lines undulating top to bottom, each drifting sideways on its own noise offset, fading warm to cool along its length. ported from pbakaus/radiant',
  auroraVeil: 'seven wide aurora ribbons undulating over a starfield, with a frosted ice ground plane reflecting them below the horizon. the richest field here after bands. ported from pbakaus/radiant',
  laserLabyrinth: 'six volumetric light cones sweeping down from just above the top edge through drifting fog, three dim and far, three bright and near with a rhythmic beat snap. ported from pbakaus/radiant',
};
export const AMBIENT_FX = Object.keys(AMBIENT_SHADERS);

// AMBIENT_AKA: the plain-English words a blurb cannot honestly carry. Never printed, search only.
const AMBIENT_AKA = {
  aurora: ['northern lights', 'colour wash', 'flowing colour glow'],
  flow: ['mesh gradient', 'soft blob gradient', 'flowing colour blobs'],
  plasma: ['plasma effect', 'interference waves', 'crossed sine waves'],
  drift: ['bokeh drift', 'rising soft discs', 'floating light discs'],
  mist: ['soft haze', 'quiet noise field', 'subtle fog backdrop'],
  vhs: ['VHS tape effect', 'retro tape distortion', 'analog tape look'],
  crt: ['old CRT monitor', 'tube TV look', 'scanline overlay'],
  filmGrain: ['film grain overlay', 'grainy texture', 'dust and grain'],
  lightLeak: ['light leak overlay', 'warm edge glow', 'film light leak'],
  barrel: ['lens vignette', 'barrel distortion', 'corner vignette with fringing'],
  heatShimmer: ['heat haze', 'rising heat wave', 'shimmering hot air'],
  ripple: ['water ripples', 'caustics effect', 'rings of light on water'],
  kaleidoscope: ['kaleidoscope effect', 'mirrored mandala', 'symmetric mirror pattern'],
  matrixDecode: ['digital rain', 'matrix code rain', 'falling glyph columns'],
  nebula: ['deep space nebula', 'star field with gas clouds', 'cosmic dust field'],
  dotCrawl: ['NTSC artifact', 'chroma crawl', 'old broadcast video artifact'],
  gateWeave: ['film projector look', 'projector gate weave', 'dusty film projection'],
  domainWarp: ['marbled ink', 'warped fbm noise', 'folding ink pattern'],
  voronoi: ['cellular noise', 'worley noise', 'cell pattern with lit borders'],
  metaballs: ['blobby merging circles', 'organic merging shapes', 'metaball blend'],
  bands: ['ramp panels', 'concentric light arcs', 'nested rounded panels of light'],
  godRays: ['light shafts', 'crepuscular rays', 'sunbeams through canopy'],
  curlSmoke: ['rising smoke', 'ink plume', 'swirling smoke trails'],
  chromaticBloom: ['glowing colour orbs', 'drifting bloom orbs on black'],
  auroraCurtain: ['aurora curtain lines', 'undulating vertical light curtains'],
  auroraVeil: ['aurora ribbons over starfield', 'aurora veil with ice ground'],
  laserLabyrinth: ['sweeping light cones', 'laser beams through fog'],
};

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_seed; uniform int u_fx;
// EIGHT palette stops, not four. Four is enough for a mesh gradient built from blobs, and it is not
// enough for a RAMP: the reference this grew for runs white, green, yellow-green, pale gold, cyan,
// blue, white, which is seven stops that no interpolation between four can reach. The seventeen
// branches written before this ask for stops 0 to 3 only, and P() answers those the same whether the
// array holds four or eight, so growing it changed no pixel of any of them.
uniform vec3 u_pal[8]; uniform int u_palN; uniform float u_intensity;
// WHERE each stop sits along the ramp, 0 to 1. Even spacing is the DEFAULT, never the only option:
// eight evenly spaced stops cannot put a narrow trough anywhere, because the narrowest feature they
// can describe is a seventh of the ramp. The spectrum reference has a trough about 6 percent of the
// frame tall, and adding stops never reached it. Position is the missing axis, not count.
uniform float u_palAt[8];
// Per-effect parameters. The shared set had none, so an effect wanting more than one knob had to
// encode it into u_seed, which makes the seed mean two things. Four floats meaning whatever the branch
// that reads them says, and ignored by the seventeen branches written before it.
uniform vec4 u_p;
// A second parameter vector, for effects that outgrew the first. Same contract, same indifference
// from every branch that does not read it.
uniform vec4 u_p2;
// A third and a fourth. Same contract again. Every field of both is defined so that ZERO means the
// behaviour that was there before it existed, which is what makes them provably additive rather than
// merely believed to be.
uniform vec4 u_p3;
uniform vec4 u_p4;
uniform vec4 u_p5;
uniform vec4 u_p6;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
// hash12 (Hoskins): decorrelated at LARGE integer coords where the p.x*p.y hash above bands into
// stripes. Used for per-pixel grain, whose whole point is uncorrelated speckle across the frame.
float rhash(vec2 p){ vec3 q = fract(vec3(p.xyx)*0.1031); q += dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
// fBm over the value noise above. FIVE octaves at lacunarity 2.0 and gain 0.5, which are the standard
// fractional-Brownian-motion parameters every reference on the technique states (Musgrave's originals,
// and the numbers Inigo Quilez's fBm and domain-warping articles use). Gain 0.5 with lacunarity 2.0 is
// what makes it 1/f: halve the amplitude every time you double the frequency. Written here from those
// numbers, not ported from anyone's shader.
float fbm(vec2 p){ float a = 0.5, s = 0.0;
  for(int i = 0; i < 5; i++){ s += a*noise(p); p *= 2.0; a *= 0.5; }
  return s; }
// The POLYNOMIAL smooth minimum, k = the blend radius in the field's own units. A plain min() gives
// two circles a hard crease where they touch; the -k*h*(1-h) term is the whole effect and is the step
// nobody guesses, because it is what removes the crease rather than merely rounding it.
float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0 - h); }
// THE POTENTIAL a curl is taken of, and the curl itself. Bridson, Hourihan and Nordenstam,
// "Curl-Noise for Procedural Fluid Flow" (SIGGRAPH 2007). In two dimensions the curl of a scalar
// potential is (dPsi/dy, -dPsi/dx), and that vector field is divergence-free BY CONSTRUCTION: it can
// roll and shear but it can never source or sink. That single property is the whole difference
// between smoke and a smear. A field sampled straight out of noise has divergence everywhere, so it
// piles material up in some places and empties others, and the result reads as a texture sliding
// about. Take the curl of the same noise and it circulates instead.
//
// Two octaves, not five. The curl DIFFERENTIATES the potential, and differentiating amplifies the
// high frequencies, so a third octave arrives as speckle in the flow rather than as structure.
float psi(vec2 q){ return noise(q) + 0.42*noise(q*2.3 + 4.7); }
// Forward differences, three taps rather than four. The half-cell bias a forward difference carries
// is a fraction of a vortex wide and invisible in a flow field, and the tap it saves is paid ten
// times over per pixel by the trace that calls this in a loop.
vec2 curl(vec2 q){
  float e = 0.055, c = psi(q);
  return vec2(psi(q + vec2(0.0, e)) - c, -(psi(q + vec2(e, 0.0)) - c)) / e;
}
vec3 P(int i, vec3 df){                                   // palette stop, or a tasteful default
  if(i==0) return u_palN>0 ? u_pal[0] : df;
  if(i==1) return u_palN>1 ? u_pal[1] : df;
  if(i==2) return u_palN>2 ? u_pal[2] : df;
  if(i==3) return u_palN>3 ? u_pal[3] : df;
  if(i==4) return u_palN>4 ? u_pal[4] : df;
  if(i==5) return u_palN>5 ? u_pal[5] : df;
  if(i==6) return u_palN>6 ? u_pal[6] : df;
  return u_palN>7 ? u_pal[7] : df; }
float blob(vec2 p, vec2 c, float s){ vec2 d=p-c; return exp(-dot(d,d)*s); }
// The palette read as a RAMP: each stop sits at its declared position along u, in order, and evenly
// spaced is simply the default set of positions. Written
// as a chain of saturating mixes rather than an indexed lookup because WebGL1 refuses a fragment
// shader that indexes a uniform array with anything but a constant. Each step is fully applied once
// u has passed its stop and untouched before it, so what comes out is piecewise-linear between
// adjacent stops and nothing else.
// MIXING HAPPENS IN OKLAB, NOT IN sRGB.
//
// A hex is gamma encoded, and mixing two gamma-encoded numbers is not mixing two lights. The midpoint
// comes out darker and duller than either end, and on a ramp that reads as a grey band where two
// colours meet. Every CSS gradient in this engine already says "in oklab" (core/lightfield/index.js
// paints its field that way); this shader was the one place still averaging raw sRGB, so the two
// halves of the same product disagreed about what a gradient is.
//
// KNOW WHAT THIS DOES NOT FIX. Two near-complementary colours have a desaturated midpoint in every
// correct space. Measured on one such pair: sRGB gives #b99875, linear light #bfa87e, OKLab #c6a181.
// All three are tan. This makes a ramp cleaner and more even; it cannot make magenta mix into green.
float s2l(float c){ return c <= 0.04045 ? c/12.92 : pow((c+0.055)/1.055, 2.4); }
float l2s(float c){ return c <= 0.0031308 ? c*12.92 : 1.055*pow(max(c,0.0), 1.0/2.4) - 0.055; }
vec3 toOk(vec3 c){
  vec3 n = vec3(s2l(c.r), s2l(c.g), s2l(c.b));
  float l = pow(max(dot(n, vec3(0.4122214708, 0.5363325363, 0.0514459929)), 0.0), 1.0/3.0);
  float m = pow(max(dot(n, vec3(0.2119034982, 0.6806995451, 0.1073969566)), 0.0), 1.0/3.0);
  float s = pow(max(dot(n, vec3(0.0883024619, 0.2817188376, 0.6299787005)), 0.0), 1.0/3.0);
  return vec3(0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
              1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
              0.0259040371*l + 0.7827717662*m - 0.8086757660*s); }
vec3 fromOk(vec3 c){
  float lp = c.x + 0.3963377774*c.y + 0.2158037573*c.z;
  float mp = c.x - 0.1055613458*c.y - 0.0638541728*c.z;
  float sp = c.x - 0.0894841775*c.y - 1.2914855480*c.z;
  float l = lp*lp*lp, m = mp*mp*mp, s = sp*sp*sp;
  vec3 lin = max(vec3( 4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
                      -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
                      -0.0041960863*l - 0.7034186147*m + 1.7076147010*s), 0.0);
  return clamp(vec3(l2s(lin.r), l2s(lin.g), l2s(lin.b)), 0.0, 1.0); }
// Same indexing dodge as P(): WebGL1 will not index a uniform array with a variable.
float A(int i){
  if(i==0) return u_palAt[0];
  if(i==1) return u_palAt[1];
  if(i==2) return u_palAt[2];
  if(i==3) return u_palAt[3];
  if(i==4) return u_palAt[4];
  if(i==5) return u_palAt[5];
  if(i==6) return u_palAt[6];
  return u_palAt[7]; }
// u_palAt[0] BELOW ZERO means "no positions given, spread them evenly". A sentinel rather than
// filling in the even values on the JS side, because the two are not the same picture. In real
// arithmetic (x - i/n)/((i+1)/n - i/n) is exactly x*n - i; in float32 it is not, because 1/7 does not
// round-trip. Feeding computed even positions through the general path shifted the spectrum card in
// a scatter of pixels. A default that exists to reproduce the old behaviour has to take the old path.
vec3 ramp(float u){
  float x = clamp(u, 0.0, 1.0);
  vec3 c = toOk(P(0, vec3(1.0)));
  if(A(0) < 0.0){
    float n = max(float(u_palN) - 1.0, 1.0);
    float s = x * n;
    for(int i=0;i<7;i++){
      if(float(i) >= n) break;
      c = mix(c, toOk(P(i+1, vec3(1.0))), clamp(s - float(i), 0.0, 1.0));
    }
    return fromOk(c);
  }
  for(int i=0;i<7;i++){
    if(i+1 >= u_palN) break;
    float a = A(i), b = A(i+1);
    c = mix(c, toOk(P(i+1, vec3(1.0))), clamp((x - a) / max(b - a, 1e-4), 0.0, 1.0));
  }
  return fromOk(c); }

// chromaticBloom's own cbHash/cbNoise/cbOrb: renamed-only copies of pbakaus/radiant's
// chromatic-bloom.html hash()/noise()/orb() (source lines 58-71 and 91-95). This file already owns
// functions named hash() and noise() with a different formula, so calling those instead would change
// the picture the source draws, which is the porting this was asked not to do; the fix is a name each,
// not a rewrite. filmGrain() from the source is left out: it is declared there but never called (the
// grain the source composites is computed inline in main(), source lines 220-221), so it is dead code
// and skipping it changes nothing.
float cbHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cbNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = cbHash(i), b = cbHash(i+vec2(1.0,0.0)), c = cbHash(i+vec2(0.0,1.0)), d = cbHash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
vec3 cbOrb(vec2 uv, vec2 center, vec3 color, float radius, float intensity){
  float d = length(uv - center);
  float k = 1.0 / (radius*radius);
  float glow = exp(-d*d*k) * intensity;
  return color * glow;
}

// auroraCurtain's own acHash/acNoise/acCurtainLine: renamed-only copies of pbakaus/radiant's
// aurora-curtain.html hash()/noise()/curtainLine() (source lines 63-98). Same reason as cbHash above:
// this file's own hash()/noise() are a different formula.
float acHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float acNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = acHash(i), b = acHash(i+vec2(1.0,0.0)), c = acHash(i+vec2(0.0,1.0)), d = acHash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
vec3 acCurtainLine(vec2 uv, float speed, float freq, vec3 c, float tt){
  uv.x += smoothstep(1.0, 0.0, abs(uv.y)) * sin(tt*speed + uv.y*freq) * 0.2;
  float lw = 0.06 * smoothstep(0.2, 0.9, abs(uv.y));
  float l = smoothstep(lw, 0.0, abs(uv.x) - 0.004);
  float fade = smoothstep(1.0, 0.3, abs(uv.y));
  return l * c * fade;
}

// auroraVeil's own avHash/avHash1/avNoise/avRibbon/avStars/avHexDist/avCrystal: renamed-only copies of
// pbakaus/radiant's aurora-veil.html hash()/hash1()/noise()/auroraRibbon()/bgStars()/hexDist()/
// crystalPattern() (source lines 65-217). fbm() (source lines 81-93) is declared there but never
// called anywhere in the source (the ribbons and the ice pattern each carry their own noise calls
// instead), so it is dead code and skipping it changes nothing, the same omission chromaticBloom
// already made for the source's own filmGrain().
float avHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float avHash1(float n){ return fract(sin(n) * 43758.5453123); }
float avNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = avHash(i), b = avHash(i+vec2(1.0,0.0)), c = avHash(i+vec2(0.0,1.0)), d = avHash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float avRibbon(vec2 uv, float tt, float ribbonX, float ribbonWidth, float waveFreq, float waveAmp, float phase){
  float centerX = ribbonX + sin(tt*0.15 + phase)*0.25;
  float wave1 = sin(uv.y*waveFreq + tt*0.9 + phase) * waveAmp;
  float wave2 = sin(uv.y*waveFreq*2.3 + tt*1.3 + phase*1.7) * waveAmp*0.5;
  float wave3 = sin(uv.y*waveFreq*0.4 + tt*0.35 + phase*0.6) * waveAmp*1.2;
  float wave4 = sin(uv.y*waveFreq*3.7 + tt*1.8 + phase*2.3) * waveAmp*0.2;
  float waveOffset = wave1+wave2+wave3+wave4;
  float dx = uv.x - (centerX + waveOffset);
  float ribbon = exp(-dx*dx/(ribbonWidth*ribbonWidth));
  float brightBand = 0.5+0.5*sin(uv.y*2.5 + tt*0.7 + phase*2.0);
  brightBand *= 0.5+0.5*sin(uv.y*5.0 - tt*0.9 + phase);
  float shimmer = 0.7+0.3*sin(tt*2.5 + phase*3.0 + uv.y*8.0);
  shimmer *= 0.8+0.2*sin(tt*1.7 + phase*1.1 + uv.x*6.0);
  float verticalFade = smoothstep(-0.35,-0.05,uv.y) * smoothstep(0.75,0.35,uv.y);
  float detail = avNoise(vec2(uv.x*6.0, uv.y*10.0 + tt*0.5 + phase));
  detail = 0.6 + 0.4*detail;
  return ribbon*brightBand*verticalFade*detail*shimmer;
}
float avStars(vec2 uv, float tt){
  float stars = 0.0;
  for(int i=0;i<120;i++){
    float fi = float(i);
    vec2 pos = vec2(avHash1(fi*17.31+100.0)*2.8-1.4, avHash1(fi*11.97+200.0)*1.4-0.3);
    float d = length(uv-pos);
    float twinkleSpeed = 0.5 + avHash1(fi*3.3+300.0)*2.0;
    float twinkle = 0.3 + 0.7*sin(tt*twinkleSpeed + fi*2.7);
    twinkle = max(twinkle, 0.0); twinkle *= twinkle;
    float size = 0.0008 + avHash1(fi*5.5+400.0)*0.002;
    float brightness = 0.4 + avHash1(fi*7.7+500.0)*0.6;
    stars += smoothstep(size, 0.0, d) * twinkle * brightness;
    if(brightness > 0.7) stars += smoothstep(size*5.0, 0.0, d) * twinkle * 0.08;
  }
  return stars;
}
float avHexDist(vec2 p){ p = abs(p); return max(p.x + p.y*0.577350269, p.y*1.154700538); }
float avCrystal(vec2 uv, float tt){
  float scale = 12.0;
  vec2 p = uv*scale;
  vec2 r = vec2(1.0, 1.732);
  vec2 h = r*0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 gv = (dot(a,a) < dot(b,b)) ? a : b;
  float hd = avHexDist(gv);
  float edge = smoothstep(0.45,0.40,hd) - smoothstep(0.40,0.35,hd);
  float angle = atan(gv.y, gv.x);
  float branch = abs(sin(angle*3.0));
  float branchLine = smoothstep(0.04,0.0,abs(branch-0.5)*hd);
  branchLine *= smoothstep(0.0,0.15,hd) * smoothstep(0.45,0.25,hd);
  float subBranch = abs(sin(angle*6.0));
  float subLine = smoothstep(0.03,0.0,abs(subBranch-0.5)*hd);
  subLine *= smoothstep(0.1,0.2,hd) * smoothstep(0.4,0.3,hd);
  float crystal = edge*0.6 + branchLine*0.4 + subLine*0.2;
  float shimmer = 0.7 + 0.3*sin(tt*0.2 + avHash(floor(p/r))*6.28);
  crystal *= shimmer;
  return crystal;
}

// laserLabyrinth's own llHash/llHash3/llNoise3d/llFbm/llConeColor: renamed-only copies of
// pbakaus/radiant's laser-labyrinth.html hash()/hash3()/noise3d()/fbm()/coneColor() (source lines
// 55-121).
float llHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float llHash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float llNoise3d(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float n000=llHash3(i), n100=llHash3(i+vec3(1.0,0.0,0.0)), n010=llHash3(i+vec3(0.0,1.0,0.0)), n110=llHash3(i+vec3(1.0,1.0,0.0));
  float n001=llHash3(i+vec3(0.0,0.0,1.0)), n101=llHash3(i+vec3(1.0,0.0,1.0)), n011=llHash3(i+vec3(0.0,1.0,1.0)), n111=llHash3(i+vec3(1.0,1.0,1.0));
  float nx00=mix(n000,n100,f.x), nx10=mix(n010,n110,f.x), nx01=mix(n001,n101,f.x), nx11=mix(n011,n111,f.x);
  float nxy0=mix(nx00,nx10,f.y), nxy1=mix(nx01,nx11,f.y);
  return mix(nxy0,nxy1,f.z);
}
float llFbm(vec3 p){
  float v=0.0, a=0.5; vec3 shift = vec3(100.0);
  for(int i=0;i<4;i++){ v += a*llNoise3d(p); p = p*2.0+shift; a *= 0.5; }
  return v;
}
vec3 llConeColor(int idx, float hueShift){
  vec3 c;
  if(idx==0) c = vec3(1.0, 0.0, 0.5);
  else if(idx==1) c = vec3(0.5, 0.05, 1.0);
  else if(idx==2) c = vec3(0.1, 0.35, 1.0);
  else if(idx==3) c = vec3(0.85, 0.0, 0.85);
  else if(idx==4) c = vec3(0.15, 0.2, 1.0);
  else c = vec3(0.85, 0.93, 1.00);
  float cosA = cos(hueShift), sinA = sin(hueShift);
  float lum = dot(c, vec3(0.299,0.587,0.114));
  vec3 grey = vec3(lum);
  vec3 diff = c - grey;
  vec3 axis1 = normalize(vec3(1.0,-1.0,0.0));
  vec3 axis2 = normalize(vec3(0.5,0.5,-1.0));
  float d1 = dot(diff, axis1), d2 = dot(diff, axis2);
  vec3 rotated = grey + axis1*(d1*cosA - d2*sinA) + axis2*(d1*sinA + d2*cosA);
  return clamp(rotated, 0.0, 1.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float ar = u_res.x/u_res.y;
  vec2 p = vec2(uv.x*ar, uv.y); float t = u_time + u_seed*9.3;
  vec3 c0=P(0,vec3(0.36,0.34,0.86)), c1=P(1,vec3(0.20,0.55,0.55)),
       c2=P(2,vec3(0.95,0.58,0.36)), c3=P(3,vec3(0.84,0.36,0.52));
  vec3 col = vec3(0.0); float alpha = 1.0;

  if(u_fx==0){                                            // flow, soft mesh gradient (the premium one)
    // DRIFT RATES, in radians per second, and they are the whole reason this effect reads as animated.
    // They shipped at 0.06 to 0.11, which is 57 to 105 SECONDS for one traverse, so on a 20 second film
    // flow moved through a fifth of a cycle and rendered as a still gradient. Practitioners building
    // this exact look pace a hero loop at 6 to 12 seconds (gradients.design). These are those numbers
    // multiplied by 5: periods of 11.4 to 20.9s, deliberately just SLOWER than the reference band
    // because a mesh gradient run inside 12s sloshes, and a backdrop that draws the eye has stopped
    // being a backdrop. The layer's own speed prop still scales this; it is now a correction, not a
    // prerequisite. engine-doctrine/CRAFT/PARITY-AUDIT.md, engine-doctrine/MISTAKES.md #542.
    // (No backticks in here: this whole shader is a JS template literal and one would end it.)
    col = mix(c0, c1, smoothstep(0.0,1.0,uv.y));          // gentle base wash
    col = mix(col, c2, blob(p, vec2((0.30+0.16*sin(t*0.50))*ar, 0.34+0.13*cos(t*0.40)), 2.4)*0.8);
    col = mix(col, c3, blob(p, vec2((0.74+0.13*sin(t*0.35+2.1))*ar, 0.64+0.15*cos(t*0.45+1.0)), 2.7)*0.75);
    col = mix(col, c1, blob(p, vec2((0.50+0.20*sin(t*0.30+4.0))*ar, 0.80+0.11*cos(t*0.55+3.0)), 3.0)*0.6);
  } else if(u_fx==1){                                     // aurora, soft undulating curtain
    float w = noise(vec2(p.x*1.1, t*0.07))*0.6 + noise(vec2(p.x*2.2+9.0, t*0.045))*0.4;
    float y = uv.y + (w-0.5)*0.55;
    col = mix(c0, c1, smoothstep(0.12,0.9,y));
    col = mix(col, c2, smoothstep(0.55,1.05,y)*0.55);
    alpha = 0.35 + 0.65*exp(-pow((y-0.55)*2.0, 2.0));
  } else if(u_fx==2){                                     // plasma, gentle two-tone interference
    float v = 0.5 + 0.5*sin(p.x*1.8+t*0.14) + 0.5*sin(p.y*2.0-t*0.11); v *= 0.5;
    col = mix(c0, c2, smoothstep(0.15,0.85,v));
    col = mix(col, c1, 0.35 + 0.35*sin(v*3.14159 + t*0.1));
  } else if(u_fx==3){                                     // drift, big soft bokeh, blended
    col = mix(c0, c1, uv.y) * 0.7;
    for(int i=0;i<7;i++){ float fi=float(i);
      vec2 c = vec2(hash(vec2(fi,u_seed))*ar, fract(hash(vec2(fi*1.7,u_seed)) - t*0.02*(0.5+hash(vec2(fi,9.0)))));
      float r = 0.20 + 0.14*hash(vec2(fi,3.0));
      col = mix(col, P(int(mod(fi,4.0)), c2), blob(p, c, 1.0/(r*r))*0.5); }
  } else if(u_fx==4){                                     // mist, near-still soft haze
    float n = noise(p*1.2 + vec2(t*0.025,-t*0.018))*0.6 + noise(p*0.6 + t*0.012)*0.4;
    col = mix(c0, c1, smoothstep(0.32,0.68,n));
    alpha = 0.5 + 0.4*n;

  // ---- wave 3: analog / retro looks (overlay ON TOP of content) ----
  } else if(u_fx==5){                                     // vhs, scanlines, chroma fringe, tracking band, dropouts
    float tstep = floor(t*12.0);                          // static resamples in steps → tape jitter, not smear
    float scan = 0.5 - 0.5*cos(uv.y*u_res.y*0.9);         // 0 at each scanline centre → darkens
    float band = smoothstep(0.05, 0.0, abs(fract(uv.y*0.5 - t*0.05) - 0.5) - 0.05); // a soft tracking band creeps up
    float snow = noise(vec2(uv.x*260.0, uv.y*260.0 + tstep*13.0));                   // fine static, heavier in the band
    float drop = step(0.991, hash(vec2(floor(uv.y*110.0), tstep))) * (0.4 + band);   // dropout streaks cluster in the band
    vec3 fringe = vec3(smoothstep(0.5, 1.0, snow), 0.0, smoothstep(0.55, 1.0, snow)); // magenta/cyan chroma noise
    vec3 warm = mix(c2, c0, 0.35);                        // tape carries a faint palette warmth
    col = mix(warm * 0.25, fringe, 0.6) + vec3(1.0) * drop;
    alpha = 0.42 * scan + 0.32 * band + 0.22 * snow * band + drop * 0.75;
  } else if(u_fx==6){                                     // crt, phosphor stripe mask, scanlines, vignette, roll bar
    float scan = 0.5 - 0.5*cos(uv.y*u_res.y*1.3);
    float tri = mod(floor(uv.x * u_res.x / 4.0), 3.0);    // 4px phosphor stripes survive compression better than 1px
    vec3 mask = tri < 1.0 ? vec3(1.0, 0.25, 0.25) : tri < 2.0 ? vec3(0.25, 1.0, 0.25) : vec3(0.25, 0.25, 1.0);
    vec2 d = uv - 0.5; float vig = smoothstep(0.35, 0.95, length(vec2(d.x*ar, d.y)) * 1.25); // corner darkening
    float roll = smoothstep(0.05, 0.0, abs(fract(uv.y - t*0.10) - 0.5));                       // a bright refresh bar rolls down
    col = mask * 0.5 + vec3(1.0) * roll * 0.4;
    alpha = 0.26 * scan + 0.30 * vig + roll * 0.22;
  } else if(u_fx==7){                                     // filmGrain, animated grain + dust, luminance-only (no greying)
    float tstep = floor(t*24.0);
    float g = rhash(floor(uv*u_res/2.0) + tstep*11.0) - 0.5;                         // decorrelated per ~2px cell, new each frame → true grain, no stripes
    float dust = step(0.9994, rhash(vec2(floor(uv.x*380.0), floor(uv.y*380.0) + tstep*3.0)));
    col = g > 0.0 ? vec3(1.0) : vec3(0.0);               // bright/dark specks, never mid-grey → keeps contrast
    col += vec3(1.0) * dust;
    alpha = abs(g) * 0.55 + dust * 0.85;
  } else if(u_fx==8){                                     // lightLeak, warm blobs drift in from an edge, looping (palette-aware)
    vec3 lc = vec3(0.0); float a = 0.0;
    for(int i=0;i<3;i++){ float fi=float(i);
      float ph = t*0.05*(0.6 + hash(vec2(fi, u_seed))) + hash(vec2(fi+3.0, u_seed))*6.2831;
      vec2 cc = vec2((0.5 + 0.6*sin(ph))*ar, 0.5 + 0.5*cos(ph*0.8 + fi));
      float b = blob(p, cc, 1.2 + 0.8*hash(vec2(fi, 7.0)));
      lc += P(i, vec3(1.0, 0.55, 0.25)) * b; a = max(a, b);
    }
    col = lc; alpha = clamp(a, 0.0, 1.0) * 0.8;

  // ---- wave 3: distortion-styled veils (self-generated; see header note on why not true warps) ----
  } else if(u_fx==9){                                     // barrel, lens vignette + faint edge chromatic fringe
    vec2 d = uv - 0.5; float r = length(d);               // uv-radial (no ar) → corners fall darkest, like a lens
    float vig = smoothstep(0.42, 0.94, r);
    float rim = smoothstep(0.58, 0.92, r);                // a thin coloured fringe rides only the far edge
    col = vec3(rim*0.55, rim*0.12, rim*0.75) * 0.5;       // faint violet CA, not a magenta wash
    alpha = vig * 0.6;
  } else if(u_fx==10){                                    // heatShimmer, rising warm haze in fine wavy bands
    float n = noise(vec2(p.x*3.0, p.y*2.0 - t*0.7));
    float wv = sin(p.y*40.0 + n*9.0 - t*2.4);             // fine horizontal ripples that rise
    float band = smoothstep(0.25, 0.95, 0.5 + 0.5*wv) * smoothstep(0.0, 0.45, n);
    col = mix(c2, vec3(1.0, 0.84, 0.55), 0.5);            // warm air
    alpha = band * 0.34 * (0.35 + 0.65*(1.0 - uv.y));     // strongest low in frame, thins as it rises
  } else if(u_fx==11){                                    // ripple, gentle water caustics, looping overlapping rings
    float v = 0.0;
    for(int i=0;i<3;i++){ float fi=float(i);
      vec2 cc = vec2((0.3 + 0.4*hash(vec2(fi, u_seed)))*ar, 0.3 + 0.4*hash(vec2(fi+5.0, u_seed)));
      float rr = length(p - cc);
      v += sin(rr*26.0 - t*(1.0 + 0.4*fi)) * exp(-rr*1.5);
    }
    float caust = smoothstep(0.25, 0.9, 0.5 + 0.5*v);
    col = mix(c1, vec3(0.7, 0.85, 1.0), 0.4);            // cool water light
    alpha = caust * 0.24;
  } else if(u_fx==12){                                    // kaleidoscope, mirrored rotating mandala

    vec2 d = uv - 0.5; d.x *= ar; float rad = length(d);
    float ang = atan(d.y, d.x) + t*0.10;
    float seg = 6.2831/6.0;                               // 6-fold symmetry
    ang = abs(mod(ang, seg) - seg*0.5);                   // fold into a mirrored wedge
    vec2 q = vec2(cos(ang), sin(ang)) * rad;
    vec3 kc = mix(c0, c2, 0.5 + 0.5*sin(rad*10.0 - t*0.3));
    kc = mix(kc, c3, blob(q, vec2(0.18, 0.0), 20.0));
    float m = 0.5 + 0.5*sin(q.x*24.0)*sin(q.y*24.0 + t*0.2);
    col = kc; alpha = (0.3 + 0.45*smoothstep(0.2, 0.8, m)) * smoothstep(0.78, 0.08, rad);
  } else if(u_fx==13){                                    // matrixDecode, digital rain: bright heads fall down glyph columns
    float cols = 44.0, rows = 28.0;
    float cx = floor(uv.x*cols), cy = floor(uv.y*rows);
    float speed = 0.18 + 0.5*rhash(vec2(cx, 3.0));       // per-column fall speed (rhash: no banding at big coords)
    float head = fract(rhash(vec2(cx, 7.0)) - t*speed);  // the bright head cell, wraps 1->0 => falls
    float rowy = (cy + 0.5)/rows;
    float below = fract(head - rowy + 1.0);              // 0 at the head, grows along the trailing tail
    float trail = smoothstep(0.55, 0.0, below);          // green tail fades behind the head
    float lead = smoothstep(0.05, 0.0, below);           // near-white leading glyph
    float flick = step(0.45, rhash(vec2(cx, cy + floor(t*7.0))));  // per-cell glyph flicker (stepped time = discrete)
    vec3 body = P(0, vec3(0.16, 0.95, 0.42));            // palette stop 0 tints the rain (default matrix green)
    col = mix(body, vec3(0.75, 1.0, 0.85), lead);
    alpha = (trail*0.65 + lead) * (0.4 + 0.6*flick);
  } else if(u_fx==14){                                     // nebula, deep-field gas clouds with a star dusting
    // Same fbm family as flow/plasma but weighted dark: broad low-frequency clouds, a hot core, and a
    // sparse star field from a hashed grid. Pure in (t, seed) like every member, no accumulation.
    vec2 q = p*1.6 + vec2(t*0.020, -t*0.014);
    float n1 = noise(q), n2 = noise(q*2.3 + 4.0), n3 = noise(q*4.7 - 2.0);
    float cloud = n1*0.55 + n2*0.30 + n3*0.15;
    vec3 nb = mix(c0*0.25, c1, smoothstep(0.35, 0.85, cloud));
    nb = mix(nb, c3, smoothstep(0.62, 0.98, cloud) * 0.65);        // the hot core
    vec2 sg = floor(p*160.0);                                       // star grid
    float star = step(0.997, rhash(sg)) * (0.6 + 0.4*sin(t*2.0 + rhash(sg+9.0)*6.28));
    col = nb + vec3(star);
    alpha = smoothstep(0.18, 0.9, cloud) * 0.85 + star*0.9;
  } else if(u_fx==15){                                    // dotCrawl. The NTSC chroma artifact that crawls along edges
    // A fine diagonal chroma lattice drifting one subcarrier phase per frame, the companion artifact
    // to the shipped vhs/crt pair, which reproduce tracking and phosphor but never this.
    float ph = (p.x + p.y)*180.0 - t*7.0;                           // diagonal subcarrier
    float lat = sin(ph);
    vec3 chroma = vec3(sin(ph), sin(ph + 2.094), sin(ph + 4.188));  // R/G/B 120 degrees apart
    float edge = smoothstep(0.35, 0.95, noise(p*7.0 + t*0.05));     // crawl concentrates on detail
    col = 0.5 + 0.5*chroma;
    alpha = edge * (0.10 + 0.10*abs(lat));
  } else if(u_fx==16){                                    // gateWeave, film dust + gate weave
    // A frame never sits still in a projector gate: the sprockets let it drift a pixel or two, and it
    // is the GATE EDGE moving that the eye reads as weave. This layer cannot move the content beneath
    // it, so the weave is carried by everything it CAN draw. The soft dark frame border, the dust and
    // the hair all ride ONE offset, and the picture appears to float inside it.
    vec2 wv = vec2(sin(t*1.7)*0.0018 + sin(t*0.43 + 1.7)*0.0034,
                   sin(t*2.3 + 1.1)*0.0024 + sin(t*0.61 + 2.2)*0.0042);  // two detuned sines = never repeats visibly
    vec2 q = uv - wv;                                     // draw everything in the weaving frame's space
    float edge = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float gate = smoothstep(0.014, 0.0, edge);            // the gate's soft dark border
    float tstep = floor(t*24.0);                          // dust is re-struck each projected frame, never smeared
    vec2 dc = vec2(floor(q.x*300.0), floor(q.y*300.0) + tstep*7.0);
    float dust = step(0.9986, rhash(dc));
    float dirt = step(0.45, rhash(dc + 31.0));            // emulsion dirt prints black, gate dust prints white
    float hph = floor(t*0.5);                             // a hair catches in the gate for a couple of seconds
    float hon = step(0.7, rhash(vec2(hph, 4.0)));
    float hx = 0.15 + 0.7*rhash(vec2(hph, 8.0));
    float sway = 0.013*sin(q.y*11.0 + t*1.1) + 0.03*(1.0 - q.y);   // hangs from the top edge and quivers
    float hlen = 0.35 + 0.4*rhash(vec2(hph, 12.0));
    float hair = hon * smoothstep(0.0026, 0.0, abs(q.x - (hx + sway))) * step(1.0 - hlen, q.y);
    col = mix(vec3(1.0), vec3(0.02), max(dust*dirt, max(gate, hair)));
    alpha = gate*0.6 + dust*0.85 + hair*0.75;
  } else if(u_fx==17){                                    // domainWarp, marbled ink
    float wt = t*0.05;                                    // the clock, first line (see the bands note)
    // DOMAIN WARPING, and the step that is not obvious: the warp is applied TWICE. f(p) = fbm(p + 4*r)
    // where r = fbm(p + 4*q) and q = fbm(p). One level is a smear; two levels is what folds the field
    // back over itself and produces the filaments. The amplitude 4.0 and the decorrelating offsets
    // (5.2,1.3) (1.7,9.2) (8.3,2.8) (5.4,2.9) are the numbers the technique is always stated with.
    // Each vector's two components MUST use different offsets, or q.x == q.y and the warp is a
    // diagonal smear rather than a flow. Reimplemented from the recipe over our own value-noise fBm.
    vec2 sp = p*2.6;
    vec2 q = vec2(fbm(sp + wt), fbm(sp + vec2(5.2, 1.3) - wt));
    vec2 r = vec2(fbm(sp + 4.0*q + vec2(1.7, 9.2) + wt*0.7),
                  fbm(sp + 4.0*q + vec2(8.3, 2.8) - wt*0.7));
    float f = fbm(sp + 4.0*r);
    col = mix(c0, c1, clamp(f*f*2.4, 0.0, 1.0));
    col = mix(col, c2, clamp(dot(q, q)*0.9, 0.0, 1.0));
    col = mix(col, c3, clamp(r.x*r.x*1.4, 0.0, 1.0));
  } else if(u_fx==18){                                    // voronoi, cellular (Worley) noise
    float vt = t*0.35;                                    // the clock, first line (see the bands note)
    // WORLEY NOISE, one feature point per grid cell, jitter 1.0, and each point orbits its own cell on
    // a sine so the whole field is loopable and pure in t. F1 (the nearest point) gives the cells.
    // The BORDER is the part with a recipe you would not guess: it is not F2 - F1, which bulges near
    // corners. It is the distance to the perpendicular BISECTOR between the winning point and each
    // neighbour, dot(0.5*(mr + d), normalize(d - mr)), which needs a SECOND pass over the neighbours
    // carrying the first pass's winner. Written from that description.
    vec2 g = p*5.0, ip = floor(g), fp = fract(g);
    vec2 mr = vec2(0.0), mid = ip; float md = 8.0;
    for(int j = -1; j <= 1; j++) for(int i = -1; i <= 1; i++){
      vec2 o = vec2(float(i), float(j)), cc = ip + o;
      vec2 pt = o + 0.5 + 0.42*sin(vt + 6.2831853*vec2(hash(cc), hash(cc + 37.0)));
      vec2 d = pt - fp;
      if(dot(d, d) < md){ md = dot(d, d); mr = d; mid = cc; }
    }
    float edge = 8.0;
    for(int j = -2; j <= 2; j++) for(int i = -2; i <= 2; i++){
      vec2 o = vec2(float(i), float(j)), cc = ip + o;
      vec2 pt = o + 0.5 + 0.42*sin(vt + 6.2831853*vec2(hash(cc), hash(cc + 37.0)));
      vec2 d = pt - fp;
      if(dot(mr - d, mr - d) > 1e-5) edge = min(edge, dot(0.5*(mr + d), normalize(d - mr)));
    }
    float id = hash(mid + 11.0);
    col = mix(mix(c0, c1, id), c3, 0.35*smoothstep(0.5, 0.0, sqrt(md)));
    col = mix(col, c2, smoothstep(0.055, 0.0, edge));     // the lit border, one line per shared wall
  } else if(u_fx==19){                                    // metaballs, SDF + polynomial smooth min
    float mt = t*0.4;                                     // the clock, first line (see the bands note)
    // FIVE circles as signed distance functions, merged with the polynomial smin above at k = 0.16.
    // k is a LENGTH in the field's units, so it is the width of the neck two balls make as they meet:
    // too small and they snap together, too large and the whole field is one puddle. The radii and the
    // orbit rates are detuned per ball so the group never returns to the same arrangement on screen.
    vec2 q = vec2(p.x - 0.5*ar, uv.y - 0.5);
    float d = 8.0;
    for(int i = 0; i < 5; i++){
      float fi = float(i);
      vec2 c = 0.26*vec2(sin(mt*(0.6 + 0.13*fi) + fi*2.1), cos(mt*(0.5 + 0.17*fi) + fi*1.3));
      d = smin(d, length(q - c) - (0.105 + 0.028*sin(fi*3.0)), 0.16);
    }
    float body = smoothstep(0.012, -0.03, d);             // the surface, one soft pixel wide
    float core = smoothstep(0.02, -0.12, d);              // the lit interior, so the body has volume
    col = mix(c0, mix(c1, c2, core), body);
    col = mix(col, c3, 0.55*smoothstep(0.06, 0.0, abs(d)));   // a rim on the boundary itself
  } else if(u_fx==20){                                    // bands, a ramp repeated over a scalar field
    float bt = t * 0.06;                                  // the clock, first line, see note below
    vec2  drift = vec2(0.05*sin(t*0.07), 0.03*cos(t*0.05));
    // The clock is on the FIRST line because lib-test reads the opening
    // 600 characters of a branch looking for a use of t, and a long comment can push the only one out
    // of the window. That is the test being positional rather than this code being odd, and putting
    // the drift up top is better code anyway: it is the one thing every term below reads.
    //
    // OUR implementation of a common idiom, written from the maths rather than ported. A repeating
    // ramp over a scalar field, tinted by a gradient, with a light term added: that is how a venetian
    // blind has always been drawn, and jackyzha0/sunlit does the same three ideas in pure CSS.
    float count = u_p.x > 0.0 ? u_p.x : 14.0;
    float ang   = u_p.y * 6.2831853;
    float cs = cos(ang), sn = sin(ang);
    vec2  q  = vec2(p.x - 0.5*ar, uv.y - 0.5);
    // ZOOM, around the LIGHT rather than around the middle, so pushing in goes toward whatever the
    // picture is about instead of always toward the centre of the canvas. It scales the field's
    // coordinates and nothing else, so count keeps meaning bands across the frame at zoom 1 and at
    // zoom 2 you see the same pattern twice the size, not twice as many bands. Written behind a guard
    // because (q - c)/1.0 + c is not bit-for-bit q, and neither an unset dial nor a zoom of exactly
    // one may change a pixel. Skipping the arithmetic at 1 is not a special case, it is the identity.
    vec2  lz = vec2(u_p4.y*ar, u_p4.z + 0.05);
    if (u_p6.w > 0.0 && u_p6.w != 1.0) q = (q - lz)/u_p6.w + lz;
    // THE FIELD THE BANDS RUN OVER. Everything else about this effect is the same whichever one is
    // chosen, which is the whole reason it is one uniform and not three effects: repeat a ramp over a
    // scalar field, tint it with a gradient, add a light. Swapping the field turns vertical panels into
    // concentric arcs into nested rounded rectangles, and those are three different reference images
    // that a single branch now covers.
    //
    //   0  linear   a rotated axis         panels, slats, blinds
    //   1  radial   distance from a point  concentric arcs
    //   2  box      chamfered distance     nested rounded rectangles
    float ax;
    //
    // u_p2.yz is the field's centre as a FRACTION OF THE FRAME from the middle, so 0,0 is the middle
    // and 0.5,0 is the right edge. The x half is multiplied by the aspect here rather than by the
    // caller, because the caller does not know the aspect and the shader does. Zero is still the
    // middle, so nothing that predates this moves.
    if (u_p2.x < 0.5) {
      // NORMALISED to the frame, not to one unit. q.x spans plus and minus ar/2, so on a 16:9 canvas
      // the raw axis ran -0.39..1.39 and across below went negative outside the middle, collapsing
      // the base to c0: for spectrum that is white, and the render showed bands over the left 58%
      // and flat white after. On 9:16 the same expression never reached the edges at all. Dividing by
      // the rotated half-extent maps the axis to exactly 0..1 across the frame at ANY aspect, which is
      // also what makes count mean bands-across-the-frame rather than bands-per-unit.
      float ext = ar*abs(cs) + abs(sn);
      ax = (q.x*cs - q.y*sn)/max(ext, 1e-4) + 0.5;
    } else if (u_p2.x < 1.5) {
      ax = length(q - vec2(u_p2.y*ar, u_p2.z));
    } else if (u_p2.x >= 1.5) {
      // Explicit rather than a bare trailing else: lib-test finds this branch by the LAST trailing else
      // in the shader, so an unlabelled else nested inside it steals the anchor and the test starts
      // reading the wrong 600 characters. Its own comment warns about exactly this class.
      vec2 b = abs(q - vec2(u_p2.y*ar, u_p2.z));
      // A chamfered box distance: max() alone gives a hard square, and mixing in the sum rounds the
      // corner without the cost of a real squircle.
      ax = mix(max(b.x, b.y), (b.x + b.y)*0.75, 0.45);
    }
    // The light is BEHIND the screen, so the field falls off at both edges. A ramp that runs dark to
    // light leaves one side blown out and the picture reads as a wall, not a window: the first version
    // did exactly that.
    float across = 1.0 - abs(ax - 0.5)*2.0;
    vec3  base = mix(c0, mix(c1, c2, smoothstep(0.45, 1.0, across)), smoothstep(0.0, 0.7, across));
    // SMOOTH falloff. 1 - 2*pow(d/r, k) crosses zero and has to be clamped, and the clamp is a hard
    // ellipse edge the eye finds immediately.
    // The light behind the screen drifts, and the screen breathes against it. Slow on purpose: this is
    // a backdrop, and lib-test refuses a frozen one (a still ambient field is a decision, not a default).
    // WHERE THE LIGHT IS. u_p4.yz moves it, as a fraction of the frame from where it used to sit. A
    // light source has a place, and this one was the constant vec2(0.5, 0.55) that no caller could
    // reach: every field made with this effect had its light in the same spot. An offset rather than
    // an absolute position so that zero means unmoved and no committed field changes.
    vec2  lc   = vec2(0.5, 0.55) + u_p4.yz + drift;
    vec2  lv   = vec2((uv.x - lc.x)*ar, uv.y - lc.y);
    // WHAT SHAPE THE LIGHT IS. It was length(), so it was always a circle, and a circle can only put a
    // hot spot in the middle of whatever it lights. Two of the references need something else: a broad
    // horizontal WASH that lights a row of panels evenly, and a dark OVAL sitting behind them. Same
    // three ideas as the band field one term over, so the same distance functions serve.
    //
    //   0  round / oval   an ellipse. u_p5.x is the y radius as a fraction of the x radius, so one
    //                     value covers the circle and both stretches of it.
    //   1  bar            distance along ONE axis only: a band of light, no centre to be hot.
    //   2  rounded        the chamfered box distance the bands already use.
    //
    // u_p5.y turns the whole shape, so a bar can lie across the frame or stand up in it.
    float la   = u_p5.y * 6.2831853;
    vec2  lr   = u_p5.y == 0.0 ? lv : vec2(lv.x*cos(la) - lv.y*sin(la), lv.x*sin(la) + lv.y*cos(la));
    vec2  le   = vec2(lr.x, lr.y / (u_p5.x > 0.0 ? u_p5.x : 1.0));
    //   3  cross          two bars crossing: a shaft through a gap, and the narrow case is a slit.
    //   4  sweep          an ANGLE rather than a distance, so the light is a sector, like a beacon.
    //
    // Two modifiers ride on top of whichever shape is chosen, and both are one operator:
    //   u_p6.x  RING     brightest at a radius instead of at the middle. Turns round into a halo,
    //                    oval into an ellipse of light, bar into a pair of parallel bars.
    //   u_p6.yz STAR     u_p6.y points, u_p6.z depth. An angular squeeze on the distance, so the
    //                    light grows spikes. Depth zero is exactly the unspiked shape.
    float d;
    if (u_p4.w < 0.5) {
      d = length(le);
    } else if (u_p4.w < 1.5) {
      d = abs(le.y);
    } else if (u_p4.w < 2.5) {
      vec2 lb = abs(le);
      d = mix(max(lb.x, lb.y), (lb.x + lb.y)*0.75, 0.45);
    } else if (u_p4.w < 3.5) {
      d = min(abs(le.x), abs(le.y));
    } else if (u_p4.w >= 3.5) {
      d = abs(atan(le.y, le.x)) * 0.31830989;
    }
    d = abs(d - u_p6.x);
    // Guarded, not multiplied by zero: atan(0,0) at the light's exact centre is undefined, and one
    // NaN pixel times a zero depth is still NaN.
    if (u_p6.z != 0.0) d = d * (1.0 + u_p6.z*cos(u_p6.y*atan(le.y, le.x)));
    float rad  = (u_p.z > 0.0 ? u_p.z : 0.62) * (1.0 + 0.06*sin(t*0.09));
    float glow = pow(1.0 - smoothstep(0.0, rad, d), u_p.w > 0.0 ? u_p.w : 1.6);
    // THE BAND COORDINATE. u_p4.x folds it about the field's own middle, so a band's shading runs
    // OUTWARD on both sides instead of one way across the whole picture. Every reference of this
    // family that is symmetric left-to-right needs the fold: an unfolded sawtooth puts its bright
    // side on the same hand of every band, and the eye reads that as a lean rather than as depth.
    float bx   = u_p4.x > 0.5 ? abs(ax - 0.5) : ax;
    float f    = fract(bx * count + 0.02*sin(bt) + u_p3.w);
    // Softened by a fraction of one slat so a high count does not alias into moire when the canvas is
    // scaled. A hard fract() is right in maths and crawls on screen.
    // and the window WIDENS as the bands get thinner on screen, which is what zooming out does. The
    // window is a fixed fraction of a band, so in pixels it shrinks exactly when it is needed most and
    // the moire comes back at the setting people reach for. Zoom 1 and above is the case the 0.35 was
    // chosen for and is left alone; below 1 the window grows in step, to a whole half-band.
    float sw   = u_p6.w > 0.0 && u_p6.w < 1.0 ? min(1.0, 0.35/u_p6.w) : 0.35;
    float soft = smoothstep(0.0, sw, min(f, 1.0 - f) * 2.0);
    float slat = f * mix(0.55, 1.0, soft);
    // u_p2.w is the light's SIGN and strength. Negative darkens, which is one of the references: a
    // dark radial mass sitting BEHIND the panels rather than a glow in front of them. Zero has always
    // meant one, so that an unset vector lit the field; the ramp gradient below is new and can afford
    // the honest reading, where zero means no light at all.
    float lw = u_p3.x >= 0.5 ? u_p2.w : (u_p2.w == 0.0 ? 1.0 : u_p2.w);
    float lit = glow * lw;
    if (u_p3.x < 0.5) {
      col = clamp(base*(0.25 + 0.75*max(lit, 0.0)) + c2*max(lit, 0.0)*0.45
                + c3*max(-lit, 0.0)*0.85 - slat*0.30, 0.0, 1.0);
      col = mix(col, c3, 0.5*smoothstep(0.35, 1.0, 1.0 - across));   // the deep role owns the far edges
    } else if (u_p3.x >= 0.5) {
      // THE GRADIENT ON ITS OWN AXIS. Above, the tint is sampled along ax, the same axis the bands
      // are cut on, so the colour can only ever run the way the slats run. The reference that asked
      // for this has vertical panels and a spectrum falling DOWN the frame, at a right angle to them,
      // and no setting of the branch above reaches it. Same rotation as the band axis, its own angle.
      float ga = u_p3.y * 6.2831853;
      float gx = (q.x*cos(ga) - q.y*sin(ga)) + 0.5;
      // PER-BAND CONVERGENCE, which is what makes this read as depth rather than as stripes. Each
      // band out from the middle shows LESS of the ramp, squeezed toward its centre, the way a column
      // further down a colonnade subtends less of the view. Zero is a flat set of stripes all showing
      // the same gradient, and the difference between zero and a tenth is the whole picture.
      float mid = u_p4.x > 0.5 ? 0.0 : floor(0.5*count + 0.02*sin(bt) + u_p3.w);
      float bi  = abs(floor(bx*count + 0.02*sin(bt) + u_p3.w) - mid);
      // u_p5.w LEANS the step. At zero a band is one flat depth and the whole change happens on the
      // seam; at one the depth climbs back across the band, so each band is itself a small ramp and
      // the seam carries a step of two. The reference has both, and a flat step alone leaves every
      // band reading as a single colour where the picture has a gradient inside each one.
      float sc  = max(0.0, 1.0 - u_p3.z * (bi - u_p5.w * f));
      col = clamp(ramp(0.5 + (gx - 0.5)*sc) - 0.30*slat*u_p5.z
                + max(lit, 0.0)*0.35 - max(-lit, 0.0)*0.35, 0.0, 1.0);
    }
    alpha = 1.0;
  } else if(u_fx==21){                                    // godRays, volumetric light scattering
    float gt = t*0.11;                                    // the clock, first line (see the bands note)
    // TECHNIQUE: Kenny Mitchell, "Volumetric Light Scattering as a Post-Process", GPU Gems 3 ch.13.
    // For each pixel, walk toward the light in screen space, sample an OCCLUDER at every step and sum
    // the samples under an exponential decay. Radial shafts fall out of that sum without anything
    // drawing a shaft: a pixel whose line to the light threads a gap collects light at every step,
    // one whose line runs behind a leaf collects none, and the boundary between the two IS the beam.
    //
    // THE STEP NOBODY GUESSES is the decay. Sum the taps with equal weight and you get a blurred copy
    // of the occluder smeared toward the light, which looks like a mistake. The geometric decay makes
    // a tap's contribution fall with its distance from the pixel, so the shaft is bright where it
    // starts and dissolves into the air, which is what scattering actually does.
    //
    // The occluder is GENERATED, not sampled from the picture: a WebGL layer here composites over its
    // siblings without reading them, so there is nothing beneath to take a silhouette from. Two
    // octaves of drifting noise, thresholded, is a canopy of leaves, and it is the honest version of
    // the effect rather than a claim to be shadowing your content.
    vec3 g0 = P(0, vec3(0.040, 0.055, 0.085));            // the unlit air
    vec3 g1 = P(1, vec3(1.000, 0.870, 0.640));            // the light itself
    vec3 g2 = P(2, vec3(0.290, 0.470, 0.620));            // the cool bounce the shafts sit against
    vec2 lp = vec2((0.34 + 0.05*sin(gt*1.3))*ar, 1.06);   // the source, just off the top edge
    vec2 dl = (lp - p) * (1.0/24.0) * 0.92;               // how far the 24 taps reach toward it
    vec2 sp = p; float acc = 0.0, decay = 1.0;
    for(int i=0;i<24;i++){
      sp += dl;
      // CANOPY FREQUENCY IS THE WHOLE PICTURE, and the first version had it four times too low. Big
      // soft blobs give ONE fat smear of light, because the ray to the light either clears the blob
      // or it does not; there is no second edge inside the frame to cut a second beam. The number of
      // shafts is the number of gaps the occluder puts across the frame, so it is set here and
      // nowhere else.
      float c = noise(sp*6.6 + vec2(gt*1.1, -gt*0.6))*0.66 + noise(sp*14.5 - gt*0.75)*0.34;
      acc += smoothstep(0.40, 0.76, c) * decay;
      decay *= 0.952;
    }
    acc = clamp(acc*0.075, 0.0, 1.15);
    float dl2 = dot(p - lp, p - lp);
    // The bloom is TIGHT. Wide, it swallows the top third of the frame in white and takes the tops of
    // the shafts with it, so the beams appear to start halfway down with no source.
    float glow = exp(-dl2*3.4);                           // the source's own bloom
    float haze = 0.35 + 0.65*exp(-dl2*0.30);              // air thickens toward the light
    // DUST, three sizes of it, each mote circling its own cell so a still frame and a moving one
    // disagree. It is multiplied by acc, so motes only light up where a beam already passes: dust
    // visible in the dark half is what makes a god-ray shot read as a filter laid over the frame.
    float dust = 0.0;
    for(int i=0;i<3;i++){ float fi=float(i);
      vec2 g = p*(11.0+6.0*fi) + vec2(t*0.020*(1.0+fi), -t*0.045);
      vec2 gi = floor(g), gf = fract(g) - 0.5;
      gf += 0.33*vec2(sin(t*0.45 + hash(gi)*6.2832), cos(t*0.37 + hash(gi+7.0)*6.2832));
      dust += smoothstep(0.115, 0.0, length(gf)) * step(0.90, hash(gi + fi*13.0));
    }
    vec3 beam = mix(g2, g1, clamp(acc*0.9, 0.0, 1.0));
    col = mix(g0, g2, 0.35*haze) + beam*(acc*haze + glow*0.55) + g1*dust*acc*0.55;
    alpha = 1.0;
  } else if(u_fx==22){                                    // curlSmoke, a rising plume
    float st = t*0.30;                                    // the clock, first line (see the bands note)
    // CURL NOISE for the flow (see psi/curl above), and a SEMI-LAGRANGIAN BACKTRACE for the smoke.
    //
    // PURITY IS WHY THIS IS WRITTEN THE WAY IT IS, and it is worth reading before the maths. Real
    // smoke advects: frame n is frame n-1 pushed along the velocity field. renderFrame(n) here is
    // SEEKED, frames render out of order across eight workers, and a shader that evolves from its own
    // last frame renders one picture on a run and a different one on a scrub. So the walk runs
    // BACKWARDS instead: from this pixel, step against the flow a fixed number of fixed-size steps,
    // evaluating the field at the time each step belongs to, and ask at every landing whether the
    // emitter was there. Density is the best answer over the whole path, faded by how long ago it
    // was. Same picture a forward simulation gives, and a pure function of (p, t) with nothing
    // remembered. Reaction-diffusion and a true pressure-projected fluid cannot be written this way
    // and are therefore not in this file; this one can, because the flow is analytic.
    //
    // Taking the BEST landing rather than the sum is the correct reading and also the prettier one:
    // a parcel of air either came from the emitter or it did not, and summing softens every filament
    // the curl worked to make.
    vec3 s0 = P(0, vec3(0.025, 0.030, 0.050));            // the room the plume hangs in
    vec3 s1 = P(1, vec3(0.90, 0.30, 0.22));               // the hot near edge
    vec3 s2 = P(2, vec3(0.99, 0.82, 0.52));               // the core
    vec3 s3 = P(3, vec3(0.30, 0.36, 0.55));               // the cold tail, where it has thinned out
    vec2 q = vec2(p.x - 0.5*ar, uv.y);
    float dens = 0.0, age = 0.0, wsum = 0.0;
    for(int i=0;i<14;i++){
      float k = float(i);
      float tk = st - k*0.065;                            // the field AT the time this step belongs to
      vec2 v = curl(q*2.3 + vec2(0.0, -tk*0.55))*0.85 + vec2(0.0, 0.78);   // roll, plus the rise
      q -= v*0.065;
      // THE EMITTER IS PATCHY ON PURPOSE, and this is what separates a plume from a flame. A smooth
      // source makes density fall off monotonically with height: every backtrace low in the frame
      // spends its whole path inside the source, so the core saturates into a flat plateau and the
      // curl only ever wrinkles its outline. Break the source into fine cells and neighbouring paths
      // land in different ones, so the flow pulls them apart into filaments and detached wisps, which
      // is the thing worth having and the reason for the frequency.
      float src = exp(-q.x*q.x*13.0) * smoothstep(0.22, -0.06, q.y);
      src *= smoothstep(0.30, 0.80, noise(q*15.0 + 21.0));
      // A WEIGHTED MEAN, NOT THE BEST LANDING, and this is the one line that decides whether the
      // result reads as smoke. Taking max over a fixed number of steps quantises the answer: each
      // step contributes one distinct level, so the plume came out as ten stacked crescents with hard
      // edges between them, the discretisation made visible. Averaging under the same dissipation
      // weight blends adjacent steps into each other and the contours disappear, at no extra cost.
      float w = exp(-k*0.135);                            // dissipation: older air is thinner
      dens += src*w; age += k*w; wsum += w;
    }
    dens = clamp(dens/wsum * 2.6, 0.0, 1.0);
    age = clamp(age/wsum/13.0 * 1.6, 0.0, 1.0);
    vec3 ink = mix(s1, s2, smoothstep(0.45, 1.00, dens));
    ink = mix(ink, s3, smoothstep(0.30, 0.95, age));      // colour by age, so the tail cools
    col = mix(s0, ink, smoothstep(0.015, 0.42, dens));
    alpha = 1.0;
  } else if(u_fx==23){                                    // chromaticBloom, luminous colour orbs on black
    // LITERAL PORT of pbakaus/radiant's chromatic-bloom.html (MIT, Copyright (c) 2025 Paul Bakaus,
    // https://github.com/pbakaus/radiant, "attribution appreciated but not required" per its README).
    // Orb placement, drift, noise perturbation, vignette and tone mapping (source lines 96-213) are
    // copied as-is, not rewritten into this file's own palette-ramp style. Two omissions, both because
    // this field has to stay a pure function of (t, seed):
    //   - u_driftSpeed (source lines 47, 187, 232) is gone. This engine already scales time by the
    //     layer's own speed prop before any shader sees it (core/surfaces/shader.js: atOf(lt,
    //     LL.speed)), so a second drift-speed dial here would be the same control twice.
    //   - u_mouse (source lines 51, 190, 217-224, 244-257) is gone. There is no pointer in a headless,
    //     seeked renderer; dropping the block reproduces the source's own idle default (mouseX=-1,
    //     under which the block never ran), not a new behaviour.
    // u_grain (source line 49, default 0.5) survives as u_p.x, same default.
    // The shared tail below (desaturate 0.9, u_intensity) still applies here same as every other
    // branch, so this field is not byte-identical to the source's own output, only its structure is.
    float cbg = u_p.x > 0.0 ? u_p.x : 0.5;
    vec2 cbuv = (gl_FragCoord.xy - u_res*0.5) / min(u_res.x, u_res.y);
    vec3 cbcol = vec3(0.0);

    // VIOLET SUBSTITUTION. Source lines 118-122 hardcode cobalt/orange/whiteBlue/amber/teal; this
    // film's palette needs violet and the source has none. orange becomes violet, amber becomes
    // magenta, teal becomes indigo, each the same saturation the source used for its own
    // primaries. cobalt and whiteBlue are untouched, they already read as the cool end of a violet
    // field. Positions, radii, intensities and drift (source lines 124-160) are the source's own
    // numbers, unchanged.
    vec3 cobalt    = vec3(0.03, 0.10, 1.00);
    vec3 violet    = vec3(0.46, 0.05, 0.95);
    vec3 whiteBlue = vec3(0.85, 0.93, 1.00);
    vec3 magenta   = vec3(0.82, 0.08, 0.90);
    vec3 indigo    = vec3(0.22, 0.05, 0.68);

    float n1 = cbNoise(vec2(t*0.37, 1.0))*2.0-1.0;
    float n2 = cbNoise(vec2(t*0.41, 2.3))*2.0-1.0;
    float n3 = cbNoise(vec2(t*0.33, 3.7))*2.0-1.0;
    float n4 = cbNoise(vec2(t*0.29, 5.1))*2.0-1.0;
    float n5 = cbNoise(vec2(t*0.43, 6.9))*2.0-1.0;
    float n6 = cbNoise(vec2(t*0.31, 8.2))*2.0-1.0;
    float n7 = cbNoise(vec2(t*0.39, 9.5))*2.0-1.0;
    float n8 = cbNoise(vec2(t*0.27, 10.8))*2.0-1.0;
    float n9 = cbNoise(vec2(t*0.35, 12.1))*2.0-1.0;
    float n10 = cbNoise(vec2(t*0.45, 13.4))*2.0-1.0;

    vec2 p1 = vec2(cos(t*0.23 + 0.0)*0.55 + n1*0.08, sin(t*0.17 + 0.0)*0.35 + n2*0.06);
    cbcol += cbOrb(cbuv, p1, cobalt, 0.30, 1.6);
    vec2 p2 = vec2(cos(t*0.19 + 2.1)*0.50 + n3*0.09, sin(t*0.25 + 1.4)*0.38 + n4*0.07);
    cbcol += cbOrb(cbuv, p2, violet, 0.28, 1.5);
    vec2 p3 = vec2(cos(t*0.15 + 4.2)*0.42 + n5*0.07, sin(t*0.21 + 3.0)*0.45 + n6*0.06);
    cbcol += cbOrb(cbuv, p3, whiteBlue, 0.26, 1.2);
    vec2 p4 = vec2(sin(t*0.17 + 1.0)*cos(t*0.11 + 0.5)*0.55 + n7*0.08, sin(t*0.13 + 2.5)*0.35 + n8*0.06);
    cbcol += cbOrb(cbuv, p4, magenta, 0.27, 1.3);
    vec2 p5 = vec2(cos(t*0.13 + 5.5)*0.48 + n9*0.07, sin(t*0.19 + 4.8)*0.30 + n10*0.08);
    cbcol += cbOrb(cbuv, p5, indigo, 0.32, 1.2);

    vec3 dimCobalt  = vec3(0.08, 0.15, 0.50);
    vec3 dimViolet1 = vec3(0.22, 0.08, 0.45);
    vec3 dimWhite   = vec3(0.50, 0.55, 0.70);
    vec3 dimMagenta = vec3(0.40, 0.10, 0.45);
    vec3 dimIndigo  = vec3(0.10, 0.08, 0.35);
    vec3 dimViolet2 = vec3(0.25, 0.15, 0.50);
    vec3 dimRose    = vec3(0.55, 0.25, 0.30);

    float sn1 = cbNoise(vec2(t*0.51, 20.0))*2.0-1.0;
    float sn2 = cbNoise(vec2(t*0.47, 21.3))*2.0-1.0;
    float sn3 = cbNoise(vec2(t*0.53, 22.7))*2.0-1.0;
    float sn4 = cbNoise(vec2(t*0.43, 24.1))*2.0-1.0;
    float sn5 = cbNoise(vec2(t*0.49, 25.5))*2.0-1.0;
    float sn6 = cbNoise(vec2(t*0.55, 26.9))*2.0-1.0;
    float sn7 = cbNoise(vec2(t*0.41, 28.3))*2.0-1.0;
    float sn8 = cbNoise(vec2(t*0.57, 29.7))*2.0-1.0;
    float sn9 = cbNoise(vec2(t*0.39, 31.1))*2.0-1.0;
    float sn10 = cbNoise(vec2(t*0.61, 32.5))*2.0-1.0;
    float sn11 = cbNoise(vec2(t*0.37, 33.9))*2.0-1.0;
    float sn12 = cbNoise(vec2(t*0.59, 35.3))*2.0-1.0;
    float sn13 = cbNoise(vec2(t*0.45, 36.7))*2.0-1.0;
    float sn14 = cbNoise(vec2(t*0.63, 38.1))*2.0-1.0;

    vec2 s1 = vec2(cos(t*0.31 + 0.7)*0.45 + sn1*0.08, sin(t*0.27 + 1.2)*0.35 + sn2*0.07);
    cbcol += cbOrb(cbuv, s1, dimCobalt, 0.18, 0.20);
    vec2 s2 = vec2(cos(t*0.25 + 3.1)*0.60 + sn3*0.09, sin(t*0.33 + 2.5)*0.42 + sn4*0.06);
    cbcol += cbOrb(cbuv, s2, dimViolet1, 0.16, 0.18);
    vec2 s3 = vec2(cos(t*0.29 + 5.3)*0.55 + sn5*0.07, sin(t*0.23 + 4.1)*0.45 + sn6*0.08);
    cbcol += cbOrb(cbuv, s3, dimWhite, 0.14, 0.15);
    vec2 s4 = vec2(sin(t*0.21 + 1.8)*0.58 + sn7*0.06, cos(t*0.29 + 0.3)*0.40 + sn8*0.07);
    cbcol += cbOrb(cbuv, s4, dimMagenta, 0.17, 0.18);
    vec2 s5 = vec2(cos(t*0.35 + 2.9)*0.52 + sn9*0.08, sin(t*0.19 + 5.7)*0.48 + sn10*0.06);
    cbcol += cbOrb(cbuv, s5, dimIndigo, 0.15, 0.15);
    vec2 s6 = vec2(cos(t*0.17 + 4.5)*0.62 + sn11*0.07, sin(t*0.31 + 3.3)*0.38 + sn12*0.09);
    cbcol += cbOrb(cbuv, s6, dimViolet2, 0.16, 0.15);
    vec2 s7 = vec2(sin(t*0.27 + 6.1)*cos(t*0.15 + 0.8)*0.50 + sn13*0.06, cos(t*0.23 + 5.0)*0.42 + sn14*0.08);
    cbcol += cbOrb(cbuv, s7, dimRose, 0.14, 0.12);

    float cbvd  = length(cbuv * vec2(1.1, 1.0));
    float cbvig = 1.0 - smoothstep(0.5, 1.1, cbvd);
    cbcol *= cbvig;
    cbcol = max(cbcol, vec3(0.0));
    cbcol = mix(cbcol, sqrt(cbcol), smoothstep(0.6, 1.5, cbcol));

    float cbgrain = fract(sin(dot(gl_FragCoord.xy + fract(u_time)*100.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    cbcol += cbgrain * 0.3 * cbg;

    col = cbcol; alpha = 1.0;
  } else if(u_fx==24){                                    // auroraCurtain, vertical flowing curtain lines
    // LITERAL PORT of pbakaus/radiant's aurora-curtain.html (MIT, Copyright (c) 2025 Paul Bakaus,
    // https://github.com/pbakaus/radiant). The wave math, per-line drift and noise offset (source
    // lines 78-141) are copied as-is. u_waveSpeed (source default 1.0), u_lineCount (default 6),
    // u_amplitude (default 1.0) and u_rotation (default 0.0) are fixed at their own defaults: this
    // engine already scales time by the layer's own speed, and the rest were live-tunable knobs with
    // no reach from scene JSON. u_mouse (source lines 100-104) and u_dragAngle (drag-only) are
    // dropped; the source's own idle default (no mouse, no drag) is what remains.
    // VIOLET SUBSTITUTION: source lines 118-119 hardcode warmAmber/coolTeal; swapped for this film's
    // magenta/cobalt, the same pair chromaticBloom already carries.
    vec2 acuv = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;
    vec3 acMagenta = vec3(0.82, 0.08, 0.90);
    vec3 acCobalt  = vec3(0.03, 0.10, 1.00);
    vec3 accol = vec3(0.0);
    for(int i=0;i<6;i++){
      float fi = float(i);
      float frac = fi/5.0;
      float speed = 0.6 + frac*0.5;
      float freq = 4.0 + frac*2.0;
      vec3 lineCol = mix(acMagenta, acCobalt, frac) * (0.5 + frac*0.5);
      float yBlend = smoothstep(-0.4, 0.5, acuv.y);
      vec3 pixelCol = mix(acMagenta, acCobalt, yBlend) * (0.4 + frac*0.6);
      lineCol = mix(lineCol, pixelCol, 0.6);
      float drift = sin(t*0.15 + fi*1.3) * 0.03;
      float nOff = acNoise(vec2(acuv.y*2.0 + fi*3.7, t*0.1 + fi)) * 0.015;
      accol += acCurtainLine(acuv + vec2(nOff+drift, 0.0), speed, freq, lineCol, t);
    }
    float acvig = 1.0 - dot(acuv, acuv)*0.4;
    accol *= max(acvig, 0.0);
    col = accol; alpha = 1.0;
  } else if(u_fx==25){                                    // auroraVeil, dramatic northern-lights curtains
    // LITERAL PORT of pbakaus/radiant's aurora-veil.html (MIT, Copyright 2025 Paul Bakaus,
    // github.com/pbakaus/radiant). u_mouse and the speed/intensity uniforms dropped, own defaults kept.
    // VIOLET SUBSTITUTION: green/purple/magenta ribbon and glow mixes swapped for chromaticBloom's own
    // cobalt/violet/whiteBlue/magenta/indigo, same pairing shape.
    float avt = t * 0.5;
    vec2 avuv = (gl_FragCoord.xy - u_res*0.5) / min(u_res.x, u_res.y);
    vec3 avcol = vec3(0.012, 0.010, 0.022);
    avcol += vec3(0.012, 0.010, 0.018) * smoothstep(0.5, -0.3, avuv.y);
    float avstarField = avStars(avuv, u_time);
    vec3 avstarColor = vec3(0.9, 0.88, 0.8);
    avcol += avstarColor * avstarField;

    vec3 avCobalt    = vec3(0.03, 0.10, 1.00);
    vec3 avViolet    = vec3(0.46, 0.05, 0.95);
    vec3 avWhiteBlue = vec3(0.85, 0.93, 1.00);
    vec3 avMagenta   = vec3(0.82, 0.08, 0.90);
    vec3 avIndigo    = vec3(0.22, 0.05, 0.68);

    float r1 = avRibbon(avuv, avt, 0.0, 0.22, 2.5, 0.28, 0.0);
    vec3 r1color = mix(avCobalt, avWhiteBlue, 0.5+0.5*sin(avuv.y*3.5+avt*0.3));
    r1color = mix(r1color, avViolet, smoothstep(0.25,0.65,avuv.y)*0.4);

    float r2 = avRibbon(avuv, avt*0.9, 0.35, 0.18, 2.8, 0.24, 2.1);
    vec3 r2color = mix(avCobalt, avIndigo, 0.5+0.5*sin(avuv.y*4.0-avt*0.4+1.0));
    r2color = mix(r2color, avMagenta, smoothstep(0.3,0.6,avuv.y)*0.35);

    float r3 = avRibbon(avuv, avt*0.75, -0.30, 0.16, 3.0, 0.22, 4.3);
    vec3 r3color = mix(avViolet, avMagenta, 0.5+0.5*sin(avuv.y*5.0+avt*0.2+2.0));
    r3color = mix(r3color, avCobalt, smoothstep(0.1,-0.1,avuv.y)*0.3);

    float r4 = avRibbon(avuv, avt*0.6, 0.15, 0.30, 1.8, 0.35, 1.0);
    vec3 r4color = mix(avIndigo, avCobalt, 0.5+0.5*sin(avuv.y*2.0+avt*0.15));

    float r5 = avRibbon(avuv, avt*1.1, -0.10, 0.10, 3.5, 0.18, 5.7);
    vec3 r5color = mix(avWhiteBlue, avViolet, 0.5+0.5*sin(avuv.y*6.0+avt*0.5+3.0));

    float r6 = avRibbon(avuv, avt*0.65, 0.55, 0.14, 2.2, 0.20, 3.5);
    vec3 r6color = mix(avViolet, avMagenta, 0.5+0.5*sin(avuv.y*3.0-avt*0.3+1.5));

    float r7 = avRibbon(avuv, avt*0.5, -0.20, 0.35, 1.5, 0.30, 6.2);
    vec3 r7color = mix(avIndigo, avCobalt, 0.5+0.5*sin(avuv.y*2.5+avt*0.1+4.0));

    float avi1 = r1*1.4, avi2 = r2*1.1, avi3 = r3*0.9, avi4 = r4*0.5, avi5 = r5*0.8, avi6 = r6*0.6, avi7 = r7*0.35;
    vec3 avAuroraLight = r1color*avi1 + r2color*avi2 + r3color*avi3 + r4color*avi4 + r5color*avi5 + r6color*avi6 + r7color*avi7;
    float avpulse = 0.85 + 0.15*sin(avt*0.8)*sin(avt*0.53+1.0);
    avAuroraLight *= avpulse;

    float avglowY = smoothstep(-0.3,0.0,avuv.y) * smoothstep(0.75,0.25,avuv.y);
    float avtotal = avi1+avi2+avi3+avi4+avi5+avi6+avi7;
    vec3 avAtmGlow = mix(vec3(0.06,0.10,0.15), vec3(0.10,0.05,0.14), 0.5+0.5*sin(avt*0.15)) * avglowY * min(avtotal,2.5) * 0.4;
    avcol += avAuroraLight + avAtmGlow;
    avcol -= avstarColor * avstarField * clamp(avtotal*0.5, 0.0, 1.0);

    float avGroundLine = -0.35;
    float avGroundFade = smoothstep(avGroundLine+0.05, avGroundLine-0.15, avuv.y);
    if(avGroundFade > 0.001){
      float perspY = max(0.001, avGroundLine - avuv.y);
      vec2 crystalUV = vec2(avuv.x/(perspY*2.0+0.5), 1.0/(perspY*3.0));
      crystalUV.x += avt*0.02;
      float crystal = avCrystal(crystalUV, u_time);
      vec3 iceColor = vec3(0.06, 0.08, 0.12);
      vec3 iceCrystalColor = vec3(0.18, 0.22, 0.32);
      vec3 iceSurface = mix(iceColor, iceCrystalColor, crystal*0.5);
      vec2 reflUV = vec2(avuv.x, -avuv.y - avGroundLine*2.0);
      float rr1 = avRibbon(reflUV, avt, 0.0, 0.25, 2.5, 0.28, 0.0) * 0.3;
      float rr2 = avRibbon(reflUV, avt*0.9, 0.35, 0.20, 2.8, 0.24, 2.1) * 0.2;
      float rr3 = avRibbon(reflUV, avt*0.75, -0.30, 0.18, 3.0, 0.22, 4.3) * 0.15;
      vec3 reflectionColor = r1color*rr1 + r2color*rr2 + r3color*rr3;
      reflectionColor *= avpulse;
      float reflStrength = smoothstep(0.25, 0.0, perspY) * 0.6;
      float sparkle = pow(crystal, 3.0) * reflStrength;
      vec3 sparkleColor = vec3(0.9, 0.85, 0.7) * sparkle * 0.3;
      iceSurface += reflectionColor*reflStrength + sparkleColor;
      avcol = mix(avcol, iceSurface, avGroundFade);
    }

    float avHorizonDist = abs(avuv.y - avGroundLine);
    float avHorizonGlow = exp(-avHorizonDist*avHorizonDist/0.003);
    vec3 avHorizonColor = mix(vec3(0.08,0.06,0.16), vec3(0.12,0.05,0.18), 0.5+0.5*sin(avt*0.2)) * min(avtotal,3.0)*0.35 + vec3(0.02,0.03,0.04);
    avcol += avHorizonColor * avHorizonGlow;

    float avDist = length(avuv * vec2(0.7, 0.9));
    float avVignette = 1.0 - smoothstep(0.5, 1.5, avDist);
    avcol *= 0.7 + avVignette*0.3;
    avcol = max(avcol, vec3(0.0));
    avcol = pow(avcol, vec3(0.92, 0.95, 0.98));

    col = avcol; alpha = 1.0;
  } else {                                                // laserLabyrinth, volumetric light cones through fog
    // LITERAL PORT of pbakaus/radiant's laser-labyrinth.html (MIT, Copyright 2025 Paul Bakaus,
    // github.com/pbakaus/radiant). u_mouse and the speed/intensity uniforms dropped, own defaults kept.
    // WHITE-BLUE SUBSTITUTION: coneColor idx 5 (a cyan accent) swapped for chromaticBloom's whiteBlue.
    float llt = t * 0.5;
    vec2 llfragUV = gl_FragCoord.xy / u_res;
    float llar = u_res.x / u_res.y;
    vec2 lluv = llfragUV; lluv.x = (lluv.x - 0.5) * llar;

    vec3 llfogCoord = vec3(llfragUV*3.0, llt*0.08);
    llfogCoord.y -= llt*0.03; llfogCoord.x += llt*0.015;
    float llfogDensity = llFbm(llfogCoord);
    vec3 llfogCoord2 = vec3(llfragUV*6.0 + 50.0, llt*0.12);
    llfogCoord2.y -= llt*0.05;
    float llfogDetail = llFbm(llfogCoord2);
    float llfog = llfogDensity*0.5 + llfogDetail*0.5;
    llfog = llfog*llfog*1.5;

    vec3 llcol = vec3(0.0);
    float llhueShift = sin(llt*0.07) * 0.2;
    float llbeat = pow(abs(sin(llt*3.14159265/1.5)), 8.0) * 0.2;

    for(int i=0;i<3;i++){
      float fi = float(i);
      float originX = (fi-1.0)*0.4*llar + sin(llt*0.07 + fi*2.5)*0.1*llar;
      vec2 origin = vec2(originX, 1.05);
      float sweepAmp = 0.4 + fi*0.1;
      float sweepFreq = 0.3 + fi*0.11;
      float theta = sin(llt*sweepFreq*0.7 + fi*1.9) * sweepAmp;
      vec2 dir = vec2(sin(theta), -cos(theta));
      vec2 toPixel = lluv - origin;
      float along = dot(toPixel, dir);
      float perp = abs(toPixel.x*dir.y - toPixel.y*dir.x);
      float halfWidth = 0.13 + fi*0.015;
      float coneWidth = halfWidth*max(along,0.0) + 0.012;
      float inCone = exp(-perp*perp/(coneWidth*coneWidth*0.55));
      inCone *= smoothstep(0.0, 0.08, along);
      inCone *= exp(-along*along*0.15);
      float fogMod = 0.25 + llfog*0.75;
      float volumetric = inCone*fogMod;
      vec3 coneCol = llConeColor(i, llhueShift + fi*0.15);
      llcol += coneCol * volumetric * 0.35 * (1.0 + llbeat);
    }

    for(int i=0;i<3;i++){
      float fi = float(i);
      int colorIdx = i+3;
      float originX = (fi-1.0)*0.5*llar + 0.15*llar + sin(llt*0.1 + fi*3.1 + 1.0)*0.08*llar;
      vec2 origin = vec2(originX, 1.02);
      float sweepAmp = 0.5 + fi*0.08;
      float sweepFreq = 0.4 + fi*0.13;
      float theta = sin(llt*sweepFreq + fi*2.3 + 0.7) * sweepAmp;
      float beatFreq = 1.8 + fi*0.4;
      float snap = pow(abs(sin(llt*beatFreq)), 6.0);
      float snapGate = smoothstep(0.5, 0.85, sin(llt*0.7 + fi*2.094));
      theta += snap*snapGate*0.18*sin(llt*beatFreq*0.5);
      vec2 dir = vec2(sin(theta), -cos(theta));
      vec2 toPixel = lluv - origin;
      float along = dot(toPixel, dir);
      float perp = abs(toPixel.x*dir.y - toPixel.y*dir.x);
      float halfWidth = 0.11 + fi*0.012;
      float coneWidth = halfWidth*max(along,0.0) + 0.01;
      float inCone = exp(-perp*perp/(coneWidth*coneWidth*0.4));
      float coreLine = exp(-perp*perp/(coneWidth*coneWidth*0.04));
      inCone = inCone + coreLine*0.4;
      inCone *= smoothstep(0.0, 0.06, along);
      inCone *= exp(-along*along*0.1);
      float fogMod = 0.2 + llfog*0.8;
      float volumetric = inCone*fogMod;
      vec3 coneCol = llConeColor(colorIdx, llhueShift + fi*0.15 + 0.5);
      llcol += coneCol * volumetric * 0.75 * (1.0 + llbeat);
    }

    float llbrightness = dot(llcol, vec3(0.299,0.587,0.114));
    float llwhiteBlend = smoothstep(0.4, 1.2, llbrightness);
    llcol = mix(llcol, vec3(llbrightness*1.3), llwhiteBlend*0.5);

    float llgroundHaze = smoothstep(0.2, 0.0, llfragUV.y);
    float llhazeFog = llFbm(vec3(llfragUV.x*4.0, llfragUV.y*2.0, llt*0.05 + 10.0));
    llcol += llcol * llgroundHaze * 0.3;
    llcol += vec3(0.06, 0.03, 0.1) * llgroundHaze * llhazeFog;

    llcol = 1.0 - exp(-llcol * 2.0);
    float llgrain = llHash(gl_FragCoord.xy + fract(u_time)*100.0) * 0.04 - 0.02;
    llcol += llgrain;

    vec2 llvigUV = llfragUV - 0.5;
    float llvigDist = dot(llvigUV, llvigUV);
    float llvig = clamp(1.0 - llvigDist*0.8, 0.0, 1.0);
    llcol *= llvig;
    llcol = clamp(llcol, 0.0, 1.0);

    col = llcol; alpha = 1.0;
  } col = mix(vec3(dot(col, vec3(0.333))), col, 0.9);       // slight desaturate → premium, not garish
  col *= (0.6 + 0.4*u_intensity);
  alpha *= clamp(u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(col*alpha, alpha);
}`;

function compileAmbientProgram(gl) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('ambient shader: ' + gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  return prog;
}

function setupAmbientQuad(gl, prog) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

function setAmbientVec4(gl, loc, params) {
  const V4 = params || [0, 0, 0, 0];
  gl.uniform4f(loc, V4[0] || 0, V4[1] || 0, V4[2] || 0, V4[3] || 0);
}

function getAmbientUniforms(gl, prog) {
  return { res: gl.getUniformLocation(prog, 'u_res'), time: gl.getUniformLocation(prog, 'u_time'),
    seed: gl.getUniformLocation(prog, 'u_seed'), fx: gl.getUniformLocation(prog, 'u_fx'),
    pal: gl.getUniformLocation(prog, 'u_pal'), palN: gl.getUniformLocation(prog, 'u_palN'),
    palAt: gl.getUniformLocation(prog, 'u_palAt'),
    intensity: gl.getUniformLocation(prog, 'u_intensity'),
    p: gl.getUniformLocation(prog, 'u_p'),
    p2: gl.getUniformLocation(prog, 'u_p2'),
    p3: gl.getUniformLocation(prog, 'u_p3'),
    p4: gl.getUniformLocation(prog, 'u_p4'),
    p5: gl.getUniformLocation(prog, 'u_p5'),
    p6: gl.getUniformLocation(prog, 'u_p6') };
}

export function createAmbientLayer(w = 1920, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = glContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }, 'ambient shader field');
  const prog = compileAmbientProgram(gl);
  setupAmbientQuad(gl, prog);
  const U = getAmbientUniforms(gl, prog);
  gl.viewport(0, 0, w, h); gl.uniform2f(U.res, w, h);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return {
    canvas,
    // `params` is the per-effect vector. Absent means four zeros, which every branch written before it
    // ignores, so adding it changed no pixel of the seventeen that came first.
    draw(fx, time, seed = 0, palette = null, intensity = 0.35, params = null, params2 = null, params3 = null, params4 = null, params5 = null, params6 = null) {
      const idx = AMBIENT_FX.indexOf(fx); if (idx < 0) return;
      gl.useProgram(prog);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.time, time); gl.uniform1f(U.seed, seed); gl.uniform1i(U.fx, idx);
      gl.uniform1f(U.intensity, intensity);
      setAmbientVec4(gl, U.p, params);
      setAmbientVec4(gl, U.p2, params2);
      setAmbientVec4(gl, U.p3, params3);
      setAmbientVec4(gl, U.p4, params4);
      setAmbientVec4(gl, U.p5, params5);
      setAmbientVec4(gl, U.p6, params6);
      const flat = new Float32Array(24); const n = palette ? Math.min(8, palette.length) : 0;
      for (let i = 0; i < n; i++) { flat[i * 3] = palette[i][0]; flat[i * 3 + 1] = palette[i][1]; flat[i * 3 + 2] = palette[i][2]; }
      // A stop may carry its own position as a fourth number, not a parallel array (which could drift
      // out of order). All stops or none: a half-positioned palette would need its gaps guessed at.
      const at = new Float32Array(8);
      const given = palette ? palette.filter((c) => c.length > 3).length : 0;
      if (given && given !== n) throw new Error(`palette stop positions: ${given} of ${n} stops carry one. Give every stop a position or none.`);
      if (!given) at[0] = -1;   // sentinel the shader reads as "even"
      else for (let i = 0; i < n; i++) at[i] = palette[i][3];
      for (let i = 1; i < n; i++) {
        if (!(at[i] >= at[i - 1])) throw new Error(`palette stop positions must not go backwards: stop ${i + 1} is at ${at[i]}, after ${at[i - 1]}.`);
      }
      gl.uniform3fv(U.pal, flat); gl.uniform1i(U.palN, n); gl.uniform1fv(U.palAt, at);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // Wipes the buffer off-window, so the canvas holds a function of t, not whichever frame a worker
    // happened to draw last (core/layers/shader.js).
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}

// Registered so a name in the wrong slot is diagnosed rather than merely rejected, and so `make
// arsenal` describes a field (via AMBIENT_SHADERS) instead of only naming it.
export const AMBIENT_REGISTRY = defineRegistry('ambient shader', Object.fromEntries(AMBIENT_FX.map((n) => [n, n])), { slot: 'shader', blurbs: AMBIENT_SHADERS, aka: AMBIENT_AKA,
  catalog: {
    title: 'Ambient shader fields',
    tag: 'per-frame',
    intro: '`{ "type":"shader", "shader":"<name>" }`. A full-frame generative field, pure in t, palette-tintable via `colors`. Sits behind content; no sampler, so it cannot read what is under it.',
    usage: (n, { full }) => full({ type: 'shader', shader: n }),
    preview: (n, { base, OVER }) => base({ layers: [{ type: 'shader', shader: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  },
});
