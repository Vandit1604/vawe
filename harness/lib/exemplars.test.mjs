// harness/lib/exemplars.test.mjs: the runnable self-check for exemplars.mjs. Retrieval and signature
// both read real files under formats/scene, so a change to the goldSet or to those films that breaks a
// caller (preflight's "EXEMPLARS TO STUDY", scaffold's backdrop rhythm) fails here first.
//   node harness/lib/exemplars.test.mjs
import assert from 'node:assert/strict';
import { goldFilms, nearestExemplars, exemplarSignature } from './exemplars.mjs';

const gold = goldFilms();
assert.ok(gold.length >= 1, 'the goldSet names at least one full film');

// A brief that quotes a film's own register ranks that film first, above the others.
const top = nearestExemplars('a white-first saas launch hook to cta', 1)[0];
assert.equal(top.file, 'saas-hero-launch.json', `saas brief should rank saas-hero-launch first, got ${top && top.file}`);
assert.ok(top.score > 0, 'a matching brief scores above zero');

// No feel words: every score is zero and the goldSet order is kept, so a caller with nothing to match
// still gets a stable default rather than nothing.
const blind = nearestExemplars('', 3);
assert.equal(blind.length, Math.min(3, gold.length), 'blind retrieval still returns the goldSet');
assert.ok(blind.every((f) => f.score === 0), 'no feel words means no score');

// The signature carries the backdrop rhythm scaffold imitates: the proudest launch films turn the
// world on many windows, which is the whole point of composing from them.
const sig = exemplarSignature('saas-hero-launch.json');
assert.ok(sig && sig.bgWindows >= 6, `saas-hero-launch turns the world on many windows, got ${sig && sig.bgWindows}`);
assert.ok(sig.bgPresets.length >= 6, 'the presets to cycle are readable');

assert.equal(exemplarSignature('does-not-exist.json'), null, 'a missing film has no signature, not a throw');

console.log(`✓ exemplars.test.mjs: retrieval ranks by feel, falls back stably, and reads the backdrop rhythm`);
