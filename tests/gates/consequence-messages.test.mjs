// tests/gates/consequence-messages.test.mjs: end to end proof that the messages this pass rewrote
// (core/validate/schema-walk.mjs, junctions.mjs, fx-knobs.mjs, layout.mjs, captions.mjs, validate.mjs)
// still fire, through the real CLI (`make check GATE=validate`'s own entry point), and that each one now states a
// CAUSE (the field, with its bad value), a CONSEQUENCE (what happens on screen or to the render), and a
// FIX (the one thing to change) rather than just the bare rule it broke. tests/fixtures/
// consequence-messages.fixture.json is built to be schema-INVALID on purpose, on every rule this test
// checks, never a real film.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const CLI = path.join(ROOT, 'core/validate/validate.mjs');
const fixture = path.join(here, '../fixtures/consequence-messages.fixture.json');

const run = () => spawnSync('node', [CLI, fixture], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });

test('the fixture fails validation (it is deliberately broken)', () => {
  const r = run();
  assert.equal(r.status, 1, r.stdout + r.stderr);
});

// Each row: [a phrase unique to the CAUSE, a phrase that states the CONSEQUENCE, a phrase that states
// the FIX]. All three must appear on the SAME message, so the assertion greps the whole stdout for
// each rather than splitting into per-line matches: any of the three landing in a different finding's
// text would defeat the point of pinning them together, but that failure mode would still show up as
// a missing substring here since no other finding in this fixture repeats the same cause phrase.
const CASES = [
  ['duration is -5, below the minimum', 'refuses to start', 'Raise it to 0.5'],
  ['bg is required', 'engine will not pick it for you', 'Use `"bg"'],
  ['transitions[0] is a string, not an object', 'refuses to start', 'Write it as {"at"'],
  ['seams[0] t is -1, before the video starts', 'refuses to start', 'Set t to 0 or later'],
  ['captions[0] window [2, 1] has t1 <= t0', 'would never draw at any frame', 'Set t1 to a value greater than 2'],
  ['layers[0].fx entry has no name', 'refuses to start', 'write it as a string'],
  ['layers[0].fx "bogusEffect" is not a known effect', 'refuses to start', 'Known effects:'],
  ['aspects."bogus" is not a known canvas ratio', 'never applied and the layer renders with its default props', 'Use one of 16:9'],
  ['aspects."16:9" is a string, not an object of layer props', 'cannot be merged onto the layer', 'Write it as {"x"'],
  ['data.theme is required', 'refuses to start', 'Add "theme"'],
];

for (const [cause, consequence, fix] of CASES) {
  test(`"${cause}" states a consequence and a fix, not just the broken rule`, () => {
    const r = run();
    const out = r.stdout + r.stderr;
    assert.ok(out.includes(cause), `missing cause phrase: ${cause}\n\n${out}`);
    assert.ok(out.includes(consequence), `missing consequence phrase for "${cause}": ${consequence}\n\n${out}`);
    assert.ok(out.includes(fix), `missing fix phrase for "${cause}": ${fix}\n\n${out}`);
  });
}
