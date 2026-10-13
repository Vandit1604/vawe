---
title: "Reading AI agent traces: 74% of a session was waiting"
description: "Reading AI agent traces showed 81.5 of 110 minutes spent on final renders and polls. How we made the wait one call and kept a render slot for drafts."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "ai agent traces, long-running commands, render queue, debugging agents, harness"
keywords: "ai agent traces, long-running commands for ai agents, agent polling, debugging ai agents"
hero: /blog/trace-reviews/session-time.svg
heroAlt: "A stacked bar of one 110-minute agent session. The ship and waits segment is 81.5 minutes, 74 percent. All other stages together are under 27 minutes."
---

When we finally read the traces of AI agents building films with [vawe](https://github.com/Vandit1604/vawe), one session decided the next week of work. Of its 110 minutes, 81.5 went to final renders and the polls that waited for them: 74% of the wall time. The drafting, which we had tuned for weeks, took 7%. In another film, a draft spent 357 of its 427 seconds in line behind a final.

Our checks, our judge and our taste rules all measured the film. None measured the agent. This case study covers three read-only trace reviews on 2026-10-10 and 2026-10-11, what they found, and how we changed long-running commands so that waiting costs the agent almost nothing. It is one of the harness stories collected under [AI agent harness engineering](/blog/weaker-model).

## How we read the traces

We had two sources and had never joined them: `out/<film>.runs.jsonl`, which then logged a few events per film, and the transcripts of the agent sessions. The review made no render, ran no test and changed no file. A small script paired every tool call in a transcript with its result and rebuilt a timeline per session.

The method has limits. Parallel calls overlap, so the tool-time columns count them twice. Cost fields in resumed sessions may be cumulative. And the run log was thin: in one session it held 21 lines for 162 tool calls, which is why the transcript had to carry the review.

## Where the 81.5 minutes went

An 8 s film took a 73-minute span, 56 minutes of it active. The agent made 162 tool calls: 106 Bash, 53 Read, 2 Write and 1 agent call, with 62 of them in the draft and motion-pass loop. It started 3 final renders, which took 390, 400 and 421 s, and it waited in the foreground with 16 polls of 100 s each.

A 20 s film took 110 minutes and 170 tool calls.

![Stacked bar of one 110-minute session by stage](/blog/trace-reviews/session-time.svg)

Ship and waits took 68 calls and 81.5 minutes. Of 130 Bash calls, 52 were `ship --status --wait` polls. The agent often sent three or four in one message, and they ran one after another, each blocking for up to 100 s. Those polls account for 17.6M of the session's 40.7M cache-read tokens, 43%. The session record showed API time of 1,235 s out of 6,630 s (19%) and tool time of 5,562 s (84%). The two overlap, but most of the session was tool time and not model time.

The polls were a symptom of the shape of the command. A final render takes about 16 minutes, and a Bash call over 120 s moves to the background, where the agent loses the thread. With no single call that could wait, the agent wrote its own polling loop. In another session, 12 status calls took 3,922 s for four finals.

## Three failed finals and 49 lost minutes

3 of the 5 finals in the 110-minute session failed.

![Bar chart of five final renders and their elapsed seconds](/blog/trace-reviews/ships.svg)

The failures cost 2,967 s, 49 minutes or 45% of the session. Two of them had captured to 100% (the log shows `capturing 19198/19200`) and then died at the audio mux step with a "detached Frame" error. The run log recorded `failedAt: 0`, so the next ship started from the beginning and captured everything again. The third lost a slice after four tries, because another process closed the shared browser.

The agent could not see its own failures well either. Of 140 `vawe` calls in one review, 134 were piped into `tail`, `head` or `grep`, which hides the exit code. The tool flag showed 2 failures per session, and the real count was higher.

## Drafts stuck behind finals

The later review of eight sessions added up the time drafts spent waiting for a render slot. A machine has two render slots by default, and a final could hold one for minutes. Inside `dev`, the slot wait was 357 s of 427 in one film, 339 of 395 in another, then 172 of 200, 155 of 243 and 133 of 247. The five add up to 1,156 s.

![Draft time spent waiting for a render slot in five films.](/blog/cheap-wait/hero.svg)

One more cost sat on a canvas film. Per-frame DOM probes ran on a film that draws on one canvas, where there is no DOM to probe, and `dev --fast` on it took 109 s. The same log showed `vawe sound` failing 8 of 19 calls on cues shorter than one second, with a message that hid the cause: the reader needed one second of samples.

## Making the wait one call

The first group of fixes changed how a long-running command talks to an agent.

`ship` runs in the background by default: it starts a job and returns, `--wait` blocks, and `--status` reports progress or the result ([a0bf744d4](https://github.com/Vandit1604/vawe/commit/a0bf744d4)). A later commit checks the final first and cancels a duplicate job ([fd50ef01f](https://github.com/Vandit1604/vawe/commit/fd50ef01f)).

`ship --status --wait` blocks for up to 9 minutes and prints a progress line each minute ([0699bdcac](https://github.com/Vandit1604/vawe/commit/0699bdcac)), so a long block never looks like a hang. Its result names the next call and how many calls are left ([6ddf4240d](https://github.com/Vandit1604/vawe/commit/6ddf4240d)), which removes a decision from the agent.

`vawe wait` blocks on any render of a film, draft or final, with the same progress line and a result line at the end ([955d4a94c](https://github.com/Vandit1604/vawe/commit/955d4a94c)). AGENTS.md names it for waiting and says to run it once, not in parallel.

![Before: many polls, each blocking up to 100 s. After: one call up to 9 minutes with a progress line each minute.](/blog/cheap-wait/polls.svg)

## Keeping a slot free for drafts

A final never takes the last free render slot now. Slots 0 to count minus 2 are the finals' share, and a draft takes slots from the top, so a draft no longer queues behind finals ([7d01618fc](https://github.com/Vandit1604/vawe/commit/7d01618fc)). When a slot is busy, the waiting line names the holder and its age, and a navigation timeout is retried once ([fc84e8c70](https://github.com/Vandit1604/vawe/commit/fc84e8c70)). The slot logic lives in `harness/lib/render-slots.mjs`; the background job and status lines in `harness/media/ship-job.mjs` and `harness/lib/ship-status.mjs`.

Canvas films skip the DOM probes, and `dev` names why a page never loads after 30 s ([6ddf4240d](https://github.com/Vandit1604/vawe/commit/6ddf4240d)). On the canvas film, `dev --fast` went from 109 s to 26 s, a number from the commit subject.

![A canvas film's dev --fast run: 109 s before, 26 s after.](/blog/cheap-wait/fast.svg)

## Fixing what the failures threw away

The second group made failed work recoverable and visible.

- A mux failure keeps the capture. [544693435](https://github.com/Vandit1604/vawe/commit/544693435) reads the page audio before the capture, keeps the frames and records the real stage when the mux fails.
- A resume finds its frames. [8069d09c7](https://github.com/Vandit1604/vawe/commit/8069d09c7) keys the kept-frames folder on file bytes, because a rebase or an edit in another session changed the file times that the key used. [Resumable video rendering](/blog/resumable-finals) tells the rest of that story.
- A final needs a person's approval of the current page ([f776acb65](https://github.com/Vandit1604/vawe/commit/f776acb65), 13 files, 228 lines added and 12 removed). Agents had shipped a 16-minute final on their own whenever they finished; [AI agent guardrails](/blog/advise-refuse) explains the gate.
- Short cues work: [0eae5d9fb](https://github.com/Vandit1604/vawe/commit/0eae5d9fb) lets `vawe sound` read a cue under one second.
- Two natural calls stop failing: [84932e278](https://github.com/Vandit1604/vawe/commit/84932e278) defines `vawe.onFrame` before any page script, and [38b1fc355](https://github.com/Vandit1604/vawe/commit/38b1fc355) lets `strip --cuts` read the declared worlds of a canvas film.
- Every verb now ends with an `ok` or `FAILED` line, so a pipe cannot hide the result.
- The review script itself got a fix: [876927f88](https://github.com/Vandit1604/vawe/commit/876927f88) counts a hook block only from the hook's own refusal line.

The thin run log got its own fix as well: every verb now writes one line, and [AI agent observability with one JSONL line per command](/blog/run-logs) describes it. We also stopped asking agents how long a step took. The clock in the trace is the only one we trust.

## What we still do not know

We did not rerun the reviews after the fixes, so we have before numbers, commits and no clean after. We have no after-measurement of the slot rule. Two later observations point the right way: in the sessions we read next, agents no longer stacked parallel polls, and one agent called the new `vawe sound` verb 21 times once it existed. Neither is a time saving we can quote. The next review should measure the share of a session spent waiting, against the 74% here, and the rest of the harness work it may touch is listed in [AI agent harness engineering](/blog/weaker-model).
