---
title: "Shell for AI agents: the hook we reverted in 7 minutes"
description: "A postmortem on a shell hook for AI agents: 443 of 5,520 agent Bash calls had failed. The hook refused loops and sed -i, and lasted 7 minutes."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "ai agent shell, hooks, bash, agents, developer experience"
keywords: "shell for ai agents, bash for ai agents, agent tool failures, agent hooks"
hero: /blog/shell/timeline.webp
heroAlt: "A timeline of three commits on 2026-09-30: a hook is added at 04:58, reverted seven minutes later at 05:05, and narrowed to four git commands 26 seconds after that."
---

| | |
|---|---|
| Date | 2026-09-30, 04:58 to 05:05 |
| Impact | a hook refused `for` loops, `sed -i` and a leading `cd` in agent sessions for seven minutes |
| Trigger | 443 of 5,520 agent Bash calls had failed on a short list of shell habits |
| Cause | the failures came from the agent runtime's worktree isolation, not from the habits |
| Fix | revert the hook, guard only the four git commands that lose work, change the environment |

This is a postmortem on a shell hook we wrote for AI agents and took out seven minutes later. It is part of the [agent harness we build for the weaker model](/blog/weaker-model), where the rule is that a check should meet the agent at the moment it acts, and should not fight what the agent would naturally write.

## Timeline

Before the hook. AGENTS.md carried a header on its Shell section: `443 of 5,520 agent Bash calls failed on these`, about one call in twelve. The causes were few. macOS `sed -i` needs an empty suffix (`sed -i ''`). A hook rewrote `cat a b` and broke it. Unquoted zsh globs gave `no matches found`. A Bash call over 120 s moved to the background and kept its render slot.

04:58:27. Commit [ba89f5db0](https://github.com/Vandit1604/vawe/commit/ba89f5db0) extended our git guard, `harness/live/no-blanket-git.mjs`. It refused a `for`, `while` or `until` loop, `sed -i`, and a multi-part command that starts with `cd`. Each refusal printed a fix: one command per call, the Edit tool, no `cd` prefix. It added 32 lines, removed 8, and came with a test case for each form.

05:05:31. [2972e403a](https://github.com/Vandit1604/vawe/commit/2972e403a) reverted it.

05:05:57. [e16b230e9](https://github.com/Vandit1604/vawe/commit/e16b230e9) narrowed the guard to the four git commands that destroy uncommitted work. Its subject states the decision: shell style (loops, `cd`, `sed`) is the agent's choice.

![Timeline: a hook added at 04:58:27, reverted at 05:05:31, narrowed at 05:05:57](/blog/shell/timeline.webp)

## Root cause

The question that caused the revert was short: if the agent wants to write this, why are we stopping it?

The refusals we meant to prevent came from the worktree isolation of the agent runtime when it ran subagents. They did not come from the habits themselves. Our hook did not remove a single failure. It moved the failure earlier in the session, and it also blocked the sessions where loops and `sed -i ''` work fine. A `for` loop is what an agent writes unprompted, and our house rule says that when something an agent naturally writes fails, the framework has the bug.

## The fix: change what the habit meets

The changes that followed each alter the environment, so the habit works or the failure names its cause.

- Fewer hooks that fight. [6a0bae25b](https://github.com/Vandit1604/vawe/commit/6a0bae25b), "Stop fighting the hooks", allowed `git add -A` with an explicit path, made doc references advisory in pre-commit, and dropped the `MISTAKES.md` log and its duplicates gate: 43 files, 61 lines added, 1,376 removed. The rule behind it is that a check closes a bug and a log entry does not.
- A quality hook that reads its own worktree. [45ffd6077](https://github.com/Vandit1604/vawe/commit/45ffd6077) compares an edit only with the `HEAD` of its own worktree, so a tangle the edit did not add never blocks it.
- Capability probes. [e1b240532](https://github.com/Vandit1604/vawe/commit/e1b240532) gave `vawe doctor` a `--json` output and probes for encode, `drawtext` and launching Chrome. It writes `.vawe/doctor.json`, and a render failure names the failed check.
- One verb for waiting. [f0ab4f483](https://github.com/Vandit1604/vawe/commit/f0ab4f483) added `vawe wait`, which blocks until any render of a film ends and prints a progress line each minute. AGENTS.md says: never `sleep`, run `vawe wait`.
- The habit documented once. The `vawe-page` skill gives the macOS `sed -i ''` form ([298be1120](https://github.com/Vandit1604/vawe/commit/298be1120)), and the Shell section of AGENTS.md lists what fails in this shell ([8eebf5561](https://github.com/Vandit1604/vawe/commit/8eebf5561)).
- A result line a pipe cannot hide. Agents piped 134 of 140 `vawe` calls in one review into `tail`, `head` or `grep`. Every verb now ends with `vawe: <verb> ok|FAILED (<reason>) in <s>s`. [CLI design for AI agents](/blog/one-binary) has the details.

![Four habits and the environment change for each](/blog/shell/habit-fixes.webp)

## Why we missed it

We read 443 failures as 443 cases of bad habits, because the habits were what the failed commands had in common. We did not ask where each refusal came from before writing a rule against it. The tests we added with the hook passed, because they checked that the hook refused the forms, which it did. Nothing tested whether the forms were the cause.

## Follow-ups

- No clean after-count exists. Later trace reviews still found `sed -i` and `cat a b` failures in the sessions we read, although AGENTS.md warned about both. A warning in a doc did less than a change in the environment.
- The shell is not where most of the time goes. In one session, 74% of the wall time was renders and waiting; see [reading AI agent traces](/blog/trace-reviews).
- The guard rule became general: refuse only what loses data or makes a render wrong. [AI agent guardrails](/blog/advise-refuse) lists the three refusals that remain.
- Each line in the Shell section costs every agent a read, so the section stays short; [how long AGENTS.md should be](/blog/read-load) tracks that cost.

The remaining guard lives in `harness/live/no-blanket-git.mjs`. For the rest of the harness this postmortem fed into, see [AI agent harness engineering](/blog/weaker-model).
