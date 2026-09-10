// harness/lib/code-fires.mjs: does a finding code still genuinely fire on a scene, RIGHT NOW?
//
// One question, one owner. `quality/gates/legacy-fold.mjs` asked it to decide whether a manifest row
// was still real before writing a waiver; `quality/gates/legacy-unfold.mjs` asks it in reverse, to
// measure the debt left behind after deleting one; `quality/gates/waiver-drift.mjs --ratchet` asks it
// to check that debt has not grown back. Three callers had started copying the same ~20 lines; this is
// the one place it lives.
//
// Two codes (`no-storyboard`, `no-authored-motion`) are emitted only from inside author-check.mjs,
// which cannot be spawned to check its own waiver (it would just read the waiver and skip the check).
// PURE_FAILS re-implements their pure predicate for exactly those two codes; every other code is
// checked by spawning the real gate that owns it and reading what it actually finds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { codesEmitted } from './finding-codes.mjs';
import { readFindings } from './findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

export function gateForCode(code) {
  const files = codesEmitted().get(code);
  if (!files) return null;
  const cands = [...files].filter((f) => f !== 'quality/gates/author-check.mjs');
  return cands.find((f) => f.startsWith('quality/gates/')) || cands.find((f) => f.startsWith('harness/author/')) || cands[0] || null;
}

let seq = 0;
const tmpDir = path.join('/tmp/.code-fires', String(process.pid));

/** Does `code` still fire on `sceneFile`? Reads `sceneJson` if the caller already parsed it. */
export function codeFiresOn(code, sceneFile, sceneJson) {
  if (PURE_FAILS[code]) {
    const d = sceneJson || JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
    return PURE_FAILS[code](sceneFile, d);
  }
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
