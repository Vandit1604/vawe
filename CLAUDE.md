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
2. **See it beat-by-beat:** `make beats D=<file> [VS=<brand>]` → `/tmp/beats.png` (first/mid/last of every
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
   were. The gate is `make visuals D=<file>` (step `visuals` inside `author-check`): it FAILS
   `no-visual-vocabulary` when nothing in the film is a picture big enough to be the subject, and WARNS
   `graphics-thin` · `text-only-beat`. Size is the whole point of the measurement: `creed-launch` carries 19
   pictorial layers and every one is a small logo, so a graphic only counts at 8% of the canvas or more.
   Know the limit: the gate proves a picture is on screen and is large. It CANNOT prove it explains
   anything, so a big decorative photograph passes and deserves to fail a human. Green means the film is
   not pure typography, nothing more; the rest is `make judge` and your eyes. How to decide what to show
   and how: **[`docs/CRAFT/SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md)**. 52 of the 93 scenes in this
   library carried no large picture at all when the gate landed. That was nobody's decision, and it is debt,
   not a pattern to copy.

2a000. **SLIDESHOWS ARE BANNED, NOT DISCOURAGED.** A film under 15s with cuts must carry a CONTINUOUS
   OBJECT: one content layer that survives a cut and CHANGES across it. If every beat is an island, born
   and dying inside its own window, the cuts are jumps between unrelated shots and `direction-floor` blocks
   on `no-continuous-object`. If the film declares NO cuts, boundaries are INFERRED from where the visible
   content set turns over wholesale, and that half warns rather than blocks (`no-continuous-object-inferred`,
   promoted to a block under `STRICT=1`): a build should not fail over a cut the author never wrote. Know the
   limit, it is measured, not guessed: the gate can see that a prop survives a junction and moves. It cannot
   see whether that prop BECOMES the next thing, which is the difference between a travelling card and a
   subject. Only the skill buys that. Planning is gated too: `storyboard-check` FAILS a short storyboard that names
   no `object:` in frontmatter, and fails any beat that never says where that object is. Name the object
   before you write a line of JSON. How: **[`vawe-continuous-action`](.claude/skills/vawe-continuous-action/SKILL.md)**.
   Every one of the 18 eligible short films in this library trips this and carries a waiver: that is debt to
   rebuild, not a pattern to copy.

2a00. **CHECK THE BEATS, AND FIX WHAT YOU SEE.** `make beats D=<file>` → `/tmp/beats.png`, then READ it and
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
2a. **See the REVEAL, not just the hold:** `make reveal D=<file>` → `/tmp/reveal.png` (per beat: the ENTER
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
   whole static quality loop (validate · critique · direct · **direction-floor** · **visual-vocabulary** ·
   slop · **designspec** · **copy** · **assets** · inspect · **plan-vs-render**). The **designspec lock** flags off-palette colours / non-role fonts (the
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
   It **blocks** on schema/em-dash, hollow/unbacked beats, the direction tells (`linear-motion` ·
   `monotone-timing` · `enter-and-retreat` · `effect-soup` · ≥3 cut families), AND the **ambition floor**
   (`plain-slideshow` — too little motion) AND the **show floor** (`no-visual-vocabulary`: all type, no
   picture). Two-sided: `effect-soup` is the ceiling, the floor is the
   floor; directed lives between. Reach past every WARN; waive a *deliberate* break with
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
   Read `/tmp/seams.png`. This is the cheapest catch for the worst bugs (another engine' hardest-won lesson).
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

> **Editing `scene.html`?** Read the `vawe-scene-authoring` skill first (render-frame purity,
> tokens, motion primitives, image/capture system, QA loop). System map: `docs/CODEMAPS/ARCHITECTURE.md`.
> Run `make probe` after scene-logic changes and `make review` for a fast health snapshot.
