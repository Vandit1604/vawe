// generators/media/voice-cue.test.mjs: the runnable self-check for voice-cue baking.
//   node generators/media/voice-cue.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveVoiceCue, bakeVoiceCues } from './voice-cue.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-cue-test-'));

// ---- same voice + params -> same cache key, and a REAL byte-identical file on a fresh synth ----
{
  const a = resolveVoiceCue('chime', { freq: 800 }, dir);
  fs.unlinkSync(path.join(dir, `${a}.wav`)); // force a fresh synth, not a cache hit
  const b1 = fs.readFileSync(path.join(dir, `${resolveVoiceCue('chime', { freq: 800 }, dir)}.wav`));
  fs.unlinkSync(path.join(dir, `${a}.wav`));
  const b2 = fs.readFileSync(path.join(dir, `${resolveVoiceCue('chime', { freq: 800 }, dir)}.wav`));
  assert.equal(a, resolveVoiceCue('chime', { freq: 800 }, dir), 'same voice+params resolves to the same cache key');
  assert.deepEqual(b1, b2, 'two independent syntheses of the same voice+params are byte-identical');
}

// ---- a different param value changes the cache key (no collision) ----
{
  const a = resolveVoiceCue('chime', { freq: 800 }, dir);
  const b = resolveVoiceCue('chime', { freq: 900 }, dir);
  assert.notEqual(a, b, 'different params must not share a cache key');
}

// ---- an unknown voice is refused, not silently dropped ----
{
  assert.throws(() => resolveVoiceCue('not-a-real-voice', {}, dir), /not a cue core\/audio\/kit\.mjs can synthesize/);
}

// ---- an unknown param key is refused, not silently ignored ----
{
  assert.throws(() => resolveVoiceCue('chime', { freqency: 800 }, dir), /unknown key/);
}

// ---- bakeVoiceCues adds `_bakedName` in place; `voice`/`params` are left untouched (schema.json's
// `name` enum is a closed list a generated cache key can never join, so it must never land there) ----
{
  const data = { audio: { cues: [{ t: 1, voice: 'pluck', params: { freq: 500 } }, { t: 2, name: 'chime' }] } };
  bakeVoiceCues(data, dir);
  assert.equal(data.audio.cues[0].voice, 'pluck', 'voice survives baking, unchanged');
  assert.deepEqual(data.audio.cues[0].params, { freq: 500 }, 'params survives baking, unchanged');
  assert.ok(fs.existsSync(path.join(dir, `${data.audio.cues[0]._bakedName}.wav`)), '_bakedName names a real file');
  assert.equal(data.audio.cues[1]._bakedName, undefined, 'a plain name cue gets no _bakedName');
  assert.equal(data.audio.cues[1].name, 'chime', 'a plain name cue is untouched');
}

fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ voice-cue.test.mjs: deterministic synthesis, cache-key sensitivity, unknown voice/param refused');
