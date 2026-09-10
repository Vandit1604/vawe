// harness/author/ideate.mjs: THE FILM, IN PLAIN WORDS, before any JSON exists. Stage 1.5, between
// brief and plan (AGENTS.md's eight stages). Writes ONE human-readable prompt: the film act by act,
// what is on screen, how it enters and leaves, the ground and its colour, the camera, the pace, and
// which recipe (recipes/README.md) each joint uses. The owner reads it, edits it by hand, and the
// harness builds the storyboard from it. This file never writes a storyboard or a scene JSON itself.
//
//   node harness/author/ideate.mjs --ref example-madera            (from a reference: grammar/<ref>.json)
//   node harness/author/ideate.mjs --name <film> --idea "..."       (from an idea: acts left <fill:>)
//   node harness/author/ideate.mjs --name <film> --idea "..." --ref example-madera   (idea, ref's structure)
//   node harness/author/ideate.mjs --self-test
//   make ideate REF=example-madera   ·   make ideate NAME=<film> IDEA="..." [REF=<ref>]
//
// NUMBERS COME FROM THE STUDY, NEVER FROM MEMORY. `grammar/<ref>.json` (make study) carries the real
// shot list and the real seams: t, gap, axis, direction, ground before/after. What the study cannot
// measure (what is literally on screen, how it moves, the camera, the type) is never invented: this
// writes a marked placeholder `<look: 4.54s to 6.00s, see <strip path>>` and extracts the frames that
// answer it, so a person (or an agent told to look) fills it by LOOKING, not by guessing.
//
// CONTENT IS MEASURED THE SAME WAY: `harness/media/content.mjs` (one owner, shared with content-check
// and the film's own render) reads fill/detail/photo off real frames. `--annotate` samples 4 points
// inside each act's own clip and SETS a `content:` line naming the median, in words, so an author
// writing the storyboard can see per-act where the reference is dense and where it is quiet
// (docs/CRAFT/CONTENT.md) without opening a video player. Never invented, never a fixed bar. A re-run
// after content.mjs changes REPLACES a stale `content:` line rather than appending a second one beside
// it: two readings for one act with no way to tell which is current is worse than the stale one alone.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RECIPES } from '../../recipes/index.mjs';
import { measureVideo } from '../media/content.mjs';
import { ask as ideateAsk, applyAnswers as ideateApplyAnswers, loadActs as ideateLoadActs } from './ideate-ask.mjs';
// GROUPS/pasteLine/ambiguousNames/bestWindowMatch: the SAME corpus and the SAME windowed match
// `make stage`'s adoption block and the beat-surfacer nudge use (harness/author/discovery.mjs), so a
// route bracket here, a nudge at save time, and a worklist row at `make stage` never disagree about
// what counts as a match. CONFIDENT/coverageIn: arsenal's own ranker, never a second one.
import { GROUPS, pasteLine, ambiguousNames, bestWindowMatch, filteredToks } from './discovery.mjs';
import { coverageIn, CONFIDENT } from './arsenal.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── pure parts (self-tested below) ─────────────────────────────────────────────────────────────────

/** buildActs(shots, seams) → one act per shot, with the measured seam either side attached (or null
 * at the film's open/close). `seams[k]` sits between `shots[k]` and `shots[k+1]` (0-indexed): the
 * study writes it that way (seam.t === shots[k+1].t0 === shots[k].t0+shots[k].len). */
export function buildActs(shots, seams) {
  return shots.map((s, k) => ({
    i: s.i, t0: s.t0, t1: +(s.t0 + s.len).toFixed(2), len: s.len,
    ground: s.ground, luma: s.luma, accent: s.accent,
    entersFrom: k > 0 ? seams[k - 1] : null,
    leavesTo: k < seams.length ? seams[k] : null,
  }));
}

/** buildJoints(seams) → one joint per seam, naming the acts either side (1-indexed, matching the
 * act headings this file prints). */
export function buildJoints(seams) {
  return seams.map((s, k) => ({ ...s, outAct: k + 1, inAct: k + 2 }));
}

/** recipeLineFor(joint) → the exact storyboard syntax harness/lib/contract.mjs#parseRecipeLine reads:
 * `<name> out=<id> in=<id> axis=<x|y>`. Picks the one promoted recipe of kind "seam"; a film with more
 * than one seam recipe would need a real choice here, not a menu (that's what `pickRecipe` refuses). */
export function recipeLineFor(joint, recipes = RECIPES) {
  const name = Object.keys(recipes).find((n) => recipes[n].kind === 'seam');
  if (!name) return null;
  return `${name} out=act${joint.outAct} in=act${joint.inAct} axis=${joint.axis}`;
}

/** recipeMenu(recipes) → one line per known recipe: name, kind, blurb, first source. Used in IDEA mode,
 * where no joint is measured yet, so the author picks structure from what real films actually do. */
export function recipeMenu(recipes = RECIPES) {
  return Object.entries(recipes).map(([name, r]) =>
    `- ${name} (${r.kind}): ${r.blurb} [first source: ${r.sources[0].ref}@${r.sources[0].t}s]`);
}

const nearestAspect = (w, h) => {
  const CANVASES = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3 };
  const ratio = w / h;
  return Object.entries(CANVASES).sort((a, b) => Math.abs(a[1] - ratio) - Math.abs(b[1] - ratio))[0][0];
};

// ── strips: the frames that answer a <look:> marker ────────────────────────────────────────────────

/** Resolve the clip for a studied ref: an explicit --clip, else refs/_clips/<ref>.mp4 in this tree,
 * else the same path in the main tree (refs/ is gitignored, so a worktree usually doesn't have it). */
export function resolveClip(ref, explicit) {
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const here = path.join(ROOT, 'refs/_clips', `${ref}.mp4`);
  if (fs.existsSync(here)) return here;
  try {
    const commonGitDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const mainRoot = path.dirname(commonGitDir); // .git's parent, when not bare
    const there = path.join(mainRoot, 'refs/_clips', `${ref}.mp4`);
    if (fs.existsSync(there)) return there;
  } catch { /* not a git repo, or no common dir: fall through to null */ }
  return null;
}

/** One dense strip (filmstrip.mjs) for a time window, copied out of its scratch dir (filmstrip.mjs
 * clears that dir on every run, so it must be copied before the next window overwrites it) into
 * refs/<ref>/ideate-strips/, which sits beside refs/<ref>/ from `make study` and is gitignored the
 * same way: frames from someone else's film never get published (AGENTS.md, "never embed copyrighted
 * material"). Returns the copied sheet path, or null if ffmpeg found nothing (reported, not silenced). */
function extractStrip(clip, ref, label, from, to, fps) {
  const outDir = path.join(ROOT, 'refs', ref, 'ideate-strips');
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync(process.execPath, [path.join(ROOT, 'harness/author/filmstrip.mjs'),
    `VIDEO=${clip}`, `FROM=${from}`, `TO=${to}`, `FPS=${fps}`], { encoding: 'utf8', env: { ...process.env, VIDEO: clip, FROM: String(from), TO: String(to), FPS: String(fps) } });
  const sheet = /^\s+(\/\S+sheet-\d+\.png)/m.exec(r.stdout || '');
  if (!sheet) { console.error(`  ! strip ${label} (${from}s-${to}s) failed: ${(r.stderr || r.stdout || '').slice(0, 200)}`); return null; }
  const dest = path.join(outDir, `${label}.png`);
  fs.copyFileSync(sheet[1], dest);
  return path.relative(ROOT, dest);
}

const look = (from, to, stripPath) => stripPath
  ? `<look: ${from}s to ${to}s, see ${stripPath}>`
  : `<look: ${from}s to ${to}s, no clip found, extract by hand: make filmstrip VIDEO=<clip> FROM=${from} TO=${to} FPS=12>`;

// ── prompt assembly ─────────────────────────────────────────────────────────────────────────────────

// ── routing: name the resolved core capability beside a line, or say it has none ───────────────────
//
// A film prompt is where an author decides WHAT a beat does; a bracket beside that decision says
// whether the core already HAS the capability that does it, so a read of the prompt also reads as a
// coverage report of the engine against one real film (AGENTS.md, "every recipe line is also a route
// into the core"). `[recipe: <name>]` names a recipes/recipes.json entry that compiles the line to a
// named core capability; `[camera: <move>]` / `[cut: <name>]` names a bare core primitive when no
// recipe wraps it; `[unrouted: <why>]` says the engine has no named path for it today, which is the
// whole point of surfacing it here rather than silently hand-authoring around the gap.

/** routeSeamProse(kind, text) -> the bracket for an act's `enters:`/`leaves:` line. Every measured
 * joint in this film already carries an axis and a gap, which is exactly what `flow-seam` (the one
 * promoted recipe of kind "seam") consumes, so the base route is always that recipe. Composed cases
 * layer on top of it rather than replacing it: a word-by-word arrival still crosses through a seam, and
 * a word-by-word EXIT and a shape-to-letterform assembly are true gaps (recipes/README.md; no recipe of
 * kind "exit" or "spine" is promoted yet, and no split track here reveals a unit going OUT). */
export function routeSeamProse(kind, text) {
  if (!text) return null;
  const wordByWord = /word by word/i.test(text);
  const assembles = /scattered|land(s|ed)? as|letterform/i.test(text);
  if (kind === 'enter') {
    if (assembles) return '[recipe: flow-seam; unrouted: marks assembling into letterforms, no named core capability for shape-to-glyph landing]';
    if (wordByWord) return '[recipe: flow-seam + word-by-word]';
    return '[recipe: flow-seam]';
  }
  // kind === 'leave'
  if (wordByWord) return '[recipe: flow-seam; unrouted: per-word exit, core/tracks/units.js splits text IN only, no staggered-out]';
  return '[recipe: flow-seam]';
}

/** routeCameraProse(text) -> the bracket for an act's `camera:` line, once it has been looked at and
 * filled by hand (a fresh `<look:>` placeholder routes to nothing: there is no prose yet to read). A
 * continuous push toward a layer is `window-dolly` (core/camera-moves/dive-in.js under it); a static
 * hold asks the engine for nothing, so it is not "unrouted", it is simply not a camera line at all. */
export function routeCameraProse(text) {
  if (!text || /<look:/.test(text)) return null;
  if (/dolly-in|continuous push|continuous zoom|slow.{0,20}push/i.test(text)) return '[recipe: window-dolly]';
  if (/static hold|no push/i.test(text)) return null;
  return '[unrouted: camera]';
}

// ── generic capability routing, for the four act lines camera/seam do not already own ──────────────
//
// routeSeamProse/routeCameraProse carry real domain knowledge (an axis-and-gap joint IS flow-seam; a
// continuous push IS window-dolly) a generic ranker cannot replicate, so they are unchanged. `on
// screen:`, `ground:`, `type:` and `content:` name no single dedicated field, but their prose can still
// name a technique the core already has (a looping shader ground, a kinetic caption preset, a particle
// system), so this asks the SAME corpus and the SAME cutoff every other discovery surface in this repo
// uses (harness/author/discovery.mjs GROUPS, arsenal.mjs CONFIDENT), rather than leaving four of the
// seven act lines with no route at all.
let CAP_CORPUS = null;
function capCorpus() {
  if (!CAP_CORPUS) {
    const all = GROUPS.flatMap(([, entries]) => entries());
    CAP_CORPUS = { all, coverage: coverageIn(all), ambiguous: ambiguousNames(all) };
  }
  return CAP_CORPUS;
}

// Named techniques worth flagging as a GAP when nothing in the corpus confidently answers them: the
// point of `[unrouted: ...]` is to say the engine has no path today, never to guess at one, so this
// list is deliberately short and literal rather than a second ranker.
const TECHNIQUE_RE = /\b(shaders?|particles?|glitch\w*|morph\w*|extrud\w*|wip(?:e|ing)|gradients?|textures?|grain|distort\w*|pixel\w*|raymarch\w*|kaleidoscope)\b/i;

/** routeCapabilityProse(text) -> the bracket for an `on screen:`/`ground:`/`type:`/`content:` line: a
 * confident match against the whole discovery corpus, `[unrouted: <word>]` when the prose names a
 * technique this pass found no match for, or null when there is nothing to route yet (a `<look:>` /
 * `<fill:>` placeholder still open, or prose naming no technique at all). */
export function routeCapabilityProse(text) {
  if (!text || /<look:|<fill:/.test(text)) return null;
  // Every `ground:`/`camera:` line carries a `(measured, luma ...)`/`(measured, gap ...)` parenthetical
  // this file itself appends (buildActs/actSection): machine annotation, never authored prose. Left in,
  // its own word "measured" coincidentally shares a stem with unrelated blurbs ("measured at build
  // with getTotalLength()"), and idf treats that coincidence as strong evidence for nothing real
  // (found calibrating this exact router: "ground: light (measured, luma 209.1)" routed to `drawOn`,
  // a part entrance with no relationship to ground colour at all). Strip it before ranking.
  const prose = text.replace(/\(measured[^)]*\)/gi, '');
  const { all, coverage, ambiguous } = capCorpus();
  const qt = filteredToks(prose);
  if (!qt.length) return null;
  let best = null;
  for (const e of all) {
    const m = bestWindowMatch(e, [qt], coverage);
    if (m.s > 0 && m.c >= CONFIDENT && (!best || m.c > best.c)) best = { ...m, e };
  }
  if (best) return `[${pasteLine(best.e, ambiguous)}]`;
  const found = TECHNIQUE_RE.exec(text);
  return found ? `[unrouted: ${found[0].toLowerCase()}]` : null;
}

// appendBracket(line, bracket): join only when a route was actually found. `act.onScreen`/`camera`
// prose does not exist at fresh-generation time (it is a `<look:>` placeholder until a person fills
// it), so every routing call here is best-effort and most resolve to null on a brand-new prompt; the
// real payoff is `--ref` re-run over an ALREADY-FILLED prompt (see annotateFilledPrompt below).
const appendBracket = (line, bracket) => (bracket ? `${line} ${bracket}` : line);

function actSection(act, ref, clip) {
  const stripAct = clip ? extractStrip(clip, ref, `act${act.i}`, act.t0, act.t1, act.len < 2 ? 20 : 12) : null;
  const lines = [`## Act ${act.i} (${act.t0}s-${act.t1}s)`];
  lines.push(`on screen: ${look(act.t0, act.t1, stripAct)}`);
  if (act.entersFrom) {
    const j = act.entersFrom;
    lines.push(appendBracket(`enters: from the ${j.direction.split('-to-')[0]} along the ${j.axis} axis (measured, gap ${j.gap}s)`, routeSeamProse('enter', act.onScreen)));
  } else lines.push('enters: (film opens, no prior joint)');
  if (act.leavesTo) {
    const j = act.leavesTo;
    const from = +Math.max(0, j.t - 0.3).toFixed(2), to = +(j.t + 0.3).toFixed(2);
    const stripJoint = clip ? extractStrip(clip, ref, `joint-${act.i}-${act.i + 1}`, from, to, 20) : null;
    lines.push(appendBracket(`leaves: toward the ${j.direction.split('-to-')[1]} along the ${j.axis} axis (measured, gap ${j.gap}s). ${look(from, to, stripJoint)} for what exits`, routeSeamProse('leave', act.onScreen)));
  } else lines.push('leaves: (film ends, no next joint)');
  lines.push(`ground: ${act.ground}${act.accent ? `, ${act.accent}` : ''} (measured, luma ${act.luma})`);
  lines.push(appendBracket(`camera: ${look(act.t0, act.t1, stripAct)}`, routeCameraProse(act.camera)));
  lines.push(`type: ${look(act.t0, act.t1, stripAct)}`);
  return lines.join('\n');
}

// annotateFilledPrompt(text): given a prompt.md ALREADY hand-filled (on screen/camera/type rewritten
// from placeholders, enters/leaves/ground corrected against the frames), append a routing bracket to
// every `enters:`/`leaves:`/`camera:` ENTRY that does not already carry one. Every other line,
// including every word of hand-corrected prose, passes through byte for byte: this only ever appends
// one bracket to the LAST physical line of an entry, never edits or removes anything. Regenerating a
// prompt from the study data (buildRefPrompt) would discard the hand-fill; a person's own correction
// like commit 01150c25 is not something a second pass gets to overwrite.
//
// AN ENTRY IS NOT A LINE: `leaves: ...as\nthe window defocuses (measured...)` is ONE entry hard-wrapped
// across two lines of markdown, and a bracket mid-sentence reads worse than the thing it is meant to
// clarify. So this groups every physical line up to the next label (or a blank line, or the next `##`
// heading) into one entry and appends to its last line.
//
// ACT 6's letterform landing is why `enters:` also reads the act's own `on screen:` entry: the axis and
// gap alone (`from the bottom along the y axis`) look identical to a plain slide, and only the
// paragraph above names what is actually arriving ("scattered ... marks ... land as the individual
// letterforms"). Composing on-screen with enters is how that gap gets flagged instead of silently
// routed as a plain flow-seam.
const ENTRY_LABELS = ['on screen:', 'enters:', 'leaves:', 'camera:', 'type:', 'ground:'];
const startsNewEntry = (line) => ENTRY_LABELS.some((lb) => line.startsWith(lb))
  || line.startsWith('##') || line.startsWith('recipe:') || line.startsWith('measured:') || line.trim() === '';

// A bracket a PREVIOUS pass wrote is stale evidence, not settled fact: the corpus this ranks against
// grows (a new recipe, a new `use:` kind), so a re-run must be free to say something different. Strip
// whatever trailing bracket is there before recomputing, so the diff shows only the bracket changing
// (never a duplicate appended beside the old one) and never touches the hand-corrected prose in front
// of it.
const BRACKET_RE = /\s*\[[^\]]*\]\s*$/;
const stripBracket = (s) => s.replace(BRACKET_RE, '');

/** routeEntry(label, full, lastOnScreen) -> the bracket for one entry's already-stripped text.
 * `enters:`/`leaves:`/`camera:` keep their domain-specific routers; every other label (on screen,
 * ground, type) asks the generic corpus (routeCapabilityProse). */
function routeEntry(label, full, lastOnScreen) {
  if (label === 'enters:') return /film opens/.test(full) ? null : routeSeamProse('enter', `${lastOnScreen} ${full}`);
  if (label === 'leaves:') return /film ends/.test(full) ? null : routeSeamProse('leave', full);
  if (label === 'camera:') return routeCameraProse(full);
  // The generic router ranks against a corpus keyed by KIND words too ("ground" is a background
  // preset's own slot word, "type" a caption kind's), so leaving the field's own label in the text
  // hands every entry of that kind a free, meaningless point of overlap. Strip it first.
  return routeCapabilityProse(full.slice(label.length).trim());
}

export function annotateFilledPrompt(text) {
  const lines = text.split('\n');
  const entries = [];
  for (let i = 0; i < lines.length;) {
    const label = ENTRY_LABELS.find((lb) => lines[i].startsWith(lb));
    if (!label) { i++; continue; }
    let j = i + 1;
    while (j < lines.length && !startsNewEntry(lines[j])) j++;
    entries.push({ label, start: i, end: j - 1 });
    i = j;
  }
  const out = [...lines];
  let lastOnScreen = '';
  for (const e of entries) {
    // Read off `out`, not the original `lines`: an earlier entry this same pass already rewrote (its
    // bracket stripped and replaced) is what a later entry should compose with.
    const full = stripBracket(out.slice(e.start, e.end + 1).join('\n'));
    if (e.label === 'on screen:') lastOnScreen = full;
    const bracket = routeEntry(e.label, full, lastOnScreen);
    out[e.end] = appendBracket(stripBracket(out[e.end]), bracket);
  }
  return out.join('\n');
}

// ── CONTENT: how rich a frame is, in words, per act ────────────────────────────────────────────────
//
// fracWords(fill) → the share of the frame subject occupies, said the way a person reads it off a
// still, not as a bare decimal. Bands chosen so "a third" and "half" land where the madera/vawe-flow
// measurement (`.claude/plans/content-richness.plan.md`, Update 1) actually put its real numbers.
const FRAC_BANDS = [[0.03, 'barely there'], [0.12, 'a small part'], [0.28, 'about a quarter'],
  [0.4, 'about a third'], [0.6, 'about half'], [0.75, 'about two thirds'], [0.9, 'most']];
export const fracWords = (f) => (FRAC_BANDS.find(([lim]) => f < lim) || [0, 'nearly all'])[1];

/** wordsFromContent(readings) → one `content:` line for an act, given the harness/media/content.mjs
 * readings (each `{fill,detail,photo}`) sampled inside it. Takes the MEDIAN of each field across the
 * readings, because a single frame can catch a beat mid-transition (content.mjs does the same for a
 * shot's ground). `fill` says how much of the frame is real material; `photo`/`detail` say what kind. */
export function wordsFromContent(readings) {
  const med = (k) => { const s = readings.map((r) => r[k]).sort((a, b) => a - b); return s[s.length >> 1]; };
  const fill = med('fill'), detail = med('detail'), photo = med('photo');
  const nums = `(fill ${fill.toFixed(2)}, detail ${detail.toFixed(1)}, photo ${photo.toFixed(2)})`;
  if (fill < 0.08 && photo < 0.05 && detail < 5) return `content: quiet, type on ground only ${nums}`;
  const density = fill < 0.2 ? 'light' : 'dense';
  const material = photo >= 0.15 ? 'photographic' : detail >= 8 ? 'detailed graphic' : 'plain UI';
  return `content: ${density} real material, fills ${fracWords(fill)} of the frame, ${material} ${nums}`;
}

const CONTENT_ACT_RE = /^## Act \d+ \(([\d.]+)s-([\d.]+)s\)/;

/** addContentLines(text, clip, { measure }) → `text` with a `content:` line set on every act section,
 * sampled at 4 points inside the act (12.5/37.5/62.5/87.5%, clear of both edges so a joint's crossfade
 * never dominates the read) and reduced by wordsFromContent. An act that already carries a `content:`
 * line, stale numbers from an old content.mjs, or the unfilled `<fill: ...>` placeholder, gets that ONE
 * line REPLACED, never a second one appended beside it: a re-measured film should read as re-measured,
 * not as two readings for one act with no way to tell which is current. `measure` defaults to
 * content.mjs's real measureVideo (shells to ffmpeg); the self-test below injects a fake one so the
 * reducer is checked without a video file. No clip, no content: lines: never a guess. */
export function addContentLines(text, clip, { measure = measureVideo } = {}) {
  if (!clip) return text;
  const chunks = text.split(/(?=^## )/m);
  return chunks.map((chunk) => {
    const m = CONTENT_ACT_RE.exec(chunk);
    if (!m) return chunk;   // not an act
    const t0 = +m[1], t1 = +m[2];
    const times = [0.125, 0.375, 0.625, 0.875].map((f) => +(t0 + (t1 - t0) * f).toFixed(2));
    const line = wordsFromContent(measure(clip, times));
    if (/^content:.*$/m.test(chunk)) return chunk.replace(/^content:.*$/m, line);
    return chunk.replace(/\n+$/, '') + `\n${line}\n\n`;
  }).join('');
}

function jointSection(joint) {
  const line = recipeLineFor(joint);
  const lines = [`## Joint at ${joint.t}s`];
  lines.push(line ? `recipe: ${line}` : '(no promoted seam recipe yet: recipes/recipes.json has none of kind "seam")');
  lines.push(`measured: gap ${joint.gap}s, axis ${joint.axis}, ground ${joint.groundBefore} to ${joint.groundAfter}`);
  return lines.join('\n');
}

function fillActSection(i, t0, t1) {
  return [`## Act ${i} (${t0}s-${t1}s)`, 'on screen: <fill: what is on screen>', 'enters: <fill: how it enters>',
    'leaves: <fill: how it leaves>', 'ground: <fill: colour>', 'camera: <fill: still, push, drift>',
    'type: <fill: what carries the copy>', 'content: <fill: dense or quiet, what real material>'].join('\n');
}

function fillJointSection(t) {
  return [`## Joint at ${t}s`, 'recipe: <fill: pick one from the menu below, or write the line by hand>'].join('\n');
}

/** buildRefPrompt(ref, grammar) → the prompt text for `make ideate REF=<ref>`. Exported so tests can
 * check the shape without shelling out to ffmpeg. */
export function buildRefPrompt(ref, grammar, clip) {
  const { measured, shots, seams, groundPattern } = grammar;
  const acts = buildActs(shots, seams);
  const joints = buildJoints(seams);
  const aspect = `${measured.width}:${measured.height} (nearest canvas ${nearestAspect(measured.width, measured.height)})`;
  const header = [
    `# ${ref} · film prompt`,
    '',
    `<fill: the film in one breath>`,
    '',
    `duration: ${measured.duration}s · aspect: ${aspect} · pace: median act ${measured.medianShot}s, ` +
      `${measured.cutsPerMinute} joints/min · ground: ${groundPattern}`,
    '',
  ];
  const body = [];
  acts.forEach((act, k) => {
    body.push(actSection(act, ref, clip), '');
    if (act.leavesTo) body.push(jointSection(joints[k]), '');
  });
  const footer = [
    '## Change me',
    'Every `<look:>` line names a real frame: open it, then replace the marker with what you see, never',
    'from memory. `on screen`, `camera` and `type` are always yours to rewrite once looked at. `ground`,',
    '`enters`, `leaves` and the recipe lines are measured off the reference: change them only if you want',
    'a different reference feel, and keep the recipe line syntax (harness/lib/contract.mjs#parseRecipeLine)',
    'so `make assemble` can still read it once this becomes a storyboard.',
  ];
  return [...header, ...body, ...footer].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** buildIdeaPrompt(name, idea, refGrammar?) → the prompt text for `make ideate NAME= IDEA=`. Without
 * `--ref`, a modest default structure (ACTS acts over DUR seconds); with it, the reference's own act
 * count and joint axes are copied as structure, content left to fill (never its content, which would
 * be lifting a real film's copy). */
export function buildIdeaPrompt(name, idea, { dur = 12, actsCount = 4, refGrammar = null } = {}) {
  const acts = refGrammar
    ? buildActs(refGrammar.shots, refGrammar.seams)
    : Array.from({ length: actsCount }, (_, k) => ({ i: k + 1, t0: +((k * dur) / actsCount).toFixed(2), t1: +(((k + 1) * dur) / actsCount).toFixed(2) }));
  const joints = refGrammar ? buildJoints(refGrammar.seams) : acts.slice(0, -1).map((a, k) => ({ t: a.t1, axis: 'x', outAct: k + 1, inAct: k + 2 }));
  const total = refGrammar ? refGrammar.measured.duration : dur;
  const header = [
    `# ${name} · film prompt`,
    '',
    idea ? `the idea: ${idea}` : '<fill: the idea, in one breath>',
    '',
    `duration: ${total}s (fill in)${refGrammar ? ` · structure copied from ${refGrammar.name}` : ''}`,
    '',
  ];
  const body = [];
  acts.forEach((act, k) => {
    body.push(fillActSection(act.i, act.t0, act.t1), '');
    if (k < joints.length) body.push(fillJointSection(joints[k].t), '', ...recipeMenu(), '');
  });
  const footer = ['## Change me', 'Every line is `<fill:>`. Pick a recipe from the menu printed under each joint',
    'instead of inventing a transition; recipes/README.md explains the format and how to add one.'];
  return [...header, ...body, ...footer].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// ── self-test (the pure parts: joints → acts, seam → recipe line) ─────────────────────────────────
function selfTest() {
  const shots = [{ i: 1, t0: 0, len: 4.54, ground: 'light', luma: 209.1, accent: '#def9fe' },
    { i: 2, t0: 4.54, len: 1.46, ground: 'light', luma: 221.1, accent: null }];
  const seams = [{ t: 4.54, gap: 0.1, axis: 'x', direction: 'right-to-left', groundBefore: '#ecefec', groundAfter: '#ebeeeb' }];
  const acts = buildActs(shots, seams);
  assert.equal(acts.length, 2);
  assert.equal(acts[0].t0, 0); assert.equal(acts[0].t1, 4.54); assert.equal(acts[0].entersFrom, null);
  assert.equal(acts[0].leavesTo.t, 4.54);
  assert.equal(acts[1].entersFrom.t, 4.54); assert.equal(acts[1].leavesTo, null);

  const joints = buildJoints(seams);
  assert.equal(joints[0].outAct, 1); assert.equal(joints[0].inAct, 2);
  assert.equal(recipeLineFor(joints[0]), 'flow-seam out=act1 in=act2 axis=x');

  const fakeRecipes = { 'flow-seam': RECIPES['flow-seam'] };
  const menu = recipeMenu(fakeRecipes);
  assert.equal(menu.length, 1);
  assert.match(menu[0], /^- flow-seam \(seam\): /);

  // routing: a seam line always resolves (every joint here is measured), composed cases layer on top,
  // and the two real gaps (a word-by-word exit, marks assembling into letterforms) say so by name.
  assert.equal(routeSeamProse('enter', 'the line enters word by word from the right'), '[recipe: flow-seam + word-by-word]');
  assert.equal(routeSeamProse('leave', 'the sentence slides off left word by word'), '[recipe: flow-seam; unrouted: per-word exit, core/tracks/units.js splits text IN only, no staggered-out]');
  assert.equal(routeSeamProse('enter', 'a tilted window rises from the bottom'), '[recipe: flow-seam]');
  assert.equal(routeSeamProse('enter', 'scattered marks fly in and land as letterforms'), '[recipe: flow-seam; unrouted: marks assembling into letterforms, no named core capability for shape-to-glyph landing]');
  assert.equal(routeSeamProse('enter', null), null);
  assert.equal(routeCameraProse('a slow, continuous dolly-in on the window through the whole act'), '[recipe: window-dolly]');
  assert.equal(routeCameraProse('a slight continuous push on the card stack, steady through each swipe'), '[recipe: window-dolly]');
  assert.equal(routeCameraProse('static hold once the words settle, no push'), null);
  assert.equal(routeCameraProse('<look: 0s to 4.54s, see strip.png>'), null);

  // annotateFilledPrompt: appends brackets, never touches any other text, and is idempotent (a second
  // pass sees the brackets it already wrote and adds nothing more).
  const filled = ['camera: static hold once the words settle, no push',
    'camera: a slow, continuous dolly-in on the window through the whole act',
    'enters: from the right along the x axis (measured, gap 0.1s)',
    'leaves: toward the left along the x axis (measured, gap 0.05s). something unrelated stays untouched',
    'ground: light (measured, luma 209.1)'].join('\n');
  const annotated = annotateFilledPrompt(filled);
  assert.match(annotated, /camera: a slow, continuous dolly-in on the window through the whole act \[recipe: window-dolly\]/);
  assert.match(annotated, /^camera: static hold once the words settle, no push$/m);
  assert.match(annotated, /^ground: light \(measured, luma 209\.1\)$/m);
  assert.equal(annotateFilledPrompt(annotated), annotated, 'a second pass is a no-op');

  // a hard-wrapped entry gets ONE bracket on its LAST line, never mid-sentence on the first.
  const wrapped = ['leaves: the sent prompt bar snaps to a green "sent" pulse, motion-blurs and slides off-frame left as',
    'the window defocuses (measured: x axis, gap 0.1s)',
    'ground: light, #def9fe (measured, luma 209.1)'].join('\n');
  const wrappedOut = annotateFilledPrompt(wrapped).split('\n');
  assert.equal(wrappedOut[0], 'leaves: the sent prompt bar snaps to a green "sent" pulse, motion-blurs and slides off-frame left as');
  assert.equal(wrappedOut[1], 'the window defocuses (measured: x axis, gap 0.1s) [recipe: flow-seam]');

  // "film opens"/"film ends" name no joint at all: no bracket, even though the label matched.
  assert.equal(annotateFilledPrompt('enters: (film opens, no prior joint)'), 'enters: (film opens, no prior joint)');
  assert.equal(annotateFilledPrompt('leaves: (film ends, no next joint; holds on the wordmark)'), 'leaves: (film ends, no next joint; holds on the wordmark)');

  // act 6's letterform landing is named in `on screen:`, not in `enters:` itself; the entry composes
  // with the paragraph above it to catch that.
  const act6 = ['on screen: scattered small coloured marks fly in from below and land as the individual letterforms of "MADERA"',
    'enters: from the bottom along the y axis (measured, gap 0.083s)'].join('\n');
  assert.match(annotateFilledPrompt(act6), /\[recipe: flow-seam; unrouted: marks assembling into letterforms/);

  // wordsFromContent: takes the median of fill/detail/photo across the sampled readings, and reads a
  // quiet type-only act differently from a dense photographic one.
  const quiet = wordsFromContent([{ fill: 0.02, detail: 3, photo: 0 }, { fill: 0.03, detail: 4, photo: 0.01 }]);
  assert.match(quiet, /^content: quiet, type on ground only \(fill 0\.03, detail 4\.0, photo 0\.01\)$/);
  const dense = wordsFromContent([{ fill: 0.34, detail: 12.2, photo: 0.28 }, { fill: 0.3, detail: 11, photo: 0.25 }]);
  assert.match(dense, /^content: dense real material, fills about a third of the frame, photographic \(fill 0\.3\d, detail 1\d\.\d, photo 0\.2\d\)$/);

  // addContentLines: no clip, no lines (never a guess); a clip adds one line per act, once, and a
  // second pass over its own output is a no-op (the same idempotency annotateFilledPrompt already has).
  const twoActs = ['## Act 1 (0s-2s)', 'on screen: a headline', '', '## Act 2 (2s-4s)', 'on screen: a card', ''].join('\n');
  assert.equal(addContentLines(twoActs, null), twoActs);
  const fakeMeasure = () => [{ fill: 0.5, detail: 10, photo: 0.2 }];
  const withContent = addContentLines(twoActs, 'fake.mp4', { measure: fakeMeasure });
  assert.equal((withContent.match(/content:/g) || []).length, 2, 'one content: line per act');
  assert.equal(addContentLines(withContent, 'fake.mp4', { measure: fakeMeasure }), withContent, 'a second pass is a no-op');

  // A stale content: line, from an old content.mjs or hand-filled as the <fill: ...> placeholder, is
  // REPLACED in place, never left beside a second, fresher line for the same act.
  const stale = ['## Act 1 (0s-2s)', 'on screen: a headline', 'content: quiet, type on ground only (fill 0.02, detail 3.0, photo 0.00)', '',
    '## Act 2 (2s-4s)', 'on screen: a card', 'content: <fill: dense or quiet, what real material>', ''].join('\n');
  const refreshed = addContentLines(stale, 'fake.mp4', { measure: fakeMeasure });
  assert.equal((refreshed.match(/content:/g) || []).length, 2, 'still one content: line per act, not two');
  assert.ok(!/quiet, type on ground only/.test(refreshed), 'the stale act 1 reading is gone');
  assert.ok(!/<fill: dense or quiet/.test(refreshed), 'the unfilled act 2 placeholder is gone');
  assert.deepEqual(refreshed.match(/^content:.*$/gm), withContent.match(/^content:.*$/gm),
    'a stale or placeholder content: line refreshes to the same line a bare act would get');

  console.log('ideate.mjs self-test: ok (buildActs, buildJoints, recipeLineFor, recipeMenu, routing, annotateFilledPrompt, content)');
}

/** runFromRef(ref, clipArg, { ask, answersPath }): the `--ref` branch of the CLI, pulled out of main()
 * so main's own complexity stays readable (main dispatches; this owns one path's own checks end to
 * end). `ask`/`answersPath` are the one seam into harness/author/ideate-ask.mjs's detail brief; the
 * logic itself lives there, this only routes to it once the study's own checks above have passed. */
function runFromRef(ref, clipArg, { ask: askFlag, answersPath } = {}) {
  const grammarPath = path.join(ROOT, 'grammar', `${ref}.json`);
  if (!fs.existsSync(grammarPath)) {
    console.error(`ideate: no study for "${ref}" (${path.relative(ROOT, grammarPath)} does not exist).`);
    console.error(`  Run this first: make study VIDEO=refs/_clips/${ref}.mp4 NAME=${ref} STRIPS=3 STRIPFPS=10`);
    process.exit(1);
  }
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
  if (!Array.isArray(grammar.seams) || !grammar.seams.length) {
    console.error(`ideate: ${path.relative(ROOT, grammarPath)} has no measured seams yet. Re-run the study.`);
    process.exit(1);
  }
  // Forward-compat with the fuller-coverage study (refs/<name>/pages*, grammar.coverage.ledger): once
  // a study can say its frame coverage is incomplete, ideate refuses rather than building a prompt off
  // a partial read. Inert today: no study writes `coverage` yet.
  if (grammar.coverage && grammar.coverage.ledger && grammar.coverage.ledger !== 'complete') {
    console.error(`ideate: ${ref}'s coverage ledger is "${grammar.coverage.ledger}", not "complete". Run: make study-check NAME=${ref}`);
    process.exit(1);
  }
  if (askFlag) { console.log(JSON.stringify(ideateAsk(ideateLoadActs({ ref })), null, 2)); return; }
  const clip = resolveClip(ref, clipArg);
  if (!clip) console.error(`  ! no clip found for "${ref}" (checked --clip, refs/_clips/, and the main tree). Every <look:> will point at ffmpeg you run by hand.`);
  const prompt = buildRefPrompt(ref, grammar, clip);
  const out = path.join(ROOT, 'grammar', `${ref}.prompt.md`);
  fs.writeFileSync(out, answersPath ? ideateApplyAnswers(prompt, JSON.parse(fs.readFileSync(answersPath, 'utf8'))) : prompt);
  console.log(`ideate → ${path.relative(ROOT, out)}${answersPath ? ' (answers applied)' : ''}`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }
  const flag = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
  const annotateRef = flag('annotate');
  const ref = flag('ref');
  const name = flag('name');
  const idea = flag('idea');
  const clipArg = flag('clip');
  // ASK/ANSWERS: the detail brief harness/author/ideate-ask.mjs owns (docs/CRAFT/IDEATE.md "asking for
  // detail"). Kept to this one seam so a second writer of the film prompt never grows in this file.
  const askFlag = args.includes('--ask');
  const answersPath = flag('answers');

  if (annotateRef) {
    // Adds routing brackets to an ALREADY-FILLED prompt in place, without going anywhere near the
    // study: no grammar/<ref>.json read, no coverage ledger, no re-run of the reference at all. That
    // is the point: a prompt a person already hand-corrected (commit 01150c25) is text on disk, and
    // this reads that text, appends brackets to three line kinds, and writes it back byte-identical
    // everywhere else. --ref regenerates from the study and would discard the hand-fill; this does not.
    // `content:` lines are set the same way, once per act, from the same clip resolveClip already
    // finds for the <look:> strips; a re-run REPLACES a stale line rather than adding a second one.
    const promptPath = path.join(ROOT, 'grammar', `${annotateRef}.prompt.md`);
    if (!fs.existsSync(promptPath)) {
      console.error(`ideate --annotate: no prompt at ${path.relative(ROOT, promptPath)}.`);
      process.exit(1);
    }
    const before = fs.readFileSync(promptPath, 'utf8');
    const clip = resolveClip(annotateRef, clipArg);
    const after = addContentLines(annotateFilledPrompt(before), clip);
    fs.writeFileSync(promptPath, after);
    console.log(`ideate --annotate → ${path.relative(ROOT, promptPath)}${after === before ? ' (no change)' : ''}`
      + (clip ? '' : ' (no clip found: content: lines skipped, re-run with --clip <file>)'));
    return;
  }

  if (!ref && !name) {
    console.error('usage: node harness/author/ideate.mjs --ref <ref>   |   --name <film> --idea "..." [--ref <ref>]   |   --annotate <ref>');
    process.exit(2);
  }

  if (ref && !name) { runFromRef(ref, clipArg, { ask: askFlag, answersPath }); return; }

  // FROM AN IDEA.
  if (!idea && !ref) { console.error('ideate: --name needs --idea "..." (and optionally --ref <ref> for structure).'); process.exit(2); }
  let refGrammar = null;
  if (ref) {
    const grammarPath = path.join(ROOT, 'grammar', `${ref}.json`);
    if (!fs.existsSync(grammarPath)) {
      console.error(`ideate: --ref ${ref} has no study yet. Run: make study VIDEO=refs/_clips/${ref}.mp4 NAME=${ref} STRIPS=3 STRIPFPS=10`);
      process.exit(1);
    }
    refGrammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
  }
  if (askFlag) { console.log(JSON.stringify(ideateAsk(ideateLoadActs({ ref, name, idea })), null, 2)); return; }
  const prompt = buildIdeaPrompt(name, idea, { refGrammar });
  const out = path.join(ROOT, 'formats/scene', `${name}.prompt.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, answersPath ? ideateApplyAnswers(prompt, JSON.parse(fs.readFileSync(answersPath, 'utf8'))) : prompt);
  console.log(`ideate → ${path.relative(ROOT, out)}${answersPath ? ' (answers applied)' : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
