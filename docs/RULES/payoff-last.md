---
name: payoff-last
when: ordering beats and writing the hook
holds: eye (AGENTS.md content philosophy; no gate scores story order)
answers: "the hook word count, the emoji cap, and the runtime band the best fact must land in"
group: story
---
# The hook asks a question in 12 words or less; the payoff lands at 77-90% of runtime

The hook poses the open loop, front-loads its strongest word, and never spoils the answer. The most
counterintuitive fact, the "no way" moment, is ordered last so it lands near the end of the film, not
buried mid-roll where a slower beat can follow it and drain the reaction.

| parameter | value |
|---|---|
| hook length | ≤12 words |
| hook emoji | ≤1 |
| payoff position | 77-90% of runtime |
| em-dash in on-screen text | never (validator rejects it) |

Right:
```json
{ "beats": [
  { "id": "hook", "copy": "Most teams ship this wrong." },
  { "id": "build" },
  { "id": "payoff", "copy": "It took one line of config." }
] }
```

Wrong:
```json
{ "beats": [
  { "id": "hook", "copy": "This tool cuts your build time by 80% using a config change most teams miss." },
  { "id": "build" },
  { "id": "close" }
] }
```
