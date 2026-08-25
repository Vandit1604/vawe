// scripts/author/motion-director.mjs — the MOTION DIRECTOR. Picks the right cut/sting per beat-transition from
// the brand's motion personality (theme.motion) + the MOTION-CRAFT ruleset, so effects are chosen with
// restraint instead of the author over-reaching. Suggest-first: prints a director's report; WRITE=1 (or
// --write) applies the picks into <file>.directed.json. Deterministic (pure mapping, no Date/random).
//
// Rules encoded (docs/MOTION-CRAFT.md): cover a hard background jump with a sting · whip/punch only when
// the background DOESN'T change · one cut family per film, rotated so no archetype repeats · match the
// brand: punchy → snap cuts, calm → dissolves.
//
// WHY THIS FILE ALSO CARRIES A CENSUS. Twelve rules run here and eleven of them warn. Measured across the
// library, 104 of 135 scenes trip at least one, so the report an author actually meets is a wall of prose
// that says the same eleven things it said on the last film. A warning with no scale asks the author to
// take the rule's word for it, and after the hundredth repeat nobody does. So every finding now carries
// two numbers: how many films in this library trip the same code, and where THIS film sits on that rule's
// own measure. `waiver-drift.mjs` and `pace-check.mjs` both already argue from the library rather than
// from taste; this copies them.
//
// THE CENSUS SETS NO TARGET, and that is deliberate. It annotates findings that ALREADY fired and can
// neither create one nor clear one — every threshold is exactly where it was. The library median is
// printed as a description of what has been made here, never as a mark to reach, because a census that
// became a target would push every film toward one rhythm and that is a worse library, not a better one
// (the same reasoning that keeps pace-check's floor at the tenth percentile instead of the median).
//
// Usage: node scripts/author/motion-director.mjs <scene.json> [--write]   ·   make direct D=<file> [WRITE=1]
//        node scripts/author/motion-director.mjs                          — the library census, no verdict
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOK_NAMES } from '../../core/looks.js';
import { PROFILES } from './profiles.mjs';
import { lowerScene } from '../../core/transitions-lower.js';
import { DENSE_KEY_SEC } from '../../core/sequence.js';
import { population, isTemplate, SCENE_DIR } from '../lib/census.mjs';
import { glyphText, snippet } from '../lib/text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');

// ---- HOW FAST A KEYED MOVE RUNS, AND WHY THIS IS A NOTE AND NOT A RULE ----------------------------
//
// The question was whether a move's duration follows the ground it covers, and whether a gate should
// enforce it. Carbon and Material both state the doctrine and NEITHER publishes the equation; both send
// you to a generator tool (https://v10.carbondesignsystem.com/guidelines/motion/overview/ ·
// https://m1.material.io/motion/duration-easing.html). So the curve below was derived from this library
// rather than imported. Importing one would also import its premise: every published figure is a
// duration a person is WAITING through, and nobody waits through a film.
//
// WHAT THE LIBRARY SAYS. Over all 135 gate-visible scenes, every motion-track segment that covers ground
// in a span the engine treats as a span (DENSE_KEY_SEC, below): n=345 moves. Bucketed by distance, the
// MEDIAN SPEED IS FLAT — 644 px/s over 50-150px, 652 over 150-300, 712 over 300-600, 697 over 600-1000.
// Flat speed is duration scaling with distance, linearly, and it is already what these films do. Carbon's
// non-linear claim does not reproduce here. Below 50px the median drops to 72 px/s across 176 moves,
// which is ambient drift and is deliberate.
//
// WHY NO RULE FIRES ON THE TAIL. Seven films carry a move above the library's 95th percentile of
// 1232 px/s. Three were rendered and read frame by frame at 30fps, and the arithmetic was wrong about
// every one:
//   creed-launch  a 2px x 1080px rule sweeping the frame at 4830 px/s. It is a REVEAL: the UI arrives
//                 behind it. Its speed is the reveal's speed, and the frames read clean.
//   glass         an 1800px pane leaving at 1232 px/s. It travels 2% of its own width per frame.
//   ab2-skill-tenor  a 680px card tucking into a slot at 1449 px/s while it shrinks. Legible throughout.
// A size-relative test does not rescue it either: creed's bar is 2px wide and steps 161px per frame, so
// it fails that test hardest of the three while being the most obviously correct. Speed cannot tell a
// travelling SUBJECT from a sweeping reveal, and nothing in the JSON can.
//
// So the number is printed as a note beside the audit and never as a finding. This repo has twice paid
// for a gate that measured the wrong thing (`visual-vocabulary` squared a hairline into a tenth of the
// frame; `make slop` ran 41 rules over evidence for three), and a wrong gate manufactures confidence,
// which is worse than no gate.
const VMAX = 1232;          // px per second · this library's 95th percentile among real keyed moves

const r2 = (n) => Math.round(n * 100) / 100;

// ---- ONE SCENE, MEASURED ---------------------------------------------------------------------------
// Returns findings, the beats the report needs, and `metrics`: the scalar behind each rule, computed
// whether or not the rule fired. The census needs the whole distribution, not just the failures, so a
// metric is recorded any time it is DEFINED — `undefined` means "this film has no such measure".
function analyse(d) {
  const layers = d.layers || [];
  // flatten nested children so the mechanical motion tells see every layer, not just the top level.
  const allLayers = (() => { const out = []; const rec = (ls) => { for (const l of ls || []) if (l && typeof l === 'object') { out.push(l); if (l.children) rec(l.children); } }; rec(layers); return out; })();
  const duration = d.duration || 0;
  const metrics = {};
  const findings = [];
  const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
  const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });

  // resolve the brand's motion personality from its theme (string name → themes/<name>.json, or inline).
  let motion = {};
  try { motion = typeof d.theme === 'string' ? (JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', d.theme + '.json'), 'utf8')).motion || {}) : (d.theme?.motion || {}); } catch {}
  const settle = motion.settle ?? 0.5, bounce = motion.bounce ?? 0;
  const personality = (bounce > 0.1 || settle < 0.4) ? 'punchy' : (settle >= 0.55 && bounce < 0.05) ? 'calm' : 'neutral';

  // seam = the ONE earned two-scene blend, reserved for the payoff (TRANSITIONS.md: sparse accents).
  // It matches the personality: punchy throws (whipPan, snappy), calm dollies (cinematicZoom, smooth).
  const FAMILY = {
    punchy: { cuts: ['punch', 'whip', 'zoom', 'slide'], stings: ['flash', 'streak'], seam: 'whipPan', seamTiming: 'snappy' },
    calm: { cuts: ['fade', 'blur', 'riseBlur', 'wipe'], stings: ['dissolve', 'ink', 'bokeh'], seam: 'cinematicZoom', seamTiming: 'smooth' },
    neutral: { cuts: ['fade', 'slide', 'wipe', 'blur'], stings: ['dissolve', 'flash'], seam: 'crossWarp', seamTiming: 'smooth' },
  }[personality];

  // Reference profiles (docs/CRAFT/SELECTION.md Part 2): a named target picks the whole look at once.
  // A scene opts in with a top-level "profile":"apple". `bounceOk` and the banned lists are the
  // contradiction rules — a bounce preset on `apple` is wrong by rule, not by taste.
  const profile = PROFILES[d.profile] || null;
  if (profile) { FAMILY.cuts = profile.cuts.length ? profile.cuts : FAMILY.cuts; FAMILY.stings = profile.stings; }

  // Contradiction check: a choice that fights the named profile is flagged with the rule that caught it.
  const contradictions = [];
  if (profile) {
    const bounceUsed = layers.some((l) => ['bounce', 'elastic'].includes(l.preset));
    if (bounceUsed && profile.bounceOk === false) contradictions.push(`bounce/elastic preset on "${d.profile}" — cheap on a serious brand (SELECTION §contradictions)`);
    for (const l of layers) {
      if (l.cut && profile.banCuts.includes(l.cut)) contradictions.push(`cut "${l.cut}" on "${d.profile}" — announces an edit this profile hides`);
      // …and the ENTRANCE, which banCuts could never reach: `pop` is an anim and `bounce` is a preset, so
      // both sat in a cut list being compared against cut styles and never matched anything.
      for (const k of ['anim', 'preset']) {
        if (l[k] && (profile.banMotion || []).includes(l[k])) contradictions.push(`${k} "${l[k]}" on "${d.profile}" — this profile's entrances do not overshoot`);
      }
    }
    for (const c of d.cuts || []) {
      if (profile.banCuts.includes(c.style)) contradictions.push(`cut "${c.style}" @${c.t}s on "${d.profile}" — wrong for this profile's restraint`);
    }
    const families = new Set((d.cuts || []).map((c) => c.style));
    if (families.size > 2) contradictions.push(`${families.size} cut families in one film (${[...families].join(', ')}) — one film, one family`);
  }

  // beats = clusters of layer start-times (a >1.4s gap starts a new beat), same as critique.
  const s0 = (l) => l.start ?? 0;
  const starts = [...new Set(layers.filter((l) => l.track !== 0).map(s0))].sort((a, b) => a - b);
  const beats = [];
  for (const t of starts) { const last = beats[beats.length - 1]; if (!last || t - last > 1.4) beats.push(t); }

  // ---- DIRECTION AUDIT (the pre-render gate) ------------------------------------------------------
  // Source-decidable checks for the direction failure-modes in docs/CRAFT/TASTE-RULES.md. Severity:
  // FAIL = wrong by rule (blocks, exit 1); WARN = judgment (informs).
  // Effect budget flexes with purpose (TASTE-RULES), so busyness is WARN, not a fixed hard count.

  // one cut family per film. Group the cut vocabulary by edit-grammar meaning (SELECTION §1).
  const CUT_FAMILY = {
    soft: ['none', 'fade', 'blur', 'riseBlur', 'softwipe', 'softiris'],       // dissolves — hide the seam
    motion: ['whip', 'skewWhip', 'punch', 'zoom', 'slide', 'squeeze', 'drop', 'rise', 'jitter'], // directional pushes
    shape: ['wipe', 'iris', 'clock', 'blinds', 'barn', 'letterbox'],          // matte reveals — notice the cut
    spatial: ['cube', 'flip', 'spin', 'roll', 'collapse'],                    // 3D dimensional turns
  };
  const familyOf = (style) => Object.keys(CUT_FAMILY).find((f) => CUT_FAMILY[f].includes(style)) || 'other';
  const cutStyles = [...(d.cuts || []).map((c) => c.style), ...layers.map((l) => l.cut)].filter((s) => s && s !== 'none');
  const usedFamilies = [...new Set(cutStyles.map(familyOf))];
  if (cutStyles.length) metrics['cut-families'] = usedFamilies.length;
  if (usedFamilies.length >= 3) fail('cut-families', `${usedFamilies.length} cut families (${usedFamilies.join(', ')}) — one film, one family (TASTE-RULES: restraint)`);
  else if (usedFamilies.length === 2) warn('cut-families', `2 cut families (${usedFamilies.join(', ')}) — prefer one; the director rotates WITHIN a family`);

  // effect soup: heavy effects are a composite look (layer.filter), an ambient shader, a 3D toy, or a
  // sting. Effects are seasoning (2-3 earned moments), not a per-beat texture.
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
  if (beats.length) metrics['effect-soup'] = effectBeats / beats.length;
  if (beats.length >= 3 && effectBeats / beats.length > 0.6)
    warn('effect-soup', `an effect on ${effectBeats}/${beats.length} beats — most beats should be clean type; effects are 2-3 earned moments (TASTE-RULES: effect soup)`);
  else if (distinctEffects.size > Math.max(4, Math.ceil(beats.length / 2)))
    warn('effect-soup', `${distinctEffects.size} distinct effects across ${beats.length} beats — a new look every beat is a demo reel, not a film`);

  // continuity: a shared element that travels (a motion track, or a layer spanning a beat boundary).
  const spansABeat = (l) => { const a = l.start ?? 0, b = a + (l.dur ?? l.enterDur ?? 0); return beats.some((t) => t > a + 0.05 && t < b - 0.05); };
  const travelers = layers.filter((l) => l.track !== 0 && (Array.isArray(l.motion) && l.motion.length > 1 || spansABeat(l)));
  // sceneUnits carries continuity BY CONSTRUCTION: every boundary moves the whole outgoing beat out and the
  // incoming beat in as units, so the scene itself travels across each cut (the strongest continuity there is).
  if (beats.length >= 4) metrics.continuity = travelers.length;
  if (beats.length >= 4 && travelers.length === 0 && d.sceneUnits !== true)
    warn('continuity', `no element travels across a cut (no motion track, nothing spans a beat) — reads as a slideshow (TASTE-RULES: continuity). Or set "sceneUnits":true so each beat slides in/out as one unit.`);

  // beats too short to read. Only real cut times give a true beat-hold duration (start-clusters are
  // ≥1.4s apart by construction, so they can't measure this). WARN, since a fast montage is legitimate.
  const cutTimes = [...new Set((d.cuts || []).map((c) => c.t).filter((t) => typeof t === 'number'))].sort((a, b) => a - b);
  if (cutTimes.length >= 2) {
    const holds = cutTimes.map((t, i) => (cutTimes[i + 1] ?? (duration || t + 3)) - t);
    const tiny = holds.filter((h) => h > 0 && h < 0.9).length;
    const unreadable = holds.filter((h) => h > 0 && h < 0.5).length;
    if (unreadable >= 2) warn('pacing', `${unreadable} cuts less than 0.5s apart — too fast to read unless a deliberate montage`);
    else if (tiny / cutTimes.length > 0.5) warn('pacing', `${tiny}/${cutTimes.length} cut-to-cut holds under 0.9s — chaotic pacing unless intentional`);
  }

  // dead final frame: the payoff should hold to the end, never fade out (TASTE-RULES).
  if (duration > 0 && layers.length) {
    const holdsEnd = layers.some((l) => l.track !== 0 && (l.exitDur === 0 || (l.start ?? 0) + (l.dur ?? 1e9) >= duration - 0.15));
    if (!holdsEnd) warn('dead-final-frame', `nothing is held to the final frame (every layer exits before ${duration.toFixed(1)}s) — end on a held frame, exitDur:0, never fade the payoff`);
  }

  // ---- MOTION MECHANICS: the book-grounded amateur tells (docs/CRAFT/DIRECTION.md) ----------------
  // linear-motion: a visible move on a linear/none curve. Real motion accelerates in and decelerates
  // out (Disney slow-in/slow-out; Material asymmetric easing). Author-set ease:"linear" anywhere — on a
  // layer, a motion track keyframe, or an animated value — is the tell. We walk the whole layer tree.
  const linearHits = [];
  const LINEAR = (e) => typeof e === 'string' && /^(linear|none)$/i.test(e.trim());
  // A HOLD IS NOT A MOVE. The rule is about a visible move running flat, and a motion track states
  // stillness the same way it states travel: two keys carrying identical values, with `linear` between
  // them precisely so nothing drifts across the pause. Reading those as 27 flat moves is the gate being
  // confidently wrong about the one film in the library that holds deliberately, and telling an author
  // to ease a hold would put a drift into a frame that is supposed to be locked.
  const KEYED = ['x', 'y', 'scale', 'rot', 'opacity', 'blur', 'w', 'h'];
  const scanTrack = (kfs, where) => {
    for (let i = 0; i < kfs.length; i++) {
      const k = kfs[i]; if (!k || typeof k !== 'object' || !LINEAR(k.ease)) continue;
      const prev = kfs[i - 1];
      // The first key defines the opening pose and eases nothing, so it can never be a flat move.
      if (!prev) continue;
      if (KEYED.some((p) => (k[p] ?? null) !== (prev[p] ?? null))) linearHits.push(`${where}[${i}]`);
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
  metrics['linear-motion'] = linearHits.length;
  if (linearHits.length) warn('linear-motion', `${linearHits.length} move(s) use ease "linear"/"none" — a visible move must decelerate in / accelerate out, never run flat (DIRECTION.md: slow-in/slow-out). At: ${linearHits.slice(0, 4).join(', ')}${linearHits.length > 4 ? ', …' : ''}`);

  // ---- DURATION AGAINST DISTANCE (measured, never a finding — see the header) ---------------------
  // Nothing else here relates a move's LENGTH to its TIME, so a 40px nudge and a 900px sweep both take
  // whatever the author typed. This measures every keyed move so the report can place the fastest one.
  //
  // Only sparse segments count. The engine itself draws the line: below DENSE_KEY_SEC a segment "is not
  // a span with a shape, it is one step of a traced path" (core/sequence.js), and it interpolates those
  // linearly for that reason. A hand-keyed cursor lands keys every two or three frames, and reading each
  // hop as a move would report a click as a 2500 px/s whip. Borrowing the engine's own constant keeps
  // one owner for that judgement instead of a second number here that could drift from it.
  const moves = [];
  let fastest = null;
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
  if (moves.length) {
    // Ties are real here: five identical layers carry the same track. Sort on the layer index too, so
    // the fastest move names the same one on every run.
    moves.sort((a, b) => b.v - a.v || allLayers.indexOf(a.l) - allLayers.indexOf(b.l) || a.i - b.i);
    metrics['keyed-speed'] = moves[0].v;
    fastest = { ...moves[0], over: moves.filter((m) => m.v > VMAX).length };
  }

  // monotone-timing: fires ONLY when the author took manual control of tempo and made it uniform.
  // A default-timed scene is fine (the engine default IS one deliberate snap band); this needs ≥6 layers
  // EXPLICITLY setting enterDur to one identical value — hand-set monotony (Murch: rhythm variety).
  const explicitDurs = allLayers.map((l) => l.enterDur).filter((v) => typeof v === 'number');
  if (explicitDurs.length >= 6 && new Set(explicitDurs).size === 1)
    warn('monotone-timing', `${explicitDurs.length} entrances all set enterDur:${explicitDurs[0]} — uniform tempo reads as monotone. Timing is a voice: ambient drifts slow (0.6-1s), payoffs snap (0.25-0.35s), thesis lines luxurious (DIRECTION.md: timing)`);

  // ---- ARRIVAL RHYTHM: four measures nothing else here can see (docs/MOTION-CRAFT.md rules 1, 3, 4) --
  // All four are WARN. They grade rhythm, which is an argument; and the library trips the first one on
  // roughly a third of its scenes, so blocking would teach the reflex waive that repeals a rule silently.

  // (1) shared-start: three or more layers that begin on the SAME frame arrive as one block, so the beat
  // states no reading order. Two together is a pair (a card and the label sitting on it); three is a row.
  // `monotone-timing` above measures identical DURATIONS and is blind to this — those layers may each run
  // a different length and still all leave the gate together.
  const startClumps = new Map();
  for (const l of layers) {
    if (l.track === 0) continue;
    const s = r2(l.start ?? 0);
    if (!startClumps.has(s)) startClumps.set(s, []);
    startClumps.get(s).push(l);
  }
  if (startClumps.size) metrics['shared-start'] = Math.max(...[...startClumps.values()].map((ls) => ls.length));
  const blocked = [...startClumps.entries()].filter(([, ls]) => ls.length >= 3).sort((a, b) => b[1].length - a[1].length);
  if (blocked.length) {
    const [t0, ls0] = blocked[0];
    const rest = blocked.length > 1 ? ` (and ${blocked.length - 1} more start${blocked.length > 2 ? 's' : ''} carrying 3+)` : '';
    warn('shared-start', `${ls0.length} layers all start at ${t0}s${rest}. They arrive as one block, so nothing tells the eye what to read first. Stagger entrances at irregular offsets; begin the next while the last is still settling (MOTION-CRAFT rule 3). At ${t0}s: ${[...new Set(ls0.map(label))].slice(0, 4).join(' · ')}`);
  }

  // (2) stagger-total: a per-unit step inside the 0.04-0.12s band still overruns when the unit count is
  // high — 8 items at 0.10s take 0.8s to leave the gate and stop reading as ONE arrival. The dial table in
  // MOTION-CRAFT gives the per-item band and no total, which is exactly the hole this closes. The measure
  // is the STAGGER SEQUENCE, first unit start to last unit start: (n-1) x stagger.
  // A RATE is not a stagger. `type` is a typewriter and `wave` is a looping phase (core/type.js), so for
  // both the step IS the effect's speed and its total is the shot length by design.
  const RATE_PRESET = new Set(['type', 'wave']);
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
  if (staggerTotals.length) metrics['stagger-total'] = Math.max(...staggerTotals);
  if (longStaggers.length) {
    longStaggers.sort((a, b) => b.total - a.total);
    const w = longStaggers[0];
    warn('stagger-total', `${longStaggers.length} staggered arrival(s) run past ${STAGGER_CAP}s end to end. Worst, ${label(w.l)}: ${w.n} units x ${w.step}s = ${w.total.toFixed(2)}s. Past about half a second the last unit lands in a different beat from the first. Cut the step, or split the group.`);
  }

  // (3) uneven-cascade: WITHIN one cascade the interval must be even. A cascade is a run of sibling layers
  // of the same kind, entering the same way, close together — one list arriving, hand-keyed instead of
  // authored with `stagger`. Reference test: consistent = maxDrift < avgInterval * 0.3.
  // This does NOT contradict (1). Different scopes: (1) wants DIFFERENT elements to arrive at irregular
  // offsets across a beat; (3) wants ONE cascade of like elements to keep its own metre. Both stated in
  // docs/MOTION-CRAFT.md. The two can never fire on the same run — an exact clump has a zero interval.
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
  if (cascadeRatios.length) metrics['uneven-cascade'] = Math.max(...cascadeRatios);
  if (uneven.length) {
    uneven.sort((a, b) => b.drift - a.drift);
    const u = uneven[0];
    const ms = (v) => `${Math.round(v * 1000)}ms`;
    warn('uneven-cascade', `${uneven.length} cascade(s) of like layers keep an uneven beat. Worst, ${u.run.length} x ${label(u.layer)} from ${r2(u.run[0])}s at ${u.iv.map(ms).join(' / ')} (average ${ms(u.avg)}, drift ${ms(u.drift)}). One cascade holds ONE interval; vary the offset BETWEEN beats, not inside a single sweep (MOTION-CRAFT rule 3).`);
  }

  // (4) tempo-flat: `monotone-timing` fires only on a dead heat (every enterDur identical) and names no
  // target. This measures the SPREAD. The speed-dial table already gives the band a directed film speaks
  // in — payoffs 0.25-0.35s, ambient 0.75-1.2s — which is about 3x end to end.
  const TEMPO_TARGET = 3, TEMPO_FLOOR = 1.5;
  const durs = allLayers.map((l) => l.enterDur).filter((v) => typeof v === 'number' && v > 0);
  if (durs.length >= 4) metrics['tempo-flat'] = Math.max(...durs) / Math.min(...durs);
  if (durs.length >= 4 && new Set(durs).size > 1) {   // a dead heat is monotone-timing's finding, not this one
    const lo = Math.min(...durs), hi = Math.max(...durs), ratio = hi / lo;
    if (ratio < TEMPO_FLOOR)
      warn('tempo-flat', `${durs.length} entrances span only ${lo}s to ${hi}s (${ratio.toFixed(2)}x). One speed for the whole film reads as narration. Aim for about ${TEMPO_TARGET}x between the slowest and the fastest: payoffs snap 0.25-0.35s, ambient drifts 0.75-1.2s (MOTION-CRAFT rule 1 + the speed dials).`);
  }

  // enter-and-retreat: a layer that enters from a side and leaves back the SAME side. Pro motion travels
  // one continuous direction (enter right → exit left) — the launch rule + staging continuity.
  const DIR = /^slide-(left|right|up|down)$/;
  const retreats = allLayers.filter((l) => DIR.test(l.anim || '') && DIR.test(l.out || '') && l.anim.split('-')[1] === l.out.split('-')[1]);
  metrics['enter-and-retreat'] = retreats.length;
  if (retreats.length) warn('enter-and-retreat', `${retreats.length} layer(s) enter and exit on the same side (e.g. anim:"${retreats[0].anim}" + out:"${retreats[0].out}") — travel ONE continuous direction: enter a side, exit the opposite (DIRECTION.md: paired directional exits)`);

  // profile contradictions are wrong-by-rule → FAIL tier.
  for (const c of contradictions) fail('profile', c);

  return { layers, allLayers, beats, duration, findings, metrics, fastest, personality, settle, bounce, FAMILY, profile };
}

const label = (l) => `${l.type || 'text'}${l.text ? ` "${snippet(String(l.text))}"` : ''}`;

// ---- THE CENSUS ------------------------------------------------------------------------------------
// What each scalar means and which end of it is the bad end. `worse: 'high'` reads "a bigger number is
// further from the rule". Only a code listed here can print a position; the rest print a share.
const SCALE = {
  'shared-start':      { worse: 'high', unit: (v) => `${v} layers on one frame` },
  'tempo-flat':        { worse: 'low',  unit: (v) => `${v.toFixed(2)}x spread` },
  'linear-motion':     { worse: 'high', unit: (v) => `${v} flat move(s)` },
  'cut-families':      { worse: 'high', unit: (v) => `${v} famil${v === 1 ? 'y' : 'ies'}` },
  'uneven-cascade':    { worse: 'high', unit: (v) => `drift ${(v * 100).toFixed(0)}% of the interval` },
  'effect-soup':       { worse: 'high', unit: (v) => `an effect on ${(v * 100).toFixed(0)}% of beats` },
  'stagger-total':     { worse: 'high', unit: (v) => `${v.toFixed(2)}s end to end` },
  'continuity':        { worse: 'low',  unit: (v) => `${v} traveller(s)` },
  'enter-and-retreat': { worse: 'high', unit: (v) => `${v} retreat(s)` },
  'keyed-speed':       { worse: 'high', unit: (v) => `${Math.round(v)} px/s at its fastest` },
};

const sceneFiles = () => population('direction census', {
  filter: (f) => f !== 'schema.json' && !/\.(animatic|intent|expanded|beatsync|captioned|directed)\./.test(f) && !isTemplate(f),
  quiet: true, soft: true,
});

// Walk the library once and collect, per code, the set of films that trip it and every value of its
// scalar. Reads JSON only — no browser, no render — so it costs a fraction of a second.
function library() {
  const pop = sceneFiles();
  if (pop.blind) return { blind: pop.blind };
  const trips = new Map(), values = new Map();
  let films = 0;
  for (const f of pop.names) {
    let d; try { d = lowerScene(JSON.parse(fs.readFileSync(path.join(ROOT, SCENE_DIR, f), 'utf8'))); } catch { continue; }
    if (d.module !== 'scene') continue;
    films++;
    let a; try { a = analyse(d); } catch { continue; }
    for (const c of new Set(a.findings.map((x) => x.code))) trips.set(c, (trips.get(c) || 0) + 1);
    for (const [c, v] of Object.entries(a.metrics)) { if (!values.has(c)) values.set(c, []); values.get(c).push(v); }
  }
  for (const arr of values.values()) arr.sort((a, b) => a - b);
  return { films, trips, values, blind: null };
}

// One line of context for one finding. Two facts, both positions and neither a target: how much of the
// library trips the same code, and how many films sit further out than this one on that rule's measure.
function census(code, mine, lib) {
  const tripped = lib.trips.get(code) || 0;
  const share = `${tripped} of ${lib.films} films trip this`;
  const sc = SCALE[code], all = lib.values.get(code);
  if (!sc || mine == null || !all || all.length < 8) return { line: share, rank: 1 - tripped / lib.films };
  const mid = all[Math.floor(all.length / 2)];
  const worse = sc.worse === 'high' ? all.filter((v) => v > mine).length : all.filter((v) => v < mine).length;
  // rank = the share of the library this film is further out than. It orders the report and nothing else.
  const rank = 1 - worse / all.length;
  return {
    line: `${share}. On its measure: yours ${sc.unit(mine)}, the median of ${all.length} films ${sc.unit(mid)}, `
      + `and ${worse} film${worse === 1 ? '' : 's'} sit${worse === 1 ? 's' : ''} further out than yours.`,
    rank,
  };
}

// ---- census mode: no file, no verdict --------------------------------------------------------------
if (!file) {
  const lib = library();
  if (lib.blind) { console.error(`\n  ✗ direction census: BLIND SWEEP — ${lib.blind}\n`); process.exit(3); }
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
  // Measured and never judged. `keyed-speed` is here because the rule it was going to become does not
  // survive contact with the frames (see the header), and the spread is still the honest answer to
  // "how fast does this library move things".
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

// ---- one film --------------------------------------------------------------------------------------
// `transitions` is the documented unified surface and lowers to cuts/seams/stings before the engine
// renders (core/transitions-lower.js). Without this, a film that declares its boundaries the
// documented way was read as a film with NO boundaries. Idempotent; a no-op for raw `cuts`. #380.
const d = lowerScene(JSON.parse(fs.readFileSync(file, 'utf8')));
const { layers, beats, duration, findings, metrics, fastest, personality, settle, bounce, FAMILY, profile } = analyse(d);

const picks = [];
// bg window active at time t (preset+value); a change across a transition = a hard cut → sting.
const bgAt = (t) => { let w = null; for (const b of d.bg || []) if (t >= (b.from ?? 0) && t < (b.to ?? 1e9)) w = b; return w ? `${w.preset || 'plain'}:${w.value || ''}` : null; };
beats.forEach((t, i) => {
  if (i === 0) return; // the first beat opens; nothing to transition FROM
  const bgChanged = bgAt(t - 0.05) !== bgAt(t + 0.05);
  const cut = FAMILY.cuts[(i - 1) % FAMILY.cuts.length];
  const sting = bgChanged ? FAMILY.stings[(i - 1) % FAMILY.stings.length] : null;
  const reason = bgChanged ? 'background jumps → cover the cut with a sting' : 'same background → a clean cut reads';
  picks.push({ t, cut, sting, reason });
});

// ---- THE ONE EARNED SEAM (the decision procedure, applied) ----------------------------------------
// TRANSITIONS.md: straight cuts are the meat; a seam is seasoning reserved for the hero/payoff. So the
// director suggests exactly ONE two-scene seam, at the payoff boundary — the transition INTO the
// longest-held beat, the climax the film builds to. Everything else stays an invisible cut. A seam is a
// real scene-to-scene blend; it needs a boundary where a beat lands and breathes, which the longest
// hold identifies structurally (the script can't read emotion, but it can find where the film pauses).
if (picks.length && !profile) {
  const holdOf = (t) => { const i = beats.indexOf(t); return (beats[i + 1] ?? (duration || t + 3)) - t; };
  let payoff = null, best = -1;
  for (const p of picks) { const h = holdOf(p.t); if (h > best) { best = h; payoff = p; } }
  if (payoff && best >= 1.2) { // a real hold, not a fast montage beat
    payoff.seam = FAMILY.seam; payoff.seamTiming = FAMILY.seamTiming;
    payoff.seamReason = `held ${best.toFixed(1)}s → the payoff. Earn ONE expressive seam here: ${FAMILY.seam} (${FAMILY.seamTiming}) blends BOTH beats so the reveal lands as a move, not a slideshow`;
  }
}

// ---- report ----
console.log(`\n  motion director · ${file}`);
console.log(`  brand personality: ${personality}  (settle ${settle}, bounce ${bounce}) → cut family [${FAMILY.cuts.join(', ')}]${profile ? '' : ` · payoff seam ${FAMILY.seam}`}`);
if (profile) console.log(`  profile: ${d.profile}  (restraint ${profile.restraint}, face ${profile.face}, bounce ${profile.bounceOk})`);
console.log(`  transitions: one invisible cut family carries ~all seams; the accents are stings on background jumps + ONE seam at the payoff. Theory: docs/CRAFT/TRANSITIONS.md`);

// Place every finding in the library before printing it, then print the most unusual first. Order used
// to be the order the checks happen to run in, which put a code half the library trips above the one
// finding worth acting on. Ties break on the code name so two runs print identically.
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
if (findings.length && lib.blind && lib.blind !== 'no findings') console.log(`  census BLIND (${lib.blind}) — findings print without their library context.`);
for (const f of findings) {
  console.log(`    ${f.sev === 'FAIL' ? '✗' : '~'} [${f.code}] ${f.msg}`);
  if (f.census) console.log(`        library: ${f.census}`);
}
if (!findings.length) console.log('    ✓ direction reads clean');

// The speed note. Not a finding and never counted as one: see the header for the three films that were
// rendered and read, all of which the arithmetic called wrong. It is printed only when this film sits
// past the library's 95th percentile, so the author is told where to LOOK and nothing more.
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
if (!picks.length) console.log('  only one beat — no transitions to direct.\n');
for (const p of picks) {
  console.log(`  @${p.t.toFixed(1)}s  cut: ${p.cut.padEnd(9)}${p.sting ? `sting: ${p.sting.padEnd(9)}` : ''.padEnd(16)}${p.reason}`);
  if (p.seam) console.log(`           ★ seam: ${p.seam} (${p.seamTiming}) — ${p.seamReason}`);
}

if (WRITE) {
  const stings = [...(d.stings || [])];
  for (const p of picks) {
    // apply the cut to the beat's top-level content layers that don't already declare one.
    for (const L of layers) if (Math.abs((L.start ?? 0) - p.t) < 0.01 && L.track !== 0 && !L.cut && (L.type === undefined || L.type !== 'rect')) L.cut = p.cut;
    if (p.sting && !stings.some((s) => Math.abs((s.t ?? 0) - p.t) < 0.2)) stings.push({ t: r2(p.t), fx: p.sting, dur: 0.6 });
  }
  if (stings.length) d.stings = stings.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  // the one earned seam at the payoff (skip if the author already placed a seam near that boundary)
  const seamsOut = [...(d.seams || [])];
  for (const p of picks) if (p.seam && !seamsOut.some((s) => Math.abs((s.t ?? 0) - p.t) < 0.2)) seamsOut.push({ t: r2(p.t), fx: p.seam, dur: 0.6, timing: p.seamTiming });
  if (seamsOut.length) d.seams = seamsOut.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const out = file.replace(/\.json$/, '.directed.json');
  fs.writeFileSync(out, JSON.stringify(d, null, 2));
  console.log(`\n  ✓ applied → ${out}  (${picks.length} cuts, ${picks.filter((p) => p.sting).length} stings, ${picks.filter((p) => p.seam).length} seam)\n`);
} else {
  console.log(`\n  suggest-only. Re-run with WRITE=1 (or --write) to apply → <file>.directed.json`);
  // pre-render gate: a rule violation blocks the render. WARN-tier informs but does not block.
  if (fails.length) {
    console.log(`\n  ✗ direction gate: ${fails.length} rule violation(s) — fix before rendering.\n`);
    process.exit(1);
  }
  console.log(warns.length ? `\n  gate passed with ${warns.length} warning(s) to review.\n` : `\n  ✓ direction gate clean.\n`);
}
