#!/usr/bin/env node
// scripts/gates/craft-checklist.mjs · did this film actually VISIT the CRAFT doctrine relevant to it?
//
// WHY THIS EXISTS. The CRAFT docs (docs/CRAFT/*.md, docs/TASTE.md, docs/MOTION-CRAFT.md) each carry a
// `when:` line that says when to read them, but reading is voluntary and leaves no trace. An author can
// skip DENSITY.md entirely and nothing downstream notices until `make judge` catches the flat beat by
// eye, three renders later. This gate makes the visit CHEAP TO CHECK: it computes a small fixed set of
// FEATURES from the scene itself (does it have images, is it short, does it carry a hard cut), asks
// each doc's `applies-when:` frontmatter whether it is relevant to THIS film, and then checks the
// storyboard sidecar for a one-line answer to that doc's `confirm:` question.
//
// THE ACKNOWLEDGMENT LIVES IN THE PLAN, NOT THE SCENE. The storyboard is where decisions get made
// (docs/CRAFT/STORYBOARD-TEMPLATE.md); the scene JSON is where they get transcribed. So the answer goes
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
//   node scripts/gates/craft-checklist.mjs <scene.json>   ·   make craft-check D=<file>
// Not wired into author-check.mjs yet: standalone until the ladder adopts it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lowerScene } from '../../core/transitions/lower.js';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CRAFT_DIR = path.join(ROOT, 'docs/CRAFT');
// Two docs carry `applies-when:` outside docs/CRAFT/ because that is where they actually live on disk:
// TASTE.md is the front door and MOTION-CRAFT.md the motion mechanics, both indexed by doc-map.mjs
// already from docs/ rather than docs/CRAFT/.
const EXTRA_DOCS = ['docs/TASTE.md', 'docs/MOTION-CRAFT.md'].map((f) => path.join(ROOT, f));

// ---- the feature vocabulary: small, fixed, computed, never free text ---------------------------
function walkLayers(layers, fn) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    fn(L);
    if (Array.isArray(L.children)) walkLayers(L.children, fn);
  }
}

export function computeFeatures(scene) {
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
  return {
    always: true,
    short: Number.isFinite(dur) && dur < 15,
    long: Number.isFinite(dur) && dur >= 15,
    hasImages, hasTextBeats, hasHtml, hasKinetic,
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

// ---- CLI -----------------------------------------------------------------------------------------
function run(file) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  lowerScene(scene);
  const features = computeFeatures(scene);
  const docs = docRegistry();
  const relevant = docs.filter((d) => features[d.appliesWhen] === true);

  const F = gateFindings({
    scene: file,
    line: (r, g) => `    ${g} [${r.code}] ${r.summary}\n        → ${r.fix}`,
  });

  console.log(`\n  craft checklist · ${file}`);

  const sbPath = storyboardPathFor(file);
  if (!fs.existsSync(sbPath)) {
    F.fail('no-plan-for-craft',
      `no storyboard sidecar at ${path.relative(ROOT, sbPath)}, so no craft: answers can exist yet.`,
      { fix: 'Write the plan (docs/CRAFT/STORYBOARD-TEMPLATE.md) before the JSON, then answer each\n' +
        '        relevant doc\'s confirm question under its `craft:` map.' });
    F.emit();
    console.log('\n  ✗ craft checklist: no plan, nothing to check.\n');
    process.exit(1);
  }

  const craft = craftMapFrom(fs.readFileSync(sbPath, 'utf8'));
  let missing = 0;
  for (const d of relevant) {
    const answer = craft[d.slug];
    const answered = typeof answer === 'string' && answer.trim().length > 0;
    if (!answered) {
      missing++;
      F.fail('craft-unvisited',
        `${d.rel}: unanswered, "${d.confirm}"`,
        { fix: `Answer it in ${path.relative(ROOT, sbPath)}'s craft: map:\n` +
          `        craft:\n          ${d.slug}: "<your one-line answer>"`, doc: d.rel });
    }
    console.log(`    ${answered ? '✓' : '✗'} ${d.slug.padEnd(16)} ${d.confirm}`);
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
    console.error('usage: node scripts/gates/craft-checklist.mjs <scene.json>  |  make craft-check D=<file>');
    process.exit(2);
  }
  run(file);
}
