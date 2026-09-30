---
when: a film reads amateur though every element renders fine
answers: "the direction spine: Disney's principles for type and graphics · Murch's Rule of Six · pacing · restraint · story placement · the eye path · a pre-ship checklist"
group: crosscutting
---

# DIRECTION: the spine that turns effects into a directed film

The engine can do almost anything, so an author reaches for more and ships "lots of effects" instead of
a directed piece. This file states pacing, restraint and story placement as principles from the craft's
literature, each with a translation into a page. Every rule is `[eye]`: no check can see it. Judge it
with `bin/vawe critique` in a fresh session and your own eyes. If your eye catches a flaw, fix it
(`../JUDGE.md`).

The mechanics of which curve and which cut live in `../MOTION-CRAFT.md`. Register-dependence of restraint
is in `MOTION-REGISTERS.md`. Read that first for a kinetic or hype film.

## 1. First principles of motion (Disney's twelve, the ones type and graphics obey)

| Principle | One line | On a page |
|---|---|---|
| Slow in, slow out | Nothing starts or stops instantly. | Entrances decelerate, exits accelerate. A constant rate is right where there is no rest to ease: a pan, a scroll, a marquee, a progress ring, an ambient drift. |
| Timing | Frame count is weight and meaning. | A heavy title enters slower (0.5 to 0.7 s) than a caption (0.25 to 0.4 s). Never one global duration. |
| Spacing | Where distance falls across frames is the ease's texture. | Arrive fast, land soft (`approach`, a critically damped spring) over a flat ramp. Bouncy overshoot is a banned default (`AGENTS.md`). |
| Anticipation | A small opposite wind-up readies the eye. | Before a hero scale-up, dip 2 to 4 % for about 4 frames. Hero moments only. |
| Follow-through, overlap | Parts trail and stagger. | Siblings: stagger 60 to 120 ms, never one frame. Layers: a child lags its parent 1 to 3 frames and overruns the stop. Within one element: scale finishes after position. |
| Staging | One idea per shot, one focal point. | One headline-scale message per beat, the rest subordinate in size, opacity and motion. |
| Secondary action | A support that never competes. | At most one quiet secondary motion per beat (background drift, glow), lower contrast, offset in time. |
| Exaggeration | Push the key beat past literal. | On the payoff, push scale and hold longer than correct. Keep the rest restrained so it reads. |
| Appeal | Clear, charismatic, uncluttered. | A committed face, real brand colour, generous negative space, strong scale contrast. |

Squash and stretch: scale non-uniformly along the travel with the reciprocal on the other axis, so volume
holds. Wrong for a logo or text (`AFTER-EFFECTS-TECHNIQUES.md`). Arcs: bow a travel over about 100 px.
Straight-ahead motion (a shader, `seek(t)` math, a noise field) suits behaviour; pose-to-pose keyframes suit
a path. They compose.

Sources: Thomas and Johnston, The Illusion of Life (1981); Shaw, Design for Motion (2020); School of Motion,
"12 Principles for Motion Design".

## 2. Directing the eye: every device names its target

A colour flash, a word-by-word reveal, a camera push, a cursor, contrast, size, a blur-to-sharp focus pull:
each exists to point attention somewhere. The plan says where each device points, or the device is a guess.

- **One landing per moment.** Two devices pulling to two places in one beat is no read at all. State which
  pulls first. (Material choreography: keep a clear focal point through a transition.)
- **The order of pulls is planned.** Motion recruits attention before a static contrast does, so the cursor
  or move goes first and colour or size settles it.
- **Per-word colour walks the eye.** A flash on every word with no destination is wallpaper. A flash that
  walks in reading order to the key word is direction. Say what the colour is for in one clause: "it walks
  the eye to the product name" passes, "it is on brand" does not.
- **State the eye path.** Where the eye starts, what pulls it (name the device), where it lands, per beat.
  `EYE-TRACE.md` has the rules for cuts.

## 3. Editing and pacing: rhythm is the direction

- **Rule of Six (Murch).** A cut serves, in priority: emotion 51 %, story 23 %, rhythm 10 %, eye-trace 7 %,
  screen plane 5 %, spatial continuity 4 %. Serve the feeling and the beat first. When a move and the
  meaning fight, keep the meaning. Sacrifice from the bottom.
- **Cut on the beat, or two frames early**, on an action (a word lands, a count finishes), never in a dead hold.
- **Vary the rhythm.** Alternate short punchy beats (0.8 to 1.5 s) with breathing beats (2 to 3 s). The
  payoff is the longest (`../RULES/speed-bands.md`).
- **The hold between moves.** Motion needs stillness to read. After an element settles, give it 0.4 to
  0.6 s before the next move. Every beat has a resting state where the copy is fully legible, and the world
  keeps moving there.
- **Accelerate toward the climax.** Tighten cutting through the build, release on the payoff.
- **Read the shape of the energy, not only its height.** Bruce Block, The Visual Story: a film's visual
  intensity should establish its rules, escalate through the conflict and resolve against what was
  established. A film whose loudest frame sits in the middle ends twice. Judge the curve by eye. A
  threshold would flag every film that chose a quiet ending.

## 4. Restraint: the biggest amateur versus pro tell

- **One motion idea per beat.** A dolly, or a colour wave, or a stagger, not all three.
- **Two properties on one element make one claim.** Slide up plus fade is "arriving". Rise plus rotate is
  arriving and tumbling: two claims about one object, and the viewer's reconciling reads as amateur. Say what
  the element is doing in one clause. If it needs an "and" between unrelated verbs, drop one.
- **Effects are seasoning.** Two or three earned moments per film. Content and proof beats stay clean.
- **One cut family per film.** Rotate inside a family (soft, motion, shape, spatial). Mixing families
  announces edits.
- **Continuity over slideshow.** Something carries across each cut (`FILM-STRUCTURE.md`).
- **Paired directional exits.** A layer that enters from one side exits the opposite side, in one direction
  of travel. Enter-and-retreat is the tell.
- **Blur out when moving would fight the content.** Faces, cards and dense grids leave through focus, not
  through space. Sliding 50 elements is chaos.
- **Name three, reject the first.** Before you pick a beat's technique, name three ways to do it and reject
  the first: it is the median. "How could this beat show its claim: a capture, the real data, a counter that
  ticks, a hand-keyed reveal?" The first answer is rise plus fade. The third is usually the film. A
  post-trained model returns its safe default unless asked to diverge.

## 5. Story placement

- **Hook, build, payoff.** Beat 1 poses, the middle escalates, the last beat pays off.
- **Open loop.** An unanswered question holds attention. The hook withholds the answer and the payoff pays it.
- **Never spoil the payoff.** The most counterintuitive number is the last beat.
- **Front-load the strong element.** The first 3 s decide whether they stay. First frame 12 words or fewer,
  strongest word first.
- **Build to a shocker.** Order the middle by rising surprise.
- **Tension and release.** The payoff gets the longest hold and the biggest scale.
- **Honesty.** On-screen copy is literally true and the hook's promise is paid. Real numbers only.
- **Value test.** Every beat earns its time or is cut.

Sources: McKee, Story (1997); Snyder, Save the Cat; Loewenstein, The Psychology of Curiosity (1994);
Ogilvy on Advertising; Murch, In the Blink of an Eye (2001); Reisz and Millar, The Technique of Film Editing.

## 6. Pre-ship checklist

1. A move that starts and stops eases at both ends. A pan, scroll or drift stays constant on purpose.
2. Durations and stagger vary with intent.
3. Entrances arrive fast and land soft in 0.2 to 0.3 s. A flat `ease-out` on everything reads as a stock template.
4. One hero and one tiny caption (scale contrast 5 to 8x), not three medium lines.
5. The payoff gets the longest hold.
6. Each layer enters and exits in one continuous direction.
7. A resting state exists and the copy is on screen long enough to read.
8. Exits are faster than entrances.
9. Dense content leaves through blur.
10. One motion idea per beat, two or three earned effects per film.
