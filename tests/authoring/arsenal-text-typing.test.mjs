// tests/authoring/arsenal-text-typing.test.mjs: a film agent's friction log searched "typing" for a
// text layer's typewriter reveal, and the arsenal result it read as the answer was `typeOn` (a
// captionStyle, a wholly different vocabulary entry, `core/type/captions.js`), because the `text`
// layer type's own usage line printed only the bare `{"type":"text"}` every other layer type gets,
// even though `text`'s own blurb says "the typewriter reveal and caret live here too". This asserts
// the real fields (`typing`, `caret`) now show in the pasted JSON for that one entry.
//   node tests/authoring/arsenal-text-typing.test.mjs
import assert from 'node:assert/strict';
import { collect, rankQuery, pasteOf } from '../../harness/author/arsenal.mjs';

const all = await collect();
const text = all.find((e) => e.kind === 'layer type' && e.name === 'text');
assert.ok(text, 'expected a "layer type" entry named "text"');
assert.deepEqual(pasteOf(text), { layers: [{ type: 'text', typing: true, caret: true }] },
  'the text layer type\'s pasted JSON must show the real typewriter fields, not the bare type name');

// every OTHER layer type keeps the plain, generic paste: this is a one-entry fix, not a rule change.
const image = all.find((e) => e.kind === 'layer type' && e.name === 'image');
assert.ok(image, 'expected a "layer type" entry named "image"');
assert.deepEqual(pasteOf(image), { layers: [{ type: 'image' }] },
  'an unrelated layer type must not pick up the text-only typing/caret fields');

const { results } = rankQuery(all, 'typing caret', { n: 50 });
const found = results.find((e) => e.kind === 'layer type' && e.name === 'text');
assert.ok(found, 'the "text" layer type must still surface for a "typing caret" query');
assert.match(found.snippet, /"typing": true/, 'the printed snippet an author reads must carry the real field');
assert.match(found.snippet, /"caret": true/, 'the printed snippet an author reads must carry the real field');

console.log('arsenal-text-typing.test.mjs: OK (text layer type\'s usage line names typing+caret)');
