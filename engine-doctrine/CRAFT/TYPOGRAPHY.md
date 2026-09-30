---
when: "picking a font or type face, or sizing headlines"
answers: "which face signals which personality, pairing, the size scale, weight, tracking and leading, the overused-face list"
group: look
---

# TYPOGRAPHY: choosing and setting type

A good face does about 90% of the work: spend the effort before styling (Butterick). When you reflect a
brand, the face is decided for you: use the site's real font, at the weight its CSS sets. This page is
for choosing when the choice is open, and for sizing and spacing either way.

## Measure first, never guess the weight

You will look at a site's big headline, decide it is 800 and type 800. Read the site's real CSS and
computed styles first (font family, weight, size, tracking, `--font-*` tokens). Creed's headline is 600.
It was authored as 800 by eye and shipped wrong. CSS tokens beat pixels for anything declared: an eyedrop
read Creed's accent as the sky photo's blue when the CSS says `#2563eb`.

## Guardrails: you know these rules and you break them

Borrowed from reference design notes, with our measurements.

- **Look at the bundled faces before you pick a pairing** (`assets/fonts/`). Otherwise you reach for the
  same eight fonts every time, and that is your training default, not a choice. Banned as defaults: Inter,
  Roboto, Open Sans, Noto Sans, Lato, Source Sans, PT Sans, Nunito, Poppins, Outfit, Sora, Playfair
  Display, Cormorant Garamond, Bodoni Moda, EB Garamond, Cinzel, Prata and Syne (Syne is the most
  overused "distinctive" display font, an instant AI tell). The eight a generator picks for
  "distinctive": Bricolage Grotesque, Instrument Serif, Fraunces, Archivo Black, DM Serif Display, Space
  Grotesk, Fredoka. Being bundled is not an argument. Instrument Serif was picked for a real film and
  rejected by the person who asked as "a saturated AI-default face". `AGENTS.md` bans Inter and Space
  Grotesk with no brand reason.
- **Reject your first instinct.** The first face that feels right is usually your default for that
  register. If you picked it last time too, find another.
- **Do not pair two sans-serifs.** Cross the boundary: serif and sans, or sans and mono. A superfamily
  (Geist and Geist Mono) is the safest two-face system, and it is that crossing.
- **One expressive face per scene.** One performs, one recedes.
- **Weight contrast must be extreme.** You default to 400 against 700. Video needs 300 against 900,
  visible in motion at a glance. Shipped films almost never used the extremes even though the loaded
  faces carry the full 100 to 900 range.
- **Video sizes, not web sizes.** You will try 14 px. Full-screen viewing: body 20 px at least, headlines
  60 px and up, data labels 16 px. In a phone feed the video plays small, so body 32 px, headlines 90 px,
  labels 24 px.
- **Fill the frame with hero text: 60 to 80% of the frame width.** Measured over an earlier library,
  landscape hero ink sat at a 40% median and 83% of sampled frames fell below the 60% floor. Portrait was
  already in band. The fix is rarely a wider box: the glyphs filled only 67% of the declared boxes. Use
  bigger type.
- **Tracking tighter than web on display sizes**: about -0.03 em to -0.05 em in the reference notes
  (compression eats letter detail). That is their number, not our measurement. Section on tracking
  below stays until someone measures.

## The font system: one to three faces, with roles

Three is the ceiling and one is often enough. Give each face a role like colours have: primary
(headlines and most body, the brand's voice), secondary (optional, a contrasting support face), accent
(data, code, counters, one special line, usually mono). Do not reach for a face without a role. Use
tabular numerals on counters so the width does not jitter. Emphasis inside a line is a recolour at the
same weight, not a heavier bold.

Current vawe brand faces: Archivo, Unbounded and JetBrains Mono.

## Choose the face by the signal you want

| class | signals | reach for it when |
|---|---|---|
| geometric sans | modern, rational, cool | logos, big headlines (tires at length) |
| humanist sans | warm, legible, approachable | body and UI, the safe default |
| grotesque | neutral, corporate, objective | data, editorial restraint |
| serif | authoritative, editorial, trustworthy | a pull-quote, luxury or print feel |
| mono | technical, precise | filenames, counts, terminals |
| handwriting | human, annotation, warmth | one marker note, sparingly |

Name the signal out loud and commit. Pair with contrast, not conflict: two similar sans fight.

## Size from a scale

Pick a ratio, hand-pick about five sizes, reuse them. Editorial or display drama: 1.333 to 1.618. Dense
or dashboard: 1.2 to 1.25. At 1080p landscape a hero headline lives around 96 to 140 px, a support line
44 to 64 px, a caption 28 to 36 px. The gap between hero and caption should be obvious: scale contrast is
the first hierarchy tool (`LAYOUT.md`). Hook to caption across the shipped library ran 3.4:1 to 4:1.

## Weight, tracking, leading, measure

- Hierarchy comes from weight and colour, not size alone. Supporting text is lighter or dimmer, not just
  smaller. Body never below 400, except a deliberate white-on-black correction.
- Tighten large display (about -0.02 to -0.03 em on big headings). Open uppercase and small caps. Never
  letterspace lowercase.
- Light ink on a dark ground bleeds into its counters and reads heavier and tighter than black on white.
  Open the tracking back up a little at hero sizes (about +0.01 em at 120 px). Drop body weight (400 to
  350) and open leading (+0.05 to 0.1) by hand when a dark scene needs it.
- Leading: body 1.2 to 1.45; big headlines 1.02 to 1.1; longer measure looser.
- Measure, 45 to 75 characters (about 66 ideal), applies to body and captions only. The measure protects
  the return sweep of the eye, and a line nobody returns from has none. Display type is exempt: a hook,
  headline, stat or payoff line (60 px and up, or a line short enough for one fixation) fills 60 to 80%
  of the frame width instead. The two rules never bind one layer.

## Motion-graphics specifics

- Video type is read at a distance and through grain and compression: favour heavier weights and
  generous size. Thin weights shimmer.
- No em dash on screen (the validator rejects it). Use a comma, a period or a middle dot.
- The renderer waits for `document.fonts.ready` and fails the render on a font that errors. A headline
  that looks generic is almost always an unloaded face: fix its `@font-face` src.

Sources: Butterick, Practical Typography; Refactoring UI; Material 3 typography; type-scale.com.
