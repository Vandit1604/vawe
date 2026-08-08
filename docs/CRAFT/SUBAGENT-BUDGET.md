# Planning subagent work: what it costs, and how to spend less

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

1. **Use fewer, larger agents.** One agent that covers four areas pays the startup cost once. Four agents
   pay it four times. Published guidance says 3 to 5 subagents suits most work.
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
