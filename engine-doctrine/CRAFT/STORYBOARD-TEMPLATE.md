---
message: "One sentence, the single thing this video must communicate."
audience: "Who it is for (role, context)."
arc: "hook → build → proof → payoff → CTA"
framework: "PAS | BAB | AIDA | FAB | Star-Story-Solution, CHOSEN, with a reason, not defaulted"
threads: "what holds this film across its cuts. Two devices from engine-doctrine/CRAFT/FILM-STRUCTURE.md"
object: "ONLY if a continuous object is one of them: the noun that survives every cut. Optional source after an arrow: 'the input bar -> films/scene/_together.bar.html' draws that file instead of assemble.mjs's placeholder rect"
object_t0: "what it looks like before anything happens"
object_states: "what it becomes at each cut, in order"
object_last: "the last frame: the payoff, or the moment just before it"
format: 1920x1080
theme: "themes/<brand>.json (or: preset <name> remixed via make theme-remix)"
duration: 29s
pace: "showreel | explainer | held, CHOSEN before any beat is written, with a seconds-per-idea budget"
spectacle: "beat N · which layer · which device · what the moment is for, the ONE loud moment"
not: "the defaults this film refuses, in your own words"
---

## AGENT SUMMARY

- Copy this file, fill every field, then run `make storyboard-check SB=<file>` and get sign-off
  BEFORE writing any scene JSON.
- Name each beat's `archetype:` and `weight:` (exactly one `peak`), and a `borrows:` line whenever
  a reference device is in play, written as `<their device> -> <our object>`. `make frame-check`
  measures the peak against the frames actually built.
- Two lines are required and gate-checked for PRESENCE only, never for quality: `spectacle:` (the one
  loud moment, named: beat, layer, device, why) and `not:` (the defaults this film refuses).
- Fill `pace:` (showreel 1.5-4s/idea, explainer 3-8s, held 6s+), `threads:`/`object:` (what holds the
  film across its cuts), and per-beat `shot:`/`layout:`/`becomes:`/`trigger:`/`picture:`, then watch
  `make animatic SB=<file>` before writing any JSON.
- Enforced by `[gated: quality/gates/storyboard-check.mjs]` (presence of `spectacle:`/`not:`, plus
  `pace-not-chosen` and `timeline-hole`) and `[gated: quality/gates/plan-vs-render.mjs]` once a scene
  exists; `[ref: make panels]` / `[ref: make animatic]` draw what each field means but check nothing.
- Confirm: are `spectacle:` and `not:` both filled, and have you watched `make animatic` before
  writing any scene JSON?

<!--
  This is the STORYBOARD contract. Copy it, fill it, then run
  `make storyboard-check SB=<file>` and present it for sign-off BEFORE writing any scene JSON:
  open with "This video tells <audience> that <message>", then the beat table. Every beat states its
  JOB. A beat with no `why` is decoration. Reveal model: weight each cue into the back ~50% of its beat
  (the direction-floor's `front-loaded` check enforces the floor of this). No two beats move alike.

  WHAT HOLDS THE FILM. Under ~15s the gate requires you to NAME it in the frontmatter, and it takes
  PACE IS DECIDED BEFORE ANIMATION, NOT DISCOVERED DURING IT. "Pace is a genre decision made before
  animation work begins", and a showreel runs 1.5 to 4 seconds per IDEA. Ours is measured at 5.15
  seconds per shot against their 5.68, so the cut rate is not our problem: the problem is how many ideas
  are inside a shot. The film the owner rejected put three ideas in six seconds and read as frantic;
  brew gives one idea a whole beat and reads as confident. Write `pace:` first, in seconds per idea, and
  then let the beat count fall out of the runtime. A beat that carries two ideas is two beats or one
  cut, never one crowded frame.

  THE PEAK AND THE EXCLUSION, BOTH REQUIRED, BOTH PRESENCE-CHECKED ONLY. `spectacle:` names the one
  exaggerated moment: which beat, which layer, which device, what it is for. It is two-sided and that is
  the whole point: naming the peak is at the same time a promise that every other beat stays restrained,
  so a film that names none has not chosen restraint, it has chosen one flat volume for its whole runtime.
  `not:` names the defaults this film refuses. Most generic output is not a wrong decision, it is an
  un-excluded default: the centred type, the even grid, the fade on everything.

  `storyboard-check` FAILS a storyboard missing either line, and checks nothing else about them. It cannot
  tell a good peak from a bad one, and a check that pretended to would manufacture findings. Nothing grades
  the prose in `not:` at all, ever; the line exists so the decision gets made.

  BUT WRITING THE PEAK DOWN IS NOT BUILDING IT, exactly as with `becomes:` below. The film-side half is a
  scene block, `"spectacle": { "at", "of", "device", "why" }` (core/timeline/spectacle.js), which pulls every
  competing amplitude dial in the film down around `at`. `device` is either a shader sting name, written as a
  sting at `at` (injected, the engine's own gesture), or "<kind>:<name>" naming a cut, seam, kinetic preset,
  or another layer the film ALREADY builds (a ground change, a match cut, …): nothing is injected for those,
  the block only verifies the named mechanism is really there at `at`.
  `make plan-check D=<file>` reads this line and the scene together: it warns `spectacle-not-built` when
  the plan names a peak the JSON never builds, and `spectacle-in-wrong-beat` when the block's `at` lands
  outside the beat named here. So NAME THE BEAT in this line, as "beat 4" or by the beat's own title, or
  the two cannot be compared and the gate says so.

  `pace:` IS JOINED THE SAME WAY. `plan-check` lays the declared seconds-per-idea over the film's real
  runtime and warns `pace-not-kept` when the film gives its planned ideas more or fewer seconds than the
  budget. Keep exactly ONE of showreel · explainer · held: leave the template's menu of three in place and
  the gate warns `pace-not-chosen`, because reading the first word as your choice would invent a decision
  nobody made. The bands are showreel 1.5-4s per idea, explainer 3-8s, held 6s and up; an explicit budget
  written into the line ("2.5s per idea") wins over the band. It counts the PLAN's ideas against the
  RENDER's clock, so it catches a film that grew past its budget and cannot see two ideas crowded into one
  beat. That one is yours.

  DECODE THE REFERENCE INTO A TABLE, IN THIS FILE. A film with a reference gets a
  `### Reference devices` section (a `###`, so it is not parsed as a beat): one row per device, what it
  is, and which beat uses it or why it was refused. Without it a study lives in whoever did it, and the
  first pass at one film here took three of its reference's twelve moves with nobody able to see which
  nine were missing (engine-doctrine/MISTAKES.md #599). Keep a dropped device's row and strike it: refusing a
  device is a decision, and an absent row reads as an oversight. Each beat's `borrows:` then names the
  ids it uses. `make studio D=<film>.json` renders the table beside the spine.

  THE PICTURE'S OWN DECISIONS, AND WHY THEY ARE CLOSED LISTS. `picture:` and `style:` are prose, and
  prose is where the wrong object hides: a beat that described "a white pill bar with a round cobalt run
  button" passed every check while drawing an AI chat input into a film about a command line
  (engine-doctrine/MISTAKES.md #596). Three fields fix that, and all three are checkable BECAUSE they are closed.

  `archetype:` is the composition, one of: centred · split · hero-object · asymmetric-baseline ·
  full-bleed-row · symmetric-pair · lockup, or `other (what it is)` with the reason travelling with it.
  Closed so that "no archetype twice in a row" is a gate rather than a hope, and two beats running with
  one composition is the flat film: nothing about the cut between them reads as a change.

  `weight:` is peak · strong · quiet, and EXACTLY ONE beat in a film is the peak. This is `spectacle:`
  made per beat: the one loud moment, carried by motion, contrast or a camera move, not a size to
  measure. Fast motion legitimately shows a small object for a few frames.

  `borrows:` is `<their device> -> <our object>`, required whenever a reference is in play. Writing that
  arrow is the whole point: a shape copied without its role is how a chat input ends up in a film about
  a command line, because their hero object is a chat box for a reason that is not ours. A `borrows:`
  line with no right-hand side FAILS.

  PROSE IS RIGHT FOR JUDGEMENT. STRUCTURE IS RIGHT FOR DECISIONS. This is the line the whole storyboard
  format sits on, and it is worth stating in as many words because the failure on the other side of it
  is real: structuring the judgement too produces checkbox films and an author who stops thinking.
  `why` a beat exists, `arc`, `attention`, `not:` STAY PROSE FOREVER. They are reasoning, and a dropdown
  cannot hold a reason: "why does this beat belong here" and "what does this film refuse to do" have no
  finite answer set, and forcing one would not check the decision, it would erase it. What is allowed to
  become structured is a CHOICE FROM A KNOWN SET that the engine already has a name for: the ground a
  beat sits on, the kinetic preset its type uses, the layer types it puts on screen, what a transition
  does to ground value across a join. Structuring one of THOSE loses nothing, because the set of real
  answers was always closed, whether or not the storyboard admitted it; prose there was never judgement,
  it was an unchecked guess wearing judgement's clothes. If a future field cannot name a finite legal
  set the engine actually has, it belongs on the prose side of this line, not this one.

  THE DECISIONS FROM A CLOSED, ENGINE-OWNED SET. Measured across 232 beats: not one declared a colour, a
  ground, a transition's effect on value, an animation preset, or the elements it puts on screen. Every
  decision that determines how a film LOOKS was invented by whoever authored the JSON, off nothing the
  plan wrote down. Four fields close that gap, each OPTIONAL and each validated against the exact
  registry the engine already keeps (harness/lib/contract.mjs groundErrors/kineticErrors/
  elementsErrors/transitionValueErrors): an unknown value is refused NAMING every legal one, the way
  harness/lib/judge-codes.mjs already refuses an unknown judge code.

  `ground:` the background preset this beat sits on, one of the 23 names in
  core/backgrounds/presets.js (`ground: aurora`). `kinetic:` the kinetic preset (+ an optional
  `split=word|char|line`) the beat's type layer uses, one of the 33 in core/kinetic/presets.js
  (`kinetic: weight split=word`). `elements:` the layer types this beat puts on screen, `;`-separated,
  from the 24 real types in core/layers/index.js (`elements: rect;text`). ONE OWNER PER FACT: all three
  kinds were already reachable through the general `use:` door (harness/lib/contract.mjs
  USE_DEDICATED_FIELD), and a `use:` line naming one of them is now REFUSED, pointing here, the same way
  a camera move written through `use:` is refused toward `camera:`. A ground or a kinetic preset has
  exactly one field to be written on, never two spellings of the same fact.

  `transition_value:` sits beside `transition_in:`/`transition_why:` and answers the question neither
  does: what this boundary does to ground VALUE, one of `dark->light` · `light->dark` · `held`. Nothing
  declared this before the render existed: `quality/gates/ground-arc.mjs` could only measure a flip
  AFTER the film was built. The set is exactly what `ground-arc.mjs` itself classifies a frame into, so
  a declared value and a measured one are directly comparable: `quality/gates/plan-vs-render.mjs` warns
  `ground-value-mismatch` when they disagree, naming both the declaration and the measurement, and never
  claims more than that (its own stated restraint: presence of a disagreement, not a taste judgement
  about which side is right). Declare it deliberately: the owner's own film flips value exactly once,
  on purpose, and that flip is its spectacle. A film that flips four times by accident should be able to
  see that on paper, before the render, not discover it in extracted frames after.

  ALL FOUR ARE OPTIONAL, AND ADOPTION RIDES A RATCHET, NOT A REQUIREMENT. 44 storyboards existed before
  these fields did; a required field would have invalidated every one of them at once.
  `make storyboard-decide-ratchet` counts how many beats across the whole corpus declare NONE of the
  four and fails only on an INCREASE from the stamped baseline (harness/dev/
  storyboard-decide-ratchet.json, kept outside quality/baselines/ because this ratchet is adoption-only
  and never load-bearing on a push), exactly as `quality/gates/output-contract.mjs` and
  `quality/gates/no-judge.mjs` already ratchet a count down rather than demanding it hit zero at once.
  Nothing bulk-fills the 232 existing beats: a declared value nobody actually decided is worse than an
  absent one, because it LOOKS like a decision.

  `ramp:` sits in the frontmatter and names the kit type roles the film uses, once. Seven frames that
  each invent their own scale are seven films; before this field existed one film carried eight sizes
  across seven fragments.

  LAYOUT IS A BEAT DECISION, NOT A LAYER DECISION. Their beat formula has five slots, Element · Motion ·
  Layout · Style · Timing, and ours had no Layout: composition was decided per layer at JSON time and
  never at beat time, so a plan could be approved without anyone saying WHERE anything sits. `layout:`
  asks for a coarse region and how much of the frame it fills ("filling the lower half", "top-left
  against the UI"), never coordinates. That is the level a reviewer can actually approve.

  `layout:` IS NOW DRAWN. `make panels SB=<this file>` reads the line, tints the region it names inside
  the panel frame, and sizes or centres the subject box against it, so a beat that says "the UI fills
  the lower two thirds" stops being drawn as a medium box dead centre. What it reads: halves, thirds,
  two-thirds and quarters ("lower half", "middle third", "top-left"), plus a stated share ("60% of frame
  width", "8% of the frame"). It reads the FIRST region you name, it ignores any clause that says a
  region is EMPTY ("the lower half deliberately empty" places nothing), and it treats "full-bleed" as a
  fallback so a narrower region named beside it wins. A line it cannot read is named in the report as
  unread, never quietly centred. Say WHERE and HOW MUCH: a line that says only where leaves the mass of
  the panel to `shot:`, and the panel says so.
  When the two disagree, the panel draws `layout:`, because a region is the more specific statement, and
  the report names the disagreement. It is worth settling: an "extreme wide" beat whose type fills the
  middle third is two different beats written on one card.
  THE ARITHMETIC. Measuring a picture's SIZE is what killed the `visual-vocabulary` gate, whose helper
  squared a 590x18 rule into 590x590 and credited a hairline with a tenth of the frame. Area is width
  times height and nothing else, and a share stated on ONE axis stays on that axis and produces no area
  at all. `node harness/author/panels.mjs --self-test` asserts both against that same hairline.

  EVERY BEAT DECLARES ITS STYLE AND ITS REST. Be clear about what reads which, because a field nobody
  reads is worse than no field. `rest:` is consumed. `layout:` is consumed by `make panels`, as above,
  and by nothing else: no gate and no renderer compares it against the film, so writing the region down
  is not building it. `style:` is consumed by `make panels` as WORDS ONLY. It is carried onto the panel
  and listed beat by beat under the report, where five beats declaring one treatment is visible at a
  glance. It is NOT drawn, and it must not be: panels are grey on purpose and the look is judged at
  `make styleframes`. Nothing anywhere grades the prose in either line.
  `style:` is the visual treatment for THIS beat, the slot the reference system's beat formula has
  (Element · Motion · Layout · Style · Timing) and ours did not. Without it, style is decided once for
  the whole film and every beat inherits it, which is how a film ends up looking like one long shot.
  `rest:` says what moves during the HOLD, IN PROSE. Their films are near-static 41% of the runtime
  against our 20%, and that is not stillness, it is authored idle: "Nothing ever fully stops. Every hold
  carries a little ambient idle motion, a 1-2% breathing scale, a slow drift." We had a gate that BLOCKS
  a held frame (`dead-air`) and nothing on the other side, so the cheap answer was always more motion
  rather than better motion. `rest: none` is a legal answer and it is the right one on the spectacle
  beat. `rest:` stays narration only, nothing builds it: when a hold really should breathe or drift, say
  so where it reaches the engine, `move: hold:<idle>` (THE MOVE, below), on the same beat.

    THE OBJECT'S POSE, NOT ONLY ITS POSITION. `object_in`/`object_out` say where the ONE continuous
  object is: `<placement>@<w>x<h>`, a safe-area PLACEMENT name (never a raw pixel) and its size in px.
  Two MORE fields ride the same edge, both optional and both trailing after a `/`: `/rot:<deg>` (the
  object's rotation at that edge) and `/op:<0-1>` (its opacity), e.g.
  `object_out: center@40x26/rot:15/op:0.4`. This is a POSE, not just a spot: the film this repo holds up
  as its best (higgsfield-recreation) has an object that holds a constant bbox area while it travels
  (already `w`x`h`), spins into its fastest frame and rights itself on landing (`rot`), and fades its
  label out as it goes (`op`). `make assemble` keys all four (x, y, w, h, rot, opacity are all properties
  `layers[].motion[]` already takes) into the SAME motion track the plain position form always built, so
  a film that never states a pose builds the exact track it always did. A stated pose is part of the
  contract exactly like placement already is: `make contract` refuses a beat whose pose does not match
  the one it hands off to, named on both sides, same as a placement mismatch.
  What this still cannot say: a shape morph (a rectangle becoming a pill becoming a circle) needs a
  keyable corner radius the engine does not have yet; reach for `morph` (character/path melt, one layer)
  or `becomes` (hand a pose to a DIFFERENT layer id, engine-doctrine/CRAFT/KEYED-MOTION.md) directly on a layer for
  that, the way 1 and 9 films in this library already do.

    THE MOTION PLAN. `motion:` says what ELSE moves in this beat, beyond the one continuous object above,
  so a fragment author is told what has to move BEFORE writing the markup rather than inventing entrances
  after. One or more `;`-separated entries,
  `<selector>@<kind>:<inBand>[/<outBand>]`: `<selector>` is a CSS selector into the fragment's own
  markup (`[data-part="headline"]`, `.card`), the SAME selector a hand-authored `parts[].select`
  already takes (core/motion/parts.js); `<kind>` is one of the engine's named part entrances (growUp,
  fadeUp, riseIn, drawOn, fade, slide-left, slide-right, popIn, widen); `<inBand>`/`<outBand>` are the
  four named speed bands this repo already has (engine-doctrine/RULES/speed-bands.md: energy, professional,
  gravity, cinematic), reused rather than invented so a beat's motion speaks the same words a duration
  decision already speaks. `<outBand>` defaults to `<inBand>`. THIS is the boundary velocity a
  content-aware cut (core/timeline/velocity-cut.js) hunts for: a fast (short) exit band lands the next
  cut on a picture already moving, which is the strongest signal that gate reads. `make assemble`
  builds every entry into `parts[]` on that beat's own scene layer, the same vocabulary a hand-authored
  parts block already takes, so this is not a second motion mechanism, it is the storyboard filling in
  the one the engine already has. Optional, and delete the line if nothing but the continuous object
  moves in a beat.

    THE MOVE. `motion:` above is always a one-shot ENTRANCE: an element arrives and lands, and the frame
  is still again the moment it does. Measured across four swept axes (engine-doctrine/MISTAKES.md #610), that is
  why films read as slideshows: more entrances, spread further apart, travelling further, all change
  WHEN the stillness happens and never WHETHER it does. `move:` is the one field for everything that
  keeps a beat moving beyond a one-shot entrance, and it reads its SCOPE off the entry, not off which
  field it is written on (harness/lib/contract.mjs `parseMoveEntry`):
    - `<shape>:<band>` (no `@`)         the beat's own LAYER: a keyed track that never stops moving for
      the whole beat. A `SHAPES` key (`core/motion/shapes.js`, `make arsenal SHAPE=pan`) and a speed
      band, the same four words (`energy`, `professional`, `gravity`, `cinematic`) `motion:`'s bands
      already use. `move: pan:cinematic` on the headline beat, `move: drift:gravity` on a held one. The
      band scales how FAR/BIG the shape's own measured move is, `professional` reproducing it untouched;
      it never scales duration, the track always spans the WHOLE beat.
    - `<selector>@<kind>:<band>[/<outBand>]`   the SAME grammar `motion:` above takes, just written on
      this field instead: a part entrance on one element. A beat can use either field, or both.
    - `hold:<idle>`                     the beat's own LAYER keeps living through the hold: sets `idle`
      (`core/engine/idle.js`: `breathe`, `drift`), the field `rest:` below can only narrate.
  `;`-separated for more than one entry. Optional, and a beat with no `move:` assembles exactly as it
  did before this field existed.

    `use:` IS THE GENERAL DOOR onto everything the engine can name (55 registries, 790 entries across
  62 kinds, the same corpus `make arsenal Q="…"` searches): a background preset, a kinetic preset, a
  look/filter, an ambient shader or glow preset, a caption style, an energy, a modifier, a motion voice
  cue, and more (`make arsenal --census` lists every kind). A beat may write several:
    `use: <name> [on=<layer id>] [key=value …]`
    `use: <kind>:<name> [on=<layer id>] [key=value …]`   when a bare name exists in more than one kind
      (`preset` alone collides across kinetic/glow/particles presets; write `use: kinetic preset:weight`
      to pick one). `on=` names the layer the write lands on; a beat with exactly one layer of its own
      (its `scene<N>` fragment) defaults to it, so `on=` is only needed to aim at a different layer.
    Resolution (`harness/lib/contract.mjs` `parseUseLine`/`resolveUse`): an exact name (or a registry's
  own `aka`) in exactly one kind resolves and is written by scope (a per-layer prop, a `bg[]` window
  spanning the beat, an `audio.cues[]` entry at the beat's start, or a film-level field decided once).
  An ambiguous name is an ERROR listing every `kind:name` choice. A decisive-looking but unknown token
  is an ERROR naming the nearest real names. Free prose is a WARNING, never silently dropped, naming
  the 3 best-ranked entries as ready `use:` lines.
    A KIND WITH ITS OWN FIELD IS REFUSED, NOT A SECOND SPELLING OF IT: a camera move or camera word
  belongs on `camera:`; a cut, a seam fx, a sting fx, or a cut timing belongs on `transition_in:`; a
  move shape or a path curve belongs on `move:`; a part entrance belongs on `motion:`; an idle belongs
  on `move: hold:<idle>`; a recipe belongs on `recipe:`. Each is refused naming the field to use instead.
  ENGINE INTERNALS ARE ALSO REFUSED, never authored from a storyboard: a generator, an envelope
  shape/anchor, field motion, a lightfield pattern, a shadow direction, an effector drive/falloff, a
  keyframe handle, an interpolation mode, a scramble charset, a theme look key, and a ransom face list
  (`ransom.faces`, a list of records, not a single name) each name the doc or field that actually sets
  them.

    `fragment:` IS OPTIONAL, AND BOTH ITS HALVES ARE. `make assemble`'s own convention
  (`<film>.scene<N>.html`) is unchanged when this line is unset. Two forms, either half omittable:
  `fragment: _together.card.html @ center@900x520` names the file AND boxes it; `fragment:
  _together.card.html` alone names the file, still full-bleed; `fragment: @ center@900x520` boxes the
  default file. The placement clause reuses `object_in`/`object_out`'s own grammar above
  (`<placement>@<w>x<h>`), never a second one to learn. TWO CONSECUTIVE BEATS NAMING THE SAME FILE keep
  ONE component alive across the cut instead of tearing it down and rebuilding it, which is the cheapest
  way to stop a shared panel reading as a slideshow. A placement change between them is keyed as that
  one layer's own `motion`, not a second layer. A beat built from native layers alone (an image + text
  pair, a solid card, nothing to author as HTML) writes `fragment: none` (optionally `, <reason>`); the
  stage, storyboard-check and frame-check all read this the same way and never ask for that file.

  either answer. `threads:` names the devices carrying this film from engine-doctrine/CRAFT/FILM-STRUCTURE.md, a
  match cut, a camera travel, a motif, a bookend, a metric cut rate, an unfinished sentence, an open
  question. Carry two, not one. `object:` is the one device the scene-side gate can also see: one noun
  stays on screen across the cuts and every cut is a state change of it. Declare `object:` only if that
  is really the film, because then `object_t0` / `object_states` / `object_last` and an `object:` line
  on every beat are required too, and the scene-side mirror is direction-floor's `no-continuous-object`
  (opt-in, `TASTE=1`). Doctrine for the object device: skills/vawe-continuous-action/SKILL.md.

  THE THIRD QUESTION, AND THE ONE NOTHING USED TO ASK. `trigger:` is WHAT MADE THIS BEAT HAPPEN.
  The act in the beat before that forced this one. "the cursor hits Send on the card in beat 1". It is
  not `becomes:` (what the thing turned into) and it is not `mechanism:` (how it moves), and the cheap
  answer to it is either of those two again. A film where every beat has a `becomes:` and no beat
  causes the next is a run of unrelated changes, which is the slideshow failure written on paper.
  OPTIONAL, AND IT WILL STAY OPTIONAL. Not every film has a causal spine: a manifesto, a vignette
  anthology and a metric-cut list film are held by something else and have no answer to "what caused
  beat 3". The gate never blocks on it. What it always prints is the CHAIN, one link per junction,
  every unstated link drawn as a break, and a count of fragments. It warns on `trigger-is-a-sequence`
  ("then", "next": that says when, not why), on `trigger-is-a-mechanism` ("it cuts to the next shot"),
  and on `chain-breaks` once some junctions state a cause and others do not. Full register, and what
  no static gate can see here: engine-doctrine/CRAFT/FILM-STRUCTURE.md Part 5.

  A DOCUMENTED CAUSE IS NOW A MECHANICAL STAGGER, not just a line in the chain report. `make assemble`
  reads the same "is this a real cause" test the gate does (harness/lib/contract.mjs isCausedTrigger)
  and, for every junction that passes it, INSERTS a small stagger of real time before the next beat
  (0.05s, resolved to its own real second, not carved out of either beat's planned duration) instead of
  firing every junction at the flat absolute second every junction used to, regardless of cause. 0.05s is
  evidence, not a guess: higgsfield-recreation stages its own three key events roughly 30ms and 150ms
  apart. An UNSTATED junction is left exactly as it was: staging a cause the storyboard never wrote down
  would be inventing one, not reading one off it. (`layers[].start` also legally accepts a live relative
  reference, `"otherId.end+0.5"`, same for `transitions[].at` and `cameraMove[].start`; resolved to a
  real number at load by core/timeline/relative-time.js, so every gate reads a plain number already.
  A scene that also declares top-level `beats: [{id,start,duration}]` (written by `make assemble` from
  this storyboard) gets the same grammar keyed to a BEAT instead of a layer, `"beat:<id>.start"` /
  `"beat:<id>.end"` plus an optional offset, legal on every field above PLUS a bg window's `from`/`to`.)

  TWO MORE FIELDS, TWO MORE QUESTIONS. `mechanism:` is HOW it moves (count-up, slow push, kinetic reveal).
  `becomes:` is WHAT IT TURNED INTO, written as "the X becomes the Y". A preset name answers the
  first question and never the second: "fade · slide · zoom" says nothing changed, only that
  something travelled. Under 15s the gate FAILS a beat with no `becomes:`, and warns when the value
  is animation vocabulary with no change-verb in it.

  WHAT `becomes:` IS ACTUALLY WORTH. We tested it: two 12s films from one brief, one storyboarded
  with `becomes:` on every beat, one without. A blind judge picked the film WITHOUT it. That film
  carried more demonstrations (7 against 4) and more information per second, and both films changed
  their object the same way (a crossfade inside a fixed box), so the field bought no technique.
  Then the sharp part: the losing film's worst defect is a stretch in the middle where the frame does
  not move at all, and its storyboard carries a correct `becomes:` on that exact beat. The author
  wrote the change down and did not build it, and every gate stayed green.

  So keep the field and hold it to its real job. It feeds the intent sidecar, and it lets a failure
  name what was supposed to happen. It does not make a film better, and a storyboard full of them is
  not evidence about anything but the storyboard. Writing the change down is not building it. The
  gate that checks the film is `make plan-check D=<file>` (quality/gates/plan-vs-render.mjs): it lays
  these beat spans over the render's clock and fails a junction the plan promised and the JSON left
  empty. Run it, and read what it says about the beats you were surest of.

  THE SHOT, THE CAMERA, AND THE TWO CHANNELS. Professional storyboard panels carry shot size, angle,
  camera movement, action, dialogue, duration and narrative purpose. This template had purpose (which
  most do not) and no shot vocabulary at all, which was a strange gap: the ENGINE already implements
  the camera (`slowPush · diveIn · panFollow · workspaceZoomOut · orbit · multiPhase`,
  core/camera-moves/index.js), so the plan simply did not speak the language the renderer already had, and
  camera work got invented at JSON time or not at all. Name `shot:` and `camera:` per beat.

  `shot:` NOW DRAWS SOMETHING, so it is worth filling in properly. `make panels SB=<this file>` renders
  one rough grey still per beat, and `shot:` sizes the subject box in it: a wide leaves the frame mostly
  empty, a close fills it. A beat with no `shot:` is drawn as a medium and named in the warnings, which
  makes the omission visible rather than average. Placement words inside `shot:` or `picture:` are read
  too ("on the left", "the lower third"), and a beat that names none gets a centred box labelled as
  this tool's guess. So state the shot, and if the frame divides, say which side the subject is on.

  `picture:` is the other half, and it is the one that matters most here. Short-form advertising
  research is blunt about it: the visual and copy channels must carry a beat SIMULTANEOUSLY, not
  sequentially, because that is the only way to fit a whole beat into three seconds. A beat with copy
  and no picture is one channel doing all the work in series. That is not a style preference, it is
  the mechanical reason 29 films in this library used to waive the deleted show floor. State what the frame
  SHOWS, separately from what it SAYS, and if you cannot, you have found the beat's real problem while
  it is still a line of markdown.

  THE TIMES ARE READ NOW. The `(0s-1.53s)` range in each heading is parsed. A gap between two beats,
  or a last beat that stops short of the frontmatter `duration`, fails as `timeline-hole`.
  THEN PLAY IT: `make animatic SB=<this file>`. A storyboard shows WHAT happens; an animatic shows
  whether the things you planned have the TIME to happen, which is the one question no amount of
  re-reading the plan can answer and the one this repo keeps getting wrong. It renders grey slots and
  your real copy at your real durations, deliberately ugly so that pacing is the only thing left to
  judge. Beats that named no `picture:` show up as empty labelled boxes. Watch it before you write a
  line of scene JSON. `storyboard-check` grades the plan against itself; the animatic grades it
  against a clock.

  Field reference: engine-doctrine/CRAFT/FRAME-SPEC.md. Effects to name: engine-doctrine/EFFECTS.md. Shot shapes: make arsenal Q="…".
-->

## Beat 1: Hook (0s-6s)
- type: hook
- archetype: centred
- weight: quiet
- object: not born yet. The stage is being cleared for it.
- shot: wide (establishing, the frame is mostly empty)
- camera: slowPush
- picture: the empty stage with one hairline rule where the number will land
- blueprint: kineticHook (Adapt: keep the open-loop question; change the hero word to the brand's stat)
- onscreen: "the strong first line" / "the second cue, revealed later"
- motion: [data-part="headline"]@slide-left:energy
- mechanism: count-up · kinetic word reveal · slow-push camera
- becomes: the bare stage becomes a question, and the question becomes a number climbing toward it
- trigger: nothing yet. This beat opens the film, so its cause is the question it asks
- layout: type in the middle third, the rest of the frame deliberately empty
- style: hard contrast, one colour, type is the only object
- rest: 1.5% breathing scale on the headline through the hold
- why: open loop, pose the question the payoff answers (curiosity before any claim)
- duration: 6s
- transition_in: cut

## Beat 2: Build (6s-12s)
- type: product_intro
- object: it arrives, in its resting state
- shot: medium (the object arrives and owns the middle third)
- camera: hold
- picture: the mark drawing on, stroke by stroke, at 40% of frame height
- blueprint: logoReveal (Adapt: mark draws on, wordmark cascades)
- onscreen: "what it is" / "the category line"
- mechanism: svg draw-on · glow flash · per-word reveal
- becomes: the number becomes the thing that produced it, and the drawn mark becomes the wordmark
- trigger: the count-up in beat 1 lands on its final figure and needs an author
- layout: mark centre, wordmark under it, lower half deliberately empty
- style: the brand ground arrives, mark at full weight, everything else muted
- rest: slow drift on the mark, 6px over the hold
- why: name the thing, give the hook a cause with a name
- duration: 6s
- transition_in: fx:zoom

## Beat 3: Proof (12s-19s)
- type: feature_showcase
- object: acted on. It is doing the thing the claim asserts.
- blueprint: screenDive (Reproduce: dive into the real UI)
- onscreen: "the claim" / "the number that backs it"
- mechanism: diveIn camera · count-up · border-beam card
- becomes: the resting product becomes a product mid-use, and the empty field becomes a filled row
- trigger: the wordmark makes a claim, and a claim on screen demands the product doing it
- layout: the UI fills the lower two thirds, the claim sits top-left against it
- style: the real UI at full fidelity, chrome dimmed so the claim reads
- rest: 1% scale on the captured surface, nothing else moves
- why: show-don't-tell, the product doing the thing, not a slogan about it
- duration: 7s
- transition_in: fx:cinematicZoom

## Beat 4: Payoff (19s-25s)
- type: benefit_highlight
- archetype: hero-object
- weight: peak
- borrows: the reference's big centred statement -> our hero number, at the size the claim deserves
- object: transformed by that act into the result
- blueprint: statReveal (Adapt: the hero number the hook set up)
- onscreen: "the shocker line" / "the payoff figure"
- mechanism: hero count-up · kinetic label · a single accent rule
- becomes: the filled row becomes the finished result, and the open loop becomes an answer
- trigger: the row in beat 3 finishes filling, so the result is now available to show
- layout: the number owns the centre at 60% of frame width
- style: the loudest frame of the film. THIS is the spectacle beat
- rest: none, the spectacle carries it
- why: land the counterintuitive result, pay off the open loop from Beat 1 (the bookend)
- duration: 6s
- transition_in: fx:dissolve

## Beat 5: CTA (25s-29s)
- type: cta
- object: held on the last frame, still the same thing you watched change
- blueprint: ctaEnd (held to the last frame)
- onscreen: "the action" / "the url" / "the offer"
- mechanism: mark pop · install chip · held still (no exit)
- becomes: the result becomes an address you can type, and the mark becomes the last frame
- trigger: the viewer has the result and nothing left to wait for
- layout: mark and url stacked centre, generous margin on all four sides
- style: quiet, one line, the mark and nothing competing
- rest: 1% breathe on the mark only
- why: one clear next step; remove the risk
- duration: 4s
- transition_in: fx:zoom

### Budget the demonstrations, not just the claims

<!-- Guidance, not a beat. It stays a `###` so the gate does not parse it as one. Delete it when you
     copy this file. -->

Go through the film a second at a time and label what a first-time viewer learns in each one. There
are only four labels. A NEW-FACT is a claim. A NEW-STATE is the same object, changed. A RE-STATE
says again what was already said. DECORATION carries nothing.

Do this by hand, on your own film, and hold the result loosely. We ran it on our three recreations
against the reference they copy, and it read them as landing claims at about the reference's rate
and changes at roughly two thirds of it. That matches what the films look like. It is also a
judgement call about every single second, so treat it as a way of looking rather than a score. When
we checked the sharper conclusions drawn from that same pass, two of them were wrong: the "dead
tail" was the window being longer than the film, and the "ends on a claim" was a line that lands in
the last beat next to a real change.

**One finding did survive, because frames were pulled and looked at.** From 5.0s to 7.0s all three
of ours change nothing but the backdrop, and at 6.5s two of them are a black plate with a single
dot on it. The reference's emptiest second still has the carried object turning in frame. That hole
is now a blocking gate (`dead-air`, MISTAKES #165). It went unseen for a whole render cycle because
the gate asked whether a layer window was open, not whether anything was in the frame.

The lesson is the method, not the numbers. A count over a whole film is a hypothesis. Pull the
frame and look at it before you believe any of it, or write it down.

So budget both. A claim is a sentence. A demonstration is a state-change. **If a beat names a
capability and no state-change sits under it, cut the beat or add the change.** And count the film
backwards from its payoff, so you do not spend your seconds before you reach the thing you promised.

**The background is decoration. It is never information.** It is on screen for all 15 seconds of
the reference and carries none of them. A beat whose only change is the backdrop has changed
nothing.
