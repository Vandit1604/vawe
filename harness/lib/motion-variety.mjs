// Five advice lines on how the moves of a scene differ, from the motion records (rules entrance-origin, ease-variety, follow-through and arrival-rhythm):
// entrances all from one direction, too many eases in a scene, two layers that move in lockstep, an element whose properties all stop on one frame,
// and entrances that never overlap. Pure. Each number is read
// from taste/build/limits.json; a scene is a run of entrances with no gap over scene-budget.scene_gap_s between two of them.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { CUT, moves, entering, measured, easeName, moveDirection, byTarget } from './motion-records.mjs';

const s2 = (x) => x.toFixed(2);
const own = (records) => records.filter((r) => !r.decorative && r.duration > CUT);

/** The records split into scenes, each { at, records }: a scene starts at its first entrance, and a gap between entrances over the limit starts the next. */
export function scenesOf(records, gap = LIMITS['scene-budget'].scene_gap_s) {
  const starts = own(records).filter(entering).map((r) => r.delay).sort((a, b) => a - b);
  const bounds = starts.filter((t, i) => i === 0 || t - starts[i - 1] > gap);
  if (!bounds.length) return [];
  const scenes = bounds.map((at) => ({ at, records: [] }));
  for (const r of own(records)) {
    const k = bounds.filter((t) => t <= r.delay + 1e-9).length - 1;
    scenes[Math.max(0, k)].records.push(r);
  }
  return scenes;
}

const WHERE = { 'x-': 'the left', 'x+': 'the right', 'y-': 'above', 'y+': 'below' };

/** The entering records as cascades: elements that start within stagger.calm_max_s of the one before arrive as one phrase. Each is the first record of its cascade. */
function cascades(entrances, gap = LIMITS.stagger.calm_max_s) {
  const out = [];
  let last = -Infinity;
  for (const r of [...new Map(entrances.map((e) => [e.target, e])).values()].sort((a, b) => a.delay - b.delay)) {
    if (r.delay - last > gap) out.push(r);
    last = r.delay;
  }
  return out;
}

/** A scene whose entrances (three or more cascades, a stagger of one phrase counting once) all start offset the same way (rule entrance-origin). */
export function entranceDirection(records, { sameMin = LIMITS['entrance-origin'].same_direction_min } = {}) {
  const out = [];
  for (const { at, records: rs } of scenesOf(records)) {
    const ins = cascades(rs.filter(entering));
    const dirs = new Set(ins.map((r) => moveDirection(r.from)));
    if (ins.length >= sameMin && dirs.size === 1 && !dirs.has('')) out.push({ code: 'entrance-direction', rule: 'entrance-origin', at,
      what: `${ins.length} entrances in the scene at ${s2(at)} s all come from ${WHERE[[...dirs][0]]}`,
      fix: 'vary the origin: one from a side, one from scale, one on opacity only, or from the thing that triggered it' });
  }
  return out;
}

const curveOf = (r) => {
  const curve = [r.easing, ...r.kfEasings].find((e) => e !== 'linear');
  return curve === undefined || curve === 'inferred' ? null : (easeName({ easing: curve }) ?? curve);
};

/** A scene whose entrances use more distinct eases than the limit (rule ease-variety). */
export function easeCount(records, { max = LIMITS['ease-variety'].eases_per_scene_max } = {}) {
  const out = [];
  for (const { at, records: rs } of scenesOf(records)) {
    const names = [...new Set(rs.filter((r) => moves(r) && entering(r) && measured(r)).map(curveOf).filter(Boolean))];
    if (names.length > max) out.push({ code: 'ease-count', rule: 'ease-variety', at,
      what: `the scene at ${s2(at)} s uses ${names.length} eases (${names.slice(0, 4).join(', ')}); the rule allows ${max}`,
      fix: 'pick the scene ease from the signature and reuse it; keep a second only for a drift or a settle' });
  }
  return out;
}

const spread = (xs) => Math.max(...xs) - Math.min(...xs);

/** Beats are runs of entrances that start within stagger.total_max_s of the one before; a beat of two or more elements that start and last alike is lockstep (rule ease-variety). */
export function lockstep(records, { tol = LIMITS['ease-variety'].lockstep_tol_s, window = LIMITS.stagger.total_max_s } = {}) {
  const moving = own(records).filter((r) => moves(r) && entering(r) && measured(r)).sort((a, b) => a.delay - b.delay);
  const beats = [];
  for (const r of moving) {
    const last = beats.at(-1);
    if (last && r.delay - last.at.at(-1) <= window) { last.at.push(r.delay); last.rs.push(r); } else beats.push({ at: [r.delay], rs: [r] });
  }
  return beats.filter(({ rs }) => new Set(rs.map((r) => r.target)).size >= 2 && spread(rs.map((r) => r.delay)) <= tol && spread(rs.map((r) => r.duration)) <= tol)
    .map(({ rs }) => ({ code: 'lockstep', rule: 'ease-variety', at: rs[0].delay,
      what: `${new Set(rs.map((r) => r.target)).size} elements move in lockstep (all start at ${s2(rs[0].delay)} s and last ${s2(rs[0].duration)} s): ${[...new Set(rs.map((r) => r.label))].slice(0, 3).join(', ')}`,
      fix: 'offset the second layer by 60 to 100 ms, or give it a different duration' }));
}

const TRAIL = LIMITS['follow-through'];
const OVERLAP = LIMITS['arrival-rhythm'];

/** Elements whose entrance properties all end on one frame (animation records only: a run read from boxes carries its fade and move as one): two or more properties, no trailing one (rule follow-through). One finding for the film, naming the first elements. */
export function followThrough(records) {
  const same = byTarget(own(records).filter((r) => entering(r) && !r.step)).flatMap((rs) => {
    const props = new Set(rs.flatMap((r) => r.props));
    const ends = rs.map((r) => r.delay + r.duration);
    return props.size >= 2 && spread(ends) <= TRAIL.end_spread_max_s ? [{ label: rs[0].label, at: Math.min(...rs.map((r) => r.delay)), end: Math.max(...ends) }] : [];
  }).sort((a, b) => a.at - b.at);
  if (!same.length) return [];
  return [{ code: 'follow-through', rule: 'follow-through', at: same[0].at,
    what: `${same.length} element${same.length === 1 ? ' stops' : 's stop'} every property on one frame (${same.slice(0, 3).map((e) => `${e.label} at ${s2(e.end)} s`).join(', ')})`,
    fix: `let a trailing property finish ${TRAIL.trail_min_s} to ${TRAIL.trail_max_s} s later: the scale or the shadow after the position, as its own move` }];
}

/** Three or more entrances in a row where each starts only after the one before has landed (rule arrival-rhythm). One finding per chain. */
export function noOverlap(records, { chainMin = OVERLAP.chain_min, gap = LIMITS.stagger.total_max_s } = {}) {
  const ins = [...new Map(own(records).filter((r) => moves(r) && entering(r) && measured(r)).sort((a, b) => a.delay - b.delay).map((r) => [r.target, r])).values()];
  const out = [];
  let chain = [];
  const flush = () => { if (chain.length >= chainMin) out.push(chain); chain = []; };
  for (const r of ins) {
    const prev = chain.at(-1);
    if (prev && r.delay >= prev.delay + prev.duration - 1e-9 && r.delay - (prev.delay + prev.duration) <= gap) chain.push(r); else { flush(); chain = [r]; }
  }
  flush();
  return out.map((c) => ({ code: 'no-overlap', rule: 'arrival-rhythm', at: c[0].delay,
    what: `${c.length} entrances arrive one after another with no overlap from ${s2(c[0].delay)} s (${c.slice(0, 3).map((r) => r.label).join(', ')})`,
    fix: 'start each move while the last still settles, at 60 to 70 percent of it: layer(main, secondary) from core/motion/presets.js' }));
}

/** The findings together. */
export const motionVariety = (records) => [...entranceDirection(records), ...easeCount(records), ...lockstep(records), ...followThrough(records), ...noOverlap(records)];
