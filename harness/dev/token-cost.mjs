#!/usr/bin/env node
// harness/dev/token-cost.mjs: what did agent sessions on this repo actually cost, by billing type.
//
//   node harness/dev/token-cost.mjs                    # every session on record
//   node harness/dev/token-cost.mjs --since 2026-09-01  # only requests logged after that date
//   node harness/dev/token-cost.mjs --session 31437b80  # one main session (and its subagents) by id prefix
//   node harness/dev/token-cost.mjs --limit 20          # the 20 most-recently-touched main sessions
//   node harness/dev/token-cost.mjs --json              # machine-readable report
//   node harness/dev/token-cost.mjs --self-test         # dedupe + billing math, no real transcripts
//
// WHY THIS EXISTS. A throwaway parser answered "what does a session cost" once, by hand, then had to
// skip its three biggest files (463MB-1.38GB) because it read each one whole into memory before
// touching a byte of it. Those three hold almost all of the subagent transcripts and tool output on
// this repo, so the number it produced was a number for the sessions that happened to be small. This
// reads every file line by line (readline over a stream), so a 1.38GB transcript costs the same RAM as
// a 1KB one, and the baseline covers what actually ran, not what fit in memory.
//
// ONE MESSAGE, MANY LINES. The transcript logs one JSONL line per content block, so a single API
// response with a thinking block, a tool call and a text reply is three lines sharing one message id,
// each carrying the FULL usage for that response. Summing them would count every response 2-4x; this
// keeps the first line seen per message id per file and throws the rest away unread.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Prices per million tokens, owner-supplied 2026-09-25, verify against the provider's pricing page
// before trusting this for anything but a relative before/after comparison.
const PRICING = {
  opus: { input: 15, output: 75, cache_write: 18.75, cache_read: 1.50 },
  sonnet: { input: 3, output: 15, cache_write: 3.75, cache_read: 0.30 },
  haiku: { input: 1, output: 5, cache_write: 1.25, cache_read: 0.10 },
};
const MID_SESSION_CACHE_WRITE_TOKENS = 3000;

function tierFor(model) {
  const m = (model || '').toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return null;
}

function costOf(usage, tier) {
  const p = PRICING[tier];
  const input = ((usage.input_tokens || 0) / 1e6) * p.input;
  const cache_write = ((usage.cache_creation_input_tokens || 0) / 1e6) * p.cache_write;
  const cache_read = ((usage.cache_read_input_tokens || 0) / 1e6) * p.cache_read;
  const output = ((usage.output_tokens || 0) / 1e6) * p.output;
  return { input, cache_write, cache_read, output, total: input + cache_write + cache_read + output };
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function p90(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.9 * (s.length - 1)))];
}

// A tool_result's content is a raw string on most calls, or a list of content blocks (text, image,
// ...) when a tool returns structured output; either way this is an approximate char count, not a
// token count, used only to compare tools' result sizes against each other.
function resultChars(content) {
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) {
    return content.reduce((sum, item) => {
      if (item && typeof item === 'object' && item.type === 'text') return sum + (item.text || '').length;
      return sum + JSON.stringify(item ?? '').length;
    }, 0);
  }
  return content == null ? 0 : JSON.stringify(content).length;
}

function attachmentChars(att) {
  const c = att.content ?? att.stdout ?? '';
  if (typeof c === 'string') return c.length;
  if (Array.isArray(c)) return c.reduce((s, x) => s + (typeof x === 'string' ? x.length : JSON.stringify(x).length), 0);
  return JSON.stringify(c).length;
}

// The repo path this project's transcripts are filed under, encoded the way Claude Code names
// ~/.claude/projects/<encoded> directories: every "/" and "." becomes "-". Read off git rather than
// hardcoded, so a worktree or a clone at a different path still finds its own history.
function repoEncodedPrefix() {
  try {
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim();
    const root = path.dirname(path.resolve(commonDir));
    return root.replace(/[/.]/g, '-');
  } catch {
    return '-Users-vandit-Developer-code-shortwave';
  }
}

function findProjectDirs(claudeProjectsDir, prefix) {
  let entries;
  try { entries = fs.readdirSync(claudeProjectsDir, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith(prefix))
    .map((e) => path.join(claudeProjectsDir, e.name));
}

// One row per main session: its own .jsonl plus every subagents/agent-*.jsonl filed under the same
// directory name. A subagent has no independent identity worth reporting on its own; it is billed
// under the main session that spawned it.
function findSessionGroups(projectDirs) {
  const groups = [];
  for (const dir of projectDirs) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.jsonl')) continue;
      const sessionId = e.name.slice(0, -'.jsonl'.length);
      const mainPath = path.join(dir, e.name);
      const mtimeMs = fs.statSync(mainPath).mtimeMs;
      const subDir = path.join(dir, sessionId, 'subagents');
      const subagents = [];
      try {
        for (const sf of fs.readdirSync(subDir)) {
          if (sf.endsWith('.jsonl')) subagents.push(path.join(subDir, sf));
        }
      } catch { /* no subagents directory */ }
      groups.push({ sessionId, mainPath, mtimeMs, subagents });
    }
  }
  return groups;
}

function newSessionAgg(sessionId, source) {
  return { sessionId, source, requests: 0, costTotal: 0, cacheRead: 0, cacheCreation: 0, input: 0, firstPrefix: null };
}

// Streams one transcript file and folds it into the shared report accumulators. Never holds the file
// in memory: one line in, one line's effect on the totals, then the line is garbage.
function processFile(filePath, sessionId, source, sinceIso, report) {
  return new Promise((resolve, reject) => {
    const seenMessageIds = new Set();
    const pendingToolNames = new Map(); // tool_use_id -> tool name, for the matching tool_result
    const sess = newSessionAgg(sessionId, source);
    let requestIndex = 0;

    const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line) return;
      let d;
      try { d = JSON.parse(line); } catch { return; }
      if (sinceIso && d.timestamp && d.timestamp < sinceIso) return;

      if (d.type === 'assistant' && d.message) {
        const msg = d.message;
        for (const c of msg.content || []) {
          if (c && c.type === 'tool_use') pendingToolNames.set(c.id, c.name);
        }
        if (msg.usage && msg.id) {
          if (seenMessageIds.has(msg.id)) return;
          seenMessageIds.add(msg.id);

          const model = msg.model || 'unknown';
          const tier = tierFor(model);
          const usage = msg.usage;
          const prefixTokens = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);

          sess.requests += 1;
          sess.cacheRead += usage.cache_read_input_tokens || 0;
          sess.cacheCreation += usage.cache_creation_input_tokens || 0;
          sess.input += usage.input_tokens || 0;
          if (requestIndex === 0 && source === 'main') sess.firstPrefix = prefixTokens;

          if (tier) {
            const cost = costOf(usage, tier);
            sess.costTotal += cost.total;
            for (const k of ['input', 'cache_write', 'cache_read', 'output']) report.billingTotals[k] += cost[k];
            report.totalCost += cost.total;
            if (source === 'main') report.mainCost += cost.total; else report.subagentCost += cost.total;
            const perModel = report.byModel.get(model) || { requests: 0, input: 0, cache_write: 0, cache_read: 0, output: 0, total: 0 };
            perModel.requests += 1;
            perModel.input += cost.input;
            perModel.cache_write += cost.cache_write;
            perModel.cache_read += cost.cache_read;
            perModel.output += cost.output;
            perModel.total += cost.total;
            report.byModel.set(model, perModel);

            if (requestIndex > 0 && (usage.cache_creation_input_tokens || 0) > MID_SESSION_CACHE_WRITE_TOKENS) {
              report.midSessionCacheWrites.push({
                sessionId, ts: d.timestamp, model,
                cacheWriteTokens: usage.cache_creation_input_tokens,
                cost: (usage.cache_creation_input_tokens / 1e6) * PRICING[tier].cache_write,
              });
            }
          } else {
            const u = report.unknownModels.get(model) || { requests: 0, tokens: 0 };
            u.requests += 1;
            u.tokens += (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.output_tokens || 0);
            report.unknownModels.set(model, u);
          }
          requestIndex += 1;
        }
      } else if (d.type === 'user' && d.message && Array.isArray(d.message.content)) {
        for (const c of d.message.content) {
          if (!c || c.type !== 'tool_result') continue;
          const name = pendingToolNames.get(c.tool_use_id) || 'unknown';
          const stats = report.tools.get(name) || { calls: 0, sessions: new Set(), errors: 0, resultLens: [] };
          stats.calls += 1;
          stats.sessions.add(sessionId);
          if (c.is_error) stats.errors += 1;
          stats.resultLens.push(resultChars(c.content));
          report.tools.set(name, stats);
        }
      } else if (d.type === 'attachment' && d.attachment) {
        const hookName = d.attachment.hookName || d.attachment.type || 'unknown';
        const stats = report.hooks.get(hookName) || { count: 0, lens: [] };
        stats.count += 1;
        stats.lens.push(attachmentChars(d.attachment));
        report.hooks.set(hookName, stats);
      }
    });
    rl.on('close', () => { if (sess.requests > 0) report.sessions.push(sess); resolve(); });
    rl.on('error', reject);
  });
}

function newReport() {
  return {
    totalCost: 0,
    mainCost: 0,
    subagentCost: 0,
    billingTotals: { input: 0, cache_write: 0, cache_read: 0, output: 0 },
    byModel: new Map(),
    unknownModels: new Map(),
    sessions: [],
    tools: new Map(),
    hooks: new Map(),
    midSessionCacheWrites: [],
  };
}

async function run({ since, session, limit, json }) {
  const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
  const prefix = repoEncodedPrefix();
  const projectDirs = findProjectDirs(claudeProjectsDir, prefix);
  let groups = findSessionGroups(projectDirs);

  if (session) groups = groups.filter((g) => g.sessionId.startsWith(session));
  groups.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (limit) groups = groups.slice(0, limit);

  const sinceIso = since ? new Date(since).toISOString() : null;
  const report = newReport();
  let sessionFiles = 0, subagentFiles = 0;

  for (const g of groups) {
    await processFile(g.mainPath, g.sessionId, 'main', sinceIso, report);
    sessionFiles += 1;
    for (const sf of g.subagents) {
      await processFile(sf, g.sessionId, 'subagent', sinceIso, report);
      subagentFiles += 1;
    }
  }

  report.scope = { prefix, sessionGroups: groups.length, sessionFiles, subagentFiles };
  if (json) { console.log(JSON.stringify(serializeReport(report), null, 2)); return; }
  console.log(renderText(report));
}

function serializeReport(report) {
  const pct = (n) => report.totalCost ? (100 * n / report.totalCost).toFixed(1) : '0.0';
  return {
    scope: report.scope,
    totalCost: report.totalCost,
    mainCost: report.mainCost,
    subagentCost: report.subagentCost,
    billingShare: Object.fromEntries(Object.entries(report.billingTotals).map(([k, v]) => [k, { cost: v, pct: pct(v) }])),
    byModel: Object.fromEntries([...report.byModel].map(([k, v]) => [k, v])),
    unknownModels: Object.fromEntries(report.unknownModels),
    sessions: report.sessions,
    tools: Object.fromEntries([...report.tools].map(([k, v]) => [k, {
      calls: v.calls, sessions: v.sessions.size, errors: v.errors,
      errorRatePct: v.calls ? (100 * v.errors / v.calls).toFixed(1) : '0.0',
      medianResultChars: median(v.resultLens), p90ResultChars: p90(v.resultLens),
    }])),
    hooks: Object.fromEntries([...report.hooks].map(([k, v]) => [k, { count: v.count, medianChars: median(v.lens) }])),
    midSessionCacheWrites: {
      count: report.midSessionCacheWrites.length,
      totalCost: report.midSessionCacheWrites.reduce((s, r) => s + r.cost, 0),
    },
  };
}

function renderText(report) {
  const pct = (n) => report.totalCost ? (100 * n / report.totalCost).toFixed(1) : '0.0';
  const lines = [];
  lines.push(`# token-cost baseline`);
  lines.push(`scope: prefix ${report.scope.prefix}, ${report.scope.sessionGroups} main sessions (${report.scope.sessionFiles} files, ${report.scope.subagentFiles} subagent files)`);
  lines.push('');

  lines.push('## totals by billing type');
  for (const [k, v] of Object.entries(report.billingTotals)) {
    lines.push(`  ${k.padEnd(12)} $${v.toFixed(4)}  ${pct(v)}%`);
  }
  lines.push(`  TOTAL        $${report.totalCost.toFixed(4)}`);
  lines.push('');

  lines.push('## totals by model');
  for (const [model, v] of [...report.byModel].sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`  ${model.padEnd(28)} $${v.total.toFixed(4)}  (${pct(v.total)}%)  requests=${v.requests}  in=$${v.input.toFixed(3)} cw=$${v.cache_write.toFixed(3)} cr=$${v.cache_read.toFixed(3)} out=$${v.output.toFixed(3)}`);
  }
  if (report.unknownModels.size) {
    lines.push('  unknown models (not priced, tokens only):');
    for (const [model, v] of report.unknownModels) lines.push(`    ${model}: requests=${v.requests} tokens=${v.tokens}`);
  }
  lines.push('');

  lines.push('## main thread vs subagent share');
  lines.push(`  main:     $${report.mainCost.toFixed(4)}  (${pct(report.mainCost)}%)`);
  lines.push(`  subagent: $${report.subagentCost.toFixed(4)}  (${pct(report.subagentCost)}%)`);
  lines.push('');

  const mainSessions = report.sessions.filter((s) => s.source === 'main');
  const costs = mainSessions.map((s) => s.costTotal);
  const reqs = mainSessions.map((s) => s.requests);
  const hitRates = mainSessions.map((s) => {
    const denom = s.cacheRead + s.cacheCreation + s.input;
    return denom ? (100 * s.cacheRead / denom) : 0;
  });
  const prefixes = mainSessions.map((s) => s.firstPrefix).filter((x) => x != null);
  lines.push('## per-session (main sessions)');
  lines.push(`  n=${mainSessions.length}`);
  lines.push(`  cost:     median $${median(costs).toFixed(3)}  p90 $${p90(costs).toFixed(3)}`);
  lines.push(`  requests: median ${median(reqs).toFixed(0)}  p90 ${p90(reqs).toFixed(0)}`);
  lines.push(`  cache hit rate: median ${median(hitRates).toFixed(1)}%`);
  lines.push('');

  lines.push('## first-request prefix size (main sessions)');
  lines.push(`  n=${prefixes.length}  median ${median(prefixes).toFixed(0)} tok  p90 ${p90(prefixes).toFixed(0)} tok`);
  lines.push('');

  lines.push('## per-tool');
  const toolRows = [...report.tools].sort((a, b) => b[1].calls - a[1].calls);
  for (const [name, v] of toolRows) {
    const errPct = v.calls ? (100 * v.errors / v.calls).toFixed(1) : '0.0';
    lines.push(`  ${name.padEnd(22)} calls=${String(v.calls).padStart(5)} sessions=${v.sessions.size} err=${errPct}%  med_chars=${median(v.resultLens).toFixed(0)}  p90_chars=${p90(v.resultLens).toFixed(0)}`);
  }
  lines.push('');

  lines.push('## injected hook / attachment text');
  const hookRows = [...report.hooks].sort((a, b) => b[1].count - a[1].count);
  for (const [name, v] of hookRows) {
    lines.push(`  ${name.padEnd(30)} n=${v.count}  median_chars=${median(v.lens).toFixed(0)}`);
  }
  lines.push('');

  const msTotal = report.midSessionCacheWrites.reduce((s, r) => s + r.cost, 0);
  lines.push('## mid-session cache writes over 3000 tokens');
  lines.push(`  count=${report.midSessionCacheWrites.length}  extra cost=$${msTotal.toFixed(4)}  (${pct(msTotal)}%)`);

  return lines.join('\n');
}

// --- self-test: proves the dedupe-by-message-id and the billing math against a hand-computed
// fixture, without touching real transcripts. No fixture file: the JSONL is small enough to inline,
// and inlining it is what keeps this test readable next to the numbers it checks.
async function selfTest() {
  const lines = [
    // message A: two content-block lines sharing one id, sonnet, same usage on both (must count once)
    JSON.stringify({ type: 'assistant', timestamp: '2026-09-01T00:00:00Z', message: { id: 'msg_A', model: 'claude-sonnet-5', content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 0, output_tokens: 50 } } }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-09-01T00:00:01Z', message: { id: 'msg_A', model: 'claude-sonnet-5', content: [], usage: { input_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 0, output_tokens: 50 } } }),
    // message B: opus, carries a tool_use
    JSON.stringify({ type: 'assistant', timestamp: '2026-09-01T00:00:02Z', message: { id: 'msg_B', model: 'claude-opus-5', content: [{ type: 'tool_use', id: 't1', name: 'Bash' }], usage: { input_tokens: 5, cache_creation_input_tokens: 200, cache_read_input_tokens: 800, output_tokens: 20 } } }),
    JSON.stringify({ type: 'user', timestamp: '2026-09-01T00:00:03Z', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'hello result', is_error: false }] } }),
    JSON.stringify({ type: 'attachment', timestamp: '2026-09-01T00:00:04Z', attachment: { hookName: 'SessionStart:startup', content: 'hook text here' } }),
    // message C: sonnet, not the first request, cache write over the 3000-token threshold
    JSON.stringify({ type: 'assistant', timestamp: '2026-09-01T00:00:05Z', message: { id: 'msg_C', model: 'claude-sonnet-5', content: [], usage: { input_tokens: 1, cache_creation_input_tokens: 5000, cache_read_input_tokens: 0, output_tokens: 10 } } }),
    // message D: an unpriced model, reported separately, excluded from totalCost
    JSON.stringify({ type: 'assistant', timestamp: '2026-09-01T00:00:06Z', message: { id: 'msg_D', model: 'claude-mystery-1', content: [], usage: { input_tokens: 7, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 3 } } }),
  ];
  const fixturePath = path.join(os.tmpdir(), `token-cost-selftest-${process.pid}.jsonl`);
  fs.writeFileSync(fixturePath, lines.join('\n') + '\n');

  const report = newReport();
  try {
    await processFile(fixturePath, 'selftest-session', 'main', null, report);
  } finally {
    fs.unlinkSync(fixturePath);
  }

  const session = report.sessions[0];
  assert.equal(session.requests, 4, 'dedupe: expected 4 distinct message ids (A once, B, C, D)');

  const expectedCostA = (100 / 1e6) * 3 + (1000 / 1e6) * 3.75 + 0 + (50 / 1e6) * 15;
  const expectedCostB = (5 / 1e6) * 15 + (200 / 1e6) * 18.75 + (800 / 1e6) * 1.50 + (20 / 1e6) * 75;
  const expectedCostC = (1 / 1e6) * 3 + (5000 / 1e6) * 3.75 + 0 + (10 / 1e6) * 15;
  const expectedTotal = expectedCostA + expectedCostB + expectedCostC;
  assert.ok(Math.abs(report.totalCost - expectedTotal) < 1e-9, `billing math: got ${report.totalCost}, want ${expectedTotal}`);

  assert.equal(report.unknownModels.get('claude-mystery-1')?.requests, 1, 'unknown model reported separately');
  assert.ok(!('claude-mystery-1' in Object.fromEntries(report.byModel)), 'unknown model excluded from priced totals');

  assert.equal(report.midSessionCacheWrites.length, 1, 'only the non-first cache write over 3000 tokens counts');
  assert.equal(report.midSessionCacheWrites[0].cacheWriteTokens, 5000);

  const bash = report.tools.get('Bash');
  assert.equal(bash.calls, 1);
  assert.equal(bash.errors, 0);
  assert.equal(bash.resultLens[0], 'hello result'.length);

  const hook = report.hooks.get('SessionStart:startup');
  assert.equal(hook.count, 1);
  assert.equal(hook.lens[0], 'hook text here'.length);

  console.log('self-test passed: dedupe, billing math, tool stats, hook stats, unknown-model handling all check out');
}

function parseArgs(argv) {
  const opts = { since: null, session: null, limit: null, json: false, selfTest: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--since') opts.since = argv[++i];
    else if (a === '--session') opts.session = argv[++i];
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a === '--json') opts.json = true;
    else if (a === '--self-test') opts.selfTest = true;
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.selfTest) {
  selfTest().catch((err) => { console.error(err); process.exit(1); });
} else {
  run(opts).catch((err) => { console.error(err); process.exit(1); });
}
