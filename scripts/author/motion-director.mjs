// scripts/motion-director.mjs — the MOTION DIRECTOR. Picks the right cut/sting per beat-transition from
// the brand's motion personality (theme.motion) + the MOTION-CRAFT ruleset, so effects are chosen with
// restraint instead of the author over-reaching. Suggest-first: prints a director's report; WRITE=1 (or
// --write) applies the picks into <file>.directed.json. Deterministic (pure mapping, no Date/random).
//
// Rules encoded (docs/MOTION-CRAFT.md): cover a hard background jump with a sting · whip/punch only when
// the background DOESN'T change · one cut family per film, rotated so no archetype repeats · match the
// brand: punchy → snap cuts, calm → dissolves.
//
// Usage: node scripts/motion-director.mjs <scene.json> [--write]   ·   make direct D=<file> [WRITE=1]
import fs from 'node:fs';
import path from 'node:path';
import { LOOK_NAMES } from '../../core/looks.js';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/motion-director.mjs <scene.json> [--write]'); process.exit(2); }
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const layers = d.layers || [];

// resolve the brand's motion personality from its theme (string name → themes/<name>.json, or inline).
let motion = {};
try { motion = typeof d.theme === 'string' ? (JSON.parse(fs.readFileSync(path.join('themes', d.theme + '.json'), 'utf8')).motion || {}) : (d.theme?.motion || {}); } catch {}
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
const PROFILES = {
  linear:   { cuts: ['none', 'blur'], stings: [], bounceOk: false, restraint: 'high', banCuts: ['whip', 'wipe', 'spin', 'cube', 'roll'], face: 'mono' },
  apple:    { cuts: ['fade', 'riseBlur'], stings: ['lens'], bounceOk: false, restraint: 'high', banCuts: ['whip', 'wipe', 'punch', 'jitter'], face: 'sans' },
  stripe:   { cuts: ['blur', 'fade'], stings: ['dissolve'], bounceOk: false, restraint: 'med', banCuts: ['whip', 'jitter'], face: 'sans' },
  nike:     { cuts: ['whip', 'punch'], stings: ['flash', 'streak'], bounceOk: 'accent', restraint: 'low', banCuts: [], face: 'sans' },
  a24:      { cuts: ['fade', 'letterbox'], stings: ['ink', 'leak'], bounceOk: false, restraint: 'high', banCuts: ['whip', 'wipe', 'spin', 'pop'], face: 'serif' },
  bloomberg:{ cuts: ['collapse', 'punch'], stings: ['scan'], bounceOk: false, restraint: 'med', banCuts: ['whip', 'wipe', 'spin'], face: 'mono' },
  duolingo: { cuts: ['wipe', 'iris'], stings: ['confetti', 'sdfIris'], bounceOk: true, restraint: 'low', banCuts: [], face: 'sans' },
  vercel:   { cuts: ['none'], stings: ['glitch', 'chromaticSplit'], bounceOk: false, restraint: 'high', banCuts: ['whip', 'wipe', 'spin', 'cube', 'roll', 'bounce'], face: 'sans' },
};
const profile = PROFILES[d.profile] || null;
if (profile) { FAMILY.cuts = profile.cuts.length ? profile.cuts : FAMILY.cuts; FAMILY.stings = profile.stings; }

// Contradiction check: a choice that fights the named profile is flagged with the rule that caught it.
const contradictions = [];
if (profile) {
  const bounceUsed = layers.some((l) => ['bounce', 'elastic'].includes(l.preset));
  if (bounceUsed && profile.bounceOk === false) contradictions.push(`bounce/elastic preset on "${d.profile}" — cheap on a serious brand (SELECTION §contradictions)`);
  for (const l of layers) {
    if (l.cut && profile.banCuts.includes(l.cut)) contradictions.push(`cut "${l.cut}" on "${d.profile}" — announces an edit this profile hides`);
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

// bg window active at time t (preset+value); a change across a transition = a hard cut → sting.
const bgAt = (t) => { let w = null; for (const b of d.bg || []) if (t >= (b.from ?? 0) && t < (b.to ?? 1e9)) w = b; return w ? `${w.preset || 'plain'}:${w.value || ''}` : null; };

const picks = [];
beats.forEach((t, i) => {
  if (i === 0) return; // the first beat opens; nothing to transition FROM
  const bgChanged = bgAt(t - 0.05) !== bgAt(t + 0.05);
  const cut = FAMILY.cuts[(i - 1) % FAMILY.cuts.length];
  const sting = bgChanged ? FAMILY.stings[(i - 1) % FAMILY.stings.length] : null;
  const reason = bgChanged ? 'background jumps → cover the cut with a sting' : 'same background → a clean cut reads';
  picks.push({ t, cut, sting, reason });
});

// ---- DIRECTION AUDIT (the pre-render gate) --------------------------------------------------------
// Source-decidable checks for the direction failure-modes in docs/CRAFT/TASTE-RULES.md. Like `make
// slop` but for direction. Severity: FAIL = wrong by rule (blocks, exit 1); WARN = judgment (informs).
// Effect budget flexes with purpose (TASTE-RULES), so busyness is WARN, not a fixed hard count.
const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });

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
if (beats.length >= 3 && effectBeats / beats.length > 0.6)
  warn('effect-soup', `an effect on ${effectBeats}/${beats.length} beats — most beats should be clean type; effects are 2-3 earned moments (TASTE-RULES: effect soup)`);
else if (distinctEffects.size > Math.max(4, Math.ceil(beats.length / 2)))
  warn('effect-soup', `${distinctEffects.size} distinct effects across ${beats.length} beats — a new look every beat is a demo reel, not a film`);

// continuity: a shared element that travels (a motion track, or a layer spanning a beat boundary).
const spansABeat = (l) => { const a = l.start ?? 0, b = a + (l.dur ?? l.enterDur ?? 0); return beats.some((t) => t > a + 0.05 && t < b - 0.05); };
const travelers = layers.filter((l) => l.track !== 0 && (Array.isArray(l.motion) && l.motion.length > 1 || spansABeat(l)));
if (beats.length >= 4 && travelers.length === 0)
  warn('continuity', `no element travels across a cut (no motion track, nothing spans a beat) — reads as a slideshow (TASTE-RULES: continuity)`);

// beats too short to read. Only real cut times give a true beat-hold duration (start-clusters are
// ≥1.4s apart by construction, so they can't measure this). WARN, since a fast montage is legitimate.
const duration = d.duration || 0;
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

// profile contradictions are wrong-by-rule → FAIL tier.
for (const c of contradictions) fail('profile', c);

// ---- report ----
console.log(`\n  motion director · ${file}`);
console.log(`  brand personality: ${personality}  (settle ${settle}, bounce ${bounce}) → cut family [${FAMILY.cuts.join(', ')}]${profile ? '' : ` · payoff seam ${FAMILY.seam}`}`);
if (profile) console.log(`  profile: ${d.profile}  (restraint ${profile.restraint}, face ${profile.face}, bounce ${profile.bounceOk})`);
console.log(`  transitions: one invisible cut family carries ~all seams; the accents are stings on background jumps + ONE seam at the payoff. Theory: docs/CRAFT/TRANSITIONS.md`);

const fails = findings.filter((f) => f.sev === 'FAIL');
const warns = findings.filter((f) => f.sev === 'WARN');
console.log(`\n  direction audit: ${fails.length} fail · ${warns.length} warn`);
for (const f of fails) console.log(`    ✗ [${f.code}] ${f.msg}`);
for (const w of warns) console.log(`    ~ [${w.code}] ${w.msg}`);
if (!findings.length) console.log('    ✓ direction reads clean');
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

function r2(n) { return Math.round(n * 100) / 100; }
