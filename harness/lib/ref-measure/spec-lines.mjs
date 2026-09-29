// harness/lib/ref-measure/spec-lines.mjs: the SPEC.md lines for the reference measures. Every number
// carries its error or fit quality; a weak one ends with "check by eye: f<N>", the frame to look at.
import { r1 } from '../move-fit.mjs';

const eye = (frame) => `check by eye: f${Math.round(frame)}`;
const pct = (v) => `${Math.round(v * 1000) / 10}%`;

export function transitionRow(c, n) {
  const t = c.transition, weak = t.confidence < 0.6 || t.type === 'other';
  return { n, type: t.type, dir: t.dir, frames: t.frames, span: t.startFrame === t.endFrame ? `${t.endFrame}` : `${t.startFrame}-${t.endFrame}`,
    conf: t.confidence, evidence: t.evidence + (weak ? `; ${eye(t.startFrame)}` : ''), hit: c.hitLead ?? '', beat: c.beatLead ?? '' };
}

const paramText = (p) => Object.entries(p).map(([k, v]) => `${k}=${v}`).join(' ');

export function easingLines(e, fps) {
  if (!e.easing) return [];
  const { easing, start, land } = e, travel = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
  const weak = easing.r2 < 0.98 || land.errFrames > 1 || easing.rmsePx > 0.03 * travel || easing.points < 6 || easing.atLimit;
  const L = [`easing ${easing.class} ${paramText(easing.params)}: rmse ${easing.rmsePx} px, r2 ${easing.r2}, runner-up ${easing.runnerUp.class} ${easing.runnerUp.rmsePx} px`,
    `css (${easing.durMs} ms): ${easing.css}`,
    `starts f${start.frame} (${start.t} s); at rest (within 0.5 px) f${land.frame} (${land.t} s), plus or minus ${land.errFrames} f${weak ? `; ${eye(land.frame)}` : ''}`];
  if (e.shutter) L.push(`shutter ${e.shutter.angleDeg} deg, plus or minus ${e.shutter.errDeg} (${e.shutter.frames} moving f)${e.shutter.errDeg > 90 ? '; too little travel to tell, check by eye' : ''}`);
  return L;
}

export function layoutLines(s) {
  const l = s.layout;
  if (!l || !l.boxes.length) return [];
  const box = (b, i) => `${i}: x ${b.x} y ${b.y} w ${b.w} h ${b.h}`;
  const L = [`layout at f${l.frame}, boxes as fractions of the frame (error about 0.003): ${l.boxes.slice(0, 12).map(box).join('; ')}${l.boxes.length > 12 ? `; ${l.boxes.length - 12} more in spec.json` : ''}`];
  if (l.lines.length) L.push(`alignment (edge at, boxes): ${l.lines.slice(0, 10).map((x) => `${x.edge} ${x.at} [${x.boxes.join(',')}]`).join('; ')}`);
  L.push(`margins to the frame: left ${pct(l.margins.left)}, right ${pct(l.margins.right)}, top ${pct(l.margins.top)}, bottom ${pct(l.margins.bottom)}`);
  if (l.grid) L.push(`column grid: ${l.grid.columns} left edges every ${l.grid.pitch} (${l.grid.lefts.join(', ')})`);
  return L;
}

export function audioRow(h) {
  return { ...h, attackMs: h.attack != null ? r1(h.attack * 1000) : '', note: h.errMs > 6 ? eye(h.attackFrame) : '' };
}
