---
title: "Cut video to the beat: a beat grid an agent can read"
description: "Cut video to the beat with a beat grid an agent can read. Our sound verb failed 8 of 19 calls with 'no output'. The cause was a one-second minimum on cues."
date: 2026-10-11
section: agent-experience
tags: "cut to the beat, beat detection, audio onsets, agents, error messages"
keywords: "cut video to the beat, beat grid, audio onset detection, beat sync editing, error messages for agents"
hero: /blog/beat/hero.svg
heroAlt: "Before the fix, vawe sound failed 8 of 19 calls on short cues with the message no output. The cause was a one-second minimum. After the fix, one agent used the verb 21 times."
---

Our `vawe sound` verb failed on 8 of 19 calls with the message "no output". The real cause was that the audio was shorter than one second. An agent that hit it had no way to guess that. This post is about the verb, the bad error message, and what we learned about teaching an agent to cut video to the beat.

## The problem: an agent that cannot hear

An agent can read a music file as bytes. It cannot hear it. In one trace the agent wanted to cut a film on the beat of a track, so it wrote its own Python with numpy to find onsets. It tried `vawe see` on the track first and got "no readable video stream", because `see` expects a film. In a film from another session, the hits were also found by hand, and 10 cuts fell in the first 2.2 seconds, where the bed has no onset at all.

So there was a clear need for a verb that reads a track and says where the beat is. We built one. Then we found its error message was the next problem.

## What we tried

The first version of `vawe sound` read a track, a film or a page and printed what it found. Agents also called it on the film's own sound cues: ticks, pops and swishes, to check them. Those files are short, often well under a second. The reader decoded audio with a helper that rejected any file with fewer than a second of samples. When it rejected one, the message it printed was the first line of ffmpeg's stderr, or "no output" if ffmpeg had said nothing. ffmpeg had said nothing, because nothing was wrong with the file.

In one session's log, 8 of 19 `sound` calls exited with code 2. The files were a tick, a word pop, a leave swish, an ETA tick and similar. We reproduced it on a valid mp3 tick. The message hid the cause.

## What we built: cut video to the beat

### The verb

Commit `a600cae64` made `vawe sound` the one reader of sound for cutting to it. It takes a track, a film or a page. It prints a beat grid, the hits, and a cut table. It also absorbed the older `audio`, `sounds` and `beatmap` verbs. The change was 30 files, 695 lines added and 112 removed.

A hit gets a kind. Commit `b71bae255` names each one: click, pop, swish, impact or sustained, and what moves in the frame at that time. The cut table has a verdict for each cut. A cut within 1 frame of a hit or a beat line is on beat. Within 3 frames it is near. Beyond that it is off, and the row gives the second to move it to.

![Schematic cut table. Cuts within one frame of a hit are on beat, within three frames are near, beyond that are off, and an off cut shows the second to move to.](/blog/beat/grid.svg)

### Advice in the draft loop

Draft advice reads the same table. The `cut-off-beat` check says how many cuts sit within a frame of a hit or beat line, lists the off ones, and names the command that gives the fix. It never stops a draft. If the music cannot be read, it prints that and moves on, and a page can waive it with a reason.

### The error message

Commit `6ec0d5adc` fixed the bug. `decodeMono` takes a `minSeconds` option with a default of 1, and the sound reader passes 0.02, so a tick decodes. When a file is too short, the error now says `under N s of audio` and not "no output". The test for it asserts that the default error names the length.

### Small fixes in the same loop

The verb now accepts a reference id from `vawe refs list` for its input and for `--cuts` (`f1453e1d4`). In the traces, 3 of the 13 errors in one remix session came from `vawe sound`: one passed a reference id where a path was expected, and two ran on a page that had no music bed. With no music file, the verb now says there is no beat grid, so the cuts are checked against nothing.

## The measured result

Before the fix, `vawe sound` failed 8 of 19 calls on ticks and pops. The remix agent used the verb 21 times once it existed. The first number is from one session's log. The second is from another session's trace review. They are two separate observations and do not form a rate. We did not measure whether films cut closer to the beat after this. The on-beat table exists, and we have not collected the before-and-after of the on-beat share.

## What we would tell someone building the same thing

- Make the error name the cause. "No output" cost us 8 failed calls in one log. "Under 1 s of audio" would have cost none.
- Test the shortest valid input. A one-tick file is valid audio, and agents call the verb on it.
- Return the fix with the finding. A cut table that says "off" is less useful than one that also gives the second to move the cut to.
- Do not make the agent write signal processing. When we saw hand-rolled Python for onsets, that was a missing verb.
- Make the check advice, not a gate. A draft must never stop on a music file it could not read.

For the other half of audio, the film's own sounds, see [Background music for generated video](/blog/no-synth-bed). The audio rules are in the [audio docs](/docs/audio), the verbs are listed in the [CLI docs](/docs/cli), and the repo is [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe). If a chain of cuts feels flat even on the beat, [Video transitions that carry the eye](/blog/transitions) covers what should cross each seam.

## In the code

- `harness/lib/sound-read.mjs`: the one reader (hits, tempo, grid, cut table).
- `harness/lib/audio-onsets.mjs`: `decodeMono` and its `minSeconds` option.
- `harness/media/sound.mjs`: the `vawe sound` verb.
- Commits: [`a600cae64`](https://github.com/Vandit1604/vawe/commit/a600cae64) the verb, [`b71bae255`](https://github.com/Vandit1604/vawe/commit/b71bae255) named hit kinds, [`6ec0d5adc`](https://github.com/Vandit1604/vawe/commit/6ec0d5adc) the short-cue fix, [`f1453e1d4`](https://github.com/Vandit1604/vawe/commit/f1453e1d4) reference ids.
