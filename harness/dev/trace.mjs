#!/usr/bin/env node
// Parse a Claude Code JSONL agent trace into typed spans, then print a route scorecard from them.
// Usage: node harness/dev/trace.mjs <transcript.jsonl> [spans.jsonl]
//   writes spans (default: spans.jsonl next to the input) and prints, to stdout, minutes/tool
//   calls/tokens per route step, stills-before-motion yes/no, docs read vs routed (via Skill),
//   arsenal searches, renders, errors (with any command that failed more than once), and wait time
//   (gaps between spans over WAIT_GAP_S, the shape of a sleep-loop or an async render/judge wait).
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

const DOC_PATTERNS = [
  /AGENTS\.md/, /engine-doctrine\//, /skills\//, /CLAUDE\.md/, /README/i,
  /ROUTING\.md/, /TASTE\.md/, /CRAFT\//, /RULES\//, /skill\.md/i,
];
const RENDER_CMD = /\bmake\s+(dev|ship|preview|look)\b|\bvawe\b.*(--draft|render)|harness\/dev\/render|node\s+.*render/;
const VERIFY_CMD = /verify\.mjs|make\s+(check|probe|audit|beats|author-check)\b/;
const JUDGE_CMD = /judge\.mjs|make\s+judge\b|make\s+ledger\b/;
const SEARCH_CMD = /arsenal\.mjs|\bgrep\b|\brg\b|find\s|search_symbols|ast-grep/;
const LOOKS_CMD = /make\s+look\b.*LOOKS=1|preview\.mjs.*\blooks\b/;
const WAIT_GAP_S = 30;

export function classify(tool, input) {
  const name = tool || "";
  let target = "";
  let cmd = "";
  if (name === "Read") {
    target = input?.file_path || "";
    if (DOC_PATTERNS.some((p) => p.test(target))) return { kind: "read-doc", target };
    if (/films\//.test(target)) return { kind: "author", target };
    return { kind: "read-doc", target };
  }
  if (name === "Grep" || name === "Glob") {
    return { kind: "search", target: input?.pattern || input?.glob || "" };
  }
  if (name === "Write" || name === "Edit" || name === "NotebookEdit") {
    target = input?.file_path || "";
    return { kind: "author", target };
  }
  if (name === "Skill") {
    return { kind: "read-doc", target: `skill:${input?.skill || ""}` };
  }
  if (name === "Bash") {
    cmd = input?.command || "";
    target = cmd.split("\n")[0].slice(0, 200);
    if (VERIFY_CMD.test(cmd)) return { kind: "verify", target };
    if (JUDGE_CMD.test(cmd)) return { kind: "judge", target };
    if (RENDER_CMD.test(cmd)) return { kind: "render", target };
    if (SEARCH_CMD.test(cmd)) return { kind: "search", target };
    if (DOC_PATTERNS.some((p) => p.test(cmd)) && /cat |less |head |sed -n/.test(cmd)) {
      return { kind: "read-doc", target };
    }
    return { kind: "shell-other", target };
  }
  return { kind: "shell-other", target: name };
}

function textOfResult(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === "string" ? c : c?.text || "")).join("\n");
  }
  return "";
}

/** Parse one JSONL transcript into typed, time-sorted spans. */
export async function parseSpans(inFile) {
  const rl = createInterface({ input: createReadStream(inFile), crlfDelay: Infinity });
  const pending = new Map(); // tool_use_id -> { tool, kind, target, t_start, tokens_out/in, cache_read }
  const spans = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = d.timestamp;

    if (d.type === "assistant") {
      const msg = d.message || {};
      const usage = msg.usage || {};
      const tokensOut = usage.output_tokens || 0;
      for (const c of msg.content || []) {
        if (c.type === "tool_use") {
          const { kind, target } = classify(c.name, c.input);
          pending.set(c.id, {
            tool: c.name, kind, target, t_start: ts,
            tokens_out: tokensOut, tokens_in: usage.input_tokens || 0,
            cache_read: usage.cache_read_input_tokens || 0,
          });
        }
      }
    }

    if (d.type === "user") {
      const content = (d.message || {}).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if (!c || c.type !== "tool_result") continue;
        const p = pending.get(c.tool_use_id);
        const isErr = !!c.is_error;
        const text = textOfResult(c.content);
        const exitNonZero = /exit code [1-9]/i.test(text) || /command not found/i.test(text);
        const ok = !isErr && !exitNonZero;
        if (p) {
          spans.push({
            t_start: p.t_start, t_end: ts, kind: !ok ? "error" : p.kind,
            tool: p.tool, target: p.target,
            tokens_in: p.tokens_in, tokens_out: p.tokens_out, cache_read: p.cache_read,
            ok, result_chars: text.length,
          });
          pending.delete(c.tool_use_id);
        } else {
          spans.push({
            t_start: ts, t_end: ts, kind: ok ? "shell-other" : "error", tool: "unknown", target: "",
            tokens_in: 0, tokens_out: 0, cache_read: 0, ok, result_chars: text.length,
          });
        }
      }
    }
  }

  for (const p of pending.values()) {
    spans.push({
      t_start: p.t_start, t_end: p.t_start, kind: p.kind, tool: p.tool, target: p.target,
      tokens_in: p.tokens_in, tokens_out: p.tokens_out, cache_read: p.cache_read,
      ok: true, result_chars: 0,
    });
  }

  spans.sort((a, b) => new Date(a.t_start) - new Date(b.t_start));
  return spans;
}

/** scorecard(spans) -> the route report trace.mjs prints: per-kind minutes/calls/tokens, the
 *  stills-before-motion order, docs read vs routed via Skill, arsenal/render/judge/error counts,
 *  repeated failing commands, and total wait time (gaps over WAIT_GAP_S between spans). */
export function scorecard(spans) {
  const secs = (s) => Math.max(0, (new Date(s.t_end) - new Date(s.t_start)) / 1000);

  const byKind = new Map();
  for (const s of spans) {
    const row = byKind.get(s.kind) || { count: 0, seconds: 0, tokensOut: 0, tokensIn: 0 };
    row.count += 1;
    row.seconds += secs(s);
    row.tokensOut += s.tokens_out || 0;
    row.tokensIn += s.tokens_in || 0;
    byKind.set(s.kind, row);
  }

  const firstLooksIdx = spans.findIndex((s) => LOOKS_CMD.test(s.target || ""));
  const firstRenderIdx = spans.findIndex((s) => s.kind === "render" && !LOOKS_CMD.test(s.target || ""));
  const stillsBeforeMotion = firstLooksIdx !== -1 && (firstRenderIdx === -1 || firstLooksIdx < firstRenderIdx);

  const docReads = spans.filter((s) => s.kind === "read-doc");
  const docsRouted = docReads.filter((s) => (s.target || "").startsWith("skill:")).length;
  const docsDirect = docReads.length - docsRouted;

  const arsenalSearches = spans.filter((s) => /arsenal\.mjs/.test(s.target || "")).length;
  const renders = spans.filter((s) => s.kind === "render").length;
  const judges = spans.filter((s) => s.kind === "judge").length;
  const errors = spans.filter((s) => s.kind === "error");

  const failCounts = new Map();
  for (const e of errors) failCounts.set(e.target, (failCounts.get(e.target) || 0) + 1);
  const repeatedFailures = [...failCounts.entries()].filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]).map(([target, n]) => ({ target, n }));

  let waitSeconds = 0;
  for (let i = 1; i < spans.length; i++) {
    const gap = (new Date(spans[i].t_start) - new Date(spans[i - 1].t_end)) / 1000;
    if (gap >= WAIT_GAP_S) waitSeconds += gap;
  }

  const wallSeconds = spans.length
    ? (new Date(spans[spans.length - 1].t_end) - new Date(spans[0].t_start)) / 1000 : 0;

  return {
    spanCount: spans.length,
    wallMinutes: wallSeconds / 60,
    waitMinutes: waitSeconds / 60,
    byKind: [...byKind.entries()].map(([kind, r]) => ({
      kind, count: r.count, minutes: r.seconds / 60, tokensOut: r.tokensOut, tokensIn: r.tokensIn,
    })).sort((a, b) => b.minutes - a.minutes),
    stillsBeforeMotion,
    docsRouted, docsDirect,
    arsenalSearches, renders, judges,
    errorCount: errors.length,
    repeatedFailures,
  };
}

function printScorecard(sc) {
  console.log(`\nROUTE SCORECARD  ·  ${sc.spanCount} spans  ·  ${sc.wallMinutes.toFixed(1)} min wall  ·  ${sc.waitMinutes.toFixed(1)} min waiting (gaps ≥${WAIT_GAP_S}s)\n`);
  console.log("  step            calls   minutes   tokens out   tokens in");
  for (const r of sc.byKind) {
    console.log(`  ${r.kind.padEnd(14)}  ${String(r.count).padStart(5)}   ${r.minutes.toFixed(1).padStart(7)}   ${String(r.tokensOut).padStart(10)}   ${String(r.tokensIn).padStart(9)}`);
  }
  console.log(`\n  stills-before-motion: ${sc.stillsBeforeMotion ? "yes" : "no"}`);
  console.log(`  docs read: ${sc.docsDirect} direct, ${sc.docsRouted} via Skill`);
  console.log(`  arsenal searches: ${sc.arsenalSearches}   renders: ${sc.renders}   judges: ${sc.judges}   errors: ${sc.errorCount}`);
  if (sc.repeatedFailures.length) {
    console.log(`  repeated failing commands:`);
    for (const f of sc.repeatedFailures) console.log(`    ×${f.n}  ${f.target}`);
  }
  console.log("");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const [, , inFile, outFileArg] = process.argv;
  if (!inFile) {
    console.error("usage: node harness/dev/trace.mjs <transcript.jsonl> [spans.jsonl]");
    process.exit(1);
  }
  const outFile = outFileArg || path.join(path.dirname(path.resolve(inFile)), "spans.jsonl");
  const spans = await parseSpans(inFile);
  writeFileSync(outFile, spans.map((s) => JSON.stringify(s)).join("\n") + (spans.length ? "\n" : ""));
  console.error(`${spans.length} spans written to ${outFile}`);
  printScorecard(scorecard(spans));
}
