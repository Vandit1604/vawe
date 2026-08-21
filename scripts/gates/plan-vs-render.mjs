// scripts/gates/plan-vs-render.mjs — DOES THE FILM DO WHAT THE PLAN SAID?
//
// storyboard-check reads the plan and grades it against ITSELF: are the beats timed, does each one name
// what it becomes, does the last one end on a change. Every one of those can pass on a plan for a film
// that was never built. inspect reads the scene, but only at one instant per beat, and only for copy and
// for "some layer here animates". Nothing compared the two documents. So a storyboard could promise a
// transformation at 5.8s, the JSON could put nothing at all there, and the whole ladder stayed green.
//
// That is not hypothetical. It is the result of the A/B test: the treatment film's storyboard named a
// change on every beat, correctly, and the render still sat perfectly still from 3.5s to 5.5s. The plan
// was right and the film was wrong and no gate said a word. This is the gate that says the word.
//
// WHAT IT CHECKS, and what it refuses to claim. It checks that SOMETHING HAPPENS WHERE THE PLAN SAYS
// SOMETHING HAPPENS. At a junction the plan marks with a `becomes:`, the render must put an event there:
// a content layer starting or ending, a declared cut/seam/sting, or a motion keyframe. Inside a beat the
// plan gave seconds to, the render must not hold perfectly still for most of them.
//
// It does NOT check that the change is the one named, and it must never be extended to pretend it does.
// "the semicolon string becomes a three-column row" is a claim about identity across two moments. A layer
// ending and another starting satisfies this gate and is also exactly what a slideshow looks like. The
// difference between a transformation and a cut between two unrelated shots is not in the JSON; it is in
// the pixels, and it belongs to `make judge` and to your eyes. A green run here means the film is not
// EMPTY where it promised to be full. It does not mean the promise was kept.
//
// THE PROSE FIELDS. The intent sidecar carries the beat spans and the `becomes:` lines and nothing else.
// Two frontmatter decisions never reach it, and both are decisions ABOUT the render: `spectacle:` names
// the film's one loud moment, and `pace:` budgets its seconds per idea. So this gate reads the storyboard
// itself as a second input, alongside the sidecar, and joins those two lines to the film. Without that
// they are fields an author fills and no code reads, which is worse than no field at all — the plan looks
// complete and the film is unchanged (docs/MISTAKES.md #213, #369, #373, #386).
//
//   node scripts/gates/plan-vs-render.mjs <scene.json> [--intent p] [--sb storyboard.md] [--strict]
//   make plan-check D=<file>
// FAIL: plan-overruns-render · junction-is-static.
// WARN: held-through-the-change · beat-holds-still · unplanned-junction · plan-has-no-spans ·
//       spectacle-not-built · spectacle-in-wrong-beat · spectacle-beat-unnamed · pace-not-kept ·
//       pace-not-chosen.
//       All block under --strict. `held-through-the-change` is the sharp one: it reads a hold the author
//       WROTE (two identical motion keys) rather than inferring one from an absence.
// ADVISORY, and never blocking, not even under --strict: no-spectacle-nominated. It is the one finding
//       here that needs NO plan, so it also runs on a film with no sidecar and no storyboard, which is
//       exactly the film most likely to have no peak. See "the peak, asked about even when there is no
//       plan" below for its trigger and the measured dose behind it.
// Waive a deliberate break with {"authoring":{"allow":["beat-holds-still", ...]}}.
import fs from 'node:fs';
import path from 'node:path';
import { sceneTiming, num } from './scene-timing.mjs';
import { parseStoryboard } from '../author/storyboard-parse.mjs';

const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
const intentPath = (() => { const i = process.argv.indexOf('--intent'); return i >= 0 ? process.argv[i + 1] : String(file || '').replace(/\.json$/, '.intent.json'); })();
if (!file) { console.error('usage: node scripts/gates/plan-vs-render.mjs <scene.json> [--intent p] [--strict]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (d.module !== 'scene') { console.log(`  plan vs render · ${file}: not a scene module, nothing to check.`); process.exit(0); }
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// ---------- the storyboard, for the fields the sidecar drops ----------
// An explicit `--sb` that does not exist is an error, never a silent skip: a flag the author typed and
// the gate ignored is the same defect the spectacle join exists to close.
const sbFlag = (() => { const i = process.argv.indexOf('--sb'); return i >= 0 ? process.argv[i + 1] : null; })();
if (sbFlag && !fs.existsSync(sbFlag)) { console.error(`✗ no such storyboard: ${sbFlag}`); process.exit(2); }
const sbPath = sbFlag || (() => {
  const dir = path.dirname(file), base = path.basename(file).replace(/\.json$/, '');
  return [path.join(dir, '_concepts', `${base}.storyboard.md`), path.join(dir, `${base}.storyboard.md`)]
    .find((p) => fs.existsSync(p)) || null;
})();
const sb = sbPath ? parseStoryboard(fs.readFileSync(sbPath, 'utf8')) : null;

const NEAR = 0.5;        // how far from a planned junction an event still counts as being AT it
const STILL = 2.5;       // a stretch inside one beat with no event that stops reading as a hold
const DRIFT = 0.6;       // how far a real cut may sit from any planned boundary before it is unplanned
const OVERRUN = 0.5;     // how far the plan's total may sit from the film's before the spans are fiction

// T.scene is this scene with the unified `transitions` surface already lowered to cuts/seams/stings, on
// a clone, so nothing below rewrites the object it is grading. Every boundary read in this file goes
// through it: reading raw `d.cuts` is how a film that declared four boundaries the documented way was
// graded as a film with none. docs/MISTAKES.md #380, #391.
const T = sceneTiming(d);
const BOUNDARY_KEYS = ['cuts', 'seams', 'stings'];
const s = (n) => `${(+n).toFixed(2)}s`;

// ---------- the peak, asked about even when there is no plan ----------
// THE GAP THIS CLOSES. Everything else in this file needs a sidecar, so the film most likely to have no
// peak — the one nobody storyboarded — was the one film never asked about it. Whether a scene NOMINATES
// its loud moment needs no plan at all: the `spectacle` block is either in the JSON or it is not.
//
// WHY THE QUESTION IS WORTH ASKING. `effect-soup` fails a film that shouts on every beat and
// `plain-slideshow` fails one that never shouts at all. Neither asks WHICH moment is the loudest, so a
// film can sit safely between the two bounds, pass both, and still be flat: evenly loud is not the same
// as shaped. Nominating a peak is also a promise the rest stays restrained, which is what core/spectacle.js
// enforces once the block exists.
//
// THE TRIGGER IS NARROW ON PURPOSE. Measured over the 110 scenes in formats/scene, EVERY one of them
// lacks a `spectacle` block, so warning on all of them would be a report about the library rather than a
// gate, and a finding on every file teaches the reader to skip the section. It fires only where the
// author has already declared structure the peak could sit in: at least 2 declared boundaries and at
// least 12s of runtime, which is 24 of the 110 (18 distinct films, the rest .expanded.json siblings).
// The two dials were chosen against that measurement: boundaries>=2 with no length floor is 31 scenes,
// and boundaries>=3 is 19. 24 is the point where the finding still reads as a finding.
// A one-shot 6s hook does not need a nominated peak; a 20s film across six cuts that never says which
// instant is the loudest is shapeless, and no other gate here will say so.
const SPECTACLE_MIN_BOUNDARIES = 2, SPECTACLE_MIN_DUR = 12;
function nominationNote() {
  if (d.spectacle != null) return null;                    // nominated; core/spectacle.js takes it from here
  if (sb && sb.spectacle) return null;                     // the storyboard names one, so `spectacle-not-built` owns this
  // COUNT `transitions` TOO. It is the documented unified surface and it lowers to cuts/seams/stings
  // before the engine renders, so a film that declares its boundaries the documented way has structure
  // even though `d.cuts` is empty. brew-launch-act1 is exactly that film: four boundaries, none of them
  // in `d.cuts`. This was the one reader here that already saw them; the rest of the gate now sees them
  // too, through `T.scene`.
  //
  // IT STAYS ON THE AUTHORED SURFACE, deliberately. `T.scene.cuts` would carry the lowered transitions,
  // and adding seams and stings to it would read as the same tidy-up — but it is not one. A raw `stings`
  // block has never counted as structure here, and folding those in re-tunes a trigger #389 measured on
  // purpose (24 of 110 scenes; the seams/stings set adds 16 more). That is a decision about how loud this
  // advisory should be, not about lowering, and it does not get made in passing.
  const boundaries = new Set([
    ...(Array.isArray(d.cuts) ? d.cuts : []).filter((c) => c && typeof c === 'object' && num(c.t, null) !== null).map((c) => num(c.t, 0)),
    ...(Array.isArray(d.transitions) ? d.transitions : []).filter((c) => c && typeof c === 'object' && num(c.at, null) !== null).map((c) => num(c.at, 0)),
  ]);
  const cuts = boundaries.size;
  if (cuts < SPECTACLE_MIN_BOUNDARIES || T.duration < SPECTACLE_MIN_DUR) return null;
  // The waiver is read AFTER the trigger, so a scene that waives a rule it never trips stays silent
  // rather than announcing a waiver nobody needed.
  if (allow.has('no-spectacle-nominated')) return { waived: true };
  return { msg: `this film runs ${s(T.duration)} across ${cuts} declared boundaries and names no peak: there is no \`spectacle\` block in ${path.basename(file)} `
    + `and no plan naming one. Nothing else in the ladder asks this. \`effect-soup\` fails a film that shouts on every beat and \`plain-slideshow\` fails one `
    + `that never shouts, so a film can sit between them, pass both, and still be evenly loud, which is not the same as shaped. `
    + `Name the one moment the film is allowed to shout, and buy it by quietening the rest: `
    + `\`"spectacle": { "at": <seconds>, "of": "<layer id>", "device": "<device>", "why": "<what the moment is for>" }\` (core/spectacle.js). `
    + `If this film is deliberately flat, say so: {"authoring":{"allow":["no-spectacle-nominated"],"_why":{"no-spectacle-nominated":"..."}}}.` };
}
// It PRINTS, and it never counts. This finding is advisory in both directions: it is a question about
// the author's intent, and a question that can block is a question people answer with a waiver.
function printNomination() {
  const n = nominationNote();
  if (!n) return;
  if (n.waived) { console.log(`  ○ [no-spectacle-nominated] waived via authoring.allow\n`); return; }
  console.log(`  ~ [no-spectacle-nominated] ${n.msg}\n`);
  console.log(`    (advisory, and it stays advisory under --strict.)\n`);
}

// No sidecar is not a pass and not a failure: there is no plan to check the film against. Say which,
// and how to make one, rather than printing a tick for work nobody did. The peak question survives it.
if (!fs.existsSync(intentPath)) {
  console.log(`\n  plan vs render · ${file}`);
  console.log(`  ○ no plan to check against: no sidecar at ${intentPath}.`);
  console.log(`    Write the storyboard, then \`make intent SB=<storyboard.md> D=${file}\`.\n`);
  printNomination();
  process.exit(0);
}
const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });

// ---------- what the render actually does, as a list of moments ----------
// An EVENT is a moment the frame provably changes: a content layer arriving or leaving, a declared
// transition firing, a motion keyframe landing. This is everything a scene JSON can tell you about
// change without rendering it. It is a floor, not a census: a CSS-driven html layer that morphs on its
// own clock produces no event here, which is why `beat-holds-still` also asks whether anything on
// screen is continuously in motion before it complains.
const events = [];
const ev = (t, what) => { if (Number.isFinite(t)) events.push({ t: +(+t).toFixed(3), what }); };
for (const [a, b] of T.spans) { ev(a, 'layer in'); ev(b, 'layer out'); }
for (const key of BOUNDARY_KEYS) {
  for (const c of (Array.isArray(T.scene[key]) ? T.scene[key] : [])) {
    if (c && typeof c === 'object' && num(c.t, null) !== null) ev(num(c.t, 0), key.replace(/s$/, ''));
  }
}
const walk = (L, fn) => { if (!L || typeof L !== 'object') return; fn(L); (L.children || []).forEach((c) => walk(c, fn)); };
for (const L of T.layers) walk(L, (x) => {
  const base = num(x.start, 0);
  if (Array.isArray(x.motion)) for (const k of x.motion) if (k && num(k.t, null) !== null) ev(base + num(k.t, 0), 'motion key');
});
events.sort((x, y) => x.t - y.t);

// a layer whose CONTENT changes every frame while it is on screen, so a stretch it covers is never still.
// A `motion` track is deliberately NOT in this list. A track is keyframes with HOLDS between them, and
// treating one as continuous motion is how the first draft of this gate passed the very film it was
// written for: both of that film's surfaces carry a 6-key track, and both sit frozen for 5.1s of a
// 12s film inside it. The keys are already events; the stretches between them are the subject below.
const CONTINUOUS = (L) => !!(L.type === 'count' || L.ken || L.shader || L.canvasFx || L.three || L.raymarch
  || L.type === 'paint'
  || (typeof L.html === 'string' && /var\(\s*--[tp]\b/.test(L.html))
  || (L.children || []).some(CONTINUOUS));

// AN AUTHORED HOLD: two consecutive motion keys carrying identical values. This is the strongest evidence
// a static gate can have that the frame stalls, because it is not inferred from an absence, it is written
// down. `{t:3.46, y:-82}` followed by `{t:8.6, y:-82}` says, in the author's own hand, that this object
// does not move for 5.14 seconds.
const KEYLESS = new Set(['t', 'ease']);
const holdsOf = (L, base) => {
  const ks = Array.isArray(L.motion) ? L.motion.filter((k) => k && num(k.t, null) !== null) : [];
  const val = (k) => JSON.stringify(Object.fromEntries(Object.entries(k).filter(([p]) => !KEYLESS.has(p)).sort()));
  const out = [];
  for (let i = 1; i < ks.length; i++) if (val(ks[i]) === val(ks[i - 1])) out.push([base + num(ks[i - 1].t, 0), base + num(ks[i].t, 0)]);
  return out;
};
const holds = [];
for (const L of T.layers) walk(L, (x) => { for (const h of holdsOf(x, num(x.start, 0))) holds.push({ span: h, layer: x.type || 'layer' }); });
// T.spans is sorted, so it cannot be indexed by position in T.content. Recompute each mover's window
// from the layer itself, applying the same scene-units correction the shared model uses.
const moverSpans = T.content.filter(CONTINUOUS).map((L) => {
  const a = num(L.start, 0); const u = T.unitEnd(L);
  return [a, u == null ? a + num(L.duration, num(L.dur, 2)) : u];
});

// ---------- the plan ----------
const beats = (Array.isArray(intent.beats) ? intent.beats : []).filter((b) => b && typeof b === 'object');
console.log(`\n  plan vs render · ${file} vs ${intentPath}`);
console.log(`  ${beats.length} planned beat(s) · film runs ${s(T.duration)} · ${events.length} render event(s)`);
// Say out loud whether the prose half of the plan is in play. The sidecar drops `spectacle:` and `pace:`,
// so with no storyboard those two decisions go unchecked, and an unchecked decision should never look
// like a passed one.
if (sbPath) console.log(`  storyboard: ${sbPath} (spectacle + pace joined)`);
else console.log(`  ○ no storyboard found beside this scene, so \`spectacle:\` and \`pace:\` are not checked. Pass --sb <storyboard.md> to join them.`);
console.log('');

const spanned = beats.filter((b) => Array.isArray(b.span) && b.span.length === 2 && b.span.every((x) => Number.isFinite(x)));
if (!spanned.length) {
  warn('plan-has-no-spans', `no beat in ${intentPath} carries a \`span\`, so there is nothing to line the film up against. `
    + `Spans come from the (0s-3s) ranges in the storyboard headings. Re-run \`make intent SB=<storyboard.md> D=${file}\` `
    + `against a storyboard whose headings are timed, and this gate starts working.`);
} else {
  // 1. does the plan describe THIS film, or a different-length one?
  const planEnd = Math.max(...spanned.map((b) => b.span[1]));
  if (Math.abs(planEnd - T.duration) > OVERRUN) {
    fail('plan-overruns-render', `the plan budgets ${s(planEnd)} and the film runs ${s(T.duration)}, a gap of ${s(Math.abs(planEnd - T.duration))}. `
      + `Every beat span below is therefore pointing at the wrong part of the film, so nothing this gate says about them can be trusted. `
      + `Either the storyboard's times are stale (re-time it and re-run \`make intent\`) or the scene's \`duration\` is not what you planned.`);
  }

  // 2. at each junction the plan marks with a change, does the render put anything there?
  for (let i = 1; i < spanned.length; i++) {
    const b = spanned[i];
    const j = b.span[0];
    if (!b.becomes) continue;                       // no promise made here, nothing to keep
    const near = events.filter((e) => Math.abs(e.t - j) <= NEAR);
    if (!near.length) {
      fail('junction-is-static', `beat ${i + 1} "${b.name || ''}" opens at ${s(j)} promising: ${b.becomes}. `
        + `Nothing in the render happens within ${s(NEAR)} of it: no layer arrives or leaves, no cut or seam or sting fires, no motion key lands. `
        + `The plan names a transformation and the JSON builds no moment for it. Give the junction an event, or move the beat boundary to where the film actually turns.`);
    }
  }

  // 3. inside a beat the plan paid seconds for, does the film hold still for most of them?
  for (const [i, b] of spanned.entries()) {
    const [a, z] = b.span;
    const inside = [a, ...events.filter((e) => e.t > a + 1e-9 && e.t < z - 1e-9).map((e) => e.t), z].sort((x, y) => x - y);
    let worst = 0, at = a;
    for (let k = 1; k < inside.length; k++) { const gap = inside[k] - inside[k - 1]; if (gap > worst) { worst = gap; at = inside[k - 1]; } }
    if (worst < STILL) continue;
    // a count ticking, a ken burn, a shader: the frame is moving even though no event fires. Not a hold.
    if (moverSpans.some(([ms, me]) => ms <= at + 1e-9 && me >= at + worst - 1e-9)) continue;
    warn('beat-holds-still', `beat ${i + 1} "${b.name || ''}" (${s(a)}-${s(z)}) holds ${s(worst)} from ${s(at)} with nothing arriving, leaving or moving`
      + `${b.becomes ? `, while the plan says this beat is where "${b.becomes}"` : ''}. `
      + `That is ${Math.round((worst / Math.max(T.duration, 1e-9)) * 100)}% of the whole film spent on one unchanging frame. `
      + `Stage the change across the beat instead of landing it all at the edge, or give the beat fewer seconds.`);
  }

  // 3b. does the plan promise a change across seconds the author explicitly froze?
  for (const [i, b] of spanned.entries()) {
    const [a, z] = b.span;
    // Two surfaces frozen across the same seconds is ONE stalled frame, not two findings. Report the
    // worst hold in the beat and name how many layers share it.
    let hit = null;
    for (const h of holds) {
      const lo = Math.max(a, h.span[0]), hi = Math.min(z, h.span[1]);
      if (hi - lo < STILL) continue;
      // ONE layer holding still is not the frame holding still, and conflating the two makes this gate
      // shout at good films. The control arm of the A/B test pins a surface for 6.7s and is the better
      // film, because other things arrive and leave the whole time. So the hold only counts across the
      // stretch of it where nothing ELSE happens either. A hold's own two keys bound the window, so any
      // event strictly inside it belongs to something else.
      const marks = [lo, ...events.filter((e) => e.t > lo + 1e-9 && e.t < hi - 1e-9).map((e) => e.t), hi].sort((x, y) => x - y);
      let worst = 0, at = lo;
      for (let k = 1; k < marks.length; k++) if (marks[k] - marks[k - 1] > worst) { worst = marks[k] - marks[k - 1]; at = marks[k - 1]; }
      if (worst < STILL) continue;
      if (!hit || worst > hit.worst) hit = { worst, at, layers: new Set([h.layer]) };
      else if (Math.abs(worst - hit.worst) < 1e-6) hit.layers.add(h.layer);
    }
    if (hit) {
      const who = [...hit.layers].join(' + ');
      warn('held-through-the-change', `beat ${i + 1} "${b.name || ''}" (${s(a)}-${s(z)}) runs ${s(z - a)}, and for ${s(hit.worst)} of it, from ${s(hit.at)}, `
        + `the ${who} layer(s) sit pinned to identical motion keys while nothing else arrives, leaves or moves either. `
        + `${b.becomes ? `The plan says this beat is where "${b.becomes}". ` : ''}`
        + `The hold is authored, not inferred: two consecutive keys carry the same values. If the beat is where something turns, `
        + `stage the turn across it; if the object is meant to rest here, it does not need this many seconds.`);
    }
  }

  // 4. does the film turn where the plan says it turns?
  const boundaries = [...new Set(spanned.flatMap((b) => b.span))].sort((x, y) => x - y);
  for (const t of T.cutTimes) {
    if (boundaries.some((bd) => Math.abs(bd - t) <= DRIFT)) continue;
    warn('unplanned-junction', `the film cuts at ${s(t)} and the plan has no beat boundary within ${s(DRIFT)} of it `
      + `(planned boundaries: ${boundaries.map(s).join(', ')}). Either the storyboard is out of date with the edit, or the film breaks somewhere the plan never accounted for.`);
  }
}

// ---------- the storyboard's prose decisions, against the film ----------
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// Which beat did the SPECTACLE line name? Two ways, both literal: an ordinal ("beat 4"), or exactly one
// beat name quoted inside the line. Anything else is unresolved and SAID to be unresolved — guessing
// which beat the author meant would put a finding on a film for a sentence this gate misread.
function plannedSpectacleBeat(line, list) {
  const m = /\bbeat\s*#?\s*(\d+)\b/i.exec(line);
  if (m) {
    const i = +m[1] - 1;
    return (i >= 0 && i < list.length) ? { i, how: `it says "beat ${m[1]}"` } : null;
  }
  const low = line.toLowerCase();
  const hits = list.map((b, i) => ({ b, i })).filter(({ b }) => b.name && b.name.length >= 4 && low.includes(b.name.toLowerCase()));
  return hits.length === 1 ? { i: hits[0].i, how: `it names the beat "${hits[0].b.name}"` } : null;
}

if (sb && sb.spectacle) {
  if (!isObj(d.spectacle)) {
    warn('spectacle-not-built', `${sbPath} declares a spectacle: ${sb.spectacle}. ${file} has no \`spectacle\` block, so the film has no peak. `
      + `The plan names the one moment the film is allowed to shout, and naming it is also a promise that every other beat stays restrained; neither half was built. `
      + `Add \`"spectacle": { "at": <seconds>, "of": "<layer id>", "device": "<device>", "why": "<what the moment is for>" }\` to the scene (core/spectacle.js), or drop the line from the plan.`);
  } else if (spanned.length) {
    const loc = plannedSpectacleBeat(sb.spectacle, spanned);
    if (!loc) {
      warn('spectacle-beat-unnamed', `${sbPath} declares a spectacle: ${sb.spectacle}. The scene puts its peak at ${s(d.spectacle.at)}, `
        + `but the line names no beat this gate can find, so the two cannot be compared. Write the beat into it, as "beat 4" or with the beat's own title, `
        + `and this check starts telling you whether the peak landed where you planned it.`);
    } else {
      const [a, z] = spanned[loc.i].span;
      const at = num(d.spectacle.at, null);
      if (at !== null && (at < a - NEAR || at > z + NEAR)) {
        warn('spectacle-in-wrong-beat', `${sbPath} puts the spectacle in beat ${loc.i + 1} "${spanned[loc.i].name || ''}" (${s(a)}-${s(z)}), because ${loc.how}. `
          + `The scene fires it at ${s(at)}, outside that beat. The loudest instant of the film lands somewhere the plan did not budget for it, `
          + `and the whole rest of the film has been quietened to buy a peak in the other place. Move \`spectacle.at\` into the beat, or re-plan the beat around where the peak really is.`);
      }
    }
  }
}

// PACE. The plan budgets seconds per IDEA before any beat is written; the film has a runtime and a beat
// count. This lays one over the other. It counts the PLAN's ideas against the RENDER's clock, so it
// catches a film that grew past its budget; it cannot see two ideas crowded into one beat, which is a
// judgement `make judge` makes and no arithmetic here can.
const PACE_BANDS = { showreel: [1.5, 4], explainer: [3, 8], held: [6, Infinity] };
if (sb && sb.pace && spanned.length) {
  const raw = sb.pace;
  const named = Object.keys(PACE_BANDS).filter((g) => new RegExp(`\\b${g}\\b`, 'i').test(raw));
  // The template's own placeholder lists all three genres. An author who never deleted the other two has
  // not chosen a pace, and reading the first one as their choice would invent a decision nobody made.
  if (named.length !== 1) {
    warn('pace-not-chosen', `${sbPath} carries \`pace: ${raw}\`. That is the template's menu, not a choice. `
      + `Pace is a genre decision made before any beat is written: keep exactly one of showreel · explainer · held and give it a seconds-per-idea budget.`);
  } else {
    const genre = named[0].toLowerCase();
    // An explicit budget in the line wins over the genre's band: "2.5s per idea", "2-4 s/idea".
    const two = /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*s(?:ec)?\b[^.]{0,24}?\bidea/i.exec(raw);
    const one = /(\d+(?:\.\d+)?)\s*s(?:ec)?\b[^.]{0,24}?\bidea/i.exec(raw);
    const band = two ? [+two[1], +two[2]] : one ? [+one[1] * 0.6, +one[1] * 1.4] : PACE_BANDS[genre];
    const source = two ? `its own ${two[1]}-${two[2]}s budget` : one ? `its own ${one[1]}s budget (±40%)` : `a ${genre}'s ${band[0]}-${band[1] === Infinity ? '∞' : band[1]}s band`;
    const real = T.duration / spanned.length;
    const shots = T.duration / (T.cutTimes.length + 1);
    if (real < band[0] || real > band[1]) {
      warn('pace-not-kept', `${sbPath} declares \`pace: ${raw}\`, and the film gives its ${spanned.length} planned idea(s) ${s(T.duration)}, `
        + `which is ${real.toFixed(2)}s per idea against ${source}. Its shots average ${shots.toFixed(2)}s. `
        + `${real > band[1] ? 'The film is slower than the pace it was planned at: cut the duration before adding beats, because a slow film is almost always a film that is too long.'
          : 'The film is faster than the pace it was planned at: a beat carrying two ideas is two beats or one cut, never one crowded frame.'} `
        + `Either re-cut to the budget, or change \`pace:\` to the genre this film really is.`);
    }
  }
}

// ---------- report ----------
const fails = findings.filter((f) => f.sev === 'FAIL' && !allow.has(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !allow.has(f.code));
const waived = findings.filter((f) => allow.has(f.code));
for (const f of fails) console.log(`  ✗ [${f.code}] ${f.msg}\n`);
for (const f of warns) console.log(`  ~ [${f.code}] ${f.msg}\n`);
for (const f of waived) console.log(`  ○ [${f.code}] waived via authoring.allow`);
// The peak question runs on a planned film too. A sidecar carries beats and `becomes:` lines and never
// a spectacle, so a film can be fully planned, fully checked here, and still nominate nothing.
printNomination();
if (!fails.length && !warns.length) console.log('  ✓ the film has a moment where the plan promised one, and no planned beat sits still.');
console.log(`\n  ${fails.length} fail · ${warns.length} warn`);
// The honesty line prints on GREEN too. A gate that only qualifies itself when it fails teaches the
// reader that a tick means more than it does.
console.log(`  (this gate proves a change HAPPENS at each promised junction. That the change is the one named,`);
console.log(`   and that the object survives it, is what \`make judge\` and your eyes are for.`);
console.log(`   It proves the spectacle was BUILT and sits in the planned beat, never that the moment is worth the`);
console.log(`   silence it bought; and it counts the plan's ideas against the film's clock, never how many ideas are`);
console.log(`   crowded into one beat.)\n`);
process.exit(fails.length || (strict && warns.length) ? 1 : 0);
