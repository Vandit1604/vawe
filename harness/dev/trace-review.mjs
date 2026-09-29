// harness/dev/trace-review.mjs: summarise one agent transcript (Claude Code JSONL) into what went
// wrong and what cost the most, so each finished agent run can feed an improvement back.
//   node harness/dev/trace-review.mjs <transcript.jsonl> [more.jsonl ...]
import fs from 'node:fs';

const BIG_RESULT = 8000;
const BLOCK_RE = /BLOCKED|pre-commit blocked|hook error/i;

const toolText = (content) => (typeof content === 'string' ? content
  : Array.isArray(content) ? content.map((c) => c.text ?? '').join('\n') : '');

const briefOf = (input = {}) => String(input.command ?? input.file_path ?? input.pattern ?? input.description ?? '')
  .replace(/\s+/g, ' ').slice(0, 140);

function readRows(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function collectCalls(rows) {
  const calls = new Map();
  for (const r of rows) {
    for (const c of r.message?.content ?? []) {
      if (c.type === 'tool_use') calls.set(c.id, { name: c.name, brief: briefOf(c.input) });
    }
  }
  return calls;
}

function classifyResult(text, isError, call, found) {
  if (BLOCK_RE.test(text)) found.blocked.push(`${call.brief} :: ${text.split('\n').find((l) => BLOCK_RE.test(l) || /error/i.test(l))?.slice(0, 160)}`);
  else if (isError || /Exit code [1-9]/.test(text)) found.failed.push(`${call.name} ${call.brief} :: ${text.split('\n').filter(Boolean).at(-1)?.slice(0, 160)}`);
  if (text.length > BIG_RESULT) found.big.push(`${text.length} chars  ${call.name} ${call.brief}`);
}

function collectResults(rows, calls) {
  const found = { failed: [], blocked: [], big: [] };
  for (const r of rows) {
    for (const c of r.message?.content ?? []) {
      if (c.type === 'tool_result') classifyResult(toolText(c.content), c.is_error, calls.get(c.tool_use_id) ?? { name: '?', brief: '' }, found);
    }
  }
  return found;
}

function repeatsOf(calls) {
  const seen = new Map();
  for (const { name, brief } of calls.values()) seen.set(`${name}:${brief}`, (seen.get(`${name}:${brief}`) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${n}x ${k}`);
}

function minutesOf(rows) {
  const stamps = rows.map((r) => r.timestamp).filter(Boolean);
  return stamps.length ? ((Date.parse(stamps.at(-1)) - Date.parse(stamps[0])) / 60000).toFixed(1) : '?';
}

function review(file) {
  const rows = readRows(file);
  const calls = collectCalls(rows);
  const counts = {};
  for (const { name } of calls.values()) counts[name] = (counts[name] ?? 0) + 1;
  const { failed, blocked, big } = collectResults(rows, calls);
  const out = [`## ${file}`, `minutes ${minutesOf(rows)} · calls ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`];
  for (const [title, list] of [['failed', failed], ['hook blocks', blocked], ['repeated calls', repeatsOf(calls)], ['large results', big]]) {
    if (list.length) out.push(`${title} (${list.length})`, ...list.slice(0, 12).map((l) => `  - ${l}`));
  }
  return out.join('\n');
}

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node harness/dev/trace-review.mjs <transcript.jsonl> ...'); process.exit(2); }
console.log(files.map(review).join('\n\n'));
