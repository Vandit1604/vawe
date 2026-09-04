---
when: "\"why did that fan-out cost so much\""
answers: "the measured cost of a real run here, and the rules that follow: fewer and larger agents, file contents in the prompt, never two agents on one file"
group: crosscutting
---

# Planning subagent work: what it costs, and how to spend less

## AGENT SUMMARY

- Read this BEFORE any fan-out. One real run here cost 87 agents, 5.66M subagent tokens, about 65,000
  tokens per agent, for 61 findings, while the main context grew by only about 3,000 tokens.
- The rules that follow from it: fewer, larger agents (batches of 5 to 10, not one per item), put file
  contents in the prompt, never send two agents to the same files, always cap the return with a
  structured schema. One agent with a good prompt beats a fan-out for sequential, dependent work.
- Checkable action: before launching a fan-out, state in one sentence what a single agent with the same
  token budget would plausibly have produced. If you cannot, the fan-out is a guess, not a decision.

Read this before you launch a fan-out. The rules below come from two sources. One is a measured run in
this repo. The other is published guidance on multi-agent orchestration, listed at the end.

## What one run actually cost

An architecture audit ran here on 2026-08-07. These are its real numbers.

| measure | value |
|---|---|
| agents | 87 |
| subagent tokens | 5,656,316 |
| tool calls | 1,955 |
| tokens for each agent | about 65,000 |
| tool calls for each agent | about 22 |
| findings returned | 61 |

The main context grew by about 3,000 tokens. That gap is the point of the whole method.

## Why the cost is high

**Each agent pays a startup cost.** An agent loads a system prompt, this repo's `CLAUDE.md`, and every
tool definition. `CLAUDE.md` is about 300 lines. The run above paid that cost 87 times.

**Tool output stays in the agent's context.** The context never shrinks. Every file the agent reads stays
until the agent stops.

**Each turn resends the whole context.** An agent on turn 20 pays again for turns 1 to 19. This effect
dominates the total. Cost rises faster than the number of tool calls.

**Agents do not share reads.** Four agents that each read `core/layers/index.js` pay for it four times.

## Rules

1. **You will start one agent for each item, because it is the obvious mapping. Don't.** One agent that
   covers four areas pays the startup cost once. Four agents pay it four times. Published guidance says 3
   to 5 subagents suits most work.
2. **Batch a fan-out.** For many items, group them into batches of 5 to 10. Do not start one agent for
   each item.
3. **Put the file contents in the prompt.** Then the agent does not search for them. A search costs more
   than the text.
4. **Keep the brief narrow.** Fewer questions produce fewer tool calls. A wide brief makes an agent hedge
   and read more.
5. **Do not send two agents to the same files.** Split by file, not by question, when the questions share
   a source.
6. **Always use a structured output schema.** It caps the return. Never let an agent return its transcript.
7. **Cap what comes back.** Tell the agent what to return and how much. Reconcile in the main thread.
8. **Prefer one agent for sequential work.** Multi-agent orchestration helps when work is independent. For
   a chain of dependent steps, one agent with good context wins, and it costs less.
   **The number behind this rule.** Anthropic's own multi-agent
   research system consumes about 15x the tokens of a normal conversation, and token usage alone
   explains roughly 80% of the performance difference it shows. Alongside that, a single agent has been
   measured matching or beating five multi-agent architectures on multi-hop reasoning **at an equal
   thinking-token budget**, unless context utilisation was degraded past a point. So a fan-out is
   mostly buying you tokens, and you can buy those without it. Before launching one, state in a
   sentence what a single agent with the same budget would plausibly have produced. If you cannot, the
   fan-out is a guess about parallelism rather than a decision about it.

9. **Match the pattern to the work.** Measure the shape of the task first. Choose the pattern second.
   Do not start with the orchestration and fit the work to it.

## When the cost is worth it

Two cases only.

**The work does not fit one context.** The audit above read across 300 files. One agent would fill its
window before it finished.

**You need a judgement with no stake in the answer.** An agent that wrote the code grades the code kindly.
See [SUBAGENTS.md](SUBAGENTS.md), which states this rule for film critics.

For anything else, one agent and a better prompt is cheaper and often better.

## Sources

- [Claude Code Multi-Agent Orchestration: 6 Patterns (2026)](https://thepromptshelf.dev/blog/claude-code-multi-agent-orchestration-patterns-2026/)
- [Multi-Agent Orchestration: 5 Patterns That Work in 2026](https://www.digitalapplied.com/blog/multi-agent-orchestration-5-patterns-that-work)
- [Multi-Agent AI Systems in 2026: What the Research Actually Says](https://www.flowhunt.io/blog/multi-agent-ai-system/)
- [LLM Token Optimization Strategies (2026)](https://www.tokenoptimize.dev/guides/llm-token-optimization-strategies)
- [Token Optimization for Agentic AI](https://sombrainc.com/blog/token-optimization)

## Waiting: the artifact, never the notification

Two rules borrowed from a reference system's dispatch doc, both learned here the hard way today.

**WAIT ON THE EXPECTED FILE EXISTING ON DISK, never on the harness's completion notification.** An agent
can report success and have delivered nothing: the authored films in `formats/scene/` are GITIGNORED, so
a worktree fan-out over scenes merges cleanly, reports success, and brings back only the tracked files.
Four agents did exactly that, and it was caught only because one of them said so in its report
(`../MISTAKES.md` #377). If the artifact is not on disk where you expect it, re-dispatch once; do not
treat "the agent finished" as "the work exists".

**Dispatch in WAVES of the concurrency cap. Never merge two units of work into one agent to fit the
cap.** Merging is how one agent ends up with two jobs and does both worse, which is the same failure the
critic roster exists to avoid: one context grading its own work. Ten scenes and a cap of four is three
waves, not four agents carrying two and a half scenes each.

**And re-run the gate yourself, in the main tree, after copying anything back.** Every number in the
contrast pass was re-measured after the files landed rather than taken from the agent's own report. Two
of them did not match.

**You will read a gate's finding count and dispatch agents to fix the films. Look at ONE first.** The
contrast gate reported 33 scenes with hard failures; the first one examined was flagged at 1.0:1 for a
button that was 0.067 seconds into its fade-in and completely legible two frames later
([`../MISTAKES.md`](../MISTAKES.md) #376). Fixing the gate took the number 33 to 32 with zero scenes newly
failing. Two further attempts at the second, real defect in the same gate each took the library to 57 and
broke a worse case than they fixed, and neither shipped. **A single scene going PASS to FAIL is a
regression until proven otherwise**, and a fan-out launched off an unexamined finding count spends 65,000
tokens per agent deforming films to satisfy a measurement nobody checked.
