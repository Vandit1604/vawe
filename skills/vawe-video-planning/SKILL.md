---
name: vawe-video-planning
description: "PLAN BEFORE AUTHORING any video in this repo: collect the brief, lock a style pack (from a brand site, OR from a manufactured taste anchor when there is no site), storyboard, THEN write JSON. Use whenever the user asks to 'make a video' and the goal/platform/duration/tone aren't pinned down."
---

# Video planning: brief first, JSON second

Authoring without a brief produces the same generic video for everyone. This skill front-loads
the five decisions that actually change the output, then locks a deterministic per-brand style
so no two brands ship the same look.

## THE CONTRACT: plan → LOCK → execute (do NOT generate first)

Planning and generating are two phases with a hard gate between them. **Nothing is rendered until
the plan is LOCKED and the user signs off.** Then execution is precise transcription of the locked
spec, not exploration. If you find yourself "trying things" in the JSON, the plan wasn't locked,
go back and lock it.

1. **Study + brief**: WITH a brand site → Steps 1–2 (study it, derive the design language). WITHOUT
   one → Step 0.5 (MANUFACTURE the four things a site gives: a taste anchor `profile`, real assets, a
   story spine, real copy). Either way you arrive at a filled brief; a no-site video is not exempt
   from having a design language, it just synthesizes one instead of reading it.
2. **Storyboard** (Step 3): the beat table + per-beat archetype/copy/motion.
3. **LOCK SHEET** (Step 3c): freeze the full spec, theme colours/fonts, per-beat copy (exact words),
   layout archetype, coordinates band, image/treatment per beat, motion personality, cuts/stings, CTA.
   Present it. **Wait for explicit approval.** Change only what the user changes.
4. **Execute** (Step 4): author the JSON to match the lock sheet exactly, then run the verify ladder.
   No new creative decisions here, if one is needed, it means the lock sheet had a gap; surface it,
   don't improvise.

## Step 0: Is this brand already known? Read its house style FIRST

Before any study, check `assets/brands/<brand>/house-style.md`. If it exists, **READ IT and treat
it as the locked Design Read**: the brand's remembered taste (dominance, faces, palette, motion, shape,
signature details, NEVERs). Do NOT re-derive what it already states; only study what it leaves open. This
is the per-brand memory that keeps every video for a brand consistent. If it's missing, do the full study
below, then persist it with `make house-style NAME=<brand>` and sharpen the `<…>` judgment lines so the
NEXT video is faster and on-brand. (See `docs/TASTE.md` → per-brand house style.)

## Step 0.5: NO brand site? MANUFACTURE the four things a site gives, before authoring

> **The full narrative for this path is [`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](../../docs/CRAFT/AUTHORING-WALKTHROUGH.md)**:
> one video carried blank-page → shipped, chaining the whole arsenal (including the mandatory
> `make author-check` ladder and the `make judge` step). Read it alongside this step; the four things
> below are its Step 1.

Steps 1–2 assume a brand site to study. When there is none (a topic video, a from-scratch idea, an
effects piece), the failure mode is exact and predictable: you invent everything and default to
generic: centred, effect-soup, no through-line. A site silently hands you FOUR things at once, and
without one you must MANUFACTURE all four before a single layer is authored. This is a hard gate: if
the lock sheet is missing any of the four, the plan is not locked.

1. **A taste anchor. ASK FOR IT FIRST** ([`docs/CRAFT/CONTENT.md`](../../docs/CRAFT/CONTENT.md), theme
   source): a brand site gives the theme for free, a prompt with no site gives nothing, and the silent
   failure is plain grey. `make quiz` asks a "Theme source" question exactly when no URL is known: point
   at a reference or a theme, or say "you choose" and get one designed. **"you choose" means INVENT a
   beautiful theme, never default to plain**: seed a palette from `skills/impeccable/scripts/palette.mjs`
   and name a colour direction from `command npx -y ui-skills list --category color`, then record
   `theme: invented` in the lock sheet so the decision travels with the film. Do NOT invent a palette and
   motion feel from nothing unasked. Pick ONE reference profile from
   [`docs/CRAFT/SELECTION.md`](../../docs/CRAFT/SELECTION.md) Part 2, `linear` · `apple` · `stripe`
   · `nike` · `a24` · `bloomberg` · `duolingo` · `vercel`, chosen for the topic's register, and set
   the scene's `profile` field to it. That profile IS the design language a site would have given: it
   fixes the face role, pace, easing, cut family, sting/look policy, accent, and the bounce rule
   coherently. For exact colour, name a real reference site and `vawe_reflect` it (e.g. "feels like
   Linear" → reflect linear.app for its true hexes + face), then apply the profile's motion policy on
   top. Ask the user which reference if it is not obvious; a named target beats an adjective.

2. **Real assets.** A video of bare rects and text reads as a placeholder. Before authoring, gather
   real material: `vawe_logo` for any named product/company mark, `vawe_photo` for a CC0 subject the
   story needs, `vawe_upload` for the user's own logo/screenshots. Name each in the lock sheet with a
   treatment (`ken`/`radius`/a grade), never bare.

3. **A story spine.** Pick ONE arc and commit its beat order, so the video is a film not a list:
   hook → build → proof → payoff → CTA (the default), or pain→agitate→solve, or a demo loop. Every
   beat gets a role. A showcase without a spine is the effect-soup failure; give it one even when it
   is "just showing effects" (open → range → the one that wows → close).

4. **Real copy.** Never invent claims, numbers, or names. Get the exact words and true figures from
   the user. On-screen text is only what is true (the honesty rule). If the user has not given copy,
   ASK for it before locking; do not fill with plausible filler.

Then read [`docs/CRAFT/TASTE-RULES.md`](../../docs/CRAFT/TASTE-RULES.md) (the failure-modes catalog
and the prime directive) and [`SELECTION.md`](../../docs/CRAFT/SELECTION.md) (intent→effect), and
apply their continuity + restraint rules: shared elements travel across beats, one cut family, effects
earned on 2–3 beats. `make direct D=<file>` will flag any pick that contradicts the chosen profile.

Skip the site-specific Steps 1–2 (there is no site to study); go from here straight to Step 3
(storyboard) with the profile as the locked Design Read. Everything else in the contract is unchanged.

## Step 1: Study FIRST, then ask SITE-GROUNDED questions

Order matters: sections + lookbook + palette-eyedrop + a WebFetch of the site's copy BEFORE any questions.
Generic questions (goal? duration?) waste the user's answers. The valuable questions quote the
site back: WHICH of the brand's own pitches leads, WHICH product surfaces appear, WHICH real
claims/stats/customers count as proof, WHICH of their CTAs ends it. The better the questions are
grounded in the site's content, the better the result.

## Step 1b: The brief itself (`make quiz`, not prose)

The brief comes from a script, not from prose, because the script is the one that knows what the
gates require:

```bash
make quiz NAME=<brand> URL=<url>          # → the AskUserQuestion payload, as JSON
# ask it, collect the answers into a JSON file, then:
make quiz-apply ANSWERS=<file.json> NAME=<brand>    # → a STORYBOARD.md that passes storyboard-check
make quiz-look SB=<the storyboard> N=3             # → the directions DRAWN, pick one from pictures
```

`make quiz` **refuses to run genericly** (exit 2) when a URL is known and `make sections` has not been
run: Step 1's rule, as an exit code rather than a paragraph. Its options are built from the site's own
headings and from the engine's registries, so it cannot offer something the engine cannot do.

Three things it does that the bullets did not:

- **Placement is ONE question.** Platform, orientation and duration together, because splitting them is
  how a 60s vertical happens.
- **It asks the negative, bounded by category.** "What would make you say that is not us" returns a
  decision; "what do you hate" returns nothing. Anti-references narrow faster than aspirations, which
  all collapse onto the same premium-calm answer.
- **It asks what holds the film** when the cut is under 15s. `storyboard-check` hard-ERRORS without
  `threads:`, and that decision was in none of the five bullets. The one thing no site study can guess.

**It never asks about motion or effects.** Of 23 published studio briefs, not one asks a client to
describe motion in the abstract; it is elicited as clips, as a per-shot field, or against a rough cut.
`make quiz-look` is that: two or three directions rendered as panels, and the question is which picture.

Tone is still not asked. It is derived from the brand's own site (Step 2), and a volunteered tone
overrides.

**If the script is unavailable**, the five questions it replaced are: goal · platform+orientation ·
duration · what real material exists (never invent a number) · the exact CTA.

**A no-URL film** has no site study, so `--apply` stops rather than guessing. That branch (the taste
anchor, Step 0.5) is not built yet: storyboard it by hand.

## Step 2: Derive the design language FROM the site (no canned styles)

There is no style menu, and NO auto-heuristic. The brand's own site is the art direction; the taste
is in the actual pixels. **Load [`docs/CRAFT/TYPOGRAPHY.md`](../../docs/CRAFT/TYPOGRAPHY.md) +
[`COLOR.md`](../../docs/CRAFT/COLOR.md) before authoring the theme** (how to choose a face / build the
palette to the contract keys). Do the study, literally:

```bash
make brandspec URL=…                                    # READ the CSS: real faces + WEIGHTS, tokens, colours+contrast
make sections URL=… NAME=…                              # screenshot every section (the taste lives here)
make lookbook URL=… NAME=…                              # full-page + viewport screenshots
make palette IMG=assets/brands/<brand>/sections/01-*.png   # EYEDROP the hero → dominance (LIGHT/DARK)
```

**`make brandspec` is the source of truth for TYPE + declared COLOURS, read it, don't guess.** It gives the
1-3 real faces mapped to primary/secondary/accent, **the weights actually used** (author the headline at the
MEASURED weight, never a default 800), and the site's `--color-*` tokens (accurate where eyedrop reads a
photo: a site's declared accent is the hex in its CSS, not the nearest colour in its hero image). Use `make palette` for DOMINANCE only.
Author the font system per [`docs/CRAFT/TYPOGRAPHY.md`](../../docs/CRAFT/TYPOGRAPHY.md) §0b (1-3 roles) and
validate every colour pair's contrast per [`COLOR.md`](../../docs/CRAFT/COLOR.md) before locking.

**DOMINANCE IS DECIDED BY LOOKING, NEVER BY A FIELD.** `make palette` reports LIGHT/DARK from the hero's
real luminance + the dominant hexes; then READ the hero screenshot yourself and confirm. A white site
gets a white-first video. (This is non-negotiable: a mislabeled dominance is how the worst videos happen.)
Author `themes/<brand>.json` by hand from the eyedropped hexes, bg = the site's dominant, accent = its
vivid colour, text = its body colour. No "colours pack" is generated for you; you author it from pixels.

Read the lookbook/section images and answer, in words, in your reply:
- **Typography**: serif/sans/mono mix? weight extremes? tight or airy tracking?
- **Density**: whitespace-first or busy? big single statements or grids of cards?
- **Shape language**: radius, borders, shadows, sharp/technical or soft/friendly?
- **Signature details**: hand-drawn annotations, marker highlights, terminal windows, gradients,
  grain, whatever the site does that nothing else does, the VIDEO should do too.
- **Motion character**: does the site itself animate? snappy or calm?

Every video decision must trace to one of those observations ("film-burn sting because the
brand is warm analog orange", "whip cuts because the site is dense and fast"). If a choice
can't be justified by the site, don't make it. Two brands end up different because their
sites ARE different, not because a hash picked a different preset.

**The extremes rule.** The study must surface **2–3 details that would be WRONG for any other
brand** (ThreadCite: logos inline in headlines, gray-ink fear section, rank chips). "Bold sans,
whitespace-first" describes half of SaaS, if the homepage yields nothing brand-unique, WIDEN
the study (product screens, docs, changelog, the founder's X) until it does. Generic evidence
in, generic video out.

**Set the brand's motion personality.** Write `motion` into `themes/<name>.json` from the study:
`{easing, bounce, settle, enter, durationScale, stagger}`, so the same primitives physically
move differently per brand (punchy: short settle/tight stagger; calm: long settle/no bounce).
Leaving motion at defaults is shared DNA across brands; don't.

**Write `look` into the theme too** (`docs/CRAFT/THEME-LOOK.md`): the bg preset rotation, the
type scale, the layout anchor/margin, the mark's two sizes, the cut family, the audio cues. This
is the same study, spent a second time: a theme with `motion` but no `look` still forces every
FILM for that brand to re-decide its own backdrop and cut family from scratch. `make scaffold
TYPE=<type> THEME=<name>` reads `look` and uses it; `make arsenal THEME=<name>` renders it
as a picture so you can check it before authoring the film.

**Name 2–3 references** that fit THIS brand ("Vercel keynote restraint", "Sandwich Video
warmth") and state what the design borrows and what it refuses. Different reference triangle,
different output: this breaks the author's own habits.

## Step 3: Storyboard on paper before JSON

**First, run `make scaffold OUT=formats/scene/<name>.json DUR=<n> THEME=<name>`.** It writes a scene
an empty-layers shell with the storyboard sidecar already tiled with placeholder beats, ready for
backdrop and sound, plus its `.storyboard.md` sidecar with the frontmatter and per-beat fields
storyboard-check and craft-checklist ask for. Every field the plan below still has to decide is marked
`REPLACE:`/`<fill: ...>`; fill those in place of hand-writing JSON from blank, the #1 authoring failure.

> **Film under ~15 seconds? Load [`vawe-continuous-action`](../vawe-continuous-action/SKILL.md)
> instead of the beat table below.** A short film is ONE continuous action, not a sequence of
> beats: one object is on screen from the first frame and every cut is that object changing state
> (the reference `higgsfield.mp4` presses a generate button and the button becomes the loading
> dot). Planning short films as independent beats is what produces a competent slideshow. That
> skill also gives the measured second-by-second budget and emits the same storyboard shape.

Beat table first (in the reply, not a file): Hook (≤3s, no name-drop if teasing) → Build →
Proof (real UI capture / true stat) → Payoff → CTA (3–5s). One idea per beat. Budget seconds
per beat to the target duration.

There is ONE module: **scene** (the open canvas, layers/cuts/stings/bg windows/camera;
`formats/scene/schema.json` is the contract). No templates. You compose every video from the
primitive vocabulary in `docs/PRIMITIVES.md`; the JSON is the video.

**Compose motion from RECIPES, not blank JSON.** Blueprints are retired ([`recipes/README.md`](../../recipes/README.md)
is the live mechanism): `make arsenal Q="…"` finds a recipe measured off a real film, or a kinetic
reveal / count-up / cascade / camera move directly. Each bakes in real motion so good motion is the
DEFAULT. Authoring plain `rise`+`fade` from scratch is the #1 failure and `make direction-floor`
(opt-in: `TASTE=1 make author-check`) FAILS it as a `plain-slideshow`. Reach for a real device per beat,
then fill brand content.

## Step 3b: Choreography rules (anti-monotony)

**Read `docs/MOTION-CRAFT.md` before storyboarding**. The stored rulebook: 10 rules with their
enforcement map, genre pacing tables, DO/DON'T pairs, and the effect-selection guide.

- **Layout variety**: no layout archetype twice in a row. Rotate: split (headline left / artifact
  right) · centered-top with full-width artifact · full-bleed statement · asymmetric card-over-board.
  Storyboard must name each beat's archetype.
- **Rhythm variety**: entry pace is a VOICE, not a constant. Vary `enterDur`/`each`/`stagger` per
  beat with intent, ambient elements drift (0.8–1.2s), payoffs snap (0.25–0.35s), thesis lines are
  luxurious (each 0.5+). Uniform 0.45s everywhere reads as monotone.
- **Hierarchy through offset**: related elements stagger "one after another" (60–120ms); the ONE
  most important element on each beat moves last or most, motion order = reading order.
- **Easing = physics**: entrances decelerate (ease-out family), exits accelerate (rush), ambient
  loops sinusoidal. Never linear on visible moves.
- **Choose every CUT by meaning, not habit** (`docs/CRAFT/TRANSITIONS.md`). Run the per-seam decision
  procedure: name the RELATIONSHIP between the two beats (continuity · time · contrast · same-object ·
  new act) and the FEELING across it, then pick the transition that serves both. **If a seam serves
  neither, it is a hard cut.** Most seams are invisible (hard/soft cut, overlapped so the stage never
  dips to empty). Earn 2-3 accents by meaning (whip = energy into a payoff, iris/sdfIris = focus,
  fade = act break, smash = contrast); reserve the boldest for the hero/payoff; make the outro simplest.
  ONE cut family. Spraying one effect (blur) on every cut is the failure in BOTH directions, monotone
  and soup. The LOCK SHEET's per-beat row must name each cut's *relationship + transition + why*.
- **Icons with names**: whenever a company/product/tool is named, show its mark (simple-icons)
  or a Lucide UI icon (`assets/icons/ui/`, MIT, stroke color baked), text-only lists of
  named things are a missed layer of craft.
- **Background = the site's real surface, used sparingly**: the bg texture must EXIST on the real
  site. A plain/flat technical site gets a plain field (`plain`/`paper`/`accentPlain`), never invented
  dots/shapes. Only use a patterned preset (`accent`/`dotmatrix`/`aurora`/`mesh`/`constellation`/
  `paperShapes`) if the site itself has that texture. And even then a pattern is a SEASONING, not the
  wallpaper: at most one or two beats (a hook or one accent moment), never throughout. Content/proof
  beats stay plain so the content reads. Recurring mistakes + fixes live in `docs/MISTAKES.md`; ask it
  with `make arsenal MISTAKES=1 Q="…"` before authoring rather than reading it end to end.

## Step 3b.1: Every frame FIGHTS for its value (the value gate)

The single most common failure: beats that occupy time without earning it. Before locking any beat,
apply **the value test** ([`docs/TASTE.md`](../../docs/TASTE.md), the one law). If the answer is
"nothing" or "a restatement of the headline," the beat is not done. Reimagine it until it teaches,
proves, or delights something no other frame does. Concretely:

- **SHOW the real artifact, never a placeholder label.** The word "scene" / "rendered" / "output" in
  a box proves nothing, it's a stand-in for work not done. Render an ACTUAL mini-scene (real layers
  animating: a headline, a counstandard, a card, a themed UI) so the viewer literally watches the engine
  work. "Show a scene getting bigger" means an actual composed scene scales up, not the string `scene`.
- **Never claim on-screen what the video doesn't show on-screen.** If copy says "22 shader stings" or
  "14 backdrops," those effects must visibly appear in the same breath. An unbacked claim is worse than
  no claim: it invites the viewer to notice the absence. Cut the number or demonstrate it.
- **Demonstrate flexibility by DOING it live.** "Any colour" is dead as text; make the actual word (or a
  real UI) cycle through colours continuously on screen. "Any theme" = morph a real rendered card through
  themes. The proof is the motion, not the noun.
- **Live demo beats static list.** A grid of numbers (`n=41 …`), a checklist of gate names, or a row of
  feature pills reads as a spec sheet, not a film. Animate the concept instead: frames re-rendering in
  parallel, a check drawing on as each gate passes, a value changing and the output updating.
- **Legibility of effects.** Never use a transition/effect the viewer cannot perceive at its actual size
  and duration (e.g. `blinds` slats that are invisible in 0.4s). If it doesn't read, it isn't a feature.
  Pick one that does (wipe, iris, push, a real cut).
- **Anchor every element with intent.** Off-centre or floating content needs a compositional reason
  (asymmetry, a split, an artifact it points to). Random off-centre reads as a mistake. Center, or anchor.
- **Real product > abstract metaphor.** To say "it reads a site," show a recognizable rebuilt result
  (a Stripe-like dashboard/gradient) forming from the input. A concrete, branded payoff beats a token list.
- **A click must have a consequence.** If a cursor clicks a button, the next frames must show what the
  click DID (a deploy result, a state change). A click with no visible outcome is a dead beat.

These are enforcement rules, not suggestions: the LOCK SHEET's per-beat row must name the *artifact that
earns the frame*, not just the copy. If a beat's only artifact is a word in a box, it fails the gate.

## Step 3c: The LOCK SHEET (freeze this, get sign-off, THEN author)

Write the full spec in the reply as a table and get explicit approval before touching JSON. Every
row is a decision the JSON will transcribe, not reinterpret:

**Which rows the brief already filled.** If Step 1b ran, `make quiz-apply` locked orientation, duration,
the arc and `threads:` into the storyboard's frontmatter, and `make quiz-look` settled the direction from a
drawn panel sheet. Those rows are DECIDED, carry them across rather than re-deciding them here, and mark
the rest as still owed. Everything below the line is the author's: palette, per-beat copy, the treatment of
each image, and every cut's reason.

| Field | Locked value | Filled by |
|---|---|---|
| Orientation / duration / theme | e.g. landscape · 22s · `themes/preface.json` | **the brief** (placement) |
| **Taste anchor** (no-site videos) | the reference **`profile`** (`apple`/`linear`/…) + which real site was `vawe_reflect`ed for colour | the brief (anti-reference) |
| **Story spine** | the named arc + each beat's role (hook/build/proof/payoff/CTA) | **the brief** (job → arc) |
| Palette + fonts | the exact hexes + face names (from the study OR the profile's reflected reference) | the study |
| Motion personality | `{easing, bounce, settle, enter, stagger}`. From the profile, written into the theme | the profile |
| **Continuity plan** | which 1–2 elements TRAVEL across beats; the one cut family used | **the brief** (thread) + quiz-look |
| Per beat (one row each) | `t-range · role · exact copy · image/treatment · cut-in (relationship + transition + WHY, per TRANSITIONS.md) · motion · feeling` | you |
| Assets | which real logos / photos / uploads (NOT bare rects), and their treatment | you |
| Sound | bed + cues, or a written `_why` for silence: [`SOUND.md`](../../docs/CRAFT/SOUND.md) §0 has the four-command path | you |
| Captions | timing source, `destination` if this ships to a phone feed, `captionMode`/`captionStyle` if not plain: [`CAPTIONS.md`](../../docs/CRAFT/CAPTIONS.md) | you |
| CTA | the exact end action + url | the brief, when the study found one |

For a no-site video, the first four rows ARE the four manufactured things from Step 0.5. If any is
blank, the plan is not locked: you have not replaced what a site would have given, and the output
will default to generic. Every per-beat row names its `feeling` (TASTE-RULES) so `make direct` can
check the effect against the intent.

**Image treatments** to name per beat (don't leave images bare): `ken` (slow zoom), **`edgeFade`**
(white blur dissolving the LEFT+RIGHT edges into the bg, set `edgeFadeColor` to the bg on dark
scenes), clipped card + `radius`, `component` capture of a live UI section. A still image with no
treatment reads as slop.

Only after the user approves the lock sheet do you author. If a beat needs a decision the sheet
didn't make, that's a lock-sheet gap: amend the sheet and re-confirm, don't improvise in the JSON.

## Step 3d (Authoring discipline (from the real thing, with the tools) not imagination)

Three failures that ship "renders-fine but wrong" videos (see `docs/MISTAKES.md` #15). Do the opposite:
- **Assets: capture, never recreate.** If the brand has a mark/mascot/illustration, `make capture` it or
  crop it from the section screenshot (transparent the bg if needed) → an `image` layer. Recreating a brand
  asset "from memory" is off-brand by definition: you'll draw a lookalike, not the thing.
- **Placement: `pin`/`col`/`align`, never eyeballed `x`.** `pin:"center"` (optical) or `pin:"thirds-*"`
  places a hero; a text layer given `w` MUST set `align` or it left-aligns inside its box and reads
  off-centre. Don't hand-compute centering math. (`make critique` warns on the `w`-without-`align` tell.)
- **Annotations bind to their target.** An underline/marker under a word lives in the SAME element as the
  word (an `html` layer with the underline absolutely-positioned under the span), not a blind `x` guess.
- **Fix flaws, don't rationalize them.** When you eyeball frames (Step 4), if your eye catches something
  off, FIX it, never ship a flaw you already noticed. The static gates can't see composition or fidelity;
  your eye is that gate until the vision-judge exists.

## Step 4: Author → verify (non-negotiable ladder)

This step runs the `check` → `ship` → `judge` → `ledger` phases of the one spine in
[`AGENTS.md`](../../AGENTS.md#the-process-has-one-owner-and-it-is-not-this-file) ("THE PROCESS HAS ONE
OWNER"). `author-check`, `video`, `beats`, `reveal` and `ledger` below are the STEPS those phases run,
not a separate ladder.

`make validate` → `make video` → `make motion --data <file>` → `make audit M=<fmt>` (text AND
image contrast) → **`make beats D=<file> VS=<brand>`** (FIDELITY GATE, stacks each beat beside its
source section; if the video doesn't read as the SAME brand as the site, it fails: wrong dominance,
off colours, untasteful imagery all show here. This is mandatory and is exactly the check that catches
a white site rendered dark) → **`make ledger D=<file>`** (cross-video sameness vs every shipped design,
SAME fails; fix by changing ≥2 of cut family / beat structure / layout archetype) → eyeball
hook / payoff / CTA frames. Fix data, re-render. Never ship unverified.
**Final taste check (the gate that SEES):** on the near-final cut, `make judge D=<file> VS=<brand>` →
read `/tmp/judge/sheet.png` against `/tmp/judge/rubric.md` and score every frame (readability · hierarchy ·
composition · brand + asset fidelity · produced-not-generated · value). If your eye catches a flaw, it's a
FIX, never rationalize one you noticed. This is the gate the static ladder above structurally can't be. See
`docs/JUDGE.md`.
After the user approves the shipped video: `make ledger-add D=<file>` logs it to the design
memory (`quality/ledger/ledger.json`) so future videos are checked against it.
<!-- doc-refs-allow: quality/ledger/ledger.json · gitignored, written on first `make ledger-add` -->


## Differentiation rules (why outputs differ per user/brand)

- NO em-dashes in any on-screen copy (validator-enforced). Use a comma, period, or ·.
- Use the brand's REAL iconography and images wherever the site does: favicon, product UI captures, inline logos, semantic chips. A text-only video for an icon-rich brand fails the site study.

- Colors ONLY from the brand's theme pack; dominance decides light-first vs dark-first.
- Copy ONLY from the brand's own words (dna headings/tagline), polish, don't invent.
- Motion personality derived from the site study above; pacing from the brief.
- Same input → byte-identical output; different brand → visibly different video. Both are
  features. If two brands ever look alike, the site study was skipped, redo the study, not the JSON.
