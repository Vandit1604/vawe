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
  assert.deepEqual(commandVerbs("python3 - <<'EOF'\nx = 1\nEOF\nbin/vawe dev p").map((v) => v.verb), ['dev']);
  assert.deepEqual(commandVerbs("python3 - <<'EOF'\nbin/vawe dev p"), []);
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
  assert.equal(agg.verbUse.palette, 0);
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

const T0 = Date.parse('2026-10-10T10:00:00Z');
const stamp = (sec) => new Date(T0 + sec * 1000).toISOString();
const callRow = (sec, id, command, name = 'Bash', input = { command }) => ({ type: 'assistant', timestamp: stamp(sec), message: { id: `m-${id}`, content: [{ type: 'tool_use', id, name, input }] } });
const resultRow = (sec, id, text = 'ok') => ({ type: 'user', timestamp: stamp(sec), message: { content: [{ type: 'tool_result', tool_use_id: id, content: text }] } });
const foldOf = (list) => foldRows(rows(list));

test('render and wait seconds come from the run log, the footer is the fallback', async () => {
  const fold = await foldOf([
    callRow(0, 'a', 'VAWE_AGENT=x bin/vawe dev films/f/page.html > log 2>&1 &'), resultRow(1, 'a'),
    callRow(10, 'b', 'bin/vawe wait films/f/page.html'), resultRow(12, 'b'),
    callRow(20, 'c', 'bin/vawe dev films/f/page.html'), resultRow(30, 'c', 'vawe: dev ok in 9.0s'),
    callRow(40, 'd', 'bin/vawe dev films/f/page.html --help'), resultRow(44, 'd'),
  ]);
  const runs = [
    { cmd: 'verb', verb: 'dev', session: 's', start: stamp(0.5), durationS: 600, slotWaitS: 30, exitCode: 0 },
    { cmd: 'verb', verb: 'wait', session: 's', start: stamp(10.2), durationS: 170, slotWaitS: null, exitCode: 0 },
  ];
  const a = analyze(fold, 'x.jsonl', () => runs);
  assert.equal(a.cost.renderSecs, 600);
  assert.equal(a.cost.unloggedRenderSecs, 9);
  assert.equal(a.cost.waitSecs, 170);
  assert.equal(a.cost.slotWaitSecs, 30);
  assert.equal(a.verbs[0].ok, true);
  assert.equal(analyze(fold, 'x.jsonl').cost.renderSecs, 9 + 1);
});

const usageRow = (sec, id, write) => ({ type: 'assistant', timestamp: stamp(sec), message: { id, usage: { cache_creation_input_tokens: write, cache_read_input_tokens: 2 * write }, content: [] } });
const textRow = (sec, text) => ({ type: 'user', timestamp: stamp(sec), message: { content: text } });

test('rounds start at a coordinator note, not at a cut-off, a nudge after it or a system reminder', async () => {
  const fold = await foldOf([
    textRow(0, 'build the film'), usageRow(1, 'm1', 100),
    callRow(2, 'a', 'bin/vawe dev films/f/page.html'), resultRow(62, 'a', 'vawe: dev ok in 60.0s'),
    textRow(100, 'The coordinator sent a message while you were working: owner notes'), usageRow(101, 'm2', 10),
    textRow(200, 'Your response above was cut off mid-stream'),
    textRow(201, 'The coordinator sent a message while you were working: you stalled'),
    textRow(202, '<system-reminder>x</system-reminder>'), usageRow(203, 'm3', 5),
  ]);
  const rounds = analyze(fold, 'x.jsonl').rounds;
  assert.deepEqual(rounds.map((r) => [r.startMin, r.endMin, r.calls, r.renders, r.cacheWrite]), [[0, 1, 1, 1, 100], [1.7, 3.4, 0, 0, 15]]);
  assert.match(rounds[1].note, /owner notes/);
});

test('stalls list every gap over 5 min with the kind of the row that ends it and the next cache write', async () => {
  const fold = await foldOf([
    textRow(0, 'go'), usageRow(1, 'm1', 1),
    usageRow(1 + 400, 'm2', 77),
    callRow(802, 'a', 'ls'), resultRow(1300, 'a'),
    textRow(1700, 'The coordinator sent a message'), usageRow(1701, 'm3', 9),
  ]);
  const { stalls } = analyze(fold, 'x.jsonl');
  assert.deepEqual(stalls.list.map((s) => [s.kind, s.min, s.nextCacheWrite]), [['model', 6.7, 77], ['model', 6.7, 9], ['tool', 8.3, 9], ['wait', 6.7, 9]]);
  assert.deepEqual([stalls.modelMin, stalls.toolMin, stalls.waitMin], [13.4, 8.3, 6.7]);
});

const devText = (rules, advice = []) => ['plan of f: 2 open', ...rules.map((r) => `  page: rule ${r} @1.00s x: why (taste/rules/${r}.md)`), ...advice.map((a) => `advice: ${a}`)].join('\n');
const authoring = (allow) => `<script id="authoring">{"allow": [${allow.map((a) => `"${a}"`).join(', ')}]}</script>`;

test('advice outcomes: fixed, ignored after 3 drafts, waived, and a waiver in the round the rule first fired', async () => {
  const draft = (sec, id, text) => [callRow(sec, id, 'bin/vawe dev films/f/page.html'), resultRow(sec + 1, id, text)];
  const fold = await foldOf([
    textRow(0, 'go'),
    ...draft(1, 'd1', devText(['gone', 'stuck', 'waive-me'], ['board: fill it'])),
    callRow(5, 'w', 'x', 'Write', { file_path: '/w/films/f/page.html', content: authoring(['waive-me@1-2']) }), resultRow(6, 'w'),
    ...draft(10, 'd2', devText(['stuck'], ['board: fill it'])),
    textRow(20, 'The coordinator sent a message while you were working: notes'),
    ...draft(30, 'd3', devText(['stuck', 'late'])),
  ]);
  const { advice } = analyze(fold, 'x.jsonl');
  const by = (id) => advice.items.find((i) => i.id === id);
  assert.equal(advice.drafts, 3);
  assert.deepEqual(['gone', 'stuck', 'waive-me', 'board', 'late'].map((id) => by(id).outcome), ['fixed', 'ignored', 'waived', 'fixed', 'open']);
  assert.equal(by('waive-me').waivedSameRound, true);
  assert.equal(advice.waived, 1);
  assert.equal(advice.waivedEntries, 1);
  const agg = aggregate([analyze(fold, 'x.jsonl')]);
  assert.equal(agg.rows.find((r) => r.id === 'ignoredFindings').count, 1);
  assert.equal(agg.rows.find((r) => r.id === 'waivedSameRound').count, 1);
});

test('a streamed message counts its largest output_tokens once', async () => {
  const row = (sec, out) => ({ type: 'assistant', timestamp: stamp(sec), message: { id: 'm1', usage: { input_tokens: 1, output_tokens: out, cache_creation_input_tokens: 5 }, content: [] } });
  const fold = await foldOf([row(0, 3), row(1, 40), row(2, 12)]);
  assert.deepEqual(analyze(fold, 'x.jsonl').tokens, { input: 1, output: 40, cacheRead: 0, cacheWrite: 5 });
});

test('filmWrites sees shell and python writes of every film file', () => {
  const what = (command) => filmWrites('Bash', { command }).map((w) => `${w.film}/${w.what}`);
  assert.deepEqual(what("cat > films/a/DESIGN.md <<'EOF'\nnote > films/b/page.html\nEOF"), ['a/design']);
  assert.deepEqual(what('cp x.css films/a/kit/ground.css'), ['a/kit']);
  assert.deepEqual(what("python3 - <<'EOF'\np='films/a/brief.md'\nopen(p,'w').write('## Board')\nEOF"), ['a/brief']);
  assert.deepEqual(what("python3 -c \"Path('films/a/page.html').write_text('x')\""), ['a/page']);
  assert.deepEqual(what('grep ffmpeg films/a/page.html > out/hits.txt'), []);
  assert.deepEqual(what("python3 - <<'EOF'\nprint(open('films/a/page.html').read())\nEOF"), []);
  assert.match(filmWrites('Bash', { command: "cat > films/a/brief.md <<'EOF'\n## Board\nEOF" })[0].text, /Board/);
});

test('rawTools counts hand-rolled edits even beside a verb, and matches commands not words', () => {
  const edit = "python3 - <<'EOF'\ns=open(p).read()\ns=s.replace('a','b')\nEOF\nbin/vawe dev p";
  assert.deepEqual(rawTools(edit, true), ['pyEdit', 'pyEditNoAssert']);
  assert.deepEqual(rawTools(edit.replace("s=s.replace", "assert 1\ns=s.replace"), true), ['pyEdit']);
  assert.deepEqual(rawTools('python3 -c "import numpy"', false), ['pil']);
  assert.deepEqual(rawTools("node -e 'x' && sed -i '' s/a/b/ f && pkill -f vite", false), ['nodeEval', 'sedInPlace', 'pkill']);
  assert.deepEqual(rawTools('grep -n ffmpeg harness/x.mjs', false), []);
  assert.deepEqual(rawTools('cd out && ffmpeg -i a b', false).filter((t) => t === 'ffmpeg'), ['ffmpeg']);
});

test('a brief write with Ideas and Board starts both stages, and design is seen before dev', async () => {
  const fold = await foldOf([
    callRow(10, 'a', "cat > films/f/DESIGN.md <<'EOF'\n# d\nEOF"), resultRow(11, 'a'),
    callRow(20, 'b', "python3 - <<'EOF'\np='films/f/brief.md'\nopen(p,'w').write('## Ideas\\n## Board')\nEOF"), resultRow(21, 'b'),
    callRow(30, 'c', 'bin/vawe dev films/f/page.html'), resultRow(31, 'c'),
  ]);
  const { first } = analyze(fold, 'x.jsonl').stages;
  assert.deepEqual([first.design, first.ideas, first.board, first.dev], [0, 10, 10, 20]);
});

test('aggregate: studyFirst needs a refs verb, and AGENTS.md is not a guide doc', async () => {
  const agent = async (study, doc) => analyze(await foldOf([
    callRow(0, 'a', `bin/vawe ${study} out/x.mp4`), resultRow(1, 'a'),
    callRow(2, 'r', `sed -n 1,5p ${doc}`), resultRow(3, 'r'),
    callRow(4, 'w', 'cat x > films/f/page.html'), resultRow(5, 'w'),
    callRow(6, 'd', 'bin/vawe dev films/f/page.html'), resultRow(7, 'd'),
  ]), 'x.jsonl');
  const agg = aggregate([await agent('sheet', 'AGENTS.md'), await agent('refs list', 'taste/build/DIGEST.md')]);
  const row = (id) => agg.rows.find((r) => r.id === id);
  assert.equal(row('studyFirst').count, 1);
  assert.equal(row('docBeforePage').count, 1);
  assert.equal(row('digestBeforePage').count, 1);
});
