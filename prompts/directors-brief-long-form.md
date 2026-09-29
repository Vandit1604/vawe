---
when: "a film runs over 60 s or needs more than one session or agent"
answers: "BRIEF, STORYBOARD and GUIDE files, the chapter ownership contract for subagents, and the assembly prompt"
group: reference
---

# Director's brief for long form: chapters, sessions, one guide for every subagent

**Use when** the film runs over about 60 seconds, or it will not fit one session, or more than one
agent will paint it. A music video, a documentary, a history film, a multi-part explainer.

**Length:** 1 to 6 minutes. The brief is written once; each chapter is one session.

## The shape

Three files, then one page per chapter, then one page that plays them in order.

```
films/<name>/
  BRIEF.md            the film in plain words: who it is for, the one feeling, the arc, the palette arc
  STORYBOARD.md       one table per chapter: time | line or beat | shot | out (the transition)
  GUIDE.md            the rules every chapter agent reads first (below)
  ch/01-<slug>.html   one chapter, one page, its own <meta name="duration">
  ch/02-<slug>.html
  page.html           the film: mounts each chapter's page at its start time, owns the music and captions
```

## Prompt 1: the brief (one session, the director)

```
Read the material at <path or URL>. Then write films/<name>/BRIEF.md:
- Audience and the one thing they should feel at the end. One sentence each.
- The arc in five lines, each a chapter: its name, its time window, its one job, its palette, its
  motif (the object or move that ties the chapter to the next).
- The cast: every recurring character or object, drawn once, with the expressions or states it needs.
- The music: the file, its BPM and offset (measure it: node harness/dev/ref-cutlist.mjs or a beat
  grid from the file), or "no music, narration timings from <tts timings file>".
- What ties it together: one sentence.
Then write STORYBOARD.md: per chapter, a table of time | line or beat | shot | out. Every shot is
1.4 to 4 seconds and has ONE focal action. "Out" names the transition to the next shot. Every
important action lands on a beat (or a narration word boundary).
Then write GUIDE.md from the skeleton in prompts/directors-brief-long-form.md, filled in for this film.
Stop. I read the three files before any chapter is built.
```

## GUIDE.md skeleton (what every chapter agent reads first)

```
# GUIDE: read this before painting a chapter

## How a chapter works
- One chapter is one file, ch/NN-<slug>.html. It has its own <meta name="duration"> and renders alone
  with bin/vawe dev films/<name>/ch/NN-<slug>.html.
- Time is the seek: window.seek(t) with t in CHAPTER seconds (0 at the chapter's start), or CSS
  @keyframes and element.animate() that the renderer seeks. Every frame is a pure function of t: no
  timers, no carried state, no Math.random (use rng(seed) from core/motion/springs.js, seeded per
  element so a still element does not boil).
- A shot paints the whole frame, background included. Cuts land on the shot's start time.
- Only edit your own chapter file. Shared files (page.html, GUIDE.md, STORYBOARD.md, the cast page)
  are read-only. Need a helper the cast lacks? Write it privately in your chapter. Found a bug in a
  shared file? Report it in your final message; do not fix it.

## Canvas and layout
- The frame is --vw x --vh (the renderer sets them). Everything lays out with CSS; never crop.
- The caption band covers the bottom <n> percent whenever a line is showing. Keep faces and the
  focal action above it.
- The paper (or field) is under every frame already; the film page adds grain and vignette.

## The look (fill from BRIEF.md)
- Palette: <the chapter's colours by name>. No pure black and no pure white: use ink and cream.
- Type: <face, sizes as a fraction of --vh>.
- Line: <weight, boil yes/no>.

## Timing
- Beats fall at <offset> + n * <60/BPM> s. Put the important action on beats.
- One focal action per shot. Shots are 1.4 to 4 s. Something happens in every shot.
- Exits run faster than entrances. Never snap between character states; tween through the rig.
- Speed bands: the slowest beat in the chapter is at least 3x the fastest.

## The check loop (run it every pass)
1. bin/vawe dev ch/NN-<slug>.html and read the sheet: first, middle and last frame of every
   shot, and both sides of every cut.
2. node harness/media/see.mjs ch/NN-<slug>.html --look --times <s,s,s> for the stills that matter.
3. Fix what is cramped, unreadable or off the beat. Then the next pass.
4. Done means: every shot has its focal action, every cut is on its time, no text crosses the caption
   band, and you looked at the pixels of the last pass.

## Budget
- Under 2.5 s per frame in the renderer. Hundreds of shapes are fine, thousands are not.
```

## Prompt 2: one chapter (one session per chapter, parallel)

```
You own chapter NN, <slug>, <start> to <end> s of films/<name>. Read GUIDE.md, then your rows of
STORYBOARD.md, then BRIEF.md's cast section. Build ch/NN-<slug>.html. Run the check loop in GUIDE.md
at least twice. Do not touch any other file. End with: what you built, what you could not, and any
bug you saw in a shared file.
```

## Prompt 3: the assembly (the director, one session)

```
Mount every chapter in films/<name>/page.html at its STORYBOARD start time; the film page's
window.seek(t) calls the active chapter's seek(t - start). Add <audio src="music.mp3" data-at="0">
and the caption track. Render: bin/vawe ship films/<name>/page.html. Then read every chapter
boundary: both sides of each cut, and the motif hand-off. Then prompts/critique-pass.md.
```

## Inputs to ask for

The material (a song, a script, a paper, a battle), the audience, the length, what must stay exact
(names, lyrics, dates), the music file or the narration plan.

## Gotchas

- A chapter agent that edits a shared file breaks every other chapter. The ownership rule is the
  whole reason this works in parallel.
- A film timed to narration must derive its timeline from measured word timings (Austerlitz
  computed every scene start from the TTS timings file), never from a guess.
- Sound cues come from the picture: a contact lands 30 ms before the frame it belongs to.
- Four agents in parallel is the laptop's limit.

source: pattern from John Heibel's PDoomVideo (`ANIMATION_GUIDE.md`, `STORYBOARD.md`, `src/ch/`,
`chapter(name, start, end, shots)`), https://github.com/JohnHeibel/PDoomVideo, ISC declared in
package.json only, no LICENSE file, so no text is copied; the generalised starter
https://github.com/JohnHeibel/ClaudeAnimationBase (MIT, John Heibel) for the storyboard
"reads" table, per-element seeds and the sheet/strip loop; the narration-timed timeline from
https://github.com/WinterArc21/Battle-of-Austerlitz-Film (no licence, pattern only; its prompt is at
https://x.com/WinterArc2125/status/2103116235009347650); and the Movez course's director's brief
skeleton (owner-shared article, pattern only).
