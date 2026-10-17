import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { redact, brief } from '../../harness/lib/trace/redact.mjs';
import { commandVerbs, footersOf, nextNamed, docsRead, filmWrites, rawTools } from '../../harness/lib/trace/calls.mjs';
import { rowsOf, cutoffMs, transcriptFiles } from '../../harness/lib/trace/read.mjs';
import { foldRows } from '../../harness/lib/trace/fold.mjs';
import { analyze } from '../../harness/lib/trace/analyze.mjs';
import { stageOrder } from '../../harness/lib/trace/stages.mjs';
import { selectAgents } from '../../harness/lib/trace/select.mjs';
import { aggregate, compareAt } from '../../harness/lib/trace/aggregate.mjs';
import { aggregateMarkdown, agentMarkdown, compareMarkdown } from '../../harness/lib/trace/report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const project = path.join(root, 'tests/fixtures/trace/proj');
const filmFile = path.join(project, 'sess-1/subagents/agent-film.jsonl');
const readerFile = path.join(project, 'sess-1/subagents/agent-reader.jsonl');

const load = async (file) => analyze(await foldRows(rowsOf(file)), file);
const rows = (list) => (async function* () { yield* list; }());

test('redact removes keys, tokens and opaque strings, keeps paths', () => {
  const secrets = [
    'sk-abcdefghijklmnopqrstuvwxyz123456', 'ghp_abcdefghijklmnopqrstuvwxyz1234', 'AKIAABCDEFGHIJKLMNOP',
    'xoxb-1234567890-abcdefghij', `eyJ${'a'.repeat(12)}.${'b'.repeat(12)}.${'c'.repeat(8)}`,
  ];
  for (const s of secrets) assert.ok(!redact(`curl -H "x: ${s}" y`).includes(s), s);
  assert.equal(redact('Authorization: Bearer abcdefghijklmnop1234'), 'Authorization: [redacted]');
  assert.match(redact('export API_KEY=hunter2hunter2 && run'), /API_KEY=\[redacted\]/);
  assert.match(redact('tool --token abcdef123456 go'), /--token \[redacted\]/);
  assert.ok(!redact(`x ${'0123456789abcdef'.repeat(3)} y`).includes('0123456789abcdef0123456789abcdef'));
  assert.equal(redact('node /Users/someone/Developer/code/shortwave/.claude/worktrees/agent-a640e50f862cf14e1/harness/lib/trace/read.mjs'), 'node /Users/someone/Developer/code/shortwave/.claude/worktrees/agent-a640e50f862cf14e1/harness/lib/trace/read.mjs');
  assert.equal(brief('  a \n  b  ', 10), 'a b');
});

test('commandVerbs finds each vawe call of a chain and skips prose and help', () => {
  assert.deepEqual(commandVerbs('cd x && VAWE_AGENT=a bin/vawe dev films/f/page.html; bin/vawe sheet out/f.mp4').map((v) => v.verb), ['dev', 'sheet']);
  assert.deepEqual(commandVerbs('bin/vawe nonsense films/f/page.html'), []);
  assert.deepEqual(commandVerbs('git commit -m "x" <<EOF\nbin/vawe dev p\nEOF'), []);
  assert.deepEqual(commandVerbs('cat <<EOF\nbin/vawe dev p\nEOF'), []);
  assert.equal(commandVerbs('bin/vawe dev --help')[0].help, true);
  assert.equal(commandVerbs('bin/vawe dev p')[0].help, false);
});

test('footers, next lines, docs and film writes are read from calls', () => {
  const text = 'a\nvawe: dev ok in 38.0s\nvawe: strip FAILED (--fps must be from 1 to 30) in 0.0s\nnext: bin/vawe critique p, or bin/vawe ship p';
  assert.deepEqual(footersOf(text), [
    { verb: 'dev', ok: true, reason: null, secs: 38 },
    { verb: 'strip', ok: false, reason: '--fps must be from 1 to 30', secs: 0 },
  ]);
  assert.deepEqual(nextNamed(text), [['critique', 'ship']]);
  assert.deepEqual(docsRead('Read', { file_path: '/a/b/taste/rules/no-tells.md' }), ['taste/rules/no-tells.md']);
  assert.deepEqual(docsRead('Bash', { command: 'sed -n 1,20p guides/IDEATE.md' }), ['guides/IDEATE.md']);
  assert.deepEqual(docsRead('Bash', { command: 'ls guides/IDEATE.md' }), []);
  assert.deepEqual(docsRead('Skill', { skill: 'vawe-page' }), ['skills/vawe-page/SKILL.md']);
  assert.equal(filmWrites('Edit', { file_path: '/w/films/a/brief.md', new_string: '## Ideas' })[0].what, 'brief');
  assert.equal(filmWrites('Bash', { command: 'cat x > films/a/page.html' })[0].what, 'page');
  assert.deepEqual(filmWrites('Read', { file_path: '/w/films/a/page.html' }), []);
});

test('rawTools applies the verb-hint rules, and the raw extras only without a verb', () => {
  assert.deepEqual(rawTools('ffmpeg -ss 3 -i a.mp4 -frames:v 1 f.png', false), ['hint:still', 'ffmpeg']);
  assert.deepEqual(rawTools('sleep 5 && curl x', false), ['sleep', 'curl']);
  assert.deepEqual(rawTools('bin/vawe dev p && sleep 5', true), []);
});

test('rowsOf streams rows and skips a cut-off last line', async () => {
  const out = [];
  for await (const r of rowsOf(readerFile)) out.push(r);
  assert.equal(out.length, 5);
});

test('analyze reads the identity, verbs and stage order of a film agent', async () => {
  const a = await load(filmFile);
  assert.equal(a.kind, 'sub');
  assert.equal(a.model, 'model-x');
  assert.equal(a.branch, 'film-harbor');
  assert.deepEqual(a.films, ['harbor']);
  assert.equal(a.filmAgent, true);
  assert.equal(a.minutes, 9.8);
  assert.deepEqual(a.tokens, { input: 130, output: 65, cacheRead: 1300, cacheWrite: 260 });
  assert.deepEqual(a.verbs.map((v) => v.verb), ['new', 'dev', 'dev', 'still', 'critique', 'ship', 'dev', 'sheet']);
  assert.deepEqual(a.verbs.map((v) => v.ok), [true, false, true, true, true, false, true, true]);
  assert.equal(a.verbs[1].reason, 'exit 2: console error');
  assert.equal(a.verbs[2].secs, 38);
  assert.deepEqual(a.stages.first, { new: 1, dev: 60, page: 120, critique: 420, ship: 480 });
  assert.deepEqual(a.stages.inversions, ['dev<page']);
  assert.ok(a.stages.skipped.includes('study') && a.stages.skipped.includes('frames'));
});

test('analyze counts routing, raw tools, docs, failures, cost and rule breaks', async () => {
  const a = await load(filmFile);
  assert.deepEqual(a.routing.nextCounts, { ignored: 2 });
  assert.deepEqual(a.routing.hintCounts, { followed: 1 });
  assert.equal(a.routing.hints[0].id, 'still');
  assert.deepEqual(a.raw, { 'hint:still': 1, ffmpeg: 1, sleep: 1, curl: 1 });
  assert.deepEqual(a.docs.map((d) => [d.doc, d.beforePage, d.beforeDev]), [['AGENTS.md', true, true]]);
  assert.deepEqual(a.failures.byClass, { vawe: 2, glob: 1, hook: 1 });
  assert.equal(a.cost.calls, 13);
  assert.equal(a.cost.repeats, 1);
  assert.equal(a.cost.waitSecs, 21);
  assert.equal(a.cost.renderSecs, 38 + 20 + 5 + 0);
  assert.deepEqual(a.breaks, {
    reviewBySameAgent: true, shipAttempted: true, shipRefusedNoApproval: true, shipStarted: false,
    shipWithoutCritique: false, shipWithoutApprovalInTrace: false, shipBeforeFullDraft: false,
  });
});

test('no key or token reaches the record or the report', async () => {
  const a = await load(filmFile);
  const out = JSON.stringify(a) + agentMarkdown(a);
  assert.ok(!out.includes('sk-abcdefghijklmnopqrstuvwxyz123456'));
  const fold = await foldRows(rowsOf(filmFile));
  assert.ok(fold.calls.some((c) => c.cmd.includes('curl') && c.cmd.includes('[redacted]')));
});

test('a hook block is read from the attachment even when the result text is plain', async () => {
  const fold = await foldRows(rows([
    { type: 'assistant', timestamp: '2026-10-10T10:00:00Z', message: { id: 'm', content: [{ type: 'tool_use', id: 'c1', name: 'Bash', input: { command: 'ls' } }] } },
    { type: 'attachment', timestamp: '2026-10-10T10:00:01Z', attachment: { type: 'hook_blocking_error', toolUseID: 'c1', blockingError: { blockingError: 'blocked by policy' } } },
    { type: 'user', timestamp: '2026-10-10T10:00:02Z', message: { content: [{ type: 'tool_result', tool_use_id: 'c1', content: 'refused', is_error: true }] } },
  ]));
  assert.equal(analyze(fold, 'x.jsonl').failures.byClass.hook, 1);
});

test('stageOrder lists skipped stages and inversions', () => {
  const { skipped, inversions } = stageOrder({ new: 1, dev: 5, frames: 9, critique: 20 });
  assert.deepEqual(skipped, ['study', 'design', 'page', 'ideas', 'storyboard', 'board', 'motion']);
  assert.deepEqual(inversions, ['dev<frames']);
});

test('selectAgents keeps film agents, one agent by label or id, and agents since a date', async () => {
  const all = [await load(filmFile), await load(readerFile)];
  assert.equal(selectAgents(all, { films: true }).length, 1);
  assert.equal(selectAgents(all, { agent: 'reader' }).length, 1);
  assert.equal(selectAgents(all, { sinceMs: Date.parse('2026-10-11') }).length, 1);
  assert.equal(selectAgents(all, {}).length, 2);
});

test('aggregate counts and percentages, and compareAt splits at the cutoff', async () => {
  const all = [await load(filmFile), await load(readerFile)];
  const agg = aggregate(all);
  const row1 = (id) => agg.rows.find((r) => r.id === id);
  assert.deepEqual([row1('readDigest').count, row1('readDigest').of, row1('readDigest').pct], [1, 2, 50]);
  assert.deepEqual([row1('critique').count, row1('critique').of], [1, 2]);
  assert.deepEqual([row1('shipRefused').count, row1('shipRefused').of], [1, 1]);
  assert.equal(agg.verbUse.dev, 1);
  assert.equal(agg.verbUse.looks, 0);
  const { before, after } = compareAt(all, Date.parse('2026-10-11'));
  assert.deepEqual([before.n, after.n], [1, 1]);
  assert.equal(before.rows.find((r) => r.id === 'critique').pct, 100);
  assert.equal(after.rows.find((r) => r.id === 'critique').pct, 0);
  assert.match(aggregateMarkdown(agg), /\| ran critique \| 1\/2 \(50%\) \|/);
  assert.match(compareMarkdown({ before, after }, '2026-10-11'), /\| ran critique \| 1\/1 \(100%\) \| 0\/1 \(0%\) \| -100 pts \|/);
});

test('transcriptFiles reads sub-agents of a project, main sessions on request, and skips old files', () => {
  assert.equal(transcriptFiles({ project }).length, 2);
  assert.equal(transcriptFiles({ project, main: true }).length, 3);
  assert.equal(transcriptFiles({ project, sinceMs: Date.now() + 1e9 }).length, 0);
  assert.equal(transcriptFiles({ inputs: [filmFile] }).length, 1);
  assert.equal(transcriptFiles({ inputs: [project] }).length, 3);
});

test('cutoffMs takes a date or a commit and rejects other text', () => {
  assert.equal(cutoffMs('2026-10-01'), Date.parse('2026-10-01'));
  assert.equal(cutoffMs(undefined), null);
  assert.ok(cutoffMs('HEAD', root) > Date.parse('2026-01-01'));
  assert.throws(() => cutoffMs('not-a-commit-xyz', root), /not a date or a commit/);
});

test('the CLI prints JSON with every field and honours --films and --compare', () => {
  const run = (...args) => spawnSync('node', ['harness/dev/trace-review.mjs', ...args], { cwd: root, encoding: 'utf8' });
  const json = JSON.parse(run('--project', project, '--films', '--json').stdout);
  assert.equal(json.agents.length, 1);
  assert.ok(['verbs', 'stages', 'routing', 'raw', 'docs', 'failures', 'cost', 'breaks', 'tokens'].every((k) => k in json.agents[0]));
  const text = run('--project', project, '--compare', '2026-10-11', '--aggregate-only');
  assert.equal(text.status, 0);
  assert.match(text.stdout, /Before and after 2026-10-11 \(1 agents before, 1 after\)/);
  assert.equal(run().status, 2);
  assert.notEqual(run('--project', project, '--since', 'zzz-nope').status, 0);
});
