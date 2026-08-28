# CLAUDE.md: authoring videos for this engine

This repo turns **one self-describing JSON → one rendered video** (30fps mp4, at any of **five**
canvases: `16:9` 1920×1080 · `9:16` 1080×1920 · `1:1` 1080×1080 · `4:5` 1080×1350 · `4:3` 1440×1080,
the table at `core/safe.js:35`; a ratio it does not name is still honoured, sized to fit the long edge
at 1920). There is exactly **one module: `scene`**, an open canvas of **18 composable layer types**
(`ls core/layers/`: beam · board · canvas · clip · component · composition · count · cursor · doc ·
glow · group · html · image · lottie · rect · svg · text · video) plus camera · cuts · stings ·
captions. `html` counts as a picture, and that matters: it is what makes the 46% two sections below.
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
make check D=path/to/video.json # every gate, every finding, ZERO consequence. Nothing blocks.
make ship  D=path/to/video.json # the ladder with its teeth in: author-check → render → audit → seams.
```

`make ship` (`Makefile:168`) is steps 2b, 3, 4 and 5a of the ladder below, in order, and it is the one
command that says a film is done. The section "After writing a JSON" explains what each of those steps
MEANS; it is not a second list of commands to type by hand.

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

**And DO NOT hand-author a film from a blank JSON.** That is the #1 failure named two sections below,
and it has been committed here: a 28s film of 31 hand-written layers, 74% of them text, `anim:"fade"`
on nearly every one, one backdrop window for the whole runtime, and one hand-keyed motion track. It was
rejected twice by the person who asked for it, and it was not below the house standard, the library
median is **8% picture and 0% hand-keyed motion**, so it was AT it. Compose from `make blueprints`.
Measured against the two films this repo is proudest of. **Every cell is a percentage of that film's
top-level layers**, because the row below used to mix counts and percentages and read as nonsense
either way:

| | brew-launch-act1 | higgsfield-recreation | that film | library median |
|---|---|---|---|---|
| pictorial LAYERS (see the warning below) | 46% (16/35) | 38% (3/8) | 3% (unverified) | **8%** |
| layers with a hand-keyed `motion` track | 11% (4/35) | **75%** (6/8) | 10% (unverified) | **0%** |
| `bg` windows | **6** in 19.6s, bound to `cut@0..cut@3` | 1 in 5s | 1 in 28s | 1 in 92% of films |

**The population, named once so every figure here can be re-run.** "The library" means the **132
gate-visible scenes** the gates themselves reason over: `formats/scene/*.json` with `module=="scene"`,
minus derivatives and `schema.json`, `_`-prefixed scratch included. `node scripts/gates/waiver-drift.mjs`
prints that count on its first line, so it is one command away and it is the number to quote. Three
other populations exist (98 without scratch, 154 raw files in the directory) and mixing them is how this
file once cited 93, 130 and 144 as the size of the same library in three sentences. **"that film" is not
named anywhere and I could not identify it, so its two cells are unverified and marked so.**

**A FRESH CLONE SEES 36, NOT 132, AND NOTHING IS BROKEN.** Films are gitignored on purpose
(`.gitignore:61`: a video instance is not the framework), with an allowlist for the handful the site
needs. So `waiver-drift.mjs` prints `WAIVER CENSUS · 132 scenes` on this machine and about a third of
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

## After writing a JSON

1. **Images:** `make assets D=formats/scene/<topic>.json` fills any missing icons. Dry-run; add `WRITE=1`.
2. **See it beat-by-beat:** `make beats D=<file> [VS=<brand>]` → `/tmp/beats/<name>.png` (first/mid/last of every
   beat; `VS` stacks each beside its source section). Read it, catch murk/overlap/off beats before rendering.
   **Iterate live, no render:** `make studio D=<file>` serves the scene with a frame scrubber (scrub/step ·
   space plays): edit the JSON, reload, watch the motion, before you spend a 30-60s mp4 render. Under the
   scrubber is a TIMELINE: a bar per layer against a seconds/frames ruler, cuts/seams/stings marked, the
   enter/exit ramps shaded off the settled middle, and every dead-air hole painted as a hazard band. Drag
   it to seek. It is where you SEE the structure the contact sheets can only sample.
2a0000. **SHOW, DO NOT ONLY TELL. A FILM OF PURE TYPE IS A FAILED FILM.** Every beat that makes a claim
   must be asked what it could SHOW instead of set in type: a bar whose length IS the number, a ring whose
   arc IS the share, a captured real product surface, a diagram of the flow, a map, a photo, an svg that
   draws on or morphs. This is the same split CLAUDE.md already makes about backgrounds, applied to the
   content: **DECORATION** dresses the frame and carries no information (a glow, a gradient, a hairline
   rule, a corner tick, a scanline, a logo mark beside a wordmark); **EXPLANATION** does work the words
   cannot. A film can be drowning in the first and have none of the second, and all three Ledgerline cuts
   were. Size is the whole point: `preface-launch` carries **17 `image` layers of 103**,
   and every one is a small agent logo, so a graphic is only the subject at roughly 8% of
   the canvas or more. **That 8% is a deleted gate's constant and no derivation for it survives**, so use it
   as a rule of thumb you argue with, never a threshold you satisfy. How to decide what to show and how:
   **[`docs/CRAFT/SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md)**. The old claim here was "52 of the 93
   scenes carried no large picture", and it is not checkable: 93 matches no population, and "large" needs an
   area measurement no tool in this repo performs any more. What IS checkable, and says the same thing:
   **50 of the 132 gate-visible scenes carry ZERO pictorial layers of any size**, and the median film gives
   8% of its layers to picture. That was nobody's decision, and it is debt, not a pattern to copy.

   **NOTHING ENFORCES THIS. There is no show floor any more, and you should know why.** A gate called
   `visual-vocabulary` used to fail `no-visual-vocabulary` here, and it was deleted in 2026-08. It measured
   a layer's area, and its size helper squared any layer that declared one axis and had no readable
   intrinsic aspect: a 590x18 decorative underline was scored as 590x590 and credited with a tenth of the
   frame. So the one gate whose entire job was to tell a mark from a picture handed a pass to a hairline.
   It was also waived by 30 of 130 films at the time of the cull, which is a rule that has already been
   repealed with nobody writing it down. Fixing the arithmetic would have made it true and then failed
   dozens of shipped films, so it went. **Both of those are historical figures and neither can be re-run**:
   the gate is gone and the scenes were cleaned, so today `node scripts/gates/waiver-drift.mjs` finds one
   `no-visual-vocabulary` waiver left, flagged DEAD. `docs/TASTE.md` records the cull and what would have
   to be true to bring it back.
   The reasoning above is unchanged and still worth following. What changed is who checks: **you do, with
   `make judge` and your eyes.** No green tick will tell you a film is only type. That was always the case,
   because even at its best the gate could prove a picture was on screen and large and could never prove it
   explained anything, a big decorative photograph passed it and deserved to fail a human.

2a0000a. **AUTHOR THE MOTION. DO NOT NAME IT. This is the difference between the two films this file
   argues from and everything else in the library, and it is one measurement, not a matter of taste:**

   | | higgsfield | brew | the launch film this rule was written for |
   |---|---|---|---|
   | layers with a hand-keyed `motion` track | **6 of 8** | 4 of 30 | **0 of 16** |
   | cuts between beats | **0** | 0 (camera fx instead) | 4 |
   | text share of layers | 38% | 37% | **75%** |

   higgsfield is five seconds, eight layers, **no transitions at all**, and its subject travels
   `x: 30 → 0 → -155 → -288 → -447 → -542 → -600` across seven hand-placed keys whose interior is
   `linear`. brew's punctuation is four keys, `scale 1.5 → 1 → 1.04 → 1.9`, arriving over-size and
   leaving THROUGH the frame. Neither of those is reachable from a preset, because a preset animates
   ONE layer over ONE span with ONE curve, and what makes both films read as directed is the opposite.
   The launch film said `"preset": "up"` sixteen times, passed every gate, and was correctly called a
   slideshow with sounds by the person who asked for it.

   **Why this keeps happening, stated so it can be watched for: a preset is one word and a track is
   seven lines.** Every time both are available the cheap one wins, and the ambition floor cannot tell
   them apart because it COUNTS techniques and a preset is a technique. So the floor stays green while
   the film stays undirected.

   **The track is now the cheap one. `scripts/author/track.mjs` emits the exemplars' own numbers:**

   ```bash
   node scripts/author/track.mjs pan   --to -600 --dur 1.25   # higgsfield's scroll rhythm, irregular
   node scripts/author/track.mjs blast --dur 1.5              # brew's four-key punctuation
   node scripts/author/track.mjs drift --dur 3 --amp 12       # an ambient hold that still moves
   node scripts/author/track.mjs enter --from 40 --dur 0.9    # a keyed entrance, not a preset name
   … --offset 0.12                     # weld a rider to the subject's track (higgsfield shares one pan six ways)
   … --scene <f.json> --layer <n>      # write it in, surgically, no reformat
   ```

   It exists because `make studio`'s keyframe mode is **drag on a stage**, which is cheap for a person
   and unreachable for the agent writing most of the scenes here. Deterministic, so the same command
   twice is the same bytes. **`make blueprints` also carries four keyed BEATS harvested from higgsfield
   itself** (`recordedPan` · `scrollStory` · `focusRack` · `echoRing`, `blueprints/beats-track.mjs`), so
   the reference film's mechanics are reachable without having the reference film.

   **`no-authored-motion` now BLOCKS a new film** (step `motion` in `make author-check`): two or more
   junctions, six or more content layers, and not one keyed track nor one layer carried across a
   junction by `becomes` / `follow` / `acrossBeats`. One is enough to clear it. It is a RATCHET, adopted
   2026-08-28 over 14 legacy scenes (mostly showcase reels, where a list is a fair answer and a `_why`
   is the right cost), so it fires on what you write next and not on the library's debt. Measured before
   it was written: it spares both exemplars and fires on 16 of 140. `docs/CRAFT/KEYED-MOTION.md`.

2a000. **A SLIDESHOW IS STILL A FAILURE. A CONTINUOUS OBJECT IS ONE OF ABOUT EIGHTEEN WAYS OUT.**
   The failure is real and it is easy to feel: every beat is born and dies inside its own window, so each
   cut is a jump between unrelated shots and the film is a stack of cards read aloud. Do not ship that.
   What was wrong in this section for a year was the prescription, not the diagnosis. It used to say that
   a film under 15s with cuts MUST carry a CONTINUOUS OBJECT, one content layer that survives a cut and
   CHANGES across it, and it called that the floor. That is one device, and it is the cheapest one.
   **Murch ranks it last.** A cut serves, in order, emotion 51% · story 23% · rhythm 10% · eye-trace 7% ·
   the screen plane 5% · three-dimensional space 4%, and the instruction is to sacrifice your way up from
   the bottom. `no-continuous-object` measures spatial persistence plus a state change. It is the 4% item,
   and it was the only structural rule in this engine that blocked.
   **The registers it cannot see.** Spatial: a match cut, a oner, camera travel, masking and reveal,
   cloning, a dolly-zoom. Verbal and aural: an unfinished sentence, a sound bridge, a bookend, an open
   question. Temporal: metric cutting, rhythmic cutting, a track that IS the structure. Conceptual: a
   motif, intellectual montage, escalation, a through-line. A film held by a motif and an escalation is
   properly structured and fails `no-continuous-object` every time. The catalogue, its sources, and a
   six-question decision aid: **[`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md)**.
   Count your threads before you author, and carry two. One thread has to be literal and obvious to work,
   which is exactly how a film ends up as a resizing box.
   **The gate now RUNS on every scene and REPORTS**: it is step 6 of `make author-check`, and
   `make direction-floor D=<file>` runs it alone. Inside the gate `no-continuous-object` is a FAIL, so
   `TASTE=1` turns it into a wall; if the film declares no cuts, boundaries are INFERRED from where the
   visible content set turns over wholesale, and that half warns (`no-continuous-object-inferred`,
   promoted under `STRICT=1`), because a build should not fail over a cut the author never wrote.
   **Believe it when the CONTENT is continuous**: a single-subject product film, a process shown end to
   end, a demo where the UI is the subject. There the rule is right, and it is right because of the
   content, not because films must be that shape. Read past it on a manifesto, a vignette anthology, a
   comparison built on the junction, or a metric-cut list film. It will be wrong about all four, and it
   reports rather than blocks precisely so being wrong about four film shapes costs you a paragraph of
   reading instead of a waiver.
   **Know the limit.** The gate can see that a prop survives a junction and moves. It cannot see whether
   that prop BECOMES the next thing, which is the difference between a travelling card and a subject.
   **Read the waivers as evidence about the rule, not about the films.** **14 films, 11% of the 132
   gate-visible scenes**, carry a `no-continuous-object` waiver (`node scripts/gates/waiver-drift.mjs`;
   this line said "eighteen" and that was the raw file count, derivatives included). It is the
   most-waived rule in the library by a distance, and the only one within sight of the 15% threshold
   `waiver-drift.mjs:58` calls habitual. A rule waived by reflex has already been repealed and nobody
   wrote it down. It did not merely fail to see the alternatives: it made one alternative free and the
   other seventeen expensive, because a keyed `w`/`h` on a rectangle passes and a motif does not.
   Planning follows the same shape. `storyboard-check` asks a short film to NAME what holds it, in
   frontmatter: `object:` if it is a continuous object, `threads:` for anything else in the catalogue. It
   no longer demands an object. If you do declare one, every beat must still say where it is.
   For the object device itself: **[`vawe-continuous-action`](.claude/skills/vawe-continuous-action/SKILL.md)**.

2a001. **NAME THE THREAD, AND REJECT THE FIRST ANSWER YOU THOUGHT OF.** The rule above rejects the
   slideshow; it does not prescribe "one card that resizes four times". What it asks for is a subject the
   film STAYS WITH, and a subject can be stayed with while the film does almost anything. A shared world,
   a match cut on shape or motion, a camera that travels between two places, a colour or a rhythm that
   survives the junction, a thing that turns into a different thing: all of these hold a film, and a box
   whose `w` and `h` are keyed is the cheapest of them and usually the least interesting. Three consecutive
   films in this library were one rectangle changing size, and each passed every gate.
   The test, before you author: **name three ways this film could hold its subject, and reject the first
   one.** If the answer to "what carries this" is always "the layer resizes", you are writing a gate's
   minimum rather than a film. `make blueprints` and `docs/EFFECTS.md` put the other answers one command
   away; `docs/CRAFT/FILM-STRUCTURE.md` names the ones no command can reach.
   Where this meets the section above: holding the subject is necessary and proves nothing about whether
   the film is worth watching. Ambition is graded separately, by `direction-floor` and by your eyes.

2a00. **CHECK THE BEATS, AND FIX WHAT YOU SEE.** `make beats D=<file>` → `/tmp/beats/<name>.png`, then READ it and
   fix every beat that does not carry its frame. This is a rule, not a suggestion, and it is now enforced two
   ways. The mechanical half is a blocking gate (`make beat-check`, also step `beats` inside `author-check`):
   it fails `dead-air` (a hole where the frame holds only the backdrop), `ends-on-nothing`, `empty-beat` and
   a hand-authored `html` bg that cannot animate. The half only eyes can do is enforced by a RECEIPT:
   `make beats`/`make reveal` record the scene's content hash, and the gate warns (fails under `STRICT=1`)
   when the scene has changed since you last looked. Editing a scene and skipping the sheet is therefore
   visible. A `dead-air` waiver is for a deliberate held frame, never for "I did not look".

2a2. **SILENCE IS A DEVICE, NOT A DEFAULT.** **114 of the 132 gate-visible scenes ship mute, 86%**: 17
   carry no `audio` key at all and 97 declare `silent: true`. Of those 97, **only 9 say why**. So the
   sentence to remember is not "nobody declares the silence", it is **"nearly everybody declares it and
   almost nobody justifies it"**. `audio-check` accepts a bare `silent: true`, and 88 films took the
   offer. That closes the whole aural family of structural device (`docs/CRAFT/FILM-STRUCTURE.md`): the sound
   bridge, music-led structure, the unfinished sentence. A sound bridge is also a continuous object the
   picture never has to carry. Give every film sound, or state the silence:
   `"audio": {"silent": true, "_why": "…"}`. `make audio-check D=<file>` grades it; `make audio-check`
   alone prints the census. Know the limit: the gate proves a decision was made, never that the sound is
   good. How: **[`docs/CRAFT/SOUND.md`](docs/CRAFT/SOUND.md)**.
2a0. **THE BACKGROUND MUST MOVE, AND YOU MUST WATCH IT MOVE.** `bg` is a required field, so the backdrop
   is always your decision. Make it a living one, a preset or hand-authored (`{"html":…}` driven by
   `var(--t)`); a static field is not a default, it is a choice you have to justify.
   **A backdrop that changes PER BEAT is now the cheap thing to write.** List the windows in the order
   the film turns and give none of them a `from`/`to`, and the engine binds window i to the joint after
   it, so the cuts you already wrote own the numbers (`core/junctions.js`, `docs/MISTAKES.md` #371).
   This is the single strongest lever in the file: brew inverts the tone of the world on four of its
   five cuts, and **122 of the 132 gate-visible scenes, 92%**, paint ONE window for the whole runtime. A pictorial beat on a
   dead backdrop is still a slide. Then **judge it across
   frames, never on one still**: pull the same 4+ timestamps and compare them as a strip. A still hides
   speed, scale and direction of the motion. Recreating a reference? Strip the reference and your render
   side by side and match the pace and the size of the shapes before touching colour. This is written down
   because a background was "matched" on one frame and was, in motion, twice too fast with folds half the
   size (docs/MISTAKES.md #155).
2a. **See the REVEAL, not just the hold:** `make reveal D=<file>` → `/tmp/reveal/<name>.png` (per beat: the ENTER
   arc + settled + EXIT arc, from exact layer starts). `make beats` samples the middle and hides the
   entrance motion; this shows HOW each beat animates in (dolly direction, typing, a colour-wave). Mandatory
   when recreating a reference: judging the settled frame is how the dolly/gradient/colour-wave got missed.
0. **Compose from blueprints (don't re-derive motion):** `make blueprints` lists directed-motion beats
   (`{type:"beat","beat":"kineticHook",…}`, `docs/CRAFT/BLUEPRINTS.md`). Drop one per beat + fill brand
   content so kinetic reveals / count-ups / cascades / dashboard dives are the DEFAULT, then `make expand`.
   Authoring plain `rise`+`fade` from a blank JSON is the #1 failure, blueprints + the floor prevent it.
0a. **See the whole arsenal, then choose:** `make effects` → `docs/EFFECTS.md` (518 effects, 35 families,
   generated from the registries). The killer per-frame effects: border-beam / shine (`{type:"beam"}`),
   aurora / meteor paint fields (`{type:"paint"}`), a one-shot glow `flash`, an svg logo that draws-on or
   shape-morphs (`{type:"svg","morph":{"to":…}}` / the `logoReveal` beat), and calculated camera moves
   (`"cameraMove":{"move":"diveIn",…}`, `core/camera-moves.js`). For a HERO beat whose choreography
   `parts`/blueprints can't express (overlapping tweens, a token travelling a path while a counter ticks
   and a check draws), author a bespoke **`composition`**: a first-party hand-authored per-beat GSAP
   timeline in `core/compositions/index.js`, named from the JSON (`{type:"composition","comp":…,"props":…}`)
   so untrusted input can't inject (`docs/CRAFT/AUTHOR-THE-FRAME.md`). Skills: **`vawe-effects`** (pick from
   the arsenal), **`vawe-animation`** (how motion should feel + `springEase`), **`vawe-camera`** (camera work).
2b. **MANDATORY authoring ladder:** `make author-check D=<file> [VS=<brand>]`, one command, one process,
   **every step, every time** (15, or 16 when an intent sidecar or a landscape canvas adds one). There is no opt-in half. The run lists every step before it
   starts, numbers each one as it goes, says what that step reads, warns before the one slow step, and
   prints "nothing found" when a step is clean. Measured end to end on a 19.6s film: **1.4s**, browser
   launch included.
   What is not uniform is what a finding COSTS, and that separation is the design:
   **BLOCKS**: **validate · beats · inspect · plan-vs-render** (plus **assets** under `STRICT=1`). These
   say the film is broken. Two more things block that this list used to hide: **a waiver with no `_why`
   blocks** (see the shape below), and under `STRICT=1` a **missing `.intent.json` blocks** as
   `no-intent-sidecar`.
   **REPORTS**: **storyboard · critique · direct · direction-floor · dissolve · designspec · copy · pace ·
   hero · treatment · waiver-drift**. They run on every scene and print in full; they do not stop you.
   `TASTE=1 make author-check D=<file>` gives them teeth. (`slop` is NOT among them. It was retired in
   2026-08, its script is deleted, and this line listed it as live for months.) `pace`
   (`scripts/gates/pace-check.mjs`) measures events per second: it catches a film that is asleep.
   **Why they report rather than block, measured rather than argued:** give the REPORTS tier teeth and
   **116 of the 141 scenes in this library fail**, four films in five, which is the reflex-waiver trap this
   file already names two sections up. These gates were opt-in until 2026-08-21, and that was the same
   reasoning applied to the wrong thing: skipping a step never protected an author from a rule fitted to a
   debt-ridden library, it only protected the rule from being read. Full record: **`docs/TASTE.md` · "One
   process, two severities"**.
   **The storyboard is part of the process now, not a printed suggestion.** Step 2 always looks for the
   plan this film came from and always says what it found. A scene declares it explicitly with a
   top-level `"storyboard": "formats/scene/<topic>.storyboard.md"`; without that field the step falls back
   to `<base>.storyboard.md` beside the scene, then `_concepts/<base>.storyboard.md`. Found, it runs
   `storyboard-check` over the plan and hands the path to plan-vs-render so `spectacle:` and `pace:` are
   joined to the film. Not found, it reports `no-storyboard`, never silence. It REPORTS rather than blocks
   because **130 of 141 scenes have no plan**, and it is promoted to BLOCKS on a written condition, not a
   wish: when fewer than a quarter of `formats/scene/` is missing a storyboard (`docs/TASTE.md`).
   The **designspec lock** flags off-palette colours / non-role fonts (the
   theme is the locked look). The **copy** gate flags on-screen writing tells (weak hook, marketing jargon,
   restated headline, a big number as flat text). The **assets** preflight confirms every referenced image /
   icon / capture / VO exists before you render. The **inspect** step verifies a `.intent.json` value
   contract: generate one from the storyboard with `make intent SB=<storyboard.md> D=<file>` so "every beat
   earns its frame" is checked. **plan-vs-render** runs next, off the same sidecar (skip the sidecar and you
   skip both): it lays the plan's beat spans over the film's clock and asks whether anything happens where the
   plan said something turns. It FAILS `junction-is-static` (a beat opens on a promised change and the render
   puts no event there) and `plan-overruns-render`; it WARNS `held-through-the-change` (two consecutive motion
   keys carry the same values across seconds the plan says something turns, with nothing else arriving or
   leaving), plus `beat-holds-still`, `unplanned-junction` and `plan-has-no-spans`. Every warning blocks
   under `STRICT=1`. On its own:
   `make plan-check D=<file>`. **A green `storyboard-check` proves nothing about the film.** It grades the plan
   against itself, and in the A/B test the losing film named the change correctly on the very beat whose frame
   never moves. Every gate stayed green until this one existed. Even plan-vs-render only proves the film is not
   empty where it promised to be full, never that it kept the promise: that is `make judge` and your eyes.
   Narrated video? Pace it to the voice: `make pace-from-vo VO=<file>.words.json`.
   It **blocks** on schema/em-dash and on timeline holes.
   **THE DIRECTION TELLS DO NOT BLOCK, AND THIS FILE SAID THEY DID.** `linear-motion`,
   `monotone-timing`, `enter-and-retreat` and `effect-soup` are every one of them `warn()` in
   `scripts/author/motion-director.mjs`; that gate exits only on `fails`, and the string `strict` does
   not appear in it. Its only two FAIL-tier codes are `cut-families` (at ≥3) and `profile`. So the backstop
   this paragraph promised for months does not exist, and a film can carry all four tells and pass
   `TASTE=1` clean. Treat them as what they are: a report you have to read, not a wall that stops you.
   **The ambition floor is sharper inside its own gate: `plain-slideshow` really does fail**, in
   `direction-floor.mjs:118-120,349-359`, alongside `no-continuous-object`. So does `crossfade-mud`
   (dissolve), and so do the designspec codes, which author-check hardcodes to `--strict`. All three sit
   in the REPORTS tier of the ladder, so they name the defect on every run and stop you only under
   `TASTE=1`. Two-sided: `effect-soup` is the ceiling, `plain-slideshow` the floor; directed lives between.
   There is **no show floor**: `visual-vocabulary` was deleted for measuring size wrongly (see 2a0000).
   Reach past every WARN. **A waiver must state its reason or the always-on half stops the render**
   (`author-check.mjs:74-83`, blocking, ≥12 characters per waived code). The bare `allow` array this line
   used to show is not a working incantation. The shape is:

   ```json
   "authoring": {
     "allow": ["dead-air"],
     "_why": { "dead-air": "the held frame IS the beat: the room empties and nothing replaces it" }
   }
   ```

   One `_why` key per code in `allow`; a missing or too-short one names itself and exits non-zero.
   Measured today: **33 of the 44 scenes carrying waivers have at least one bare code** and therefore fail
   author-check as they stand, which is what a documented incantation that skips half the contract buys
   you. Nothing judges whether the reason is GOOD; the cost of one sentence is the whole mechanism, because
   that cost is what turns a reflex back into a decision.
   Principles: `docs/CRAFT/DIRECTION.md`. From scratch? `docs/CRAFT/AUTHORING-WALKTHROUGH.md`.
3. **Render:** `make video D=formats/scene/<topic>.json` (runs author-check first unless `NOCHECK=1`).
3a. **IS THE EMPTY PART OF THE FRAME DOING A JOB?** Whitespace is ACTIVE (isolating the subject,
   directing the eye) or PASSIVE (what merely happened between two things placed independently). Passive
   space does not read as minimal, it reads as unfinished. Two tests, and the second decides: name what
   the emptiness is doing in one clause, then ask whether enlarging the subject removes it and improves
   the frame. If it does, that space was never working. NO GATE SEES THIS: `make audit` fires on things
   COLLIDING, never on a frame that is half empty because nobody decided anything. It is `make judge`
   and your eyes. Same doc carries the rest of the composition vocabulary for a MOVING frame: lead room
   (a subject needs space in the direction it travels, and that is fixed at the START of the shot), visual
   weight, leading lines, and three-plane depth. **[`docs/CRAFT/LAYOUT.md`](docs/CRAFT/LAYOUT.md)**.
4. **Layout audit:** `make audit`, overlap / clipped text / safe-zone / WCAG contrast (overlay → `/tmp/audit/scene.png`).
   **Shipping more than one ratio? `make audit M=<file> ASPECT=16:9,9:16,1:1,4:5` (or `ASPECT=all`).**
   A scene passes at its own aspect and is wrong at every other one: `pin` centres a *box*, so a text
   layer needs `w` (+ `align`) or it lands left-edge-on-centre; and `dx`/`dy` only apply with `anchor`.
   Both render silently. Audit every canvas you intend to ship.
   **Going to a phone feed? Set `"destination": "tiktok" | "reels" | "shorts"`** (default `web`).
   It decides the safe area, and the safe area is not a property of the shape: 9:16 for a website hero
   and 9:16 for TikTok are the same canvas, but TikTok paints a rail down the right and captions across
   the bottom. Edge keywords (`pin:"bottom"` etc.) and `col` resolve against that box, so declaring the
   destination is what keeps content out from under the chrome. One definition: `core/safe.js`.
5. **Check frames** before declaring done: `make look M=scene` / `make frame M=scene N=<n>`.
   Eyeball the hook, a reveal, and the end screen. Never silently ship an unverified video.
5a. **QA THE SEAMS, not the centers:** `make seam-check D=<file>`, pulls the frames straddling every
   transition (cut/seam/sting/beat boundary) out of the rendered mp4 and flags a luminance FLASH in the
   overlap (the black-flash / collision class every center-sampling gate misses, `docs/MISTAKES.md` #138).
   Read `/tmp/seams/<name>.png`. This is the cheapest catch for the worst bugs (another engine' hardest-won lesson).
6. **THE GATE THAT SEES: mandatory post-render:** `make judge D=<file> [VS=<brand>]` preps
   `/tmp/judge/sheet.png` + a rubric. READ the sheet and score every frame (readability · hierarchy ·
   composition · brand + asset fidelity · produced · value). `make author-check` is necessary but NOT
   sufficient: the static gates can't see composition or fidelity; this is the backstop. If your eye
   catches a flaw, it's a FIX, never a rationalization (`docs/JUDGE.md`, `docs/MISTAKES.md` #15).
7. **Motion craft:** consult `docs/MOTION-CRAFT.md` when picking presets/cuts/stings.
8. **Anti-sameness:** `make ledger D=<file>` before shipping (fails if the design repeats a shipped one);
   `make ledger-add D=<file>` after the user approves it.
9. **FRAMEWORK HARVEST: mandatory, every render, without being asked.** See below.

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
is acceptable: expansion imports all 156 block factories, which has no business in every render.

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
