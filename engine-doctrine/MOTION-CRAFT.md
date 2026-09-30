---
when: planning or judging the timing, easing, layering and transitions of a page film
answers: "the stored rules of good motion: the 10 rules, layering, handoffs, speed numbers, overshoot, easing by feeling, cut against transition, and what a dead or jolting film looks like"
group: process
---

# MOTION-CRAFT: the stored rules of great motion animation

Distilled from motion-design literature and from measured films. Look-and-feel taste is in
`engine-doctrine/CRAFT/TASTE-RULES.md`. The direction spine (pacing, restraint, story placement) with
book sources is in `engine-doctrine/CRAFT/DIRECTION.md`. Intent-first effect choice is in
`engine-doctrine/CRAFT/SELECTION.md`. Restraint against sustained motion, by film type, is in
`engine-doctrine/CRAFT/MOTION-REGISTERS.md`. Springs and keyframe helpers are in `core/motion/springs.js`.

## The 10 rules

| # | Rule | What it means in practice |
|---|---|---|
| 1 | **Timing is a voice, not a constant** | Entry pace varies with intent: ambient drifts 0.8-1.2 s, thesis lines 0.5 s+, payoffs snap 0.25-0.35 s. Uniform 0.45 s everywhere reads as monotone narration. |
| 2 | **Ease out in, accelerate out** | Entrances decelerate (arrivals are landings). Exits accelerate (departures are launches). Never linear on a visible move. See `RULES/ease-direction.md`. |
| 3 | **Hierarchy through offset** | Related elements stagger 30-80 ms, one after another. The beat's hero moves last or largest. Motion order is reading order. |
| 4 | **Choreograph arrivals** | Elements in one beat arrive as one phrase, not as independent events. Anticipation is the tiny pre-move before the main move. |
| 5 | **Settle and hold** | A clip, card or line of text stays still long enough to read: `RULES/readable-hold.md`. |
| 6 | **One hero motion per beat** | One element owns the motion; the rest supports quietly. Two competing animations read as none. |
| 7 | **Rotate layout archetypes** | Never the same archetype twice in a row (split, centred-top, full-bleed, card-over-board). |
| 8 | **Velocity contrast between beats** | A fast beat earns a still one. The freeze after a rush is the joke landing. |
| 9 | **Cover the hard cut** | A background jump (dark to light) wants a sting that peaks at the cut. Same-background scenes can whip or slide raw. |
| 10 | **Type moves like it reads** | Text enters in reading order, rises from its own baseline, and never crosses another line's path. The motion is part of the meaning. |

## Layering, life and handoffs

### How a designer decides what moves, in order

1. **Message and hierarchy first.** Pick one focal point per transition and serve it. Material's
   choreography guide: "Maintain a clear focal point during transitions by carefully selecting the
   number and type of elements shared across the transitions" (m1.material.io/motion/choreography.html).
2. **Boards, then an animatic.** Lock the beats and their order as still frames before anything
   moves. In vawe that is `brief.md` and the stills step.
3. **Block pose to pose.** Key the hero motion first, at its start and end pose only. Check the read
   works with nothing else moving.
4. **Secondary, then ambient, last.** Add support in decreasing order of loudness, never all at once,
   and never before the primary read is proven.

### Primary, secondary, ambient

- **Primary** drives the beat: the one hero motion.
- **Secondary** reacts to the primary and stays quieter (a shadow settles a beat after its card).
- **Ambient** keeps a held frame alive without asking to be watched: a slow drift or breathe. It is the
  smallest of the three by design.

Time them by offset, not simultaneity: motions sharing a beat start at different moments, in
hierarchy order. Material's own number ("no more than 20 ms apart") answers how long a person waits for
an interface, not how a shot should feel, so use the 30-80 ms stagger from AGENTS.md.

### Element life: enter, hold, exit

Every element has a designed enter, hold and exit, or a handoff. An element that is simply gone in the
next frame is dropped, not finished. Ask why before you ship it. A handoff where the outgoing
element's final pose becomes the incoming element's first pose reads as one object travelling. Give it
0.8-1.0 s and an ease-in-out. A 0.4 s handoff is too fast to read as travel.

### Handoffs that lead the eye (School of Motion's six transitions)

- **Match cut:** match a compositional element (a shape, a position) across the cut.
- **Cut on action:** cut to another view while matching the first shot's action. Place the hard cut on the action frame. Nothing checks the alignment: use your eye.
- **Graphic match / shape morph:** an SVG shape tweens into the next shape.
- **Container transform:** one element's shape grows into the next screen's frame.
- **Zoom through:** a continuous push into a surface with no cut across the shot.
- **Object wipe:** a live scene crosses and reveals the next, both sliding in lockstep on a hard edge.

A transition that blends two still rasters freezes any motion inside its window and jumps at the far
side. A film with continuing motion through a boundary needs a live join (a shared moving object, a
camera travelling through), never a blend of two frozen frames.

### Pitfalls

- **Everything moving at once.** Three or more top-level layers on one exact start read as a block, not a hierarchy.
- **Secondary competing with primary.** Two things owning the motion is zero read, not double.
- **Uniform timing, in both directions.** One duration on everything is monotone. Too many distinct durations read as drift: "five modals with five durations, each defensible, collectively incoherent" (Blake Crosley). Hold to a few named bands (`RULES/speed-bands.md`).
- **Motion with no meaning.** "Motion is information or it is noise." Adding motion because a frame feels empty is noise.
- **Ambient padding to look busy.** Switching on drift everywhere raises the motion of the whole frame and costs the film. See "Does the film ever stop" below.

## Speed numbers

Measured against the external consensus (Quiet UI text-reveal defaults: duration 100-2000 ms, default
600 ms; stagger 5-100 ms).

| Dial | Fast | Default | Calm | Notes |
|---|---|---|---|---|
| Per-unit reveal | 0.25-0.35 s | 0.5 s | 0.75-1.2 s | payoff, thesis, ambient (rule 1) |
| Reveal stagger | 0.04 s | 0.06 s | 0.10-0.12 s | under 0.04 s the sweep stops reading as a sweep |
| Stagger sequence total | | | cap 0.5 s | `(units - 1) x stagger`, see `RULES/stagger-total.md` |
| Cycling text (a ransom-note re-roll) | 0.5 s | 1.2 s | 1.6-2.0 s | it is not an entrance: it changes for the whole shot. Under 0.8 s it reads as noise, over 2 s as broken. Offset letters 0.08-0.2 s so they do not flip in unison. |

**Organic stagger** (Rauno Freiberg): a stagger reads as alive when it varies in degree as well as
order. Use a seeded shuffle for the order, not a metronome step.

**Distance and duration, measured here.** Carbon and Material say duration should follow distance but
publish no equation. Across 345 keyed moves in 135 library scenes the median speed was flat by
distance: 50-150 px 644 px/s, 150-300 px 652, 300-600 px 712, 600-1000 px 697. So the working number is a
speed: **about 700 px/s for a move you want the eye to follow.** A 900 px sweep takes about 1.3 s. A
third of all moves cover under 50 px at about 72 px/s: that is ambient drift, and a short move is not
obliged to be fast. The published ceilings (300, 500, 700 and 1000 ms) all answer how long a person
waits for an interface. Nobody waits through a film, so they do not apply. No test on speed alone is
reliable: a ceiling at the 95th percentile (1232 px/s) flagged three films that all read clean (a 2 px
rule sweeping to reveal UI, an 1800 px pane sliding out, a card tucking into a slot). Look at frames.

## Arrival rhythm

- **Across a beat**, between things that are not the same thing: irregular. A headline, a card and a chip that all begin on one frame give the eye no order. Offset them by different amounts, and start the next while the last is still settling.
- **Within one cascade**, among things that are the same thing: even. Six bullets or a row of logos read as one sweep only if the interval holds. A 40 / 260 / 40 ms cascade reads as a stall.

Both hold because they measure different scopes. Two rules of thumb: three or more layers on one
exact start read as a block, and a cascade whose intervals drift 30% or more from the average reads
uneven.

## Snap: overshoot and settle

The most recognisable "this was directed" tell is a move that lands soft: a curve that only
decelerates reads floaty, and one that carries slightly past rest and settles reads alive.

- **Land in the 0.2-0.3 s band.** A move that takes half a second reads floaty, a third of a second reads confident.
- **Keep it modest.** A spring with bounce about 0.14-0.20 is felt once. A big bounce on every word reads as a children's app, and bouncy overshoot is a banned default (`RULES/banned-defaults.md`).
- **Overshoot only on things that then hold still.** Overshoot on text held for reading wobbles and looks like shaking.
- **A counter must never overshoot.** Overshoot is a claim about mass. A number has no mass, and a count that springs flies past its true figure and falls back, so for a few frames the film shows a number that is not true. A film that says 1,822 and paints 1,900 on the way breaks the rule to use real figures. Ease a count with expo-out or quart-out: the deceleration is the weight.
- **Let the brand own the personality.** A punchy brand tightens durations and stagger, a calm one stretches them. Set it once per film as `:root` custom properties, not per element.

## Easing: which curve, and what it feels like

An easing curve is the acceleration of a move: how it starts and stops. Choose by intent. An entrance
decelerates, an exit accelerates, and a visible position move is never linear. Linear is correct only
for continuous motion with no start or stop (a looping marquee, a steady rotation).

| Feeling you want | Curve | What it does |
|---|---|---|
| Premium, calm entrance | ease-out with a whisper of overshoot | glides to rest, no wobble |
| Directed entrance, visible snap | a spring (bounce about 0.2) | carries slightly past rest and settles |
| Clean decelerate, zero overshoot | ease-out quart or quint | fast in, long smooth settle |
| Dramatic arrival | ease-out expo | very fast then a long tail; weighty |
| Alive object (card, avatar, chip) | ease-out back, kept small | launches, settles past 1 |
| Ambient loop (breathing, drifting) | ease-in-out sine | gentlest curve, no hard stop |
| Mechanical, geometric | ease-out or ease-in circ | stops or starts very hard; wipes and bars |
| Exit | ease-in, the mirror of the entrance | accelerates away |
| Speed ramp inside one move | slow to fast to slow | a camera or counter reads as intentional, not a lerp |
| No travel at all | a stepped swap | holds the from value and jumps at the far key |

### The pivot can travel

The transform origin decides which point a scale or rotation grows from. Animate it: a door that
swings from one hinge and then the other, a panel that grows from its left edge and then its centre.

### Follow-through: one property finishing after another on the same element

A card that slides in and whose rotation settles a beat after it lands reads as a physical object.
The same card whose every property stops on one frame reads as a slide changing. Thomas and Johnston
call it overlapping action. Delay the trailing property by 0.05-0.15 s: that band reads as weight, not
as a second, later move. When the trailing thing is a separate element, delay it as its own move.

### What a graph editor does that a curve table cannot say

1. **A key in the middle of a move should not stop.** Every curve above lands at rest at both ends, so three keys read as two moves with a full stop between. Compute the tangent at a waypoint key from its neighbours so the velocity entering equals the velocity leaving. Do this for a camera passing a subject, or a card crossing the frame and continuing.
2. **A key has two sides, and their shape is the speed graph.** A spike then decay reads as a hit that settles. A flat plateau reads as a machine. A symmetric hump ("easy ease") reads as soft and generic by default: it is the reason so much motion looks competent and characterless. A flat-ended hold arrives and sits. Choose the shape the motion means. Do not push influence near 100 on both sides of one key: the hump collapses to a spike and the object skips.

### Reading the tells

| Good | Bad (and why) |
|---|---|
| An entrance that is ease-out | An entrance on ease-in-out: it starts slow, feels sluggish, never snaps |
| A visible slide on ease-out quart | A visible slide on linear: robotic, weightless, the amateur tell |
| Overshoot only on things that then hold still | Overshoot on text held for reading: it wobbles |
| Curve and duration varied by intent (rule 1) | One curve and one duration on everything |
| An exit that accelerates away | An exit on the same ease-out as the entrance: it arrives while leaving |

## Genre pacing

| Genre | Beat length | Entry pace | Cuts |
|---|---|---|---|
| Launch film (30-60 s) | 4-7 s | varied per rule 1 | one family plus one accent |
| Product walkthrough | 5-8 s | calm, UI-mechanism motion only | punch or fade |
| Shorts (games, facts) | 2-4 s | snappy throughout | whip or pop |

## DO / DON'T

- DO let a counter's easing be the story (a speed ramp). DON'T animate numbers linearly.
- DO give ambient chrome a pulse at tiny amplitude. DON'T loop anything near text being read.
- DO stagger board cards 60-90 ms. DON'T pop a whole board at once: it reads as a screenshot.
- DO scale travel to element size (22 px for UI text, 40-70 px for heroes). DON'T fling small text far.

## Cut, or transition?

Before you reach for a transition, ask whether the beat wants a plain cut. School of Motion: "Simplicity
is the ultimate sophistication." The hard cut is the professional default, and a transition has to earn
its place.

| Intent between two beats | Use |
|---|---|
| Fast pace, on the beat, raw impact | hard cut |
| Passage of time, location change, montage | dissolve |
| Punch, launch, hide-then-reveal (matched action) | cut on action: a hard cut placed on the motion |
| Visual continuity: a shape carries over | match cut, or a shape morph |
| Diving into a screen | dynamic zoom or a camera push into the artifact |
| Logo or "awe" flourish | morph: logos and one hero moment only |

- **Default to the hard cut.** A film is mostly cuts with a few earned transitions. A transition on every seam reads as a template.
- **Cut to the beat.** On-beat cuts read directed, off-beat ones read sloppy. Cut on the beat or two frames early (AGENTS.md).
- **A transition states a relationship** (time passed, place changed, this becomes that). With no relationship to state, the cut is the honest choice.
- **Master a few:** a dissolve, one momentum move (whip or push), one zoom, a rare morph.

## Effect choice, by feeling

- **Kinetic type:** a plain rise is the default read. A typewriter suits terminals and timers. A scramble-decode suits tech, on hero words only. Tilt suits sporty, bounce suits playful brands only. Blur-in suits dreamy or premium. A gradient word at most once per film. A highlight or underline emphasises mid-sentence. A wave belongs to ambient loops only.
- **Cuts:** fade or blur is neutral. A whip works on momentum, on the same background only. A punch or zoom focuses a product. A spin suits logos. A jitter suits alarm or glitch only.
- **Stings:** a flash is an energy cut. Burn or light-leak suits warm brands. Ink or dissolve suits editorial. Glitch, scan or pixel suits tech. Confetti is for wins only.
- **Ambient looks:** fields sit behind content at low intensity (about 0.3). Overlays (VHS, CRT, film grain, light leak) sit on top at 0.6-0.9, one per film, never behind small body copy, and never two together.
- **Motion blur:** a velocity-derived streak on fast moves sells speed and hides the frame stutter. Skip it on slow drifts and on small body text held mid-move, where it dissolves the text. Blur follows motion: a still thing never blurs.
- **Colour grades:** duotone collapses a busy photo into two brand colours. Tritone keeps a mid-tone for faces and products. Posterize wants 4-6 levels, and fewer gets muddy. Vignette stays under 0.6 or it reads as a tunnel.
- **Glow:** bloom belongs at a bright point (a logo, a lit number). Halation is film-warm glamour on one highlight, felt not seen. Diffusion softens a busy dark region so text floats.
- **Captions:** a highlight with a read trail is the default when the caption is the content. Karaoke pills are loudest, for hype cuts over busy footage, never over dense UI. A weight shift is quietest, for product demos.

## Does the film ever stop

**Local motion, not global motion.** The obvious way to raise a motion score is ambient motion
everywhere. That buys the number and costs the film. Judge local motion (something arrives,
concentrated in a small region) and global motion (everything drifts a little) separately. Measured
across a reference and its recreation, 80% of the change in a moving window lived in 3.1-3.9% of the
frame in both, because both films moved by revealing content in one place, not by breathing everywhere.

**A dead window** is a 0.5 s span with no local content motion: a reveal finished and nothing took
over. The reference film's quietest window measured 0.42 on the local-motion scale against a median of
1.33. `vawe-flow-2` had no window below 0.2 across 19.8 s. A bad recreation had ten, including one 2.5 s
dead stretch. The world keeps moving to the last frame: there is no static tail.

**A jolt** is a speed jump between frames: over 600 px/s for position or 0.6 scale units per second
for zoom. A linear camera station, or an ease-in straight into a hold, is the classic shape: smooth on
a storyboard, jerky on screen. `page-check` reports the hard version as `dead-stop`.

## What code guarantees, and what is taste

Code guarantees determinism (seek purity), text contrast, clipped glyphs, readable holds and dead
stops, through `bin/vawe check page-check` and `bin/vawe review`. Everything else in this file is taste,
which is why it is written down.
