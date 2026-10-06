import test from 'node:test';
import assert from 'node:assert/strict';
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { sizeLines, capLines, holdLines, anchorLines, anchorResult } from '../../harness/lib/judge-prompt.mjs';

test('the prompt states each image size and what 6% is in that image', () => {
  const text = sizeLines([{ label: 'the sheet', w: 2880, h: 630, tile: 288 }, { label: 'key frame 1', w: 960, h: 540 }]).join('\n');
  assert.match(text, /percent of the frame height/);
  assert.match(text, /never with a 1080 px figure/);
  assert.match(text, /the sheet is 2880x630 px and each tile is 288 px wide: too small to measure type/);
  assert.match(text, /key frame 1 is 960x540 px: 1% of its height is 5\.4 px, so a 6% cap height is 32 px tall here/);
  assert.deepEqual(sizeLines([]), []);
});

test('the measured cap heights come in as facts, smallest first, and only the smallest few', () => {
  const caps = Array.from({ length: 10 }, (_, i) => ({ text: `line ${i}`, cap: 10 - i * 0.5, t: i }));
  const lines = capLines(caps);
  assert.match(lines[0], /exact, read from the page/);
  assert.equal(lines.length, 9);
  assert.equal(lines[1], '- "line 9" at 9.0 s: cap height 5.5%');
  assert.deepEqual(capLines([]), []);
});

test('the judge reads the readable-hold numbers of limits.json, so it cannot ask for a hold the check rejects', () => {
  const hold = LIMITS['readable-hold'];
  const [text] = holdLines();
  assert.ok(text.includes(`at least ${hold.hold_floor_s} s`));
  assert.ok(text.includes(`words x ${hold.prose_s_per_word} s`));
  assert.ok(text.includes(`words / ${hold.short_words_per_s}`));
  assert.ok(text.includes(`at most ${hold.ceiling_s} s`));
  assert.ok(text.includes('6 tiles on the 5 fps sheet'));
});

test('the anchor question is the same binary question for a reference, a brief and neither', () => {
  const keys = [{ t: 0.4 }, { t: 1.2 }, { t: 2 }];
  for (const kind of ['reference', 'brief', 'none']) {
    const text = anchorLines({ kind }, keys).join('\n');
    assert.match(text, /is this frame at least as beautiful and polished as the anchor, at full size\?/);
    assert.match(text, /A NO needs the exact fix/);
  }
  assert.match(anchorLines({ kind: 'reference' }, keys).join('\n'), /the reference film/);
  assert.match(anchorLines({ kind: 'brief' }, keys).join('\n'), /LOOK section/);
});

test('anchorResult keeps one entry per key frame and treats a missing or vague answer as NO', () => {
  const keys = [{ t: 0.4 }, { t: 1.2 }, { t: 2 }];
  const out = anchorResult([{ frame: 'Key 1', yes: true }, { frame: 'key 2', yes: false, fix: 'lift .bg to #111' }], keys);
  assert.deepEqual(out.map((a) => [a.frame, a.yes]), [['key 1', true], ['key 2', false], ['key 3', false]]);
  assert.equal(out[1].fix, 'lift .bg to #111');
  assert.match(out[2].fix, /no answer/);
  assert.ok(anchorResult(undefined, keys).every((a) => !a.yes));
});
