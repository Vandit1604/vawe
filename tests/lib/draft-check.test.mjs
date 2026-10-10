import test from 'node:test';
import assert from 'node:assert/strict';
import { outlierCues, uniformShift, balanceLines } from '../../harness/lib/cue-balance.mjs';
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
  assert.equal(soundLine(-27.4), 'sound: -27 LUFS integrated (subtle target about -20; add the cue the picture lacks, or raise the one cue that carries the moment)');
  assert.match(soundLine(-12), /lower the loudest cue/);
});

test('soundLine with a level reads the cues against each other: a shift of every data-gain is never the fix', () => {
  assert.match(soundLine(-25.7, undefined, { I: -25.7, TP: -12 }), /^sound: -26 LUFS integrated \(subtle target about -20; the mix is 6 dB under the target; add the cue the picture lacks.*Moving every data-gain by the same dB changes the loudness and fixes nothing\)$/);
  const cues = [{ name: 'tap', at: 1, peakDb: -9, role: 'sfx' }, { name: 'impact', at: 2.4, peakDb: -1, role: 'sfx' }, { name: 'tick', at: 3, peakDb: -10, role: 'sfx' }];
  assert.match(soundLine(-14, undefined, { I: -14, TP: -1, cues }), /the mix is 6 dB over the target; cue "impact" at 2\.4 s peaks 8 dB above the rest \(-1 vs -9 dB\): lower its data-gain by 8/);
  assert.match(soundLine(-12, undefined, { I: -12, TP: -5 }), /8 dB over the target; lower the loudest cue/);
});

test('cue balance: a uniform data-gain shift is named, one cue out of balance is named by its distance', () => {
  const cue = (name, gain, defaultGain, peakDb) => ({ name, at: 1, peakDb, gain, gainSet: true, defaultGain });
  const shifted = [cue('tap', 0, -3, -12), cue('tick', 0, -5, -14), cue('air', -2, -5, -14)];
  assert.deepEqual(outlierCues(shifted), []);
  assert.equal(uniformShift([cue('tap', -3, -3, -12), cue('tick', 3, -5, -14)]), null);
  assert.match(balanceLines([cue('tap', 3, 0, -12), cue('tick', 3, 0, -14), cue('air', 3, 0, -14)]).at(-1), /^all 3 cues carry data-gain \+3 dB from their voice defaults/);
  assert.equal(uniformShift([{ ...cue('a', 0, 0, -12), gainSet: false }, cue('b', 4, 0, -12)]), null);
  assert.equal(uniformShift([cue('a', 2, 0, -12), cue('b', 2, 0, -12)]), null, 'under the minimum shift');
  assert.match(balanceLines([cue('a', -3, -3, -12), cue('b', -3, -3, -12), cue('c', -3, -3, -22)])[0], /cue "c" at 1 s peaks 10 dB below the rest \(-22 vs -12 dB\): raise its data-gain by 10/);
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

test('textProblems: UI that is the subject is held to 3%, and a film\'s declared rules replace the floors', () => {
  const ui = (t) => ({ t, lines: [{ text: 'Start', fontPx: 40, ui: true }] });
  assert.deepEqual(textProblems([ui(1), ui(1.5)], dim), []);
  const small = (t) => ({ t, lines: [{ text: 'Start', fontPx: 20, ui: true }] });
  assert.match(textProblems([small(1), small(1.5)], dim)[0], /cap height 2\.6% .* asks 3%/);
  const declared = { ...dim, rules: { capFrac: 0.04, uiCapFrac: 0.05, chromeCapFrac: 0.025, capOfFont: 0.7, holdSec: 0.5 } };
  assert.match(textProblems([ui(1), ui(1.5)].map((x) => ({ ...x, lines: [{ ...x.lines[0], fontPx: 30 }] })), declared)[0], /asks 5%/);
});
