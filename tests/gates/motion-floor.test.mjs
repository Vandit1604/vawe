// node --test tests/gates/motion-floor.test.mjs
//
// The one test that matters here is the NEGATIVE one: a film padded with ambient motion must not pass.
// If it can, the gate is a motion-score generator and every author will reach for `idle` first.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';
import { pairProfile, profile, LOCAL_SHARE, GW, GH } from '../../quality/gates/motion-floor.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');

test('the split itself: a drift is global, a reveal is local, stillness is zero', () => {
  const r = spawnSync('node', [join(here, '../../quality/gates/motion-floor.mjs'), '--self-test'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('a whole-frame drift can never be counted as content', () => {
  const flat = new Uint8Array(GW * GH).fill(120);
  // every cell moves, which is exactly what breathe/drift do to a frame
  const drifted = Uint8Array.from(flat, (v, i) => v + 2 + (i % 3));
  const p = pairProfile(flat, drifted);
  assert.ok(p.amount > 0, 'the drift did move pixels');
  assert.ok(p.share > LOCAL_SHARE, `a drift must read as global, got share ${p.share}`);
  // and the profiler must therefore put every bit of it in `global`
  // n pairs need n+1 frames, so a 6-pair window gets seven.
  const frames = [flat, drifted, flat, drifted, flat, drifted, flat];
  const [w] = profile(frames, { fps: 6, windowS: 1 });
  assert.equal(w.local, 0, 'not one unit of a drift may land in the local column');
  assert.ok(w.global > 0, 'and it must be reported, not discarded');
});

test('a reveal in one region is content, however small', () => {
  const flat = new Uint8Array(GW * GH).fill(120);
  const revealed = Uint8Array.from(flat);
  for (let i = 0; i < 120; i++) revealed[i] = 255;      // ~2% of the frame, a word arriving
  const p = pairProfile(flat, revealed);
  assert.ok(p.share <= LOCAL_SHARE, `a local reveal must read as content, got share ${p.share}`);
});

test('a large uniform block sliding rigidly is not content, even though only its edges change', () => {
  // Interior is the same colour before and after, so the raw share test alone sees only the thin
  // edge sliver and scores it as local (measured: share=0.032, amount=4.72). A whole-frame shift
  // search must catch that the edge is fully explained by translating the block.
  const block = (shiftX) => {
    const f = new Uint8Array(GW * GH).fill(80);
    for (let y = 1; y < GH - 1; y++) for (let x = 1 + shiftX; x < GW - 1 + shiftX; x++) if (x >= 0 && x < GW) f[y * GW + x] = 200;
    return f;
  };
  const p = pairProfile(block(0), block(3));
  assert.ok(p.amount > 0, 'the slide did move pixels');
  assert.ok(p.share > LOCAL_SHARE, `a rigid slide must be reclassified as global, got share ${p.share}`);
});

test('the gate does not crash or block when there is no render', () => {
  const r = spawnSync('node', [join(here, '../../quality/gates/motion-floor.mjs'), 'films/scene/_no-such-film.json'],
    { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, 'a post-render gate must not block a pre-render caller');
  assert.match(r.stdout, /no render/);
});
