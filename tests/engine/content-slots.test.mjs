// tests/engine/content-slots.test.mjs: no string-templating mechanism existed for swapping copy or an
// asset path across customers/languages/versions (`vars`, on a layer or a theme, drives an animated
// CSS custom property over TIME, a different job; a fragment slot is a whole HTML file, not a value).
// `content` is the smallest one: a flat {key: value} map, `{{key}}` inside a layer's own
// `text`/`html`/`src` (any nesting depth) resolved once at build (core/engine/expand.js
// resolveContentSlots), with a named error for an unknown key, both at build and at `make check GATE=validate`
// (core/validate/content.mjs contentSlotErrors, the same scan, read-only).
//   node --test tests/engine/content-slots.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { expandScene } from '../../core/engine/expand.js';
import { contentSlotErrors } from '../../core/validate/content.mjs';

test('a {{key}} in text/html/src is replaced from `content`, and `content` itself is stripped', () => {
  const out = expandScene({
    module: 'scene',
    content: { brand: 'Acme', cta: 'Get started', logo: 'assets/acme-logo.png' },
    layers: [
      { type: 'text', text: 'Welcome to {{brand}}', start: 0, duration: 3 },
      { type: 'html', html: '<button>{{cta}}</button>', start: 0, duration: 3 },
      { type: 'image', src: '{{logo}}', start: 0, duration: 3 },
    ],
  });
  assert.equal(out.layers[0].text, 'Welcome to Acme');
  assert.equal(out.layers[1].html, '<button>Get started</button>');
  assert.equal(out.layers[2].src, 'assets/acme-logo.png');
  assert.equal(out.content, undefined);
});

test('a nested group child’s text is resolved too, at any depth', () => {
  const out = expandScene({
    module: 'scene',
    content: { name: 'Acme' },
    layers: [{ type: 'group', children: [{ type: 'text', text: 'by {{name}}' }] }],
  });
  assert.equal(out.layers[0].children[0].text, 'by Acme');
});

test('an unknown key throws at build, naming the key and the field', () => {
  assert.throws(() => expandScene({
    module: 'scene', content: { brand: 'Acme' },
    layers: [{ type: 'text', text: 'Welcome to {{brnad}}' }],
  }), /layers\[0\]\.text references content key "brnad"/);
});

test('a scene with no `content` at all passes through untouched', () => {
  const out = expandScene({ module: 'scene', layers: [{ type: 'text', text: 'plain text' }] });
  assert.equal(out.layers[0].text, 'plain text');
});

test('validate: the same unknown-key mistake is caught pre-render, without mutating the scene', () => {
  const scene = { content: { brand: 'Acme' }, layers: [{ type: 'text', text: 'Welcome to {{brnad}}' }] };
  const errs = contentSlotErrors(scene);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /content key "brnad"/);
  assert.deepEqual(scene.content, { brand: 'Acme' }); // untouched: validate never rewrites what it grades
});

test('validate: the real key is clean', () => {
  assert.deepEqual(contentSlotErrors({ content: { brand: 'Acme' }, layers: [{ type: 'text', text: 'Welcome to {{brand}}' }] }), []);
});
