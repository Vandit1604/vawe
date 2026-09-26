// tests/lib/lightfield-edge-falloff.test.mjs: a lightfield dropped into a box smaller than the full
// frame (the documented use, core/lightfield/index.js's own header comment: "a caller drops the
// result into a {type:html} layer") showed that box's edge as a hard rectangle, because the outer
// container's ground fill was a flat colour reaching exactly to its own box (inset:0), while every
// lobe/shade/cell inside it already faded out well before that edge (inset:-4%, its own colour ramp).
// A radial mask on the outer element closes that gap: the ground (and everything inside it) now
// tapers to nothing before the box's own bounds, never a hard edge.
//   node tests/lib/lightfield-edge-falloff.test.mjs
import assert from 'node:assert/strict';
import { lightfield } from '../../core/lightfield/index.js';

function balanced(css) {
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) return false; }
  }
  return depth === 0;
}

const html = lightfield();
assert.match(html, /<style>/, 'lightfield() must return a self-contained fragment with a <style> block');
const css = /<style>([\s\S]*?)<\/style>/.exec(html)[1];

assert.ok(balanced(css), 'the generated CSS must have balanced braces (no rule left open or over-closed)');
assert.match(css, /mask-image:radial-gradient\([^)]*#000 \d+%, transparent 100%\)/,
  'the outer element (ground + everything inside it) must carry a radial edge-fade mask');
assert.match(css, /-webkit-mask-image:radial-gradient/, 'the -webkit- prefixed form must be present too, same gradient');

// The mask lives on the OUTER rule (the ground/container), not one of the inner overscanned layers:
// it is the first rule the <style> block declares, immediately after position/inset/overflow/isolation.
const firstRule = css.trim().split('\n')[0];
assert.match(firstRule, /^\.lf[0-9a-z]+\{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:/,
  `the ground rule must be the outer, unscoped .lf<hash> selector, got: ${firstRule.slice(0, 80)}`);
assert.match(firstRule, /mask-image:/, 'the mask must be on that same outer rule, not a later one');

// Two different option sets (still) produce two different class names, so two fields on one page
// still cannot collide; the mask addition must not have broken that.
const other = lightfield({ colour: { lobes: 5 } });
assert.notEqual(/\.lf[0-9a-z]+/.exec(html)[0], /\.lf[0-9a-z]+/.exec(other)[0],
  'two different option sets must still tag two different class names');

console.log('lightfield-edge-falloff.test.mjs: ok');
