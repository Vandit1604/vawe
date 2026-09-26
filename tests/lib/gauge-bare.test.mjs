// tests/lib/gauge-bare.test.mjs: `gauge` (blocks/charts.mjs) was card-scale only, a fixed small arc
// boxed in htmlCard's chrome, so a film that wanted a full-frame dial with a needle had to hand-draw
// one in svg instead. `bare: true` drops the card and scales the arc/needle/ticks to the given w/h;
// card mode (the default) must render byte-identical to before this change.
//   node tests/lib/gauge-bare.test.mjs
import assert from 'node:assert/strict';
import { gauge } from '../../blocks/charts.mjs';

// Card mode (no options besides the pre-existing ones): the <svg> tag itself must carry no `height`
// attribute and keep the original centring margin, exactly as before `bare` existed.
{
  const [L] = gauge({ x: 0, y: 0, w: 300, value: 42, max: 100, label: 'test', color: '#ff5500' });
  assert.equal(L.type, 'html');
  assert.ok(!('h' in L), 'card mode must not set a layer height, same as before');
  const svgTag = /<svg[^>]*>/.exec(L.html)[0];
  assert.ok(!svgTag.includes('height='), `card-mode svg must carry no height attribute, got: ${svgTag}`);
  assert.match(svgTag, /style="display:block;margin:0 auto 4px"/, 'card-mode svg must keep its original centring margin');
}

// bare: true drops the card entirely (no background/border/shadow chrome) and sizes the svg to w×h.
{
  const [L] = gauge({ x: 10, y: 20, w: 600, h: 360, value: 72, max: 100, color: '#22ccff', bare: true });
  assert.equal(L.w, 600);
  assert.equal(L.h, 360);
  assert.ok(!L.html.includes('box-shadow'), 'bare mode must carry no card chrome');
  assert.match(L.html, /<svg viewBox="0 0 100 60" width="600" height="360"/, 'bare svg must be sized to the given w/h');
}

// bare with no h derives one from w (matches the arc's own 100:60 aspect), never throws.
{
  const [L] = gauge({ x: 0, y: 0, w: 500, value: 10, bare: true });
  assert.equal(L.h, Math.round(500 * 0.6));
}

// needle: a live pointer, rotated off the same --p the arc's dasharray reads, so it always agrees
// with wherever the arc has swept to.
{
  const [L] = gauge({ x: 0, y: 0, w: 400, value: 30, max: 100, bare: true, needle: true });
  assert.match(L.html, /transform:rotate\(calc\(-90deg \+ var\(--p, 0\.3000\) \* 180deg\)\)/,
    'the needle must rotate off var(--p), the same variable the arc\'s dasharray reads');
}

// ticks: N radial marks, none when omitted or zero.
{
  const bare = gauge({ x: 0, y: 0, w: 400, value: 50, bare: true })[0].html;
  const withTicks = gauge({ x: 0, y: 0, w: 400, value: 50, bare: true, ticks: 5 })[0].html;
  assert.equal((bare.match(/<line/g) || []).length, 0, 'no ticks/needle requested: no <line> at all');
  assert.equal((withTicks.match(/<line/g) || []).length, 5, 'ticks: 5 must draw exactly 5 radial marks');
}

// glow: a drop-shadow filter on the coloured arc, never the track behind it.
{
  const [L] = gauge({ x: 0, y: 0, w: 400, value: 50, bare: true, glow: true, color: '#ff2fd0' });
  assert.match(L.html, /filter="drop-shadow\(0 0 \d+px #ff2fd0\)"/, 'glow must add a drop-shadow filter naming the reading colour');
}

console.log('gauge-bare.test.mjs: ok');
