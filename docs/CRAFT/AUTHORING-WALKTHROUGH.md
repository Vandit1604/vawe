---
when: authoring a whole video, especially with no brand site
answers: "the single narrative: spine → manufacture the four things → lock sheet → JSON → the mandatory ladder → judge → ship"
group: crosscutting
---

# AUTHORING-WALKTHROUGH — one good video, from a blank page to shipped

Every other doc is a *reference* you dip into. This is the one **narrative**: it walks a single video
from a bare brief to a shipped file, calling each tool and doc in the order you actually use it. It
exists because the hard case is authoring with **no brand site** — no colours, no real UI, no taste on
a page to borrow — which is exactly when an author regresses to its own priors (centered Inter on a
blue gradient). The fix is not inspiration; it is to run the same disciplined chain a brand site would
have given you, by hand.

> Reflecting a real site instead? That path is easier and already canonical — follow the
> [`vawe-video-planning`](../../.claude/skills/vawe-video-planning/SKILL.md) skill (study → lock →
> execute) and skip Step 1 here. This walkthrough is the *from-scratch* companion to that skill.

Worked example throughout: **"a 20s explainer: why most passwords are crackable in under an hour."**
No client, no site. Portrait 1080×1920 for a phone feed.

---

## Step 0 — Load the spine before the blank page

**You will open the JSON first, because that is where the work looks like work. Don't.** A blank JSON is
the exact condition this repo's #1 authoring failure needs: 31 hand-written layers, 74% of them text,
`anim: "fade"` on nearly every one. Read, in order, so you compose from craft not priors:
[`../TASTE.md`](../TASTE.md) (the one law + the three spines) → [`DIRECTION.md`](DIRECTION.md) (pacing,
restraint, story placement) → [`README.md`](README.md) (the 7-step layering order). Then the planning
skill owns the plan→lock→execute contract.

## Step 1 — Manufacture the four things a site would have given you

A brand site hands you: a **taste anchor**, **real assets**, a **story spine**, and **real copy**. With
no site you make each deliberately (this is the planning skill's Step 0.5, applied):

1. **Taste anchor = a named reference profile,** not "clean and modern." Pick one from
   [`SELECTION.md`](SELECTION.md) Part 2 (linear / apple / stripe / a24 / bloomberg / …) and set it as
   the scene's top-level `"profile"`. For a security explainer, `bloomberg` (mono, data-serious) or
   `vercel` (stark, technical) fit. The profile locks face, cut vocabulary, and restraint in one move —
   and the direction gate enforces it. Author the theme (`themes/<name>.json`) per
   [`TYPOGRAPHY.md`](TYPOGRAPHY.md) + [`COLOR.md`](COLOR.md): one committed non-generic face, a palette
   built from one dominant + 60-30-10. Never Inter, never a blue→purple gradient.
2. **Real assets, not placeholders.** A lock icon, a key, a real password-strength meter → a `block`
   (browse `make catalog`), a Lucide UI icon (`assets/icons/ui/`), or a real brand mark
   (`cdn.simpleicons.org`). See [`IMAGERY.md`](IMAGERY.md). Emoji is the last resort. "SHOW, don't say"
   ([`../TASTE.md`](../TASTE.md) the one law) starts here.
3. **Story spine.** Pick a spine from [`STORY.md`](STORY.md) and lay the beats per
   [`DIRECTION.md`](DIRECTION.md) §4: hook (open loop) → build → payoff (never spoiled) → CTA. For the
   example: hook *"Your password. One hour."* → build *how a GPU guesses* → payoff *the real
   crack-time number* → CTA.
4. **Real copy + real numbers.** Numbers must be true ([`../TASTE.md`](../TASTE.md)); look up real
   hashrate/entropy figures, don't invent them. Copy is the brand's voice — here, terse and technical.

## Step 2 — Storyboard on paper, then write the LOCK SHEET

Beat table in your reply first (not the JSON): per beat name the **archetype** (rotate them —
[`MOTION-CRAFT.md`](../MOTION-CRAFT.md) rule 7), the **exact copy**, the **artifact that earns the
frame** (§value test below), and the **motion**. Then freeze it as the planning skill's LOCK SHEET and
get sign-off. **Nothing renders before the lock sheet is approved.**

The **value test** on every beat ([`../TASTE.md`](../TASTE.md), the one law): *if I cut this frame,
what does the viewer lose?* If the answer is "a restatement of the headline," the beat isn't done —
give it a real artifact (a live meter filling, a counter, a real UI), not a word in a box.

## Step 3 — Author the JSON (transcribe the lock sheet, don't explore)

**Compose from directed beats first — don't re-derive motion.** `make blueprints` lists the beat
blueprints ([`BLUEPRINTS.md`](BLUEPRINTS.md)); drop one per beat (`{type:"beat","beat":"kineticHook",…}`)
and fill brand content, so kinetic reveals / count-ups / cascades / dashboard dives are the *default*, not
something you remember. Hand-author only what no blueprint covers. Then `make expand`.

Read `formats/scene/sample.json` and one shipped scene as structural references, then compose — never
copy a structure wholesale (the ledger flags it). Build in the [`README.md`](README.md) layering order:

1. **Beats** — layer `start`/`duration` per the lock sheet's timing.
2. **Anchor** — placement via `pin`/`col`/`align`, never eyeballed `x` (a text layer with `w` needs
   `align` or it reads off-centre — [`../MISTAKES.md`](../MISTAKES.md) #15).
3. **Per-beat motion** — from [`MOTION-RECIPES.md`](../MOTION-RECIPES.md): entrances ease-out, the
   hero moves last/most, ONE motion idea per beat. Vary durations ([`DIRECTION.md`](DIRECTION.md) §2).
4. **Support = blocks.** The hero's claim is proved by a block (the strength meter, a chart), plus a
   dim mono metadata readout ([`DENSITY.md`](DENSITY.md): hero + support + metadata).
5. **Frame look, density, restraint, sound** — the rest of the layering order; sound per
   [`SOUND.md`](SOUND.md) (silence + crisp SFX is a fine default).

Hand-writing any HTML fragment (a hook, a CTA)? Load `taste-skill` + `impeccable` first, then
`make preview HTML=<frag> THEME=<brand>` before you trust it. That is the gate that reads a FRAGMENT,
in a real browser with real computed styles. `make designspec-check D=<file>` is a SCENE gate and takes
a scene JSON, not raw HTML; pointing it at a fragment measures nothing.

## Step 4 — The mandatory ladder (this is what stops effect-soup)

```bash
make author-check D=formats/scene/passwords.json           # validate · beats · assets · inspect · plan-vs-render
TASTE=1 make author-check D=formats/scene/passwords.json  # ...+ critique · direct · floor · dissolve
                                                          #     designspec · copy · pace
```

**The style gates are OPT-IN.** A bare `make author-check` runs only the always-on half, which catches a
film that is BROKEN: schema and em-dash (`validate`), timeline holes (`beats`), missing referenced files
(`assets`, advisory unless `STRICT=1`), the value contract (`inspect` + `plan-vs-render`), plus two
advisory notes (`treatment`, `waiver-drift`). It says nothing at all about whether the film is any good,
and the run prints which gates it skipped. `TASTE=1` adds the seven style gates. `slop` is not one of
them: it was retired in 2026-08 and its script deleted.

Under `TASTE=1` the ladder **blocks** on value (placeholder / unbacked / thin beats), on direction
(≥3 cut families, profile contradictions), on crossfade mud, on the designspec colour and font lock, and
on the **ambition floor** (`plain-slideshow`, too little motion; the inverse of effect-soup). **The four
book tells do NOT block.** `linear-motion`, `monotone-timing`, `enter-and-retreat` and `effect-soup` are
every one of them `warn()` in `scripts/author/motion-director.mjs`, which exits only on FAIL-tier codes
and has no `--strict` path. This page said they blocked, and they never did. Directed lives between soup
and slideshow. WARN-tier findings
you read and reach past. A deliberate rule break you stand behind → waive it in the scene, **with its
reason**, because a bare `allow` array blocks in the always-on half (`author-check.mjs:74-83` wants a
`_why` of at least 12 characters per waived code):

```json
"authoring": {
  "allow": ["cut-families"],
  "_why": { "cut-families": "the third family is the sting on the payoff and it is the point" }
}
```

`make video` runs this automatically (skip only with an explicit `NOCHECK=1`).

Then see it move, not just the settled frames:
```bash
make beats  D=<file>        # first/mid/last of every beat → /tmp/beats/<name>.png
make reveal D=<file>        # the ENTER arc + settled + EXIT arc → catches how each beat animates IN
```

## Step 5 — Render, then the gate that SEES

```bash
make video D=formats/scene/passwords.json             # → out/passwords.mp4  (+ author-check + audit)
make judge D=formats/scene/passwords.json             # preps /tmp/judge/sheet.png + rubric
```

`make judge` is the required post-render step the static ladder structurally cannot be: read
`/tmp/judge/sheet.png` against `/tmp/judge/rubric.md` and score every frame on all six dimensions
(readability · hierarchy · composition · brand + asset fidelity · produced-not-generated · value).
**If your eye catches a flaw, it is a FIX** — never rationalize one you noticed
([`../JUDGE.md`](../JUDGE.md), [`../MISTAKES.md`](../MISTAKES.md) #15). Fix the JSON, re-render.

## Step 6 — Prove it isn't a repeat, then log it

```bash
make ledger     D=<file>          # fails if this repeats a shipped design (change ≥2 of cut/beat/layout)
make ledger-add D=<file>          # after the user approves — logs it to the design memory
```

## Step 7 — The framework harvest (every render, without being asked)

List every friction you hit this pass and classify each (framework bug / gate gap / authoring choice),
fix the engine ones, and log framework findings to [`../MISTAKES.md`](../MISTAKES.md) — see the harvest
rule in the project `CLAUDE.md`. An unlogged fix gets re-broken.

---

### The chain in one line

spine → manufacture the four things → lock sheet (value-test every beat) → transcribe JSON in layering
order → **`make author-check`** → `beats`/`reveal` → `make video` → **`make judge` (read the sheet)** →
`ledger` → harvest. Miss the bolded two and you ship effects; run them and you ship a directed film.
