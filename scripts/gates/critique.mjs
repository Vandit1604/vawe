// scripts/gates/critique.mjs: the VALUE GATE. Static critic over a scene JSON that fires on the failure
// modes a human otherwise catches per-scene: placeholder words, unbacked claims, static lists,
// illegible transitions, lonely low-value beats. Not taste-complete, but it makes the recurring
// mistakes un-shippable. Run: node scripts/gates/critique.mjs <scene.json> [--strict]
//
// Modeled on another engine' per-frame red-flags + our docs/skill "every frame fights for its value".
import fs from 'node:fs';
import { canvasShare, sceneTiming, boxOf, sceneView, inView, PICTORIAL, htmlGraphic } from './scene-timing.mjs';
import { onScreenText, glyphText, snippet } from '../lib/text.mjs';
import { lowerScene } from '../../core/transitions-lower.js';
import { gateFindings } from '../lib/findings.mjs';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node scripts/gates/critique.mjs <scene.json> [--strict]'); process.exit(2); }
// The unified `transitions` surface is SUGAR: the engine lowers it to cuts/seams/stings before it
// renders anything (core/transitions-lower.js), and until this line the gates did not, so a scene
// that declared its boundaries the documented way was read as a film with no boundaries at all.
// Lowering here is idempotent and a no-op for a scene that already writes raw `cuts`. MISTAKES #380.
const d = lowerScene(JSON.parse(fs.readFileSync(file, 'utf8')));
const layers = d.layers || [];
const findings = [];
const F = (sev, rule, msg, t) => findings.push({ sev, rule, msg, t });

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
    F('error', 'placeholder-word', `"${snippet(l.text, 40)}" (${l.size}px) is a filler label, not a real artifact. Render the actual thing (a live mini-scene), not the word.`, s0(l));
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
      F('error', 'false-claim', `"${snippet(l.text, 40)}" claims ${m[1]} ${noun} but the scene has NO shader layers. Remove the claim or add the effect.`, s0(l));
    } else {
      F('warn', 'unbacked-claim', `"${snippet(l.text, 40)}": a count claim ("${m[1]} ${noun}"). Verify the ${noun} are actually shown in this beat, or cut the number.`, s0(l));
    }
  }
}

// ---- 3. static-list: a group of ≥4 text-only kids with no per-kid animation, held >2s ----
for (const l of layers) {
  if (l.type !== 'group' || !l.children) continue;
  const txt = l.children.filter((c) => c.type === 'text');
  if (txt.length >= 4 && txt.every((c) => !c.split && !c.preset) && (l.duration ?? 0) > 2 && !l.stagger) {
    F('warn', 'static-list', `a ${txt.length}-item text group held ${(l.duration).toFixed(1)}s with no live motion. A list reads as a spec sheet; animate the concept (reveal/pass/count).`, s0(l));
  }
}

// ---- 4. illegible transition ----
for (const s of d.stings || []) {
  if (LOW_LEGIBILITY_STINGS.has(s.fx)) F('warn', 'illegible-effect', `sting "${s.fx}" @${s.t}s is hard to perceive at cut scale. Replace with a legible one (wipe/iris/push).`, s.t);
}

// ---- 5. lonely beat: a beat whose ONLY sizable content is a single centered text >3s ----
for (const b of beats) {
  const span = (b.end + 3) - b.start;
  if (span < 3) continue;
  const content = layers.filter((l) => (l.track ?? 9) > 2 && overlaps(l, b.start, b.end + 0.5) && (l.type !== 'text' || (l.size ?? 0) >= 30));
  const artifacts = content.filter((l) => l.type !== 'text' || (l.children && l.children.length));
  const texts = content.filter((l) => l.type === 'text');
  if (texts.length && artifacts.length === 0 && content.length <= 2) {
    F('warn', 'lonely-beat', `beat @${b.start.toFixed(1)}s is text-only with no artifact. What does the viewer LOSE if cut? give it a demo/proof or fold it into a neighbour.`, b.start);
  }
}

// ---- 6. thin-beat: a content beat held >3s with <3 sizable elements = a slide, not a shot ----
//        (density doctrine, see docs/CRAFT/DENSITY.md). First & last beat exempt (hook / end card).
beats.forEach((b, bi) => {
  if (bi === 0 || bi === beats.length - 1) return;
  const span = (b.end + 3) - b.start;
  if (span < 3) return;
  const content = layers.filter((l) => (l.track ?? 9) > 2 && overlaps(l, b.start, b.end + 0.3)
    && (l.type !== 'text' || (l.size ?? 0) >= 24));
  if (content.length && content.length < 3) {
    F('warn', 'thin-beat', `beat @${b.start.toFixed(1)}s has only ${content.length} sizable element(s) over ${span.toFixed(1)}s. Reads as a slide. Add support (a demo/stat/chart) + metadata (a dim readout). See docs/CRAFT/DENSITY.md.`, b.start);
  }
});

// ---- 7. mis-centre tell: a big text with a WIDE box but no `align` left-aligns inside it (looks off-
//        centre). If you gave it `w` to centre it, set align:"center". (docs/MISTAKES.md #15.) ----
for (const l of layers) {
  if (l.type && l.type !== 'text') continue;
  if (!l.text || l.split) continue;
  if ((l.size ?? 0) >= 40 && (l.w ?? 0) >= 600 && !l.align) {
    F('warn', 'mis-centre', `"${snippet(l.text, 28)}" (${l.size}px, w:${l.w}) has a wide box but no "align". Text left-aligns inside it and reads off-centre. Set align:"center"/"right", or use pin. See docs/MISTAKES.md #15.`, s0(l));
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
// Both halves, and the reason, now live in `sceneView` (scripts/gates/scene-timing.mjs), because
// beat-check became a second consumer and a rule split across two files gets remembered by half.
for (const b of beats) {
  // the camera at the instant the finding NAMES. A beat's own start is when the viewer is looking at
  // whatever this beat is about to interrupt, which is exactly the frame the count claims is crammed.
  const view = sceneView(d, b.start, CW, CH);
  const content = layers.filter((l) => (l.track ?? 9) > 2 && l.x != null && l.y != null
    && overlaps(l, b.start, b.end + 0.3) && (l.type !== 'text' || (l.size ?? 0) >= 18)
    && inView(l, view));
  if (content.length >= 8) {
    F('warn', 'scattered-beat', `beat @${b.start.toFixed(1)}s packs ${content.length} top-level elements. Likely no clear focal (the eye can't land). Cut to a hero + 1-2 supports; run make judge to confirm.`, b.start);
  }
}

// ---- 9. typing-cutoff: a typed line must finish AND hold a beat before the layer exits, or the cut
//        lands mid-type. type-time = chars / cps (typing:true = 24/s); it must fit inside `duration`
//        with a ~0.4s hold. The engine types halfway and cuts in silence otherwise (docs/MISTAKES.md).
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
    F('warn', 'typing-cutoff', `"${snippet(l.text, 32)}" types for ${typeTime.toFixed(2)}s (${chars} chars / ${cps}per s) but its beat is only ${dur.toFixed(2)}s. It cannot finish and hold before the cut. Extend duration to >= ${(typeTime + MIN_TYPE_HOLD).toFixed(1)}s or raise the typing speed.`, s0(l));
  }
}

// ---- 10. transition-dip: the stage must never go EMPTY between beats. If the outgoing beat fully
//        exits before the next enters, the cut is a jump-cut-with-a-dip (both another engine and another engine
//        ban it. The transition should BE the exit: overlap outgoing + incoming). We merge every
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
      F('warn', 'transition-dip', `the stage is EMPTY from ${covEnd.toFixed(1)}s to ${contentIv[i][0].toFixed(1)}s (${gap.toFixed(1)}s of blank). The outgoing beat fully exits before the next enters (a jump-cut with a dip). Overlap them: start the next beat during this one's exit, so the transition IS the exit.`, covEnd);
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
