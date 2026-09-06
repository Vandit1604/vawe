# AGENTS.md: authoring videos for this engine

This is the canonical, tool-neutral doctrine for the vawe video engine. It works the same way for
Claude Code, Cursor, Codex, or a human with no agent at all. Where a rule leans on a Claude Code
mechanism (a hook under `scripts/live/`, the Skill tool, a vendored skill), the rule itself still
holds everywhere: read the neutral note beside it and follow the doc it points to by hand. `CLAUDE.md`
is now a short pointer to this file, kept only so Claude Code auto-loads it.

This repo turns **one self-describing JSON → one rendered video** (30fps mp4, at any of **five**
canvases: `16:9` 1920×1080 · `9:16` 1080×1920 · `1:1` 1080×1080 · `4:5` 1080×1350 · `4:3` 1440×1080,
the table at `core/safe.js:35`; a ratio it does not name is still honoured, sized to fit the long edge
at 1920). There is exactly **one module: `scene`**, an open canvas of **24 composable layer types**
(`ls core/layers/`: adjust · beam · board · clip · component · composition · count · cursor · doc ·
globe · glow · group · html · image · lottie · paint · particles · raymarch · rect · shader · svg ·
text · three · video) plus camera · cuts · stings ·
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

## Skill router  `[eye]`

Skills below live in `skills/` as plain docs any agent can read. Claude Code also loads them on demand with the Skill tool; on any other agent, open the doc in the last column and follow it as a checklist.
**On any other agent, or with no agent, there is no Skill tool: open the doc in the last column
yourself and follow it as a checklist.** That doc is the real content; the skill is a Claude Code
shortcut to load it at the right moment.

| You are about to… | Claude Code: load this skill | Everyone: read this instead / after |
|---|---|---|
| **Write any layer** (the first move, every time) | **vawe-scene-authoring** (it loads the rules) | [`docs/RULES/INDEX.md`](docs/RULES/INDEX.md): the contract every scene obeys, then the one-page numeric rule for the thing you are writing (offsets not absolutes, ease direction, handover glide, stagger total, speed bands, video scale, text on flat). The essays below say why; the rules say the number |
| Author / edit a scene JSON or `scene.html` | **vawe-scene-authoring** | purity, tokens, motion primitives, capture + QA loop |
| Plan a new video (brief → storyboard) | **vawe-video-planning** | site-derived design language, storyboard, ledger |
| Making a specific TYPE of video (launch, explainer, talking-head, sting, demo, recreation) | **vawe-type-`<type>`** | the type's spine, blueprints, rules and worked example; `docs/CRAFT/ROUTING.md` maps a request to its type |
| Author a video **from scratch** (no brand site) | **vawe-video-planning** + read [`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md) | manufacture the four things a site gives; run the chain end-to-end |
| Fix a video that's "lots of effects, not directed" | read [`docs/CRAFT/DIRECTION.md`](docs/CRAFT/DIRECTION.md) | pacing · restraint · story placement, sourced; then `make author-check` |
| Decide what holds a short film across its cuts | read [`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md) | ~18 devices in four registers, sourced; carry two threads. A continuous object is one of them, and the one Murch ranks last |
| **Hand-write any HTML** (a hook, CTA, card, hero) | **taste-skill** → then **impeccable** | design read + 3 dials, then production craft |
| Judge / fix a design that "looks AI-generated" | **impeccable** (`critique`, `bolder`, `quieter`) | 41-rule detector + register craft |
| Add captions, or ship to a phone feed (`tiktok`/`reels`/`shorts`) | read [`docs/CRAFT/CAPTIONS.md`](docs/CRAFT/CAPTIONS.md) | timing, the safe strip per destination, `captionMode`/`captionStyle` |

### The anti-slop rule (non-negotiable)

Hand-authored HTML is where generic "AI slop" enters (centered text, Inter, blue/purple gradient, equal
card grid). **Before writing HTML by hand:**
1. Claude Code: load **taste-skill** and state the one-line Design Read; set the three dials
   (`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`); obey its Anti-Default Discipline. Other
   agents: read the same three dials into the storyboard by hand before writing any markup.
2. Prefer to **capture** a real, art-directed surface (`make capture`/`make sections`) over inventing one.
3. After authoring, run **`make designspec-check D=<file>`**. The vendored impeccable detector (no LLM). It must be
   clean of overused-font / gradient / card-in-card / centered-default tells before render.

### The five anti-slop fixes (enforced by skill + gate)

1. **Capture the art direction, don't invent it**: reflect a real source; hand-write only connective tissue.
2. **Commit + name one art direction** per video (from taste-skill's Design Read, or the same read done by
   hand). "Clean modern SaaS" is banned.
3. **`make designspec-check`** gate: fail the generic tells deterministically before shipping.
4. **Asymmetry + scale contrast are defaults**: off-center anchor; one oversized hero paired with tiny text.
5. **Distinctive type**, for a real brand, the captured brand font; for anything else, never Inter/Space Grotesk.

### Gates
Authoring quality, one command: **`make author-check D=<file>`** (always on: validate · beats · assets ·
inspect · plan-vs-render; `make video` runs it unless `NOCHECK=1`). The style gates, critique · direct ·
floor · dissolve · designspec · copy · pace, ALWAYS RUN too, but only report: `TASTE=1 make author-check
D=<file>` promotes their findings to blocking ([`docs/TASTE.md`](docs/TASTE.md)). `slop` is not among
them: retired in 2026-08. Then the eye rungs:
`make probe` → `make audit` → `make beats` → `make ledger` → **`make judge`** (the gate that SEES,
required post-render; [`docs/JUDGE.md`](docs/JUDGE.md)).

## The loop  `[ref: make list]`

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
> a one-line tweak; required for a full pass, a recreation, or anything you intend to ship. (This
> "subagent" is any agent your harness can fan out to: a Claude Code Agent tool call, a Cursor background
> agent, or a second terminal running the same instructions by hand.)

> **Making something good?** Read **[`docs/TASTE.md`](docs/TASTE.md)** first, the front door to the
> taste system (house-style · composition · motion · story-spine), the block registry (`make catalog`),
> and the author→gate→render quality loop. Everything below is the doctrine it indexes.

## "LET'S MAKE A VIDEO" IS A REQUEST TO ASK QUESTIONS, NOT A REQUEST TO START  `[gated: scripts/gates/author-check.mjs#no-storyboard]`

**Claude Code: load `vawe-video-planning` and follow it. Other agents: read
[`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md) and the planning contract
below, and follow it by hand.** Either way: do not open a JSON file first. The rule exists because
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

## THE BRIEF: what the person asking is allowed to say, and what is YOUR job  `[eye]`

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
| `bg` windows | **6** in 19.6s, bound to `cut@0..cut@3` | 1 in 5s | 1 in 28s | 1 in 82% of films |

**Every library figure below comes from `node scripts/dev/library-stats.mjs`, and none is typed by
hand.** That script measures all of them in one run against one population, prints the definition it
used for "pictorial", and is the thing to quote. It exists because these numbers were hand-measured
once and then decayed in place: three had drifted by the time `docs-drift` learned to check them (566
effects against a real 638, the arsenal census 337 against a real 445, the library 134 against 148). Re-run it before you
cite anything here, and correct the sentence if it moved.

**The population, named once so every figure here can be re-run.** "The library" means the **134
gate-visible scenes** the gates themselves reason over: `formats/scene/*.json` with `module=="scene"`,
minus derivatives and `schema.json`, `_`-prefixed scratch included. `node scripts/gates/waiver-drift.mjs`
prints that count on its first line, so it is one command away and it is the number to quote. Three
other populations exist (98 without scratch, 154 raw files in the directory) and mixing them is how this
file once cited 93, 130 and 144 as the size of the same library in three sentences. **"that film" is not
named anywhere and I could not identify it, so its two cells are unverified and marked so.**

**A FRESH CLONE SEES A THIRD OF 150, AND NOTHING IS BROKEN.** Films are gitignored on purpose
(`.gitignore:61`: a video instance is not the framework), with an allowlist for the handful the site
needs. So `waiver-drift.mjs` prints `WAIVER CENSUS · 150 scenes` on this machine and about a third of
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

## Content philosophy (what makes these good: follow it)  `[eye]`

Every video is built on **hook → suspense → payoff**. The data must earn attention:

- **Never spoil the payoff.** The hook poses a question / open loop; the answer lands at the end.
- **Build to a shocker.** Order beats so the most counterintuitive, "no way" moment is last.
- **Be honest.** The on-screen copy must be true. No clickbait the video can't pay off.
- **Stakes + a human line.** A surprising, specific fact beats a dry number.
- **Numbers:** use real, accurate figures. The `count` layer compacts ≥1e6 (`2500000000` → `2.5B`);
  use a unit suffix for small numbers (`unit: "$B"`, value `880` → `$880B`).

## Hard rules  `[built: core/validate.mjs:764]`
- **No em-dashes (U+2014) in any on-screen text**: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- Text may contain `<b>…</b>` / `<em>…</em>` (rendered as HTML). Keep names short (they sit in cards).

## Launch-video rules (standing, asked for directly: apply to every launch film)  `[live: scripts/live/craft-live.mjs]`

**This rung is a Claude Code hook that speaks at save-time. On any other agent there is no keystroke
warning: treat this whole section as `[eye]` and check it yourself before every render.**

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

## Reflecting a real website (capture-first: the taste is already on the page)  `[ref: make sections]`

Never rewrite a site's sections by hand; you'll lose its taste and ignore half its assets. **Capture the
real blocks instead**, and the ordered procedure lives in
[`docs/CRAFT/RECREATION.md`](docs/CRAFT/RECREATION.md) step 2: inventory every section and LOOK at the
shots, storyboard one beat per section in the site's order, target the UI cluster rather than the whole
block, when a screenshot is the only option, and the one job hand-written HTML still has.

> **Reflecting a real FILM? `make study VIDEO=refs/ref.mp4 NAME=ref`.** `make sections` reads a website;
> nothing here read a film, so every reference this repo argues from was studied by eye once and the study
> was lost. `study` probes the file, detects the shot boundaries, cuts a sheet with the in/mid/out frame of
> every shot, and writes `refs/<name>/study.md` with four judgement columns for you to fill. It measures
> duration, resolution, fps and the cuts; it never guesses what moves or what triggers the next shot.
> Hard cuts come back exact, dissolves score nothing and it says so instead of inventing a list. `refs/`
> is gitignored on purpose: take the grammar, never the frames. **[`docs/CRAFT/REFERENCE-STUDY.md`](docs/CRAFT/REFERENCE-STUDY.md)**.

## REACH FOR HTML FIRST. A LAYER IS FOR WHERE IT HELPS.  `[eye]`

**If you are hunting for the prop that does the thing CSS already does, stop and write the CSS.** A
gradient-filled word with a bloom behind it is four declarations, and it took three failed attempts
through the layer vocabulary to not get it. Reach for a layer TYPE when it does something you would
otherwise hand-roll: `text` measures and fits, `count` counts, `component` captures a real product
surface, `group` scopes a box AND a clock.

**EVERY LAYER EFFECT WORKS ON AN `html` LAYER, and that is the architecture, not a coincidence.** So
the choice is never "HTML or effects". It is HTML for what the frame LOOKS like, and the engine for
what it DOES over time. Two refusals stand in the way and both are deliberate: no CSS `animation` or
`transition` (they run on a clock the renderer does not own, so a seeked frame would be wrong), and no
`opacity` or `filter` in `css` (the engine writes both every frame).

Which effects were verified stacked on one fragment, what to use instead of each refusal, the four ways
a fragment moves, and the traps that cost a render each:
[`docs/CRAFT/HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md).

## BLACK MEANS `#000000`  `[built: core/backgrounds/presets.js:117]`

When a brief says black, it means black. Every OTHER dark preset in `core/backgrounds.js` carries a tint
or a wash: rendered on the vawe theme, `dark`, `deep` and `ink` all sample `rgb(12,18,26)` at the corner,
which is right for a film with a lit world and wrong for one whose only light is the subject. So write
`{"preset": "black"}`. It is a solid `#000000` with no grain, it renders `rgb(0,0,0)` at every corner,
and the engine reads its lightness off that colour, so you do not type a tone. The preset does the work
the engine cannot do from your CSS: it cannot read lightness out of hand-authored HTML, so `black` carries it.

## NAME THE EFFECT BEFORE YOU BUILD IT  `[eye]`

When a reference shows a look you cannot immediately construct, **find out what it is called and read
its recipe.** Do not approximate it by eye and iterate. An effect a designer has made before has a name,
the name leads to a sequence of steps, and one of those steps is always the thing you would never have
guessed. That cost four rejected renders once: a stack of coloured, offset, blurred copies of a word
cannot make what a **thermal blur** makes, because its colour is a gradient map on luminance and not
paint (`docs/MISTAKES.md` #505).

**Why the pull toward guessing is real**, so you can watch for it: iterating looks like progress,
because each attempt is a render you can show, and searching produces nothing to show.

**Claude Code: load the `vawe-name-the-effect` skill the moment a reference arrives and you cannot name
what you are looking at. Other agents: open the same skill's markdown under `skills/` (or read
it as a plain doc) and work through it by hand.** It carries the three questions in order, the
plain-words to After-Effects vocabulary table, and where the effect goes afterwards so the next author
inherits the name rather than the guess. That second half is not optional.

## Hand-writing HTML? Beat the AI slop (see the anti-slop rules above)  `[gated: scripts/gates/designspec-check.mjs#off-colour]`

Hand-authored HTML regresses to the mean: centered text, Inter, blue/purple gradient, equal card grid.
And a fragment animated with CSS renders as a **dead still**, because the engine refuses `animation` and
`transition` at boot. `parts` is the answer almost nobody reaches for: a CSS selector into your own
markup, and every matched element gets an engine-driven, SEEKED entrance with a stagger, plus a paired
exit. 8 of 164 scenes use it, against 62 that carry an `html` layer.

**Load [`docs/CRAFT/HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md) before you write one by hand.** It
carries the four ways a fragment moves, the three refusals and what to use instead, the traps that each
cost a render, the defaults to reach past, and which skills to load (Claude Code) or read (everyone
else; see the Skill router above). **Then gate it two ways, and know
which one sees what:** `make preview HTML=<frag>` reads the FRAGMENT in a real browser, `make
designspec-check D=<file>` reads the SCENE. Both must be clean before you render.

## Icons & images (real assets first, emoji last)  `[live: scripts/live/craft-live.mjs]`

**This rung is a Claude Code hook. On any other agent, treat it as `[eye]`: check it by hand.**

**Always prefer a real image**, and captured real UI (`make capture`) is the highest-taste source. The
rest of the ladder, and the treatment every image needs so it does not read as slop:
[`docs/CRAFT/IMAGERY.md`](docs/CRAFT/IMAGERY.md).

**Use `make assets` for logos. A bare `curl` writes a zero-byte file on a 404 and you get an invisible
hole**, which is what two shipped assets were in until `core/boot.js` learned to refuse an asset that
never loaded. IMAGERY.md §0 has the incident and the `curl -f` form if you must do it by hand.

**Never embed copyrighted material** into a published video: movie/TV posters, album covers, film
stills, news photos, paid stock. They trigger Content ID claims. Capture the real product UI instead.

## THE PROCESS HAS ONE OWNER, AND IT IS NOT THIS FILE  `[ref: make ship]`

`make ship D=<file>` is the process. It **declares its own ladder before it runs**: every step, in
order, what that step reads, and whether it can stop you. Twenty steps today, and the number moves
without this paragraph having to be edited, which is the entire reason it is stated there and not here.

**This is the ONE spine. Every other doc names these same phases in these same words**, and shows
`author-check` / `video` / `beats` / `reveal` / `ledger` only as the STEP a phase runs, never as a
rival finish line.

| phase | what it is | steps it runs |
|---|---|---|
| `make preflight D=<file>` | the 9 decisions before any JSON | the decision chain (`docs/CRAFT/README.md`) |
| `make dev D=<file>` / `make studio D=<file>` | the iteration loop | `./bin/vawe --draft`, no gates, no audit |
| `make check D=<file>` | every gate, every finding, ZERO consequence | `author-check` in report mode |
| `make ship D=<file>` | the ladder with its teeth in, in order | `author-check` → `./bin/vawe` (render) → `audit` → `seam-check` |
| `make judge D=<file>` | the eye, MANDATORY post-render, the only step that SEES | read with `make beats` / `make reveal` / `make look` |
| `make ledger D=<file>` / `make ledger-add D=<file>` | prove it is not a repeat, then log it | run before shipping, logged after the user approves |

Reaching `make judge` is not the stop: load `vawe-review-loop` (`skills/vawe-review-loop/SKILL.md` for
an agent with no Skill tool) for the written rule on when to stop iterating, fix, and look again.

The gates now say what they check, and a finding **names the doc that settles it**, so what is left here
is the part no gate can hold: why, and what to do when the gate is quiet.

### Where to start, every time

**`make preflight D=<file>`.** It puts the nine-step decision chain from
[`docs/CRAFT/README.md`](docs/CRAFT/README.md) in front of you for THIS film, ranks the arsenal against
what the film says it is, and records a receipt that goes stale the moment the scene changes. The chain
is ordered because each decision constrains the next: beats → the anchor → the per-beat effect →
type/colour/layout/imagery → density → show-or-tell → what holds it across cuts → restraint → sound.

**`make arsenal Q="<what you mean, in plain english>"`** searches all 788 named things at once and
prints the snippet with the key it goes in (`make effects` regenerates the full reference,
`docs/EFFECTS.md`, 693 effects across 56 families). Reach for it before you invent anything. The measured cost
of not doing so: the `{type:"beat"}` blueprint mechanism is used by a handful of gate-visible scenes (3
of 149 when last measured; run `node scripts/gates/waiver-drift.mjs` for the current count), and 12 of
its 19 beats have never been used once.

**`make schema AT="layers[].motion[]"`** answers the other half: not what the engine can DO, but what you
may WRITE at one path, with every field's type and its written label, read live from
`formats/scene/schema.json`. Ask it instead of guessing a field name. It exists because a guess
(`in`/`out` for a keyframe's two bezier handles, which are `easeIn`/`easeOut`) shipped a refusal that
rejected three correct films, while the schema had the answer all along and served it to nobody. No
`AT` prints the top-level shape; a partial path (`AT=motion`) is found rather than refused.

**`make track SHAPE=pan|blast|drift|enter|exit`** emits a hand-keyed `motion` track from a shape
measured off the two reference films. Use it instead of naming a preset. See the next section for why.

## AUTHOR THE MOTION. DO NOT NAME IT.  `[gated: scripts/gates/author-check.mjs#no-authored-motion]`

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

## SHOW, DO NOT ONLY TELL. NOTHING ENFORCES THIS.  `[eye]`

Every beat that makes a claim must be asked what it could SHOW instead of set in type. **DECORATION**
dresses the frame and carries no information. **EXPLANATION** does work the words cannot. A film can
drown in the first and have none of the second.

**There is no show floor, and you should know why.** `visual-vocabulary` measured a layer's area and
its size helper squared any layer that declared one axis, so the one gate whose job was to tell a mark
from a picture handed a pass to a hairline. It was deleted. **You are the check now**, with `make
judge` and your eyes. No green tick will tell you a film is only type.

Measured over the gate-visible scenes: **64 of 149 carried zero pictorial layers of any size, last
measured** (run `node scripts/gates/waiver-drift.mjs` for the current count). That was nobody's
decision. It is debt, not a pattern to copy. What counts as explanation, the three questions
the deleted gate asked and where to get the graphic:
[`docs/CRAFT/SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md).

## A SLIDESHOW IS A FAILURE, AND A RESIZING BOX IS NOT THE ONLY WAY OUT  `[gated: scripts/gates/direction-floor.mjs#no-continuous-object]`

The failure is easy to feel: every beat is born and dies inside its own window, so each cut is a jump
between unrelated shots and the film is a stack of cards read aloud.

The cheapest device is a CONTINUOUS OBJECT: one layer that survives a cut and changes across it. It is
one device of many, and **Murch ranks it last** of the six things a cut must
serve, so it is the first thing you sacrifice. `no-continuous-object` credits the two devices the engine
PRODUCES and can verify, a continuous object and a match cut (`matches`/`becomes`). It cannot verify a
oner, a sound bridge, a metric cut rate, a motif or an escalation, because those are conceptual and no
static gate can confirm one. So a film held by one of THOSE is not a failure and does not fake a
continuous object to pass: it declares the real device in a reasoned waiver,
`{"authoring":{"allow":["no-continuous-object"],"_why":{"no-continuous-object":"held by <device>: <how>"}}}`,
which is a structural decision someone wrote down, not an admission. The catalogue of what else can hold
a film, Murch's ranking with its percentages, and a six-question decision aid:
[`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md).

**Name three ways this film could hold its subject, and reject the first one.** If the answer is always
"the layer resizes", you are writing a gate's minimum rather than a film. Three consecutive films here
were one rectangle changing size, and each passed everything.

## A DEMO IS A TEN-SECOND FILM ABOUT ONE THING  `[ref: make demo]`

**27 of the 35 `formats/scene/_*.json` scratch scenes are contact-sheet shaped**, and none of the 35
paints a second `bg` window. They are the worst-looking work in the repo and they are the ones we end up
showing people, because a demo's job is "prove the mechanism works" and no step of the taste ladder
fires for a throwaway. A shared theme was never the missing piece: all 35 already declare one. The
missing piece was the archetype, and a blank file has none.

**`make demo Q="…" [NAME=…] [FX=…] [SUBJECT=…]`** writes the archetype and runs the dev loop on it.
Why the subject must be a PICTURE, why every one of its constants is fixed, and when the honest answer
is `make catalog` instead: [`docs/CRAFT/SPECIMEN.md`](docs/CRAFT/SPECIMEN.md).

## THE BACKGROUND MUST MOVE, AND YOU MUST WATCH IT MOVE  `[live: scripts/live/scene-live.mjs]`

**This rung is a Claude Code hook that fires on save. On any other agent, treat the whole section as
`[eye]`: run the same check by hand, on every save.**

`bg` is required, so the backdrop is always your decision. A static field is a choice you have to
justify, never a default. **A backdrop that changes PER BEAT is the cheap thing to write**: list the
windows in the order the film turns, give none of them a `from`/`to`, and the engine binds window i to
the joint after it (`core/junctions.js`), so the cuts you already wrote own the numbers.

This is the strongest single lever in the file. brew inverts the tone of the world on four of its five
cuts and spends its one accent window on the logo reveal, while **81% of gate-visible scenes (121 of
149, last measured; run `node scripts/gates/waiver-drift.mjs` for the current count) paint ONE window
for the whole runtime**. A pictorial beat on a dead backdrop is still a slide.

**HALF OF THIS IS LIVE NOW, AND IT IS THE CHEAPER HALF.** `scripts/live/scene-live.mjs` fires on every
save of a scene JSON and says so when a film paints one `bg` window for its whole runtime, with the 82%
beside it. What it CANNOT see is whether the window that is there actually moves, at what speed, or at
what scale: it counts windows, and a window can hold a dead field. So the second paragraph is still
yours.

Then **judge it across frames, never on one still**: pull 4+ timestamps and compare them as a strip. A
still hides speed, scale and direction. A background was once "matched" on one frame and was, in
motion, twice too fast with folds half the size (`docs/MISTAKES.md` #155).

## NO RULED GRID UNLESS SOMEBODY ASKED FOR ONE  `[gated: scripts/gates/designspec-check.mjs#ruled-grid]`

A ruled line grid is a design tool's canvas. Put one behind a film and the film reads as a mock-up of
itself, which is why it never arrives as a default any more. `blobs` used to bake `grid: true` into the
preset, so `"preset": "blobs"` painted a blueprint the author never wrote: silent substitution, the
exact failure the harvest table names. It does not now.

**Want one? Write it: `grid: true` on a `softwash` fx**, with `gridColor`, `gridAlpha` and
`gridSpacing` beside it, and be able to say in one clause what the grid is doing. Hand-written CSS has
no single write site, so `make designspec-check` warns on `ruled-grid`: two `repeating-linear-gradient`
rules crossing axes in one fragment. One axis is scanlines and stays quiet. Waive it in the scene with
a `_why`. **Four films rule a grid by hand today, and none of them wrote it down.**

## SILENCE IS A DEVICE, NOT A DEFAULT  `[gated: scripts/gates/audio-check.mjs#silence-without-a-reason]`

**83% of gate-visible scenes ship mute** (123 of 149, last measured; run
`node scripts/gates/waiver-drift.mjs` for the current count): 17 carry no `audio` key at all and 106 declare
`silent: true`. Of those 106, **only 26 say why**. So the sentence to remember is not "nobody declares
the silence", it is "nearly everybody declares it and almost nobody justifies it". That closes the
whole aural family of structural device: the sound bridge, music-led structure, the unfinished
sentence. A sound bridge is also a continuous object the picture never has to carry.

Give every film sound, or state the silence: `"audio": {"silent": true, "_why": "…"}`.
[`docs/CRAFT/SOUND.md`](docs/CRAFT/SOUND.md).

## IS THE EMPTY PART OF THE FRAME DOING A JOB?  `[eye]`

Whitespace is ACTIVE (isolating the subject, directing the eye) or PASSIVE (what merely happened
between two things placed independently). Passive space does not read as minimal, it reads as
unfinished. Two tests, and the second decides: name what the emptiness is doing in one clause, then ask
whether enlarging the subject removes it and improves the frame. If it does, that space was never
working.

**NO GATE SEES THIS.** `make audit` fires on things COLLIDING, never on a frame that is half empty
because nobody decided anything. Same doc carries lead room, visual weight and three-plane depth:
[`docs/CRAFT/LAYOUT.md`](docs/CRAFT/LAYOUT.md).

## What the gates cannot do, so you must  `[eye]`

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
- **Eyeball real frames**: `make look D=<file>` / `make frame D=<file> N=<n>`. Never ship a film whose
  hook, reveal and end card you have not actually looked at.
- **Narrated?** Pace the picture to the voice: `make pace-from-vo VO=<file>.words.json`.
- **`make ledger`** before shipping, `make ledger-add` after the user approves.

## Waivers, legacy, and the difference  `[gated: scripts/gates/author-check.mjs]`

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

## WHAT THIS ENGINE TOOK FROM THE AGENT HARNESS, AND WHERE IT LIVES  `[ref: make rung]`

An agent works here through Claude Code, and several of that harness's mechanisms answer problems this
repo also has. They were adopted one at a time, by different people, without anything writing down the
correspondence, so the same idea kept being re-invented under a new name. This is the map. **When you
adopt another one, add its row and give it a rung**, or the next author will build a third copy.

**On an agent other than Claude Code, the harness-specific rows still name the right pattern; only the
Claude Code mechanism in the third column is missing.** A hook that speaks mid-task, a Skill loaded on
demand: build the equivalent by hand (read the doc, run the check yourself) and the row still holds.

**The organising idea is the RUNG LADDER**, and it is the harness's own lesson: a rule enforced by the
system beats a rule an agent is asked to remember. `make rung` prints the current
distribution and `node scripts/gates/rung.mjs --list` prints the worklist, so the numbers are one command away and are not repeated
here. Highest rung wins:

```
[built]  the engine makes it true          a wrong value cannot be written
[gated]  a gate refuses it                 the push stops
[live]   something says it while you write a hook speaks at the keystroke (Claude Code only; elsewhere, check by hand)
[ref]    a command answers it on demand    you have to ask
[eye]    nothing but the sentence          you have to remember
```

| the harness does | this engine does | where |
|---|---|---|
| PostToolUse hooks that speak mid-task | the `[live]` rung: a hook reads what you just saved and answers | `scripts/live/*.mjs`. Claude Code auto-runs them via a local `.claude/settings.json`; any other agent or CI runs `node scripts/live/<name>.mjs <file>` itself |
| deferred tools, fetched by search rather than all loaded | `make arsenal Q="…"` over every named thing, and `make schema AT=…` for what is legal at one path | `scripts/author/arsenal.mjs`, `scripts/author/schema-at.mjs` |
| skills: instructions loaded only when the task needs them | `docs/CRAFT/*.md`, and a finding NAMES the doc that settles it | `docs/TASTE.md` indexes them |
| structured tool results instead of scraped prose | gate findings as data, not regex over a message | `scripts/lib/findings.mjs` |
| a subagent's context stays out of the main thread | one critic, one job, one input path, a fixed verdict shape | `docs/CRAFT/SUBAGENTS.md`, budget in `docs/CRAFT/SUBAGENT-BUDGET.md` |
| refusing an invalid call at the tool boundary | refusing at the WRITE SITE, so the bad state is unrepresentable | `core/registry.js`: `checkBlurb`, `checkCovered`, `checkCatalog` |

**Three rules that keep this from drifting, and each one was paid for.**

**A gate is the LAST resort, and a ratchet is what you write when zero is not reachable.** If the bad
value has a write site, the refusal goes there and the class ends; a gate that runs afterwards only
promises to notice. Where a clean state genuinely cannot be reached today, the number goes in
`verify/*-ratchet.json` and may fall but never rise. Lower one deliberately with `--stamp`, never to
quiet a complaint.

**A search that says ABSENT about something present is worse than one that stays quiet**, because it
ends the looking. Two of these shipped: 131 registry entries carried no blurb, so they were reachable
only by someone who already knew the name; and the block library was not in the search corpus at all,
so `make arsenal Q="a terminal window"` answered "assume the engine does not have it" about 95
families the engine has. Both are why `checkCovered` refuses at load now.

**A blurb is not optional, and there is no exemption to ask for.** Every registry entry and every block
row must carry one, refused at load by `checkCovered` and `checkBlurb` in `core/registry.js`. The one
opt-out that existed, for the 42 easings, is gone along with the mechanism: it was a reason to write
them well, not a licence to leave 42 capabilities reachable only by someone who already knew the name.

**A threshold is a property of the corpus, not a constant.** `CONFIDENT` in `scripts/author/arsenal.mjs`
is the midpoint between two measured query sets, and both sets are asserted in `lib-test`. Change what
the engine contains and it must be re-measured, THROUGH that file's own `toks`: a pass that used a
hand-rolled tokenizer instead produced numbers that were all wrong in the same direction.

## Changing the ENGINE, not a film? The doctrine is one file away  `[live: scripts/live/craft-live.mjs]`

**This rung is a Claude Code hook. On any other agent, treat the two path-decidable triggers below as
`[eye]`: check them yourself on every save.**

Five rules govern any change to `core/`, `internal/`, a gate or the capture path, and they live in
**[`docs/CRAFT/ENGINE-CHANGES.md`](docs/CRAFT/ENGINE-CHANGES.md)** rather than here, because this file
is addressed to somebody authoring a film. Their triggers stay, because a rule you do not know exists
is a rule you cannot go and read. Two of the five are decidable from a path, so
`scripts/live/craft-live.mjs` says them at the keystroke: a save under `internal/scene` or
`internal/render`, and a new file under `scripts/gates/`. The other three are not decidable from a
filename, and the hook says nothing about them rather than guessing:

- **About to write a gate?** A gate is the LAST resort. If the bad value has a write site, the refusal
  goes there and the whole class of bug ends. A gate that runs afterwards only promises to notice.
- **Adding an authoring convenience?** Sugar either resolves at boot or its absence fails loudly.
  Silence is never the third option: a field written and never read is the failure this repo pays for most.
- **Adding an effect, a layer type, a block or a camera move?** Use one of the three existing extension
  primitives rather than inventing a fourth, and check whether an owner for the fact already exists.
- **Touched the capture path?** `internal/scene`, `internal/render`, a Chrome flag, the worker count,
  anything on `.hs-layer` or `#cam`: render one film before and after and put both wall-clock times in
  the commit body. A correctness fix may cost speed. Not knowing what it cost is the failure.
- **After EVERY render**, list every problem you hit and classify each one: framework bug (fix the
  engine now, delete the workaround), gate gap (sharpen the gate or its message), or authoring choice
  (fix the JSON). A workaround is a bug report. Log every framework-class finding to `docs/MISTAKES.md`.

> **Editing `scene.html`?** Claude Code: read the `vawe-scene-authoring` skill first (render-frame
> purity, tokens, motion primitives, image/capture system, QA loop). Other agents: read the same content
> under `skills/vawe-scene-authoring/` directly. System map: `docs/CODEMAPS/ARCHITECTURE.md`.
> Run `make probe` after scene-logic changes and `make review` for a fast health snapshot.
