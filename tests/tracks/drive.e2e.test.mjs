// tests/tracks/drive.e2e.test.mjs: the DRIVE fixture, rendered by the real engine in a real browser
// (harness/dev/probe-frame.mjs), not a mock of the track. Proves three things node alone cannot: the
// pipeline actually WIRES `drive` in (a wrong slot or a missing PROPS declaration would render a
// still frame), `link` reads the leader's real motion track through the same composition every other
// track uses, and `loop` cycles the layer's OWN keyframes past the point they end.
//
// tests/fixtures/drive.fixture.json: leader (keyed x), follower (drive.link from leader.x, 0.1s
// delay), wiggler (drive.wiggle on rot), bouncer (a keyed bounce, drive.loop cycle at 1.2s).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { noise } from '../../core/motion/motion.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/drive.fixture.json');

function wiggleAt(t, { freq = 2, amp = 10, seed = 0, octaves = 1 } = {}) {
  let v = 0, a = amp, f = Math.max(0.001, freq);
  const n = Math.max(1, Math.min(6, Math.floor(octaves)));
  for (let o = 0; o < n; o++) { v += (noise(t * f, `${seed}:${o}`) * 2 - 1) * a; f *= 2; a *= 0.5; }
  return v;
}

// translate(dx, dy) or rotate(deg): pulls one number out of the composed transform string this
// track writes, the same way an author reading a devtools inspector would.
const translateX = (s) => Number((/translate\(([-\d.]+)px/.exec(s) || [])[1]);
const rotateDeg = (s) => Number((/rotate\(([-\d.]+)deg/.exec(s) || [])[1]);

function probe(t, ids) {
  const out = execFileSync('node', ['harness/dev/probe-frame.mjs', FIXTURE, '--t', String(t), '--id', ids.join(','), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(out).samples;
}

test('drive: wiggle, link and loop, verified against the real rendered frame', { timeout: 120000 }, () => {
  // wiggle: a seeded rotation, matched bit for bit against the SAME formula the track runs, at the
  // author's own freq/amp/seed.
  const wig = probe(1.6, ['wiggler']);
  const want = wiggleAt(1.6, { freq: 1.5, amp: 2, seed: 'wiggler-rot' });
  assert.ok(Math.abs(rotateDeg(wig.wiggler.dom.styleTransform) - want) < 0.02,
    `wiggler rotate() should track the seeded wiggle formula, got ${wig.wiggler.dom.styleTransform}`);

  // link: the follower's x at t must equal the leader's OWN x at (t - delay), the pick-whip contract.
  // Whatever curve the leader's `motion` track actually resolves to is not this test's business (that
  // is `leader`'s own track); what `link` owes is reading it correctly, delayed.
  const delay = 0.1;
  for (const t of [0.5, 1.7, 2.9]) {
    const atT = probe(t, ['leader', 'follower']);
    const atDelayed = probe(+(t - delay).toFixed(3), ['leader']);
    const leaderDelayed = translateX(atDelayed.leader.dom.styleTransform);
    const followerNow = translateX(atT.follower.dom.styleTransform);
    assert.ok(Math.abs(followerNow - leaderDelayed) < 0.5,
      `follower(${t}) [${followerNow}] should equal leader(${(t - delay).toFixed(3)}) [${leaderDelayed}]`);
  }

  // loop: a keyframed bounce over [0, 1.2] repeats every 1.2s under `cycle`, so a phase and its
  // phase-plus-one-cycle read identical.
  const a1 = probe(0.4, ['bouncer']).bouncer.dom.styleTransform;
  const a2 = probe(1.6, ['bouncer']).bouncer.dom.styleTransform; // 0.4 + one 1.2s cycle
  assert.equal(translateX(a1), translateX(a2), 'a drive.loop cycle repeats the same phase exactly');
  const start = probe(0.02, ['bouncer']).bouncer.dom.styleTransform;
  const oneCycleOn = probe(1.22, ['bouncer']).bouncer.dom.styleTransform;
  assert.ok(Math.abs(translateX(start) - translateX(oneCycleOn)) < 0.5,
    'the cycle restarts at `from` rather than holding on the last key');
});
