#!/usr/bin/env node
// harness/dev/bench.mjs: is authoring a video in THIS repo getting faster or slower, as a number.
//
//   node harness/dev/bench.mjs fast    [--stamp] [--json]   # read-load size + fast-path length (gated)
//   node harness/dev/bench.mjs render  [--json]             # draft render speed, report-only
//   node harness/dev/bench.mjs all     [--stamp] [--json]   # fast + render
//   node harness/dev/bench.mjs session <transcript.jsonl>   # prompt-to-first-draft, report-only
//
// claude.dev's "how we made claude.ai 3x faster" is the model: a deterministic proxy stands in for a
// noisy wall-clock number, CI fails when the proxy gets worse, and the ceiling drops when it improves.
// Two proxies are gated here because they are pure file reads and cannot vary run to run: how many
// words an agent must load before it writes its first layer (readLoad), and how many commands plus
// Makefile targets stand between a brief and the first draft render (fastPath). The draft render
// itself is real wall-clock, so it is report-only: read it, watch the trend, never gate a push on it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { gateFindings, emitJson } from '../lib/findings.mjs';
import { STAGE_ORDER } from '../../quality/gates/stage.mjs';
import { skillsForStage } from '../lib/skill-stages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RATCHET = path.join(ROOT, 'quality/baselines/bench-ratchet.json');

// "before it writes its first layer": a scene has layers from the assemble stage on, so the read-load
// floor stops at the stage that produces them, not at the whole eight-stage pipeline.
const READ_LOAD_STAGES = STAGE_ORDER.slice(0, 5); // brief, plan, design, approval, assemble
const FIRST_DRAFT_RENDER_CMD = /^make (dev|preview)$/; // the table's own name for the first draft render

const wordsIn = (text) => text.trim().split(/\s+/).filter(Boolean).length;

function loadRatchet() {
  try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; }
}

function saveRatchet(patch) {
  const prior = loadRatchet() || {};
  fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
  fs.writeFileSync(RATCHET, `${JSON.stringify({ ...prior, ...patch }, null, 1)}\n`);
}

// ---- 1. read-load: the words an agent must load before writing its first layer --------------------
function readLoad() {
  const detail = [];
  let words = 0;
  for (const rel of ['CLAUDE.md', 'AGENTS.md']) {
    const w = wordsIn(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    words += w;
    detail.push({ file: rel, words: w });
  }

  const skillNames = new Set();
  for (const stage of READ_LOAD_STAGES) for (const name of skillsForStage(stage)) skillNames.add(name);
  for (const name of [...skillNames].sort()) {
    const f = path.join(ROOT, 'skills', name, 'SKILL.md');
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const w = wordsIn(text);
    words += w;
    detail.push({ file: `skills/${name}/SKILL.md`, words: w });
  }

  return { words, tokens: Math.round(words * 1.33), stages: READ_LOAD_STAGES, skills: [...skillNames].sort(), detail };
}

// ---- 2. fast-path: commands from brief to first draft render, plus the size of the catalogue -------
// Reads AGENTS.md's own stage table rather than re-deriving the count by hand, for the reason
// harness/lib/skill-stages.mjs gives for not hand-keeping a second stage->skill table: a hand-kept
// number drifts from the doc the moment a row changes and nothing forces the two edits together.
// Scans the table row by row and stops the moment it reaches the first draft render, inclusive:
// "brief to first draft render" is a point in the SEQUENCE of commands, not a fixed row count, so a
// reordered or merged stage row cannot silently change what this counts.
function fastPathCommands() {
  const text = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  const lines = text.split('\n');
  const headerIdx = lines.findIndex((l) => l.includes('| # | stage |') && l.includes('the command'));
  if (headerIdx === -1) throw new Error('bench: could not find the stage table in AGENTS.md (header row moved?)');

  const commands = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim().startsWith('|')) break;
    const cells = row.split('|');
    const commandCell = cells[cells.length - 2] || '';
    for (const m of commandCell.match(/`make [\w-]+/g) || []) {
      const cmd = m.slice(1);
      commands.push(cmd);
      if (FIRST_DRAFT_RENDER_CMD.test(cmd)) return commands;
    }
  }
  return commands;
}

function makefileTargetCount() {
  const text = fs.readFileSync(path.join(ROOT, 'Makefile'), 'utf8');
  let count = 0;
  for (const line of text.split('\n')) {
    if (/^[A-Za-z][A-Za-z0-9_-]*:/.test(line) && !line.startsWith('.PHONY')) count++;
  }
  return count;
}

function fastPath() {
  const commands = fastPathCommands();
  return { commands: commands.length, commandList: commands, makefileTargets: makefileTargetCount() };
}

// ---- 3. draft render speed: report-only, wall clock is noisy ---------------------------------------
const RENDER_FIXTURE = path.join(ROOT, 'tests/fixtures/films/sample.json');
const RENDER_RUNS = 3;

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function runOneRender(outPath) {
  const t0 = Date.now();
  let stdout = '';
  try {
    // VAWE_SERVE_ALL=1: the render server's own escape hatch for a scene outside films/ (renderer's
    // internal/scene path allowlist), documented in its refusal message as "a local debug render".
    // The fixture lives in tests/ on purpose (never in films/, which is gitignored and not a fixture).
    stdout = execFileSync('sh', ['-c',
      `. harness/dev/chrome-pin.sh bench >/dev/null 2>&1; VAWE_SERVE_ALL=1 ./bin/vawe --module scene --data "${RENDER_FIXTURE}" --draft --workers 4 --out "${outPath}"`,
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    throw new Error(`bench render failed (is bin/vawe built? \`make build\`): ${err.stderr || err.message}`);
  }
  const ms = Date.now() - t0;
  const m = /(\d+)\s+frames/.exec(stdout);
  const frames = m ? Number(m[1]) : null;
  return { ms, frames };
}

function renderBench() {
  if (!fs.existsSync(path.join(ROOT, 'bin/vawe'))) {
    throw new Error('bench render: bin/vawe is not built. Run `make build` first.');
  }
  const runs = [];
  for (let i = 0; i < RENDER_RUNS; i++) runs.push(runOneRender(path.join(ROOT, `out/.bench-render-${i}.mp4`)));
  const ms = runs.map((r) => r.ms);
  const frames = runs[0].frames;
  const msMedian = median(ms);
  return { runs: ms, msMedian, frames, msPerFrame: frames ? msMedian / frames : null };
}

// ---- 4. session benchmark: prompt to first draft render, from a real transcript --------------------
// Robust to a SUBAGENT transcript too: same JSONL line shape as a main session (harness/dev/token-cost.mjs),
// so a bare file is read exactly the same way whether it is `<session>.jsonl` or
// `<session>/subagents/agent-*.jsonl`. Given a directory, every subagent file under it is folded in by
// timestamp so a tool call issued by a subagent still counts toward the total.
const DRAFT_RENDER_RE = /\bmake\s+dev\b|\bmake\s+preview\b|vawe(\.mjs)?\b[^\n]*--draft\b|--draft\b[^\n]*vawe\b/i;
const DRAFT_TOOL_NAMES = new Set(['mcp__vawe__vawe_draft']);

// A 'user' line is either the human's own message or a tool_result carried back to the model; only
// the former counts as "the prompt started here", so a bare tool_result line is read for its
// tool-success side effect and never mistaken for a real user turn.
function handleUserLine(d, ts, events, pendingToolUse) {
  const content = d.message.content;
  const isRealUserText = typeof content === 'string'
    ? content.trim().length > 0
    : Array.isArray(content) && content.some((c) => c && c.type !== 'tool_result');
  if (isRealUserText) events.push({ ts, kind: 'user-message' });
  if (!Array.isArray(content)) return;
  for (const c of content) {
    if (!c || c.type !== 'tool_result') continue;
    const use = pendingToolUse.get(c.tool_use_id);
    if (use && !c.is_error) events.push({ ts, kind: 'tool-success', name: use.name, command: use.command });
  }
}

function handleAssistantLine(d, ts, events, pendingToolUse, seenMessageIds) {
  const msg = d.message;
  for (const c of msg.content || []) {
    if (!c || c.type !== 'tool_use') continue;
    const command = c.input && typeof c.input.command === 'string' ? c.input.command : '';
    pendingToolUse.set(c.id, { name: c.name, command, ts });
    events.push({ ts, kind: 'tool-call', name: c.name, command });
  }
  if (!msg.usage || !msg.id || seenMessageIds.has(msg.id)) return;
  seenMessageIds.add(msg.id);
  const u = msg.usage;
  events.push({
    ts, kind: 'usage',
    input: u.input_tokens || 0,
    output: u.output_tokens || 0,
    cacheRead: u.cache_read_input_tokens || 0,
    cacheWrite: u.cache_creation_input_tokens || 0,
  });
}

function readEvents(filePath) {
  return new Promise((resolve, reject) => {
    const events = [];
    const pendingToolUse = new Map(); // tool_use_id -> {name, command, ts}
    const seenMessageIds = new Set();
    const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line) return;
      let d;
      try { d = JSON.parse(line); } catch { return; }
      const ts = d.timestamp ? Date.parse(d.timestamp) : null;
      if (ts == null || Number.isNaN(ts) || !d.message) return;
      if (d.type === 'user') handleUserLine(d, ts, events, pendingToolUse);
      else if (d.type === 'assistant') handleAssistantLine(d, ts, events, pendingToolUse, seenMessageIds);
    });
    rl.on('close', () => resolve(events));
    rl.on('error', reject);
  });
}

function isDraftRenderTool(name, command) {
  if (DRAFT_TOOL_NAMES.has(name)) return true;
  if (name === 'Bash' && DRAFT_RENDER_RE.test(command || '')) return true;
  return false;
}

async function sessionBench(transcriptPath) {
  const stat = fs.statSync(transcriptPath);
  const files = stat.isDirectory()
    ? [
      ...fs.readdirSync(transcriptPath).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(transcriptPath, f)),
      ...(fs.existsSync(path.join(transcriptPath, 'subagents'))
        ? fs.readdirSync(path.join(transcriptPath, 'subagents')).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(transcriptPath, 'subagents', f))
        : []),
    ]
    : [transcriptPath];

  const events = (await Promise.all(files.map(readEvents))).flat().sort((a, b) => a.ts - b.ts);

  const firstUser = events.find((e) => e.kind === 'user-message');
  const firstDraft = events.find((e) => e.kind === 'tool-success' && isDraftRenderTool(e.name, e.command));

  if (!firstUser) return { ok: false, reason: 'no user message found in transcript' };
  if (!firstDraft) return { ok: false, reason: 'no successful draft-render command (make dev / vawe --draft / make preview) found' };

  const window = events.filter((e) => e.ts >= firstUser.ts && e.ts <= firstDraft.ts);
  const toolCalls = window.filter((e) => e.kind === 'tool-call').length;
  const usage = window.filter((e) => e.kind === 'usage');
  const totals = usage.reduce((acc, u) => ({
    input: acc.input + u.input, output: acc.output + u.output,
    cacheRead: acc.cacheRead + u.cacheRead, cacheWrite: acc.cacheWrite + u.cacheWrite,
  }), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  const denom = totals.input + totals.cacheRead + totals.cacheWrite;

  return {
    ok: true,
    minutes: (firstDraft.ts - firstUser.ts) / 60000,
    toolCalls,
    tokens: totals,
    cacheHitRatePct: denom ? Math.round((100 * totals.cacheRead) / denom) : 0,
    files: files.length,
  };
}

// ---- report + gate -----------------------------------------------------------------------------
const f = gateFindings({ line: (r) => `  ${r.summary}` });

function reportFast(stamp) {
  const rl = readLoad();
  const fp = fastPath();
  const prior = loadRatchet();

  console.log(`\n── bench · fast (deterministic, gated)\n`);
  console.log(`  read-load   ${rl.words} word(s) / ~${rl.tokens} token(s)  (CLAUDE.md + AGENTS.md + ${rl.skills.length} skill(s): ${rl.skills.join(', ') || 'none'})`);
  console.log(`  fast-path   ${fp.commands} command(s) brief -> first draft render (${fp.commandList.join(', ')}), ${fp.makefileTargets} Makefile target(s)`);

  if (stamp) {
    saveRatchet({ readLoad: { words: rl.words, tokens: rl.tokens }, fastPath: { commands: fp.commands, makefileTargets: fp.makefileTargets } });
    console.log(`\n  stamped: read-load ${rl.words}w, fast-path ${fp.commands} command(s) / ${fp.makefileTargets} target(s)\n`);
    return { failed: false, rl, fp };
  }

  let failed = false;
  if (prior?.readLoad && rl.words > prior.readLoad.words) {
    failed = true;
    f.fail('bench-read-load-grew', `read-load grew to ${rl.words} word(s), up from the stamped ${prior.readLoad.words}. `
      + 'An agent now loads more before writing its first layer. If deliberate, re-stamp: '
      + 'node harness/dev/bench.mjs fast --stamp', { at: 'quality/baselines/bench-ratchet.json' });
  } else if (prior?.readLoad) {
    console.log(`  ✓ read-load holds at or under the ratchet (${prior.readLoad.words}w)`);
  } else {
    console.log('  (no read-load ratchet stamped yet: node harness/dev/bench.mjs fast --stamp)');
  }

  if (prior?.fastPath && (fp.commands > prior.fastPath.commands || fp.makefileTargets > prior.fastPath.makefileTargets)) {
    failed = true;
    f.fail('bench-fast-path-grew', `fast-path grew: ${fp.commands} command(s) (was ${prior.fastPath.commands}), `
      + `${fp.makefileTargets} Makefile target(s) (was ${prior.fastPath.makefileTargets}). If deliberate, re-stamp: `
      + 'node harness/dev/bench.mjs fast --stamp', { at: 'quality/baselines/bench-ratchet.json' });
  } else if (prior?.fastPath) {
    console.log(`  ✓ fast-path holds at or under the ratchet (${prior.fastPath.commands} command(s), ${prior.fastPath.makefileTargets} target(s))`);
  } else {
    console.log('  (no fast-path ratchet stamped yet: node harness/dev/bench.mjs fast --stamp)');
  }

  return { failed, rl, fp };
}

function reportRender(stamp) {
  const r = renderBench();
  console.log(`\n── bench · draft render speed (report-only, median of ${RENDER_RUNS} runs)\n`);
  console.log(`  ${r.runs.map((ms) => `${ms}ms`).join(', ')}  ->  median ${r.msMedian}ms`
    + (r.frames ? `, ${r.frames} frame(s), ${(r.msMedian / r.frames).toFixed(1)}ms/frame` : ''));
  if (stamp) saveRatchet({ render: { msMedian: r.msMedian, msPerFrame: r.msPerFrame, frames: r.frames } });
  else {
    const prior = loadRatchet();
    if (prior?.render?.msMedian) {
      const deltaPct = Math.round((100 * (r.msMedian - prior.render.msMedian)) / prior.render.msMedian);
      console.log(`  ${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs the last stamped median (${prior.render.msMedian}ms). Report-only: never blocks a push.`);
    } else {
      console.log('  (no render baseline stamped yet: node harness/dev/bench.mjs render --stamp)');
    }
  }
  return r;
}

// JSON mode carries the real numbers, not just pass/fail: findings.mjs's gateFindings alone would
// only surface a fail/warn record, and a report-only mode (render, session) has no fail record ever,
// so its --json would otherwise say nothing at all. emitJson is the documented escape hatch for a
// caller that needs a payload richer than a findings array.
async function main() {
  const [, , cmdRaw, ...rest] = process.argv;
  const cmd = cmdRaw && !cmdRaw.startsWith('-') ? cmdRaw : 'all';
  const stamp = process.argv.includes('--stamp');
  const json = process.argv.includes('--json');

  if (cmd === 'fast') {
    const { failed, rl, fp } = reportFast(stamp);
    if (json) emitJson({ readLoad: rl, fastPath: fp, failed, findings: f.records });
    else f.emit();
    if (failed) process.exit(1);
  } else if (cmd === 'render') {
    const r = reportRender(stamp);
    if (json) emitJson(r);
  } else if (cmd === 'all') {
    const { failed, rl, fp } = reportFast(stamp);
    const r = reportRender(stamp);
    if (json) emitJson({ readLoad: rl, fastPath: fp, render: r, failed, findings: f.records });
    else f.emit();
    if (failed) process.exit(1);
  } else if (cmd === 'session') {
    const transcriptPath = rest.find((a) => !a.startsWith('-'));
    if (!transcriptPath) {
      console.error('usage: node harness/dev/bench.mjs session <transcript.jsonl|session-dir>');
      process.exit(1);
    }
    const result = await sessionBench(path.resolve(transcriptPath));
    if (json) {
      emitJson(result);
    } else if (!result.ok) {
      console.log(`\n── bench · session (report-only)\n\n  ${result.reason}\n`);
    } else {
      console.log(`\n── bench · session: prompt to first draft render (report-only)\n`);
      console.log(`  ${result.minutes.toFixed(1)} minute(s), ${result.toolCalls} tool call(s), ${result.files} file(s) read`);
      console.log(`  tokens: in=${result.tokens.input} out=${result.tokens.output} cache_read=${result.tokens.cacheRead} cache_write=${result.tokens.cacheWrite}`);
      console.log(`  cache hit rate: ${result.cacheHitRatePct}%\n`);
    }
  } else {
    console.error(`bench: unknown command "${cmd}" (fast | render | all | session <path>)`);
    process.exit(1);
  }
}

main().catch((err) => { console.error(err.stack || err.message); process.exit(1); });
