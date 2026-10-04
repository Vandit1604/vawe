import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TASTE_STEPS, tasteLines, draftTasteLines, rulesOf } from '../../harness/lib/taste-steps.mjs';

const ruleIds = new Set(fs.readdirSync(new URL('../../taste/rules/', import.meta.url)).map((f) => f.replace(/\.md$/, '')));

test('each step prints 5 to 8 lines, each a contrast pair naming an existing rule id', () => {
  for (const step of Object.keys(TASTE_STEPS)) {
    const [header, ...lines] = tasteLines(step);
    assert.match(header, /^taste, .+ \(taste\/build\/CARD\.md\):$/);
    assert.ok(lines.length >= 5 && lines.length <= 8, `${step}: ${lines.length} lines`);
    for (const l of lines) assert.match(l, /^- .+, not .+ \(rule [a-z][a-z0-9-]*\)$/);
    for (const l of TASTE_STEPS[step].lines) assert.ok(ruleIds.has(l.rule), `${step}: no rule ${l.rule}`);
  }
});

test('draft check problems map to rule ids; a clean draft gets the motion step', () => {
  const problems = ['world held 0.0-6.5 s (6.5 s)', 'text "x" at 1.0 s: cap height 4.0% of frame (rule readable-text-size asks 6%)', 'sound: -30 LUFS integrated'];
  assert.deepEqual([...rulesOf(problems)].sort(), ['readable-text-size', 'sound-level', 'world-turns']);
  const lines = draftTasteLines(['static window 1-2.5 s (1.5 s)']);
  assert.match(lines[0], /rules behind these problems/);
  assert.ok(lines.slice(1).every((l) => /\(rule live-hold\)$/.test(l)));
  assert.deepEqual(draftTasteLines([]), tasteLines('motion'));
});
