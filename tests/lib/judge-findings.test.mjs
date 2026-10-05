import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cardQuestions, findingsPrompt, readFindings, ruleCoverage, findingsEvent, SAMENESS_QUESTION, TEMPLATE_QUESTION } from '../../harness/lib/judge-findings.mjs';
import { siblingFilms } from '../../harness/lib/judge-siblings.mjs';
import { reportLines } from '../../harness/lib/judge-report.mjs';
import { previousItems, openItems, ledgerPrompt, mergeLedger, ledgerLines } from '../../harness/lib/judge-ledger.mjs';
import { judgeEvent } from '../../harness/lib/run-events.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const CARD = fs.readFileSync(path.join(repoRoot, 'taste/build/CARD.md'), 'utf8');
const IDS = fs.readdirSync(path.join(repoRoot, 'taste/rules')).map((f) => f.replace(/\.md$/, ''));
const declared = { signature: { band: 'gravity', ease: 'settle' }, waivers: [{ code: 'attractor', why: 'the ring is the idea' }], message: 'onsen turns up the colour' };

test('one question per scored rule, grouped by step, read from the card', () => {
  const qs = cardQuestions(CARD);
  const scored = Number(/(\d+) scored by the judge/.exec(fs.readFileSync(path.join(repoRoot, 'taste/README.md'), 'utf8'))[1]);
  assert.equal(qs.length, scored);
  assert.ok(qs.every((q) => IDS.includes(q.id) && q.question));
  assert.deepEqual(qs.slice(0, 2).map((q) => [q.step, q.id]), [['concept', 'attractors'], ['concept', 'show-real-thing']]);
});

test('the findings prompt holds the questions, the declared choices, the thumbnails and the two finding questions', () => {
  const text = findingsPrompt({ card: CARD, declared, siblings: [{ name: 'brindle', file: '/t/sibling-1-brindle.png' }] });
  assert.match(text, /Answer "unknown" when you cannot see it/);
  assert.match(text, /concept:\n- attractors: Is the hero an attractor the direction did not choose\?/);
  assert.match(text, /band=gravity; ease=settle/);
  assert.match(text, /do not mark a value down for being what it is/);
  assert.match(text, /The film's message: onsen turns up the colour/);
  assert.match(text, /- attractor: the ring is the idea/);
  assert.match(text, /say if the break is earned/);
  assert.match(text, /- brindle: \/t\/sibling-1-brindle\.png/);
  assert.ok(text.includes(SAMENESS_QUESTION));
  assert.ok(text.includes(TEMPLATE_QUESTION));
  assert.match(text, /"rule":"<id>"/);
});

test('more than 2 waivers must be named in the report; 2 or fewer need no such line', () => {
  const many = { ...declared, waivers: ['a', 'b', 'c'].map((code) => ({ code, why: 'long enough reason' })) };
  assert.match(findingsPrompt({ card: CARD, declared: many, siblings: [] }), /3 waivers, more than 2: name every one of them/);
  assert.doesNotMatch(findingsPrompt({ card: CARD, declared, siblings: [] }), /name every one of them/);
  assert.match(findingsPrompt({ card: CARD, declared: { signature: {}, waivers: [], message: null }, siblings: [] }), /Waivers: none\./);
});

const raw = {
  notes: [{ rule: 'first-frame', t: '0.1', verdict: 'fail', note: 'empty ground' }, { rule: 'made-up-rule', t: 2, verdict: 'unknown', note: 'cannot see' }, { rule: 'sameness', t: 1, verdict: 'fail', note: 'same ring' }],
  waivers: [{ code: 'attractor', earned: true, why: 'the ring is the idea' }],
  sameness: { sibling: true, films: ['brindle'], shared: 'the ring' },
  template: { tell: false, t: null, why: null },
};

test('parsing keeps rule ids, drops an id that does not exist to null and keeps the seconds', () => {
  const f = readFindings(raw, IDS);
  assert.deepEqual(f.notes.map((n) => [n.rule, n.t, n.verdict]), [['first-frame', 0.1, 'fail'], [null, 2, 'unknown'], ['sameness', 1, 'fail']]);
  assert.deepEqual(f.waivers, [{ code: 'attractor', earned: true, why: 'the ring is the idea' }]);
  assert.deepEqual(f.sameness, { sibling: true, films: ['brindle'], shared: 'the ring' });
  assert.deepEqual(readFindings({}, IDS), { notes: [], waivers: [], sameness: null, template: null });
  assert.deepEqual(ruleCoverage({ fixes: [{ rule: 'hierarchy' }, { rule: null }], notes: f.notes }), { total: 5, ruled: 3 });
});

test('the report prints the rule id next to each fix and the findings after them', () => {
  const f = readFindings(raw, IDS);
  const lines = reportLines({ stage: 'draft', verdict: 'FIX', scores: { hook: 6 }, fixes: [{ axis: 'hook', score: 6, at: 0.1, rule: 'first-frame', fix: 'subject in frame 0' }], ...f }, 'out/x.judge.json');
  assert.ok(lines.includes('- hook 6 at 0.1 [first-frame]: subject in frame 0'));
  assert.ok(lines.includes('- first-frame at 0.1: fail, empty ground'));
  assert.ok(lines.includes('waivers: attractor earned'));
  assert.ok(lines.includes('sameness: like brindle: the ring'));
  assert.ok(lines.includes('template: no'));
});

test('the ledger tracks notes by rule id: an open rule keeps its item, and a flip on one rule prints one stop line', () => {
  const prev = mergeLedger([], { fixes: [{ axis: 'hook', rule: 'first-frame', what: 'start height', now: '40%', want: '85%' }] }, [{ axis: 'hook', score: 6, at: 0.1, rule: 'first-frame', fix: 'raise it' }], [{ rule: 'thread', t: 3, verdict: 'fail', note: 'no thread' }]);
  assert.deepEqual(prev.items.map((i) => [i.id, i.axis, i.rule]), [['f1', 'hook', 'first-frame'], ['f2', 'note', 'thread']]);
  assert.match(ledgerPrompt(openItems(prev.items)), /f2 \(note, rule thread at 3\): no thread/);
  const next = mergeLedger(prev.items, { ledger: [{ id: 'f1', status: 'still' }, { id: 'f2', status: 'still' }] }, [], [{ rule: 'thread', t: 3.5, verdict: 'fail', note: 'still no thread' }, { rule: 'hierarchy', t: 1, verdict: 'fail', note: 'flat' }, { rule: 'cue-sparse', t: 1, verdict: 'unknown', note: 'x' }]);
  assert.deepEqual(next.items.map((i) => `${i.id} ${i.rule} ${i.status}`), ['f1 first-frame still', 'f2 thread still', 'f3 hierarchy new']);
  const round = (items, now, want) => mergeLedger(items, { ledger: openItems(items).map((i) => ({ id: i.id, status: 'fixed' })), fixes: [{ axis: 'hook', rule: 'eye-path', what: `phrase ${want}`, now, want }] }, [{ axis: 'hook', score: 7, at: 1, rule: 'eye-path', fix: `to ${want}` }]);
  const r3 = round(round(round([], '40%', '85%').items, '85%', '40%').items, '40%', '85%');
  assert.match(ledgerLines(r3)[1], /^stop: keep eye-path: phrase 85% at its current value/);
  assert.equal(previousItems({ fixes: [{ axis: 'a', rule: 'hierarchy', fix: 'x' }] })[0].rule, 'hierarchy');
});

test('the judge event keeps the notes as { rule, t, verdict } and the sameness and template answers', () => {
  const event = judgeEvent({ stage: 'draft', verdict: 'FIX', scores: { hook: 6 }, findings: findingsEvent({ ...readFindings(raw, IDS), fixes: [] }) });
  assert.deepEqual(event.notes, [{ rule: 'first-frame', t: 0.1, verdict: 'fail' }, { rule: null, t: 2, verdict: 'unknown' }, { rule: 'sameness', t: 1, verdict: 'fail' }]);
  assert.deepEqual(event.waivers, [{ code: 'attractor', earned: true }]);
  assert.deepEqual(event.sameness, { sibling: true, films: ['brindle'], shared: 'the ring' });
  assert.deepEqual(event.template, { tell: false, t: null });
  assert.deepEqual(judgeEvent({ stage: 'stills', verdict: 'FIX' }).notes, null);
});

test('siblings are the newest judged films with a video, never the film itself, a final before a draft', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sib-'));
  const touch = (f, ago) => { const p = path.join(dir, f); fs.writeFileSync(p, '{}'); const t = new Date(Date.now() - ago * 1000); fs.utimesSync(p, t, t); };
  ['a', 'b', 'c', 'd', 'self', 'nov'].forEach((n, i) => touch(`${n}.judge.json`, (6 - i) * 10));
  touch('a.mp4', 0); touch('a-draft.mp4', 0); touch('b-draft.mp4', 0); touch('d.mp4', 0); touch('self-draft.mp4', 0);
  const got = siblingFilms(dir, 'self');
  assert.deepEqual(got.map((s) => [s.name, path.basename(s.video)]), [['d', 'd.mp4'], ['b', 'b-draft.mp4'], ['a', 'a.mp4']]);
  assert.equal(siblingFilms(dir, 'self', 2).length, 2);
  assert.deepEqual(siblingFilms(path.join(dir, 'none'), 'x'), []);
});
