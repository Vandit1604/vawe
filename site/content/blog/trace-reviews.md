---
title: "Reading AI agent traces: 74% of a session was waiting"
description: "We read agent transcripts and run logs for three rounds. In one 110-minute session, 81.5 minutes went to final renders and polls, and 3 of 5 finals failed."
date: 2026-10-11
section: agent-experience
tags: "ai agent traces, agent observability, render pipeline, debugging agents, harness"
keywords: "ai agent traces, agent observability, agent session logs, debugging ai agents"
hero: /blog/trace-reviews/session-time.svg
heroAlt: "A stacked bar of one 110-minute agent session. The ship and waits segment is 81.5 minutes, 74 percent. All other stages together are under 27 minutes."
---

We spent weeks tuning checks before we looked at where an agent actually spent its day. When we read the traces of AI agents building films with vawe, one number stood out. In a 110-minute session, 81.5 minutes were final renders and the polls that waited for them. That is 74% of the wall time, and the drafting, which we had tuned for weeks, was 7%.

This post is about the three trace reviews we ran on 2026-10-10 and 2026-10-11, what they found, and what we changed.

## The problem: we had never measured the agent's time

Our checks, our judge and our taste rules all measure the film. None of them measured the agent. We had `out/<film>.runs.jsonl`, which logs a few events per film, and we had the transcripts of the agent sessions. We had not put the two together.

So we did a read-only review: no render, no test, no edit. We rebuilt a timeline for each session with a small script that pairs every tool call with its result. The method has limits. Parallel calls overlap, so the tool-time columns count them twice. Cost fields in resumed sessions may be cumulative. We say so where it matters.

## What the traces showed

An 8 s film took a 73-minute span, 56 minutes of it active. The agent made 162 tool calls: 106 Bash, 53 Read, 2 Write and 1 agent call. Of those, 62 sat in the draft and motion-pass loop. It started 3 final renders. They took 390, 400 and 421 s, and the agent waited for them in the foreground with 16 poll calls of 100 s each.

A 20 s film took 110 minutes and 170 tool calls. Here is the split by stage.

![Stacked bar of one 110-minute session by stage](/blog/trace-reviews/session-time.svg)

Ship and waits took 68 calls and 81.5 minutes. Of 130 Bash calls, 52 were `ship --status --wait` polls. Those polls account for 17.6M of 40.7M cache-read tokens in that session, 43%. The agent often sent three or four polls in one message, and they ran one after the other, each up to 100 s.

The session record also showed API time of 1,235 s out of 6,630 s (19%) and tool time of 5,562 s (84%). The two overlap, but most of the session was tool time, not model time.

3 of the 5 finals failed.

![Bar chart of five final renders and their elapsed seconds](/blog/trace-reviews/ships.svg)

The failed ones cost 2,967 s, which is 49 minutes or 45% of the session. Two of them were captured to 100% (the log shows `capturing 19198/19200`) and then lost at the audio mux step with a "detached Frame" error. The run log recorded `failedAt: 0`, so the next ship started from the beginning and did a full second capture. The third failure lost a slice after four tries because another process closed the shared browser.

The agent could not see its own failures. Of 140 `vawe` calls in one review, 134 were piped into `tail`, `head` or `grep`. A pipe hides the exit code. The tool flag showed 2 failures per session, and the real count was higher.

The second and third rounds added more. In a later review of eight sessions, draft slot waits totalled 1,156 s across five films. In one, a draft spent 357 s of its 427 s waiting for a render slot behind a final. In another log, `vawe sound` failed 8 of 19 calls on cues shorter than one second, with a message that hid the real cause: the reader needed one second of samples. Twelve status calls cost 3,922 s for 4 finals in one session. A final render takes about 16 minutes, and agents shipped one on their own whenever they finished.

## What we changed

Each finding became a commit.

- A mux failure no longer throws the capture away. [544693435](https://github.com/Vandit1604/vawe/commit/544693435) reads the page audio before the capture, keeps the frames and records the real stage when the mux fails.
- A resume finds its frames. [8069d09c7](https://github.com/Vandit1604/vawe/commit/8069d09c7) keys the kept-frames folder on file bytes, not file times, because a rebase or an edit in another session changed the key.
- Waiting is cheap. `ship` runs in the background ([a0bf744d4](https://github.com/Vandit1604/vawe/commit/a0bf744d4)). `ship --status --wait` blocks up to 9 minutes with a progress line each minute ([0699bdcac](https://github.com/Vandit1604/vawe/commit/0699bdcac)). `vawe wait` blocks on any render of a film ([955d4a94c](https://github.com/Vandit1604/vawe/commit/955d4a94c)). We cover the details in [Making the wait cheap](/blog/cheap-wait).
- A final never takes the last free render slot, so a draft does not queue behind finals ([7d01618fc](https://github.com/Vandit1604/vawe/commit/7d01618fc)).
- A final needs approval of the current page. [f776acb65](https://github.com/Vandit1604/vawe/commit/f776acb65) is 13 files, 228 lines added and 12 removed. See [advise on everything, refuse on three things](/blog/advise-refuse).
- Short cues work. [0eae5d9fb](https://github.com/Vandit1604/vawe/commit/0eae5d9fb) lets `vawe sound` read a cue under one second.
- Two natural calls stop failing. [84932e278](https://github.com/Vandit1604/vawe/commit/84932e278) defines `vawe.onFrame` before any page script. [38b1fc355](https://github.com/Vandit1604/vawe/commit/38b1fc355) lets `strip --cuts` read the declared worlds of a canvas film.
- Every verb now ends with an `ok` or `FAILED` line, so a pipe cannot hide the result.
- The review script got a fix too. [876927f88](https://github.com/Vandit1604/vawe/commit/876927f88) counts a hook block only from the hook's own refusal line.

## The measured result

We did not rerun the reviews after the fixes. We have the before numbers and the commits, and no clean after. Two later data points help. In the later sessions we read, agents no longer stacked parallel polls, and one agent used the new `vawe sound` verb 21 times once it existed. We do not claim a time saving.

## What we would tell someone building the same thing

Measure the agent before the film. We tuned film checks for weeks and never asked how much of a session was the agent waiting.

Read the transcript next to the run log. The run log had 21 lines for 162 tool calls in one session, so it was blind to most of what happened. We came to see why in [Run logs: every verb writes one line](/blog/run-logs).

Make failure loud. A piped command hides the exit code, a failed final that reports 0% sends the next run back to the start, and a message that says "no output" hides the real cause.

Do not ask an agent how long a step took. Read the clock in the trace.

For the next level of this, see [Building the harness for the weaker model](/blog/weaker-model). The framework is open source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and the [determinism page](/determinism) explains why a render can be resumed at all.

## In the code

- `harness/lib/runlog.mjs` and `harness/lib/runs-report.mjs`: the run log and its report.
- [544693435](https://github.com/Vandit1604/vawe/commit/544693435): keep frames when the mux fails.
- [8069d09c7](https://github.com/Vandit1604/vawe/commit/8069d09c7): kept-frames key on file bytes.
- [955d4a94c](https://github.com/Vandit1604/vawe/commit/955d4a94c): `vawe wait`.
- [f776acb65](https://github.com/Vandit1604/vawe/commit/f776acb65): approval gate.
