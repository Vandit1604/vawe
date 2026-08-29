# CLAUDE.md: authoring videos for this engine

This repo turns **one self-describing JSON → one rendered video** (30fps mp4, at any of **five**
canvases: `16:9` 1920×1080 · `9:16` 1080×1920 · `1:1` 1080×1080 · `4:5` 1080×1350 · `4:3` 1440×1080,
the table at `core/safe.js:35`; a ratio it does not name is still honoured, sized to fit the long edge
at 1920). There is exactly **one module: `scene`**, an open canvas of **18 composable layer types**
(`ls core/layers/`: beam · board · canvas · clip · component · composition · count · cursor · doc ·
glow · group · html · image · lottie · rect · svg · text · video) plus camera · cuts · stings ·
captions. `html` counts as a picture, and that matters: it is what makes brew's 46% further down.
**No templates.** You do not pour data into a canned layout; you compose each video from the vocabulary in
`docs/PRIMITIVES.md`. Your job when asked to "make a video about X" is to **write a scene JSON**
(and capture the real assets it needs), then render it. You do **not** edit `scene.html` or the Go
renderer unless explicitly asked.

> **Reflecting a brand/website?** `make sections` + `make palette` (eyedrop) builds the colours pack + fonts +
> favicon; `make sections URL=… NAME=…` inventories every real section to reflect. Design knowledge
> lives in **`docs/DESIGN-DATABASE.md`**; the primitive vocabulary in **`docs/PRIMITIVES.md`**; motion
> rules in **`docs/MOTION-CRAFT.md`**. **Use ONLY the site's colours** and respect dominance
> (white-first vs dark).

## The loop

Three targets, and you will spend nearly all of your time in the first two. They are named nowhere else
in this file, so read them here.

```bash
make list                       # shows the scene module + its schema/sample
make dev   D=path/to/video.json # THE ITERATION LOOP. Build, draft-render, open. No gates, no audit.
make studio D=path/to/video.json # the same scene with a frame scrubber + a timeline. Edit, reload, watch.
make check D=path/to/video.json # every gate, every finding, ZERO consequence. Nothing blocks.
make ship  D=path/to/video.json # the ladder with its teeth in: author-check → render → audit → seams.
```

`make ship` is the one command that says a film is done: author-check, render, audit, seams, in order.
It DECLARES its own ladder before it runs, so what each step reads and whether it can stop you is
printed by the thing that does it, not restated here. Start at `make preflight D=<file>`, though: the
decisions that belong before the JSON are the ones this file kept mis-ordering.

Single-shot forms, when you want one thing and not the ladder:

```bash
./bin/vawe path/to/video.json          # module read from JSON → out/<name>.mp4  (--draft = fast, no grain)
make video D=path/to/video.json        # author-check → render → audit. NOCHECK=1 / NOAUDIT=1 skip a half.
```

`make video` already runs `make audit` for you (`Makefile:149`) unless `NOAUDIT=1`. `MODE=iterate`
(`Makefile:163`, what `make check` sets) is the see-everything-block-on-nothing mode.

Every JSON **must** start with `"module": "scene"`. Save new videos as
`formats/scene/<topic>.json` (siblings of `sample.json`). Always read `sample.json` and an existing
video (e.g. `linear-launch.json`) first as working references, then compose, never copy a structure wholesale
(that would re-introduce a template; the ledger flags it).

> **Planning any fan-out? Read [`docs/CRAFT/SUBAGENT-BUDGET.md`](docs/CRAFT/SUBAGENT-BUDGET.md) first.**
> It carries the measured cost of a real run here (87 agents, 5.66M tokens, 65k for each agent) and the
> rules that follow from it: fewer and larger agents, batches of 5 to 10, file contents in the prompt,
> never two agents on the same files, always a structured schema. One agent with a better prompt beats a
> fan-out for sequential work, and costs less.

> **Shipping a real video? USE DEDICATED SUBAGENTS.** Authoring well needs several different kinds of
> judgement, and one agent doing all of them in one context does all of them worse: it grades its own
> work, and its reading of six sheets crowds out the room to fix anything. Give each critic ONE job, ONE
> input path and a fixed verdict shape, and launch them in PARALLEL in a single message. Critics report,
> the main thread fixes; a critic is evidence, never a ruling. The standing roster (beat · bg-motion ·
> reveal · fidelity · copy · seam) is **[`docs/CRAFT/SUBAGENTS.md`](docs/CRAFT/SUBAGENTS.md)**. Overkill for
> a one-line tweak; required for a full pass, a recreation, or anything you intend to ship.

> **Making something good?** Read **[`docs/TASTE.md`](docs/TASTE.md)** first, the front door to the
> taste system (house-style · composition · motion · story-spine), the block registry (`make catalog`),
> and the author→gate→render quality loop. Everything below is the doctrine it indexes.

## "LET'S MAKE A VIDEO" IS A REQUEST TO ASK QUESTIONS, NOT A REQUEST TO START

**Load `vawe-video-planning` and follow it. Do not open a JSON file first.** The skill exists because
authoring without a locked plan produces the same generic video for everyone, and it states the contract
in one line: *nothing is rendered until the plan is LOCKED and the user signs off*, and *if you find
yourself trying things in the JSON, the plan wasn't locked*.

That is written here rather than left to the skill because the failure it prevents is a failure of the
FIRST MOVE, and by the time you have opened the scene file you have already made it. It has happened:
a launch film went eight renders deep with the requester watching each one, because a storyboard was
written, the LOCK SHEET was skipped, and the JSON became the place decisions got made. Every render
after that was exploration performed in public.

**Four questions belong to the requester and one of them is the one that gets skipped.** Audience,
payoff and feeling are easy to remember to ask. The one that decides whether the film looks like
anything is the STYLE ANCHOR: a real site to study, or a named reference to manufacture one from. Skip
it and "cinematic" becomes your guess at cinematic, which is a dark gradient and some type.

**The lock sheet is the artefact, not the storyboard.** Per-beat copy in exact words, the theme's
colours and fonts, the layout archetype, the coordinate band, the treatment per beat, the motion
personality, the cuts, the CTA. Present it and WAIT. Then authoring is transcription, and a render is
something you show once rather than something you iterate in front of somebody.

## THE BRIEF: what the person asking is allowed to say, and what is YOUR job

The person asking for a film should never have to name a colour, an easing, a layer type or a preset.
If they find themselves reaching for one, that is your failure, not their prompt. Their whole request is
five lines, and any of them may be missing:

```
SUBJECT   what it is about, in one line
DATA      where the facts come from (a URL, a file, an API, or "here they are")
PAYOFF    the one thing to remember, and it lands LAST
AUDIENCE  who watches, and where they see it
FEELING   one reference, or one word ("brew act 1", "cinematic", "loud")
```

**Everything else is yours to decide and defend:** palette, typography, layout, motion, camera, cuts,
backdrop, sound, pacing, structure. If a missing field would change the film, ASK BEFORE BUILDING, not
after: one small forced-choice question with real consequences beats a rebuild.

**Two more lines, and they are YOURS to fill, not theirs to supply.** Write them into the storyboard
before you author, every time, even when the requester says nothing about either:

```
SPECTACLE  the ONE exaggerated moment, named: which beat, which layer, which device
NOT        what this film explicitly does not do (no narration, no stock photos, no gradient hero)
```

Both are borrowed from the reference system whose films measurably read better than ours, where every
worked example ends with a spectacle clause and every one carries an exclusion line. The spectacle line
is TWO-SIDED and that is the whole point: naming the loud moment is also a promise that **every other
beat stays restrained**. A film where four beats shout has no loud moment, it has a volume setting.
`effect-soup` and `plain-slideshow` gate the two extremes and neither asks you to NOMINATE the peak,
which is why a film can sit safely between them and still be shapeless.

The `NOT` line is cheaper than it looks. Most generic output is not a wrong decision, it is an
un-excluded default: nothing said "no gradient hero", so a gradient hero was free.

**And DO NOT hand-author a film from a blank JSON.** That is the #1 failure, and `make arsenal` exists for it,
and it has been committed here: a 28s film of 31 hand-written layers, 74% of them text, `anim:"fade"`
on nearly every one, one backdrop window for the whole runtime, and one hand-keyed motion track. It was
rejected twice by the person who asked for it, and it was not below the house standard, the library
median is **8% picture and 0% hand-keyed motion**, so it was AT it. Compose from `make blueprints`.
Measured against the two films this repo is proudest of. **Every cell is a percentage of that film's
top-level layers**, because the row below used to mix counts and percentages and read as nonsense
either way:

| | brew-launch-act1 | higgsfield-recreation | that film | library median |
|---|---|---|---|---|
| pictorial LAYERS (see the warning below) | 46% (16/35) | 38% (3/8) | 3% (unverified) | **6%** |
| layers with a hand-keyed `motion` track | 11% (4/35) | **75%** (6/8) | 10% (unverified) | **0%** |
| `bg` windows | **6** in 19.6s, bound to `cut@0..cut@3` | 1 in 5s | 1 in 28s | 1 in 84% of films |

**The population, named once so every figure here can be re-run.** "The library" means the **134
gate-visible scenes** the gates themselves reason over: `formats/scene/*.json` with `module=="scene"`,
minus derivatives and `schema.json`, `_`-prefixed scratch included. `node scripts/gates/waiver-drift.mjs`
prints that count on its first line, so it is one command away and it is the number to quote. Three
other populations exist (98 without scratch, 154 raw files in the directory) and mixing them is how this
file once cited 93, 130 and 144 as the size of the same library in three sentences. **"that film" is not
named anywhere and I could not identify it, so its two cells are unverified and marked so.**

**A FRESH CLONE SEES A THIRD OF 134, AND NOTHING IS BROKEN.** Films are gitignored on purpose
(`.gitignore:61`: a video instance is not the framework), with an allowlist for the handful the site
needs. So `waiver-drift.mjs` prints `WAIVER CENSUS · 134 scenes` on this machine and about a third of
that on a clean checkout, and EVERY census in this file behaves the same way. If your count is smaller,
the gates are fine and the number here is not stale: you are looking at a smaller library.

Say the cost plainly, because it is real. **The two films this file argues from,
`brew-launch-act1` and `higgsfield-recreation`, do not ship.** They are recreations of other companies'
sites, carrying captured UI and real brand marks, and publishing those is the thing the asset rules two
sections down already forbid. So the strongest claims here are measured against work a contributor
cannot open, and that is a deliberate trade, not an oversight. Treat the percentages as the direction
to author in, and re-derive any number you intend to QUOTE against the library you actually have.

The backdrop line is the strongest single lever: brew inverts the whole tone of the world on four of its
five cuts and spends its one accent window on the logo reveal. A pictorial beat on a dead backdrop is
still a slide.

> **THE 46% IS A COUNT OF LAYERS AND IT IS NOT WHAT IT SOUNDS LIKE.** brew carries **35** layers: 13
> text, 11 image, 5 rect, 5 html, 1 count. The 46% is 16 of 35 with `html` counted as pictorial. (An
> earlier attempt to correct this line said "11 image layers of 30" and was wrong twice over, which is
> the hazard exactly: a number in this file gets quoted downstream faster than it gets checked.)
> higgsfield's 38% is 3 of 8, and every one of those three is `html`: it has NO image layers at all.
> Measured by the share of the FRAME carrying real pictorial detail, brew was **10.3%, the lowest of nine
> films compared**, against 23.8% for the reference films and 20.6% for ours. **THAT AREA FIGURE CANNOT
> BE RE-RUN TODAY.** It came from a one-off comparison, and the only tool that ever measured layer area
> was `visual-vocabulary`, which was deleted for measuring it wrongly. Nothing in the repo measures area
> now, so treat 10.3% as a recorded observation, not a live metric, and do not quote it as one.
> Eleven small marks is still not a picture. This is the same layer-count-versus-area
> error that killed the `visual-vocabulary` gate, whose size helper squared a 590x18 rule into 590x590
> and credited a hairline with a tenth of the frame (`docs/TASTE.md`). Read the row above as "brew
> places many pictorial ELEMENTS", never as "brew's frame is half picture", and when you want the second
> thing, measure area.

## Content philosophy (what makes these good: follow it)

Every video is built on **hook → suspense → payoff**. The data must earn attention:

- **Never spoil the payoff.** The hook poses a question / open loop; the answer lands at the end.
- **Build to a shocker.** Order beats so the most counterintuitive, "no way" moment is last.
- **Be honest.** The on-screen copy must be true. No clickbait the video can't pay off.
- **Stakes + a human line.** A surprising, specific fact beats a dry number.
- **Numbers:** use real, accurate figures. The `count` layer compacts ≥1e6 (`2500000000` → `2.5B`);
  use a unit suffix for small numbers (`unit: "$B"`, value `880` → `$880B`).

## Hard rules
- **No em-dashes (U+2014) in any on-screen text**: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- Text may contain `<b>…</b>` / `<em>…</em>` (rendered as HTML). Keep names short (they sit in cards).

## Launch-video rules (standing, asked for directly: apply to every launch film)

1. **Check EVERY page, not the homepage.** `make sections` inventories one URL. Crawl the whole site
   (routes, view modes, empty states) before storyboarding. Tpot's real product turned out to be
   `/dir` with its LIST/CARD/BUBBLE toggle, which the homepage never shows, and the payoff shot came
   from a view no landing page links to.
2. **Give the logo prominence.** A mark sized like a bullet next to a headline reads as punctuation.
   It should be a deliberate element (~100px+ beside a title, 150px+ on the end card), not a marker.
3. **Pair entrances with their exits, directionally.** A layer that enters from the right should leave
   to the left. One continuous direction of travel per beat, never enter-and-retreat. Use
   `anim:"slide-right"` + `out:"slide-left"`.
4. **Blur out when moving would fight the content.** `out:"defocus"` leaves through focus instead of
   through space. Correct for faces, cards and dense grids, where sliding 50 elements reads as chaos.
5. **A changing word belongs in a fixed box.** If one word swaps mid-sentence, put it in a fixed-width
   chip so nothing after it reflows, and the chip is the natural place for the brand colour.

## Reflecting a real website (capture-first: the taste is already on the page)

Never rewrite a site's sections by hand; you'll lose its taste and ignore half its assets. Instead:
1. `make sections URL=… NAME=<brand>`: inventory every section (screenshot each + `sections.json`
   with a stable selector + a ready `make capture` command per block). **Look at the shots.**
2. Storyboard **one beat per section, in the site's order.** `make capture` the real block → a crisp,
   live `component` (target the UI cluster, e.g. `SEL='section:nth-of-type(2) [class*=illustration]'`,
   so there's no duplicate headline over your kinetic one). Real logos, gradients, copy come free.
   Only a true `<canvas>`/WebGL section can't DOM-capture → then use the section screenshot as a clipped
   `image` layer with `ken`. Animate it OUR way (window / cut / camera / staggered parts); re-type copy
   with an overlaid `type` layer, never by editing captured glyphs (purity + font faithfulness).
   Preview any capture standalone first: `make preview HTML=<component>.json THEME=<brand>`.
3. Hand-write HTML **only** for connective tissue: hook, CTA, counters. Preview every hand fragment
   before rendering: `make preview HTML=frag.html THEME=<brand>` → `/tmp/preview.png` (Read it, fix, repeat).

> **Reflecting a real FILM? `make study VIDEO=refs/ref.mp4 NAME=ref`.** `make sections` reads a website;
> nothing here read a film, so every reference this repo argues from was studied by eye once and the study
> was lost. `study` probes the file, detects the shot boundaries, cuts a sheet with the in/mid/out frame of
> every shot, and writes `refs/<name>/study.md` with four judgement columns for you to fill. It measures
> duration, resolution, fps and the cuts; it never guesses what moves or what triggers the next shot.
> Hard cuts come back exact, dissolves score nothing and it says so instead of inventing a list. `refs/`
> is gitignored on purpose: take the grammar, never the frames. **[`docs/CRAFT/REFERENCE-STUDY.md`](docs/CRAFT/REFERENCE-STUDY.md)**.

## REACH FOR HTML FIRST. A LAYER IS FOR WHERE IT HELPS.

The layer vocabulary is 20 types and ~197 props, and it is worth having: `text` measures and fits and
carries the theme's ink, `count` counts, `component` captures a real product surface, `group` scopes a
box AND a clock. Reach for one when it does something you would otherwise hand-roll.

**For a LOOK, write the HTML.** A gradient-filled word with a bloom behind it is four CSS declarations
and it took three failed attempts through the layer vocabulary to not get it: `filter` through `css`
(refused, engine-owned), `filter` as a layer prop (silently destroyed by the motion track, a real bug
now fixed), and a glow layer orbiting the word (the wrong idea entirely). Written as an `html` layer it
was fifteen lines and correct first time. The signal is not subtle: **if you are hunting for the prop
that does the thing CSS already does, stop and write the CSS.**

**EVERY LAYER EFFECT WORKS ON AN `html` LAYER, and that is the architecture, not a coincidence.**
Verified by render: `filter`, `modifiers` (tilt/plane/kick/matte/…), `depth`, `origin`, `timeWarp`,
`motion`, `vars` and the camera all apply to an `html` layer exactly as they do to a `text` one, because
they are written on the LAYER ELEMENT and the fragment is its content. So the choice is never
"HTML or effects". It is HTML for what the frame LOOKS like, and the engine for what it DOES over time.

Two things the fragment does not get, and both are deliberate:
- **No CSS animation or transition.** `core/sanitize-html.js` refuses them at boot, because they run on
  a clock the renderer does not own and a seeked frame would be wrong. Use `var(--t)` in a `calc()`, or
  `parts` for an engine-driven per-element entrance, or put a `motion` track on the layer.
- **No `opacity` or `filter` in `css`.** The engine writes both every frame (the enter/exit envelope and
  the velocity blur). The validator refuses them by name and says what to use instead.

## BLACK MEANS `#000000`

When a brief says black, it means black. Every dark preset in `core/backgrounds.js` carries a tint or a
wash: `dark`, `deep` and `ink` all sample well above zero at the corners, which is right for a film with
a lit world and wrong for one whose only light is the subject. A pitch-black ground is two lines of
hand-authored HTML (`background:#000`) with `tone: "dark"` on the window, and the tone is required
because the engine cannot read lightness out of your CSS.

## NAME THE EFFECT BEFORE YOU BUILD IT

When a reference shows a look you cannot immediately construct, **find out what it is called and read
its recipe.** Do not approximate it by eye and iterate. An effect a designer has made before has a name,
and the name leads to a sequence of steps, and one of those steps is always the thing you would never
have guessed.

The worked example is `docs/MISTAKES.md` #505, and it is exact. A reference frame showed white text with
an orange body and a blue rim. I built it four times by stacking coloured, offset, blurred copies of the
same text, and it was rejected four times, because a stack of copies cannot make a continuous transition
between three colours. The effect is called a **thermal blur**. Its recipe is white text, Fast Box Blur,
**Colorama**, glow, and the third step is the whole answer: the colour is a **gradient map on luminance**,
so the blur's own grey falloff is remapped, bright to white, mid to orange, dim to blue. One search
returned that. It also explained every symptom the stack could not produce: the continuous transition,
the organic edge, and the letters being eaten, all of which are the ramp acting on the glyph's own edge.

**Why the pull toward guessing is real.** Iterating looks like progress: each attempt is a render you can
show. Searching produces nothing to show and feels like a detour. But an approximation converges on
whatever the first guess was near, so four renders can leave you exactly where one did, and here they did.

Three questions, in order, before you build an unfamiliar look:

1. **What is it called?** Describe it in plain words and search. Motion work has a shared vocabulary,
   most of it borrowed from After Effects: thermal blur, gradient map, displacement map, luma matte,
   echo, chromatic aberration, goo morph, posterize time.
2. **What are its steps?** A recipe is a chain of operations in an order. Write the chain down before you
   write any markup, because the order is usually load-bearing.
3. **Which step could you not have guessed?** There is nearly always one, and it is the reason your
   approximation failed. In the thermal blur it is that the colour comes from a MAP and not from paint.

Then build it once. `formats/scene/_vawe-teaser-word.html` carries the four AE steps and their SVG
equivalents in its own comments, which is the shape to copy: the recipe lives beside the implementation,
so the next author inherits the name rather than the guess.

## Hand-writing HTML? Beat the AI slop (see `AGENTS.md`)

> **FIRST: `parts` IS HOW HAND-WRITTEN HTML GETS THE ENGINE'S CLOCK, and almost nobody uses it.**
> A fragment animated with CSS renders as a DEAD STILL (transition and animation are disabled engine
> wide, and `core/validate.mjs` refuses it at boot). The usual answer is to drive geometry from
> `var(--t)` in a `calc()`, which works and is entirely hand-rolled. `parts` is the other answer and
> it is better: a CSS SELECTOR into your own markup, and every matched element gets an engine-driven,
> SEEKED entrance with a stagger, plus `out: true` for a paired exit
> (`{ select, anim, each, stagger, delay, ease, out, exitDur }`, `core/parts.js`). So the markup keeps
> the whole CSS surface and the CLOCK still owns each piece, which is the one thing a hand-rolled
> `calc()` never gives back. Measured when the exit was added: **0 of 13 block files and 6 of 161
> scenes used `parts`, against 61 scenes carrying an `html` layer.** Two agents building the same
> figure in both media reached for neither, and both reported "an html layer leaves as one card" as a
> fact about the medium. It was a missing feature (`docs/MISTAKES.md` #410).

Hand-authored HTML regresses to the mean: centered text, Inter, blue/purple gradient, equal card grid.
Before writing any by hand, **load the relevant [`docs/CRAFT/`](docs/CRAFT/README.md) guide** (how to choose
a face / palette / layout / image), then the **`taste-skill`** (state the Design Read + set VARIANCE/MOTION/
DENSITY dials, obey Anti-Default Discipline), then **`impeccable`** for craft. Skills are vendored in `.claude/skills/`.
Defaults to reach past: **asymmetry over centered · scale contrast (one huge hero + tiny caption) · a
committed non-generic face** (the real brand font when reflecting a brand; never Inter/Space Grotesk for
anything generic). Then gate it two ways, and know which one sees what.
**`make preview HTML=<frag>`** runs the vendored impeccable detector over the FRAGMENT, in a real browser
with real computed styles. That is where it works, and it is the only place it is still wired.
**`make designspec-check D=<file>`** runs OUR rule table (`scripts/lib/designspec-rules.mjs`) over the
scene: the theme colour/font lock plus the copy and effect-dose rules. Both must be clean before you render.
<!-- doc-refs-allow: make slop · this line records the target's retirement -->
> `make slop` was RETIRED in 2026-08 (`docs/MISTAKES.md` #326). It ran the 41 borrowed rules over a DOM
> dump that inlined three CSS properties (`font-family`, `color`, `background`) so every rule about a
> border, a shadow, a glow or spacing had no evidence and returned nothing. Its silence read as a pass on
> the whole library. The two counts in this paragraph are different things, and reading them as one is
> why they look contradictory: the retired gate RAN **41** rules, and **38** were then examined
> one by one for the fork (`docs/MISTAKES.md` #326). Of those 38, **6 were worth keeping**: most were
> already measured better here, four had no subject in our artifacts at all, and five would have fired on
> the engine's OWN features (the `glow` layer, the card recipe at `core/layers/doc.js:25`, the `eyebrow`
> blueprint prop, the blinds-wipe mask in `core/cuts.js:130` that `lib-test` asserts).

## Icons & images (real assets first, emoji last)

**Always prefer a real image.** Order of preference:
1. **Captured real UI**: `make capture` (a live component) is the highest-taste source.
2. **Free/openly-licensed images**: brand logos, flags `flagcdn.com/<iso2>.svg` → `assets/flags/`;
   CC0/CC-BY photos via `make photos` (attribution auto-recorded; CC-BY needs visible credit).
   **Use `make assets` for logos, and if you curl one by hand, use `-f`.** This line used to read
   ``curl https://cdn.simpleicons.org/<slug>/<hex>`` with no failure flag, and `curl -o` writes the
   response body whatever the status is. Simple Icons has been REMOVING marks on trademark request, so
   that command now 404s for real brands and leaves a **zero-byte .svg** on disk. The file then exists,
   passes every path check, and renders as an invisible hole. Two shipped assets were in exactly that
   state (`assets/icons/amazon.svg`, one of them tracked), breaking three scenes, and nothing said so
   until `core/boot.js` started refusing an asset that never loaded. `scripts/media/assets.mjs`
   `tryFetch` already gets this right: it requires 200, a minimum size AND a literal `<svg` before it
   writes, which is why `make assets` is the answer and a bare curl is not:
   `curl -fsS https://cdn.simpleicons.org/<slug> -o <dest> || rm -f <dest>`
3. **Drawn icons**: `svgIcon(name)`. 4. **Generated cards**: `make assets`. 5. **Emoji**: last resort.

**Never embed copyrighted material** into a published video: movie/TV posters, album covers, film
stills, news photos, paid stock. They trigger Content ID claims. Capture the real product UI instead.

## THE PROCESS HAS ONE OWNER, AND IT IS NOT THIS FILE

`make ship D=<file>` is the process. It **declares its own ladder before it runs**: every step, in
order, what that step reads, and whether it can stop you. Twenty steps today, and the number moves
without this paragraph having to be edited, which is the entire reason it is stated there and not here.

```bash
make preflight D=<file>   # BEFORE the JSON: the nine decisions, and the arsenal aimed at this film
make dev  D=<file>        # the iteration loop: build, draft-render, open. No gates, no audit
make check D=<file>       # every gate, every finding, ZERO consequence. Nothing blocks
make ship D=<file>        # the ladder with its teeth in, then the seams
make judge D=<file>       # MANDATORY, post-render, and the only step that SEES
```

This file used to carry its own copy of that ladder: twenty-two numbered steps whose numbering did not
sort, in which `0` and `0a` (compose from blueprints · see the whole arsenal) were printed **eleventh
and twelfth**, inside a section titled "After writing a JSON", when both must happen before one exists.
Three descriptions of one process, and the two that were prose went stale. The gates now say what they
check, and a finding **names the doc that settles it**, so what is left here is the part no gate can
hold: why, and what to do when the gate is quiet.

### Where to start, every time

**`make preflight D=<file>`.** It puts the nine-step decision chain from
[`docs/CRAFT/README.md`](docs/CRAFT/README.md) in front of you for THIS film, ranks the arsenal against
what the film says it is, and records a receipt that goes stale the moment the scene changes. The chain
is ordered because each decision constrains the next: beats → the anchor → the per-beat effect →
type/colour/layout/imagery → density → show-or-tell → what holds it across cuts → restraint → sound.

**`make arsenal Q="<what you mean, in plain english>"`** searches all 337 named things at once and
prints the snippet with the key it goes in (`make effects` regenerates the full reference,
`docs/EFFECTS.md`, 566 effects across 36 families). Reach for it before you invent anything. The measured cost
of not doing so: the `{type:"beat"}` blueprint mechanism is used by **2 of the 134 gate-visible scenes**, and 12 of its
19 beats have never been used once.

**`make track SHAPE=pan|blast|drift|enter|exit`** emits a hand-keyed `motion` track from a shape
measured off the two reference films. Use it instead of naming a preset. See the next section for why.

## AUTHOR THE MOTION. DO NOT NAME IT.

The one measurement that separates the two films this file argues from and everything else:

| | higgsfield | brew | a launch film that passed every gate |
|---|---|---|---|
| layers with a hand-keyed `motion` track | **6 of 8** | 4 of 35 | **0 of 16** |
| cuts between beats | **0** | 0 (camera fx instead) | 4 |
| text share of layers | 38% | 37% | **75%** |

higgsfield is five seconds, eight layers, **no transitions at all**, and its subject travels
`x: 30 → 0 → -155 → -288 → -447 → -542 → -600` across seven hand-placed keys whose interior is
`linear`. brew's punctuation is four keys, `scale 1.5 → 1 → 1.04 → 1.9`, arriving over-size and leaving
THROUGH the frame. Neither is reachable from a preset, because a preset animates ONE layer over ONE
span with ONE curve, and what makes both films read as directed is the opposite of that.

**Why this keeps happening, so it can be watched for: a preset is one word and a track is seven lines.**
Every time both are available the cheap one wins. The ambition floor cannot tell them apart because it
COUNTS techniques, and a preset is a technique, so the floor stays green while the film stays
undirected. `no-authored-motion` closes that hole and BLOCKS new work.

## SHOW, DO NOT ONLY TELL. NOTHING ENFORCES THIS.

Every beat that makes a claim must be asked what it could SHOW instead of set in type: a bar whose
length IS the number, a ring whose arc IS the share, a captured product surface, a diagram, a map, an
svg that draws on. **DECORATION** dresses the frame and carries no information (a glow, a hairline, a
scanline). **EXPLANATION** does work the words cannot. A film can drown in the first and have none of
the second.

**There is no show floor, and you should know why.** `visual-vocabulary` measured a layer's area and
its size helper squared any layer that declared one axis: a 590x18 underline scored as 590x590 and was
credited with a tenth of the frame. So the one gate whose job was to tell a mark from a picture handed
a pass to a hairline. Fixing the arithmetic would have failed dozens of shipped films, so it was
deleted. **You are the check now**, with `make judge` and your eyes. No green tick will tell you a film
is only type. That was always true: even at its best the gate could prove a picture was large and never
that it explained anything.

Measured over the 134 gate-visible scenes: **56 carry zero pictorial layers of any size**, and the
median film gives **6% of its layers to picture**. That was nobody's decision. It is debt, not a
pattern to copy. How to decide what to show: [`docs/CRAFT/SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md).

## A SLIDESHOW IS A FAILURE, AND A RESIZING BOX IS NOT THE ONLY WAY OUT

The failure is easy to feel: every beat is born and dies inside its own window, so each cut is a jump
between unrelated shots and the film is a stack of cards read aloud.

The prescription used to be a CONTINUOUS OBJECT: one layer that survives a cut and changes across it.
That is one device and it is the cheapest one. **Murch ranks it last**: a cut serves emotion 51% ·
story 23% · rhythm 10% · eye-trace 7% · the screen plane 5% · three-dimensional space 4%, and you
sacrifice up from the bottom. `no-continuous-object` measures spatial persistence plus a state change.
It is the 4% item.

The registers it cannot see: a match cut, a oner, camera travel, masking, cloning · an unfinished
sentence, a sound bridge, a bookend · metric cutting, a track that IS the structure · a motif,
escalation, a through-line. A film held by a motif and an escalation is properly structured and fails
that rule every time. The catalogue: [`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md).

**Name three ways this film could hold its subject, and reject the first one.** If the answer is always
"the layer resizes", you are writing a gate's minimum rather than a film. Three consecutive films here
were one rectangle changing size, and each passed everything.

## THE BACKGROUND MUST MOVE, AND YOU MUST WATCH IT MOVE

`bg` is required, so the backdrop is always your decision. A static field is a choice you have to
justify, never a default. **A backdrop that changes PER BEAT is the cheap thing to write**: list the
windows in the order the film turns, give none of them a `from`/`to`, and the engine binds window i to
the joint after it (`core/junctions.js`), so the cuts you already wrote own the numbers.

This is the strongest single lever in the file. brew inverts the tone of the world on four of its five
cuts and spends its one accent window on the logo reveal, while **112 of the 134 gate-visible scenes,
84%, paint ONE window for the whole runtime**. A pictorial beat on a dead backdrop is still a slide.

Then **judge it across frames, never on one still**: pull 4+ timestamps and compare them as a strip. A
still hides speed, scale and direction. A background was once "matched" on one frame and was, in
motion, twice too fast with folds half the size (`docs/MISTAKES.md` #155).

## SILENCE IS A DEVICE, NOT A DEFAULT

**110 of the 134 gate-visible scenes ship mute, 82%**: 17 carry no `audio` key at all and 93 declare
`silent: true`. Of those 93, **only 13 say why**. So the sentence to remember is not "nobody declares
the silence", it is "nearly everybody declares it and almost nobody justifies it". That closes the
whole aural family of structural device: the sound bridge, music-led structure, the unfinished
sentence. A sound bridge is also a continuous object the picture never has to carry.

Give every film sound, or state the silence: `"audio": {"silent": true, "_why": "…"}`.
[`docs/CRAFT/SOUND.md`](docs/CRAFT/SOUND.md).

## IS THE EMPTY PART OF THE FRAME DOING A JOB?

Whitespace is ACTIVE (isolating the subject, directing the eye) or PASSIVE (what merely happened
between two things placed independently). Passive space does not read as minimal, it reads as
unfinished. Two tests, and the second decides: name what the emptiness is doing in one clause, then ask
whether enlarging the subject removes it and improves the frame. If it does, that space was never
working.

**NO GATE SEES THIS.** `make audit` fires on things COLLIDING, never on a frame that is half empty
because nobody decided anything. Same doc carries lead room, visual weight and three-plane depth:
[`docs/CRAFT/LAYOUT.md`](docs/CRAFT/LAYOUT.md).

## What the gates cannot do, so you must

- **Read the sheets.** `make beats` (where each beat lands) and `make reveal` (how it arrives) are
  scored by nothing. `make beats` signs the look off with a receipt; skipping it is visible.
- **QA the seams, not the centres.** `make seam-check` pulls the frames straddling every transition out
  of the rendered mp4. Cheapest catch for the worst class of bug.
- **Audit every canvas you ship.** `make audit M=<file> ASPECT=all`. A scene passes at its own aspect
  and is wrong at every other: `pin` centres a *box*, so a text layer needs `w` (+ `align`). Going to a
  phone feed? Set `"destination": "tiktok"|"reels"|"shorts"`: the safe area is not a property of the
  shape (`core/safe.js`).
- **`make judge`, and read the sheet.** The static gates cannot see composition or fidelity. If your
  eye catches a flaw, it is a FIX, never a rationalisation (`docs/JUDGE.md`).
- **Eyeball real frames**: `make look M=scene` / `make frame M=scene N=<n>`. Never ship a film whose
  hook, reveal and end card you have not actually looked at.
- **Narrated?** Pace the picture to the voice: `make pace-from-vo VO=<file>.words.json`.
- **`make ledger`** before shipping, `make ledger-add` after the user approves.

## Waivers, legacy, and the difference

A rule you deliberately break is waived IN THE SCENE, with a reason, and **a waiver with no `_why`
blocks**:

```json
"authoring": {
  "allow": ["dead-air"],
  "_why": { "dead-air": "the held frame IS the beat: the room empties and nothing replaces it" }
}
```

**LEGACY IS NOT A WAIVER.** A waiver says somebody looked and decided. Legacy says nobody has looked
yet: it is a debt, it warns on every run, and it disappears the moment the film complies
(`make legacy` for the board, `make legacy STAMP=1` to pay one off). Edit a legacy film without fixing
it and it BLOCKS. Nothing is excused for life.

## ARCHITECTURE: fix it at the root, or fail there. A gate is the last resort.

**The rule, and it is not a preference.** A gate belongs ONLY where the problem cannot be avoided in
the code at its root, or made to fail there. If it can be fixed at the write site *simply*, it is fixed
at the write site and no gate is written. A gate is justified only when preventing the thing in code
would genuinely complicate the code AND it cannot be solved at the root either. Then, and only then,
build a gate.

**The test, applied to any check you are about to write: where is this value WRITTEN?** If that place
is reachable, the refusal goes there and the whole class of bug ends. A gate that runs afterwards
leaves the engine perfectly able to produce the same bad value tomorrow; it only promises to notice.

What a gate IS for, stated so the rule is not read as "never":
- a property only knowable **after a render** (a luminance flash across a cut, a frame that paints nothing)
- a property only knowable **across the whole library** (a design repeating a shipped one, a count on the
  site disagreeing with the registry that produced it)
- a comparison against a **baseline** (byte-identical frames, purity across render order)
- a **judgement**, which no code can make (`make judge`, and your eyes)

**The worked example, because it is exactly the reflex to avoid.** A block emitted `left: -calc(...)`.
Invalid CSS, so the browser dropped that one declaration, kept the rest of the rule, rendered on, and
three of four focus brackets never moved with every check green. The first fix was a NEW GATE that
swept every fragment in a browser. It worked, and it was the wrong shape. The right answer was three
files away: `core/sanitize-html.js` already refuses `transition`/`animation` for the identical reason,
hand-authored CSS that reads correctly and silently does nothing. The refusal now lives at the two
places author CSS reaches the DOM (`core/layers/util.js`, `core/layers/html.js`) and throws naming the
layer. The gate was deleted. Full write-up: `docs/MISTAKES.md` #422.

**Every gate has a running cost, and this repo has paid it twice.** `visual-vocabulary` was deleted for
measuring size wrongly: it squared a 590x18 rule into 590x590 and credited a hairline with a tenth of
the frame. `make slop` ran 41 borrowed rules against a DOM dump carrying evidence for three of them and
reported its silence as a pass. **A gate is another thing that can be quietly wrong, and a wrong gate is
worse than no gate** because it manufactures confidence. Before adding one, read `docs/TASTE.md` on that
cull.

## SUGAR MUST NEVER SILENTLY NO-OP

An authoring convenience that needs a build step to work is a trap: the author writes something real,
skips a step they did not know about, and watches a still frame with nothing to tell them why.

`make expand` resolves four sugars. Three of them (`block`, `beat`, `comp`) become layer TYPES, so a
scene rendered without expanding is refused by name at boot. That is a build step failing LOUDLY, and it
is acceptable: expansion imports all 217 block factories, which has no business in every render.

The fourth, `cameraMove`, was written into `data.cameraMove` and read by nobody: `formats/scene/scene.js`
reads `data.camera`. So an author who wrote a camera move and rendered without expanding got no camera
and no error. It now bakes at boot (`bakeCameraMove` in `core/produce.js`), and `core/boot.js` THROWS if
`cameraMove` survives to render, because the failure was a field written and never read, so the repair
is not "convert it here", it is "make surviving unconverted impossible" (`docs/MISTAKES.md` #424).

**The rule: sugar either resolves at boot, or its absence fails loudly. Silence is never the third option.**

## LOOSE COUPLING: adding a thing must not mean touching everything

The engine should let you add an effect, a layer type, a block, a beat or a camera move **without
handling everything again**. Where that is true today it is because of one of three primitives, and a
new extension point should use one of them rather than invent a fourth:

- **`defineRegistry(...)`** (`core/vocab.js`): a named vocabulary that refuses an unknown name and says
  which slot it was reaching for.
- **`paramsOf`** (`core/camera-moves.js:216`), refuses an unknown parameter by reading the generator's
  OWN signature. Nobody maintains that list, so it cannot drift.
- **`createKit(ctx)`** (`core/layers/util.js`): dependency injection for layer builders. A capability
  added to the ctx reaches every primitive at once, with no signature change at any call site. The frame
  (`frameOf` in `core/safe.js`) arrived exactly this way.

**One fact, one owner, everyone else receives it.** The recurring failure in this codebase is not
complexity, it is the same fact known in two places and then drifting: the audit graded a camera read
from the scene file while the renderer baked a different one at boot (#423), and light-versus-dark once
had two implementations (#159). Before computing something a caller could have handed you, check whether
an owner already exists. `nothing computes the frame twice` is the shape to copy.

**Deterministic, simple, readable, fail early.** `renderFrame(n)` is a pure function of `n` and every
suggestion is weighed against that first. Validate at the entry point rather than deep in the call chain.
Return the error; never log and continue. Prefer the boring, obvious construction: an abstraction with
one caller is not decoupling, it is a second thing to read.

## The framework harvest (do this EVERY render: the engine must compound)

Authoring a video always surfaces friction. If that friction is only patched inside the JSON, the
next author hits the identical wall and the engine never improves. So **after every render, before
declaring done, list every problem hit this pass and classify each one**:

| Class | Test | Action |
|---|---|---|
| **Framework bug** | Would ANY author hit this on a different brand? Did the engine do something silently wrong, or accept input it then ignored? | **Fix it in the engine/tooling now**, then delete the JSON-side workaround |
| **Gate gap** | The render was wrong and no gate said anything, or the error message didn't name the real cause | **Extend the gate / sharpen the message** |
| **Authoring choice** | Specific to this brand's taste, copy, or composition | Fix in the JSON only |

Rules that make this real, not ceremonial:
- **A workaround is a bug report.** If you wrote something odd to route around the engine
  (`ken:{from:1,to:1}` purely to get a border-radius), that IS a framework bug. Fix the engine and
  remove the hack, never leave the hack as the answer.
- **Silence is the worst failure.** Any input the engine accepts and then ignores must either work or
  fail loudly. Silent substitution is how the wrong font and square avatars both shipped.
- **Log it.** Append every framework-class finding to `docs/MISTAKES.md` (what · root cause · fix ·
  which gate now catches it). That file is the memory; an unlogged fix gets re-broken.
- **Check the blast radius** before changing shared behaviour: grep the other scenes for the pattern,
  and re-run `make probe` + `make snap`. Say plainly which existing videos change output and why.
- **Report it.** Tell the user what was framework vs authoring. Never silently absorb engine bugs into
  a scene file.
- **FIX THE RULE, NOT THE CALL SITE. Grep every consumer before you close it.** A measurement bug is
  almost never in one place: the primitive that was read wrongly is read the same way somewhere else.
  #214 taught the audit that `<style>` source is not glyphs, applied it to the overlap check alone, and
  left the identical bug in the clipped-text check, where it surfaced as #216 the same day. Before
  closing any finding of this shape, grep for the thing that was misread (`textContent`, `getBBox`,
  `boxOf`, a default-substituting helper) and fix or explicitly clear EVERY consumer. A fix at one call
  site looks exactly like a finished fix until something else trips the half you skipped.
- **FINISH THE FIX. Reverting is not a resolution.** Having found an engine or gate bug, you fix it in
  this pass. "I could not get it working so I put it back and logged it" is the one outcome that is
  never acceptable: the next author inherits the same wall plus a note saying it is known. If a first
  attempt does not fire, DEBUG IT: instrument the thing, print what the code actually sees, and find
  out why. Every fix in this file that looked impossible was one measurement away (#211 took three
  distinct root causes, and stopping after the first two would have shipped half a fix that changed
  nothing). Abandon only when you can state what makes it genuinely infeasible, and then say so to the
  user in plain words rather than quietly restoring the old behaviour.
- **When satisfying a gate requires making the film worse, suspect the gate.** A gate that measures the
  wrong thing does not merely miss defects, it manufactures them, and the author pays by deforming a
  good design until the number moves. Before you shrink, recentre or delete something you know is right,
  go and read what the gate actually measures (#211).
- **A gate change must never invent findings.** Run the whole scene library before and after and diff the
  counts. The only acceptable shapes are "no scene changes" and "these N changed, FAIL to PASS, here is
  why each was a false positive". A single scene going PASS to FAIL is a regression, not a discovery,
  until you have proven otherwise: an unclamped bound in #211 turned one clean scene into 7 failures.

> **Editing `scene.html`?** Read the `vawe-scene-authoring` skill first (render-frame purity,
> tokens, motion primitives, image/capture system, QA loop). System map: `docs/CODEMAPS/ARCHITECTURE.md`.
> Run `make probe` after scene-logic changes and `make review` for a fast health snapshot.
