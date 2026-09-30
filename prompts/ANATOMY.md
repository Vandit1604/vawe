---
when: "you are about to write a film prompt, or to ask a person the questions that make one"
answers: "how to build a film prompt section by section, the evidence behind each section, the question bank rule, and the two poles (measured brief, director's brief) with when each wins"
group: reference
---

# ANATOMY: how to build a film prompt

A film prompt has six sections, in this order: inputs, direction, structure, build, gotchas,
start. Every template in `prompts/` has that shape, and `bin/vawe new <name> --from prompts/<t>.md`
turns one into `films/<name>/brief.md`. This file says what goes in each section, what the corpus
says about it, and one example in our own words.

## The evidence

Counted over 128 creator prompts in awesome-ai-motion (355 cases), split at the top quartile by
bookmarks. The median prompt is 16 words. Length does not predict reception (Spearman 0.15 with
bookmarks): eight of the top ten are under 60 words.

- A genre or reference anchor is the one feature that holds: 37.5% of the top quartile against
  16.7% of the rest, and 61.5% against 23.1% in the authors' own text.
- Numbers, a named ban list and a stop before code lean the same way but rest on 3 to 5 prompts each.
- Nobody in the corpus asks questions with defaults. That rule comes from two owner-shared briefs
  and from the intent interview in HyperFrames, not from engagement data.

## The six sections

**1. Inputs: five questions, each with a default.** Ask the five things that change the film most,
in that order. Every question carries a default, so a skipped question never blocks the agent.
The default is a real value, never "ask again".
Example: "Music: a licensed song, or synth cues only? Default: synth cues. Why: a song sets the beat
grid; without one the cuts follow the picture."

**2. Direction: an anchor, a feel, a ban list.** Name the genre or the reference first (the one
feature with evidence). Then the feel in numbers where a number exists: palette as hex, type as a
fraction of frame height, the pace as seconds per beat. End with the ban list; every item on it is a
default the agent would reach for (`engine-doctrine/RULES/banned-defaults.md`).
Example: "A 12 s square product sting in the Apple keynote register. White field, one accent
`#2563eb`, type at 0.11 of the frame height. Banned: particle bursts, glows, bouncy overshoot."

**3. Structure: the beats as a table, on a grid.** One row per shot: start, duration, what the viewer
notices, the end state, the out. Cuts fall on a beat or two frames before it. The slowest beat runs
at least 3x the fastest. Write it before code and stop (`prompts/beat-sheet.md`).
Example: "Bar 1: the promise, word by word on beats 1 to 4. Bar 2: the word 'film' grows into the
capture. Bar 3, the drop: a circle opens out of the button into the dark scene."

**4. Build: the page contract, in the agent's own vocabulary.** One `page.html`, `<meta
name="duration">`, time is the seek (CSS keyframes, `element.animate()`, or a pure `seek(t)`), audio
as `<audio data-at>` tags mixed offline, every tunable number a literal in the page.
Example: "Every style is computed from t inside `window.seek(t)`. Springs are sums of closed-form
steps from `core/motion/springs.js`. Captures live in `films/<name>/assets/` with the source URL."

**5. Gotchas: the three things that fail on the first try.** Measured or seen, not imagined: a
white square vanishes on white without a 1px edge, text is measured after fonts load, a capture
scaled under 0.6 loses its type, an opacity on a preserve-3d element breaks depth.

**6. Start: the interview, then the stills, then the draft.** Tell the agent to ask the bank, take
the defaults, show the beat table, then show a handful of stills at named times before any full
render. Both owner briefs end this way; the measured one names its frames ("stills at f40, f86, f150,
f230").

## The two poles

**The measured brief** fixes every number: duration in frames, fps, master rate, keyframe tables per
frame, a beat formula, cut frames exact, SFX at exact times, stills at named frames. It wins when
the film recreates or extends something that already exists (a product sting, a reference rebuild,
a loop that must close), when a client signs it off, or when more than one agent builds it. Its cost
is that every number must come from somewhere; a guessed number is worse than none.

**The director's brief** fixes the intent and the world, and leaves the numbers to the agent: who
it is for, the one feeling, the arc, a strong hook in the first seconds, planned variance (huge
lyrics at the hook, subtitles later), composition that leaves room (characters right, lyrics left),
verification loops (watch the whole film several times, compare to the bar). It wins for a music
video, a story, a showreel, or anything where the agent's taste is the point and a table would fix
what nobody has seen yet. Its cost is a first draft further from the mark; the critique loop
(`prompts/critique-pass.md`) closes the distance.

Pick by one question: does a number already exist for this shot? If yes, write it down (measured).
If not, write the intent and let the draft find the number (director's). Most films mix: measured
for the hook and the loop seam, director's for the middle.

## The template rows

| template | pole | the anchor it names |
|---|---|---|
| ui-morph-loop, pixel-art-sprite, reference-rebuild, production-brief-acceptance | measured | Dribbble UI motion; a 16-bit sprite; the reference itself; the client's claim |
| brand-launch-from-url, music-video-beat-synced, story-explainer, interactive-lab-capture | mixed | a product launch; a beat-synced ad; an explainer; a working model |
| showreel-one-liner, directors-brief-long-form | director's | a showreel; a documentary or music video |
| beat-sheet, critique-pass | tools | the shot table; the fresh critic |

## Sources

Counts: `awesome-ai-motion` (MIT for the repo; creator texts are third-party and were studied for
structure only) and `awesome-opus-5-5-videos` (CC BY 4.0, athemeroy). The question-with-default rule:
two owner-shared briefs and the HyperFrames intent interview (https://github.com/heygen-com/hyperframes,
Apache 2.0, pattern only).
