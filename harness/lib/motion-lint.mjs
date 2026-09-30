// The motion lint: five advice lines on how a page's Web Animations move, each with its taste card
// rule, the second and one fix. collectMotion runs in the page; everything else is pure over its records.
import { isWaivedBy, hasReason } from './waivers.mjs';
import { BANDS, bandOf } from '../../core/motion/presets.js';

// motionRecord and collectMotion run inside the page (runMotionCollector bundles their source), so
// each is self-contained: no outer bindings.
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

const COLLECTOR = [motionRecord, collectMotion].map((fn) => fn.toString()).join('\n');

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
const isLinear = (r) => r.easing === 'linear' && r.kfEasings.every((e) => e === 'linear');
const s2 = (x) => x.toFixed(2);

function byTarget(records) {
  const m = new Map();
  for (const r of records) (m.get(r.target) || m.set(r.target, []).get(r.target)).push(r);
  return [...m.values()];
}

/** An exit that runs as long as or longer than its entrance, per element (card rule 5). */
export function exitLength(records) {
  const out = [];
  for (const rs of byTarget(records)) {
    const ins = rs.filter((r) => entering(r) && r.duration > CUT), outs = rs.filter((r) => exiting(r) && r.duration > CUT);
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

/** A move longer than 0.3 s on linear easing (card rule 6). */
export function linearMove(records) {
  return records.filter((r) => moves(r) && r.duration > LINEAR_LIMIT && isLinear(r)).map((r) => ({
    code: 'linear-move', rule: 6, at: r.delay,
    what: `${r.label} moves ${r.props.filter((p) => MOVE.test(p)).join(',')} for ${s2(r.duration)} s on linear easing`,
    fix: 'easing: curveToLinear(CURVES.expoOut) to land, curveToLinear(\'easeInCubic\') to leave, or enter(el)',
  }));
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

/** Every lint finding, in time order. */
export function motionLint({ records, scripted }) {
  return [...exitLength(records), ...groupLanding(records), ...linearMove(records), ...seamRepeat(records), ...oneBand(records, { scripted })]
    .sort((a, b) => a.at - b.at);
}

/** Drops a finding the page waives: authoring.allow holds its code, or code@<second to 2 places>, with a _why. */
export function unwaived(findings, { allow = [], _why = {} } = {}) {
  return findings.filter((f) => {
    const scoped = `${f.code}@${s2(f.at)}`;
    const entry = allow.find((e) => e === f.code || e === scoped);
    return !(entry && isWaivedBy(allow, f.code, s2(f.at)) && hasReason(_why, entry));
  });
}

/** One printed line per finding. */
export function lintLines(findings) {
  return findings.map((f) => `rule ${f.rule} @${s2(f.at)}s ${f.code}: ${f.what}; fix: ${f.fix}`);
}
