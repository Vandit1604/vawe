import test from 'node:test';
import assert from 'node:assert/strict';
import { previousItems, openItems, ledgerPrompt, mergeLedger, ledgerLines, movesBackAndForth } from '../../harness/lib/judge-ledger.mjs';

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

test('each new fix keeps what it changes, its value now and the value asked; the prompt lists them', () => {
  const raw = { fixes: [{ axis: 'hook', fix: 'start the crest low', what: 'crest start height', now: '40% of the height', want: '85% of the height' }] };
  const led = mergeLedger([], raw, [{ axis: 'hook', score: 7, at: 0.1, fix: 'start the crest low' }]);
  assert.deepEqual(led.items[0], { id: 'f1', axis: 'hook', at: 0.1, fix: 'start the crest low', status: 'new', what: 'crest start height', now: '40% of the height', want: '85% of the height' });
  const prompt = ledgerPrompt(openItems(led.items), led.items);
  assert.match(prompt, /- crest start height: f1 now 40% of the height, asked 85% of the height/);
});

test('a target asked back and forth over three rounds prints one stop line; a steady one does not', () => {
  const round = (prev, want, now) => mergeLedger(prev, { ledger: openItems(prev).map((i) => ({ id: i.id, status: 'fixed' })), fixes: [{ axis: 'hook', fix: `crest at ${want}`, what: 'Crest start height', now, want }] },
    [{ axis: 'hook', score: 7, at: 0.1, fix: `crest at ${want}` }]);
  const r1 = round([], '85%', '40%');
  const r2 = round(r1.items, '40%', '85%');
  assert.deepEqual(ledgerLines(r2).slice(1), []);
  const r3 = round(r2.items, '85%', '40%');
  assert.deepEqual(ledgerLines(r3).slice(1), ['stop: keep Crest start height at its current value (40%); the judge varies on this item (asked 85%, 40%, 85% over 3 rounds)']);
  const steady = round(round(round([], '6%', '5%').items, '6.5%', '6%').items, '7%', '6.5%');
  assert.deepEqual(ledgerLines(steady).slice(1), []);
});

test('back and forth: numbers change direction, words return to an earlier value', () => {
  assert.equal(movesBackAndForth(['85%', '40%', '30%']), false);
  assert.equal(movesBackAndForth(['85%', '40%', '30%', '85%']), true);
  assert.equal(movesBackAndForth(['longer hold', 'bigger tagline', 'longer hold']), true);
  assert.equal(movesBackAndForth(['a', 'b']), false);
});
