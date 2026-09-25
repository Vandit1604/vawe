// tests/authoring/resolve-range.test.mjs: beat/join -> film-time range resolution, plus tempo scaling and
// the refusal cases. node tests/authoring/resolve-range.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveBeat, resolveJoin } from '../../harness/lib/resolve-range.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-range-'));
const film = path.join(dir, 'v.json');
const sb = path.join(dir, 'v.storyboard.md');

const SB = `---
message: "test film"
audience: "ci"
arc: "hook -> build -> payoff"
duration: 9s
pace: "held"
---

## Beat 1: Hook (0s-3s)
- type: hook

## Beat 2: Build (3s-6s)
- type: build

## Beat 3: Payoff (6s-9s)
- type: payoff
`;

function write(data) {
  fs.writeFileSync(film, JSON.stringify(data));
  fs.writeFileSync(sb, SB);
}

// no tempo: beat and join resolve at their authored times, padded.
write({ module: 'scene', duration: 9 });
{
  const { from, to } = resolveBeat(film, 2); // by number
  assert.ok(Math.abs(from - (3 - 0.4)) < 1e-6 && Math.abs(to - (6 + 0.4)) < 1e-6, `beat 2 by number: got ${from}-${to}`);
}
{
  const { from, to } = resolveBeat(film, 'build'); // by name
  assert.ok(Math.abs(from - 2.6) < 1e-6 && Math.abs(to - 6.4) < 1e-6, `beat by name: got ${from}-${to}`);
}
{
  const { from, to } = resolveJoin(film, 1); // seam between beat 1 and 2, at t=3
  assert.ok(Math.abs(from - (3 - 0.8)) < 1e-6 && Math.abs(to - (3 + 0.8)) < 1e-6, `join 1: got ${from}-${to}`);
}

// tempo 0.5 (half speed): every authored time doubles (inv = 1/0.5 = 2).
write({ module: 'scene', duration: 9, tempo: 0.5 });
{
  const { from, to } = resolveBeat(film, 1);
  assert.ok(Math.abs(from - 0) < 1e-6, `tempo'd beat 1 start clamps to 0, got ${from}`);
  assert.ok(Math.abs(to - (6 + 0.4)) < 1e-6, `tempo'd beat 1 end (3s*2 + pad): got ${to}`);
}

// clamping: a beat at the very end pads past the film's own duration and must clamp, not overshoot.
write({ module: 'scene', duration: 9 });
{
  const { to } = resolveBeat(film, 3);
  assert.equal(to, 9, `last beat's padded end must clamp to the film duration, got ${to}`);
}

// refusals: an unknown beat name, and a join number outside 1..beats.length-1.
assert.throws(() => resolveBeat(film, 'nonexistent'), /no beat matches/);
assert.throws(() => resolveJoin(film, 3), /needs a beat number/); // only 2 joins exist (1, 2)
assert.throws(() => resolveJoin(film, 0), /needs a beat number/);

fs.rmSync(dir, { recursive: true, force: true });
console.log('resolve-range.test.mjs: ok');
