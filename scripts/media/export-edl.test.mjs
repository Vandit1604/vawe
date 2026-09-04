// scripts/media/export-edl.test.mjs: house-rule self-check, no framework.
//   node scripts/media/export-edl.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'scripts/media/export-edl.mjs');

const scene = {
  module: 'scene',
  duration: 6,
  layers: [{ type: 'text', id: 'hook', start: 0, duration: 6, text: 'hello world' }],
  // raw cuts, not the `transitions` sugar: sugar validates its fx name against the live registry,
  // which this tiny fixture has no business depending on.
  cuts: [{ t: 2, style: 'cut' }, { t: 4, style: 'cut' }],
  audio: { silent: true },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'export-edl-'));
const scenePath = path.join(tmp, 'tiny.json');
fs.writeFileSync(scenePath, JSON.stringify(scene));

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

execFileSync('node', [SCRIPT, scenePath], { cwd: ROOT, encoding: 'utf8' });
const shots = JSON.parse(fs.readFileSync(path.join(tmp, 'tiny.shots.json'), 'utf8'));
assert(shots.shots.length === 3, `expected 3 shots, got ${shots.shots.length}`);
assert(shots.duration === 6, 'duration must round-trip');

const edl1 = fs.readFileSync(path.join(tmp, 'tiny.edl'), 'utf8');
assert(edl1.includes('00:00:02:00'), '2.0s must convert to 00:00:02:00');

// re-run must be byte-identical: same scene in, same sidecars out.
const shotsBytes1 = fs.readFileSync(path.join(tmp, 'tiny.shots.json'));
execFileSync('node', [SCRIPT, scenePath], { cwd: ROOT, encoding: 'utf8' });
const shotsBytes2 = fs.readFileSync(path.join(tmp, 'tiny.shots.json'));
const edl2 = fs.readFileSync(path.join(tmp, 'tiny.edl'), 'utf8');
assert(Buffer.compare(shotsBytes1, shotsBytes2) === 0, 'shots.json must be byte-identical on re-run');
assert(edl1 === edl2, 'edl must be byte-identical on re-run');

// input JSON on disk must be untouched (pure, read-only).
const original = fs.readFileSync(scenePath, 'utf8');
assert(JSON.parse(original).duration === 6, 'input scene must not be mutated');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('export-edl.test.mjs: all checks passed');
