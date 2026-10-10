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

const okOf = (err, key) => !err || !err[key] || err[key].ok;

// The calibrated error of every measure (ref-calibrate.mjs). A measure that cannot see the difference it
// exists to find says so here, so a rebuild does not chase noise.
export function errorLines(err, generated) {
  if (!err || !Object.keys(err).length) return ['## Measurement error', '', 'Not calibrated: run `bin/vawe ref-calibrate`. Treat every number as plus or minus 1 frame.', ''];
  const rows = Object.entries(err).map(([k, v]) => `| ${k} | ${v.p50} | ${v.p90} | ${v.bias} | ${v.mustDetect} | ${v.ok ? 'trust' : 'check by eye'} |`);
  return ['## Measurement error', '', `Calibrated ${generated} against pages with known truth (tests/fixtures/ref-measure). Ms is milliseconds, Frac a share of the frame or size, DE a colour distance. bias is the median signed error.`, '',
    '| measure | p50 | p90 | bias | must detect | verdict |', '|---|---|---|---|---|---|', ...rows, ''];
}

export function easingLines(e, fps, err) {
  if (!e.easing) return [];
  const { easing, start, land } = e, travel = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
  const weak = easing.r2 < 0.98 || land.errFrames > 1 || easing.rmsePx > 0.03 * travel || easing.points < 6 || easing.atLimit || !okOf(err, e.fit && e.fit.kind === 'approach' ? 'landMsTail' : 'landMs');
  const L = [`easing ${easing.class} ${paramText(easing.params)}: rmse ${easing.rmsePx} px, r2 ${easing.r2}, runner-up ${easing.runnerUp.class} ${easing.runnerUp.rmsePx} px`,
    `css (${easing.durMs} ms): ${easing.css}`,
    `starts f${start.frame} (${start.t} s); at rest (within 0.5 px) f${land.frame} (${land.t} s), plus or minus ${land.errFrames} f${weak ? `; ${eye(land.frame)}` : ''}`];
  if (e.shutter) L.push(`shutter ${e.shutter.angleDeg} deg, plus or minus ${e.shutter.errDeg} (${e.shutter.frames} moving f)${e.shutter.errDeg > 90 ? '; too little travel to tell, check by eye' : ''}`);
  return L;
}

export function layoutLines(s, err) {
  const l = s.layout;
  if (!l || !l.boxes.length) return [];
  const box = (b, i) => `${i}: x ${b.x} y ${b.y} w ${b.w} h ${b.h}`;
  const errText = err && err.layoutFrac ? `plus or minus ${err.layoutFrac.p90}${okOf(err, 'layoutFrac') ? '' : ', check by eye'}` : 'error about 0.003';
  const L = [`layout at f${l.frame}, boxes as fractions of the frame (${errText}):${l.boxes.slice(0, 12).map(box).join('; ')}${l.boxes.length > 12 ? `; ${l.boxes.length - 12} more in spec.json` : ''}`];
  if (l.lines.length) L.push(`alignment (edge at, boxes): ${l.lines.slice(0, 10).map((x) => `${x.edge} ${x.at} [${x.boxes.join(',')}]`).join('; ')}`);
  L.push(`margins to the frame: left ${pct(l.margins.left)}, right ${pct(l.margins.right)}, top ${pct(l.margins.top)}, bottom ${pct(l.margins.bottom)}`);
  if (l.grid) L.push(`column grid: ${l.grid.columns} left edges every ${l.grid.pitch} (${l.grid.lefts.join(', ')})`);
  return L;
}

export function colourLines(c, turns) {
  const L = ['## Colour', '',
    `Per shot and per film, in Lab on ${c.sampleWidth} px wide frames: k-means, clusters over 3% of pixels, clusters closer than deltaE 10 merged.`, '',
    `colours per shot: median ${c.coloursPerShotMedian ?? 'n/a'}; distinct colours in the film: ${c.coloursDistinct ?? 'n/a'}`,
    `chroma C*: median ${c.chromaMedian}, p90 ${c.chromaP90}`,
    `value: ${pct(c.shareDark)} of pixels below L 20, ${pct(c.shareLight)} above L 85, L std ${c.lStd}`, ''];
  L.push('### World turns', '', `${turns.count} shot boundaries where the dominant colour moves more than deltaE ${turns.thresholdDE} (${turns.per10s} per 10 s)${turns.count ? `, at ${turns.times.join(', ')} s` : ''}.`, '');
  return L;
}

export function motionRegionLines(m) {
  return ['## Moving regions', '', `Separate regions moving at once, per frame, over ${m.frames} frames: median ${m.median}, p90 ${m.p90}, mean ${m.mean}.`, `Method: ${m.method}.`, ''];
}

export function audioRow(h) {
  return { ...h, attackMs: h.attack != null ? r1(h.attack * 1000) : '', note: h.errMs > 6 ? eye(h.attackFrame) : '' };
}
