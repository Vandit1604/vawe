// scripts/gates/direction-floor.mjs — THE AMBITION FLOOR. The inverse of effect-soup.
//
// effect-soup (motion-director) is the UPPER bound: too many effects, undirected. Nothing was the LOWER
// bound — so a video that is all `rise`+`fade`, no camera, no kinetic type, no transitions (a plain
// slideshow) passed every gate. That is the exact failure an agent regresses to from a blank JSON: it
// satisfices with the safe default and never reaches for the range it has. This gate closes the band:
// a video must be neither soup nor slideshow. "Directed" lives between.
//
// It reads the scene's MOTION VOCABULARY — kinetic type, count-ups, camera moves, transitions, ken push,
// cursors, custom motion tracks, fx, background motion, and blueprint beats — and fails a video that
// uses almost none of it. A scene composed from blueprints (`{type:"beat"}`) is directed by construction.
//
//   node scripts/gates/direction-floor.mjs <scene.json> [--strict]   ·   make direction-floor D=<file>
// FAIL (blocks): `plain-slideshow`. WARN (coaching): no-kinetic-type · no-camera · no-transition ·
// no-bg-motion · low-vocab. Waive a deliberate minimal film with {"authoring":{"allow":["plain-slideshow"]}}.
import fs from 'node:fs';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node scripts/gates/direction-floor.mjs <scene.json> [--strict]'); process.exit(2); }
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// flatten every layer, including group children and beat descriptors.
const flat = []; (function rec(ls) { for (const l of ls || []) if (l && typeof l === 'object') { flat.push(l); if (l.children) rec(l.children); } })(d.layers);

const texts = flat.filter((l) => (l.type === 'text' || l.type == null) && l.text);
const headlines = texts.filter((l) => (l.size ?? 0) >= 40 && l.font !== 'mono');
const isExpressiveText = (l) => !!(l.split || l.preset || l.fx || Array.isArray(l.motion) || l.ken);
const plainHeadlines = headlines.filter((l) => !isExpressiveText(l));

// background motion: a bg WINDOW on a moving preset, or a shader / canvasFx / three layer.
const MOVING_BG = /gradient|aurora|mesh|constellation|wave|flow|shader|orb|noise|plasma|dither/i;
const hasBgMotion = (d.bg || []).some((b) => b && MOVING_BG.test(String(b.preset || b.value || '')))
  || flat.some((l) => l.shader || l.canvasFx || l.three || l.raymarch || l.type === 'paint');

// camera actually MOVES (s/x/y changes across keyframes), not a static [{s:1},{s:1}].
const cam = d.camera || [];
const camMoves = cam.length > 1 && cam.some((k) => (k.s ?? 1) !== (cam[0].s ?? 1) || (k.x ?? 0) !== (cam[0].x ?? 0) || (k.y ?? 0) !== (cam[0].y ?? 0));

const sig = {
  beats: flat.filter((l) => l.type === 'beat').length,
  kineticText: texts.filter(isExpressiveText).length,
  countup: flat.filter((l) => l.type === 'count').length,
  camera: camMoves ? 1 : 0,
  transition: (d.seams || []).length + (d.cuts || []).length + flat.filter((l) => l.cut).length,
  ken: flat.filter((l) => l.ken).length,
  cursor: flat.filter((l) => l.type === 'cursor').length,
  motionTrack: flat.filter((l) => Array.isArray(l.motion) && l.motion.length > 1).length,
  fx: flat.filter((l) => l.fx).length,
  bgMotion: hasBgMotion ? 1 : 0,
  // the killer per-frame effects (docs/EFFECTS.md): a border-beam/shine, a paint field, a glow flash, an
  // svg logo that draws-on or shape-morphs. Each is a distinct directed technique the floor now credits.
  beam: flat.filter((l) => l.type === 'beam').length,
  paint: flat.filter((l) => l.type === 'paint').length,
  glowFlash: flat.filter((l) => l.type === 'glow' && l.flash).length,
  svgMotion: flat.filter((l) => l.type === 'svg' && (l.draw || l.morph)).length,
  // a `composition` layer is a bespoke hand-authored per-beat GSAP timeline — directed by construction
  // (a multi-tween motion-graphics beat), so it counts as its own technique. compositions/index.js.
  composition: flat.filter((l) => l.type === 'composition').length,
};
// distinct expressive TECHNIQUES in play (a beat counts, since it emits several).
const vocab = Object.entries(sig).filter(([, v]) => v > 0).map(([k]) => k);
const directedByBeats = sig.beats > 0;

const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });

if (!directedByBeats) {
  const plainShare = headlines.length ? plainHeadlines.length / headlines.length : 0;
  // THE HARD FLOOR: a plain slideshow — no kinetic type, no camera, no transitions, and a thin vocab.
  if (sig.kineticText === 0 && !camMoves && sig.transition === 0 && vocab.length < 2) {
    fail('plain-slideshow', `this reads as a SLIDESHOW: no kinetic typography, no camera move, no transitions, motion vocabulary = {${vocab.join(', ') || 'none'}}. Compose from blueprints ({type:"beat"}) or add kinetic reveals + a camera move + seams. See docs/CRAFT/BLUEPRINTS.md + DIRECTION.md.`);
  } else if (headlines.length >= 4 && plainShare >= 0.85 && sig.kineticText === 0) {
    fail('plain-slideshow', `${plainHeadlines.length}/${headlines.length} headlines just fade/rise with no kinetic reveal — the plain-authoring tell. Give headlines split+preset (words rise/scale), or use a blueprint beat.`);
  }
  // coaching WARNs — the range this video is leaving on the table.
  if (sig.kineticText === 0) warn('no-kinetic-type', 'no kinetic typography anywhere (no split+preset headline). A directed video reveals key lines word-by-word — MOTION-RECIPES words-rise.');
  if (!camMoves) warn('no-camera', 'the camera never moves. One slow push (or a dive-in on a product shot) adds life without moving content — MOTION-RECIPES slow-push / dive-in.');
  if (sig.transition === 0) warn('no-transition', 'no seams or cuts between beats — beats just cut flat. Earn 1-3 transitions (a dissolve, a cinematicZoom into a screen).');
}
if (!sig.bgMotion) warn('no-bg-motion', 'the background is static. A good video moves the viewer with a living backdrop (a moving gradient / mesh / aurora / shader), used brand-appropriately, not a flat field. See core/backgrounds.js.');
if (!directedByBeats && vocab.length < 3) warn('low-vocab', `only ${vocab.length} motion technique(s) in play (${vocab.join(', ') || 'none'}). Reach for more of the range: count-ups, ken push, a cursor demo, a custom motion track.`);

// ANTI-FRONT-LOAD (another engine reveal model): a directed video weights its cues ACROSS its length; the
// SLIDESHOW failure dumps everything in the first quarter, then freezes. A reveal = a timed content
// layer's start. If nearly all reveals land in the first 30% and the back half gets nothing new, it is a
// slideshow even when each line is kinetic. Beat-composed scenes spread starts across the film, so they
// clear this; a hand-authored front-load trips it.
const dur = d.duration || flat.reduce((m, l) => Math.max(m, (l.start ?? 0) + (l.duration ?? 0)), 0) || 1;
const reveals = flat.filter((l) => l.track !== 0 && (l.text || l.type === 'count' || l.type === 'beat' || l.type === 'image' || l.type === 'svg' || isExpressiveText(l))).map((l) => l.start ?? 0);
if (reveals.length >= 4) {
  const early = reveals.filter((t) => t < dur * 0.3).length / reveals.length;
  const lateHalf = reveals.filter((t) => t > dur * 0.5).length;
  if (early >= 0.8 && lateHalf === 0) warn('front-loaded', `${Math.round(early * 100)}% of reveals land in the first ${(dur * 0.3).toFixed(1)}s and the back half is frozen — the SLIDESHOW failure (everything dumped early, then static). Weight cues into the back ~50%: give each key line its own reveal beat. (docs/CRAFT/DIRECTION.md reveal model.)`);
}
// NO TWO BEATS MOVE ALIKE (another engine): vary the motion vocabulary across the film. If every kinetic
// line uses the identical reveal preset, the video moves monotonously even when each beat is "kinetic".
const presets = flat.filter((l) => l.preset).map((l) => l.preset);
if (presets.length >= 5 && new Set(presets).size === 1) {
  warn('motion-monotony', `all ${presets.length} kinetic lines use the same reveal preset "${presets[0]}" — the film moves monotonously. Vary it so no two beats move alike (up / scale / blur / decode / riseClip): docs/EFFECTS.md kinetic presets.`);
}
// DENSE FIGURES BY DEFAULT (parts): a multi-part figure that lands as ONE block reads flat next to real
// motion graphics. A group of 3+ cards, or an inline SVG with 3+ shapes, should animate PIECE BY PIECE.
const staticFigures = flat.filter((l) => {
  if (l.parts || l.split) return false;
  if (l.type === 'group' && Array.isArray(l.children) && l.children.length >= 3 && l.each == null) return true;
  if (l.type === 'html' && typeof l.html === 'string' && (l.html.match(/<(rect|circle|path|polyline|line)\b/g) || []).length >= 3) return true;
  return false;
});
if (staticFigures.length) warn('static-figure', `${staticFigures.length} figure(s) (a 3+-child group or a multi-shape SVG) animate as one block — add \`parts\` (or a group \`each\`) so they build piece by piece: bars grow, the line draws, dots pop. docs/CRAFT/AUTHOR-THE-FRAME.md.`);

// ---- report ----
const score = vocab.length + (directedByBeats ? 3 : 0);
console.log(`\n  direction floor · ${file}`);
console.log(`  motion vocabulary: ${vocab.map((k) => `${k}×${sig[k]}`).join(' · ') || '(none)'}${directedByBeats ? '  [composed from blueprints]' : ''}`);
console.log(`  directedness score: ${score}   (floor: not a plain slideshow · reach ≥3 techniques)`);
const fails = findings.filter((f) => f.sev === 'FAIL' && !allow.has(f.code));
const waived = findings.filter((f) => f.sev === 'FAIL' && allow.has(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !allow.has(f.code));
console.log(`\n  ${fails.length} fail · ${warns.length} warn${waived.length ? ` · ${waived.length} waived` : ''}`);
for (const f of fails) console.log(`    ✗ [${f.code}] ${f.msg}`);
for (const w of warns) console.log(`    ~ [${w.code}] ${w.msg}`);
for (const w of waived) console.log(`    ○ [${w.code}] waived via authoring.allow`);
if (!findings.length) console.log('    ✓ directed — motion vocabulary clears the floor');

const blocking = fails.length || (strict && warns.length);
if (blocking) { console.log(`\n  ✗ direction floor: too plain — fix before shipping (or waive a deliberate minimal film).\n`); process.exit(1); }
console.log(warns.length ? `\n  floor cleared with ${warns.length} nudge(s) to reach past.\n` : `\n  ✓ direction floor clear.\n`);
process.exit(0);
