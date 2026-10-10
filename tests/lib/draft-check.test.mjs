import test from 'node:test';
import assert from 'node:assert/strict';
import { hiddenTextLines, TEXTURE, sampleTimes, frameUnitLines, textProblems, soundLine, mergeProblems, draftCheckLines, draftAdvice, briefLine } from '../../harness/lib/draft-check.mjs';

const at = (t, ...lines) => ({ t, lines: lines.map(([text, fontPx]) => ({ text, fontPx })) });
const dim = { step: 0.5, frameH: 540 };

test('sampleTimes: 10 samples for a 5 s film, capped at 40', () => {
  const s = sampleTimes(5);
  assert.equal(s.times.length, 10);
  assert.equal(s.times[0], 0.25);
  assert.equal(sampleTimes(120).times.length, 40);
});

test('textProblems: small text held 1 s is named with its cap height', () => {
  const out = textProblems([at(3.25, ['Light, after dark', 30]), at(3.75, ['Light, after dark', 30])], dim);
  assert.deepEqual(out, ['text "Light, after dark" at 3.3 s: cap height 3.9% of frame (rule readable-text-size asks 6%)']);
});

test('textProblems: text at 6% or more passes', () => {
  assert.deepEqual(textProblems([at(1, ['Big', 48]), at(1.5, ['Big', 48])], dim), []);
});

test('textProblems: a flash under 0.5 s is not a read', () => {
  const fine = { step: 0.25, frameH: 540 };
  assert.deepEqual(textProblems([at(1, ['tiny', 20]), at(1.25, ['other', 100])], fine), []);
});

test('textProblems: smallest first, and the smallest size in a run is the one reported', () => {
  const out = textProblems([at(1, ['A', 30], ['B', 15]), at(1.5, ['A', 20], ['B', 15]), at(2, ['B', 15])], dim);
  assert.match(out[0], /^text "B" at 1.0 s: cap height 1.9%/);
  assert.match(out[1], /^text "A" at 1\.5 s: cap height 2\.6%/);
});

test('textProblems: a text that leaves and returns is two runs, the long one counts', () => {
  const out = textProblems([at(1, ['X', 20]), at(2, ['gap', 90]), at(3, ['X', 20]), at(3.5, ['X', 20])], dim);
  assert.equal(out.length, 1);
});

test('soundLine: silent inside -24 to -16, a fix outside', () => {
  assert.equal(soundLine(null), null);
  assert.equal(soundLine(-20), null);
  assert.equal(soundLine(-27.4), 'sound: -27 LUFS integrated (subtle target about -20; raise data-gain on the quiet cues)');
  assert.match(soundLine(-12), /lower data-gain on the loud cues/);
});

test('soundLine with a level names the dB for every data-gain, and the loudest cue when the peak then passes the limit', () => {
  assert.match(soundLine(-25.7, undefined, { I: -25.7, TP: -12 }), /^sound: -26 LUFS integrated \(subtle target about -20; change every data-gain by \+6 dB, or remove the gains to use the voice defaults \(they land near -20 LUFS\)\)$/);
  const cues = [{ name: 'tap', at: 1, peakDb: -9 }, { name: 'impact', at: 2.4, peakDb: -5 }];
  assert.match(soundLine(-27.4, undefined, { I: -27.4, TP: -8, cues }), /by \+7 dB.*peak then reaches -1\.0 dBTP \(limit -3\), so lower the loudest cue "impact" at 2\.4 s by 2 dB more/);
  assert.match(soundLine(-12, undefined, { I: -12, TP: -5 }), /by -8 dB/);
});

test('mergeProblems: alternates the two lists and stops at 4', () => {
  assert.deepEqual(mergeProblems(['v1', 'v2', 'v3'], ['t1', 't2', 't3']), ['v1', 't1', 'v2', 't2']);
  assert.deepEqual(mergeProblems([], ['t1']), ['t1']);
});

test('draftCheckLines: clean, or each line as advice and an end line that says the render went on', () => {
  assert.deepEqual(draftCheckLines(draftAdvice([], null)), ['draft check: no problems found']);
  assert.deepEqual(draftCheckLines(draftAdvice(['a'], 'sound: x')), ['draft check:', 'advice: a', 'advice: sound: x', '(advice only: the render continued)']);
});

test('the brief line names a missing brief and a template brief, and stays quiet on a written one', () => {
  assert.match(briefLine(null), /no brief.md/);
  assert.match(briefLine('- a [unanswered: default taken]\n- b [unanswered: default taken]\n- c [unanswered: default taken]'), /template defaults/);
  assert.equal(briefLine('- Subject: a made-up brand\n- Length: 5 s'), null);
});

test('a brief with answered inputs and a few kept defaults is not the template', () => {
  const answered = '## Inputs\n\n- Subject: a made-up brand\n- Length: 5 s\n- Music: synth cues [unanswered: default taken]\n\n## Sound\n- a [unanswered: default taken]\n- b [unanswered: default taken]\n';
  assert.equal(briefLine(answered), null);
  const template = '## Inputs\n\n- URL: x [unanswered: default taken]\n- Promise: y [unanswered: default taken]\n';
  assert.match(briefLine(template), /template defaults/);
});

test('textProblems: text in data-chrome has a 2.5% floor; plain text keeps 6%', () => {
  const chrome = (cap) => ({ t: 1, lines: [{ text: 'Inbox', fontPx: (cap * 540) / 0.7, chrome: true }] });
  const held = (s) => [s, { ...s, t: 1.5 }];
  assert.deepEqual(textProblems(held(chrome(0.03)), dim), []);
  assert.match(textProblems(held(chrome(0.02)), dim)[0], /cap height 2\.0% of frame \(rule readable-text-size asks 2\.5%\)/);
  assert.equal(textProblems([at(1, ['Inbox', 30]), at(1.5, ['Inbox', 30])], dim).length, 1);
});

test('frameUnitLines: a font taller than the frame or under 0.2% of it names the --vh mistake', () => {
  const [line] = frameUnitLines([at(1, ['Big', 54000], ['ok', 40])], dim);
  assert.match(line, /"Big" is 54000\.0 px in a frame 540 px tall/);
  assert.match(line, /--vh is the frame height in px; use calc\(var\(--vh\) \* 0\.08\) for 8%/);
  assert.equal(frameUnitLines([at(1, ['dot', 0.4])], dim).length, 1);
  assert.deepEqual(frameUnitLines([at(1, ['fine', 40], ['huge', 500])], dim), []);
});

test('hidden text: copy under aria-hidden is named with its count, a page that hides most of its text is told the share', () => {
  const [reads] = hiddenTextLines({ total: 72, marked: 48, reads: 6, sample: ['Quarterly total', 'Invoices'] });
  assert.match(reads, /^6 of 72 text nodes carry aria-hidden or data-chrome but read as copy \("Quarterly total", "Invoices"\)/);
  assert.match(reads, /data-texture="why"/);
  const most = hiddenTextLines({ total: 72, marked: 48, reads: 0, sample: [] });
  assert.equal(most.length, 1);
  assert.match(most[0], /^48 of 72 text nodes are exempt from the text checks as texture, over 50% of the page/);
  assert.deepEqual(hiddenTextLines({ total: 72, marked: 20, reads: 0, sample: [] }), []);
  assert.deepEqual(hiddenTextLines(null), []);
  assert.equal(TEXTURE.repeatsMin, 3);
});
