---
when: "judging your own render (a full pass, a recreation, anything you will ship), or about to fan work out to subagents"
answers: "why a self-grading agent grades kindly; the critics and the one artifact each is handed; how to run them; what a fan-out costs; the brief lines and worktree contract every subagent brief needs"
group: crosscutting
---

# SUBAGENTS: one critic, one job, one artifact

Authoring a film takes several kinds of judgement: does this beat read, does the background move at the
right speed, does the copy earn the hook, does a seam flash. One agent doing all of them in one context
does all of them worse. Run separate critics, one job each, in parallel, each returning a verdict in a
fixed shape.

## Why a fresh critic

You look at your own render and decide it is fine, because you picked every part of it. The thread that
wrote the page has anchored on its own easing, crop and headline. Ask it "is beat 4 good?" and it
answers "yes, because I chose it." A fresh agent handed one path and one question has no stake.

A critic's value is independent evidence, not a fresh pair of eyes. Several instances of one model with
similar context do not vote independently (18 of 30 agents chose the same branch name without
conferring). The admission test for any critic is about its input: what artifact does it see that the
author did not? A render, a frame strip or a reference passes. The page source you just wrote fails.

Context is the other half: a critic spends thousands of tokens on a sheet of frames and returns twenty
lines. Those tokens stay in its context, not yours.

## The critics

| critic | job | input | verdict shape |
|---|---|---|---|
| beat | does each beat read at a glance | the phone sheet and strip from `bin/vawe critique <page>` | per beat: `{beat, reads, flaw, fix}` |
| bg-motion | speed, scale and direction of anything moving continuously | a strip of 4 or more frames, reference and render at matched times | per axis: `{axis, ours, reference, delta, fix}` |
| reveal | how each beat enters and exits, never the settled frame | a dense strip of the entrance and exit windows (`bin/vawe dev --from --to`) | per beat: `{beat, enter, exit, paired, flaw, fix}` |
| fidelity | recreations only: how close each beat is to its source | `bin/vawe compare` frames, side by side | per beat: `{beat, score 0-10, gaps}` |
| seam | flash or collision at cuts and the loop seam | the seam frames and loop seam in the critique | per seam: `{seam, flash, evidence, fix}` |
| copy | on-screen writing only | the strings in beat order | per line: `{beat, line, tell, rewrite}` |

`copy` fails the admission test (it reads the strings the author already wrote). Run it when you want
the writing re-read by something that is not you, and know that is what you buy. For a whole-film score
use `bin/vawe judge --fresh` (`engine-doctrine/JUDGE.md`); a pass is never self-recorded.

Notes that matter per critic:

- bg-motion exists because of a real failure. A lime-on-black liquid field was matched against one
  still, and in motion ran about 2.5x too fast with folds half the size. A still carries composition
  and colour and nothing about time. Hand this critic a strip or do not ask.
- fidelity must report gaps, not verdicts. Force a score per beat plus what is missing, or you get
  agreement instead of information. See `RECREATION.md`.
- reveal is not beat. A beat's middle frame hides the entrance: a dolly direction, a colour wave and a
  paired exit all got missed that way.

## How to run them

One message, several `Agent` calls, so they run at once. One at a time turns a 30 s panel into five
minutes and tempts you to skip four.

1. Hand over the path, not a description of the sheet. "The sheet shows a clean grid" replaces its eye
   with yours.
2. Demand the verdict shape in the prompt. Reject a reply that arrives as prose.
3. Critics report, the main thread fixes. No critic edits the page. A critic that can fix will fix
   instead of finding.
4. A critic is evidence, not a ruling. If it flags something you can look at and the flaw is not there,
   it is wrong. If your eye confirms it, that is a fix, not a rationalisation.
5. After the fixes, re-run the check and the sheet commands, then re-panel only the critics whose input
   changed.

Run the panel for a full authoring pass, any recreation, and any render you intend to ship. A one-line
copy tweak or a colour swap is not worth six agents.

## What a fan-out costs

Measure before you fan out. One audit here ran 87 agents and 5.66M subagent tokens (about 65,000 per
agent, 22 tool calls each) for 61 findings, while the main context grew by about 3,000 tokens.

- Each agent pays a startup cost: system prompt, repo instructions and every tool definition.
- Tool output stays in the agent's context, and every turn resends the whole context. Cost rises faster
  than tool calls.
- Agents do not share reads. Four agents that read the same file pay four times.

Rules that follow:

1. Fewer and larger agents. One agent covering four areas pays the startup cost once. Published guidance
   says 3 to 5 subagents suit most work. Keep about 4 running at once on the laptop.
2. Batch many items 5 to 10 per agent, never one agent per item.
3. Put the file contents in the prompt so the agent does not search.
4. Keep the brief narrow and cap the return with a structured schema. Never let an agent return its transcript.
5. Sequential, dependent work stays one agent. Anthropic's multi-agent research system uses about 15x the
   tokens of a normal chat, and a single agent has matched five multi-agent designs at an equal
   thinking-token budget. Before a fan-out, state in one sentence what one agent with the same budget
   would plausibly have produced. If you cannot, the fan-out is a guess about parallelism.
6. Two cases justify the cost: the work does not fit one context, or you need a judgement with no stake.

The failures seen in real runs were not "too many agents". An agent claimed a report "already delivered"
that never arrived. An agent ended its turn waiting on a monitor and stalled. An agent died on a rate
limit. Two agents nearly collided in one directory. A count would have prevented none of these. The rules
that do are disjoint scopes, one agent for sequential work, and reading the artefact instead of the claim.

## The brief: lines that each cost a real session

A brief that omits these does not fail loudly. The agent works for an hour and returns less.

- Fast-forward onto main before starting and again before the last commit. A stale tip merges silently.
- Stage explicit paths. Hooks refuse `git add -A` and a bare `git stash`.
- Name the files the agent owns and the files it must not touch. Two agents on one file is the only
  failure merging cannot fix.
- Do not block on a background render, and do not delegate. Agents that launched a render and waited, or
  spawned sub-agents and stalled on them, never resumed.
- A worktree does not carry gitignored inputs (`node_modules`, `assets/fonts`, `refs`, films). Create it
  with `harness/dev/worktree.sh add <name> <glob ...>` (it links them and records the scope, so
  `node harness/dev/worktree-status.mjs` warns the next agent about overlap). Never a bare `git worktree add`.

## Worktree agent contract

Every worktree brief carries these lines. Each cost a real session.

- Prove the base: run plain `git merge main`, then quote `git merge-base --is-ancestor <sha> HEAD`.
- Copy the gitignored inputs the task needs from the lead's checkout.
- Run git only as plain `git <cmd>` from your own worktree, never `git -C`, `command git` or `/usr/bin/git`.
- If a hook denies a command, stop and quote the denial. Do not work around it.
- Never edit `quality/baselines/*`: a ratchet only falls.
- Start any server on your own port and stop it by PID, never by name.
- Work inside the render budget the brief states. When it runs out, stop and report.
- Run long commands in the foreground and wait yourself. Never end your turn saying you are waiting.
- Never trust a report: read the commits and files on disk.
