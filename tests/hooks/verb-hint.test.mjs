import test from 'node:test';
import assert from 'node:assert/strict';
import { hintFor, recentlyNamed } from '../../harness/live/verb-hint.mjs';

const id = (cmd) => hintFor(cmd)?.id ?? null;

test('a screenshot script or a headless chrome shot points at vawe shot', () => {
  assert.equal(id("node -e \"const pp=require('puppeteer');pp.launch()\""), 'shot');
  assert.equal(id('"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=/tmp/a.png http://localhost:3055/'), 'shot');
});

test('a curl status loop points at vawe check links', () => {
  assert.equal(id('for u in /blog /moves; do curl -s -o /dev/null -w "%{http_code}\\n" localhost:3100$u; done'), 'links');
});

test('a sleep loop on a render points at vawe wait', () => {
  assert.equal(id('until grep -q "vawe: dev" out/x.log; do sleep 10; done'), 'wait');
  assert.equal(id('ps aux | grep render-page | wc -l'), 'wait');
});

test('an ffmpeg contact sheet and an ffmpeg frame grab point at sheet and still', () => {
  assert.equal(id('ffmpeg -i out/a.mp4 -vf "select=\'not(mod(n\\,30))\',scale=640:-1,tile=4x3" -frames:v 1 s.png'), 'sheet');
  assert.equal(id('ffmpeg -v error -y -ss 1.8 -i out/a.mp4 -frames:v 1 f.png'), 'still');
});

test('a vawe command and an unrelated command get no advice', () => {
  assert.equal(id('bin/vawe sheet out/a.mp4 --at 1,2'), null);
  assert.equal(id('git status --short'), null);
  assert.equal(id('ffmpeg -i a.wav -af loudnorm b.wav'), null);
});

test('a verb is named once in the window and again after it', () => {
  assert.equal(recentlyNamed({ shot: 1000 }, 'shot', 1000 + 60000), true);
  assert.equal(recentlyNamed({ shot: 1000 }, 'shot', 1000 + 31 * 60 * 1000), false);
  assert.equal(recentlyNamed({}, 'shot', 5), false);
});
