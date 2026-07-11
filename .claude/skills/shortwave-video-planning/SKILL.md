---
name: shortwave-video-planning
description: "PLAN BEFORE AUTHORING any video in this repo: collect the brief from the user, lock a per-brand style pack, storyboard, THEN write JSON. Use whenever the user asks to 'make a video' and the goal/platform/duration/tone aren't already pinned down."
---

# Video planning — brief first, JSON second

Authoring without a brief produces the same generic video for everyone. This skill front-loads
the five decisions that actually change the output, then locks a deterministic per-brand style
so no two brands ship the same look.

## Step 1 — Study FIRST, then ask SITE-GROUNDED questions

Order matters: brandkit + lookbook + a WebFetch of the site's actual copy BEFORE any questions.
Generic questions (goal? duration?) waste the user's answers. The valuable questions quote the
site back: WHICH of the brand's own pitches leads, WHICH product surfaces appear, WHICH real
claims/stats/customers count as proof, WHICH of their CTAs ends it. The better the questions are
grounded in the site's content, the better the result.

## Step 1b — The brief itself (ask only what the study can't answer)

If any of these are unknown, ask the user (AskUserQuestion, one round, ≤4 questions). Skip
anything already stated or derivable from the repo/DNA.

1. **Goal** — launch announcement / product walkthrough / feature drop / brand film / meme-fact
   short? (Decides format vs open canvas.)
2. **Platform + orientation** — X/LinkedIn/site hero → landscape 1920×1080 · Shorts/Reels/TikTok
   → portrait 1080×1920. (Never assume; it changes every coordinate.)
3. **Duration** — 15s teaser / 30s launch / 60s walkthrough.
4. **What real material exists** — site URL (→ `make brandkit`), a UI worth capturing
   (→ `make capture`), stats that are TRUE (→ `dna.stats`), logo/assets. Never invent numbers.
5. **CTA** — the exact end action (url, "start free", date).

Tone is NOT asked: it is derived from the brand's own site (Step 2). If the user volunteers
a tone, it overrides.

## Step 2 — Derive the design language FROM the site (no canned styles)

There is no style menu. The brand's own site is the art direction. Do the study, literally:

```bash
make brandkit URL=… NAME=…      # colors pack + DNA + fonts + favicon
make lookbook URL=… NAME=…      # screenshots: full page + 3 viewport depths
```

Read the lookbook images and answer, in words, in your reply:
- **Typography**: serif/sans/mono mix? weight extremes? tight or airy tracking?
- **Density**: whitespace-first or busy? big single statements or grids of cards?
- **Shape language**: radius, borders, shadows — sharp/technical or soft/friendly?
- **Signature details**: hand-drawn annotations, marker highlights, terminal windows, gradients,
  grain — whatever the site does that nothing else does, the VIDEO should do too.
- **Motion character**: does the site itself animate? snappy or calm?

Every video decision must trace to one of those observations ("film-burn sting because the
brand is warm analog orange", "whip cuts because the site is dense and fast"). If a choice
can't be justified by the site, don't make it. Two brands end up different because their
sites ARE different — not because a hash picked a different preset.

**The extremes rule.** The study must surface **2–3 details that would be WRONG for any other
brand** (ThreadCite: logos inline in headlines, gray-ink fear section, rank chips). "Bold sans,
whitespace-first" describes half of SaaS — if the homepage yields nothing brand-unique, WIDEN
the study (product screens, docs, changelog, the founder's X) until it does. Generic evidence
in, generic video out.

**Set the brand's motion personality.** Write `motion` into `themes/<name>.json` from the study
— `{easing, bounce, settle, enter, durationScale, stagger}` — so the same primitives physically
move differently per brand (punchy: short settle/tight stagger; calm: long settle/no bounce).
Leaving motion at defaults is shared DNA across brands; don't.

**Name 2–3 references** that fit THIS brand ("Vercel keynote restraint", "Sandwich Video
warmth") and state what the design borrows and what it refuses. Different reference triangle,
different output — this breaks the author's own habits.

## Step 3 — Storyboard on paper before JSON

Beat table first (in the reply, not a file): Hook (≤3s, no name-drop if teasing) → Build →
Proof (real UI capture / true stat) → Payoff → CTA (3–5s). One idea per beat. Budget seconds
per beat to the target duration. THEN pick the path:

- Repeating pattern with a tuned format (demo walkthrough, threadcite editorial, launch teaser,
  brandfilm narrative) → author that format's JSON.
- Anything bespoke → **hyperscene** (open canvas: layers/cuts/stings/bg windows/camera —
  `formats/hyperscene/schema.json` is the contract).

## Step 3b — Choreography rules (anti-monotony; from motion-design craft)

- **Layout variety**: no layout archetype twice in a row. Rotate: split (headline left / artifact
  right) · centered-top with full-width artifact · full-bleed statement · asymmetric card-over-board.
  Storyboard must name each beat's archetype.
- **Rhythm variety**: entry pace is a VOICE, not a constant. Vary `enterDur`/`each`/`stagger` per
  beat with intent — ambient elements drift (0.8–1.2s), payoffs snap (0.25–0.35s), thesis lines are
  luxurious (each 0.5+). Uniform 0.45s everywhere reads as monotone.
- **Hierarchy through offset**: related elements stagger "one after another" (60–120ms); the ONE
  most important element on each beat moves last or most — motion order = reading order.
- **Easing = physics**: entrances decelerate (ease-out family), exits accelerate (rush), ambient
  loops sinusoidal. Never linear on visible moves.
- **Icons with names**: whenever a company/product/tool is named, show its mark (simple-icons)
  or a Lucide UI icon (`engine/assets/icons/ui/`, MIT, stroke color baked) — text-only lists of
  named things are a missed layer of craft.

## Step 4 — Author → verify (non-negotiable ladder)

`make validate` → `make video` → `make motion --data <file>` → `make audit M=<fmt>` (text AND
image contrast) → **`make ledger D=<file>`** (cross-video sameness vs every shipped design —
SAME fails; fix by changing ≥2 of cut family / beat structure / layout archetype) → eyeball
hook / payoff / CTA frames. Fix data, re-render. Never ship unverified.
After the user approves the shipped video: `make ledger-add D=<file>` logs it to the design
memory (`dna/ledger.json`) so future videos are checked against it.

## Differentiation rules (why outputs differ per user/brand)

- NO em-dashes in any on-screen copy (validator-enforced). Use a comma, period, or ·.
- Use the brand's REAL iconography and images wherever the site does: favicon, product UI captures, inline logos, semantic chips. A text-only video for an icon-rich brand fails the site study.

- Colors ONLY from the brand's theme pack; dominance decides light-first vs dark-first.
- Copy ONLY from the brand's own words (dna headings/tagline) — polish, don't invent.
- Motion personality derived from the site study above; pacing from the brief.
- Same input → byte-identical output; different brand → visibly different video. Both are
  features. If two brands ever look alike, the site study was skipped — redo the study, not the JSON.
