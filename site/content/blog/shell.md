---
title: "AI agent shell hooks: change the environment, not the rule"
description: "We added a hook that refused for loops and sed -i, and reverted it in 7 minutes. 443 of 5,520 agent Bash calls had failed. The fix was the environment."
date: 2026-10-11
section: agent-experience
tags: "ai agent shell, hooks, bash, agents, developer experience"
keywords: "ai agent shell, agent hooks, bash for ai agents, agent tool failures"
hero: /blog/shell/timeline.svg
heroAlt: "A timeline of three commits on 2026-09-30: a hook is added at 04:58, reverted seven minutes later at 05:05, and narrowed to four git commands 26 seconds after that."
---

On 2026-09-30 we added a hook to stop agents from using `for` loops, `sed -i` and a leading `cd` in the shell. Seven minutes later we reverted it. The question that caused the revert was simple: if the agent wants to do this, why are we stopping it? This post is about AI agent shell hooks, the pain that made us write one, and why we now change the environment instead of forbidding the habit.

## The problem: agent Bash calls kept failing

`AGENTS.md` in the repo carried a header on its Shell section: `443 of 5,520 agent Bash calls failed on these`. That is about one call in twelve. The failures had a short list of causes. macOS `sed -i` needs an empty suffix (`sed -i ''`). A hook rewrote `cat a b` and broke it. Unquoted zsh globs gave `no matches found`. A Bash call over 120 s moved to the background and kept its render slot.

The obvious move was a rule. If agents fail on these forms, refuse the forms and print the fix.

## What we tried: a hook with a fix in every refusal

Commit [ba89f5db0](https://github.com/Vandit1604/vawe/commit/ba89f5db0) extended our git guard, `harness/live/no-blanket-git.mjs`. It refused a `for`, `while` or `until` loop, `sed -i`, and a multi-part command that starts with `cd`. Each refusal came with a fix: run the commands one per call, use the Edit tool, drop the `cd` prefix. The commit added 32 lines and removed 8, and added test cases for each form.

It was reverted seven minutes later by [2972e403a](https://github.com/Vandit1604/vawe/commit/2972e403a). The commit after that, [e16b230e9](https://github.com/Vandit1604/vawe/commit/e16b230e9), narrowed the guard to the four git commands that lose work. Its subject says the rest: shell style (loops, `cd`, `sed`) is the agent's choice.

![Timeline: a hook added at 04:58:27, reverted at 05:05:31, narrowed at 05:05:57](/blog/shell/timeline.svg)

Here is why. The refusals we were trying to prevent came from the worktree isolation of the agent runtime when it ran subagents, not from our rules. Our hook did not remove the failure. It only moved it earlier in the session, and it also blocked sessions where those commands work. An agent that writes a `for` loop is doing what an agent writes unprompted. Our house rule is that if something an agent naturally writes fails, that is a framework bug.

## What we built instead

We changed what happens when a habit fails.

Fewer hooks that fight. Commit [6a0bae25b](https://github.com/Vandit1604/vawe/commit/6a0bae25b), "Stop fighting the hooks", narrowed the blanket-add block (`git add -A` with an explicit path is allowed), made doc references advisory in pre-commit, and dropped the `MISTAKES.md` log and its duplicates gate. 43 files changed, 61 lines added and 1,376 removed. The log had a rule behind it: a bug is closed by a check, not a log entry.

A hook that compares an edit with its own worktree. [45ffd6077](https://github.com/Vandit1604/vawe/commit/45ffd6077) changed the code-quality hook so it compares an edit with the `HEAD` of its own worktree, and only with `HEAD`. A tangle the edit did not add never blocks it.

Capability probes. [e1b240532](https://github.com/Vandit1604/vawe/commit/e1b240532) gave `vawe doctor` a `--json` output and probes for encode, `drawtext` and launching Chrome. It writes `.vawe/doctor.json`, and a render failure now names the failed check. The agent does not need to guess that the machine is missing a tool.

One verb for waiting. [f0ab4f483](https://github.com/Vandit1604/vawe/commit/f0ab4f483) added `vawe wait`: it blocks until any render of a film ends, with a progress line each minute. `AGENTS.md` now says: never `sleep`, run `vawe wait`.

The habit, documented once. A one-line note in the `vawe-page` skill gives the macOS `sed -i ''` form ([298be1120](https://github.com/Vandit1604/vawe/commit/298be1120)), and the Shell section of `AGENTS.md` lists the habits that fail in this shell ([8eebf5561](https://github.com/Vandit1604/vawe/commit/8eebf5561)).

A result line that survives a pipe. Agents piped 134 of 140 `vawe` calls in one review into `tail`, `head` or `grep`, which hides the exit code. Now every verb ends with a line, `vawe: <verb> ok|FAILED (<reason>) in <s>s`. The pipe cannot hide it.

![Four habits and the environment change for each](/blog/shell/habit-fixes.svg)

## The result

We have one number from before: 443 of 5,520 agent Bash calls failed on shell habits. We have no clean number from after, and we say so. The later trace reviews still found `sed -i` and `cat a b` failures in the sessions we read, even though `AGENTS.md` already warned about both. A warning in a doc is weaker than a change in the environment. The review also found that the shell is not the main cost: in one session, 74% of the wall time was renders and waiting, which we describe in [Reading AI agent traces](/blog/trace-reviews).

## What we would tell someone building the same thing

Ask where the refusal comes from before you write the hook. Ours came from the runtime, so no rule of ours could have fixed it.

Guard what loses data, and nothing else. We kept four git commands: the ones that destroy uncommitted work. Everything about style we gave back to the agent. The wider rule is in [Advise on everything, refuse on exactly three things](/blog/advise-refuse).

When a habit fails, change what the habit meets. Make the tool exist, make the form work, make the failure name its cause. A hook that forbids the habit leaves the cause in place.

Keep the list short. One line in a doc costs every agent a read. We watch that cost in [Documentation as a budget](/blog/read-load).

For the one command that replaced the pile of scripts, see [One binary, one verb per step](/blog/one-binary). The framework is open source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/live/no-blanket-git.mjs`: the guard, now four git commands.
- `AGENTS.md`, section Shell: the habits that fail.
- [ba89f5db0](https://github.com/Vandit1604/vawe/commit/ba89f5db0) and [2972e403a](https://github.com/Vandit1604/vawe/commit/2972e403a): the hook and its revert.
- [e16b230e9](https://github.com/Vandit1604/vawe/commit/e16b230e9): guard only data loss.
- [e1b240532](https://github.com/Vandit1604/vawe/commit/e1b240532): `vawe doctor` probes.
- [f0ab4f483](https://github.com/Vandit1604/vawe/commit/f0ab4f483): `vawe wait`.
