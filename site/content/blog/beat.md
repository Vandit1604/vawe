---
title: "Cut video to the beat in code with a beat grid"
description: "Cut video to the beat without listening: read a track as a beat grid, check each cut within one frame of a hit, and move it. 8 of 19 calls failed first."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "cut to the beat, beat detection, audio onsets, agents, error messages"
keywords: "cut video to the beat, beat grid, audio onset detection, beat sync editing"
hero: /blog/beat/hero.svg
heroAlt: "Before the fix, vawe sound failed 8 of 19 calls on short cues with the message no output. The cause was a one-second minimum. After the fix, one agent used the verb 21 times."
---

You can cut a video to the beat in code, with no ear involved: read the music as a beat grid and a list of hits, compare every cut with them, and move each cut that is more than three frames off. At the end you have a cut table where each cut is marked on beat, near or off, and each off cut names the second to move it to. Our agents work this way because an agent can read a music file as bytes but cannot hear it.

We built this into `vawe sound` after reading traces. In one, the agent wrote its own Python with numpy to find onsets, after `vawe see` refused the track with "no readable video stream" (`see` expects a film). In another film, the hits were found by hand and 10 cuts fell in the first 2.2 seconds, where the bed has no onset at all. Sound for agents has its own rules; the [LUFS for video guide](/blog/audio-as-written) covers how loud the mix should be.

## What you need for beat-synced cuts

- A music file the user gave. Without one there is no beat grid, and the verb says so instead of checking cuts against nothing.
- A film page whose beats are `data-world` elements, so the cut times are known.
- `bin/vawe` from the repo (the [CLI docs](/docs/cli) list the verbs).

## Step 1: read the track as a beat grid

Run the verb on the track alone. It prints the tempo, a beat grid and the hits:

```
bin/vawe sound <track.mp3>
```

The input can be a track, a film or a page, or a reference id from `vawe refs list` ([6353c65ec](https://github.com/Vandit1604/vawe/commit/6353c65ec)). The verb came from [bf4252858](https://github.com/Vandit1604/vawe/commit/bf4252858), which made `vawe sound` the one reader of sound and folded in the older `audio`, `sounds` and `beatmap` verbs: 30 files, 695 lines added and 112 removed.

## Step 2: name each hit

A beat grid tells you where the pulse is. A hit tells you what happens. Since [f80b3869c](https://github.com/Vandit1604/vawe/commit/f80b3869c) each hit has a kind (click, pop, swish, impact or sustained) and the verb says what moves in the frame at that moment. An impact is a stronger place to cut than a sustained note, so read the kinds before you choose.

## Step 3: check the film's cuts against the grid

Pass the page with `--cuts`:

```
bin/vawe sound <track.mp3> --cuts <page.html>
```

The cut table gives each cut a verdict. Within 1 frame of a hit or a beat line, it is on beat. Within 3 frames it is near. Beyond that it is off, and the row gives the second to move it to.

![Schematic cut table. Cuts within one frame of a hit are on beat, within three frames are near, beyond that are off, and an off cut shows the second to move to.](/blog/beat/grid.svg)

## Step 4: move the off cuts in the page

Each beat's start is a literal in the page, so moving a cut means editing that number (a keyframe stop or a `:root` custom property) to the second the table names. Then render a draft and run Step 3 again.

## Check it worked: the draft advice

You do not have to remember Step 3. The draft loop reads the same table through the `cut-off-beat` check: it reports how many cuts sit within a frame of a hit or beat line, lists the off ones, and names the command that gives the fix. It never stops a draft. If the music cannot be read, it prints that and moves on, and a page can waive the check with a reason.

## Failures we hit on short cues and wrong inputs

"no output" on a tick or a pop. Agents also called `vawe sound` on the film's own cues to check them, and those files are often well under a second. The decoder rejected any file with less than a second of samples and printed the first line of ffmpeg's stderr, or "no output" when ffmpeg had said nothing, which it had not, because nothing was wrong with the file. In one session's log, 8 of 19 `sound` calls exited with code 2 on a tick, a word pop, a leave swish, an ETA tick and similar. We reproduced it on a valid mp3 tick. [0eae5d9fb](https://github.com/Vandit1604/vawe/commit/0eae5d9fb) fixed it: `decodeMono` in `harness/lib/audio-onsets.mjs` takes a `minSeconds` option with a default of 1, the sound reader passes 0.02, and a file that is too short now fails with `under N s of audio`. A test asserts that the default error names the length.

A reference id where a path was expected, and a page with no music. In one remix session, 3 of the 13 errors came from `vawe sound`: one passed a reference id where a path was expected, and two ran on a page that had no music bed. Both now get a clear answer: reference ids are accepted, and a page with no music file gets "no beat grid".

## How much it helped

Before the fix, `vawe sound` failed 8 of 19 calls on ticks and pops. After the verb existed, the remix agent used it 21 times. The first number comes from one session's log and the second from another session's trace review, so they do not form a rate. We have not measured whether films now cut closer to the beat; the on-beat share before and after is still to collect.

The code is in `harness/lib/sound-read.mjs` (hits, tempo, grid, cut table) and `harness/media/sound.mjs` (the verb). A cut on the beat can still feel flat if nothing carries the eye across it, which [motion graphics transitions: 12 handoffs](/blog/transitions) covers. For what plays under the cuts, read why we [ban the synth bed in background music for generated video](/blog/no-synth-bed), and the [audio docs](/docs/audio) for the tags. The level of the finished mix is checked as described in [LUFS for video](/blog/audio-as-written).
