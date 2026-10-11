import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseIdea, ideaRows, ideasFilled, overlap, ideaFindings, ideasAdvice } from '../../harness/lib/ideas.mjs';

const fixture = (name) => fs.readFileSync(new URL(`../fixtures/ideas/${name}`, import.meta.url), 'utf8');
const GOOD = fixture('good-brief.md');
const codes = (brief, worlds = null) => ideaFindings(brief, worlds).map((f) => f.code);

const row = (at, ideas, chosen, why = 'because it fits') => `| ${at} | m | ${ideas.join(' | ')} | ${chosen} | ${why} |`;
const table = (...rows) => `## Ideas\n\n| at | meaning | i1 | i2 | i3 | i4 | chosen | why |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`;
const FOUR = ['metaphor: a lighthouse keeps one lamp lit, 0.3', 'transformation: the send button grows into a wok, 0.2', 'collision: a taxi in a quiet kitchen, 0.1', 'literal: the real dashboard, 0.9'];

test('an idea cell parses to a device, a text and a typicality', () => {
  assert.deepEqual(parseIdea('transformation: the send button grows into a wok, 0.15'), { device: 'transformation', name: 'transformation', text: 'the send button grows into a wok', typicality: 0.15 });
  assert.equal(parseIdea('show the invisible: steam, 0.3').device, 'show-the-invisible');
  assert.equal(parseIdea('literalise: a phrase, 0.4').device, 'literalise');
  assert.equal(parseIdea('literal: the thing (0.9)').typicality, 0.9);
  assert.equal(parseIdea('zigzag: a thing, 0.5').device, null);
  assert.equal(parseIdea('metaphor: no number').typicality, null);
});

test('the ledger parses to rows with ideas, the chosen index and the reason', () => {
  const rows = ideaRows(GOOD);
  assert.deepEqual(rows.map((r) => r.at), ['s1', 's2', 's3', 's1 to s2']);
  assert.equal(rows[0].ideas.length, 4);
  assert.equal(rows[0].chosen, 1);
  assert.equal(rows[0].ideas[rows[0].chosen].device, 'transformation');
  assert.match(rows[0].why, /^because/);
  assert.equal(ideasFilled(GOOD), true);
});

test('a placeholder row or no section is not filled; an old brief has no ledger', () => {
  const template = '## Ideas\n\n| at | meaning | i1 | i2 | i3 | i4 | chosen | why |\n|---|---|---|---|---|---|---|---|\n| [s1] | [m] | [a] | [b] | [c] | [d] | [n] | [because] |\n\n## Board\n';
  assert.equal(ideasFilled(template), false);
  assert.equal(ideasFilled('## Board\n'), null);
  assert.equal(ideasFilled(null), null);
  assert.deepEqual(ideasAdvice('## Board\n'), []);
  assert.deepEqual(codes(template), ['ideas-missing']);
});

test('a good ledger earns no advice', () => {
  assert.deepEqual(ideaFindings(GOOD, ['s1', 's2', 's3']), []);
  assert.deepEqual(ideasAdvice(GOOD, { _worlds: ['s1', 's2', 's3'] }), []);
});

test('ideas-missing names a world with no row', () => {
  const found = ideaFindings(GOOD, ['s1', 's2', 's3', 's4']);
  assert.deepEqual(found.map((f) => [f.code, f.at]), [['ideas-missing', 's4']]);
});

test('ideas-literal fires when every chosen device is literal, and not when one is not', () => {
  const found = codes(fixture('literal-brief.md'));
  assert.ok(found.includes('ideas-literal'));
  assert.ok(!found.includes('ideas-variety'));
  assert.ok(!codes(GOOD).includes('ideas-literal'));
});

test('ideas-variety fires when one device is chosen on more than half the rows (three rows or more)', () => {
  const pick = (at, n) => row(at, [`metaphor: idea ${at} alpha beta, 0.3`, `transformation: idea ${at} gamma delta, 0.2`, `collision: idea ${at} epsilon zeta, 0.1`, `literal: idea ${at} eta theta, 0.9`], n);
  assert.ok(codes(table(pick('s1', 1), pick('s2', 1), pick('s3', 2))).includes('ideas-variety'));
  assert.ok(!codes(table(pick('s1', 1), pick('s2', 2), pick('s3', 3))).includes('ideas-variety'));
  assert.ok(!codes(table(pick('s1', 1), pick('s2', 1))).includes('ideas-variety'));
});

test('ideas-typical fires on the most typical pick with no reason, not with one, not on a less typical pick', () => {
  assert.ok(codes(table(row('s1', FOUR, 4, 'it fits'))).includes('ideas-typical'));
  assert.ok(!codes(table(row('s1', FOUR, 4, 'because the story needs the plain one'))).includes('ideas-typical'));
  assert.ok(!codes(table(row('s1', FOUR, 2, 'it fits'))).includes('ideas-typical'));
});

test('ideas-thin fires on fewer than four ideas, a repeated device, an unknown device and a missing number', () => {
  const three = FOUR.slice(0, 3);
  assert.match(ideaFindings(table(`| s1 | m | ${three.join(' | ')} |  | 2 | because x |`)).find((f) => f.code === 'ideas-thin').text, /has 3 ideas/);
  const repeat = [...FOUR.slice(0, 3), 'metaphor: a boat on a lake, 0.4'];
  assert.match(ideaFindings(table(row('s1', repeat, 2))).find((f) => f.code === 'ideas-thin').text, /repeats a device/);
  const unknown = [...FOUR.slice(0, 3), 'zigzag: a boat on a lake, 0.4'];
  assert.match(ideaFindings(table(row('s1', unknown, 2))).find((f) => f.code === 'ideas-thin').text, /"zigzag"/);
  const blank = [...FOUR.slice(0, 3), 'reversal: a boat on a lake'];
  assert.match(ideaFindings(table(row('s1', blank, 2))).find((f) => f.code === 'ideas-thin').text, /no typicality number/);
  assert.match(ideaFindings(table(row('s1', FOUR, 'x'))).find((f) => f.code === 'ideas-thin').text, /no chosen idea/);
});

test('the reworded trick: four device labels on one idea are caught', () => {
  const found = ideaFindings(fixture('reworded-brief.md'));
  assert.ok(found.some((f) => f.code === 'ideas-reworded' && f.at === 's1'));
  assert.ok(overlap('the send button grows into a wok', 'a wok grows out of the send button') >= 0.5);
  assert.ok(overlap('a lighthouse keeps one lamp lit', 'a taxi in a quiet kitchen') < 0.5);
});

test('the same pick copied to two rows is caught', () => {
  const other = ['metaphor: a lamp keeps a lighthouse lit, 0.3', 'collision: a taxi in a kitchen, 0.1', 'reversal: the numbers fall up, 0.2', 'literal: the real dashboard, 0.9'];
  const found = ideaFindings(table(row('s1', FOUR, 2), row('s2', other, 4, 'because plain')));
  assert.ok(!found.some((f) => f.code === 'ideas-reworded'));
  const copy = ['collision: a taxi horn in a quiet kitchen, 0.1', 'transformation: the send button grows into a wok today, 0.2', 'reversal: the numbers fall up, 0.2', 'literal: the real dashboard, 0.9'];
  assert.ok(ideaFindings(table(row('s1', FOUR, 2), row('s2', copy, 2))).some((f) => f.code === 'ideas-reworded' && f.at === 's2'));
});

const WAIVED = (code, at) => ({ allow: [at ? `${code}@${at}` : code], _why: { [at ? `${code}@${at}` : code]: 'the plain button at s1 is the only honest way to show a 0.4 s tap' }, _worlds: ['s1', 's2', 's3', 's4'] });

test('a waiver with a reason removes the advice; one scoped to a world removes only that world', () => {
  const lines = (authoring) => ideasAdvice(GOOD, authoring).filter((l) => l.startsWith('ideas-'));
  assert.equal(lines({ _worlds: ['s1', 's2', 's3', 's4'] }).length, 1);
  assert.deepEqual(lines(WAIVED('ideas-missing', 's4')), []);
  assert.equal(lines(WAIVED('ideas-missing', 's3')).length, 1);
  assert.deepEqual(lines(WAIVED('ideas-missing')), []);
  assert.equal(lines({ allow: ['ideas-missing'], _why: {}, _worlds: ['s4'] }).length, 1);
});

test('each line is followed by one waiver hint for its code', () => {
  const lines = ideasAdvice(table(row('s1', FOUR, 4, 'it fits'), row('s2', FOUR, 4, 'it fits')), {});
  assert.equal(lines.filter((l) => l.startsWith('waive: ') && /ideas-typical/.test(l)).length, 1);
  assert.equal(lines.filter((l) => l.startsWith('ideas-typical:')).length, 2);
});

test('vawe check ideas: a literal ledger fires, a good one passes, a waiver silences', () => {
  const run = (brief, authoring = '') => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideas-'));
    try {
      fs.writeFileSync(path.join(dir, 'brief.md'), brief);
      fs.writeFileSync(path.join(dir, 'page.html'), `<html><body><section data-world="s1"></section>${authoring}</body></html>`);
      return spawnSync(process.execPath, ['quality/gates/ideas.mjs', path.join(dir, 'page.html')], { encoding: 'utf8' });
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  };
  const bad = run(fixture('literal-brief.md'));
  assert.equal(bad.status, 0);
  assert.match(bad.stdout, /every chosen idea is literal/);
  assert.doesNotMatch(run(GOOD).stdout, /\[ideas-(literal|thin|typical|reworded|variety)\]/);
  const waived = run(fixture('literal-brief.md'), '<script type="application/json" id="authoring">{"allow":["ideas-literal"],"_why":{"ideas-literal":"the three beats at s1 s2 s3 show a real 0.4 s product"}}</script>');
  assert.doesNotMatch(waived.stdout, /\[ideas-literal\] every chosen/);
});
