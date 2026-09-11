// harness/lib/craft-rules.test.mjs: the schema and rulesFor() selection, against both the real
// docs/CRAFT/rules/motion.json (the migration must actually validate) and small throwaway fixtures
// (each failure case, in isolation, rather than hoping the real files happen to exercise it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCraftRules, validateRule, rulesFor, briefLine, ROOT } from './craft-rules.mjs';

test('the real docs/CRAFT/rules load and validate with no problems', () => {
  const records = loadCraftRules({});
  assert.ok(records.length >= 21, 'motion.json should carry its ~21 migrated records');
  for (const r of records) assert.deepEqual(validateRule(r, { root: ROOT }), []);
});

/** A throwaway fixture root: docs/RULES/<doc>.md and docs/CRAFT/rules/<category>.json under a tmpdir. */
function fixture({ docBody = '# A title\n\nSome body text.\n', category = 'fixture', records = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-rules-'));
  fs.mkdirSync(path.join(root, 'docs/RULES'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/CRAFT/rules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/RULES/thing.md'), docBody);
  const rec = {
    id: `${category}.thing`,
    category,
    stage: 'design',
    applies: 'always',
    check: null,
    adapt: null,
    brief: 'A title',
    doc: 'docs/RULES/thing.md',
  };
  const arr = records ?? [rec];
  fs.writeFileSync(path.join(root, `docs/CRAFT/rules/${category}.json`), JSON.stringify(arr, null, 2));
  return { root, rec };
}

test('a well-formed record validates clean', () => {
  const { root, rec } = fixture();
  assert.deepEqual(validateRule(rec, { root }), []);
});

test('bad id shape fails', () => {
  const { root, rec } = fixture();
  assert.ok(validateRule({ ...rec, id: 'NotKebab' }, { root }).length > 0);
});

test('id must start with its own category', () => {
  const { root, rec } = fixture();
  assert.ok(validateRule({ ...rec, id: 'other.thing' }, { root }).length > 0);
});

test('bad stage fails', () => {
  const { root, rec } = fixture();
  assert.ok(validateRule({ ...rec, stage: 'nope' }, { root }).length > 0);
});

test('applies must be "always" or a real craft-checklist feature key', () => {
  const { root, rec } = fixture();
  assert.deepEqual(validateRule({ ...rec, applies: 'hasImages' }, { root }), []);
  assert.ok(validateRule({ ...rec, applies: 'notAFeature' }, { root }).length > 0);
});

test('check must name a finding code some gate actually emits', () => {
  const { root, rec } = fixture();
  assert.ok(validateRule({ ...rec, check: 'no-such-code-anywhere' }, { root }).length > 0);
  assert.deepEqual(validateRule({ ...rec, check: 'off-colour' }, { root }), []);
});

test('brief over 160 chars fails', () => {
  const { root, rec } = fixture();
  assert.ok(validateRule({ ...rec, brief: 'x'.repeat(161) }, { root }).length > 0);
});

test('brief with an em dash fails', () => {
  const { root, rec } = fixture();
  const emdash = String.fromCharCode(0x2014);
  assert.ok(validateRule({ ...rec, brief: `a title${emdash}b` }, { root }).length > 0);
});

test('doc must exist', () => {
  const { root, rec } = fixture();
  assert.ok(validateRule({ ...rec, doc: 'docs/RULES/does-not-exist.md' }, { root }).length > 0);
});

test('a named anchor must resolve to a real heading', () => {
  const { root, rec } = fixture({ docBody: '# A title\n\n## Real Anchor\n\nbody\n' });
  assert.deepEqual(validateRule({ ...rec, brief: 'body', doc: 'docs/RULES/thing.md#real-anchor' }, { root }), []);
  assert.ok(validateRule({ ...rec, doc: 'docs/RULES/thing.md#no-such-anchor' }, { root }).length > 0);
});

test('freshness: brief present in the doc passes, brief absent fails (stale quote)', () => {
  const { root, rec } = fixture({ docBody: '# A title\n\nThe real sentence this rule quotes.\n' });
  assert.deepEqual(validateRule({ ...rec, brief: 'The real sentence this rule quotes' }, { root }), []);
  assert.ok(validateRule({ ...rec, brief: 'A sentence nobody wrote' }, { root }).length > 0);
});

test('duplicate ids across files fail loadCraftRules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-rules-dup-'));
  fs.mkdirSync(path.join(root, 'docs/RULES'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/CRAFT/rules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/RULES/thing.md'), '# A title\n\nbody\n');
  const rec = (category) => ([{
    id: 'dup.thing', category, stage: 'design', applies: 'always',
    check: null, adapt: null, brief: 'A title', doc: 'docs/RULES/thing.md',
  }]);
  fs.writeFileSync(path.join(root, 'docs/CRAFT/rules/dup.json'), JSON.stringify(rec('dup')));
  fs.writeFileSync(path.join(root, 'docs/CRAFT/rules/other.json'), JSON.stringify(rec('other')));
  assert.throws(() => loadCraftRules({ root }), /duplicate id/);
});

test('rulesFor: prose-only (check: null) records sort before checked ones, both capped', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-rules-order-'));
  fs.mkdirSync(path.join(root, 'docs/RULES'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/CRAFT/rules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/RULES/thing.md'), '# A title\n\nbody\n');
  const base = { stage: 'design', applies: 'always', doc: 'docs/RULES/thing.md', brief: 'A title' };
  const records = [
    { ...base, id: 'ord.checked-1', category: 'ord', check: 'off-colour', adapt: null },
    { ...base, id: 'ord.prose-1', category: 'ord', check: null, adapt: null },
    { ...base, id: 'ord.checked-2', category: 'ord', check: 'contrast', adapt: null },
    { ...base, id: 'ord.prose-2', category: 'ord', check: null, adapt: null },
  ];
  fs.writeFileSync(path.join(root, 'docs/CRAFT/rules/ord.json'), JSON.stringify(records));
  const r = rulesFor({ stage: 'design', features: { always: true }, root, cap: 3 });
  assert.equal(r.length, 3);
  assert.equal(r[0].check, null);
  assert.equal(r[1].check, null);
  assert.equal(r[2].check, 'off-colour');
});

test('rulesFor: maxChars stops adding records before the budget is exceeded, but always returns at least one', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-rules-budget-'));
  fs.mkdirSync(path.join(root, 'docs/RULES'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/CRAFT/rules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/RULES/thing.md'), '# A title\n\nbody\n');
  const base = { stage: 'design', applies: 'always', doc: 'docs/RULES/thing.md', brief: 'A title', check: null, adapt: null };
  const records = Array.from({ length: 5 }, (_, i) => ({ ...base, id: `bud.r${i}`, category: 'bud' }));
  fs.writeFileSync(path.join(root, 'docs/CRAFT/rules/bud.json'), JSON.stringify(records));
  const tiny = rulesFor({ stage: 'design', features: { always: true }, root, cap: 20, maxChars: 10 });
  assert.equal(tiny.length, 1, 'a budget smaller than one line still returns that one line, never zero');
  const oneLine = briefLine(records[0]).length;
  const roomForTwo = rulesFor({ stage: 'design', features: { always: true }, root, cap: 20, maxChars: oneLine + 1 });
  assert.equal(roomForTwo.length, 1, 'a budget with no room for a second full line stops at one');
});

test('rulesFor: categories scope the result, so an unrelated role sees nothing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-rules-cat-'));
  fs.mkdirSync(path.join(root, 'docs/RULES'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/CRAFT/rules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/RULES/thing.md'), '# A title\n\nbody\n');
  const rec = {
    id: 'sound.thing', category: 'sound', stage: 'direct', applies: 'always',
    check: null, adapt: null, brief: 'A title', doc: 'docs/RULES/thing.md',
  };
  fs.writeFileSync(path.join(root, 'docs/CRAFT/rules/sound.json'), JSON.stringify([rec]));
  const forScene = rulesFor({ stage: 'direct', features: { always: true }, root, categories: ['layout'] });
  assert.equal(forScene.length, 0);
  const forSound = rulesFor({ stage: 'direct', features: { always: true }, root, categories: ['sound'] });
  assert.equal(forSound.length, 1);
});
