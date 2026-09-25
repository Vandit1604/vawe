// node tests/hooks/scene-live.test.mjs
//
// Feeds real films through the real hook, exactly as Claude Code's PostToolUse does (stdin JSON,
// stderr on exit 2). No cases are typed by hand here: every film named below is a real, once-shipped
// scene, frozen as a snapshot under tests/fixtures/films/ (never read live from films/scene/, which
// is real film content this suite must not depend on, and two of the five were never even tracked
// there), and every suggestion the hook makes about it is checked against that film's own JSON,
// never against a hand-typed case that could drift from it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const HOOK = join(here, '../../harness/live', 'scene-live.mjs');

function run(rel) {
  const abs = path.join(ROOT, rel);
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { file_path: abs } }),
    encoding: 'utf8',
    env: { ...process.env, VAWE_HOOK_FULL: '1', VAWE_FILMS_DIR: 'tests/fixtures/films' },   // assert against the full text, not the summary
  });
  return { status: r.status, out: r.stderr };
}

let bad = 0;
const check = (label, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) bad++; };

// --- higgsfield-recreation.json: one bg window, silent with no _why. Both should fire. ---
{
  const rel = 'tests/fixtures/films/higgsfield-recreation.json';
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const usedPresets = new Set((Array.isArray(j.bg) ? j.bg : (j.bg ? [j.bg] : [])).map((b) => b && b.preset).filter(Boolean));
  const { status, out } = run(rel);
  check('higgsfield: exits 2 (finding, never blocks)', status === 2);
  check('higgsfield: names the bg-window number', /one bg window/.test(out));
  // Every preset the finding suggests must be a REAL preset name this film does NOT already use.
  const named = [...out.matchAll(/`([a-zA-Z]+)` \(/g)].map((m) => m[1]);
  const presetsModule = await import('../../core/backgrounds/presets.js');
  const realNames = new Set(presetsModule.PRESETS.map((p) => p.name));
  const suggested = named.filter((n) => realNames.has(n));
  check('higgsfield: suggests at least one real preset', suggested.length > 0);
  check('higgsfield: every suggested preset is real and unused by this film',
    suggested.every((n) => realNames.has(n) && !usedPresets.has(n)));
  check('higgsfield: names the audio._why gap', /audio\.silent.*no `_why`/.test(out));

  const { out: out2 } = run(rel);
  check('higgsfield: stable across two runs', out === out2);
}

// --- linear-launch.json: low pictorial share, zero hand-keyed motion, one bg window. ---
{
  const rel = 'tests/fixtures/films/linear-launch.json';
  const { status, out } = run(rel);
  check('linear-launch: exits 2', status === 2);
  check('linear-launch: names the hand-keyed gap', /no hand-keyed motion track/.test(out));
  // The two named candidates must be real layers of THIS film (matched by id, text snippet, or
  // type@start), so the suggestion is never a layer the film does not have.
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const names = new Set((j.layers || []).map((L) => L.id
    || (typeof L.text === 'string' && L.text.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24))
    || `${L.type}@${L.start ?? 0}s`));
  const candidateLine = out.split('\n').find((l) => l.includes('candidates from THIS film'));
  const quoted = candidateLine ? [...candidateLine.matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
  check('linear-launch: names at least one motion candidate', quoted.length > 0);
  check('linear-launch: every named candidate is a real layer in this film', quoted.every((n) => names.has(n)));
}

// --- brew-launch-act1.json: the film CLAUDE.md holds up as the counter-example. Only the audio ---
// finding should fire; pictorial/bg/motion are all above the library's own bar.
{
  const rel = 'tests/fixtures/films/brew-launch-act1.json';
  const { status, out } = run(rel);
  check('brew-launch-act1: still exits 2 (audio._why gap)', status === 2);
  check('brew-launch-act1: stays silent on pictorial (46% is well above the median)', !/% pictorial \(/.test(out));
  check('brew-launch-act1: stays silent on bg windows (6 windows)', !/bg window for the whole runtime/.test(out));
  check('brew-launch-act1: stays silent on hand-keyed motion', !/no hand-keyed motion track/.test(out));
}

// --- vawe-flow-2.json: real film, real bug. Two of its audio.cues[].t are plain numbers sitting
// close to a layer arrival (the exact shape that shipped 1118ms and 765ms early). The hook should
// name each one and offer a real relative-time reference back to a real layer id in this film. ---
{
  const rel = 'tests/fixtures/films/vawe-flow-2.json';
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const ids = new Set();
  (function walk(ls) { for (const L of ls || []) { if (L && L.id) ids.add(L.id); walk(L.children); walk(L.layers); } })(j.layers);
  const { status, out } = run(rel);
  check('vawe-flow-2: exits 2 (numeric-cue finding)', status === 2);
  check('vawe-flow-2: names the numeric-cue gap', /plain number/.test(out));
  const refs = [...out.matchAll(/-> "t": "([^"]+)"/g)].map((m) => m[1]);
  check('vawe-flow-2: names at least one replacement reference', refs.length > 0);
  check('vawe-flow-2: every replacement references a real layer id in this film',
    refs.every((r) => ids.has(r.replace(/\.end/, '').replace(/[+-][\d.]+$/, ''))));
}

// --- post-corva.json: already has every sidecar wired. A film doing fine gets silence. ---
{
  const rel = 'tests/fixtures/films/post-corva.json';
  const { status } = run(rel);
  check('post-corva: silent (exit 0), the reward for a film doing fine', status === 0);
}

console.log(bad === 0 ? '\nall checks correct' : `\n${bad} check(s) WRONG`);
process.exit(bad === 0 ? 0 : 1);
