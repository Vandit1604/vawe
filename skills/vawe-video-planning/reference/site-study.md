---
when: "a brand site exists to study before planning a video"
answers: "how to read the house style, run the brief script, and derive the design language from the site"
group: skill
---

# Studying a brand site (with a URL)

## Is this brand already known? Read its house style first

Before any study, check `assets/brands/<brand>/house-style.md`. If it exists, treat it as the
locked Design Read: the brand's remembered taste (dominance, faces, palette, motion, shape,
signature details, NEVERs). Do NOT re-derive what it already states; only study what it leaves open.
This is the per-brand memory that keeps every video for a brand consistent. If it's missing, do the
full study below, then persist it with `make dev-tool X=house-style NAME=<brand>` and sharpen the `<…>` judgment
lines so the next video is faster and on-brand (`engine-doctrine/TASTE.md` -> per-brand house style).

## Study first, then ask site-grounded questions

Order matters: sections + lookbook + palette-eyedrop + a WebFetch of the site's copy before any
questions. Generic questions (goal? duration?) waste the answers a real study would give. The
valuable questions quote the site back: which of the brand's own pitches leads, which product
surfaces appear, which real claims/stats/customers count as proof, which of their CTAs ends it.
The better the questions are grounded in the site's content, the better the result.

## The brief itself (`make quiz`, not prose)

The brief comes from a script, not from prose, because the script knows what the gates require:

```bash
make quiz NAME=<brand> URL=<url>          # → the AskUserQuestion payload, as JSON
# ask it, collect the answers into a JSON file, then:
make dev-tool X=quiz-apply ANSWERS=<file.json> NAME=<brand>    # → a STORYBOARD.md that passes storyboard-check
make dev-tool X=quiz-look SB=<the storyboard> N=3             # → the directions DRAWN, pick one from pictures
```

`make quiz` refuses to run generically (exit 2) when a URL is known and `make sections` has not run.
Its options are built from the site's own headings and the engine's registries, so it cannot offer
something the engine cannot do.

- Placement is one question: platform, orientation and duration together, since splitting them is
  how a 60s vertical happens.
- It asks the negative, bounded by category. "What would make you say that is not us" returns a
  decision; "what do you hate" returns nothing.
- It asks what holds the film when the cut is under 15s. `storyboard-check` hard-errors without
  `threads:`, the one thing no site study can guess.

It never asks about motion or effects: `make dev-tool X=quiz-look` renders two or three directions as panels,
and the question is which picture. Tone is not asked either, it is derived from the site (below).

If the script is unavailable, the five questions it replaced are: goal, platform+orientation,
duration, what real material exists (never invent a number), the exact CTA.

A no-URL film has no site study, so `--apply` stops rather than guessing; see `reference/no-site.md`.

## Derive the design language from the site (no canned styles)

No style menu, no auto-heuristic: the brand's own site is the art direction, the taste is in the
pixels. Load `engine-doctrine/CRAFT/TYPOGRAPHY.md` and `COLOR.md` before authoring the theme, then:

```bash
make study-tool X=brandspec URL=…                                    # READ the CSS: real faces + WEIGHTS, tokens, colours+contrast
make sections URL=… NAME=…                              # screenshot every section (the taste lives here)
make study-tool X=lookbook URL=… NAME=…                              # full-page + viewport screenshots
make study-tool X=palette IMG=assets/brands/<brand>/sections/01-*.png   # EYEDROP the hero → dominance (LIGHT/DARK)
```

`make study-tool X=brandspec` is the source of truth for type and declared colours: read it, don't guess. It gives
the 1-3 real faces mapped to primary/secondary/accent, the weights actually used (author the headline
at the measured weight, never a default 800), and the site's `--color-*` tokens (a site's declared
accent is the hex in its CSS, not the nearest colour in its hero image). Use `make study-tool X=palette` for
dominance only. Author the font system per `TYPOGRAPHY.md` §0b (1-3 roles) and validate every colour
pair's contrast per `COLOR.md` before committing it.

**Dominance is decided by looking, never by a field** (`engine-doctrine/MISTAKES.md #1`). `make study-tool X=palette`
reports LIGHT/DARK from the hero's real luminance; then read the screenshot and confirm. A white site
gets a white-first video: a mislabeled dominance is how the worst videos happen. Author
`themes/<brand>.json` by hand from the eyedropped hexes: bg = the site's dominant, accent = its vivid
colour, text = its body colour. No "colours pack" is generated for you.

Read the lookbook/section images and answer, in words, in the reply:
- Typography: serif/sans/mono mix? weight extremes? tight or airy tracking?
- Density: whitespace-first or busy? big single statements or grids of cards?
- Shape language: radius, borders, shadows, sharp/technical or soft/friendly?
- Signature details: hand-drawn annotations, marker highlights, terminal windows, gradients, grain,
  whatever the site does that nothing else does, the video should do too.
- Motion character: does the site itself animate? snappy or calm?

Every decision must trace to one of those observations ("film-burn sting because the brand is warm
analog orange"). If a choice can't be justified by the site, don't make it. Two brands end up
different because their sites are different, not because a hash picked a different preset.

**The extremes rule.** The study must surface 2-3 details that would be WRONG for any other brand
(ThreadCite: logos inline in headlines, gray-ink fear section, rank chips). "Bold sans, whitespace-first"
describes half of SaaS; if the homepage yields nothing brand-unique, widen the study (product screens,
docs, changelog, the founder's X) until it does.

**Set the motion personality.** Write `motion` into `themes/<name>.json` from the study: `{easing,
bounce, settle, enter, durationScale, stagger}`, so the same primitives move differently per brand
(punchy: short settle/tight stagger; calm: long settle/no bounce). Leaving motion at defaults is
shared DNA across brands.

**Write `look` into the theme too** (`engine-doctrine/CRAFT/THEME-LOOK.md`): bg preset rotation, type
scale, layout anchor/margin, the mark's two sizes, cut family, audio cues. A theme with `motion` but
no `look` still forces every film for that brand to re-decide its backdrop from scratch. `make arsenal
THEME=<name>` renders it as a picture to check before authoring the film.

**Name 2-3 references** that fit this brand ("Vercel keynote restraint", "Sandwich Video warmth") and
state what the design borrows and refuses. A different reference triangle breaks the author's habits.
