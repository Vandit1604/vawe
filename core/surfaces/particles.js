// core/surfaces/particles.js: the `particles` layer type's pixels. An emitter for celebratory or
// atmospheric moments, picked by `preset`: confetti (a gravity-fed burst), sparks (a fast radial
// flash) or dust (a slow ambient drift). `mode` was the first name tried and it collides: beam.js
// already owns `mode` with its own enum (border/shine), and schema.json's props are a flat, shared
// namespace (docs/MISTAKES.md #213, #369 make the same point about `fill`/`color`/`bg` on rect.js).
// `preset` is the vocabulary this codebase already uses for exactly this shape of choice, glow.js
// picks its five lighting phenomena the same way, so this reuses the name and the registry pattern
// rather than inventing a second one. Inspiration only from tsParticles/party.js, no ported code:
// every particle here is drawn the way core/paint-fx.js already requires (see its header), because
// that file's own contract is the one this feature needs and this surface just supplies a third
// canvas backend under it.
//
// THE CONTRACT, same as paint-fx.js: no accumulation (each frame clears and redraws from scratch), no
// Math.random/Date (hashSeed/random from core/motion.js, so seed→picture is fixed forever), and
// CLOSED-FORM motion: a particle's position at local time `lt` is f(lt), never "last position +
// velocity". That is what makes renderFrame(n) pure and seek-safe, and it is why this is NOT a Tier 5
// particle sim (docs/ROADMAP.md): a sim steps from the previous frame, this does not.
import { random } from '../motion.js';
import { glowRGB } from '../filters.js';
import { mergeProps } from '../props.js';
import { defineRegistry } from '../registry.js';

export const size = (kit) => [kit.W, kit.H];
export const stamp = 3;
export const resamplable = true;

export const PROPS = mergeProps({ preset: {}, count: {}, color: {}, colors: {}, hues: {}, gravity: {}, spread: {}, seed: {}, size: {} });

// theme-resolved default: an accent-anchored spread of hues, never a hardcoded brand colour
// (same move as paint-fx.js's ACCENT()). `hues` lets an author pick a different spread; `colors`/`color`
// override with literal hex and win outright.
const ACCENT = () => `rgb(${glowRGB('var(--accent)').join(',')})`;
const DEFAULT_HUES = [355, 45, 200, 130, 280]; // festive spread: red, gold, sky, green, violet

function paletteFor(L) {
  if (Array.isArray(L.colors) && L.colors.length) return L.colors;
  if (L.color) return [L.color];
  if (L.preset === 'dust') return [ACCENT()];
  const hues = L.hues || DEFAULT_HUES;
  return hues.map((h) => `hsl(${h}, 82%, 60%)`);
}

// ---- confetti: a gravity-fed burst, launched near the bottom of the box, tumbling as it falls ----
function drawConfetti(ctx, w, h, lt, seed, L, colors) {
  const count = L.count ?? 80, gravity = L.gravity ?? 480;
  const spread = ((L.spread ?? 70) * Math.PI) / 180, life = 2.6;
  for (let i = 0; i < count; i++) {
    const b = `${seed}:${i}`;
    const delay = random(`${b}:d`) * 0.35;
    const age = lt - delay;
    if (age < 0 || age > life) continue;
    const originX = w * (0.3 + random(`${b}:ox`) * 0.4), originY = h * 0.85;
    const ang = -Math.PI / 2 + (random(`${b}:a`) * 2 - 1) * spread;
    const speed = 260 + random(`${b}:sp`) * 260;
    const x = originX + Math.cos(ang) * speed * age;
    const y = originY + Math.sin(ang) * speed * age + 0.5 * gravity * age * age;
    if (y > h + 20) continue;
    const spin = (random(`${b}:rs`) * 2 - 1) * 8, rot = (random(`${b}:r`) * 2 - 1) * Math.PI + spin * age;
    const sz = (L.size ?? 8) * (0.7 + random(`${b}:sz`) * 0.6);
    const rise = life * 0.12;
    const alpha = age < rise ? age / rise : Math.max(0, 1 - (age - rise) / (life - rise));
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-sz / 2, -sz * 0.35, sz, sz * 0.7);
    ctx.restore();
  }
}

// ---- sparks: a fast radial flash from the box centre, additive, short-lived ----
function drawSparks(ctx, w, h, lt, seed, L, colors) {
  const count = L.count ?? 50, gravity = L.gravity ?? 60;
  const spread = ((L.spread ?? 360) * Math.PI) / 180, life = 0.9;
  const cx = w / 2, cy = h / 2;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const b = `${seed}:${i}`;
    const delay = random(`${b}:d`) * 0.2;
    const age = lt - delay;
    if (age < 0 || age > life) continue;
    const ang = (random(`${b}:a`) - 0.5) * spread;
    const speed = 200 + random(`${b}:sp`) * 420;
    const x = cx + Math.sin(ang) * speed * age;
    const y = cy - Math.cos(ang) * speed * age + 0.5 * gravity * age * age;
    const t01 = age / life, alpha = Math.max(0, 1 - t01 * t01);
    const sz = (L.size ?? 2.5) * (1 - t01 * 0.6) * (0.6 + random(`${b}:sz`) * 0.8);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, sz), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ---- dust: slow ambient drift, loops forever (a modulo of `lt`, still f(lt), never integrated) ----
function drawDust(ctx, w, h, lt, seed, L, colors) {
  const count = L.count ?? 40, size = L.size ?? 2;
  for (let i = 0; i < count; i++) {
    const b = `${seed}:${i}`;
    const period = 7 + random(`${b}:p`) * 6;
    const vy = (h + 40) / period;
    const y = h - (((lt + random(`${b}:y0`) * period) * vy) % (h + 40));
    const driftAmp = 6 + random(`${b}:dx`) * 16, driftFreq = 0.15 + random(`${b}:df`) * 0.25;
    const phase = random(`${b}:ph`) * Math.PI * 2;
    const x = random(`${b}:x`) * w + Math.sin(lt * driftFreq + phase) * driftAmp;
    const twinkle = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(lt * (0.6 + random(`${b}:tw`)) + phase));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(x, y, size * (0.6 + random(`${b}:sz`) * 0.8), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const PARTICLE_BLURBS = {
  confetti: 'a gravity-fed burst launched near the bottom of the box, tumbling rects as it falls: celebratory',
  sparks: 'a fast radial flash from the box centre, additive-blended, gone in under a second: an impact or a reveal',
  dust: 'a slow ambient drift that loops forever, low-alpha specks with a gentle twinkle: atmosphere behind a subject',
};

// A REGISTRY, not an if-chain: an unknown name throws and names the near word, the same argument
// glow.js makes about its own preset slot (see that file's header).
export const PARTICLES_REGISTRY = defineRegistry('particles preset', { confetti: drawConfetti, sparks: drawSparks, dust: drawDust },
  { slot: 'preset', blurbs: PARTICLE_BLURBS,
    catalog: {
      title: 'Particles presets',
      tag: 'particles layer',
      intro: '`preset` on a `particles` layer picks the emitter: `{ "type":"particles", "preset":"confetti" }`.',
      usage: (n, { j }) => j({ type: 'particles', preset: n, count: 80, seed: 1, start: 0, duration: 3 }),
      preview: (n, { base }) => base({ bg: [{ preset: 'black', from: 0, to: 3 }],
          layers: [{ type: 'particles', preset: n, count: 80, seed: 1, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 3 }] }),
    },
  });

export function validate(L) { PARTICLES_REGISTRY.pick(L.preset || 'confetti'); }

export function create(kit, L, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const colors = paletteFor(L);
  const draw = PARTICLES_REGISTRY.pick(L.preset || 'confetti');
  return {
    canvas: cv,
    draw(lt, LL) { ctx.clearRect(0, 0, w, h); draw(ctx, w, h, lt, LL.seed ?? 0, LL, colors); },
    clear() { ctx.clearRect(0, 0, w, h); },
  };
}
