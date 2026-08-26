---
message: "In this engine a word's look is not picked from a typeface, it is computed from the frame number."
audience: "A developer or motion designer reading the vawe docs and deciding whether the type system is real."
arc: "hook -> build -> reject -> payoff"
framework: "PAS. The agitation is the rejection beat: the reader's likely assumption (this is a font choice) is named and struck out before the answer arrives."
threads:
  - "CONTINUOUS OBJECT: the timing diagram. It is on screen for every frame of the film and its bars re-slope at each cut to the next preset's stagger."
  - "MOTIF: one word slot. Every headline lands in the same box at the same size, so four beats read as one word changing its mind."
object: "the timing diagram under the word"
object_t0: "an empty ruler and seven rows, before the first bar grows"
object_states: "cut 1 - seven bars on a 0.085s slope, playhead running · cut 2 - six bars on a 0.045s slope · cut 3 - four bars on a 0.070s slope · cut 4 - the three slopes drawn over each other with their stagger values read out"
object_last: "the three slopes held together with the payoff line above them"
format: 1920x1080
theme: "themes/vawe.json"
duration: 13.0s
pace: "showreel, 2.2s per idea"
spectacle: "beat 4 - the word `chosen` - the `strike` preset - a rule draws through the word and it dims behind the line while staying legible. It is the only beat that argues instead of demonstrating, and it is the only beat where the world inverts to ink."
not: "no gradient hero. No stock motion-graphics whoosh. No fourth demo word: three is the sample, the fourth beat has to say something. No centred type over an empty field, because the diagram is the evidence and it holds the lower half all the way through."
---

# Type, as a function of n

SUBJECT: the kinetic type system in vawe
DATA: the engine's own presets, and their real stagger values
PAYOFF: the look is computed per frame, so it is seekable and it is one word of JSON
AUDIENCE: developers evaluating the engine
FEELING: workshop, not showreel. A measuring instrument, not a title sequence.

## 1 - stagger  (0.25s - 2.2s)

- type: demo
- object: the diagram is born. An empty ruler grows seven bars on a 0.085s slope.
- onscreen: "stagger"
- why: show the simplest case first, one word rising character by character, so the two beats after it have a baseline to differ from.
- layout: the word fills the upper third; the diagram fills the lower half of the frame.
- style: light paper ground, the word at weight 700.
- mechanism: `split: char` + `preset: up`, 0.085s stagger, 0.42s each.
- becomes: an empty ruler becomes seven bars on a slope.
- rest: the playhead keeps travelling after the word has landed.

## 2 - decode  (2.35s - 4.3s)

- type: demo
- object: the diagram swaps its seven bars for six, on a slope half as steep.
- onscreen: "decode"
- trigger: beat 1 drew a slope, which raises the question of what a different slope looks like.
- why: prove the first beat was a value and not a look, by changing only the number.
- layout: unchanged. The word slot never moves, so only the motion differs.
- style: the ground densifies to paperDots.
- mechanism: `preset: decode`, 0.045s stagger.
- becomes: a seven-bar slope becomes a six-bar slope, half as steep.
- rest: the playhead runs again.

## 3 - blur  (4.45s - 6.4s)

- type: demo
- object: the diagram swaps again, to four bars on a 0.070s slope.
- onscreen: "blur"
- trigger: two slopes are a pair, not a family. The third closes the sample.
- why: close the sample, so the rejection beat has something to reject.
- layout: unchanged.
- style: the ground densifies again, to dotmatrix.
- mechanism: `preset: blur`, 0.070s stagger, 30px.
- becomes: a six-bar slope becomes a four-bar slope.
- rest: the playhead runs a third time.

## 4 - the rejection  (6.5s - 8.7s)

- type: argument
- object: the diagram stops running. Its three slopes are drawn over each other and their stagger values are read out beside them.
- onscreen: "THE LOOK IS" | "chosen"
- trigger: three demos in a row invite one wrong conclusion, that the viewer has been shown three typefaces.
- why: this is the SPECTACLE and the only beat that argues. Naming the wrong reading and striking it out is what earns the payoff.
- layout: the eyebrow sits above the word slot; the word fills the upper third; the three slopes hold the lower half.
- style: the world inverts to ink. The word is set at weight 300, the lightest cut in the film, because a rejected word should not shout.
- mechanism: `preset: strike`, a 12px rule drawing through the word while it dims to half strength and stays legible.
- becomes: a running playhead becomes three finished slopes with their numbers.
- rest: none. The strike is the only motion in the frame.

## 5 - the payoff  (8.7s - 13.0s)

- type: payoff
- object: the diagram holds its three slopes under the line, unchanged, for the rest of the film.
- onscreen: "A letter is a function of n." | "A word is a function of n." | "All of it is a function of n."
- trigger: the rejection leaves a hole where the answer should be.
- why: say what the look actually is, three ways, without the sentence reflowing once.
- layout: the line sits where the word slot was, at a quarter of its size; the diagram holds the lower half.
- style: still ink. The turning word is the only brand-coloured thing in the film.
- mechanism: `wordSlot` turns one word of the sentence through three candidates in a fixed chip, so nothing after it moves.
- becomes: a claim about one letter becomes the same claim about a word, and that turns into the claim about the whole frame. Three states, one line.
- rest: the slot keeps turning under the settled line.
