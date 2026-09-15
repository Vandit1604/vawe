// generators/sim/sims/ember-burst.mjs: a burst of embers, outward impulse, drag, gravity, cooling.
//
// Stateful on purpose. Each ember carries a velocity that is integrated frame over frame, and a
// short position history that is drawn as a tapered streak, so fast embers smear and slow ones read
// as points. That trail is what stops a particle burst looking like confetti: the eye reads SPEED
// from the length of the streak, which is Disney's "exaggeration" applied to a dot.
//
// Motion shape (MOTION-CRAFT rule 8, velocity contrast): everything happens in the first ~0.4s and
// then the field decelerates for three seconds. The burst is the beat; the drift is the hold.
import { clamp01, easeOutCubic, rgba, mix } from './lib/rng.mjs';

export const dims = { w: 900, h: 900 };
export const fps = 30;
export const frames = 78;
export const seed = 0x9F1E;

const COUNT = 340;
const GRAVITY = 0.42;      // px per frame^2
const DRAG = 0.965;        // per frame velocity retention
const TRAIL = 6;           // history samples per ember

// cooling ramp: a fresh ember is white-hot, then amber, then a dull ash that fades out
const HOT = [255, 249, 232];
const AMBER = [255, 150, 44];
const ASH = [120, 62, 40];

export function setup(ctx) {
  const r = ctx.rng;
  const cx = ctx.W / 2, cy = ctx.H * 0.62;
  const parts = [];
  for (let i = 0; i < COUNT; i++) {
    // speed is biased low so a dense core stays put while a few outliers carry to the edge; a
    // uniform speed distribution reads as a ring, which is the tell of a fake explosion
    const spd = 4 + Math.pow(r.next(), 2.1) * 34;
    const a = r.next() * Math.PI * 2;
    parts.push({
      x: cx, y: cy,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd * 0.82 - 3.2,   // a slight upward bias: heat rises before it falls
      life: 0,
      span: 34 + r.next() * 58,
      size: 1.1 + Math.pow(r.next(), 2) * 3.4,
      flick: r.range(0.7, 1.0),
      // a per-ember turbulence phase. Without it every path is a straight radial ray and the burst
      // reads as a drawn starburst; a bowed path is what says "this was thrown through air".
      turb: r.range(0, 6.2831853),
      turbAmp: r.range(0.10, 0.42),
      hist: [],
    });
  }
  ctx.state = { parts, cx, cy };
}

export function step(ctx, i) {
  for (const p of ctx.state.parts) {
    p.hist.push(p.x, p.y);
    if (p.hist.length > TRAIL * 2) p.hist.splice(0, 2);
    p.vx = p.vx * DRAG + Math.sin(p.turb + p.life * 0.09) * p.turbAmp;
    p.vy = p.vy * DRAG + GRAVITY + Math.cos(p.turb * 1.7 + p.life * 0.07) * p.turbAmp * 0.6;
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
  }
  ctx.state.t = i / ctx.frames;
}

export function draw(ctx) {
  const g = ctx.g;
  g.globalCompositeOperation = 'lighter';   // embers ADD; overlapping sparks get brighter, not muddier
  for (const p of ctx.state.parts) {
    const age = clamp01(p.life / p.span);
    if (age >= 1) continue;
    const heat = 1 - easeOutCubic(age);
    const col = heat > 0.55 ? mix(AMBER, HOT, (heat - 0.55) / 0.45) : mix(ASH, AMBER, heat / 0.55);
    // flicker is a function of the ember's own seeded phase, not of noise sampled per frame, so a
    // re-bake reproduces the exact same twinkle
    const flick = 0.72 + 0.28 * Math.sin(p.life * 0.55 * p.flick + p.size * 9);
    const alpha = clamp01(1 - age * age) * flick;

    // the streak: the position history, thinning toward the tail
    if (p.hist.length >= 4) {
      g.strokeStyle = rgba(col, alpha * 0.5);
      g.lineWidth = p.size * 0.9;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p.hist[0], p.hist[1]);
      for (let k = 2; k < p.hist.length; k += 2) g.lineTo(p.hist[k], p.hist[k + 1]);
      g.lineTo(p.x, p.y);
      g.stroke();
    }
    // the head: a hot core inside a soft bloom
    g.fillStyle = rgba(col, alpha * 0.22);
    g.beginPath(); g.arc(p.x, p.y, p.size * 3.4, 0, 6.2831853); g.fill();
    g.fillStyle = rgba(col, alpha);
    g.beginPath(); g.arc(p.x, p.y, p.size, 0, 6.2831853); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}
