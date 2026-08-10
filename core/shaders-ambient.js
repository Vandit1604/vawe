// core/shaders-ambient.js — smooth LOOPING ambient shaders for the `shader` layer primitive. Where
// core/stings.js is transient cut-covers, these are continuous, slow, low-contrast colour fields you
// place behind content. Pure in (time, seed) so renderFrame(n) stays deterministic.
//
// BEAUTY RECIPE (why these look premium, not like noise soup):
//   • FEW colours (2-4 palette stops), never a rainbow.
//   • VERY LOW frequency — a handful of big soft gaussian blobs, not high-octave fbm.
//   • Blobs DRIFT slowly (sin/cos on small coefficients) and BLEND (mix by exp falloff) → mesh gradient.
//   • Slight desaturation + intensity as a brightness dial. No hard edges anywhere.
//
// WAVE 3 adds an analog/retro + distortion-styled family. These are OVERLAY looks: place them ON TOP
// of content (high track) at intensity ~0.6-0.9, not behind it. Because this layer composites over its
// siblings without sampling them (a WebGL canvas cannot read the DOM beneath it), the "distortion"
// members are honestly self-generated veils — a heat-haze shimmer, water caustics, a lens vignette,
// a mirrored mandala — not true screen-space warps of the pixels below. All still pure in (time, seed).
//   Persistent:  vhs (tracking/chroma/scanlines) · crt (phosphor mask + roll) · filmGrain (grain+dust)
//                · lightLeak (looping warm blobs from an edge, palette-aware)
//   Distortion:  barrel (lens vignette + edge chromatic aberration) · heatShimmer (rising warm haze)
//                · ripple (gentle water caustics) · kaleidoscope (mirrored rotating mandala)
//   Projector:   gateWeave (film dust, hairs, and the frame drifting in the gate)
export const AMBIENT_FX = ['flow', 'aurora', 'plasma', 'drift', 'mist', 'vhs', 'crt', 'filmGrain', 'lightLeak', 'barrel', 'heatShimmer', 'ripple', 'kaleidoscope', 'matrixDecode', 'nebula', 'dotCrawl', 'gateWeave', 'blinds'];

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_seed; uniform int u_fx;
uniform vec3 u_pal[4]; uniform int u_palN; uniform float u_intensity;
// Per-effect parameters. The shared set had none, so an effect wanting more than one knob had to
// encode it into u_seed, which makes the seed mean two things. Four floats meaning whatever the branch
// that reads them says, and ignored by the seventeen branches written before it.
uniform vec4 u_p;
// A second parameter vector, for effects that outgrew the first. Same contract, same indifference
// from every branch that does not read it.
uniform vec4 u_p2;

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
  return u_palN>3 ? u_pal[3] : df; }
float blob(vec2 p, vec2 c, float s){ vec2 d=p-c; return exp(-dot(d,d)*s); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res; float ar = u_res.x/u_res.y;
  vec2 p = vec2(uv.x*ar, uv.y); float t = u_time + u_seed*9.3;
  vec3 c0=P(0,vec3(0.36,0.34,0.86)), c1=P(1,vec3(0.20,0.55,0.55)),
       c2=P(2,vec3(0.95,0.58,0.36)), c3=P(3,vec3(0.84,0.36,0.52));
  vec3 col = vec3(0.0); float alpha = 1.0;

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
  } else if(u_fx==4){                                     // mist — near-still soft haze
    float n = noise(p*1.2 + vec2(t*0.025,-t*0.018))*0.6 + noise(p*0.6 + t*0.012)*0.4;
    col = mix(c0, c1, smoothstep(0.32,0.68,n));
    alpha = 0.5 + 0.4*n;

  // ---- wave 3: analog / retro looks (overlay ON TOP of content) ----
  } else if(u_fx==5){                                     // vhs — scanlines, chroma fringe, tracking band, dropouts
    float tstep = floor(t*12.0);                          // static resamples in steps → tape jitter, not smear
    float scan = 0.5 - 0.5*cos(uv.y*u_res.y*0.9);         // 0 at each scanline centre → darkens
    float band = smoothstep(0.05, 0.0, abs(fract(uv.y*0.5 - t*0.05) - 0.5) - 0.05); // a soft tracking band creeps up
    float snow = noise(vec2(uv.x*260.0, uv.y*260.0 + tstep*13.0));                   // fine static, heavier in the band
    float drop = step(0.991, hash(vec2(floor(uv.y*110.0), tstep))) * (0.4 + band);   // dropout streaks cluster in the band
    vec3 fringe = vec3(smoothstep(0.5, 1.0, snow), 0.0, smoothstep(0.55, 1.0, snow)); // magenta/cyan chroma noise
    vec3 warm = mix(c2, c0, 0.35);                        // tape carries a faint palette warmth
    col = mix(warm * 0.25, fringe, 0.6) + vec3(1.0) * drop;
    alpha = 0.42 * scan + 0.32 * band + 0.22 * snow * band + drop * 0.75;
  } else if(u_fx==6){                                     // crt — phosphor stripe mask, scanlines, vignette, roll bar
    float scan = 0.5 - 0.5*cos(uv.y*u_res.y*1.3);
    float tri = mod(floor(uv.x * u_res.x / 4.0), 3.0);    // 4px phosphor stripes survive compression better than 1px
    vec3 mask = tri < 1.0 ? vec3(1.0, 0.25, 0.25) : tri < 2.0 ? vec3(0.25, 1.0, 0.25) : vec3(0.25, 0.25, 1.0);
    vec2 d = uv - 0.5; float vig = smoothstep(0.35, 0.95, length(vec2(d.x*ar, d.y)) * 1.25); // corner darkening
    float roll = smoothstep(0.05, 0.0, abs(fract(uv.y - t*0.10) - 0.5));                       // a bright refresh bar rolls down
    col = mask * 0.5 + vec3(1.0) * roll * 0.4;
    alpha = 0.26 * scan + 0.30 * vig + roll * 0.22;
  } else if(u_fx==7){                                     // filmGrain — animated grain + dust, luminance-only (no greying)
    float tstep = floor(t*24.0);
    float g = rhash(floor(uv*u_res/2.0) + tstep*11.0) - 0.5;                         // decorrelated per ~2px cell, new each frame → true grain, no stripes
    float dust = step(0.9994, rhash(vec2(floor(uv.x*380.0), floor(uv.y*380.0) + tstep*3.0)));
    col = g > 0.0 ? vec3(1.0) : vec3(0.0);               // bright/dark specks, never mid-grey → keeps contrast
    col += vec3(1.0) * dust;
    alpha = abs(g) * 0.55 + dust * 0.85;
  } else if(u_fx==8){                                     // lightLeak — warm blobs drift in from an edge, looping (palette-aware)
    vec3 lc = vec3(0.0); float a = 0.0;
    for(int i=0;i<3;i++){ float fi=float(i);
      float ph = t*0.05*(0.6 + hash(vec2(fi, u_seed))) + hash(vec2(fi+3.0, u_seed))*6.2831;
      vec2 cc = vec2((0.5 + 0.6*sin(ph))*ar, 0.5 + 0.5*cos(ph*0.8 + fi));
      float b = blob(p, cc, 1.2 + 0.8*hash(vec2(fi, 7.0)));
      lc += P(i, vec3(1.0, 0.55, 0.25)) * b; a = max(a, b);
    }
    col = lc; alpha = clamp(a, 0.0, 1.0) * 0.8;

  // ---- wave 3: distortion-styled veils (self-generated; see header note on why not true warps) ----
  } else if(u_fx==9){                                     // barrel — lens vignette + faint edge chromatic fringe
    vec2 d = uv - 0.5; float r = length(d);               // uv-radial (no ar) → corners fall darkest, like a lens
    float vig = smoothstep(0.42, 0.94, r);
    float rim = smoothstep(0.58, 0.92, r);                // a thin coloured fringe rides only the far edge
    col = vec3(rim*0.55, rim*0.12, rim*0.75) * 0.5;       // faint violet CA, not a magenta wash
    alpha = vig * 0.6;
  } else if(u_fx==10){                                    // heatShimmer — rising warm haze in fine wavy bands
    float n = noise(vec2(p.x*3.0, p.y*2.0 - t*0.7));
    float wv = sin(p.y*40.0 + n*9.0 - t*2.4);             // fine horizontal ripples that rise
    float band = smoothstep(0.25, 0.95, 0.5 + 0.5*wv) * smoothstep(0.0, 0.45, n);
    col = mix(c2, vec3(1.0, 0.84, 0.55), 0.5);            // warm air
    alpha = band * 0.34 * (0.35 + 0.65*(1.0 - uv.y));     // strongest low in frame, thins as it rises
  } else if(u_fx==11){                                    // ripple — gentle water caustics, looping overlapping rings
    float v = 0.0;
    for(int i=0;i<3;i++){ float fi=float(i);
      vec2 cc = vec2((0.3 + 0.4*hash(vec2(fi, u_seed)))*ar, 0.3 + 0.4*hash(vec2(fi+5.0, u_seed)));
      float rr = length(p - cc);
      v += sin(rr*26.0 - t*(1.0 + 0.4*fi)) * exp(-rr*1.5);
    }
    float caust = smoothstep(0.25, 0.9, 0.5 + 0.5*v);
    col = mix(c1, vec3(0.7, 0.85, 1.0), 0.4);            // cool water light
    alpha = caust * 0.24;
  } else if(u_fx==12){                                    // kaleidoscope — mirrored rotating mandala

    vec2 d = uv - 0.5; d.x *= ar; float rad = length(d);
    float ang = atan(d.y, d.x) + t*0.10;
    float seg = 6.2831/6.0;                               // 6-fold symmetry
    ang = abs(mod(ang, seg) - seg*0.5);                   // fold into a mirrored wedge
    vec2 q = vec2(cos(ang), sin(ang)) * rad;
    vec3 kc = mix(c0, c2, 0.5 + 0.5*sin(rad*10.0 - t*0.3));
    kc = mix(kc, c3, blob(q, vec2(0.18, 0.0), 20.0));
    float m = 0.5 + 0.5*sin(q.x*24.0)*sin(q.y*24.0 + t*0.2);
    col = kc; alpha = (0.3 + 0.45*smoothstep(0.2, 0.8, m)) * smoothstep(0.78, 0.08, rad);
  } else if(u_fx==13){                                    // matrixDecode — digital rain: bright heads fall down glyph columns
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
  } else if(u_fx==14){                                     // nebula — deep-field gas clouds with a star dusting
    // Same fbm family as flow/plasma but weighted dark: broad low-frequency clouds, a hot core, and a
    // sparse star field from a hashed grid. Pure in (t, seed) like every member — no accumulation.
    vec2 q = p*1.6 + vec2(t*0.020, -t*0.014);
    float n1 = noise(q), n2 = noise(q*2.3 + 4.0), n3 = noise(q*4.7 - 2.0);
    float cloud = n1*0.55 + n2*0.30 + n3*0.15;
    vec3 nb = mix(c0*0.25, c1, smoothstep(0.35, 0.85, cloud));
    nb = mix(nb, c3, smoothstep(0.62, 0.98, cloud) * 0.65);        // the hot core
    vec2 sg = floor(p*160.0);                                       // star grid
    float star = step(0.997, rhash(sg)) * (0.6 + 0.4*sin(t*2.0 + rhash(sg+9.0)*6.28));
    col = nb + vec3(star);
    alpha = smoothstep(0.18, 0.9, cloud) * 0.85 + star*0.9;
  } else if(u_fx==15){                                    // dotCrawl — the NTSC chroma artifact that crawls along edges
    // A fine diagonal chroma lattice drifting one subcarrier phase per frame — the companion artifact
    // to the shipped vhs/crt pair, which reproduce tracking and phosphor but never this.
    float ph = (p.x + p.y)*180.0 - t*7.0;                           // diagonal subcarrier
    float lat = sin(ph);
    vec3 chroma = vec3(sin(ph), sin(ph + 2.094), sin(ph + 4.188));  // R/G/B 120 degrees apart
    float edge = smoothstep(0.35, 0.95, noise(p*7.0 + t*0.05));     // crawl concentrates on detail
    col = 0.5 + 0.5*chroma;
    alpha = edge * (0.10 + 0.10*abs(lat));
  } else if(u_fx==16){                                    // gateWeave — film dust + gate weave
    // A frame never sits still in a projector gate: the sprockets let it drift a pixel or two, and it
    // is the GATE EDGE moving that the eye reads as weave. This layer cannot move the content beneath
    // it, so the weave is carried by everything it CAN draw — the soft dark frame border, the dust and
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
  } else {                                                // blinds — light through a slatted screen
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
    if (u_p2.x < 0.5) {
      ax = (q.x*cs - q.y*sn) + 0.5;
    } else if (u_p2.x < 1.5) {
      ax = length(q - vec2(u_p2.y, u_p2.z));
    } else if (u_p2.x >= 1.5) {
      // Explicit rather than a bare trailing else: lib-test finds this branch by the LAST trailing else
      // in the shader, so an unlabelled else nested inside it steals the anchor and the test starts
      // reading the wrong 600 characters. Its own comment warns about exactly this class.
      vec2 b = abs(q - vec2(u_p2.y, u_p2.z));
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
    vec2  lc   = vec2(0.5, 0.55) + drift;
    float d    = length(vec2((uv.x - lc.x)*ar, uv.y - lc.y));
    float rad  = (u_p.z > 0.0 ? u_p.z : 0.62) * (1.0 + 0.06*sin(t*0.09));
    float glow = pow(1.0 - smoothstep(0.0, rad, d), u_p.w > 0.0 ? u_p.w : 1.6);
    float f    = fract(ax * count + 0.02*sin(bt));
    // Softened by a fraction of one slat so a high count does not alias into moire when the canvas is
    // scaled. A hard fract() is right in maths and crawls on screen.
    float soft = smoothstep(0.0, 0.35, min(f, 1.0 - f) * 2.0);
    float slat = f * mix(0.55, 1.0, soft);
    // u_p2.w is the light's SIGN and strength. Negative darkens, which is one of the references: a
    // dark radial mass sitting BEHIND the panels rather than a glow in front of them.
    float lw = u_p2.w == 0.0 ? 1.0 : u_p2.w;
    float lit = glow * lw;
    col = clamp(base*(0.25 + 0.75*max(lit, 0.0)) + c2*max(lit, 0.0)*0.45
              + c3*max(-lit, 0.0)*0.85 - slat*0.30, 0.0, 1.0);
    col = mix(col, c3, 0.5*smoothstep(0.35, 1.0, 1.0 - across));   // the deep role owns the far edges
    alpha = 1.0;
  } col = mix(vec3(dot(col, vec3(0.333))), col, 0.9);       // slight desaturate → premium, not garish
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
    intensity: gl.getUniformLocation(prog, 'u_intensity'),
    p: gl.getUniformLocation(prog, 'u_p'),
    p2: gl.getUniformLocation(prog, 'u_p2') };
  gl.viewport(0, 0, w, h); gl.uniform2f(U.res, w, h);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  return {
    canvas,
    // `params` is the per-effect vector. Absent means four zeros, which every branch written before it
    // ignores, so adding it changed no pixel of the seventeen that came first.
    draw(fx, time, seed = 0, palette = null, intensity = 0.35, params = null, params2 = null) {
      const idx = AMBIENT_FX.indexOf(fx); if (idx < 0) return;
      gl.useProgram(prog);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.time, time); gl.uniform1f(U.seed, seed); gl.uniform1i(U.fx, idx);
      gl.uniform1f(U.intensity, intensity);
      const P4 = params || [0, 0, 0, 0];
      gl.uniform4f(U.p, P4[0] || 0, P4[1] || 0, P4[2] || 0, P4[3] || 0);
      const Q4 = params2 || [0, 0, 0, 0];
      gl.uniform4f(U.p2, Q4[0] || 0, Q4[1] || 0, Q4[2] || 0, Q4[3] || 0);
      const flat = new Float32Array(12); const n = palette ? Math.min(4, palette.length) : 0;
      for (let i = 0; i < n; i++) { flat[i * 3] = palette[i][0]; flat[i * 3 + 1] = palette[i][1]; flat[i * 3 + 2] = palette[i][2]; }
      gl.uniform3fv(U.pal, flat); gl.uniform1i(U.palN, n);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // wipe the buffer when the layer is off-window, so the canvas holds a function of t and not of
    // whichever frame a worker happened to draw last (core/layers/shader.js).
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}
