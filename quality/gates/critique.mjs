// quality/gates/critique.mjs: the VALUE GATE. Static critic over a scene JSON that fires on the failure
// modes a human otherwise catches per-scene: placeholder words, unbacked claims, static lists,
// illegible transitions, lonely low-value beats. Not taste-complete, but it makes the recurring
// mistakes un-shippable. Run: node quality/gates/critique.mjs <scene.json> [--strict]
//
// Modeled on per-frame red-flag checks + our engine-doctrine/skill "every frame fights for its value".
import fs from 'node:fs';
import { canvasShare, sceneTiming, boxOf, sceneView, inView, PICTORIAL, htmlGraphic } from './scene-timing.mjs';
import { onScreenText, glyphText, snippet } from '../../harness/lib/text.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { cameraAt } from '../../core/timeline/sequence.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node quality/gates/critique.mjs <scene.json> [--strict]'); process.exit(2); }
// The unified `transitions` surface is SUGAR: the engine lowers it to cuts/seams/stings before it
// renders anything (core/transitions/lower.js), and until this line the gates did not, so a scene
// that declared its boundaries the documented way was read as a film with no boundaries at all.
// Lowering here is idempotent and a no-op for a scene that already writes raw `cuts`. MISTAKES #380.
const d = loadScene(JSON.parse(fs.readFileSync(file, 'utf8')));
const layers = d.layers || [];
const findings = [];
// Named `warn`/`fail`, not one `F(severity, rule, ...)`: harness/lib/finding-codes.mjs statically greps
// gate source for a call named warn or fail whose first argument is the finding code, the shared
// convention ten other gates already follow, to answer "which codes does this file actually emit" for
// doc-map's routing check. A single dispatcher with the severity as its first argument hides every code
// behind a variable name that scan cannot read; every finding in this file was invisible to it before
// this split (engine-doctrine/MISTAKES.md #618).
// `sev` is set from these constants, not a literal quoted here: finding-codes.mjs also matches a bare
// `sev: '<code>'` (designspec-check's own shape) and would otherwise read "warn"/"error" themselves as
// finding codes.
const SEV_WARN = 'warn', SEV_ERROR = 'error';
const warn = (rule, msg, t) => findings.push({ sev: SEV_WARN, rule, msg, t });
const fail = (rule, msg, t) => findings.push({ sev: SEV_ERROR, rule, msg, t });

const [CW, CH] = sceneTiming(d).canvas;

const s0 = (l) => l.start ?? 0;
const s1 = (l) => s0(l) + (l.duration ?? 0);
const overlaps = (l, a, b) => s0(l) < b && s1(l) > a;

// ---- cluster layers into beats by start-time gaps ----
const starts = [...new Set(layers.map(s0))].sort((a, b) => a - b);
const beats = [];
let cur = null;
for (const t of starts) {
  if (!cur || t - cur.end > 1.4) { cur = { start: t, end: t }; beats.push(cur); }
  cur.end = Math.max(cur.end, t);
}

const PLACEHOLDER = new Set(['scene', 'rendered', 'output', 'preview', 'demo', 'result', 'example', 'content']);
const CLAIM = /\b(\d+)\s+(shader|shaders|cut|cuts|backdrop|backdrops|preset|presets|theme|themes|transition|transitions|effect|effects)\b/i;
const LOW_LEGIBILITY_STINGS = new Set(['blinds']);

// ---- 1. placeholder-word: a big text that is JUST a filler noun ----
for (const l of layers) {
  if (l.type !== 'text' || !l.text) continue;
  const w = onScreenText(l.text).toLowerCase();
  if (PLACEHOLDER.has(w) && (l.size ?? 0) >= 48) {
    fail('placeholder-word', `"${snippet(l.text, 40)}" (${l.size}px) is a filler label, not a real artifact. Render the actual thing (a live mini-scene), not the word.`, s0(l));
  }
}

// ---- 2. unbacked-claim: "N <things>" copy where the N things aren't visibly demonstrated ----
for (const l of layers) {
  if (l.type !== 'text' || !l.text) continue;
  // MATCHED ON THE STRIPPED COPY. CLAIM wants digits then whitespace, and `<b>245</b> effects` puts a
  // `<` after the digits, so a film that emphasised its own number escaped this check entirely.
  const m = onScreenText(l.text).match(CLAIM);
  if (m) {
    const noun = m[2].toLowerCase();
    const shaderish = /shader/.test(noun);
    const hasShaderLayer = layers.some((x) => x.type === 'shader');
    if (shaderish && !hasShaderLayer) {
      fail('false-claim', `"${snippet(l.text, 40)}" claims ${m[1]} ${noun} but the scene has NO shader layers. Remove the claim or add the effect.`, s0(l));
    } else {
      warn('unbacked-claim', `"${snippet(l.text, 40)}": a count claim ("${m[1]} ${noun}"). Verify the ${noun} are actually shown in this beat, or cut the number.`, s0(l));
    }
  }
}

// ---- 3. static-list: a group of ≥4 text-only kids with no per-kid animation, held >2s ----
for (const l of layers) {
  if (l.type !== 'group' || !l.children) continue;
  const txt = l.children.filter((c) => c.type === 'text');
  if (txt.length >= 4 && txt.every((c) => !c.split && !c.preset) && (l.duration ?? 0) > 2 && !l.stagger) {
    warn('static-list', `a ${txt.length}-item text group held ${(l.duration).toFixed(1)}s with no live motion. A list reads as a spec sheet; animate the concept (reveal/pass/count).`, s0(l));
  }
}

// ---- 4. illegible transition ----
for (const s of d.stings || []) {
  if (LOW_LEGIBILITY_STINGS.has(s.fx)) warn('illegible-effect', `sting "${s.fx}" @${s.t}s is hard to perceive at cut scale. Replace with a legible one (wipe/iris/push).`, s.t);
}

// ---- 5. lonely beat: a beat whose ONLY sizable content is a single centered text >3s ----
for (const b of beats) {
  const span = (b.end + 3) - b.start;
  if (span < 3) continue;
  const content = layers.filter((l) => (l.track ?? 9) > 2 && overlaps(l, b.start, b.end + 0.5) && (l.type !== 'text' || (l.size ?? 0) >= 30));
  const artifacts = content.filter((l) => l.type !== 'text' || (l.children && l.children.length));
  const texts = content.filter((l) => l.type === 'text');
  if (texts.length && artifacts.length === 0 && content.length <= 2) {
    warn('lonely-beat', `beat @${b.start.toFixed(1)}s is text-only with no artifact. What does the viewer LOSE if cut? give it a demo/proof or fold it into a neighbour.`, b.start);
  }
}

// ---- 6. thin-beat: a content beat held >3s with <3 sizable elements = a slide, not a shot ----
//        (density doctrine, see engine-doctrine/CRAFT/DENSITY.md). First & last beat exempt (hook / end card).
beats.forEach((b, bi) => {
  if (bi === 0 || bi === beats.length - 1) return;
  const span = (b.end + 3) - b.start;
  if (span < 3) return;
  const content = layers.filter((l) => (l.track ?? 9) > 2 && overlaps(l, b.start, b.end + 0.3)
    && (l.type !== 'text' || (l.size ?? 0) >= 24));
  if (content.length && content.length < 3) {
    warn('thin-beat', `beat @${b.start.toFixed(1)}s has only ${content.length} sizable element(s) over ${span.toFixed(1)}s. Reads as a slide. Add support (a demo/stat/chart) + metadata (a dim readout). See engine-doctrine/CRAFT/DENSITY.md.`, b.start);
  }
});

// ---- 7. mis-centre tell: a big text with a WIDE box but no `align` left-aligns inside it (looks off-
//        centre). If you gave it `w` to centre it, set align:"center". (engine-doctrine/MISTAKES.md #15.) ----
for (const l of layers) {
  if (l.type && l.type !== 'text') continue;
  if (!l.text || l.split) continue;
  if ((l.size ?? 0) >= 40 && (l.w ?? 0) >= 600 && !l.align) {
    warn('mis-centre', `"${snippet(l.text, 28)}" (${l.size}px, w:${l.w}) has a wide box but no "align". Text left-aligns inside it and reads off-centre. Set align:"center"/"right", or use pin. See engine-doctrine/MISTAKES.md #15.`, s0(l));
  }
}

// ---- 8. scattered-beat: a beat crammed with too many top-level content elements has no clear focal
//        (the "make judge" beat-4 class). Rough static proxy for the vision "no hierarchy" finding. ----
//
// COUNTED AGAINST THE FRAME THE CAMERA IS IN, not the canvas box at the origin. A film whose transition IS
// the camera lays its beats out at stations across a canvas much larger than the frame, so "alive in this
// window" and "on screen together" are different sets. linear-journey (five stations on 5760x2160, zero
// cuts) reported 10 and 11 elements at 14.5s and 19.7s by summing the station arriving with the one still
// fading out two stations away; the eye sees one station and about five things. Both findings were false.
// No camera, or a camera rotated at this instant, and cameraView returns null, then this is the old count.
//
// THE STAGE MUST BE FLAT for any of this to mean anything, and the camera's own angles are only half of
// that test. A top-level `tilt` or `plane` modifier builds the same 3D rig with no camera angle at all.
// Both halves, and the reason, now live in `sceneView` (quality/gates/scene-timing.mjs), because
// beat-check became a second consumer and a rule split across two files gets remembered by half.
for (const b of beats) {
  // the camera at the instant the finding NAMES. A beat's own start is when the viewer is looking at
  // whatever this beat is about to interrupt, which is exactly the frame the count claims is crammed.
  const view = sceneView(d, b.start, CW, CH);
  const content = layers.filter((l) => (l.track ?? 9) > 2 && l.x != null && l.y != null
    && overlaps(l, b.start, b.end + 0.3) && (l.type !== 'text' || (l.size ?? 0) >= 18)
    && inView(l, view));
  if (content.length >= 8) {
    warn('scattered-beat', `beat @${b.start.toFixed(1)}s packs ${content.length} top-level elements. Likely no clear focal (the eye can't land). Cut to a hero + 1-2 supports; run make judge to confirm.`, b.start);
  }
}

// ---- 9. typing-cutoff: a typed line must finish AND hold a beat before the layer exits, or the cut
//        lands mid-type. type-time = chars / cps (typing:true = 24/s); it must fit inside `duration`
//        with a ~0.4s hold. The engine types halfway and cuts in silence otherwise (engine-doctrine/MISTAKES.md).
// MIN_TYPE_HOLD: Netflix's Timed Text Style Guide sets 0.833s (20 frames@24fps, read-check.mjs's cited
// MIN_LIFE) as the floor for one readable text EVENT to register; ours is roughly half that. Not
// aligned, on purpose: a typed line's post-type hold asks the eye to register the line is DONE, not to
// read it again from nothing the way a fresh subtitle event does, so the two floors answer related but
// different questions. engine-doctrine/RESEARCH/TIMING-SOURCES.md part 3/6.
const MIN_TYPE_HOLD = 0.4;
for (const l of layers) {
  if (!l.typing || l.type !== 'text') continue;
  const cps = l.typing === true ? 24 : +l.typing;
  if (!(cps > 0)) continue;
  // glyphText: this predicts typing TIME, so it must count the characters the caret walks past,
  // which is core/layers/text.js stripLen(), i.e. DOM textContent, where a `<br>` costs nothing.
  const chars = glyphText(l.text).length;
  const typeTime = chars / cps;
  const dur = l.duration ?? 0;
  if (typeTime + MIN_TYPE_HOLD > dur + 1e-6) {
    warn('typing-cutoff', `"${snippet(l.text, 32)}" types for ${typeTime.toFixed(2)}s (${chars} chars / ${cps}per s) but its beat is only ${dur.toFixed(2)}s. It cannot finish and hold before the cut. Extend duration to >= ${(typeTime + MIN_TYPE_HOLD).toFixed(1)}s or raise the typing speed.`, s0(l));
  }
}

// ---- 9b. fake-typing: a typewriter effect built the WRONG way, on an `html` fragment instead of a
// `text` layer's real `typing`. Two tells, either one is enough to name the fix:
//   (a) a `parts` entry whose selector names the typing slot (type/typing/prompt/command) and reveals
//       it PER WORD (`each`/`stagger`), which is a stagger-fade, not a character-by-character reveal;
//   (b) a literal caret glyph (`|`/`▏`) sitting as its own text node right after the typed copy, which
//       never blinks and never tracks where the "typing" actually stopped (engine-doctrine/CRAFT/KEYED-MOTION.md).
// Both are report-only (engine-doctrine/SAFEGUARDS.md): a hand-tuned fragment may have a reason, so this names the
// swap rather than blocking the render.
const TYPING_WORD_RE = /\b(type|typing|prompt|command)\w*/i;
const CARET_GLYPH_RE = />[^<>]*[|▏]\s*<(?!\/?(?:span|b|em|strong|i)\b)/;
function fragmentMarkup(l) {
  if (typeof l.html === 'string') return l.html;
  if (typeof l.src === 'string') {
    try { return fs.readFileSync(path.join(REPO_ROOT, l.src), 'utf8'); } catch { return null; }
  }
  return null;
}
for (const l of layers) {
  if (l.type !== 'html') continue;
  const who = l.id ? `"${l.id}"` : `html layer @${s0(l).toFixed(1)}s`;
  const fakeWordPart = (Array.isArray(l.parts) ? l.parts : []).find((p) => p && typeof p.select === 'string'
    && (p.each != null || p.stagger != null) && (TYPING_WORD_RE.test(p.select) || TYPING_WORD_RE.test(l.id || '')));
  if (fakeWordPart) {
    warn('fake-typing', `${who}'s part "${fakeWordPart.select}" fakes typing by fading words in one at a time (${fakeWordPart.anim || 'its anim'}, each/stagger). Put a \`text\` layer with \`typing\` + \`caret\` over that slot instead: it reveals per CHARACTER and gives the camera a real caret to follow. Riding a tilted or moving surface? Nest both as children of a \`group\` that carries the motion, not two layers kept in sync by hand.`, s0(l));
    continue; // one finding names the fix; the glyph check below would be redundant noise on the same layer
  }
  const markup = fragmentMarkup(l);
  if (markup && CARET_GLYPH_RE.test(markup)) {
    warn('fake-typing', `${who} draws a literal "|"/"▏" caret glyph next to typed text. That glyph never blinks and never moves with a real reveal. Put a \`text\` layer with \`typing\` + \`caret\` over that slot instead, nested as a \`group\` child if it must ride the same tilt or motion as the html around it.`, s0(l));
  }
}

// ---- 9b2. copied-plane: several layers sharing one tilted plane belong under a `group` that carries
// the tilt (core/fx/tilt.js:39-46, `plane` refuses a group child in core/fx/plane.js, engine-doctrine/PRIMITIVES.md
// :556-584, engine-doctrine/CRAFT/KEYED-MOTION.md 5b "Rides a tilted or moving surface"). Nothing notices when an
// author does it by hand instead: copy one layer's rotX/rotY keys onto another top-level layer, then
// push its `ox`/`oy` pivot far outside its own box to fake a shared centre. `layers` here is already
// top-level only (expandScene keeps a group's children nested under it, never flattened in), so a real
// group child never reaches this loop and stays quiet by construction; a single tilted layer with a
// normal pivot has nothing to pair against and also stays quiet.
const TILT_TOL = 0.05, TILT_TIME_TOL = 0.05;
function tiltKeys(l) {
  if (!Array.isArray(l.motion)) return [];
  return l.motion.filter((k) => k && (k.rotX || k.rotY))
    .map((k) => ({ t: s0(l) + (k.t ?? 0), rotX: k.rotX ?? 0, rotY: k.rotY ?? 0 }));
}
const tiltedLayers = layers.map((l) => ({ l, keys: tiltKeys(l) })).filter((e) => e.keys.length);
const copiedPlaneReported = new Set();
for (let i = 0; i < tiltedLayers.length; i++) {
  for (let j = i + 1; j < tiltedLayers.length; j++) {
    const a = tiltedLayers[i], b = tiltedLayers[j];
    if (!overlaps(a.l, s0(b.l), s1(b.l))) continue;
    const shares = a.keys.some((ka) => b.keys.some((kb) => Math.abs(ka.t - kb.t) <= TILT_TIME_TOL
      && Math.abs(ka.rotX - kb.rotX) <= TILT_TOL && Math.abs(ka.rotY - kb.rotY) <= TILT_TOL));
    if (!shares) continue;
    const nameOf = (x) => x.id ? `"${x.id}"` : `layer @${s0(x).toFixed(1)}s`;
    const key = [a.l, b.l].map(nameOf).sort().join('|');
    if (copiedPlaneReported.has(key)) continue;
    copiedPlaneReported.add(key);
    warn('copied-plane', `${nameOf(a.l)} and ${nameOf(b.l)} carry the same rotX/rotY keys at the same times: a tilted plane copied by hand instead of shared. Nest both as \`children\` of one \`group\` ("layout": "free" keeps their exact x/y) and put the motion on the group instead (engine-doctrine/CRAFT/KEYED-MOTION.md 5b).`, Math.min(s0(a.l), s0(b.l)));
  }
}
for (const l of layers) {
  if (!Array.isArray(l.motion)) continue;
  const badKey = l.motion.find((k) => k && ((k.ox != null && (k.ox < -10 || k.ox > 110)) || (k.oy != null && (k.oy < -10 || k.oy > 110))));
  if (!badKey) continue;
  const who = l.id ? `"${l.id}"` : `layer @${s0(l).toFixed(1)}s`;
  warn('copied-plane', `${who}'s motion pivot (ox ${badKey.ox ?? 50}, oy ${badKey.oy ?? 50}) sits far outside its own 0-100% box: a pivot pushed off-box by hand to borrow another layer's centre. Nest it as a \`group\` child instead and put the motion on the group (engine-doctrine/CRAFT/KEYED-MOTION.md 5b).`, s0(l));
}

// ---- 9c. typing-camera-still: a real typing line the camera never leans into. The owner's complaint
// this whole cluster answers: type without a push reads as a static caption, not a live terminal. Fires
// when the camera is neither scaled in (s >= 1.15, an arbitrary but named "clearly pushed in" floor)
// NOR moving toward the line during the typing window (start -> when the caret reaches the end).
// No published source sets a camera push scale or pan-pixel floor (camera dramaturgy has no numeric
// literature: engine-doctrine/RESEARCH/TIMING-SOURCES.md part 4/6). This already reports as a WARN, not
// a FAIL (see below), so the missing citation is recorded here rather than used to change severity.
const CAMERA_PUSH_S = 1.15, CAMERA_MOVE_PX = 4;
if (Array.isArray(d.camera) && d.camera.length) {
  for (const l of layers) {
    if (!l.typing || l.type !== 'text') continue;
    const cps = l.typing === true ? 24 : +l.typing;
    if (!(cps > 0)) continue;
    const chars = glyphText(l.text).length;
    const start = s0(l);
    const end = start + Math.min(chars / cps, l.duration ?? chars / cps);
    if (end <= start) continue;
    const poseStart = cameraAt(d.camera, start), poseEnd = cameraAt(d.camera, end);
    const pushedIn = poseStart.s >= CAMERA_PUSH_S || poseEnd.s >= CAMERA_PUSH_S;
    const tracking = Math.hypot(poseEnd.x - poseStart.x, poseEnd.y - poseStart.y) >= CAMERA_MOVE_PX;
    if (!pushedIn && !tracking) {
      const idSel = l.id ? `#${l.id}` : '<give this layer an id>';
      warn('typing-camera-still', `"${snippet(l.text, 32)}" types for ${(end - start).toFixed(2)}s at a still camera (s~${poseStart.s.toFixed(2)}, no pan). Give the travel leg a station {"caret": "${idSel}"} to push in as typing starts and pan to the caret's end (core/engine/produce.js resolveCaretStations).`, start);
    }
  }
}

// ---- 10. transition-dip: the stage must never go EMPTY between beats. If the outgoing beat fully
//        exits before the next enters, the cut is a jump-cut-with-a-dip. The transition should BE the
//        exit: overlap outgoing + incoming. We merge every
//        content layer's [start, end] interval and flag any blank gap in the middle. Persistent marks
//        (a watermark spanning most of the film) and tiny captions are excluded so they can't mask a dip.
const sceneDur = d.duration ?? 0;
// The persistence exclusion is aimed at a WATERMARK, and it was written as "spans most of the film",
// which also excluded the one thing the continuity doctrine demands: a subject that survives the cuts.
// A film built on a continuous object was told its stage was empty at the very junction its spine was
// carrying. So a spanning layer is still content when it is big enough to BE the subject: 8% of the
// canvas, which is where a mark stops being a mark and starts being a picture.
// A full-bleed slab or a scrim also spans the film, and letting THAT count would hand every scene a way
// to hide a dip behind wallpaper. So the exemption needs both halves: the layer must DEPICT something
// (the shared PICTORIAL vocabulary, which excludes `rect` for exactly this reason) and be large.
// And it must not fill the frame. A full-bleed plate held for the whole film is a BACKDROP wearing a
// layer's clothes (a gradient image, a paint field), and the two scenes in this library that do it are
// both exactly that. A beat's subject sits IN the frame; it is not the frame.
//
// This share is deliberately CANVAS-relative while scattered-beat's is camera-relative, because the two ask
// different questions. Scattered-beat asks about one named instant, which is a frame the camera is in.
// This asks whether a layer spanning most of the film is ever the subject, a question about the film, with
// no single instant to hand cameraView, and a layer at a station is large in frame only while the camera is
// there. Sampling one arbitrary time would swap one wrong number for another, and it could split one
// transition-dip warning into two, which is a gate inventing findings. Measured across the library: exactly
// one scene (playhead) has a travelling camera AND a spanning pictorial layer, and its box is `unknown`, so
// both answers are 0 today. If that stops being true, the missing primitive is "was it ever large in frame",
// not a guess at which frame counts.
const carries = (l) => {
  if (!(PICTORIAL.has(l.type) || (l.type === 'html' && htmlGraphic(l.html)))) return false;
  const { share } = canvasShare(l, CW, CH);
  return share >= 0.08 && share < 0.9;
};
const contentIv = layers
  .filter((l) => (l.track ?? 9) > 2 && (l.duration ?? 0) > 0
    && ((l.duration ?? 0) < sceneDur * 0.6 || carries(l))
    && (l.type !== 'text' || (l.size ?? 0) >= 22))
  .map((l) => [s0(l), s0(l) + l.duration])
  .sort((a, b) => a[0] - b[0]);
if (contentIv.length > 1) {
  let covEnd = contentIv[0][1];
  for (let i = 1; i < contentIv.length; i++) {
    const gap = contentIv[i][0] - covEnd;
    if (gap > 0.12) {
      warn('transition-dip', `the stage is EMPTY from ${covEnd.toFixed(1)}s to ${contentIv[i][0].toFixed(1)}s (${gap.toFixed(1)}s of blank). The outgoing beat fully exits before the next enters (a jump-cut with a dip). Overlap them: start the next beat during this one's exit, so the transition IS the exit.`, covEnd);
    }
    covEnd = Math.max(covEnd, contentIv[i][1]);
  }
}

// ---- report ----
findings.sort((a, b) => a.t - b.t);
const errs = findings.filter((r) => r.sev === 'error');
console.log(`\n  critique · ${file} · ${beats.length} beats · ${findings.length} findings (${errs.length} errors)\n`);

const gf = gateFindings({ line: (r) => `  ${r.severity === 'error' ? '✗' : '⚠'} [${r.code}] @${r.at}\n      ${r.summary}` });
for (const r of findings) {
  // critique's own tiers (error/warn) map straight onto the house ones; `at` carries the beat time
  // the original tag printed, formatted the same way (one decimal, trailing "s").
  (r.sev === 'error' ? gf.fail : gf.warn)(r.rule, r.msg, { at: `${r.t.toFixed(1)}s` });
}
if (!findings.length) console.log('  ✓ no value-gate violations, every beat carries an artifact.\n');
gf.emit();
if (findings.length) console.log('');
// --strict escalates a warn-only run to blocking, same as before: the value gate has no hard/soft
// split of its own, `--strict` is what turns "noted" into "refused".
process.exit((errs.length || (strict && findings.length)) ? 1 : 0);
