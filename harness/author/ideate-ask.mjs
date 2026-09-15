// harness/author/ideate-ask.mjs: THE DETAIL BRIEF for `make ideate`, asked once the acts are known.
//
//   node harness/author/ideate-ask.mjs --ask --ref example-madera            (REF acts, from the study)
//   node harness/author/ideate-ask.mjs --ask --name <film> --idea "..."       (IDEA acts, from ideate.mjs)
//   node harness/author/ideate-ask.mjs --apply --prompt <file> --answers <file.json>
//   node harness/author/ideate-ask.mjs --self-test
//   make ideate REF=<ref> ASK=1   ·   make ideate ... ANSWERS=<file.json>
//
// WHY THIS EXISTS. The owner, by hand, gave the kind of detail a good plan needs before any frame is
// drawn: what fills the frame, where the product lives, how text arrives, which cursor, how an act
// hands off, what the ground does. `harness/author/ideate.mjs` never asked for any of it: REF mode
// writes `<look:>` placeholders (nothing to ask, the frame is unmeasured) and IDEA mode writes bare
// `<fill:>` lines. This module is the second half of the SAME contract `quiz.mjs` already proved for
// the brief (stage 1): emit an AskUserQuestion payload built from real registries, refuse to invent
// prose options, and apply the answers back into the artefact `make ideate` already writes.
//
// ONE RULE ABOVE ALL: an option is never hand-written prose. It traces to a registry (`RECIPES`,
// `core/kinetic/presets.js`, `core/camera-moves`, `core/transitions/catalog.js`, `screen.mjs`'s
// `KINDS`) or to the grammar (`shots[].content`, a joint's measured axis). Where no registry answers a
// question, the question is DROPPED, never answered with an invented option (`selfTest` below checks
// this the same way quiz.mjs's self-test checks its own options).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RECIPES } from '../../recipes/index.mjs';
import { PRESETS } from '../../core/kinetic/presets.js';
import { CAMERA_MOVE_BLURBS } from '../../core/camera-moves/index.js';
import { TRANSITIONS } from '../../core/transitions/catalog.js';
import { KINDS } from './screen.mjs';
import { buildActs, buildJoints, fracWords } from './ideate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── film-level questions (batch 0) ─────────────────────────────────────────────────────────────────

// WHERE THE PRODUCT LIVES. No registry names a "chrome" for any of these (no core/layers/*.js builds a
// terminal, browser or phone frame): the closest named route is a `make screen` KIND, so each option
// says that plainly rather than pretending a frame type exists. "none" needs no route at all.
const KIND_BY_SURFACE = { editor: KINDS.includes('editor') ? 'editor' : null, dashboard: KINDS.includes('dashboard') ? 'dashboard' : null, card: KINDS.includes('card') ? 'card' : null };
export function whereProductLives() {
  return [
    { key: 'terminal', label: 'A terminal', description: `Closest route is \`make screen KIND=${KIND_BY_SURFACE.editor}\`: a typed prompt as the one focal element, dark ground, mono type (screen.mjs BODIES.editor). No core layer draws terminal chrome itself; the window is hand-authored HTML.` },
    { key: 'app', label: 'An app window', description: `Closest route is \`make screen KIND=${KIND_BY_SURFACE.dashboard}\` or KIND=${KIND_BY_SURFACE.card}: a real desktop surface, stats or a single focal card. No core layer draws a titlebar; not supported as a named capability, hand-author the chrome.` },
    { key: 'other-frame', label: 'A browser or a phone', description: 'Not supported yet as a named capability: no `make screen` KIND and no core layer draws browser or phone chrome. A phone feed reformats the canvas to a vertical destination (AGENTS.md 9:16/4:5); either chrome is hand-authored HTML (engine-doctrine/CRAFT/HTML-FRAGMENTS.md).' },
    { key: 'none', label: 'No product surface', description: 'No screen at all this film: type sits directly on the ground, nothing to design or capture.' },
  ];
}

// HOW TEXT ARRIVES. Every option is a real recipe or kinetic preset name, never an invented style word.
export function howTextArrives() {
  const wbw = RECIPES['word-by-word'];
  return [
    { key: 'caret', label: 'Typed, with a caret', description: 'core/layers/text.js: `typing:true` reveals the line char by char with a blinking caret (▏); `caret:false` turns it off, `caretHold` holds it once the line is done.' },
    { key: 'word-color', label: 'Word by word, per-word colour', description: wbw
      ? `recipe \`word-by-word\` (${wbw.blurb}). Its \`colors\` slot names one hex per word, but no named core capability holds more than one distinct SETTLED colour per line today (core/kinetic/presets.js \`colorWave\` sweeps a single accent through the words, it does not hold N resting colours): passing more than one colour throws, naming the gap rather than faking it.`
      : 'no `word-by-word` recipe is promoted; drop this option.' },
    { key: 'kinetic', label: 'A kinetic preset', description: `Two real presets: \`up\` (${PRESETS.up.blurb}) and \`decode\` (${PRESETS.decode.blurb}). Full list: \`make arsenal Q="kinetic presets"\`.` },
    { key: 'masked', label: 'Masked reveal', description: `\`riseClip\` (${PRESETS.riseClip.blurb}), core/kinetic/presets.js.` },
  ];
}

// GROUND, once per film: a strategy, not a colour. "chained from previous" is the flow-seam recipe's
// own ground slot, so it is a rule applied at every joint, not a value re-asked per act.
export function groundStrategy() {
  const seam = RECIPES['flow-seam'];
  return [
    { key: 'theme', label: 'The theme\'s ground', description: 'core/backgrounds/presets.js: the theme\'s own default field/preset, unchanged act to act unless a joint says otherwise.' },
    { key: 'content', label: 'Colour taken from the content', description: 'The ground accent is pulled from what is on screen (a captured shot\'s dominant colour, or a photo\'s), the way `grammar/<ref>.json`\'s `shots[].accent` already measures it off a reference.' },
    { key: 'chained', label: 'Chained from the previous scene', description: seam
      ? `recipe \`flow-seam\`'s own \`ground\` slot (${seam.slots.ground}): the outgoing ground IS the incoming ground, so the two acts never disagree at the cut.`
      : 'no seam recipe is promoted; drop this option.' },
  ];
}

// ATTENTION, film-wide. The owner's own framing: every device (per-word colour, a camera push, a
// cursor, contrast, size, a blur-to-sharp focus pull) exists to point the eye somewhere, and the plan
// has to say where across the WHOLE film, not just inside one beat. Each option traces to a real
// mechanism the film can already declare, never an invented strategy.
export function attentionOptions() {
  return [
    { key: 'cause-chain', label: 'One cause chases the next', description: 'Each beat is caused by the one before (`trigger:`, engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md): the eye follows the causal chain start to finish, the cursor causes the type, the type causes the send, the send causes the cut.' },
    { key: 'object-carries', label: 'A continuous object carries it', description: 'The film declares `object:`/`object_in`/`object_out` (harness/lib/contract.mjs): the eye follows one thing across every cut because it never truly leaves the frame.' },
    { key: 'color-carries', label: 'Colour carries it act to act', description: '`ground: colour taken from the content`: the ground re-tints to whatever is on screen, so the eye is pulled toward whatever just changed it.' },
  ];
}

export function filmLevelBatch() {
  return {
    label: 'film',
    questions: [
      { header: 'Lives in', question: 'Where does the product live on screen?', options: whereProductLives() },
      { header: 'Text', question: 'How does text arrive, film-wide (an act can still override it)?', options: howTextArrives() },
      { header: 'Ground', question: 'What decides the ground colour act to act?', options: groundStrategy() },
      { header: 'Attention', question: 'Across the whole film, what carries the eye from beat to beat?', options: attentionOptions() },
    ],
  };
}

// ── per-act questions (one batch each) ─────────────────────────────────────────────────────────────

// WHAT FILLS THE FRAME. The reference's own measured content line (shots[].content, when this is a
// REF act) rides in the description so the option is judged against how full the reference actually is.
export function contentLine(act) {
  const c = act && act.content;
  if (!c) return null;
  const material = c.photo >= 0.15 ? 'photographic' : c.detail >= 8 ? 'a detailed graphic' : 'plain UI';
  return `The reference fills ${fracWords(c.fill)} of this frame with ${material} (fill ${c.fill.toFixed(2)}, detail ${c.detail.toFixed(1)}, photo ${c.photo.toFixed(2)}).`;
}

export function frameOptions(act) {
  const measured = contentLine(act);
  const suffix = measured ? ` ${measured}` : ' No reference measurement here (IDEA mode): judged on its own.';
  return [
    { key: 'screen', label: 'A designed screen', description: `\`make screen F=<file> KIND=<${KINDS.join('|')}>\`, then \`make preview\`.${suffix}` },
    { key: 'capture', label: 'A real capture', description: `\`make capture\` (a live product surface) or \`make sections\` (a brand site's own sections), never a mock.${suffix}` },
    { key: 'photo', label: 'A real photo or film still', description: `A cutout or still (\`make cutout\`, engine-doctrine/CRAFT/IMAGERY.md); never a stock photo, never AI-generated, per AGENTS.md.${suffix}` },
    { key: 'type-only', label: 'Display type only', description: `No product surface in this frame, the words carry it alone.${suffix}` },
  ];
}

// CURSOR. core/layers/cursor.js draws exactly one pointer shape (a macOS arrow + click ripple); every
// other cursor question this film can ask resolves through core/layers/text.js's typing/caret props.
export function cursorOptions() {
  return [
    { key: 'pointer', label: 'A pointer, clicking', description: 'core/layers/cursor.js: a macOS arrow that follows `path` keyframes and fires a ripple ring at each `clicks` time. One shape only; a hand, an I-beam or any other pointer shape is not supported yet.' },
    { key: 'caret-blink', label: 'A typing caret, blinking', description: 'core/layers/text.js: `typing:true` with `caret` left on (the default), a blinking ▏ that trails the reveal.' },
    { key: 'caret-hard', label: 'A typewriter, no blinking', description: `core/kinetic/presets.js \`type\` preset (${PRESETS.type.blurb}): a hard on/off per unit, no caret glyph at all.` },
    { key: 'none', label: 'No cursor in this act', description: 'Nothing is clicked or typed here.' },
  ];
}

// HOW THE ACT LEAVES AND HANDS OFF. A joint's own measured axis is the base route (flow-seam); the
// other three are real alternates named from their own registries, never invented.
function namedTransition() {
  const seamBasic = TRANSITIONS.filter((t) => t.mechanism === 'seam' && t.basic);
  const push = seamBasic.find((t) => t.name === 'push');
  const wipe = seamBasic.find((t) => t.name === 'wipe');
  return { push, wipe };
}
export function handoffOptions(joint) {
  const seam = RECIPES['flow-seam'];
  const { push, wipe } = namedTransition();
  const axis = joint ? joint.axis : 'x';
  const travel = CAMERA_MOVE_BLURBS.travel;
  return [
    { key: 'flow-seam', label: `flow-seam, axis ${axis}`, description: seam
      ? `recipe \`flow-seam\` (${seam.blurb}). ${joint ? `Measured here: gap ${joint.gap}s, axis ${joint.axis}.` : 'Default axis x (x flows right to left, y flows bottom to top).'}`
      : 'no seam recipe is promoted; drop this option.' },
    { key: 'transition', label: `A named transition (${push ? push.name : wipe.name})`, description: `core/transitions/catalog.js, mechanism \`seam\`: \`${push ? push.name : 'push'}\` (one act pushes the other off) or \`${wipe ? wipe.name : 'wipe'}\` (one act reveals over the other), both in the BASIC set.` },
    { key: 'becomes', label: 'The object becomes the next', description: 'A storyboard `becomes:` line (engine-doctrine/CRAFT/FILM-STRUCTURE.md): "the X becomes the Y", the continuous-object handoff `contract.mjs` validates edge to edge. No cut at all, one thing turns into the next.' },
    { key: 'camera', label: 'Camera travels through', description: `camera move \`travel\` (${travel}), core/camera-moves: the camera itself is the transition, no cut.` },
  ];
}

// CAMERA. Named moves whose blurbs are read straight off core/camera-moves/index.js.
export function cameraOptions() {
  const pick = ['diveIn', 'panFollow', 'driftHold'];
  return pick.filter((k) => CAMERA_MOVE_BLURBS[k]).map((k) => ({ key: k, label: k, description: `core/camera-moves: ${CAMERA_MOVE_BLURBS[k]}.` }));
}

// EYE. Where does this act point attention, and which device does the pointing (the owner's own
// framing: a camera push doubles as an eye-directing device, so it lives here rather than in a
// separate question). Four options, the AskUserQuestion ceiling, so this REPLACES the old standalone
// "what does the camera do" question rather than sitting beside it; a camera push is still reachable,
// as this question's first option.
export function eyeOptions() {
  const wbw = RECIPES['word-by-word'];
  return [
    { key: 'camera', label: 'A camera push', description: `camera move \`diveIn\` (${CAMERA_MOVE_BLURBS.diveIn}), core/camera-moves: the push itself is the pull, no separate device needed.` },
    { key: 'word-color', label: 'Per-word colour walks the phrase', description: wbw
      ? `recipe \`word-by-word\` (${wbw.blurb}): each word takes the eye in reading order onto the key word.`
      : 'no word-by-word recipe is promoted; drop this option.' },
    { key: 'cursor', label: 'The cursor causes it', description: 'core/layers/cursor.js: a pointer that travels and clicks, the visible cause the eye follows to where it lands.' },
    { key: 'contrast-size', label: 'Contrast or size alone', description: 'No motion at all: the hero element is simply the biggest or highest-contrast thing in the frame, so the eye lands there unpulled.' },
  ];
}

export function actBatch(act, joint) {
  return {
    label: `act${act.i}`,
    questions: [
      { header: 'Frame', question: `Act ${act.i}: what fills the frame?`, options: frameOptions(act) },
      { header: 'Cursor', question: `Act ${act.i}: is anything clicked or typed here?`, options: cursorOptions() },
      { header: 'Hands off', question: `Act ${act.i}: how does it leave and hand off to the next?`, options: joint ? handoffOptions(joint) : [{ key: 'ends', label: 'The film ends here', description: 'No next joint: this is the last act.' }] },
      { header: 'Eye', question: `Act ${act.i}: where should the eye land, and what takes it there?`, options: eyeOptions() },
    ],
  };
}

// ── the payload ───────────────────────────────────────────────────────────────────────────────────

/** ask({ acts, joints }) → { context, batches }. `acts`/`joints` come from ideate.mjs's own
 * `buildActs`/`buildJoints` (REF mode, measured) or the same shape built from IDEA mode's placeholder
 * acts (no measurement, `contentLine` then returns null and the frame question says so). One batch per
 * act keeps every batch at or under AskUserQuestion's 4-question limit; the film batch is 3. */
export function ask({ acts, joints = [] }) {
  if (!acts || !acts.length) return { error: 'no-acts', message: 'ideate-ask needs at least one act. Run `make ideate` first.' };
  const batches = [filmLevelBatch(), ...acts.map((act, k) => actBatch(act, joints[k]))];
  return {
    context: { acts: acts.length, note: 'AskUserQuestion allows at most 4 questions per call: ask batches[0] first (film-level, 3 questions), then one batches[k] per act (4 questions each), in order. The user may answer "Other" on any question.' },
    batches: batches.map((b) => ({ label: b.label, questions: b.questions.map((q) => ({ ...q, options: q.options.map(({ label, description }) => ({ label, description })) })) })),
  };
}

// ── apply: answers → prompt lines ────────────────────────────────────────────────────────────────
//
// Each act's answers become a `frame:`/`cursor:` line (new) plus rewritten `enters:`/`leaves:`/`ground:`/
// `camera:` lines carrying the exact paste syntax (`recipe: ...`, `camera: ...`) named in ANSWER_LINES
// below, so the prompt stays valid for `--annotate` (ideate.mjs) and `make scaffold` afterwards. An
// existing line for the same label is REPLACED, never duplicated, the same rule ideate.mjs's own
// `addContentLines` already keeps for `content:`.

const FRAME_LINE = { screen: (o) => `frame: a designed screen (make screen KIND=${o.kind || KINDS[0]})`,
  capture: () => 'frame: a real capture (make capture / make sections)', photo: () => 'frame: a real photo or film still',
  'type-only': () => 'frame: display type only, no product surface' };
const CURSOR_LINE = { pointer: () => 'cursor: a pointer, clicking (core/layers/cursor.js)',
  'caret-blink': () => 'cursor: a typing caret, blinking (typing:true)', 'caret-hard': () => 'cursor: a typewriter, no blinking (preset:"type")',
  none: () => 'cursor: none' };
const HANDOFF_LINE = { 'flow-seam': (j) => `recipe: flow-seam out=act${j.outAct} in=act${j.inAct} axis=${j.axis}`,
  transition: (j, o) => `leaves: a named transition (${o.transitionName || 'push'}), core/transitions/catalog.js`,
  becomes: () => 'becomes: <fill: the X becomes the Y>', camera: () => 'camera: travels through (camera move: travel)' };
const GROUND_LINE = { theme: () => "ground: the theme's own default", content: () => 'ground: colour taken from the content on screen',
  chained: () => 'ground: chained from the previous scene (flow-seam ground slot)' };
// EYE: each answer names a device but leaves the start/land ends as `<fill:>`, the same convention
// every other still-undecided slot in this prompt already uses: the storyboard-check gate (contract.mjs
// parseEyeLine) refuses `<fill:` lines as unset rather than as a broken device, so a partially-answered
// eye line is a fine thing to scaffold and fine to fill in by hand afterwards.
const EYE_LINE = { camera: () => 'eye: <fill: where it starts> -> a camera push pulls it -> <fill: where it lands>',
  'word-color': () => 'eye: <fill: the first word> -> per-word colour flash walks the phrase -> <fill: the key word>',
  cursor: () => 'eye: <fill: where it starts> -> the cursor travels and causes it -> <fill: where it lands>',
  'contrast-size': () => 'eye: <fill: where it starts> -> contrast or size alone, unpulled -> <fill: where it lands>' };

// An ENTRY is a label line plus every hard-wrapped continuation line under it, up to the next label,
// a blank line, or a heading: the same grouping ideate.mjs's own `annotateFilledPrompt` uses for
// `enters:`/`leaves:`/`camera:`, because a measured `leaves:` entry is routinely two physical lines
// and replacing only the first would leave its continuation dangling below the new text.
const ENTRY_LABELS = ['on screen:', 'enters:', 'leaves:', 'camera:', 'type:', 'ground:', 'content:',
  'frame:', 'cursor:', 'recipe:', 'becomes:', 'measured:', 'eye:'];
const startsNewEntry = (line) => ENTRY_LABELS.some((lb) => line.startsWith(lb)) || /^##/.test(line) || line.trim() === '';

/** setEntry(sectionText, label, newLine) → sectionText with the WHOLE `<label>: ...` entry (its label
 * line and any wrapped continuation) replaced by the single `newLine`, or `newLine` appended after the
 * section's last non-blank line if no such entry exists yet. Never duplicates: a second `--apply` with
 * the same answer is a no-op on this entry. */
function setEntry(sectionText, label, newLine) {
  const lines = sectionText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${label}:`)) {
      let j = i + 1;
      while (j < lines.length && !startsNewEntry(lines[j])) j++;
      lines.splice(i, j - i, newLine);
      return lines.join('\n');
    }
  }
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') end--;
  lines.splice(end, 0, newLine);
  return lines.join('\n');
}

/** applyAnswers(promptText, answers) → promptText with each `answers.acts[i]` folded into that act's
 * own section (`## Act <i>`) and its trailing joint section (`## Joint at ...`), and `answers.film`
 * folded once near the top. `answers` shape:
 * `{ film: {where, text, ground}, acts: [{frame, cursor, handoff, transitionName?, kind?, joint?}, ...] }`.
 * `handoff` routes to whichever section actually owns that line: `flow-seam` rewrites the JOINT's own
 * `recipe:` line (ideate.mjs's `jointSection` already writes one there); every other handoff answer is
 * an ACT-level line (`leaves:`, `becomes:`, or `camera:`), because there is no joint section to own it
 * once the author has chosen not to use the measured seam. */
export function applyAnswers(promptText, answers) {
  // Split on EVERY `## ` heading, Act and Joint alike, so an act's own section stops at its trailing
  // `## Joint at ...s` rather than swallowing it: a naive split on `## Act \d+` alone leaves the joint
  // block (and the next act's heading) inside "this" act's text, and an appended line lands after it.
  const sections = promptText.split(/(?=^## )/m);
  for (let idx = 0; idx < sections.length; idx++) {
    const m = /^## Act (\d+)/.exec(sections[idx]);
    if (!m) continue;
    const a = answers.acts && answers.acts[+m[1] - 1];
    if (!a) continue;
    if (a.frame && FRAME_LINE[a.frame]) sections[idx] = setEntry(sections[idx], 'frame', FRAME_LINE[a.frame](a));
    if (a.cursor && CURSOR_LINE[a.cursor]) sections[idx] = setEntry(sections[idx], 'cursor', CURSOR_LINE[a.cursor]());
    if (a.eye && EYE_LINE[a.eye]) sections[idx] = setEntry(sections[idx], 'eye', EYE_LINE[a.eye]());
    if (answers.film && answers.film.ground && GROUND_LINE[answers.film.ground]) sections[idx] = setEntry(sections[idx], 'ground', GROUND_LINE[answers.film.ground]());
    if (a.handoff && HANDOFF_LINE[a.handoff]) {
      const jointIdx = idx + 1;
      if (a.handoff === 'flow-seam' && jointIdx < sections.length && /^## Joint/.test(sections[jointIdx])) {
        sections[jointIdx] = setEntry(sections[jointIdx], 'recipe', HANDOFF_LINE['flow-seam'](a.joint || {}));
      } else {
        const label = a.handoff === 'becomes' ? 'becomes' : (a.handoff === 'camera' ? 'camera' : 'leaves');
        sections[idx] = setEntry(sections[idx], label, HANDOFF_LINE[a.handoff](a.joint || {}, a));
      }
    }
  }
  let text = sections.join('');
  if (answers.film) {
    const bits = [];
    if (answers.film.where) bits.push(`lives in: ${whereProductLives().find((o) => o.key === answers.film.where)?.label || answers.film.where}`);
    if (answers.film.text) bits.push(`text arrives: ${howTextArrives().find((o) => o.key === answers.film.text)?.label || answers.film.text}`);
    const extra = [];
    if (bits.length && !/^film: /m.test(text)) extra.push(`film: ${bits.join(' · ')}`);
    // ATTENTION, the film-level twin of each act's `eye:` answer: one sentence naming the path across
    // the whole film, promoted verbatim to the storyboard's own `attention:` frontmatter field once
    // `make scaffold` runs.
    if (answers.film.attention && !/^attention: /m.test(text)) {
      const opt = attentionOptions().find((o) => o.key === answers.film.attention);
      extra.push(`attention: ${opt ? opt.description : answers.film.attention}`);
    }
    if (extra.length) text = text.replace(/^(# .*\n)/, `$1\n${extra.join('\n')}\n`);
  }
  return text;
}

// ── self-test ─────────────────────────────────────────────────────────────────────────────────────
function selfTest() {
  const errs = [];
  const ok = (c, m) => { if (!c) errs.push(m); };

  // every option resolves in the registry it claims to come from.
  for (const o of cameraOptions()) ok(CAMERA_MOVE_BLURBS[o.key], `camera option "${o.key}" is not a camera move`);
  ok(RECIPES['flow-seam'], 'flow-seam recipe missing');
  ok(RECIPES['word-by-word'], 'word-by-word recipe missing');
  ok(PRESETS.up && PRESETS.decode && PRESETS.riseClip && PRESETS.type, 'a cited kinetic preset is missing');
  for (const k of KINDS) ok(typeof k === 'string', 'screen.mjs KINDS is not a plain string list');

  // no batch exceeds 4 questions.
  const shots = [{ i: 1, t0: 0, len: 4, ground: 'light', luma: 200, accent: '#fff', content: { fill: 0.3, detail: 5, photo: 0.1 } },
    { i: 2, t0: 4, len: 2, ground: 'light', luma: 200, accent: null, content: { fill: 0.05, detail: 2, photo: 0 } }];
  const seams = [{ t: 4, gap: 0.1, axis: 'x', direction: 'right-to-left', groundBefore: '#eee', groundAfter: '#eee' }];
  const acts = buildActs(shots, seams).map((a, i) => ({ ...a, content: shots[i].content }));
  const joints = buildJoints(seams);
  const payload = ask({ acts, joints });
  ok(!payload.error, 'ask() should succeed given real acts');
  for (const b of payload.batches) ok(b.questions.length <= 4, `batch "${b.label}" has ${b.questions.length} questions, over the AskUserQuestion limit of 4`);
  ok(payload.batches.length === acts.length + 1, 'one film batch plus one batch per act');
  for (const b of payload.batches) for (const q of b.questions) {
    // "Hands off" on the last act (no next joint) has exactly one option ("the film ends here"): a real
    // edge case, not a menu, so the floor is 1 there and 2 everywhere else.
    const floor = /film ends here/i.test(q.options[0]?.label || '') ? 1 : 2;
    ok(q.options.length >= floor && q.options.length <= 4, `question "${q.header}" has ${q.options.length} options, want ${floor} to 4`);
    ok(q.header.length <= 12, `header "${q.header}" is over 12 chars`);
    for (const o of q.options) ok(o.description && o.description.length > 20, `option "${o.label}" in "${q.header}" has no real description`);
  }

  // the reference's measured content rides in the frame question's description.
  const withContent = frameOptions(acts[0]);
  ok(withContent.every((o) => /fills .* of this frame/.test(o.description)), 'act 1 (has content) should quote the measured fill in every frame option');
  const noContent = frameOptions({ i: 3 });
  ok(noContent.every((o) => /IDEA mode/.test(o.description)), 'an act with no content reading should say so, never invent one');

  // apply: answers fold into the right act's lines, replacing rather than duplicating.
  const prompt = ['# t · film prompt', '', '## Act 1 (0s-4s)', 'on screen: x', 'frame: <fill: what fills the frame>', '',
    '## Act 2 (4s-6s)', 'on screen: y', ''].join('\n');
  const answers = { film: { where: 'terminal', text: 'caret', ground: 'chained' },
    acts: [{ frame: 'screen', kind: 'editor', cursor: 'caret-blink', handoff: 'flow-seam', joint: joints[0] }, { frame: 'type-only', cursor: 'none' }] };
  const applied = applyAnswers(prompt, answers);
  ok(/frame: a designed screen \(make screen KIND=editor\)/.test(applied), 'act 1 frame line should be replaced with the answer, not duplicated');
  ok((applied.match(/^frame:.*$/gm) || []).length === 2, 'exactly one frame: line per act, no duplicate');
  ok(/cursor: a typing caret, blinking/.test(applied), 'act 1 cursor line should be set');
  ok(/recipe: flow-seam out=act1 in=act2 axis=x/.test(applied), 'act 1 handoff should become the recipe line');
  ok(/^film: lives in: A terminal · text arrives: Typed, with a caret$/m.test(applied), 'the film-level answers should be recorded once, near the top');
  ok(/ground: chained from the previous scene/.test(applied), 'the film-level ground strategy should apply to every act');
  const twice = applyAnswers(applied, answers);
  ok((twice.match(/^film: /gm) || []).length === 1, 'a second apply pass must not duplicate the film: line');

  // the eye question replaces the old standalone camera question and stays a real device.
  ok(CAMERA_MOVE_BLURBS.diveIn, 'eyeOptions cites camera move diveIn which is missing');
  const withEye = { ...answers, film: { ...answers.film, attention: 'cause-chain' },
    acts: [{ ...answers.acts[0], eye: 'cursor' }, answers.acts[1]] };
  const eyeApplied = applyAnswers(prompt, withEye);
  ok(/^attention: /m.test(eyeApplied), 'an attention answer should write an attention: line near the top');
  ok(/eye: <fill: where it starts> -> the cursor travels and causes it -> <fill: where it lands>/.test(eyeApplied),
    'act 1 eye answer should write an eye: line');
  const eyeTwice = applyAnswers(eyeApplied, withEye);
  ok((eyeTwice.match(/^attention: /gm) || []).length === 1, 'a second apply pass must not duplicate the attention: line');
  ok((eyeTwice.match(/^eye:/gm) || []).length === 1, 'a second apply pass must not duplicate the eye: line');

  // a `flow-seam` handoff answer rewrites the JOINT's own `recipe:` line, never the act's, and a
  // multi-line `leaves:` entry is replaced whole, not left with a dangling continuation line.
  const withJoint = ['# t · film prompt', '', '## Act 1 (0s-2s)', 'on screen: x',
    'leaves: the card slides off left as', 'the ground fades (measured: x axis, gap 0.1s)', '',
    '## Joint at 2s', 'recipe: flow-seam out=act1 in=act2 axis=y', 'measured: gap 0.1s, axis y', '',
    '## Act 2 (2s-4s)', 'on screen: y', ''].join('\n');
  const jointApplied = applyAnswers(withJoint, { acts: [{ handoff: 'flow-seam', joint: { outAct: 1, inAct: 2, axis: 'x' } }] });
  ok(/^## Joint at 2s\nrecipe: flow-seam out=act1 in=act2 axis=x$/m.test(jointApplied), 'flow-seam answer should rewrite the JOINT section\'s own recipe line, axis included');
  ok(/leaves: the card slides off left as\nthe ground fades \(measured: x axis, gap 0\.1s\)/.test(jointApplied), 'an untouched multi-line leaves: entry must survive byte for byte');
  ok((jointApplied.match(/^recipe:/gm) || []).length === 1, 'no second recipe: line appears in the act section');
  const becameHandoff = applyAnswers(['# t', '', '## Act 1 (0s-2s)', 'on screen: x', 'leaves: old text', '',
    '## Act 2 (2s-4s)', 'on screen: y', ''].join('\n'), { acts: [{ handoff: 'becomes' }] });
  ok(/becomes: <fill: the X becomes the Y>/.test(becameHandoff), 'a "becomes" handoff should write a becomes: entry into the ACT section');
  ok(/leaves: old text/.test(becameHandoff), 'a "becomes" handoff must leave the act\'s own leaves: entry untouched');

  if (errs.length) { console.error('✗ ideate-ask self-test\n' + errs.map((e) => `  - ${e}`).join('\n')); process.exit(1); }
  console.log(`✓ ideate-ask self-test: ${payload.batches.length} batches, every option resolves to a registry, apply round-trips`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────
export function loadActs({ ref, name, idea }) {
  if (ref) {
    const grammarPath = path.join(ROOT, 'grammar', `${ref}.json`);
    if (!fs.existsSync(grammarPath)) return { error: 'no-study', message: `no study for "${ref}" (${path.relative(ROOT, grammarPath)}). Run \`make ideate REF=${ref}\` first, it prints the exact \`make study\` command.` };
    const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
    // buildActs (ideate.mjs) carries only what a joint/camera route needs; `content` (shots[].content,
    // the real fill/detail/photo reading) is grafted back on here rather than widening that shared
    // shape for a reading only this module's frame question uses.
    const acts = buildActs(grammar.shots, grammar.seams).map((a, i) => ({ ...a, content: grammar.shots[i].content }));
    return { acts, joints: buildJoints(grammar.seams) };
  }
  // IDEA mode: acts are not measured, so a plain 4-act placeholder shape, matching ideate.mjs's own
  // `buildIdeaPrompt` default (dur=12, actsCount=4) when no --ref structure is given.
  const n = 4;
  const acts = Array.from({ length: n }, (_, k) => ({ i: k + 1, t0: k * 3, t1: (k + 1) * 3 }));
  const joints = acts.slice(0, -1).map((a, k) => ({ t: a.t1, axis: 'x', outAct: k + 1, inAct: k + 2, gap: 0.1 }));
  return { acts, joints };
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const argv = process.argv.slice(2);
  const flag = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  if (argv.includes('--self-test')) selfTest();
  else if (argv.includes('--ask')) {
    const { acts, joints, error, message } = loadActs({ ref: flag('--ref'), name: flag('--name'), idea: flag('--idea') });
    if (error) { console.error(`✗ ${message}`); process.exit(2); }
    console.log(JSON.stringify(ask({ acts, joints }), null, 2));
  } else if (argv.includes('--apply')) {
    const promptPath = flag('--prompt'), answersPath = flag('--answers');
    if (!promptPath || !answersPath) { console.error('usage: --apply --prompt <file> --answers <file.json>'); process.exit(2); }
    const before = fs.readFileSync(promptPath, 'utf8');
    const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
    fs.writeFileSync(promptPath, applyAnswers(before, answers));
    console.log(`ideate-ask --apply → ${path.relative(ROOT, promptPath)}`);
  } else {
    console.error('usage: node harness/author/ideate-ask.mjs --ask [--ref <ref> | --name <film> --idea "..."] | --apply --prompt <file> --answers <file.json> | --self-test');
    process.exit(2);
  }
}
