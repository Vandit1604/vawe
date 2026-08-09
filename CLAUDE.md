# CLAUDE.md — authoring videos for this engine

This repo turns **one self-describing JSON → one rendered video** (30fps mp4, portrait 1080×1920 or
landscape 1920×1080). There is exactly **one module: `scene`** — an open canvas of composable
primitives (text · image · component · rect · group · glow + camera · cuts · stings · captions). **No
templates.** You do not pour data into a canned layout; you compose each video from the vocabulary in
`docs/PRIMITIVES.md`. Your job when asked to "make a video about X" is to **write a scene JSON**
(and capture the real assets it needs), then render it. You do **not** edit `scene.html` or the Go
renderer unless explicitly asked.

> **Reflecting a brand/website?** `make sections` + `make palette` (eyedrop) builds the colours pack + fonts +
> favicon; `make sections URL=… NAME=…` inventories every real section to reflect. Design knowledge
> lives in **`docs/DESIGN-DATABASE.md`**; the primitive vocabulary in **`docs/PRIMITIVES.md`**; motion
> rules in **`docs/MOTION-CRAFT.md`**. **Use ONLY the site's colours** and respect dominance
> (white-first vs dark).

## The loop

```bash
make list                              # shows the scene module + its schema/sample
./bin/vawe path/to/video.json     # module read from JSON → out/<name>.mp4
make video D=path/to/video.json        # same, via make   (add --draft to bin/vawe for fast no-grain)
```

Every JSON **must** start with `"module": "scene"`. Save new videos as
`formats/scene/<topic>.json` (siblings of `sample.json`). Always read `sample.json` and an existing
video (e.g. `linear-30.json`) first as working references, then compose — never copy a structure wholesale
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

> **Making something good?** Read **[`docs/TASTE.md`](docs/TASTE.md)** first — the front door to the
> taste system (house-style · composition · motion · story-spine), the block registry (`make catalog`),
> and the author→gate→render quality loop. Everything below is the doctrine it indexes.

## Content philosophy (what makes these good — follow it)

Every video is built on **hook → suspense → payoff**. The data must earn attention:

- **Never spoil the payoff.** The hook poses a question / open loop; the answer lands at the end.
- **Build to a shocker.** Order beats so the most counterintuitive, "no way" moment is last.
- **Be honest.** The on-screen copy must be true. No clickbait the video can't pay off.
- **Stakes + a human line.** A surprising, specific fact beats a dry number.
- **Numbers:** use real, accurate figures. The `count` layer compacts ≥1e6 (`2500000000` → `2.5B`);
  use a unit suffix for small numbers (`unit: "$B"`, value `880` → `$880B`).

## Hard rules
- **No em-dashes (—) in any on-screen text** — the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- Text may contain `<b>…</b>` / `<em>…</em>` (rendered as HTML). Keep names short (they sit in cards).

## Launch-video rules (standing, asked for directly — apply to every launch film)

1. **Check EVERY page, not the homepage.** `make sections` inventories one URL. Crawl the whole site
   (routes, view modes, empty states) before storyboarding — tpot's real product turned out to be
   `/dir` with its LIST/CARD/BUBBLE toggle, which the homepage never shows, and the payoff shot came
   from a view no landing page links to.
2. **Give the logo prominence.** A mark sized like a bullet next to a headline reads as punctuation.
   It should be a deliberate element (~100px+ beside a title, 150px+ on the end card), not a marker.
3. **Pair entrances with their exits, directionally.** A layer that enters from the right should leave
   to the left — one continuous direction of travel per beat, never enter-and-retreat. Use
   `anim:"slide-right"` + `out:"slide-left"`.
4. **Blur out when moving would fight the content.** `out:"defocus"` leaves through focus instead of
   through space. Correct for faces, cards and dense grids, where sliding 50 elements reads as chaos.
5. **A changing word belongs in a fixed box.** If one word swaps mid-sentence, put it in a fixed-width
   chip so nothing after it reflows — and the chip is the natural place for the brand colour.

## Reflecting a real website (capture-first — the taste is already on the page)

Never rewrite a site's sections by hand; you'll lose its taste and ignore half its assets. Instead:
1. `make sections URL=… NAME=<brand>` — inventory every section (screenshot each + `sections.json`
   with a stable selector + a ready `make capture` command per block). **Look at the shots.**
2. Storyboard **one beat per section, in the site's order.** `make capture` the real block → a crisp,
   live `component` (target the UI cluster, e.g. `SEL='section:nth-of-type(2) [class*=illustration]'`,
   so there's no duplicate headline over your kinetic one). Real logos, gradients, copy come free.
   Only a true `<canvas>`/WebGL section can't DOM-capture → then use the section screenshot as a clipped
   `image` layer with `ken`. Animate it OUR way (window / cut / camera / staggered parts); re-type copy
   with an overlaid `type` layer, never by editing captured glyphs (purity + font faithfulness).
   Preview any capture standalone first: `make preview HTML=<component>.json THEME=<brand>`.
3. Hand-write HTML **only** for connective tissue — hook, CTA, counters. Preview every hand fragment
   before rendering: `make preview HTML=frag.html THEME=<brand>` → `/tmp/preview.png` (Read it, fix, repeat).

## Hand-writing HTML? Beat the AI slop (see `AGENTS.md`)

Hand-authored HTML regresses to the mean — centered text, Inter, blue/purple gradient, equal card grid.
Before writing any by hand, **load the relevant [`docs/CRAFT/`](docs/CRAFT/README.md) guide** (how to choose
a face / palette / layout / image), then the **`taste-skill`** (state the Design Read + set VARIANCE/MOTION/
DENSITY dials, obey Anti-Default Discipline), then **`impeccable`** for craft. Skills are vendored in `.claude/skills/`.
Defaults to reach past: **asymmetry over centered · scale contrast (one huge hero + tiny caption) · a
committed non-generic face** (the real brand font when reflecting a brand; never Inter/Space Grotesk for
anything generic). Then gate it: **`make slop D=<file>`** runs the impeccable detector (41 rules, no LLM) —
it must be clean before you render.

## Icons & images (real assets first, emoji last)

**Always prefer a real image.** Order of preference:
1. **Captured real UI** — `make capture` (a live component) is the highest-taste source.
2. **Free/openly-licensed images** — brand logos `curl https://cdn.simpleicons.org/<slug>/<hex>` →
   `assets/icons/`; flags `flagcdn.com/<iso2>.svg` → `assets/flags/`; CC0/CC-BY photos
   via `make photos` (attribution auto-recorded; CC-BY needs visible credit).
3. **Drawn icons** — `svgIcon(name)`. 4. **Generated cards** — `make assets`. 5. **Emoji** — last resort.

**Never embed copyrighted material** into a published video: movie/TV posters, album covers, film
stills, news photos, paid stock. They trigger Content ID claims. Capture the real product UI instead.

## After writing a JSON

1. **Images:** `make assets D=formats/scene/<topic>.json` fills any missing icons. Dry-run; add `WRITE=1`.
2. **See it beat-by-beat:** `make beats D=<file> [VS=<brand>]` → `/tmp/beats/<name>.png` (first/mid/last of every
   beat; `VS` stacks each beside its source section). Read it — catch murk/overlap/off beats before rendering.
   **Iterate live, no render:** `make studio D=<file>` serves the scene with a frame scrubber (scrub/step ·
   space plays) — edit the JSON, reload, watch the motion, before you spend a 30-60s mp4 render. Under the
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
   were. Size is the whole point: `creed-launch` carries 19 pictorial layers and every one is a small logo,
   so a graphic is only the subject at roughly 8% of the canvas or more. How to decide what to show and how:
   **[`docs/CRAFT/SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md)**. 52 of the 93 scenes in this library
   carried no large picture at all when this was last measured. That was nobody's decision, and it is debt,
   not a pattern to copy.

   **NOTHING ENFORCES THIS. There is no show floor any more, and you should know why.** A gate called
   `visual-vocabulary` used to fail `no-visual-vocabulary` here, and it was deleted in 2026-08. It measured
   a layer's area, and its size helper squared any layer that declared one axis and had no readable
   intrinsic aspect: a 590x18 decorative underline was scored as 590x590 and credited with a tenth of the
   frame. So the one gate whose entire job was to tell a mark from a picture handed a pass to a hairline.
   It was also waived by 30 of 130 films, which is a rule that has already been repealed with nobody
   writing it down. Fixing the arithmetic would have made it true and then failed about 52 shipped films,
   so it went. `docs/TASTE.md` records the cull and what would have to be true to bring it back.
   The reasoning above is unchanged and still worth following. What changed is who checks: **you do, with
   `make judge` and your eyes.** No green tick will tell you a film is only type. That was always the case,
   because even at its best the gate could prove a picture was on screen and large and could never prove it
   explained anything, a big decorative photograph passed it and deserved to fail a human.

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
   **The gate is OPT-IN**: `TASTE=1 make author-check D=<file>`, or `make direction-floor D=<file>`. When
   you run it, `no-continuous-object` blocks; if the film declares no cuts, boundaries are INFERRED from
   where the visible content set turns over wholesale, and that half warns (`no-continuous-object-inferred`,
   promoted to a block under `STRICT=1`), because a build should not fail over a cut the author never wrote.
   **Run it when the CONTENT is continuous**: a single-subject product film, a process shown end to end, a
   demo where the UI is the subject. There the rule is right, and it is right because of the content, not
   because films must be that shape. Do not run it on a manifesto, a vignette anthology, a comparison built
   on the junction, or a metric-cut list film. It will be wrong about all four.
   **Know the limit.** The gate can see that a prop survives a junction and moves. It cannot see whether
   that prop BECOMES the next thing, which is the difference between a travelling card and a subject.
   **Read the eighteen waivers as evidence about the rule, not about the films.** Eighteen short films here
   carry a `no-continuous-object` waiver. A rule waived by reflex has already been repealed and nobody
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

2a0. **THE BACKGROUND MUST MOVE, AND YOU MUST WATCH IT MOVE.** `bg` is a required field, so the backdrop
   is always your decision. Make it a living one, a preset or hand-authored (`{"html":…}` driven by
   `var(--t)`); a static field is not a default, it is a choice you have to justify. Then **judge it across
   frames, never on one still**: pull the same 4+ timestamps and compare them as a strip. A still hides
   speed, scale and direction of the motion. Recreating a reference? Strip the reference and your render
   side by side and match the pace and the size of the shapes before touching colour. This is written down
   because a background was "matched" on one frame and was, in motion, twice too fast with folds half the
   size (docs/MISTAKES.md #155).
2a. **See the REVEAL, not just the hold:** `make reveal D=<file>` → `/tmp/reveal/<name>.png` (per beat: the ENTER
   arc + settled + EXIT arc, from exact layer starts). `make beats` samples the middle and hides the
   entrance motion; this shows HOW each beat animates in (dolly direction, typing, a colour-wave). Mandatory
   when recreating a reference — judging the settled frame is how the dolly/gradient/colour-wave got missed.
0. **Compose from blueprints (don't re-derive motion):** `make blueprints` lists directed-motion beats
   (`{type:"beat","beat":"kineticHook",…}`, `docs/CRAFT/BLUEPRINTS.md`). Drop one per beat + fill brand
   content so kinetic reveals / count-ups / cascades / dashboard dives are the DEFAULT, then `make expand`.
   Authoring plain `rise`+`fade` from a blank JSON is the #1 failure — blueprints + the floor prevent it.
0a. **See the whole arsenal, then choose:** `make effects` → `docs/EFFECTS.md` (240 effects, 15 families,
   generated from the registries). The killer per-frame effects: border-beam / shine (`{type:"beam"}`),
   aurora / meteor paint fields (`{type:"paint"}`), a one-shot glow `flash`, an svg logo that draws-on or
   shape-morphs (`{type:"svg","morph":{"to":…}}` / the `logoReveal` beat), and calculated camera moves
   (`"cameraMove":{"move":"diveIn",…}`, `core/camera-moves.js`). For a HERO beat whose choreography
   `parts`/blueprints can't express (overlapping tweens, a token travelling a path while a counter ticks
   and a check draws), author a bespoke **`composition`** — a first-party hand-authored per-beat GSAP
   timeline in `core/compositions/index.js`, named from the JSON (`{type:"composition","comp":…,"props":…}`)
   so untrusted input can't inject (`docs/CRAFT/AUTHOR-THE-FRAME.md`). Skills: **`vawe-effects`** (pick from
   the arsenal), **`vawe-animation`** (how motion should feel + `springEase`), **`vawe-camera`** (camera work).
2b. **MANDATORY authoring ladder:** `make author-check D=<file> [VS=<brand>]` — one command runs the
   static quality loop. It has two halves.
   **ALWAYS ON** (validate · beats · **assets** · inspect · **plan-vs-render**): these catch a film that is
   BROKEN, and cost about a second.
   **OPT-IN, behind `TASTE=1`** (critique · direct · **direction-floor** · dissolve · slop · **designspec** ·
   **copy**): these check house style, which is an argument rather than a fact, and they were fitted to a
   library this file calls debt. Run them on anything you intend to ship:
   `TASTE=1 make author-check D=<file>`. The run names what it skipped. Why they are opt-in, and what would
   have to be true to switch one back on: **`docs/TASTE.md` · "What was culled, and why"**.
   The **designspec lock** flags off-palette colours / non-role fonts (the
   theme is the locked look). The **copy** gate flags on-screen writing tells (weak hook, marketing jargon,
   restated headline, a big number as flat text). The **assets** preflight confirms every referenced image /
   icon / capture / VO exists before you render. The **inspect** step verifies a `.intent.json` value
   contract — generate one from the storyboard with `make intent SB=<storyboard.md> D=<file>` so "every beat
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
   By default it **blocks** on schema/em-dash and on timeline holes. Under `TASTE=1` it also blocks on
   hollow/unbacked beats, the direction tells (`linear-motion` · `monotone-timing` · `enter-and-retreat` ·
   `effect-soup` · ≥3 cut families) and the **ambition floor** (`plain-slideshow` — too little motion).
   Two-sided: `effect-soup` is the ceiling, `plain-slideshow` the floor; directed lives between.
   There is **no show floor**: `visual-vocabulary` was deleted for measuring size wrongly (see 2a0000).
   Reach past every WARN; waive a *deliberate* break with
   `{"authoring":{"allow":[...]}}`. Principles: `docs/CRAFT/DIRECTION.md`. From scratch? `docs/CRAFT/AUTHORING-WALKTHROUGH.md`.
3. **Render:** `make video D=formats/scene/<topic>.json` (runs author-check first unless `NOCHECK=1`).
4. **Layout audit:** `make audit` — overlap / clipped text / safe-zone / WCAG contrast (overlay → `/tmp/audit/scene.png`).
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
5a. **QA THE SEAMS, not the centers:** `make seam-check D=<file>` — pulls the frames straddling every
   transition (cut/seam/sting/beat boundary) out of the rendered mp4 and flags a luminance FLASH in the
   overlap (the black-flash / collision class every center-sampling gate misses, `docs/MISTAKES.md` #138).
   Read `/tmp/seams/<name>.png`. This is the cheapest catch for the worst bugs (another engine' hardest-won lesson).
6. **THE GATE THAT SEES — mandatory post-render:** `make judge D=<file> [VS=<brand>]` preps
   `/tmp/judge/sheet.png` + a rubric. READ the sheet and score every frame (readability · hierarchy ·
   composition · brand + asset fidelity · produced · value). `make author-check` is necessary but NOT
   sufficient — the static gates can't see composition or fidelity; this is the backstop. If your eye
   catches a flaw, it's a FIX, never a rationalization (`docs/JUDGE.md`, `docs/MISTAKES.md` #15).
7. **Motion craft:** consult `docs/MOTION-CRAFT.md` when picking presets/cuts/stings.
8. **Anti-sameness:** `make ledger D=<file>` before shipping (fails if the design repeats a shipped one);
   `make ledger-add D=<file>` after the user approves it.
9. **FRAMEWORK HARVEST — mandatory, every render, without being asked.** See below.

## The framework harvest (do this EVERY render — the engine must compound)

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
  remove the hack — never leave the hack as the answer.
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
  attempt does not fire, DEBUG IT — instrument the thing, print what the code actually sees, and find
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
  until you have proven otherwise — an unclamped bound in #211 turned one clean scene into 7 failures.

> **Editing `scene.html`?** Read the `vawe-scene-authoring` skill first (render-frame purity,
> tokens, motion primitives, image/capture system, QA loop). System map: `docs/CODEMAPS/ARCHITECTURE.md`.
> Run `make probe` after scene-logic changes and `make review` for a fast health snapshot.
