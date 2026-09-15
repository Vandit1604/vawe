#!/usr/bin/env node
// quality/gates/craft-checklist.mjs · did this film actually VISIT the CRAFT doctrine relevant to it?
//
// WHY THIS EXISTS. The CRAFT docs (engine-doctrine/CRAFT/*.md, engine-doctrine/TASTE.md, engine-doctrine/MOTION-CRAFT.md) each carry a
// `when:` line that says when to read them, but reading is voluntary and leaves no trace. An author can
// skip DENSITY.md entirely and nothing downstream notices until `make judge` catches the flat beat by
// eye, three renders later. This gate makes the visit CHEAP TO CHECK: it computes a small fixed set of
// FEATURES from the scene itself (does it have images, is it short, does it carry a hard cut), asks
// each doc's `applies-when:` frontmatter whether it is relevant to THIS film, and then checks the
// storyboard sidecar for a one-line answer to that doc's `confirm:` question.
//
// THE ACKNOWLEDGMENT LIVES IN THE PLAN, NOT THE SCENE. The storyboard is where decisions get made
// (engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md); the scene JSON is where they get transcribed. So the answer goes
// in `<scene-basename>.storyboard.md`'s frontmatter, under a `craft:` map keyed by doc slug:
//
//     craft:
//       density: "each beat carries a hero image, a support line and a metadata chip"
//       layout: "hero sits on the left third, off-center; support type fills the remainder"
//
// A doc is RELEVANT when its `applies-when:` feature is true for this scene. A relevant doc with no
// entry, or an empty one, in the storyboard's `craft:` map is `craft-unvisited`. This gate does not
// judge whether the answer is GOOD, the same restraint storyboard-check takes with `spectacle:`/`not:`:
// a fabricated one-liner defeats it, and a gate that pretended to grade prose would manufacture verdicts.
// What it can hold an author to is whether the decision was written down at all.
//
//   node quality/gates/craft-checklist.mjs <scene.json>   ·   make craft-check D=<file>
// Wired into author-check.mjs (HARD_CODES, ~line 152): `craft-unvisited` blocks a ship.
//
// A DOC ADDED TODAY MUST NOT RETROACTIVELY BLOCK A FILM APPROVED BEFORE IT EXISTED. A doc is relevant
// only if its `applies-when:`/`confirm:` frontmatter existed at the time the film's storyboard was
// approved (`approved:` frontmatter). A doc whose `confirm:` line first appeared, in git history, AFTER
// that date is reported as `craft-new-doc` (info, never blocks): the author could not have answered a
// question that did not exist yet. An unapproved film (no `approved:`), or a doc git cannot date, gets
// every applicable doc as always: without a real timestamp on both sides there is nothing to compare.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { frontmatter as sbFrontmatter, blocksOf, fieldIn } from '../../harness/author/storyboard-parse.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CRAFT_DIR = path.join(ROOT, 'engine-doctrine/CRAFT');
// Two docs carry `applies-when:` outside engine-doctrine/CRAFT/ because that is where they actually live on disk:
// TASTE.md is the front door and MOTION-CRAFT.md the motion mechanics, both indexed by doc-map.mjs
// already from engine-doctrine/ rather than engine-doctrine/CRAFT/.
const EXTRA_DOCS = ['engine-doctrine/TASTE.md', 'engine-doctrine/MOTION-CRAFT.md'].map((f) => path.join(ROOT, f));

// ---- the feature vocabulary: small, fixed, computed, never free text ---------------------------
function walkLayers(layers, fn) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    fn(L);
    if (Array.isArray(L.children)) walkLayers(L.children, fn);
  }
}

// A "product screen" is the specific `hasHtml` case SCREENS.md is actually about (an editor, a results
// grid, a dashboard, a chat, a card, per `make screen KIND=`), not any hand-authored fragment: a title
// card or a kinetic-type beat is also `html` and SCREENS.md's confirm question ("does the screen fill
// most of the frame…") does not apply to either. There is no structural flag for this on the layer
// (engine-doctrine/CRAFT/SCREENS.md is answered by an author, not computed), so the same noun vocabulary
// storyboard-check.mjs already uses for its `plain-content` warning (CONTENT_NOUN_RE) is reused here,
// scoped the SAME WAY that check scopes it: per beat, over the fields a beat actually describes its
// picture in (`onscreen`/`picture`/`mechanism`/`object`), never the whole storyboard's prose. A whole-
// text scan matched "ui" inside unrelated sentences (a craft note mentioning "ui-skills") and made
// CONTENT.md fire on 32 of 41 films instead of the handful that actually plan a screen; measured,
// then scoped to beats the same way storyboard-check.mjs already had to learn this.
const SCREEN_NOUN_RE = /\b(screen|editor|dashboard|grid|chat|card|window|ui)\b/i;
function beatNamesScreen(storyboardText) {
  for (const b of blocksOf(storyboardText)) {
    const text = ['onscreen', 'picture', 'mechanism', 'object'].map((k) => fieldIn(b, k) || '').join(' ');
    if (SCREEN_NOUN_RE.test(text)) return true;
  }
  return false;
}

export function computeFeatures(scene, storyboardText) {
  const dur = Number(scene?.duration ?? scene?.dur);
  let hasImages = false, hasTextBeats = false, hasHtml = false, hasKinetic = false;
  walkLayers(scene?.layers, (L) => {
    if (L.type === 'image') hasImages = true;
    if (L.type === 'html') hasHtml = true;
    if (L.type === 'text') {
      const t = L.text ?? L.value;
      if (typeof t === 'string' && t.trim()) hasTextBeats = true;
      if (L.split && L.preset) hasKinetic = true;
    }
  });
  const boundaries = (scene?.cuts?.length || 0) + (scene?.seams?.length || 0)
    + (scene?.stings?.length || 0) + (scene?.transitions?.length || 0);
  const a = (scene && typeof scene.audio === 'object' && scene.audio) || null;
  const silent = !a || a.silent === true;
  const hasAudio = !silent && !!((typeof a.music === 'string' && a.music)
    || (typeof a.vo === 'string' && a.vo) || a.auto === true
    || (Array.isArray(a.cues) && a.cues.length > 0));
  // No storyboard yet to read (unplanned film): keep the broad, conservative reading so an unapproved
  // film still gets every applicable doc, exactly as it did before this feature existed.
  const hasProductScreen = hasHtml && (storyboardText == null || beatNamesScreen(storyboardText));
  return {
    always: true,
    short: Number.isFinite(dur) && dur < 15,
    long: Number.isFinite(dur) && dur >= 15,
    hasImages, hasTextBeats, hasHtml, hasKinetic,
    hasProductScreen,
    hasBoundaries: boundaries >= 1,
    hasAudio,
    silent,
  };
}

// ---- frontmatter: a flat parser (matches doc-map.mjs), plus a nested reader for `craft:` ----------
function frontmatterBlock(text) {
  if (!text.startsWith('---\n')) return '';
  const end = text.indexOf('\n---', 3);
  return end < 0 ? '' : text.slice(4, end);
}

function unquote(v) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function flatFields(block) {
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m || !m[2].trim()) continue;
    out[m[1]] = unquote(m[2]);
  }
  return out;
}

/** The `craft:` map in a storyboard's frontmatter: docSlug -> the author's one-line answer. */
export function craftMapFrom(storyboardText) {
  const block = frontmatterBlock(storyboardText);
  const lines = block.split('\n');
  const start = lines.findIndex((l) => /^craft:\s*$/.test(l));
  if (start < 0) return {};
  const map = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s+\S/.test(line)) break; // dedent (or blank) ends the nested block
    const m = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) map[m[1].toLowerCase()] = unquote(m[2]);
  }
  return map;
}

/** Every CRAFT doc that declares `applies-when:` + `confirm:`, keyed by slug (filename, no .md, lowercase). */
export function docRegistry() {
  const craftFiles = fs.existsSync(CRAFT_DIR)
    ? fs.readdirSync(CRAFT_DIR).filter((f) => f.endsWith('.md')).map((f) => path.join(CRAFT_DIR, f))
    : [];
  const docs = [];
  for (const abs of [...craftFiles, ...EXTRA_DOCS]) {
    if (!fs.existsSync(abs)) continue;
    const fields = flatFields(frontmatterBlock(fs.readFileSync(abs, 'utf8')));
    if (!fields['applies-when']) continue;
    docs.push({
      slug: path.basename(abs, '.md').toLowerCase(),
      rel: path.relative(ROOT, abs),
      appliesWhen: fields['applies-when'],
      confirm: fields.confirm || '(no confirm question written)',
    });
  }
  return docs.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function storyboardPathFor(sceneFile) {
  const dir = path.dirname(sceneFile);
  const base = path.basename(sceneFile).replace(/\.json$/, '');
  return path.join(dir, `${base}.storyboard.md`);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// git-dates a doc's `confirm:` line, cached per process so a run over the whole library (the measure
// harness, or lib-test.mjs) shells out once per doc, not once per doc per film.
const docDateCache = new Map();
export function docConfirmDate(rel) {
  if (docDateCache.has(rel)) return docDateCache.get(rel);
  let date = null;
  try {
    // -S finds commits that CHANGE the string's occurrence count, i.e. add or remove a `confirm:` line;
    // --format=%cs is the committer date, YYYY-MM-DD; oldest-first ([-1]) is the line's first appearance.
    const out = execFileSync('git', ['log', '--format=%cs', '--follow', '-S', 'confirm:', '--', rel],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    const dates = out ? out.split('\n') : [];
    if (dates.length) date = dates[dates.length - 1];
  } catch { /* no git, or no history for this path: date stays null, caller falls back to blocking */ }
  docDateCache.set(rel, date);
  return date;
}

// ---- CLI -----------------------------------------------------------------------------------------
function run(file) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  loadScene(scene);

  // NO SEPARATE "no plan" CODE. This used to fail its own `no-plan-for-craft` here, checking only the
  // sibling-file naming convention (not a scene's declared `storyboard` field, so it could fire on a
  // scene the main ladder's own `no-storyboard` step already considered planned) and exiting before a
  // single relevant doc was even listed. Measured: it fired on 83% of the library with zero waivers
  // anywhere, because nobody had a lever to pull, the ladder's `no-storyboard` step already owns "does
  // this film have a plan" and blocks on it. With no storyboard the craft map is simply empty, so every
  // relevant doc reads as unanswered below, which `craft-unvisited` already measures correctly.
  const sbPath = storyboardPathFor(file);
  const storyboardText = fs.existsSync(sbPath) ? fs.readFileSync(sbPath, 'utf8') : null;
  const features = computeFeatures(scene, storyboardText);
  const docs = docRegistry();
  const relevant = docs.filter((d) => features[d.appliesWhen] === true);

  const F = gateFindings({
    scene: file,
    line: (r, g) => `    ${g} [${r.code}] ${r.summary}` + (r.fix ? `\n        → ${r.fix}` : ''),
  });

  console.log(`\n  craft checklist · ${file}`);

  const craft = storyboardText ? craftMapFrom(storyboardText) : {};
  const approvedRaw = storyboardText ? sbFrontmatter(storyboardText).field('approved') : null;
  const approvedDate = approvedRaw && ISO_DATE_RE.test(approvedRaw) ? approvedRaw : null;
  if (storyboardText && !approvedDate) {
    console.log('    (no dated `approved:` on this storyboard: every relevant doc applies, as always)');
  }

  let missing = 0;
  for (const d of relevant) {
    const answer = craft[d.slug];
    const answered = typeof answer === 'string' && answer.trim().length > 0;
    if (answered) { console.log(`    ✓ ${d.slug.padEnd(16)} ${d.confirm}`); continue; }

    // A doc added AFTER this film's approval could not have been answered when the plan was signed
    // off: report it, don't block a film for missing a question that did not exist yet. Both dates are
    // day-granularity (git's %cs, the storyboard's `approved:`), so a doc committed the SAME DAY as the
    // approval cannot be proven to have existed before it; that tie goes to `>=`, i.e. treated as new.
    // Measured against the actual case this fix exists for: vawe-flow approved 2026-09-10, CONTENT.md's
    // `confirm:` line landed the same day. A same-day false "new doc" excuses a question for one day at
    // most; the failure this gate exists to prevent, a doc silently re-blocking already-approved work,
    // has no such ceiling, so the tie favours not blocking.
    let newDoc = false;
    if (approvedDate) {
      const docDate = docConfirmDate(d.rel);
      if (docDate) newDoc = docDate >= approvedDate;
      else console.log(`    (no git history dates ${d.rel}'s confirm: line: treating it as pre-existing)`);
    }

    if (newDoc) {
      F.note('craft-new-doc',
        `${d.rel}: added after this film's approval (${approvedDate}), not required, "${d.confirm}"`,
        { doc: d.rel });
      console.log(`    · ${d.slug.padEnd(16)} (new since approval) ${d.confirm}`);
    } else {
      missing++;
      F.fail('craft-unvisited',
        `${d.rel}: unanswered, "${d.confirm}"`,
        { fix: `Answer it in ${path.relative(ROOT, sbPath)}'s craft: map:\n` +
          `        craft:\n          ${d.slug}: "<your one-line answer>"`, doc: d.rel });
      console.log(`    ✗ ${d.slug.padEnd(16)} ${d.confirm}`);
    }
  }
  if (!relevant.length) console.log('    (no CRAFT doc is relevant to this scene)');

  if (missing) {
    F.emit();
    console.log(`\n  ✗ craft checklist: ${missing} of ${relevant.length} relevant doc(s) unanswered.\n`);
    process.exit(1);
  }
  F.emit();
  console.log(`\n  ✓ craft checklist: all ${relevant.length} relevant doc(s) answered.\n`);
  process.exit(0);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!file || !fs.existsSync(file)) {
    console.error('usage: node quality/gates/craft-checklist.mjs <scene.json>  |  make craft-check D=<file>');
    process.exit(2);
  }
  run(file);
}
