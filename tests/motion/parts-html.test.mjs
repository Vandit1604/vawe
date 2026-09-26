// tests/motion/parts-html.test.mjs: HTML-first timing (core/motion/parts.js lowerHtmlParts /
// applyHtmlPartsSugar). data-part-* on an element in a hand-authored `html` fragment lowers into the
// exact same `parts` array a hand-written JSON entry would be: one mechanism, two spellings.
//   node tests/motion/parts-html.test.mjs
import assert from 'node:assert/strict';
import { lowerHtmlParts, applyHtmlPartsSugar } from '../../core/motion/parts.js';
import { expandScene } from '../../core/engine/expand.js';

const html = '<div class="hf-card">'
  + '<h1 data-part-anim="riseIn" data-part-start="0.4" data-part-dur="0.6" data-part-ease="expo.out" data-part-stagger="0.05">Fast to ship</h1>'
  + '<p data-part-anim="fade" data-part-start="0.8">No JSON parts array written by hand.</p>'
  + '</div>';

// ---- lowered parts match a HAND-WRITTEN parts[] entry byte for byte (same keys, same order) ----
{
  const handWritten = [
    {
      select: '[data-part-anim="riseIn"][data-part-start="0.4"][data-part-dur="0.6"][data-part-ease="expo.out"][data-part-stagger="0.05"]',
      anim: 'riseIn', delay: 0.4, each: 0.6, ease: 'expo.out', stagger: 0.05,
    },
    { select: '[data-part-anim="fade"][data-part-start="0.8"]', anim: 'fade', delay: 0.8 },
  ];
  const lowered = lowerHtmlParts(html);
  assert.equal(JSON.stringify(lowered), JSON.stringify(handWritten),
    'a data-part-* element must lower to exactly the object a hand-authored parts[] entry would be, byte for byte');
}

// ---- no data-part-anim anywhere: not a part entrance, parts stays empty ----
{
  assert.deepEqual(lowerHtmlParts('<div><h1 data-part>plain marker, no anim</h1></div>'), []);
  assert.deepEqual(lowerHtmlParts('<div>no data attributes at all</div>'), []);
}

// ---- an unknown anim name refuses with a "did you mean" suggestion (PART_REGISTRY.pick), same as any other vocabulary ----
{
  assert.throws(() => lowerHtmlParts('<h1 data-part-anim="riseup">x</h1>'), /unknown part entrance "riseup".*did you mean "riseIn"/s);
}

// ---- applyHtmlPartsSugar: JSON `parts` WINS ON CONFLICT, the html attributes are never consulted ----
{
  const L = { type: 'html', html, parts: [{ select: 'h1', anim: 'fade' }] };
  const out = applyHtmlPartsSugar(L);
  assert.equal(out, L, 'a layer that already authors `parts` in JSON must pass through unchanged, same object');
  assert.deepEqual(out.parts, [{ select: 'h1', anim: 'fade' }]);
}

// ---- applyHtmlPartsSugar: no parts, no data-part-anim -> unchanged (an ordinary html layer, no cost) ----
{
  const L = { type: 'html', html: '<div>plain</div>' };
  assert.equal(applyHtmlPartsSugar(L), L);
}

// ---- wired into expandScene (core/engine/expand.js), the Node loader every gate and script reads ----
{
  const data = {
    module: 'scene', layers: [{ id: 'card', type: 'html', x: 0, y: 0, w: 100, start: 0, duration: 1, html }],
  };
  const expanded = expandScene(data);
  assert.equal(expanded.layers[0].parts.length, 2, 'expandScene must lower the fragment\'s data-part-* attributes into layers[0].parts');
  assert.equal(expanded.layers[0].parts[0].anim, 'riseIn');
}

console.log('✓ parts-html.test.mjs: data-part-* lowers to the same parts[] a hand-authored entry would be, JSON wins on conflict, unknown names refuse with a suggestion');
