import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOK_NAMES } from '../../core/looks/index.js';
import { PROFILES } from './profiles.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { DENSE_KEY_SEC } from '../../core/timeline/sequence.js';
import { cutVelocityAdvice } from '../../core/timeline/velocity-cut.js';
import { population, LIBRARY, SCENE_DIR } from '../lib/census.mjs';
import { glyphText, snippet } from '../lib/text.mjs';
import { sceneTiming } from '../../quality/gates/scene-timing.mjs';
import { gateFindings } from '../lib/findings.mjs';
import { migrateOne } from './migrate-junctions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');

// you to a generator tool (https://v10.carbondesignsystem.com/guidelines/motion/overview/ ·
// https://m1.material.io/motion/duration-easing.html). So the curve below was derived from this library
const VMAX = 1232;          // px per second · this library's 95th percentile among real keyed moves

const r2 = (n) => Math.round(n * 100) / 100;

const warn = (code, msg) => ({ sev: 'WARN', code, msg });
const fail = (code, msg) => ({ sev: 'FAIL', code, msg });
const nothing = { metrics: {}, findings: [] };

function resolveFamily(d) {
  let motion = {};
  if (typeof d.theme === 'string') {
    const themePath = path.join(ROOT, 'themes', d.theme + '.json');
    if (!fs.existsSync(themePath)) throw new Error(`unknown theme "${d.theme}" (looked for ${path.relative(ROOT, themePath)})`);
    motion = JSON.parse(fs.readFileSync(themePath, 'utf8')).motion || {};
  } else {
    motion = d.theme?.motion || {};
  }
  const settle = motion.settle ?? 0.5, bounce = motion.bounce ?? 0;
  const personality = (bounce > 0.1 || settle < 0.4) ? 'punchy' : (settle >= 0.55 && bounce < 0.05) ? 'calm' : 'neutral';

  const FAMILY = {
    punchy: { cuts: ['punch', 'whip', 'zoom', 'slide'], stings: ['flash', 'streak'], seam: 'whipPan', seamTiming: 'snappy' },
    calm: { cuts: ['fade', 'blur', 'riseBlur', 'wipe'], stings: ['dissolve', 'ink', 'bokeh'], seam: 'cinematicZoom', seamTiming: 'smooth' },
    neutral: { cuts: ['fade', 'slide', 'wipe', 'blur'], stings: ['dissolve', 'flash'], seam: 'crossWarp', seamTiming: 'smooth' },
  }[personality];

  if (d.profile != null && !(d.profile in PROFILES)) {
    throw new Error(`motion-director: unknown profile "${d.profile}". Known: ${Object.keys(PROFILES).join(', ')}`);
  }
  const profile = d.profile != null ? PROFILES[d.profile] : null;
  if (profile) { FAMILY.cuts = profile.cuts.length ? profile.cuts : FAMILY.cuts; FAMILY.stings = profile.stings; }

  return { personality, settle, bounce, FAMILY, profile };
}

function tellProfile(d, layers, profile) {
  if (!profile) return nothing;
  const contradictions = [];
  const bounceUsed = layers.some((l) => ['bounce', 'elastic'].includes(l.preset));
  if (bounceUsed && profile.bounceOk === false) contradictions.push(`bounce/elastic preset on "${d.profile}", cheap on a serious brand (SELECTION §contradictions)`);
  for (const l of layers) {
    if (l.cut && profile.banCuts.includes(l.cut)) contradictions.push(`cut "${l.cut}" on "${d.profile}", announces an edit this profile hides`);
    for (const k of ['anim', 'preset']) {
      if (l[k] && (profile.banMotion || []).includes(l[k])) contradictions.push(`${k} "${l[k]}" on "${d.profile}". This profile's entrances do not overshoot`);
    }
  }
  for (const c of d.cuts || []) {
    if (profile.banCuts.includes(c.style)) contradictions.push(`cut "${c.style}" @${c.t}s on "${d.profile}", wrong for this profile's restraint`);
  }
  const families = new Set((d.cuts || []).map((c) => c.style));
  if (families.size > 2) contradictions.push(`${families.size} cut families in one film (${[...families].join(', ')}), one film, one family`);
  return { metrics: {}, findings: contradictions.map((c) => fail('profile', c)) };
}

function beatsOf(layers) {
  const s0 = (l) => l.start ?? 0;
  const starts = [...new Set(layers.filter((l) => l.track !== 0).map(s0))].sort((a, b) => a - b);
  const beats = [];
  for (const t of starts) { const last = beats[beats.length - 1]; if (!last || t - last > 1.4) beats.push(t); }
  return beats;
}


const CUT_FAMILY = {
  soft: ['none', 'fade', 'blur', 'riseBlur', 'softwipe', 'softiris'],       // dissolves, hide the seam
  motion: ['whip', 'skewWhip', 'punch', 'zoom', 'slide', 'squeeze', 'drop', 'rise', 'jitter'], // directional pushes
  shape: ['wipe', 'iris', 'clock', 'blinds', 'barn', 'letterbox'],          // matte reveals, notice the cut
  spatial: ['cube', 'flip', 'spin', 'roll', 'collapse'],                    // 3D dimensional turns
};
function tellCutFamilies(d, layers) {
  const familyOf = (style) => Object.keys(CUT_FAMILY).find((f) => CUT_FAMILY[f].includes(style)) || 'other';
  const cutStyles = [...(d.cuts || []).map((c) => c.style), ...layers.map((l) => l.cut)].filter((s) => s && s !== 'none');
  const usedFamilies = [...new Set(cutStyles.map(familyOf))];
  const metrics = cutStyles.length ? { 'cut-families': usedFamilies.length } : {};
  if (usedFamilies.length >= 3) return { metrics, findings: [fail('cut-families', `${usedFamilies.length} cut families (${usedFamilies.join(', ')}). One film, one family (TASTE-RULES: restraint)`)] };
  if (usedFamilies.length === 2) return { metrics, findings: [warn('cut-families', `2 cut families (${usedFamilies.join(', ')}). Prefer one; the director rotates WITHIN a family`)] };
  return { metrics, findings: [] };
}

const AXIS_OF = { left: 'x', right: 'x', up: 'y', down: 'y' };
function tellSeamAxisRepeat(d) {
  const dirred = [...(d.cuts || []), ...(d.seams || []), ...(d.stings || [])]
    .filter((c) => c && typeof c.t === 'number' && AXIS_OF[c.dir])
    .sort((a, b) => a.t - b.t);
  const repeats = [];
  for (let i = 1; i < dirred.length; i++) {
    const prev = dirred[i - 1], cur = dirred[i];
    if (prev.dir === cur.dir) repeats.push(`@${prev.t}s and @${cur.t}s both run ${cur.dir}`);
  }
  const metrics = dirred.length >= 2 ? { 'seam-axis-repeat': repeats.length } : {};
  if (!repeats.length) return { metrics, findings: [] };
  return { metrics, findings: [warn('seam-axis-repeat', `${repeats.length} adjacent seam(s) repeat the same axis and direction (${repeats.join('; ')}). A run of moves in one direction reads monotonous, switch axis or direction (TRANSITIONS.md: direction is a real lever)`)] };
}

function tellEffectSoup(d, layers, beats) {
  const isLook = (s) => s && LOOK_NAMES.includes(String(s).split(':')[0].trim());
  const effectsPerBeat = beats.map((t) => {
    const inBeat = (start) => start >= t - 0.05 && start < (beats[beats.indexOf(t) + 1] ?? 1e9);
    const set = new Set();
    for (const l of layers) if (inBeat(l.start ?? 0)) {
      if (isLook(l.filter)) set.add(`look:${String(l.filter).split(':')[0]}`);
      if (l.shader) set.add(`shader:${l.shader}`);
      if (l.three) set.add('three'); if (l.raymarch) set.add('raymarch');
    }
    for (const s of d.stings || []) if (inBeat(s.t ?? -9)) set.add(`sting:${s.fx}`);
    return set;
  });
  const distinctEffects = new Set(effectsPerBeat.flatMap((s) => [...s]));
  const effectBeats = effectsPerBeat.filter((s) => s.size).length;
  const effectTimes = beats.filter((t, i) => effectsPerBeat[i].size).map((t) => `${t}s`);
  const metrics = beats.length ? { 'effect-soup': effectBeats / beats.length } : {};
  if (beats.length >= 3 && effectBeats / beats.length > 0.6) {
    const strip = effectTimes.slice(2); // keep the first two as the "earned" moments, drop the rest
    return { metrics, findings: [warn('effect-soup', `an effect on ${effectBeats}/${beats.length} beats (@${effectTimes.join(', @')}). Most beats should be clean type; effects are 2-3 earned moments. Remove \`filter\`/\`shader\`/\`sting\` from the beat(s) at @${strip.join(', @')}, keeping the two earliest (TASTE-RULES: effect soup)`)] };
  }
  if (distinctEffects.size > Math.max(4, Math.ceil(beats.length / 2)))
    return { metrics, findings: [warn('effect-soup', `${distinctEffects.size} distinct effects across ${beats.length} beats (${[...distinctEffects].join(', ')}). A new look every beat is a demo reel, not a film. Pick 2-3 to keep and drop the rest.`)] };
  return { metrics, findings: [] };
}

function tellContinuity(d, layers, beats) {
  const spansABeat = (l) => { const a = l.start ?? 0, b = a + (l.dur ?? l.enterDur ?? 0); return beats.some((t) => t > a + 0.05 && t < b - 0.05); };
  const wouldTravel = (l) => l.track !== 0 && (Array.isArray(l.motion) && l.motion.length > 1 || spansABeat(l));
  if (beats.length < 4) return nothing;
  const T = sceneTiming(d);
  const survives = (l) => T.unitEnd(l) == null;
  const travelers = layers.filter((l) => wouldTravel(l) && survives(l));
  const truncated = layers.filter((l) => wouldTravel(l) && !survives(l));
  const metrics = { continuity: travelers.length };
  if (travelers.length === 0 && truncated.length && !layers.some((l) => l.acrossBeats === true))
    return { metrics, findings: [warn('continuity', `${truncated.length} layer(s) travel on paper but sceneUnits truncates each to its own beat, so none survives a cut. Mark the spine "acrossBeats":true (direction-floor blocks this as no-continuous-object).`)] };
  if (travelers.length === 0 && d.sceneUnits !== true)
    return { metrics, findings: [warn('continuity', `no element travels across a cut (no motion track, nothing spans a beat). Reads as a slideshow (TASTE-RULES: continuity). Or set "sceneUnits":true so each beat slides in/out as one unit.`)] };
  return { metrics, findings: [] };
}

function tellPacing(d, duration) {
  const cutTimes = [...new Set((d.cuts || []).map((c) => c.t).filter((t) => typeof t === 'number'))].sort((a, b) => a - b);
  if (cutTimes.length < 2) return nothing;
  const holds = cutTimes.map((t, i) => (cutTimes[i + 1] ?? (duration || t + 3)) - t);
  const tiny = holds.filter((h) => h > 0 && h < 0.9).length;
  const unreadable = holds.filter((h) => h > 0 && h < 0.5).length;
  if (unreadable >= 2) return { metrics: {}, findings: [warn('pacing', `${unreadable} cuts less than 0.5s apart. Too fast to read unless a deliberate montage`)] };
  if (tiny / cutTimes.length > 0.5) return { metrics: {}, findings: [warn('pacing', `${tiny}/${cutTimes.length} cut-to-cut holds under 0.9s. Chaotic pacing unless intentional`)] };
  return nothing;
}

function tellCutVelocity(d, allLayers, duration) {
  const cuts = (d.cuts || []).filter((c) => c && typeof c.t === 'number');
  if (!cuts.length) return nothing;
  const rows = cutVelocityAdvice(cuts, allLayers,
    { duration: duration || Infinity, camera: d.camera, ...(d.fps ? { fps: d.fps } : {}) });
  const troughs = rows.filter((r) => r.trough);
  const metrics = { cutsInTrough: troughs.length, cutsRead: rows.length };
  if (!troughs.length) return { metrics, findings: [] };
  const said = troughs.slice(0, 3).map((r) =>
    `${r.t.toFixed(2)}s at ${Math.round(r.speed)} px/s, nearest peak ${r.peak.t.toFixed(2)}s at ${Math.round(r.peak.speed)}`);
  return { metrics, findings: [warn('cut-velocity',
    `${troughs.length}/${rows.length} cut(s) land where the picture is slow. ${said.join(' \u00b7 ')}`
    + `${troughs.length > 3 ? ' \u00b7 \u2026' : ''}. A cut is invisible inside speed and obvious inside stillness, `
    + 'so put the seam on the steepest frame of the move rather than on the beat. Move the cut to the peak, '
    + 'or give the beat a move to hide in (AE-TECHNIQUES #1).')] };
}

function tellDeadFinalFrame(layers, duration) {
  if (!(duration > 0 && layers.length)) return nothing;
  const holdsEnd = layers.some((l) => l.track !== 0 && (l.exitDur === 0 || (l.start ?? 0) + (l.dur ?? 1e9) >= duration - 0.15));
  if (holdsEnd) return nothing;
  return { metrics: {}, findings: [warn('dead-final-frame', `nothing is held to the final frame (every layer exits before ${duration.toFixed(1)}s). End on a held frame, exitDur:0, never fade the payoff`)] };
}

function tellLinearMotion(layers) {
  const linearHits = [];
  const LINEAR = (e) => typeof e === 'string' && /^(linear|none)$/i.test(e.trim());
  const KEYED = ['x', 'y', 'scale', 'rot', 'opacity', 'blur', 'w', 'h'];
  const moved = (a, b) => !!a && !!b && KEYED.some((p) => (b[p] ?? null) !== (a[p] ?? null));
  const span = (a, b) => ({
    px: Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0)),
    deg: Math.abs((b.rot ?? 0) - (a.rot ?? 0)),
    ds: Math.abs((b.scale ?? 1) - (a.scale ?? 1)),
  });
  const FULL_TURN = 350;
  const AMBIENT_PX = 50;
  const AMBIENT_SCALE = 0.1;
  const constantRate = (cover) => cover.deg >= FULL_TURN
    || (cover.px < AMBIENT_PX && cover.ds < AMBIENT_SCALE && cover.deg < FULL_TURN / 2);
  const KEYED_SHAPE = 1.5;
  const shapedByKeys = (kfs, a, b) => {
    if (b === a) return false;
    const speeds = [];
    for (let i = a; i <= b; i++) {
      const dt = (kfs[i].t ?? 0) - (kfs[i - 1].t ?? 0);
      const c = span(kfs[i - 1], kfs[i]);
      const ground = c.px + c.deg + c.ds * 100;
      if (dt > 0 && ground > 0) speeds.push(ground / dt);
    }
    return speeds.length > 1 && Math.max(...speeds) / Math.min(...speeds) >= KEYED_SHAPE;
  };
  const scanTrack = (kfs, where) => {
    const flat = (i) => i >= 1 && i < kfs.length && kfs[i] && typeof kfs[i] === 'object'
      && LINEAR(kfs[i].ease) && moved(kfs[i - 1], kfs[i]);
    for (let a = 1; a < kfs.length; a++) {
      if (!flat(a)) continue;
      let b = a; while (flat(b + 1)) b++;
      const enteredFromRest = a === 1 || !moved(kfs[a - 2], kfs[a - 1]);
      const leftAtRest = b === kfs.length - 1 || !moved(kfs[b], kfs[b + 1]);
      if (enteredFromRest && leftAtRest && !constantRate(span(kfs[a - 1], kfs[b])) && !shapedByKeys(kfs, a, b))
        for (let i = a; i <= b; i++) linearHits.push(`${where}[${i}]`);
      a = b;
    }
  };
  const scanEase = (o, where) => {
    if (!o || typeof o !== 'object') return;
    if (LINEAR(o.ease)) linearHits.push(where);
    for (const k of Object.keys(o)) { const v = o[k];
      if (k === 'motion' && Array.isArray(v)) { scanTrack(v, `${where}.motion`); continue; }
      if (Array.isArray(v)) v.forEach((it, i) => scanEase(it, `${where}.${k}[${i}]`));
      else if (v && typeof v === 'object') scanEase(v, `${where}.${k}`); }
  };
  layers.forEach((l, i) => scanEase(l, `layer[${i}]`));
  const metrics = { 'linear-motion': linearHits.length };
  if (!linearHits.length) return { metrics, findings: [] };
  return { metrics, findings: [warn('linear-motion', `${linearHits.length} move(s) run FLAT from rest to rest on ease "linear"/"none", at ${linearHits.slice(0, 4).join(', ')}${linearHits.length > 4 ? `, …` : ''}. Set the entrance key's \`ease\` to "easeOutBack" (or "spring") and the exit key's to an ease-in curve, so the move decelerates into rest and accelerates out of it (DIRECTION.md: slow-in/slow-out). A pan, scroll, marquee, spinner or ambient drift is exempt: it is entered or left in motion, it turns a full circle, it stays inside the ambient band, or its keys are spaced so the run already decelerates.`)] };
}

function measureKeyedSpeed(allLayers) {
  const moves = [];
  for (const l of allLayers) {
    if (!Array.isArray(l.motion) || l.motion.length < 2) continue;
    for (let i = 1; i < l.motion.length; i++) {
      const a = l.motion[i - 1], b = l.motion[i];
      const dt = (b.t ?? 0) - (a.t ?? 0);
      if (!(dt >= DENSE_KEY_SEC)) continue;
      const dist = Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0));
      if (dist <= 0) continue;
      moves.push({ l, i, dt, dist, v: dist / dt });
    }
  }
  if (!moves.length) return { metrics: {}, findings: [], fastest: null };
  moves.sort((a, b) => b.v - a.v || allLayers.indexOf(a.l) - allLayers.indexOf(b.l) || a.i - b.i);
  return {
    metrics: { 'keyed-speed': moves[0].v },
    findings: [],
    fastest: { ...moves[0], over: moves.filter((m) => m.v > VMAX).length },
  };
}

function tellMonotoneTiming(allLayers) {
  const explicitDurs = allLayers.map((l) => l.enterDur).filter((v) => typeof v === 'number');
  if (!(explicitDurs.length >= 6 && new Set(explicitDurs).size === 1)) return nothing;
  return { metrics: {}, findings: [warn('monotone-timing', `${explicitDurs.length} entrances all set enterDur:${explicitDurs[0]}. Uniform tempo reads as monotone. Timing is a voice: ambient drifts slow (0.6-1s), payoffs snap (0.25-0.35s), thesis lines luxurious (DIRECTION.md: timing)`)] };
}


function tellSharedStart(layers) {
  const startClumps = new Map();
  for (const l of layers) {
    if (l.track === 0) continue;
    const s = r2(l.start ?? 0);
    if (!startClumps.has(s)) startClumps.set(s, []);
    startClumps.get(s).push(l);
  }
  const metrics = startClumps.size ? { 'shared-start': Math.max(...[...startClumps.values()].map((ls) => ls.length)) } : {};
  const blocked = [...startClumps.entries()].filter(([, ls]) => ls.length >= 3).sort((a, b) => b[1].length - a[1].length);
  if (!blocked.length) return { metrics, findings: [] };
  const [t0, ls0] = blocked[0];
  const rest = blocked.length > 1 ? ` (and ${blocked.length - 1} more start${blocked.length > 2 ? 's' : ''} carrying 3+)` : '';
  return { metrics, findings: [warn('shared-start', `${ls0.length} layers all start at ${t0}s${rest}. They arrive as one block, so nothing tells the eye what to read first. Stagger entrances at irregular offsets; begin the next while the last is still settling (MOTION-CRAFT rule 3). At ${t0}s: ${[...new Set(ls0.map(label))].slice(0, 4).join(' · ')}`)] };
}

const RATE_PRESET = new Set(['type', 'wave']);
function tellStaggerTotal(allLayers) {
  const staggerUnits = (l) => {
    if (l.split) {
      const t = glyphText(String(l.text ?? ''));
      const mode = String(l.split);
      if (/char/.test(mode)) return t.replace(/\s/g, '').length;
      if (/line/.test(mode)) return t.split('\n').length;
      return t.trim().split(/\s+/).filter(Boolean).length;
    }
    if (Array.isArray(l.children) && l.each != null) return l.children.length;
    return 0;                                   // `parts` selects at render time; the count is unknowable here
  };
  const STAGGER_CAP = 0.5;
  const longStaggers = [];
  const staggerTotals = [];
  for (const l of allLayers) {
    const step = l.stagger;
    if (typeof step !== 'number' || step <= 0) continue;
    if (l.loop || l.typing || RATE_PRESET.has(l.preset)) continue;
    const n = staggerUnits(l);
    if (n < 2) continue;
    const total = (n - 1) * step;
    staggerTotals.push(total);
    if (total > STAGGER_CAP) longStaggers.push({ l, n, step, total });
  }
  const metrics = staggerTotals.length ? { 'stagger-total': Math.max(...staggerTotals) } : {};
  if (!longStaggers.length) return { metrics, findings: [] };
  longStaggers.sort((a, b) => b.total - a.total);
  const w = longStaggers[0];
  return { metrics, findings: [warn('stagger-total', `${longStaggers.length} staggered arrival(s) run past ${STAGGER_CAP}s end to end. Worst, ${label(w.l)}: ${w.n} units x ${w.step}s = ${w.total.toFixed(2)}s. Past about half a second the last unit lands in a different beat from the first. Cut the step, or split the group.`)] };
}

function tellUnevenCascade(layers) {
  const CASCADE_GAP = 0.3;      // a wider hole is a new beat, not the next item
  const CASCADE_SPAN = 1.2;     // an arrival, not the film's whole running order
  const DRIFT_FLOOR = 0.04;     // one frame at 30fps rounds; under ~40ms unevenness is not seen
  const cascadeKey = (l) => [l.type || 'text', l.anim || '', l.preset || '', l.enterDur ?? '', l.split || ''].join('|');
  const cascadeGroups = new Map();
  for (const l of layers) { if (l.track === 0) continue; const k = cascadeKey(l); if (!cascadeGroups.has(k)) cascadeGroups.set(k, []); cascadeGroups.get(k).push(l); }
  const uneven = [];
  const cascadeRatios = [];
  for (const [, ls] of cascadeGroups) {
    const st = [...new Set(ls.map((l) => l.start ?? 0))].sort((a, b) => a - b);
    const runs = []; let cur = [st[0]];
    for (let i = 1; i < st.length; i++) { if (st[i] - st[i - 1] <= CASCADE_GAP) cur.push(st[i]); else { runs.push(cur); cur = [st[i]]; } }
    runs.push(cur);
    for (const run of runs) {
      if (run.length < 3 || run[run.length - 1] - run[0] > CASCADE_SPAN) continue;
      const iv = run.slice(1).map((t, i) => t - run[i]);
      const avg = iv.reduce((a, b) => a + b, 0) / iv.length;
      if (avg <= 0.001) continue;
      const drift = Math.max(...iv.map((v) => Math.abs(v - avg)));
      cascadeRatios.push(drift / avg);
      if (drift >= avg * 0.3 && drift >= DRIFT_FLOOR) uneven.push({ run, iv, avg, drift, layer: ls.find((l) => (l.start ?? 0) === run[0]) });
    }
  }
  const metrics = cascadeRatios.length ? { 'uneven-cascade': Math.max(...cascadeRatios) } : {};
  if (!uneven.length) return { metrics, findings: [] };
  uneven.sort((a, b) => b.drift - a.drift);
  const u = uneven[0];
  const ms = (v) => `${Math.round(v * 1000)}ms`;
  return { metrics, findings: [warn('uneven-cascade', `${uneven.length} cascade(s) of like layers keep an uneven beat. Worst, ${u.run.length} x ${label(u.layer)} from ${r2(u.run[0])}s at ${u.iv.map(ms).join(' / ')} (average ${ms(u.avg)}, drift ${ms(u.drift)}). One cascade holds ONE interval; vary the offset BETWEEN beats, not inside a single sweep (MOTION-CRAFT rule 3).`)] };
}

function tellTempoFlat(allLayers) {
  const TEMPO_TARGET = 3, TEMPO_FLOOR = 1.5;
  const durs = allLayers.map((l) => l.enterDur).filter((v) => typeof v === 'number' && v > 0);
  if (durs.length < 4) return nothing;
  const metrics = { 'tempo-flat': Math.max(...durs) / Math.min(...durs) };
  if (new Set(durs).size === 1) return { metrics, findings: [] };   // a dead heat is monotone-timing's finding, not this one
  const lo = Math.min(...durs), hi = Math.max(...durs), ratio = hi / lo;
  if (ratio >= TEMPO_FLOOR) return { metrics, findings: [] };
  return { metrics, findings: [warn('tempo-flat', `${durs.length} entrances span only ${lo}s to ${hi}s (${ratio.toFixed(2)}x). One speed for the whole film reads as narration. Aim for about ${TEMPO_TARGET}x between the slowest and the fastest: payoffs snap 0.25-0.35s, ambient drifts 0.75-1.2s (MOTION-CRAFT rule 1 + the speed dials).`)] };
}

function tellEnterAndRetreat(allLayers) {
  const DIR = /^slide-(left|right|up|down)$/;
  const retreats = allLayers.filter((l) => DIR.test(l.anim || '') && DIR.test(l.out || '') && l.anim.split('-')[1] === l.out.split('-')[1]);
  const metrics = { 'enter-and-retreat': retreats.length };
  if (!retreats.length) return { metrics, findings: [] };
  const named = retreats.slice(0, 4).map((l, i) => `"${l.id || l.class || `layer[${allLayers.indexOf(l)}]`}" (anim:"${l.anim}" + out:"${l.out}")`);
  const side = (a) => a.split('-')[1];
  const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
  return { metrics, findings: [warn('enter-and-retreat', `${retreats.length} layer(s) enter and exit on the same side: ${named.join(', ')}${retreats.length > 4 ? ', …' : ''}. Set \`out\` to slide-${opposite[side(retreats[0].anim)]}, the opposite of \`anim\`, so the layer travels one continuous direction (DIRECTION.md: paired directional exits).`)] };
}

function analyse(d) {
  const layers = d.layers || [];
  const allLayers = (() => { const out = []; const rec = (ls) => { for (const l of ls || []) if (l && typeof l === 'object') { out.push(l); if (l.children) rec(l.children); } }; rec(layers); return out; })();
  const duration = d.duration || 0;
  const { personality, settle, bounce, FAMILY, profile } = resolveFamily(d);
  const beats = beatsOf(layers);
  const speed = measureKeyedSpeed(allLayers);

  const metrics = {};
  const findings = [];
  for (const tell of [
    tellCutFamilies(d, layers),
    tellSeamAxisRepeat(d),
    tellEffectSoup(d, layers, beats),
    tellContinuity(d, layers, beats),
    tellPacing(d, duration),
    tellCutVelocity(d, allLayers, duration),
    tellDeadFinalFrame(layers, duration),
    tellLinearMotion(layers),
    speed,
    tellMonotoneTiming(allLayers),
    tellSharedStart(layers),
    tellStaggerTotal(allLayers),
    tellUnevenCascade(layers),
    tellTempoFlat(allLayers),
    tellEnterAndRetreat(allLayers),
    tellProfile(d, layers, profile),
  ]) { Object.assign(metrics, tell.metrics); findings.push(...tell.findings); }

  return { layers, allLayers, beats, duration, findings, metrics, fastest: speed.fastest, personality, settle, bounce, FAMILY, profile };
}

const label = (l) => `${l.type || 'text'}${l.text ? ` "${snippet(String(l.text))}"` : ''}`;

const SCALE = {
  'shared-start':      { worse: 'high', unit: (v) => `${v} layers on one frame` },
  'tempo-flat':        { worse: 'low',  unit: (v) => `${v.toFixed(2)}x spread` },
  'linear-motion':     { worse: 'high', unit: (v) => `${v} flat move(s)` },
  'cut-families':      { worse: 'high', unit: (v) => `${v} famil${v === 1 ? 'y' : 'ies'}` },
  'seam-axis-repeat':  { worse: 'high', unit: (v) => `${v} repeat(s)` },
  'uneven-cascade':    { worse: 'high', unit: (v) => `drift ${(v * 100).toFixed(0)}% of the interval` },
  'effect-soup':       { worse: 'high', unit: (v) => `an effect on ${(v * 100).toFixed(0)}% of beats` },
  'stagger-total':     { worse: 'high', unit: (v) => `${v.toFixed(2)}s end to end` },
  'continuity':        { worse: 'low',  unit: (v) => `${v} traveller(s)` },
  'enter-and-retreat': { worse: 'high', unit: (v) => `${v} retreat(s)` },
  'keyed-speed':       { worse: 'high', unit: (v) => `${Math.round(v)} px/s at its fastest` },
};

const sceneFiles = () => population('direction census', {
  filter: LIBRARY, quiet: true, soft: true,
});

function library() {
  const pop = sceneFiles();
  if (pop.blind) return { blind: pop.blind };
  const trips = new Map(), values = new Map();
  let films = 0;
  for (const f of pop.names) {
    let d; try { d = loadScene(JSON.parse(fs.readFileSync(path.join(ROOT, SCENE_DIR, f), 'utf8'))); } catch { continue; }
    if (d.module !== 'scene') continue;
    films++;
    let a; try { a = analyse(d); } catch { continue; }
    for (const c of new Set(a.findings.map((x) => x.code))) trips.set(c, (trips.get(c) || 0) + 1);
    for (const [c, v] of Object.entries(a.metrics)) { if (!values.has(c)) values.set(c, []); values.get(c).push(v); }
  }
  for (const arr of values.values()) arr.sort((a, b) => a - b);
  return { films, trips, values, blind: null };
}

function census(code, mine, lib) {
  const tripped = lib.trips.get(code) || 0;
  const share = `${tripped} of ${lib.films} films trip this`;
  const sc = SCALE[code], all = lib.values.get(code);
  if (!sc || mine == null || !all || all.length < 8) return { line: share, rank: 1 - tripped / lib.films };
  const mid = all[Math.floor(all.length / 2)];
  const worse = sc.worse === 'high' ? all.filter((v) => v > mine).length : all.filter((v) => v < mine).length;
  const rank = 1 - worse / all.length;
  return {
    line: `${share}. On its measure: yours ${sc.unit(mine)}, the median of ${all.length} films ${sc.unit(mid)}, `
      + `and ${worse} film${worse === 1 ? '' : 's'} sit${worse === 1 ? 's' : ''} further out than yours.`,
    rank,
  };
}

if (!file) {
  const lib = library();
  if (lib.blind) { console.error(`\n  ✗ direction census: BLIND SWEEP, ${lib.blind}\n`); process.exit(3); }
  console.log(`\n  direction census · ${lib.films} scenes · how often each rule fires, and the spread behind it`);
  console.log(`  A share is not a verdict on the films and a median is not a target. A code most of the`);
  console.log(`  library trips is a code on trial (waiver-drift.mjs makes the same argument about waivers).\n`);
  const codes = [...lib.trips.keys()].sort((a, b) => lib.trips.get(b) - lib.trips.get(a) || a.localeCompare(b));
  for (const c of codes) {
    const all = lib.values.get(c), sc = SCALE[c];
    const spread = all && all.length >= 8 && sc
      ? `   p10 ${sc.unit(all[Math.floor(all.length * 0.1)])} · median ${sc.unit(all[Math.floor(all.length / 2)])} · p90 ${sc.unit(all[Math.floor(all.length * 0.9)])}`
      : '';
    console.log(`  ${c.padEnd(19)} ${String(lib.trips.get(c)).padStart(3)} film(s)  ${(100 * lib.trips.get(c) / lib.films).toFixed(0).padStart(3)}%${spread}`);
  }
  const unruled = Object.keys(SCALE).filter((c) => !lib.trips.has(c) && (lib.values.get(c) || []).length >= 8).sort();
  if (unruled.length) {
    console.log(`\n  measured, no rule attached:`);
    for (const c of unruled) {
      const all = lib.values.get(c);
      console.log(`  ${c.padEnd(19)} ${String(all.length).padStart(3)} film(s)       p10 ${SCALE[c].unit(all[Math.floor(all.length * 0.1)])}`
        + ` · median ${SCALE[c].unit(all[Math.floor(all.length / 2)])} · p90 ${SCALE[c].unit(all[Math.floor(all.length * 0.9)])}`);
    }
  }
  console.log('');
  process.exit(0);
}

const d = loadScene(JSON.parse(fs.readFileSync(file, 'utf8')));
const { layers, beats, duration, findings, metrics, fastest, personality, settle, bounce, FAMILY, profile } = analyse(d);

const picks = [];
const bgAt = (t) => { let w = null; for (const b of d.bg || []) if (t >= (b.from ?? 0) && t < (b.to ?? 1e9)) w = b; return w ? `${w.preset || 'plain'}:${w.value || ''}` : null; };
beats.forEach((t, i) => {
  if (i === 0) return; // the first beat opens; nothing to transition FROM
  const bgChanged = bgAt(t - 0.05) !== bgAt(t + 0.05);
  const cut = FAMILY.cuts[(i - 1) % FAMILY.cuts.length];
  const sting = bgChanged ? FAMILY.stings[(i - 1) % FAMILY.stings.length] : null;
  const reason = bgChanged ? 'background jumps → cover the cut with a sting' : 'same background → a clean cut reads';
  picks.push({ t, cut, sting, reason });
});

if (picks.length && !profile) {
  const holdOf = (t) => { const i = beats.indexOf(t); return (beats[i + 1] ?? (duration || t + 3)) - t; };
  let payoff = null, best = -1;
  for (const p of picks) { const h = holdOf(p.t); if (h > best) { best = h; payoff = p; } }
  if (payoff && best >= 1.2) { // a real hold, not a fast montage beat
    payoff.seam = FAMILY.seam; payoff.seamTiming = FAMILY.seamTiming;
    payoff.seamReason = `held ${best.toFixed(1)}s → the payoff. Earn ONE expressive seam here: ${FAMILY.seam} (${FAMILY.seamTiming}) blends BOTH beats so the reveal lands as a move, not a slideshow`;
  }
}

console.log(`\n  motion director · ${file}`);
console.log(`  brand personality: ${personality}  (settle ${settle}, bounce ${bounce}) → cut family [${FAMILY.cuts.join(', ')}]${profile ? '' : ` · payoff seam ${FAMILY.seam}`}`);
if (profile) console.log(`  profile: ${d.profile}  (restraint ${profile.restraint}, face ${profile.face}, bounce ${profile.bounceOk})`);
console.log(`  transitions: one invisible cut family carries ~all seams; the accents are stings on background jumps + ONE seam at the payoff. Theory: engine-doctrine/CRAFT/TRANSITIONS.md`);

const needCensus = findings.length > 0 || (fastest && fastest.v > VMAX);
const lib = needCensus ? library() : { blind: 'nothing to place' };
for (const f of findings) {
  const c = lib.blind ? null : census(f.code, metrics[f.code], lib);
  f.census = c?.line || null;
  f.rank = f.sev === 'FAIL' ? 2 : (c?.rank ?? 0.5);
}
findings.sort((a, b) => b.rank - a.rank || a.code.localeCompare(b.code) || a.msg.localeCompare(b.msg));

const fails = findings.filter((f) => f.sev === 'FAIL');
const warns = findings.filter((f) => f.sev === 'WARN');
console.log(`\n  direction audit: ${fails.length} fail · ${warns.length} warn${findings.length > 1 ? '   (most unusual first)' : ''}`);
if (findings.length && !lib.blind) console.log(`  Each finding carries where this film sits in the ${lib.films}-scene library. That is a position, not a\n`
  + `  target: the rule is what fired, and the median is only what has been made here.`);
if (findings.length && lib.blind && lib.blind !== 'no findings') console.log(`  census BLIND (${lib.blind}), findings print without their library context.`);
// One fact, one owner: the record carries the finding, the renderer carries the layout, and
// author-check reads `code` rather than re-reading the line (engine-doctrine/MISTAKES.md #401).
const F = gateFindings({ scene: file, indent: '    ',
  line: (r, g) => `    ${g} [${r.code}] ${r.summary}` + (r.census ? `\n        library: ${r.census}` : '') });
for (const f of findings) F.finding({ code: f.code, severity: f.sev === 'FAIL' ? 'error' : 'warn', summary: f.msg, ...(f.census ? { census: f.census } : {}) });
F.emit();
if (!findings.length) console.log('    ✓ direction reads clean');

if (fastest && fastest.v > VMAX) {
  const place = !lib.blind && lib.values.get('keyed-speed')
    ? ` ${lib.values.get('keyed-speed').filter((v) => v > fastest.v).length} of the ${lib.values.get('keyed-speed').length} films that key a move run faster.`
    : '';
  console.log(`\n  note · fastest keyed move ${Math.round(fastest.v)} px/s (${label(fastest.l)} motion[${fastest.i}], `
    + `${Math.round(fastest.dist)}px in ${fastest.dt}s)${fastest.over > 1 ? `, one of ${fastest.over} past the line` : ''}.`);
  console.log(`  Past this library's 95th percentile of ${VMAX} px/s.${place} NOT a defect: a reveal bar, a large`);
  console.log(`  pane leaving and a card tucking away all sit here and all read clean. Watch it, do not obey it.`);
}
console.log('');
if (!picks.length) console.log('  only one beat: no transitions to direct.\n');
for (const p of picks) {
  console.log(`  @${p.t.toFixed(1)}s  cut: ${p.cut.padEnd(9)}${p.sting ? `sting: ${p.sting.padEnd(9)}` : ''.padEnd(16)}${p.reason}`);
  if (p.seam) console.log(`           ★ seam: ${p.seam} (${p.seamTiming}), ${p.seamReason}`);
}

if (WRITE) {
  const stings = [...(d.stings || [])];
  for (const p of picks) {
    for (const L of layers) if (Math.abs((L.start ?? 0) - p.t) < 0.01 && L.track !== 0 && !L.cut && (L.type === undefined || L.type !== 'rect')) L.cut = p.cut;
    if (p.sting && !stings.some((s) => Math.abs((s.t ?? 0) - p.t) < 0.2)) stings.push({ t: r2(p.t), fx: p.sting, dur: 0.6 });
  }
  if (stings.length) d.stings = stings.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const seamsOut = [...(d.seams || [])];
  for (const p of picks) if (p.seam && !seamsOut.some((s) => Math.abs((s.t ?? 0) - p.t) < 0.2)) seamsOut.push({ t: r2(p.t), fx: p.seam, dur: 0.6, timing: p.seamTiming });
  if (seamsOut.length) d.seams = seamsOut.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const out = file.replace(/\.json$/, '.directed.json');
  fs.writeFileSync(out, JSON.stringify(migrateOne(d).next, null, 2));
  console.log(`\n  ✓ applied → ${out}  (${picks.length} cuts, ${picks.filter((p) => p.sting).length} stings, ${picks.filter((p) => p.seam).length} seam)\n`);
} else {
  console.log(`\n  suggest-only. Re-run with WRITE=1 (or --write) to apply → <file>.directed.json`);
  if (fails.length) {
    console.log(`\n  ✗ direction gate: ${fails.length} rule violation(s), fix before rendering.\n`);
    process.exit(1);
  }
  console.log(warns.length ? `\n  gate passed with ${warns.length} warning(s) to review.\n` : `\n  ✓ direction gate clean.\n`);
}
