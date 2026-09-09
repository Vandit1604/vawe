#!/usr/bin/env node
// quality/gates/legacy-fold.mjs · ONE-TIME (but re-runnable) migration: fold legacy-manifest.json rows
// into the scene's own `authoring.allow` + `_why`, so this repo keeps exactly ONE excuse mechanism.
//
// WHY. Three systems said "this rule does not apply here": `authoring.allow` + `_why` in the scene (a
// person decided, and wrote why), `legacy-manifest.json` (a date says nobody has looked yet), and the
// ratchet engine that read it. Two answers to the same question is drift, and author-check.mjs's own
// doctrine already says which one wins: a decision a person can read and argue with, not a calendar
// entry. This script pays down the manifest's rows into that one shape, then the manifest and the
// ratchet machinery that read it are deleted from author-check.mjs.
//
// For each (rule, scene) row in the manifest:
//   - the scene no longer fires the rule            -> drop the row, nothing to write
//   - the scene already carries a real waiver for it -> drop the row, already covered
//   - otherwise                                      -> write `authoring.allow` + `_why: "legacy: …"`
//
// Scenes are gitignored, so this must be RE-RUNNABLE on a machine that has never run it: it is pure
// data-shape migration, safe to run twice (a scene that already has the entry is left alone).
//
//   node quality/gates/legacy-fold.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { codesEmitted } from '../../harness/lib/finding-codes.mjs';
import { readFindings } from '../../harness/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENE_DIR = path.join(repoRoot, 'formats', 'scene');
const MANIFEST = path.join(repoRoot, 'quality/gates/legacy-manifest.json');
const dryRun = process.argv.includes('--dry-run');

// RATCHET_RULES' pure predicates, copied rather than imported: author-check.mjs is losing this
// mechanism in the same change, so nothing should still depend on it existing there.
const CONTENT_TYPES = new Set(['text', 'image', 'svg', 'html', 'component', 'count', 'doc',
  'lottie', 'video', 'board', 'canvas', 'clip', 'group', 'composition']);
function resolveStoryboard(sceneFile, sceneJson) {
  const declared = typeof sceneJson.storyboard === 'string' ? sceneJson.storyboard
    : (sceneJson.authoring && typeof sceneJson.authoring.storyboard === 'string' ? sceneJson.authoring.storyboard : null);
  const dir = path.dirname(sceneFile), base = path.basename(sceneFile, '.json');
  const candidates = declared
    ? [path.resolve(repoRoot, declared), path.resolve(dir, declared)]
    : [path.join(dir, `${base}.storyboard.md`), path.join(dir, '_concepts', `${base}.storyboard.md`)];
  return candidates.find((p) => fs.existsSync(p)) || null;
}
const PURE_FAILS = {
  'no-storyboard': (f, d) => !resolveStoryboard(f, d),
  'no-authored-motion': (_f, d) => {
    const L = Array.isArray(d && d.layers) ? d.layers : [];
    const joints = (d.cuts || []).length + (d.transitions || []).length + (d.seams || []).length;
    if (joints < 2) return false;
    const content = L.filter((l) => l && CONTENT_TYPES.has(l.type || 'text')).length;
    if (content < 6) return false;
    const keyed = L.some((l) => Array.isArray(l && l.motion) && l.motion.length >= 2);
    const carried = L.some((l) => l && (l.becomes || l.follow || l.acrossBeats));
    return !keyed && !carried;
  },
};

function gateForCode(code) {
  const files = codesEmitted().get(code);
  if (!files) return null;
  const cands = [...files].filter((f) => f !== 'quality/gates/author-check.mjs');
  return cands.find((f) => f.startsWith('quality/gates/')) || cands.find((f) => f.startsWith('harness/author/')) || cands[0] || null;
}
let seq = 0;
const tmpDir = path.join('/tmp/.legacy-fold', String(process.pid));
function codeFiresOn(code, sceneFile) {
  const gate = gateForCode(code);
  if (!gate) return false;
  fs.mkdirSync(tmpDir, { recursive: true });
  const out = path.join(tmpDir, `f-${++seq}.json`);
  spawnSync('node', [path.join(repoRoot, gate), sceneFile], {
    encoding: 'utf8', cwd: repoRoot, timeout: 60000,
    env: { ...process.env, VAWE_FINDINGS_OUT: out },
  });
  const records = readFindings(out) || [];
  return records.some((f) => f.code === code && f.severity !== 'info');
}

// Rules that are being DELETED outright in the same change: nothing to fold, they stop being checked.
const DELETED_RULES = new Set(['sparse-beats']);

// The manifest was deleted in the same change that wrote this script, so a re-run (a machine whose
// gitignored library was not folded yet) reads it from the last commit that carried it.
const MANIFEST_LAST_COMMIT = '49e62765';
const manifestText = fs.existsSync(MANIFEST)
  ? fs.readFileSync(MANIFEST, 'utf8')
  : spawnSync('git', ['show', `${MANIFEST_LAST_COMMIT}:quality/gates/legacy-manifest.json`], { encoding: 'utf8', cwd: repoRoot }).stdout;
if (!manifestText) { console.error('legacy-fold: no manifest on disk and none in git history'); process.exit(2); }
const manifest = JSON.parse(manifestText);
let written = 0, dropped = 0, alreadyCovered = 0, skippedDeleted = 0;
const touched = new Set();

// PRESERVE THE FILE'S OWN INDENT. A handful of these scenes are git-tracked (the site's allowlist), and
// re-serializing with a fixed indent turned a one-key addition into a full-file rewrite in the diff,
// which buries the real change under noise. Detect the indent from the file's own first nested line
// rather than assume one.
function indentOf(raw) {
  const m = raw.match(/^\{\r?\n(\s+)\S/);
  return m ? m[1] : '  ';
}

for (const [rule, entry] of Object.entries(manifest.rules || {})) {
  if (DELETED_RULES.has(rule)) { skippedDeleted += Object.keys(entry.legacy || {}).length; continue; }
  const fails = PURE_FAILS[rule] || ((f) => codeFiresOn(rule, f));
  for (const name of Object.keys(entry.legacy || {})) {
    const file = path.join(SCENE_DIR, `${name}.json`);
    if (!fs.existsSync(file)) { dropped++; continue; }
    const raw = fs.readFileSync(file, 'utf8');
    let scene;
    try { scene = JSON.parse(raw); } catch { dropped++; continue; }
    if (!fails(file, scene)) { dropped++; continue; }
    const allow = new Set((scene.authoring && scene.authoring.allow) || []);
    const why = (scene.authoring && scene.authoring._why) || {};
    if (allow.has(rule) && typeof why[rule] === 'string' && why[rule].trim().length >= 12) {
      alreadyCovered++; continue;
    }
    allow.add(rule);
    why[rule] = `legacy: grandfathered ${entry.legacy[name].since}, adopted ${entry.adopted} (${entry.what})`;
    scene.authoring = { ...(scene.authoring || {}), allow: [...allow], _why: why };
    if (!dryRun) {
      const hadTrailingNewline = raw.endsWith('\n');
      fs.writeFileSync(file, JSON.stringify(scene, null, indentOf(raw)) + (hadTrailingNewline ? '\n' : ''));
    }
    written++;
    touched.add(name);
  }
}

console.log(`legacy-fold: ${written} waiver(s) written across ${touched.size} scene(s)${dryRun ? ' (dry run)' : ''}.`);
console.log(`  ${dropped} row(s) dropped (scene now complies, or was deleted).`);
console.log(`  ${alreadyCovered} row(s) already covered by a real waiver.`);
if (skippedDeleted) console.log(`  ${skippedDeleted} row(s) skipped: their rule (${[...DELETED_RULES].join(', ')}) is being deleted, not folded.`);
