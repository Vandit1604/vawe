// core/audio/select.test.mjs: the runnable self-check for resolveAudio()'s two defaults.
// `music:"auto"` still resolves the same way it always did; the new behaviour is that a scene with NO
// `music` key at all defaults to "auto" ONLY when it names a `profile` (docs/MISTAKES.md #159: picking
// a bed with nothing to go on is not a default, it is a guess). An author-placed block, and an
// explicit opt-out, must survive untouched either way.
//   node core/audio/select.test.mjs
import assert from 'node:assert/strict';
import { resolveAudio } from './select.js';

// ---- a profile with no `music` key defaults to "auto" and resolves to that profile's bed ----
{
  const out = resolveAudio({ profile: 'stripe', audio: {} });
  assert.equal(out.music, 'assets/music/lofi.wav', 'profile "stripe" with no music key resolves through the "auto" default');
  assert.equal(out.silent, undefined, 'a resolved bed is not marked silent');
}

// ---- no profile at all: stays untouched, no guessed bed ----
{
  const out = resolveAudio({ audio: {} });
  assert.deepEqual(out, {}, 'no profile, no music key: nothing is defaulted, picking a bed with no input is a guess');
}
{
  const out = resolveAudio({});
  assert.deepEqual(out, {}, 'no scene.audio at all, no profile: still untouched');
}

// ---- a profile that maps to silence (docs/CRAFT/SOUND.md §9: 5 of 8 profiles are bed:null) still
// yields silence, same as an explicit `music:"auto"` on that profile always has ----
{
  const out = resolveAudio({ profile: 'apple', audio: {} });
  assert.equal(out.silent, true, 'profile "apple" has no bed mapped: defaulting to "auto" still yields silence, never a guess');
}

// ---- an author-placed `music` always wins over the profile default, whatever it is ----
{
  const out = resolveAudio({ profile: 'stripe', audio: { music: 'assets/music/beat.wav' } });
  assert.equal(out.music, 'assets/music/beat.wav', 'an explicit music path is never overridden by the profile default');
}

// ---- explicit `music:"auto"` behaves exactly as it always has, profile or not ----
{
  const withProfile = resolveAudio({ profile: 'nike', audio: { music: 'auto' } });
  assert.equal(withProfile.music, 'assets/music/beat.wav', 'explicit "auto" still resolves via the profile');
  const noProfile = resolveAudio({ audio: { music: 'auto' } });
  assert.equal(noProfile.silent, true, 'explicit "auto" with no profile still yields silence, unchanged');
}

// ---- an explicit opt-out (`silent:true`, no music key) is honored, profile or not ----
{
  const out = resolveAudio({ profile: 'stripe', audio: { silent: true, _why: 'autoplays muted' } });
  assert.deepEqual(out, { silent: true, _why: 'autoplays muted' }, 'silent:true with no music key is left alone, never defaulted to "auto"');
}

console.log('✓ select.test.mjs: profile-only default is "auto", authored/opted-out blocks pass through untouched');
