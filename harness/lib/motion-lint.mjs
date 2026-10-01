// The motion lint: five advice lines on how a page moves, each with its taste card rule, the second and
// one fix. collectMotion runs in the page and reads Web Animations; recordsFromBoxes infers the same
// records from element boxes over time (harness/lib/box-track.mjs) for a page that paints in window.seek
// or vawe.onFrame. Everything else is pure over the records.
import { isWaived } from './waivers.mjs';
import { DECORATIVE } from './draft-check.mjs';
import { BANDS, bandOf } from '../../core/motion/presets.js';

// motionRecord and collectMotion run inside the page (runMotionCollector bundles their source with DECORATIVE),
// so each is self-contained: no other outer bindings.
export function motionRecord(a, k, area) {
  const skip = ['offset', 'computedOffset', 'easing', 'composite'];
  const e = a.effect, el = e.target, t = e.getComputedTiming(), kfs = e.getKeyframes();
  const withOpacity = kfs.filter((f) => f.opacity != null);
  const box = el.getBoundingClientRect();
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18);
  const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : '';
  return {
    target: k, label: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : cls}${text ? ` "${text}"` : ''}`,
    id: a.id || a.animationName || '', props: [...new Set(kfs.flatMap((f) => Object.keys(f).filter((p) => !skip.includes(p))))],
    delay: (t.delay || 0) / 1000, duration: (t.duration || 0) / 1000,
    easing: t.easing || 'linear', kfEasings: kfs.map((f) => f.easing || 'linear'),
    opacity: withOpacity.length ? [Number(withOpacity[0].opacity), Number(withOpacity[withOpacity.length - 1].opacity)] : null,
    from: String((kfs[0] && (kfs[0].translate || kfs[0].transform || kfs[0].clipPath)) || ''),
    fullFrame: box.width * box.height >= 0.6 * area,
    decorative: Boolean(el.closest(DECORATIVE)),
  };
}

export function collectMotion() {
  const targets = [];
  const records = [];
  for (const a of document.getAnimations()) {
    if (!a.effect || !a.effect.target || !a.effect.getKeyframes) continue;
    let k = targets.indexOf(a.effect.target);
    if (k < 0) k = targets.push(a.effect.target) - 1;
    records.push(motionRecord(a, k, innerWidth * innerHeight));
  }
  return { records, scripted: typeof window.seek === 'function' || (window.__vaweFrameHooks || []).length > 0 };
}

const COLLECTOR = `const DECORATIVE = ${JSON.stringify(DECORATIVE)};\n${[motionRecord, collectMotion].map((fn) => fn.toString()).join('\n')}`;

/** { records, scripted } from a loaded page. Call it before any seek past the start: a finished fill-none animation drops out of getAnimations. */
export function runMotionCollector(page) {
  return page.evaluate((src) => new Function(`${src}\nreturn collectMotion();`)(), COLLECTOR);
}

const CUT = 0.05;
const LINEAR_LIMIT = 0.3;
const FINAL_FPS = 60;
const MOVE = /^(transform|translate|scale|rotate|left|top|right|bottom|clipPath|maskPosition|backgroundPosition|offsetDistance)$/;

const moves = (r) => r.props.some((p) => MOVE.test(p));
const entering = (r) => r.id === 'enter' || (r.opacity && r.opacity[1] > r.opacity[0]);
const exiting = (r) => r.id === 'leave' || (r.opacity && r.opacity[1] < r.opacity[0]);
// A record inferred from box samples is exact only when it spans a few samples; one animation's own timing always is.
const MIN_SAMPLES = 2;
const measured = (r) => !r.step || r.duration >= MIN_SAMPLES * r.step;
const KEYWORDS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']);
const onKeywords = (r) => [r.easing, ...r.kfEasings].every((e) => KEYWORDS.has(e));
const isLinear = (r) => [r.easing, ...r.kfEasings].every((e) => e === 'linear');
const s2 = (x) => x.toFixed(2);

function byTarget(records) {
  const m = new Map();
  for (const r of records) (m.get(r.target) || m.set(r.target, []).get(r.target)).push(r);
  return [...m.values()];
}

/** An exit that runs as long as or longer than its entrance, per element (card rule 5). Decorative elements and sampled runs under two samples are not measured. */
export function exitLength(records) {
  const out = [];
  for (const rs of byTarget(records.filter((r) => !r.decorative))) {
    const ins = rs.filter((r) => entering(r) && r.duration > CUT && measured(r)), outs = rs.filter((r) => exiting(r) && r.duration > CUT && measured(r));
    if (!ins.length || !outs.length) continue;
    const came = Math.max(...ins.map((r) => r.duration)), exit = outs.reduce((a, r) => (r.duration > a.duration ? r : a));
    if (exit.duration >= came) out.push({ code: 'exit-length', rule: 5, at: exit.delay,
      what: `${exit.label} leaves in ${s2(exit.duration)} s, its entrance took ${s2(came)} s`,
      fix: 'leave(el) from core/motion/presets.js: 0.6 of the entrance, accelerating' });
  }
  return out;
}

/** Three or more elements whose entrances land on one frame at 60 fps (card rule 8). */
export function groupLanding(records) {
  const frames = new Map();
  for (const rs of byTarget(records)) {
    const ins = rs.filter((r) => entering(r) && r.duration > CUT);
    if (!ins.length) continue;
    const land = Math.max(...ins.map((r) => r.delay + r.duration));
    const f = Math.round(land * FINAL_FPS);
    (frames.get(f) || frames.set(f, []).get(f)).push(ins[0].label);
  }
  return [...frames].filter(([, labels]) => labels.length >= 3).map(([f, labels]) => ({
    code: 'group-landing', rule: 8, at: f / FINAL_FPS,
    what: `${labels.length} elements land on one frame (${labels.slice(0, 3).join(', ')})`,
    fix: 'stagger(els) from core/motion/presets.js: 30 to 80 ms apart',
  }));
}

const EASE_ADVICE = 'easing: EASE.land to arrive, EASE.leave or EASE.launch to exit, EASE.glide for a drift (core/motion/presets.js), or enter(el)';

/** A move longer than 0.3 s on linear easing, or on a default CSS keyword (ease, ease-in-out) with no curve of its own (card rule 6). */
export function linearMove(records) {
  return records.filter((r) => moves(r) && r.duration > LINEAR_LIMIT && onKeywords(r)).map((r) => {
    const linear = isLinear(r);
    return { code: linear ? 'linear-move' : 'default-ease', rule: 6, at: r.delay,
      what: `${r.label} moves ${r.props.filter((p) => MOVE.test(p)).join(',')} for ${s2(r.duration)} s on ${linear ? 'linear' : `the CSS keyword ${[r.easing, ...r.kfEasings].find((e) => e !== 'linear')}`} easing`,
      fix: EASE_ADVICE };
  });
}

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

function seamMove(r) {
  const dir = moveDirection(r.from);
  return `${[...r.props].sort().join('+')}${dir ? ` ${dir}` : r.from && !/translate/.test(r.from) ? ` ${r.from}` : ''}`;
}

/** The same full-frame transition move twice in a row; hard cuts are not moves (card rule 10). */
export function seamRepeat(records) {
  const seams = records.filter((r) => r.fullFrame && r.duration > CUT && (moves(r) || r.opacity)).sort((a, b) => a.delay - b.delay);
  const out = [];
  for (let i = 1; i < seams.length; i++) {
    const [a, b] = [seams[i - 1], seams[i]];
    if (b.delay - a.delay > CUT && seamMove(a) === seamMove(b)) out.push({ code: 'seam-repeat', rule: 10, at: b.delay,
      what: `the seam at ${s2(b.delay)} s repeats the one at ${s2(a.delay)} s (${seamMove(b)})`,
      fix: 'change the axis or direction, or cut: a wipe on x after a push on y' });
  }
  return out;
}

/** Every timed move in one speed band. A page that paints in onFrame or seek is not measured here (card rule 8). */
export function oneBand(records, { scripted = false } = {}) {
  const timed = records.filter((r) => r.duration > CUT && (moves(r) || r.opacity));
  if (scripted || timed.length < 2) return [];
  const bands = new Set(timed.map((r) => bandOf(r.duration)));
  if (bands.size > 1) return [];
  const [band] = bands;
  return [{ code: 'one-band', rule: 8, at: Math.min(...timed.map((r) => r.delay)),
    what: `all ${timed.length} timed moves sit in the ${band} band (${BANDS[band].join(' to ')} s)`,
    fix: 'give the hero gravity or cinematic and a payoff energy: the slowest beat at least 3x the fastest' }];
}

// Box noise under these is no motion: sub-pixel layout jitter and colour-rounding of opacity.
const STILL_PX = 0.25;
const STILL_ALPHA = 0.005;
const SEEN = 0.05;
const LINEAR_CV = 0.15;

const boxMoved = (a, b, px = STILL_PX) => Math.abs(a[0] - b[0]) > px || Math.abs(a[1] - b[1]) > px || Math.abs(a[2] - b[2]) > px || Math.abs(a[3] - b[3]) > px;

/** The element's own motion: its box in its parent's frame (the parent's move and scale undone) and its own opacity. */
function ownTrack(track, parentTrack) {
  if (!parentTrack) return track.map((b) => b.slice(0, 5));
  const [w0, h0] = [parentTrack[0][2], parentTrack[0][3]];
  return track.map((b, k) => {
    const [px, py, pw, ph] = parentTrack[k];
    const sx = w0 > 0 && pw > 0 ? w0 / pw : 1, sy = h0 > 0 && ph > 0 ? h0 / ph : 1;
    return [(b[0] - px) * sx, (b[1] - py) * sy, b[2] * sx, b[3] * sy, b[5]];
  });
}

/** Runs of changing samples as [first step, last step], one quiet step allowed inside a run. */
function activeRuns(track) {
  const runs = [];
  for (let k = 1; k < track.length; k++) {
    const moving = boxMoved(track[k], track[k - 1]) || Math.abs(track[k][4] - track[k - 1][4]) > STILL_ALPHA;
    if (!moving) continue;
    const last = runs.at(-1);
    if (last && k - last[1] <= 2) last[1] = k; else runs.push([k, k]);
  }
  return runs;
}

function stepSpeeds(track, a, b) {
  const out = [];
  for (let k = a; k <= b; k++) {
    const [p, q] = [track[k - 1], track[k]];
    const px = Math.max(Math.hypot(q[0] - p[0], q[1] - p[1]), Math.abs(q[2] - p[2]), Math.abs(q[3] - p[3]));
    out.push(px > STILL_PX ? px : Math.abs(q[4] - p[4]) * 100);
  }
  return out;
}

/** Constant speed through the run's middle: the coefficient of variation of its inner steps is small. */
function looksLinear(speeds) {
  const inner = speeds.slice(1, -1);
  if (inner.length < 4) return false;
  const mean = inner.reduce((x, y) => x + y, 0) / inner.length;
  const sd = Math.sqrt(inner.reduce((x, y) => x + (y - mean) ** 2, 0) / inner.length);
  return mean > 0 && sd / mean < LINEAR_CV;
}

function inFrame(b, { width, height }) {
  return b[2] > 0 && b[3] > 0 && b[0] < width && b[1] < height && b[0] + b[2] > 0 && b[1] + b[3] > 0 && b[4] > SEEN;
}

function runRecord(boxes, i, own, [a, b]) {
  const track = boxes.tracks[i];
  const [s, e] = [own[a - 1], own[b]];
  const moved = boxMoved(s, e, 1);
  const fade = Math.abs(e[4] - s[4]) > SEEN;
  const [before, after] = [inFrame(track[a - 1], boxes), inFrame(track[b], boxes)];
  const linear = looksLinear(stepSpeeds(own, a, b));
  return {
    target: i, label: boxes.labels[i], id: !before && after ? 'enter' : before && !after ? 'leave' : '',
    props: [...(moved ? ['transform'] : []), ...(fade ? ['opacity'] : [])],
    delay: boxes.times[a - 1], duration: boxes.times[b] - boxes.times[a - 1],
    easing: linear ? 'linear' : 'inferred', kfEasings: [linear ? 'linear' : 'inferred'],
    opacity: fade ? [s[4], e[4]] : null,
    from: moved ? `translate(${(s[0] - e[0]).toFixed(1)}px, ${(s[1] - e[1]).toFixed(1)}px)` : '',
    fullFrame: Math.max(track[a - 1][2] * track[a - 1][3], track[b][2] * track[b][3]) >= 0.6 * boxes.area,
    step: boxes.times[1] - boxes.times[0],
  };
}

/** Motion records inferred from box tracks: one per run of an element's own change; riding its parent is not its own. */
export function recordsFromBoxes(boxes) {
  const out = [];
  boxes.tracks.forEach((track, i) => {
    if (track.length < 2 || !track.some((b) => inFrame(b, boxes))) return;
    const own = ownTrack(track, boxes.tracks[boxes.parent[i]]);
    for (const run of activeRuns(own)) out.push(runRecord(boxes, i, own, run));
  });
  return out.filter((r) => r.props.length);
}

/** Animation records and box-inferred records in one list: the two sources number their targets from 0, so the second set moves up. */
export function mergeRecords(animated, sampled) {
  const base = Math.max(-1, ...animated.map((r) => r.target)) + 1;
  return [...animated, ...sampled.map((r) => ({ ...r, target: r.target + base }))];
}

/** Every lint finding, in time order. */
export function motionLint({ records, scripted }) {
  return [...exitLength(records), ...groupLanding(records), ...linearMove(records), ...seamRepeat(records), ...oneBand(records, { scripted })]
    .sort((a, b) => a.at - b.at);
}

/** Drops a finding the page waives: authoring.allow holds its code, or code@<second to 2 places>, with a _why. */
export function unwaived(findings, authoring = {}) {
  return findings.filter((f) => !isWaived(authoring, f.code, s2(f.at)));
}

/** One printed line per finding. */
export function lintLines(findings) {
  return findings.map((f) => `rule ${f.rule} @${s2(f.at)}s ${f.code}: ${f.what}; fix: ${f.fix}`);
}
