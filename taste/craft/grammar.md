---
when: "before authoring, or when a film reads flat and you cannot say why"
answers: "what films that read well actually measure: shot length, the shape of motion, whether the ground turns, what carries across a cut, and the ten patterns that recur"
group: crosscutting
---

# The motion grammar: what films that read well have in common

Contents:
- [The numbers](#the-numbers)
- [The ten patterns](#the-ten-patterns)
- [Single-film findings worth stealing](#single-film-findings-worth-stealing)
- [Method](#method)

Twenty-two reference films were measured frame by frame (shot length, mean frame-to-frame luma change,
ground luminance per shot) and 17 were read by hand. A device seen in one film is an idea. Seen in three it
is a technique. Each pattern below names how many films showed it. It is evidence, not a rule: nothing here
blocks a film. The rules that came from it: [world-turns](../rules/world-turns.md), [first-frame](../rules/first-frame.md), [shot-length-varies](../rules/shot-length-varies.md), [accent-share](../rules/accent-share.md).

## The numbers

- Motion (mean frame-to-frame luma delta) in work that reads well ranges from 0.08 to 18.28 per shot.
- Median shot length is about 4 s across the films with measurable cuts. The fastest film ran a 1.48 s
  median (33.6 cuts a minute) and did not read as frantic. The slowest ran 18.6 s.
- Films built on travel and dissolves have no hard cuts at all: a shot detector finds nothing and falls back
  to fixed sampling. That is often the finding, not a failure.
- A mean is the wrong statistic for a beat. Read the per-frame curve, not the average.

## The ten patterns

### 1. A beat is a burst, then a rest (3 films)

Inside a shot the change curve rises to a peak and decays to near nothing before the next beat. It is an
event followed by silence. Every shot ends quieter than its middle. The rest is what makes the next arrival
read as an arrival. A film whose average motion is 2x to 4x higher than another can still read worse if
nothing lands.

Filling every flat segment with drift to lift the average produced a uniform churn: the number moved and the
film got worse. Hold the pose with no keys. A 1.5 % breath is below the still floor and is the right amount
of life for a rest.

### 2. Blur-resolve as the entrance (3 films)

Type arrives heavily blurred and settles into focus. Nothing slides, fades or scales. It reads as speed in a
single frame, which a fade never does: a blurred still looks fast, a half-opacity still looks broken. Two of
the three use it at the open and the close to bracket the film. In a page: animate `filter: blur()` from
about 24 px to 0 over about 0.4 s.

### 3. The ground inverts on every cut (3 films)

Consecutive beats alternate dark and light, so no cut needs an effect. The inversion is the transition. One
film has no continuous object, no camera and no shared subject across seven shots and reads as one film
because the ground alternates. Doing it within one hue is the gentler form.

### 4. Three ways to invert a frame (3 films)

The backdrop changes (a new world). The subject changes value (slabs go bright-on-black to dark-on-white:
the same objects under different light). The light changes over an unchanging world (80 s of black lit by
blue, then orange, then white). Only the first is a new world. We reach for it every time.

### 5. Hold the picture, move the type (3 films)

Every photographic or rendered object is still. All the motion is type arriving and the ground changing.
That lets a film cut 33 times a minute without reading as frantic: the cut rate is high while the rate of
change inside a shot is low. Do not add a push-in to every image reflexively: it costs this.

### 6. One accent colour, one word at a time (4 films)

One hue carries every emphasis, usually one word per beat. It tells the eye where to land in the 200 ms a
fast beat gives it. In one film the accent held 0.13 % of all pixels and carried every emphasis.

### 7. The loudest frame is often an absence (3 films)

The peak measured frame is something leaving, or the frame flooding with flat colour, not something
arriving. One film's two loudest frames (68.7 and 40.2) are a flat purple flood that costs one rectangle.
Another film's loudest frame is a phone leaving and a lone caret in an empty frame. A film whose four peaks
are all arrivals also works, so both are available. An emptying is the one we never use.

### 8. A container that holds while its contents change (4 films)

One frame, pill, ring or window stays put and what is inside it swaps. It is the cheapest continuity device:
the eye has somewhere to rest while the content changes, so a full swap does not read as a cut. One film
recolours the container to match its new contents, the detail that makes it look designed.

### 9. Escalate the unit, not just the pace (2 films)

Start on single words at under a second, end on sentences at four. Beat length and meaning grow together, and
the pacing change reads as structure. A pacing change on its own reads as arbitrary.

### 10. Word, proof, word, proof (1 film, and the strongest product-demo shape seen)

A hero type card states a claim and the next shot shows it in real product UI: 15 shots were 7
claim-and-evidence pairs plus a bracket. A scale collapse (a word larger than the canvas resolving to a
caption) recurs three times as one punctuation gesture, not three different tricks. A real photographed
object under real light after nine shots of flat UI was the strongest claim that the thing exists.

## Single-film findings worth stealing

- **One object can be the whole film.** Three shots, 30 s, and a set of slabs is the subject, the wipe, the
  ground inversion and the light on the wordmark.
- **A true continuous object** (an input pill becomes a window becomes an application, on one ground, with
  no cut) types a prompt inside a pill that is itself sliding into frame: two motions on one object.
- **Grade as punctuation.** A film cuts by changing the colour of the same footage (red, green, blue, blow-out).
  Its peaks are all grades, never motion, so a film can measure extremely active while nothing travels.
- **A palette can be the only thread.** Seven unrelated subjects held by one hue and a serif.
- **A caption line can carry the argument** across graphic beats that interrupt the speaker.
- **Frame the photograph rather than move it.** A ring turning around a still photo reads as designed, not stock.
- **Camera travel over one white plane** (a film with no cuts, one accent at 0.13 % of pixels, 67 % one
  near-white) is the strongest case for building a film from travel rather than cuts. Its static background
  is earned by a subject that never stops moving: argue it per film, do not take it as a default.

## Method

Study a reference with `bin/vawe spec <ref.mp4>` (SPEC.md and spec.json) and `bin/vawe compare`. Keep the
reading, not the pixels: no frame, crop or copy of another person's film goes into the repo.
