---
when: "\"what holds this film together across its cuts\""
answers: the devices a short film can be held by (spatial · verbal · temporal · conceptual), what practitioners actually say about choosing between them, and why our one blocking structural rule enforced the item Murch ranks last
group: crosscutting
codes: continuity, no-continuous-object, no-continuous-object-inferred, becomes-is-preset, chain-breaks, missing-object-field, single-thread, stub-why, trigger-is-mechanism, trigger-is-sequence, object-diverges, object-not-built, unmet-beat
applies-when: short
confirm: "what holds this film across its cuts?"
---

# Film structure: what holds a short film together

## AGENT SUMMARY

- Name what holds the film across each cut: a spatial device (transforming object, match cut via `matches`, camera travel), a verbal/aural one (unfinished sentence, sound bridge, bookend), a temporal one (metric/rhythmic cutting, music-led), or a conceptual one (motif, escalation, intellectual montage). Pick from Part 1, land on at least two threads (Part 4, Q6).
- Enforced by `[gated]` codes `continuity`, `no-continuous-object`, `no-continuous-object-inferred` (opt-in via `TASTE=1` or `make direction-floor`; the gate sees only the transforming-object device, so waive with a named `_why` when another device carries the film).
- Checkable action: what holds this film across its cuts?

This library has one answer to that question. One object survives every cut and changes there.
`direction-floor` blocks on `no-continuous-object` when it cannot find that object, and
[`CONTINUITY-WITHOUT-AN-OBJECT.md`](CONTINUITY-WITHOUT-AN-OBJECT.md) already records that eighteen of our
short films answer it by keying `w` and `h` on a rectangle.

**The gate now sees a SECOND device, and it is the one it always asked for by name.** Its fix message
says "every junction answers 'the X becomes the Y'", and `becomes` is the field that writes exactly
that. A match cut is two layers by construction, so the one-layer-straddles-the-joint test could never
find it and a film held entirely by match cuts failed for doing the thing it was told to do. Declare
the handover and the gate reads it as one form crossing the joint:

```json
"transitions": [{ "at": 3, "fx": "none", "mech": "cut" }],
"matches":     [{ "at": "cut@0", "from": "dot", "to": "card" }]
```

The joint owns the number: `core/timeline/junctions.js` retimes both layers onto it, and the engine carries the
outgoing form's centre, size and rotation onto the incoming one. A handover declared away from any
joint buys nothing, so this is not a pass you can decorate a slideshow with. The other sixteen devices
in the table below are still invisible to the gate, and the section on its limits stands.

The continuous object is one device. Working animators and editors use a dozen, and they mix them. This
page lists the ones the sources actually name, records what the sources say about choosing between them,
and says where our rule came from and what it costs.

**Read this as research, not as doctrine.** Part 1 is sourced. Part 2 is thinner than Part 1 and says so.
Part 4 is my synthesis and is labelled as such.

---

## Part 1: the devices

Each device answers the same question: at a cut, what does the viewer carry across? Grouped by the
register the answer lives in. A film can and should run several registers at once.

### Spatial: something in the picture survives

| Device | What survives | Works when | Fails when |
|---|---|---|---|
| **Transforming object** | the prop itself, in a new state | one subject, one process, short runtime | the film has several subjects, or the object is a box being resized |
| **Match cut** (shape · motion · colour · subject · thematic) | a form, a direction of travel, or a hue | the two frames genuinely rhyme | the rhyme is forced, and the cut reads as a trick |
| **Long take / oner** | one unbroken space and time | the subject is a place, or a walk through a system | the content has no spatial logic, so the move is decoration |
| **Camera travel across shots** | one continuous surface or path | the beats share a world | the beats are unrelated claims |
| ↳ *how, here* | lay the beats out as STATIONS on a canvas bigger than the frame, then `cameraMove:{move:"travel", stations:[…]}`. The camera is global and does not reset at a boundary, so the flight replaces the cut. Reference films: `linear-journey.json` (12 keys, zero cuts) · `playhead.json` (20 keys, `s` 1→2.66 while it travels). Pair with the `plane` modifier or a truck moves every layer by the same amount and reads as a slide. Skill: `vawe-camera`. | | |
| **Masking / reveal** | the object, partly concealed then shown | utility changes with what is exposed | nothing is being withheld |
| **Cloning** | a new object visibly born from the old one | a one-to-many or many-to-one relation | used as a generic entrance |
| **Dolly and zoom** | your position in one space | navigating between places in a system | there is no system, only slides |

### The engine builds one for you: `matches`

The match cut is the one spatial device this engine PRODUCES rather than asks you to align. Name the
joint and the two forms, and it does the arithmetic:

```json
"transitions": [{ "at": 3.0, "fx": "punch", "dur": 0.35 }],
"matches":     [{ "at": "cut@0", "from": "token", "to": "card" }]
```

The outgoing layer is retimed to end on that joint; the incoming one opens wearing its centre, its size
and its rotation, then settles into its own geometry. Both ramps are stripped, because a match cut has
no entrance and no exit: the outgoing form is whole on the cut frame and the incoming one is not
arriving, it is already there. The alignment tolerance is therefore ZERO by construction, and the joint
holds the only copy of the time, so moving the cut moves the match with it.

Two things this is NOT. It is not a shared-element move: `from` and `to` are two DIFFERENT layers, and
the point is the rhyme between two forms, not one form travelling. And it is not detection. Canva's
Match & Move, Keynote's Magic Move and PowerPoint's Morph all guess which elements are the same across
two pages, and that guess is their whole failure mode, because a restyle silently stops the tween. Here
identity is declared by `id`, so a name that is not on the other side of the joint throws instead.

Know the limit, and it is a limit of the gate rather than of the device: **a film held this way still
fails `no-continuous-object`.** That rule looks for one layer id alive on both sides of a boundary, and
a match cut is two ids by construction. See the match-cut entry in `engine-doctrine/MISTAKES.md`.

The single sweeping camera move is a standing title-sequence device, not a novelty. In live action the
same idea is the long take or oner, and a pseudo-oner hides its cuts in a whip pan or a dark passage.
See Provenance below for the sourced statements behind both claims.

### Verbal and aural: something you hear survives

| Device | What survives | Works when | Fails when |
|---|---|---|---|
| **Unfinished sentence** | grammar; the clause has no full stop | there is a voice or a reading line | no VO and no readable copy |
| **Sound bridge (J-cut / L-cut)** | the audio, running past the picture cut | the film has sound at all | the film is silent, which most of ours are |
| **Bookend** | an opening image the ending answers | the film has a change to show | the two ends merely repeat |
| **Open question** | an unanswered loop | the payoff really answers it | the question was rhetorical |

A sound bridge is the cheapest continuity device in live action and we cannot use it, because our films
ship silent by default. That is a real constraint on us and worth naming: **we have voluntarily given up
one of the two easiest registers.** The **unfinished sentence** is our own name, from
[`CONTINUITY-WITHOUT-AN-OBJECT.md`](CONTINUITY-WITHOUT-AN-OBJECT.md), for one clause per shot with no full
stop until the end; treat it as a house term, not received vocabulary. See Provenance for the sourced
definitions of a sound bridge and a bookend.

### Temporal: the clock survives

| Device | What survives | Works when | Fails when |
|---|---|---|---|
| **Metric cutting** | a fixed cut length, felt as a pulse | the film is an argument or a list | the content needs uneven dwell time |
| **Rhythmic cutting** | a pulse that bends with what is in frame | there is real variety to pace | it drifts into no pattern at all |
| **Music-led structure** | the track's own sections | there is a track chosen before the boards | the track arrives last, as decoration |

Metric cutting is a structure by itself: nothing in the picture has to persist if the clock does.
Music-led is the strongest directly-sourced statement found about structure, from the *Lolo* titles: see
Provenance for the quote and the citation.

### Conceptual: the idea survives, and nothing else has to

| Device | What survives | Works when | Fails when |
|---|---|---|---|
| **Motif** | a repeated image, shape or colour that returns | the repetition means something | it is a watermark |
| **Intellectual montage / Kuleshov** | an argument made by the junction itself | you are comparing two things | there is nothing to compare |
| **Escalation** | each beat outbidding the last | you have a real ranked order | the beats are peers |
| **Conceptual through-line** | one idea restated in many pictures | the idea is specific | the idea is "innovation" |

**These are the devices our gate cannot see at all.** A film held by a motif and an escalation is properly
structured and will fail `no-continuous-object` every time.

### Whole-film shapes, as distinct from devices

A device joins two shots. A shape decides what the whole film is. The named advertising shapes are
problem/solution, product demo, vignette anthology, and manifesto or anthem. This layer of the literature
is mostly marketing content and no credible practitioner source was found that ranks these shapes against
each other; take the names, not the advice (sourced definitions in Provenance).

Note what the shapes imply. A manifesto and a vignette anthology are **deliberately discontinuous in the
picture.** They are held by the voice and the pulse. Our gate blocks both.

---

## Part 2: how practitioners decide

This half is much thinner than Part 1, and that is the honest finding. Named studios publish process
pages and give podcast interviews, and they talk about collaboration, trust, timelines and sound. They do
not, in anything found, say "we chose a match-cut spine here because the brief had three subjects".
The device choice appears to be tacit knowledge that nobody writes down.

What was found, ranked by how directly it answers the question. Sourced quotes and citations for each
numbered claim below are collected in Provenance.

**1. Murch ranks what a cut must serve, and puts spatial continuity last.** Emotion 51%, story 23%, rhythm
10%, eye-trace 7%, the two-dimensional plane of the screen 5%, three-dimensional space 4%. This is a
decision rule and it is the most load-bearing source on the page. It governs one cut rather than a whole
structure, but the ordering generalises: **whatever holds the film together should be chosen for the
feeling first, and spatial persistence is the thing you give up first, not the thing you must have.**

**2. The message decides, and it decides before any picture exists.** Ordinary Folk's published process
runs Message, Design, Animation, Audio. School of Motion's Explainer Camp puts storyboard and animatic
in week three, before After Effects. The criterion here is not which device, it is which comes first.
Structure is settled in the cheapest medium available, and the picture obeys it.

**3. If there is a track, the track may be the structure.** Laura Nicolas, quoted in Provenance: music
leads, "not the other way around." The inverse holds for narrated work: when there is a voice, the music
serves the words and the words set the pace.

**4. The platform sets the front of the structure, not the middle.** Short-form guidance is consistent and
low-quality as writing: hook in the first three seconds, then escalation, then payoff, then a CTA or loop,
with the subject filling a 9:16 frame from the first frame rather than opening wide. This constrains the
opening and the runtime. It says nothing about which device carries the middle.

**5. Kinetic typography carries its own test.** The practical question is whether the motion supports
comprehension: if a viewer cannot read the word at the moment it matters, the animation is working
against the message.

**What could not be found:** any studio, in a process page, podcast transcript or interview,
stating a rule for choosing between a continuous object, a match-cut chain, a motif, and a metric cut rate.
The UI-motion literature generally was a dead end for this question: it is rigorous about how a *single*
transition should feel (duration, easing, transform over layout) and says nothing about how a *film* is
held together. Most searches for studio structural process returned SEO listicles ranking motion studios.
Treat any confident decision framework on this topic, including Part 4 below, as inference.

---

## Part 3, where our rule came from, and what it costs

`no-continuous-object` came from one reference. The `vawe-continuous-action` skill states its own
provenance: "The reference in this repo (`higgsfield.mp4`, first 5 seconds, recreated in
`films/scene/higgsfield-recreation.json`) is not a sequence of beats. It is one continuous action." The
gate generalised that single sample into a floor for every film under 15 seconds
(`CONTINUITY_MAX_DUR = 15` in `quality/gates/direction-floor.mjs:134`).

The sample was a good one. A five-second product film with one subject and one process is exactly the case
the transforming-object device was made for. The generalisation is the problem.

**What the gate measures.** `continuity()` in `quality/gates/direction-floor.mjs:197` walks each boundary,
finds layers visible on both sides, and keeps only those whose pose differs across it. That is spatial
persistence plus a state change. In Murch's ranking it is item six, the 4% item. **Our only blocking
structural rule enforces the thing Murch says to sacrifice first.**

**Which films it serves.** A single-subject product film. A process shown end to end. A demo where the UI
is the subject. An interface film, where transformation and masking are the native grammar anyway. For
these, the rule is right, and the reason it is right is that the *content* is continuous, not that films
must be.

**Which films it blocks or deforms.**
- A **manifesto or anthem** film. Held by a voice and a pulse over deliberately unrelated pictures.
- A **vignette anthology**, "three customers, three problems". Forcing one prop across all three lies
  about the content.
- A **comparison** built on intellectual montage, where the meaning lives in the junction and the two
  sides must be visually unlike each other.
- A **metric-cut list film**, where the pulse is the structure and every card is meant to be a peer.
- Anything held by a **motif** or a **bookend**, both of which the gate is blind to by construction.
- Any film held by an **unfinished sentence**, which our own docs already recommend and which needs a
  waiver to ship.

**The measurable cost.** The gate rewards the cheapest satisfying answer, because the cheapest answer is
the only one it can see. A keyed `w`/`h` on a rectangle passes. A motif does not. Eighteen short films in
`films/scene/` carry an explicit `no-continuous-object` waiver, and three consecutive films were one
rectangle changing size and passed everything. That is the shape of a gate teaching a habit rather than
catching a defect. CLAUDE.md 2a001 already says so; this page adds the reason. **The gate did not merely
fail to see the alternatives. It made one alternative free and all the others expensive.**

Two smaller costs worth recording. Our films ship silent by default, which removes the sound bridge and
weakens music-led structure, so we are working with fewer registers than the sources assume. And
`beats-wrapped-as-units` (`direction-floor.mjs:229`) shows the engine's default timing actively truncates
any layer that tries to cross a cut, so the one device we mandate is also the one the renderer fights
until the author sets `acrossBeats`.

---

## Part 4: a decision aid

**This is synthesis, not a sourced framework.** Ingredients: Murch's ranking (what to sacrifice first),
Ordinary Folk's message-first order, Laura Nicolas on music-as-structure, Willenskomer's continuity
principles, Eisenstein's metric montage, and our own measurement of the `refs/` film in
[`CONTINUITY-WITHOUT-AN-OBJECT.md`](CONTINUITY-WITHOUT-AN-OBJECT.md). No source states these six
questions. They are inference and should be argued with.

Answer these before writing JSON. The answers point at a register, not at a single correct device.

**Q1. Is there a voice or a continuous reading line?**
Yes, and the sentence can carry the film. The pictures are then free to change wholesale. This is the most
permissive thread available and it is the one the gate cannot see.
No, and the thread must be visible or rhythmic. Go to Q2.

**Q2. How many subjects does the film have?**
One. The transforming object, camera travel and masking all work. Prefer whichever the content already
does.
Several, and they are peers. Do not force one prop across them. Use a metric cut rate, a repeated frame,
or a motif, and let each subject be itself.
Two, in opposition. That is intellectual montage. The two sides should look unlike each other, and the
junction is the point.

**Q3. Is the subject a place, a process, or a claim?**
A place, and camera travel or a long take is the native answer.
A process, and the transforming object is the native answer, because the object really does change.
A claim, and no object exists to carry. Use a bookend, an escalation, or a motif, and show the evidence.

**Q4. What is the runtime and the median shot length?**
Measure the reference before assuming. Our films sit at 2.5 to 4 seconds a beat; the reference we admire
runs a 1.52s median. Under about 2 seconds, rhythm and match cuts do most of the structural work and you
need less from every other register. Over about 3 seconds, a conceptual through-line has to be doing
something or the film drifts.

**Q5. Is there a payoff being withheld?**
Yes, and the open question is a thread by itself, and the strongest one for the hook-suspense-payoff spine
CLAUDE.md already requires. It costs nothing visually. The payoff must actually answer the question.

**Q6. Count your threads. How many did you land on?**
One is fragile, and a single thread has to be literal and obvious to work, which is how a film ends up as
a resizing box. Two is usually enough, and lets both be subtle. The reference film runs three at once.
If your count is one, add a second before you author, not after the gate complains.

**Then state the threads in the storyboard frontmatter, by name.** If one of them is a device the gate can
see, you will not need a waiver. If none of them is, take the waiver and write a `_why` that names the
device from Part 1. A gate that cannot see a motif is a limit of the measurement, not a verdict on the
film.

---

## Part 5: causality, the register none of the devices covers

Every device in Part 1 answers the question "what survives the cut". None of them answers "what made the
cut happen". Those are different questions, and a film can pass the first and fail the second: four beats
can share a prop, a colour and a cut rate, and still be four things that merely follow each other.

The distinction is old and it is not ours. Post hoc is not propter hoc: after is not because. See
Provenance for the sourced reading of the *Fight Club* titles, whose run of abstract images does not
persist in the picture at all and is held together by "this immediate relationship between cause and
effect".

The published method this came from decomposes a reference film into five columns: time, what is on
screen, what moves, **what triggers the next screen**, and what sound sits there. Its worked grammar for a
15-second product film reads:

```
a request is typed -> SENDING IT causes the next screen ->
the work shows one step at a time -> a finished artifact proves the result ->
a human approves -> the brand closes
```

Four of those five columns our storyboard already carries. The fourth it did not.

### The three fields, and how to tell them apart

- `mechanism:`, HOW it moves. A preset. "panel unfold, staggered rows".
- `becomes:`, WHAT it turned into. The change the viewer sees. "the request becomes work in progress".
- `trigger:`, WHAT MADE IT HAPPEN. The cause. "the cursor hits Send on the card in beat 1".

A beat can have all three, and a good one usually does. A film where every beat has a `becomes:` and no
beat causes the next is a run of unrelated changes, which is the slideshow failure written down on paper
instead of discovered in the render.

### Why `no-continuous-object` cannot see this

That gate measures a prop surviving a junction plus a state change: spatial persistence. A cause is not
spatial. A keyed `w`/`h` on a rectangle will never show one, and a film whose every junction is caused can
carry no persistent prop at all. The two rules are independent, and the causal one is the harder to fake.

### What the gate does with it

`storyboard-check` reads `trigger:` per beat and prints the film's causal spine every run: one link per
junction, each unstated link drawn as a break, and a count of fragments. A spine in one piece is a film
where each beat forces the next. Four fragments is four films in a row.

It warns, and it never blocks:

- **`trigger-is-a-sequence`**: the value says WHEN, not why. "then", "next", "the beat starts". Every
  slideshow already has an order.
- **`trigger-is-a-mechanism`**: the value names the transition. "it cuts to the next shot". That is how
  the film arrives, not why it had to.
- **`chain-breaks`**: some junctions state a cause and some do not, so the spine is in pieces. It fires
  only once an author has opted in, because a presence check on a field nobody has filled in yet is a rule
  that gets waived by reflex inside a week.

**Not every film has a causal spine, and that is why nothing blocks.** A manifesto, a vignette anthology
and a metric-cut list film are all held by something else, and asking them what caused beat 3 has no
answer. Read the printed spine, decide whether this film is one that should have one, and move on.

### What no static gate can see here

It reads the words in the plan. It cannot tell whether the cause is true, whether the render puts the
causing act on screen, or whether the viewer will read the second beat as following from the first. A
storyboard can state a perfect chain and the film can drop every causing act. That half is `make judge`
and your eyes.

---

## Provenance

**Sourced statements for Part 1.**

A match cut is "a match cut based on the visual shape or composition of elements across the cut", and it
comes in shape, motion, colour, subject and thematic forms
([Wikipedia](https://en.wikipedia.org/wiki/Match_cut)). School of Motion splits the motion-design use into
two: match cuts with movement, which continue momentum, and match cuts with framing, which keep the
composition and let the content change. Its timing note is exact and usable: "if you have a twelve frame
move and decide to cut on frame six, pick-up the next shot on frame seven"
([School of Motion](https://schoolofmotion.com/blog/match-cuts)).

Masking, cloning, dolly-and-zoom and transformation are four of Issara Willenskomer's twelve principles of
UX in Motion, and he defines each by the continuity it creates: transformation "creates a continuous state
of narrative flow when object utility changes"; masking "creates continuity in an interface object or
object group when utility is determined by which part of the object or group is revealed or concealed";
cloning "creates continuity, relationship and narrative, when new objects originate and depart"; dolly and
zoom "preserves continuity and spatial narrative when navigating interface objects and spaces"
([UX in Motion Manifesto](https://medium.com/ux-in-motion/creating-usability-with-motion-the-ux-in-motion-manifesto-a87a4584ddc)).
Our continuous-object rule is his *transformation* principle, promoted to a law. His other eleven are
still available and we use almost none of them structurally.

The single sweeping camera move is a standing title-sequence device, not a novelty. Art of the Title names
*Hellboy II* and *I, Robot* as sequences built on "a fluid, single-shot camera move" that carries wildly
varied imagery ([Art of the Title](https://www.artofthetitle.com/feature/the-inner-workings/)). In live
action the same idea is the long take or oner, and a pseudo-oner hides its cuts in a whip pan or a dark
passage ([Wikipedia](https://en.wikipedia.org/wiki/Long_take)).

A sound bridge is audio from one scene bleeding into the next; the J-cut runs the next scene's audio early,
the L-cut runs this scene's audio late
([StudioBinder](https://www.studiobinder.com/blog/what-is-a-sound-bridge-definition/)).

Bookends are "a pair of scenes that occur at the beginning and end of a film" that "act as a framing device
for the main story", used to give "a clear entry point and a satisfying exit point"
([Filmmakers Academy](https://www.filmmakersacademy.com/glossary/bookends/)). The requirement is that
something crucial has changed between the two.

Eisenstein's five methods run metric, rhythmic, tonal, overtonal and intellectual; in metric montage "the
pieces are joined together according to their lengths, in a formula-scheme corresponding to a measure of
music" ([Media Studies](https://media-studies.com/eisenstein-montage/),
[StudioBinder](https://www.studiobinder.com/blog/soviet-montage-theory/)).

Music-led is the strongest directly-sourced statement found from a practitioner about structure. On the
*Lolo* titles, Laura Nicolas says: "We really used the music as the main structure for the titles, it
really leads the whole sequence by its rhythmic changes," and then, generally, "Music is a key element for
my creations, I always use it as the structure for my films and not the other way around"
([Art of the Title](https://www.artofthetitle.com/title/lolo/)). Art of the Title's own survey agrees that
music is essential glue in title work ([The Inner Workings](https://www.artofthetitle.com/feature/the-inner-workings/)).

A motif is a repeated visual, verbal, musical or behavioural element that points to a deeper meaning
([FilmDaft](https://filmdaft.com/motif-in-film-explained/)). Intellectual montage "involves the
juxtaposition of seemingly unrelated images to create a new, higher level of meaning"
([Media Studies](https://media-studies.com/eisenstein-montage/)); the Kuleshov effect is the same
mechanism proved on one face. Art of the Title's example of a conceptual through-line is *Fight Club*,
where "this immediate relationship between cause and effect" holds a sequence of abstract imagery together
([The Inner Workings](https://www.artofthetitle.com/feature/the-inner-workings/)).

Manifesto films "capture the brand's essence in a video without a storyline or plot", with the product
taking a back seat
([shots](https://shots.net/news/view/manifesto-ads-has-corporate-poetry-outstayed-its-welcome)). A vignette
demo shows a series of scenarios rather than one
([Storylane](https://www.storylane.io/blog/vignette-demo)). This layer of the literature is mostly
marketing content and I did not find a credible practitioner source that ranks these shapes against each
other. Take the names, not the advice.

**Sourced statements for Part 2.**

**1.** Murch, *In the Blink of an Eye* (2001): "If you find you have to sacrifice certain of those six
things to make a cut, sacrifice your way up, item by item, from the bottom"
([StudioBinder](https://www.studiobinder.com/blog/walter-murch-rule-of-six/)).

**2.** Ordinary Folk's published process runs Message, Design, Animation, Audio. Stage one is "we shut up
and listen. We may ask a question or two hundred," and produces a script
([Ordinary Folk](https://www.ordinaryfolk.co/process)). School of Motion's Explainer Camp puts storyboard
and animatic in week three, before After Effects, and calls the animatic the guide that communicates "the
timing of the piece, as well as what will happen, where and when"
([School of Motion](https://www.schoolofmotion.com/blog/inside-explainer-camp-course-art-visual-essays)).

**3.** Laura Nicolas, quoted above under Part 1 ([Art of the Title](https://www.artofthetitle.com/title/lolo/)).

**4.** Short-form guidance: hook in the first three seconds, then escalation, then payoff, then a CTA or
loop, with the subject filling a 9:16 frame from the first frame rather than opening wide
([SocialKit](https://socialk.it/en/blog/video-hooks-first-three-seconds)).

**5.** "If a viewer cannot read the word at the moment it matters, the animation is working against the
message" ([We Design Motion](https://wedesignmotion.com/blog/design/kinetic-typography-when-and-why-it-works/)).

**What was checked and found not to answer the question:** Emil Kowalski's animations.dev and the
UI-motion literature generally were a dead end for this question: they are rigorous about how a *single*
transition should feel (duration, easing, transform over layout) and say nothing about how a *film* is
held together ([animations.dev](https://animations.dev/),
[emilkowal.ski](https://emilkowal.ski/ui/great-animations)).

## Sources

Editing and structure theory:
- Walter Murch, *In the Blink of an Eye* (2001). The Rule of Six and its percentages, summarised at
  [StudioBinder](https://www.studiobinder.com/blog/walter-murch-rule-of-six/)
- Eisenstein's five methods of montage: [Media Studies](https://media-studies.com/eisenstein-montage/),
  [StudioBinder](https://www.studiobinder.com/blog/soviet-montage-theory/)
- Match cut and its types: [Wikipedia](https://en.wikipedia.org/wiki/Match_cut),
  [StudioBinder](https://www.studiobinder.com/blog/match-cuts-creative-transitions-examples/)
- Long take and the pseudo-oner: [Wikipedia](https://en.wikipedia.org/wiki/Long_take)
- Sound bridge, J-cut and L-cut: [StudioBinder](https://www.studiobinder.com/blog/what-is-a-sound-bridge-definition/),
  [FilmDaft](https://filmdaft.com/what-is-a-sound-bridge-in-film-definition-and-transition-guide/)
- Bookends: [Filmmakers Academy](https://www.filmmakersacademy.com/glossary/bookends/)
- Motif: [FilmDaft](https://filmdaft.com/motif-in-film-explained/)
- Montage as a device for motifs and rhythm: [Peter D. Marshall](https://filmdirectingcoach.substack.com/p/50-techniques-that-contribute-to-e83)

Motion design practice:
- [School of Motion: match cuts in animation](https://schoolofmotion.com/blog/match-cuts)
- [School of Motion: Explainer Camp, storyboard and animatic before animation](https://www.schoolofmotion.com/blog/inside-explainer-camp-course-art-visual-essays)
- [Ordinary Folk, process: message, design, animation, audio](https://www.ordinaryfolk.co/process)
- [Issara Willenskomer, Creating Usability with Motion: the UX in Motion Manifesto](https://medium.com/ux-in-motion/creating-usability-with-motion-the-ux-in-motion-manifesto-a87a4584ddc)
- [We Design Motion: kinetic typography, when and why it works](https://wedesignmotion.com/blog/design/kinetic-typography-when-and-why-it-works/)
- [MOWE: storyboard and animatic in a motion project](https://medium.com/mowestudio-for-creatives/why-most-motion-designers-ignore-both-storyboard-and-animatic-75f6d34fe26e)

Title design:
- [Art of the Title: The Inner Workings](https://www.artofthetitle.com/feature/the-inner-workings/)
- [Art of the Title: Lolo, music as the structure](https://www.artofthetitle.com/title/lolo/)

Advertising shapes (names only; the advice is marketing content):
- [shots: manifesto ads](https://shots.net/news/view/manifesto-ads-has-corporate-poetry-outstayed-its-welcome)
- [Storylane: vignette demo](https://www.storylane.io/blog/vignette-demo)
- [SocialKit: short-form hooks and the first three seconds](https://socialk.it/en/blog/video-hooks-first-three-seconds)

Checked and found not to answer the question:
- [animations.dev](https://animations.dev/) and [emilkowal.ski](https://emilkowal.ski/ui/great-animations):
  rigorous on single-transition feel, silent on film structure
- [School of Motion podcast with Giant Ant's Jay Grandin](https://www.schoolofmotion.com/blog/were-we-wrong-about-studios-giant-ant-jay-grandin):
  studio economics, no structural craft
- Buck and Golden Wolf process searches returned studio rankings, not process

## What is missing from this page

- No source ranks the devices against each other. Part 4 is inference.
- No studio, in anything I could find, explains why it picked one structural device over another on a
  specific job.
- I did not measure any of our own films against this vocabulary. Somebody should: take the 18 waived
  scenes, name what actually holds each one, and see how many are held by nothing at all.
- The sound register is absent from our practice, and the cost of that has not been measured.
