import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TASTE_STEPS, tasteLines, draftTasteLines, rulesOf, cardMismatches } from '../../harness/lib/taste-steps.mjs';

const card = fs.readFileSync(new URL('../../engine-doctrine/TASTE-CARD.md', import.meta.url), 'utf8');

test('every printed line quotes its rule row in the taste card and is a contrast pair', () => {
  assert.deepEqual(cardMismatches(card), []);
});

test('a card edit that drops a quoted phrase is caught', () => {
  assert.equal(cardMismatches(card.replace('never a whoosh on every cut', 'a whoosh at will')).length, 1);
});

test('each step prints 5 to 8 lines, each naming its rule', () => {
  for (const step of Object.keys(TASTE_STEPS)) {
    const [header, ...lines] = tasteLines(step);
    assert.match(header, /^taste, .+ \(engine-doctrine\/TASTE-CARD\.md\):$/);
    assert.ok(lines.length >= 5 && lines.length <= 8, `${step}: ${lines.length} lines`);
    for (const l of lines) assert.match(l, /^- .+, not .+ \(rule \d+\)$/);
  }
});

test('draft check problems map to their rules; a clean draft gets the motion step', () => {
  assert.deepEqual([...rulesOf(['world held 0.0-6.5 s (6.5 s)', 'text "x" at 1.0 s: cap height 4.0% of frame (rule 9 asks 6%)', 'sound: -30 LUFS integrated'])].sort((a, b) => a - b), [2, 9, 13]);
  const lines = draftTasteLines(['static window 1-2.5 s (1.5 s)']);
  assert.match(lines[0], /rules behind these problems/);
  assert.ok(lines.slice(1).every((l) => /\(rule 2\)$/.test(l)));
  assert.deepEqual(draftTasteLines([]), tasteLines('motion'));
});
