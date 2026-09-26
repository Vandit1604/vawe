// tests/gates/drive-wiggle-validate.test.mjs: `drive.wiggle` (core/tracks/drive.js) already threw a
// clear error naming `prop` and the valid values, but only from frame(), called per RENDERED FRAME. A
// film agent's friction log wrote a wiggle spec with no `prop` and only found out deep into `make dev`,
// after frames had already been spent on it: the constraint fired "only after the fact". validateData
// (core/validate/validate.mjs, via core/validate/drive.mjs) now asks the SAME question at validate
// time, before any frame renders, reusing drive.js's own PROPS_DRIVEN rather than a second copy of it.
//   node tests/gates/drive-wiggle-validate.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateData } from '../../core/validate/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const noProp = fixture('tests/fixtures/drive-wiggle-no-prop.fixture.json');
const errs = validateData({ fields: {} }, noProp);
assert.ok(errs.some((e) => /drive\.wiggle\.prop must be one of x, y, rot, got undefined/.test(e)),
  `expected a drive.wiggle.prop error at validate time; got ${JSON.stringify(errs)}`);

// a wiggle with a real prop must stay clean, so this is a check on the missing field, not on wiggle itself.
const withProp = JSON.parse(JSON.stringify(noProp));
withProp.layers[0].drive.wiggle.prop = 'rot';
const clean = validateData({ fields: {} }, withProp);
assert.ok(!clean.some((e) => e.includes('drive.wiggle')), `a valid wiggle must not be flagged; got ${JSON.stringify(clean)}`);

console.log('drive-wiggle-validate.test.mjs: OK (a wiggle missing `prop` is caught at validate time)');
