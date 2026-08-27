import { glContext } from './webgl.js';
import { defineRegistry } from './registry.js';
// core/shaders-ambient.js: smooth LOOPING ambient shaders for the `shader` layer primitive. Where
// core/stings.js is transient cut-covers, these are continuous, slow, low-contrast colour fields you
// place behind content. Pure in (time, seed) so renderFrame(n) stays deterministic.
//
// BEAUTY RECIPE (why these look premium, not like noise soup):
//   • FEW colours (2-4 palette stops), never a rainbow.
//   • VERY LOW frequency: a handful of big soft gaussian blobs, not high-octave fbm.
//   • Blobs DRIFT slowly (sin/cos on small coefficients) and BLEND (mix by exp falloff) → mesh gradient.
//   • Slight desaturation + intensity as a brightness dial. No hard edges anywhere.
//
// WAVE 3 adds an analog/retro + distortion-styled family. These are OVERLAY looks: place them ON TOP
// of content (high track) at intensity ~0.6-0.9, not behind it. Because this layer composites over its
// siblings without sampling them (a WebGL canvas cannot read the DOM beneath it), the "distortion"
// members are honestly self-generated veils. A heat-haze shimmer, water caustics, a lens vignette,
// a mirrored mandala, not true screen-space warps of the pixels below. All still pure in (time, seed).
//   Persistent:  vhs (tracking/chroma/scanlines) · crt (phosphor mask + roll) · filmGrain (grain+dust)
//                · lightLeak (looping warm blobs from an edge, palette-aware)
//   Distortion:  barrel (lens vignette + edge chromatic aberration) · heatShimmer (rising warm haze)
//                · ripple (gentle water caustics) · kaleidoscope (mirrored rotating mandala)
//   Projector:   gateWeave (film dust, hairs, and the frame drifting in the gate)
// EACH FIELD DESCRIBES ITSELF, and the ORDER IS THE WIRE FORMAT: the index of a name here is the
// `u_fx` the fragment shader branches on, so this map is read positionally as well as by key and a
// name may not be moved or inserted mid-list. It was a bare array, so 17 of the 18 rendered their
// blurb as an em-dash in docs/EFFECTS.md and on the site. A capability an author is never shown and
// therefore never reaches for. Same shape as THREE_SCENES (core/three-scenes.js): the map is the
// source, the array is derived, and the two cannot drift because one is computed from the other.
export const AMBIENT_SHADERS = {
  flow: 'a soft mesh gradient: three big blobs drifting slowly over a vertical wash, the premium default',
  aurora: 'drifting colour aurora (moves)',
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
  bands: 'a ramp repeated over a scalar field (rotated panels, concentric arcs or nested rounded boxes) tinted by a gradient with a shaped light behind it. the most dialled effect here; docs/LIGHTFIELD.md',
};
export const AMBIENT_FX = Object.keys(AMBIENT_SHADERS);

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

void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float ar = u_res.x/u_res.y;
  vec2 p = vec2(uv.x*ar, uv.y); float t = u_time + u_seed*9.3;
  vec3 c0=P(0,vec3(0.36,0.34,0.86)), c1=P(1,vec3(0.20,0.55,0.55)),
       c2=P(2,vec3(0.95,0.58,0.36)), c3=P(3,vec3(0.84,0.36,0.52));
  vec3 col = vec3(0.0); float alpha = 1.0;

  if(u_fx==0){                                            // flow, soft mesh gradient (the premium one)
    col = mix(c0, c1, smoothstep(0.0,1.0,uv.y));          // gentle base wash
    col = mix(col, c2, blob(p, vec2((0.30+0.16*sin(t*0.10))*ar, 0.34+0.13*cos(t*0.08)), 2.4)*0.8);
    col = mix(col, c3, blob(p, vec2((0.74+0.13*sin(t*0.07+2.1))*ar, 0.64+0.15*cos(t*0.09+1.0)), 2.7)*0.75);
    col = mix(col, c1, blob(p, vec2((0.50+0.20*sin(t*0.06+4.0))*ar, 0.80+0.11*cos(t*0.11+3.0)), 3.0)*0.6);
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
  } else {                                                // bands, a ramp repeated over a scalar field
    float bt = t * 0.06;                                  // the clock, first line, see note below
    vec2  drift = vec2(0.05*sin(t*0.07), 0.03*cos(t*0.05));
    // Index 17, the trailing else. The clock is on the FIRST line because lib-test reads the opening
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
  } col = mix(vec3(dot(col, vec3(0.333))), col, 0.9);       // slight desaturate → premium, not garish
  col *= (0.6 + 0.4*u_intensity);
  alpha *= clamp(u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(col*alpha, alpha);
}`;

export function createAmbientLayer(w = 1920, h = 1080) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = glContext(canvas, { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }, 'ambient shader field');
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
    palAt: gl.getUniformLocation(prog, 'u_palAt'),
    intensity: gl.getUniformLocation(prog, 'u_intensity'),
    p: gl.getUniformLocation(prog, 'u_p'),
    p2: gl.getUniformLocation(prog, 'u_p2'),
    p3: gl.getUniformLocation(prog, 'u_p3'),
    p4: gl.getUniformLocation(prog, 'u_p4'),
    p5: gl.getUniformLocation(prog, 'u_p5'),
    p6: gl.getUniformLocation(prog, 'u_p6') };
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
      const P4 = params || [0, 0, 0, 0];
      gl.uniform4f(U.p, P4[0] || 0, P4[1] || 0, P4[2] || 0, P4[3] || 0);
      const Q4 = params2 || [0, 0, 0, 0];
      gl.uniform4f(U.p2, Q4[0] || 0, Q4[1] || 0, Q4[2] || 0, Q4[3] || 0);
      const R4 = params3 || [0, 0, 0, 0];
      gl.uniform4f(U.p3, R4[0] || 0, R4[1] || 0, R4[2] || 0, R4[3] || 0);
      const S4 = params4 || [0, 0, 0, 0];
      gl.uniform4f(U.p4, S4[0] || 0, S4[1] || 0, S4[2] || 0, S4[3] || 0);
      const T4 = params5 || [0, 0, 0, 0];
      gl.uniform4f(U.p5, T4[0] || 0, T4[1] || 0, T4[2] || 0, T4[3] || 0);
      const V4 = params6 || [0, 0, 0, 0];
      gl.uniform4f(U.p6, V4[0] || 0, V4[1] || 0, V4[2] || 0, V4[3] || 0);
      const flat = new Float32Array(24); const n = palette ? Math.min(8, palette.length) : 0;
      for (let i = 0; i < n; i++) { flat[i * 3] = palette[i][0]; flat[i * 3 + 1] = palette[i][1]; flat[i * 3 + 2] = palette[i][2]; }
      // A stop MAY carry its own position along the ramp as a fourth number. It rides on the stop
      // rather than arriving as a parallel array, because a parallel array is a second thing to keep
      // in the same order and that is how a palette ends up wearing someone else's spacing.
      //
      // All of them or none of them. A half-positioned palette has no honest reading: the unset stops
      // would have to be guessed at, and guessing is what puts a colour somewhere nobody asked for.
      const at = new Float32Array(8);
      const given = palette ? palette.filter((c) => c.length > 3).length : 0;
      if (given && given !== n) throw new Error(`palette stop positions: ${given} of ${n} stops carry one. Give every stop a position or none.`);
      // -1 is the sentinel the shader reads as "even". Computing the even values here instead would
      // change the arithmetic, and with it the picture, for every field that never asked.
      if (!given) at[0] = -1;
      else for (let i = 0; i < n; i++) at[i] = palette[i][3];
      for (let i = 1; i < n; i++) {
        if (!(at[i] >= at[i - 1])) throw new Error(`palette stop positions must not go backwards: stop ${i + 1} is at ${at[i]}, after ${at[i - 1]}.`);
      }
      gl.uniform3fv(U.pal, flat); gl.uniform1i(U.palN, n); gl.uniform1fv(U.palAt, at);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // wipe the buffer when the layer is off-window, so the canvas holds a function of t and not of
    // whichever frame a worker happened to draw last (core/layers/shader.js).
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a ambient shader" when someone writes it somewhere else. core/registry.js.
export const AMBIENT_REGISTRY = defineRegistry('ambient shader', Object.fromEntries(AMBIENT_FX.map((n) => [n, n])), { slot: 'shader' });
