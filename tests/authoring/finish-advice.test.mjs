// tests/authoring/finish-advice.test.mjs: `finishAdvice` (harness/lib/finish-advice.mjs) is the one
// owner of "should this film be told about `finish` and `glass`", read by both `make stage`/`make
// next` (harness/live/stage-say.mjs) and the design-spec one-pager (harness/author/design-spec.mjs).
// Run: node tests/authoring/finish-advice.test.mjs
import { finishAdvice } from '../../harness/lib/finish-advice.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

// A film with no finish yet gets the tip, at an advised stage.
assert(finishAdvice({ stage: 'design', scene: {}, sbText: null, slug: 'plain-film' }) != null,
  'no finish yet must advise');

// A film that already declares a real finish, and is neither a launch nor a recreation, stays quiet.
assert(finishAdvice({ stage: 'design', scene: { finish: { bloom: true } }, sbText: null, slug: 'plain-film' }) == null,
  'a film that already has a finish, and is not launch/recreation, must not be advised again');

// A recreation slug still advises even with a finish already declared (matches the OR the spec names).
assert(finishAdvice({ stage: 'design', scene: { finish: { bloom: true } }, sbText: null, slug: 'acme-recreation' }) != null,
  'a recreation must be advised regardless of an existing finish');

// A launch slug advises the same way.
assert(finishAdvice({ stage: 'assemble', scene: { finish: { bloom: true } }, sbText: null, slug: 'acme-launch' }) != null,
  'a launch must be advised regardless of an existing finish');

// A storyboard carrying a `### Reference devices` table is a recreation by the same structural signal
// `make study` reads, even when the slug itself says nothing about it.
const refSb = '### Reference devices\n| D1 | a zoom | used |\n\n## Beat 1\n';
assert(finishAdvice({ stage: 'design', scene: { finish: { bloom: true } }, sbText: refSb, slug: 'anything' }) != null,
  'a storyboard with Reference devices must be read as a recreation');

// Never at brief/plan (no scene has been assembled yet) or judge (too late to matter).
assert(finishAdvice({ stage: 'brief', scene: null, sbText: null, slug: 'acme-launch' }) == null,
  'brief stage must stay quiet');
assert(finishAdvice({ stage: 'judge', scene: {}, sbText: null, slug: 'acme-launch' }) == null,
  'judge stage must stay quiet');

console.log('finish-advice.test.mjs: ok');
