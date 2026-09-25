// harness/author/motion-director.test.mjs: the runnable self-check for the profile lookup in
// resolveFamily(). Bug: `PROFILES[d.profile] || null` silently treated a MISSPELLED profile name the
// same as no profile at all, so a scene opting in to "profile":"appel" got no contradiction checking
// and no error, engine-doctrine/MISTAKES.md's fallback-to-default pattern. Fixed to refuse an unknown profile by
// name; absence (`d.profile` unset) still means "no profile", unchanged.
//   node harness/author/motion-director.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/author/motion-director.mjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-director-test-'));

const scene = (profile) => JSON.stringify({
  module: 'scene', theme: 'default', aspect: '9:16', duration: 4,
  ...(profile !== undefined ? { profile } : {}),
  layers: [{ type: 'text', text: 'hi', x: 100, y: 100, w: 400, size: 40, start: 0, duration: 4 }],
});

const run = (file) => execFileSync('node', [SCRIPT, file], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A misspelled profile must be refused by name, not silently treated as "no profile".
{
  const file = path.join(dir, 'bad-profile.json');
  fs.writeFileSync(file, scene('appel'));
  try {
    run(file);
    assert.fail('a misspelled profile should throw naming the bad value, not fall back to no profile');
  } catch (e) {
    assert.match(String(e.stderr), /unknown profile "appel"/);
  }
}

// A real profile, and no profile at all, both still work.
{
  const file = path.join(dir, 'real-profile.json');
  fs.writeFileSync(file, scene('apple'));
  assert.doesNotThrow(() => run(file));
}
{
  const file = path.join(dir, 'no-profile.json');
  fs.writeFileSync(file, scene(undefined));
  assert.doesNotThrow(() => run(file));
}

fs.rmSync(dir, { recursive: true, force: true });
console.log('ok - harness/author/motion-director: unknown profile refused by name, real/absent profile unaffected');
