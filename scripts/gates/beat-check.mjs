// scripts/gates/beat-check.mjs . THE TIMELINE GATE: is there something on screen, all the way through?
//
// Every other static gate reads the scene as a BAG of layers (does it have kinetic type, is the palette
// locked, is the copy strong). None of them reads it as a TIMELINE. So a scene could ship with half a
// second where the frame holds nothing but the backdrop, or end on an empty plate, and every gate stayed
// green. example-html-bg.json shipped exactly that: 0.4s of pure background before the first word.
//
// This gate walks the clock instead of the layer list. It asks four questions:
//   dead-air         . is there a run of >= 0.4s with no content layer on screen?
//   ends-on-nothing  . does the last 0.2s hold nothing?
//   empty-beat       . does a declared cut/seam window contain no layer at all?
//   static-bg        . is the whole film on a flat field, or on hand-authored markup that cannot animate?
// plus one WARN the machine cannot answer for you:
//   beats-unseen     . nobody has LOOKED at this version of the scene (`make beats` writes a receipt).
//
// A layer is visible over [start, start+duration), matching formats/scene/scene.js (default duration 2,
// default start 0). Exits run INSIDE that window, so the window is the whole truth. `track:0` layers are
// backdrops, not content, so they never keep the frame alive.
//
// WHAT COUNTS AS CONTENT, and why the layer list is not the answer. An open window is not the same as
// something in the frame, and two kinds of layer prove it. A BLACKOUT (a rect the size of the canvas,
// filled with an opaque colour) is a backdrop by function, not a subject: it does not add to the frame,
// it paints over everything behind it. `track:0` is how the schema says "backdrop", but a scrim is
// authored as an ordinary layer, so the gate has to read the shape. A SPECK (a box under 8% of the
// canvas on both axes, so under two thousandths of the frame's area) is a garnish: a loading dot, a
// spinner, a cursor. Neither carries a frame on its own. rec1-nogate.json held 6.38s to 6.86s open with
// exactly one of each, a black scrim over a 60px dot, and the rendered frame there is empty. Removing
// either rule alone leaves that hole covered, which is what let it ship.
//
// THRESHOLD, and why it is 0.4s and not 0.25s. A beat boundary in this repo routinely leaves a ~0.3s
// breath between the outgoing layer's end and the incoming layer's start: 46 of 83 shipped scenes do it,
// and it reads as a beat of rest, not as a hole. 0.4s is the line where the breath stops reading as
// deliberate. A gap a declared STING owns is exempt at any length: a shader sting paints its own pixels,
// so it really is content for its span. A CUT or a SEAM is not. Both are treatments of what is already on
// screen (a cut transforms the scene root or cross-fades two beat wrappers, a seam blends two baked
// frames), and over an empty frame both produce an empty frame. brew-launch shipped five black frames
// inside a 0.28s punch on exactly that exemption (#166). What a cut DOES buy is modelled instead: under
// `sceneUnits` the engine runs every non-last-beat layer to `beatEnd + cutDur`, and this gate computes the
// same spans, so the coverage it credits is the coverage the renderer actually produces.
//
// STATIC BACKGROUNDS, and why this is not measured. core/backgrounds.js paints on a canvas, so it cannot
// be sampled from node. So the test is structural, not pixel-based, and it comes in two tiers.
// It FAILS on a hand-authored (`html`) window whose markup names neither `var(--t)` nor `var(--p)`: CSS
// animation is disabled engine-wide, so those two custom properties are the only clock a fragment has, and
// without one the backdrop provably cannot move. It WARNS on a whole film built from nothing but the flat
// presets (`plain` / `accentPlain` / `paper`), because that is a taste call, not a bug: 28 of the 83
// shipped scenes are exactly that, including every white-first launch film, where a flat paper field is
// the correct answer and the motion lives in the content. One flat window is never flagged either way.
//
//   node scripts/gates/beat-check.mjs <scene.json> [--strict]   ·   make beat-check D=<file>
// FAIL (blocks): dead-air · ends-on-nothing · empty-beat · static-bg (the dead-markup tier).
// WARN: static-bg (the flat-film tier) · beats-unseen. Both block under --strict.
// Waive a deliberate break with {"authoring":{"allow":["dead-air", ...]}}.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneTiming, num, SPECK } from './scene-timing.mjs';
import { readReceipt } from '../lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node scripts/gates/beat-check.mjs <scene.json> [--strict]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

const raw = fs.readFileSync(file, 'utf8');
let d;
try { d = JSON.parse(raw); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (!d || typeof d !== 'object') { console.error(`✗ ${file} is not a scene object`); process.exit(1); }
// this gate reads a scene TIMELINE. A sidecar (.intent.json), a schema, or another module has none, so
// there is nothing here to be right or wrong about. Say so and pass, rather than inventing findings.
if (d.module !== 'scene') { console.log(`  beat check · ${file}: not a scene module (module=${d.module ?? 'none'}), nothing to check.`); process.exit(0); }
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// ---------- the clock ----------
// SCENE UNITS extend a layer's life, so the gate has to model them or it reads holes that are not there
// (and misses ones that are). That model is shared with plan-vs-render and lives in ONE place:
// scripts/gates/scene-timing.mjs. What it corrects for, and why, is documented there.
const DEAD_AIR = 0.4;   // seconds of nothing that stops reading as a breath
const TAIL = 0.2;       // the closing plate: it must hold something
const T = sceneTiming(d);
const { layers, content, spans, duration, cutTimes, sceneUnits } = T;

// windows a declared transition owns. A cut/seam/sting IS the content of its span, it just is not a layer.
const owned = [];
for (const key of ['cuts', 'seams', 'stings']) {
  for (const c of (Array.isArray(d[key]) ? d[key] : [])) {
    if (!c || typeof c !== 'object') continue;
    const t = num(c.t, null);
    if (t === null) continue;
    owned.push([t, t + num(c.dur, 0.5), key]);
  }
}
// A STING paints its own pixels (a WebGL shader over the stage), so it really is content for its span.
// A CUT or a SEAM is a TREATMENT of whatever is already there: a cut transforms the scene root (or
// cross-fades two beat wrappers), a seam blends two baked frames. Over an empty frame both produce an
// empty frame. So only stings can close a hole. See MISTAKES #166.
const ownedBy = (a, b) => owned.find(([s, e, key]) => key === 'stings' && s <= b + 1e-9 && e >= a - 1e-9);

// merge the visible spans into a coverage map, then read the holes out of it.
const merged = [];
for (const [a, b] of spans) {
  if (merged.length && a <= merged[merged.length - 1][1] + 1e-9) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
  else merged.push([a, b]);
}
const holes = [];
let cursor = 0;
for (const [a, b] of merged) {
  if (a > cursor + 1e-9 && cursor < duration) holes.push([cursor, Math.min(a, duration)]);
  cursor = Math.max(cursor, b);
}
if (cursor < duration - 1e-9) holes.push([cursor, duration]);

const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });
const s = (n) => `${(+n).toFixed(2)}s`;

// ---------- 1. dead-air ----------
// interior holes only: a hole that runs to the end of the film is the closing plate, and that is
// `ends-on-nothing` below. Reporting one hole under two tells would just double the noise.
const deadAir = holes.filter(([a, b]) => b < duration - 1e-9 && b - a >= DEAD_AIR - 1e-9 && !ownedBy(a, b));
if (deadAir.length) {
  const list = deadAir.map(([a, b]) => `${s(a)} to ${s(b)} (${s(b - a)})`).join(' · ');
  fail('dead-air', `${deadAir.length} span(s) hold NO content layer: ${list}. The frame sits on the backdrop and the film stalls there, which reads as a stutter or a broken render, not as a beat of rest. Fix it by extending the outgoing layer's \`duration\` (or pulling the next layer's \`start\` earlier) so the windows touch, or by declaring a cut/seam across the gap so a transition owns it. Anything under ${s(DEAD_AIR)} is treated as a breath and passes. A full-canvas opaque rect (a blackout) and a box under ${Math.round(SPECK * 100)}% of the canvas (a dot, a spinner) do NOT close a gap: neither carries the frame.`);
}

// ---------- 2. ends-on-nothing ----------
// "no visible layer in the final 0.2s", so any layer that reaches INTO the tail counts. A closing line
// that stops 0.05s before the declared duration is an outro breath, not an empty plate.
const tailStart = duration - TAIL;
// A layer that ends exactly ON the tail line is treated as reaching it: 7 shipped scenes close with the
// last layer landing at duration minus 0.2 as a deliberate outro beat, and that is not an empty plate.
const tailCovered = merged.some(([a, b]) => b >= tailStart - 1e-9 && a < duration - 1e-9);
if (!tailCovered && duration > TAIL) {
  fail('ends-on-nothing', `the last ${s(TAIL)} of this ${s(duration)} video (from ${s(tailStart)}) holds no content layer, so the film fades to a bare backdrop and the viewer's last frame is empty. That is the frame a feed freezes on, so it is the one that has to carry the mark or the line. Fix it by running the closing layer to \`${s(duration)}\` (start + duration = the scene duration), or by shortening \`duration\` to where the content actually ends.`);
}

// ---------- 3. empty-beat ----------
// a declared cut/seam window is a promise that something changes there. If no layer starts inside it and
// no layer is even on screen across it, the transition blends nothing into nothing.
const beatWindows = owned.filter(([, , key]) => key !== 'stings');
const emptyBeats = beatWindows.filter(([a, b]) => {
  const startsInside = content.some((L) => { const t = num(L.start, 0); return t >= a - 1e-9 && t <= b + 1e-9; });
  const visibleAcross = spans.some(([x, y]) => x < b - 1e-9 && y > a + 1e-9);
  return !startsInside && !visibleAcross;
});
if (emptyBeats.length) {
  const list = emptyBeats.map(([a, b, key]) => `${key.replace(/s$/, '')} at ${s(a)} (to ${s(b)})`).join(' · ');
  fail('empty-beat', `${emptyBeats.length} declared transition window(s) contain no layer at all: ${list}. A cut or seam bakes the outgoing and incoming frames and blends them, so with nothing on either side it blends backdrop into backdrop: you pay the transition and see no change. Fix it by giving the beat its content (a layer that starts inside the window), or by deleting the cut/seam if the beat was cut.`);
}

// ---------- 4. static-bg ----------
// The flat presets are honest choices, so a single flat window is never flagged. Two things are flagged:
// a whole film with no moving window anywhere, and hand-authored markup that has no clock to move on.
const STATIC_PRESETS = new Set(['plain', 'accentPlain', 'paper']);
const bgs = (Array.isArray(d.bg) ? d.bg : []).filter((b) => b && typeof b === 'object');
const deadHtml = bgs.filter((b) => typeof b.html === 'string' && !/var\(\s*--t\b/.test(b.html) && !/var\(\s*--p\b/.test(b.html));
if (deadHtml.length) {
  fail('static-bg', `${deadHtml.length} hand-authored bg window(s) reference neither \`var(--t)\` nor \`var(--p)\`, so the backdrop CANNOT move: CSS animation and transition are disabled engine-wide (core/tokens.css) and those two custom properties are the only clock a fragment gets. The backdrop is the largest area of the frame, and a frozen one makes the whole video read as a slide. Fix it by driving one value from the clock, e.g. \`transform: rotate(calc(var(--t) * 6deg))\` or a wash positioned at \`calc(38% + var(--p) * 24%)\`.`);
}
// A whole film on flat presets COACHES rather than blocks. 28 of the 83 shipped scenes do it, including
// every white-first launch film, because a flat paper field is the right answer for a white-first brand
// and the motion lives in the content. Blocking it would fail the house style, so it warns; the provably
// broken half above (markup with no clock) still fails.
const backdropMotion = layers.some((L) => L.shader || L.canvasFx || L.three || L.raymarch || L.type === 'paint' || L.track === 0);
const movingWindows = bgs.filter((b) => !(typeof b.preset === 'string' && STATIC_PRESETS.has(b.preset)));
if (bgs.length && movingWindows.length === 0 && duration > 3 && !backdropMotion) {
  const names = [...new Set(bgs.map((b) => b.preset))].join(', ');
  warn('static-bg', `every bg window in this ${s(duration)} film is a flat field (${names}) and nothing behind the content ever changes. One flat window is a deliberate look; a whole video on one puts the largest area of the frame to sleep. Reach for a moving preset on at least one beat (aurora / mesh / dotmatrix / gradientWash / metallic, see core/backgrounds.js), or split \`bg\` into windows with \`t\` so the field shifts with the story.`);
}

// ---------- 5. beats-unseen: the receipt ----------
// `make beats` and `make reveal` render a contact sheet a human or agent has to LOOK at. No gate can score
// that image, so the only checkable fact is whether anyone looked at THIS version. Both tools write a
// receipt carrying the scene's content hash; a hash that no longer matches means the scene moved on.
// The hashing and the path live in scripts/lib/receipt.mjs now, so every stage can be signed off the
// same way. This reader is unchanged in behaviour: same code, same severity, same two wordings for the
// two genuinely different states (nobody looked at all, versus somebody looked at an older version).
const seen = readReceipt('beats', file);
if (!seen.exists || seen.stale) {
  warn('beats-unseen', seen.exists
    ? `the scene has CHANGED since its beats were last looked at (receipt ${seen.rel} holds an older hash, sheet ${seen.receipt.sheet}). Static gates read structure and cannot see murk, overlap or a beat that lands wrong, so an unread edit ships unverified. Run \`make beats D=${file}\` and read the sheet it prints.`
    : `nobody has looked at this scene's beats: no receipt at ${seen.rel}. Static gates read structure and cannot see murk, overlap or a beat that lands wrong. Run \`make beats D=${file}\` (or \`make reveal D=${file}\` for the entrances) and read the sheet.`);
}

// ---------- report ----------
console.log(`\n  beat check · ${file}`);
console.log(`  ${content.length} content layer(s) · ${s(duration)} · coverage ${merged.length} block(s) · ${holes.length} hole(s) · ${owned.length} declared transition window(s)`);
const fails = findings.filter((f) => f.sev === 'FAIL' && !allow.has(f.code));
const waived = findings.filter((f) => allow.has(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !allow.has(f.code));
console.log(`\n  ${fails.length} fail · ${warns.length} warn${waived.length ? ` · ${waived.length} waived` : ''}`);
for (const f of fails) console.log(`    ✗ [${f.code}] ${f.msg}`);
for (const w of warns) console.log(`    ~ [${w.code}] ${w.msg}`);
for (const w of waived) console.log(`    ○ [${w.code}] waived via authoring.allow`);
if (!findings.length) console.log('    ✓ the timeline holds: content on screen throughout, every beat carries something');

if (fails.length || (strict && warns.length)) {
  console.log(`\n  ✗ beat check: the timeline has holes. Fix them, or waive a deliberate break with {"authoring":{"allow":[...]}}.\n`);
  process.exit(1);
}
console.log(warns.length ? `\n  beat check cleared with ${warns.length} nudge(s).\n` : `\n  ✓ beat check clear.\n`);
process.exit(0);
