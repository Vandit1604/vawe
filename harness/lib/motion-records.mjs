// What the motion lint (motion-lint.mjs, motion-variety.mjs) asks of one motion record: does it move, enter, leave, which
// ease and which way. Pure. A record is { target, id, props, delay, duration, easing, kfEasings, opacity, from, step? }.
import { EASE } from '../../core/motion/presets.js';

export const CUT = 0.05;
const MOVE = /^(transform|translate|scale|rotate|left|top|right|bottom|clipPath|maskPosition|backgroundPosition|offsetDistance)$/;

export const moveProps = (r) => r.props.filter((p) => MOVE.test(p));
export const moves = (r) => moveProps(r).length > 0;
export const entering = (r) => r.id === 'enter' || (r.opacity && r.opacity[1] > r.opacity[0]);
export const exiting = (r) => r.id === 'leave' || (r.opacity && r.opacity[1] < r.opacity[0]);

// A record inferred from box samples is exact only when it spans a few samples; one animation's own timing always is.
const MIN_SAMPLES = 2;
export const measured = (r) => !r.step || r.duration >= MIN_SAMPLES * r.step;

/** The records grouped per element, in first-seen order. */
export function byTarget(records) {
  const m = new Map();
  for (const r of records) (m.get(r.target) || m.set(r.target, []).get(r.target)).push(r);
  return [...m.values()];
}

// A browser reports linear() with explicit stop positions, so compare the output values alone.
const outputs = (curve) => String(curve).replace(/^linear\(|\)$/g, '').split(',').map((stop) => stop.trim().split(/\s+/)[0]).join(' ');

/** The EASE name of a record's curve, or null on an inferred or unnamed curve. */
export const easeName = (r) => Object.keys(EASE).find((n) => outputs(EASE[n]) === outputs(r.easing)) ?? null;

/** A translate or transform's dominant direction: x+, x-, y+, y- or ''. */
export function moveDirection(from) {
  const s = String(from);
  const one = /translate([XY])\(\s*(-?[\d.]+)/.exec(s);
  if (one) return Number(one[2]) ? `${one[1].toLowerCase()}${Number(one[2]) > 0 ? '+' : '-'}` : '';
  const pair = /(?:translate\(|^)\s*(-?[\d.]+)[a-z%]*(?:[\s,]+(-?[\d.]+))?/.exec(s);
  if (!pair) return '';
  const [x, y] = [Number(pair[1]), Number(pair[2] || 0)];
  if (!x && !y) return '';
  return Math.abs(x) >= Math.abs(y) ? `x${x > 0 ? '+' : '-'}` : `y${y > 0 ? '+' : '-'}`;
}

const lengths = (s) => String(s).match(/calc\((?:[^()]|\([^()]*\))*\)|\S+/g) || [];
// A length is read as a bare number, a calc(var(--vw) * 0.24) as its factor in percent: only the sign and the larger axis are used.
const lengthNumber = (s) => {
  const factor = /\*\s*(-?[\d.]+)\s*\)$/.exec(s);
  return factor ? Number(factor[1]) * 100 : parseFloat(s) || 0;
};
const translateXY = (s) => { const [x, y] = lengths(s); return [lengthNumber(x ?? '0'), lengthNumber(y ?? '0')]; };

function fromTransform(tf) {
  const out = {};
  const t = /translate\(\s*([^,)]+)(?:,\s*([^)]+))?\)/.exec(tf), tx = /translateX\(([^)]+)\)/.exec(tf), ty = /translateY\(([^)]+)\)/.exec(tf), sc = /scale\(\s*([\d.]+)/.exec(tf);
  if (t || tx || ty) out.translate = `${(t && t[1]) || (tx && tx[1]) || '0px'} ${(t && t[2]) || (ty && ty[1]) || '0px'}`;
  if (sc) out.scale = sc[1];
  return out;
}

// A transform's translate and scale, as the values the translate and scale properties would hold.
function expandTransform(kf) {
  if (!kf.transform) return kf;
  const [a, b] = [fromTransform(kf.transform[0]), fromTransform(kf.transform[1])];
  const out = { ...kf };
  if (!out.translate && (a.translate || b.translate)) out.translate = [a.translate ?? '0px 0px', b.translate ?? '0px 0px'];
  if (!out.scale && (a.scale || b.scale)) out.scale = [a.scale ?? '1', b.scale ?? '1'];
  return out;
}

const blurOf = (s) => /blur\(\s*([\d.]+)/.exec(s)?.[1] ?? '0';
const same = (v) => v[0] === v[1];

/**
 * What one record's animation does to its element, from its first and last keyframe values (record.kf), as a list of
 * { key, text }: key is the kind and direction ("scale in", "moves left", "blur"), text adds the numbers.
 */
export function moveParts(r) {
  const kf = expandTransform(r.kf || {});
  const parts = [];
  if (kf.scale) {
    const [a, b] = kf.scale.map((v) => parseFloat(v));
    if (Math.abs(b - a) > 0.001) parts.push({ key: `scale ${b > a ? 'in' : 'out'}`, text: `scale ${+a.toFixed(3)} to ${+b.toFixed(3)}` });
  }
  if (kf.translate) {
    const [[x0, y0], [x1, y1]] = kf.translate.map(translateXY);
    const [dx, dy] = [x1 - x0, y1 - y0];
    if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
      const key = Math.abs(dx) >= Math.abs(dy) ? `moves ${dx > 0 ? 'right' : 'left'}` : `moves ${dy > 0 ? 'down' : 'up'}`;
      parts.push({ key, text: key });
    }
  }
  if (kf.rotate && !same(kf.rotate)) parts.push({ key: `rotate ${parseFloat(kf.rotate[1]) > parseFloat(kf.rotate[0]) ? 'cw' : 'ccw'}`, text: `rotate ${kf.rotate[0]} to ${kf.rotate[1]}` });
  if (kf.filter && blurOf(kf.filter[0]) !== blurOf(kf.filter[1])) parts.push({ key: 'blur', text: `blur ${blurOf(kf.filter[0])} to ${blurOf(kf.filter[1])}` });
  for (const [prop, name] of [['clipPath', 'clip'], ['maskImage', 'mask'], ['maskPosition', 'mask']]) {
    if (kf[prop] && !same(kf[prop])) parts.push({ key: `${name} ${kf[prop][0]} to ${kf[prop][1]}`, text: `${name} ${kf[prop][0]} to ${kf[prop][1]}` });
  }
  if (!parts.length && r.opacity && !same(r.opacity)) {
    const fade = `fade ${r.opacity[1] > r.opacity[0] ? 'in' : 'out'}`;
    parts.push({ key: fade, text: fade });
  }
  return parts;
}
