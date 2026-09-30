import test from 'node:test';
import assert from 'node:assert/strict';
import { previousItems, openItems, ledgerPrompt, mergeLedger, ledgerLines } from '../../harness/lib/judge-ledger.mjs';

const round1 = {
  fixes: [
    { axis: 'type', score: 6, at: 2.1, fix: 'set the tagline at a 6% cap height' },
    { axis: 'pace', score: 7, at: 3.0, fix: 'hold the tagline 1.2 s' },
    { axis: 'motion', score: 6, at: 1.0, fix: 'stagger the words 50 ms' },
    { axis: 'colour', score: 7, at: 0.4, fix: 'one accent only' },
  ],
};

test('a result from before the ledger gives its fixes ids; the prompt lists the open ones', () => {
  const items = previousItems(round1);
  assert.deepEqual(items.map((i) => i.id), ['f1', 'f2', 'f3', 'f4']);
  assert.deepEqual(previousItems(null), []);
  const prompt = ledgerPrompt(openItems(items));
  assert.match(prompt, /- f1 \(type at 2\.1\): set the tagline at a 6% cap height/);
  assert.match(prompt, /"ledger":\[/);
  assert.match(prompt, /"reverses":"<id>" and "why"/);
  assert.equal(ledgerPrompt([]), '');
});

test('the next judge marks every open item before new ones, and new ids continue', () => {
  const prev = previousItems(round1);
  const raw = {
    ledger: [{ id: 'f1', status: 'fixed' }, { id: 'f2', status: 'partly' }, { id: 'f3', status: 'still' }],
    fixes: [{ axis: 'motion', fix: 'f3' }, { axis: 'type', fix: 'make the tagline smaller', reverses: 'f1' }, { axis: 'hook', fix: 'subject by 0.1 s' }],
  };
  const fixes = [{ axis: 'motion', score: 6, at: 1, fix: 'f3' }, { axis: 'type', score: 7, at: 2, fix: 'make the tagline smaller' }, { axis: 'hook', score: 6, at: 0, fix: 'subject by 0.1 s' }];
  const led = mergeLedger(prev, raw, fixes);
  assert.deepEqual(led.counts, { fixed: 1, partly: 1, still: 1, unmarked: 1, new: 2 });
  assert.equal(led.fixes[0].fix, 'f3: stagger the words 50 ms');
  assert.equal(led.fixes[1].fix, 'f5: make the tagline smaller');
  assert.deepEqual(led.items.map((i) => `${i.id} ${i.status}`), ['f1 fixed', 'f2 partly', 'f3 still', 'f4 unmarked', 'f5 new', 'f6 new']);
  const lines = ledgerLines(led);
  assert.equal(lines[0], 'ledger: 1 fixed, 1 partly, 1 still, 1 unmarked; 2 new');
  assert.equal(lines[1], 'reverses f1: no reason given; treat the old fix as standing');
});

test('a fixed item is closed: the next round does not show or count it', () => {
  const led = mergeLedger([{ id: 'f1', axis: 'type', fix: 'x', status: 'fixed' }, { id: 'f2', axis: 'pace', fix: 'y', status: 'still' }], { ledger: [{ id: 'f2', status: 'fixed' }] }, []);
  assert.deepEqual(openItems(led.items), []);
  assert.equal(ledgerLines(led)[0], 'ledger: 1 fixed, 0 partly, 0 still; 0 new');
});
