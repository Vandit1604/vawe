---
when: a beat draws a screen/window/product/photo, or a film reads as plain beside its reference
answers: the four content numbers · dense-where-dense/quiet-where-quiet · theme source (R1) · screens (R2) · what real material means
group: density
codes: plain-content
applies-when: hasImages
confirm: "is each act's content measured against the same act in the reference, not a fixed bar?"
---

# CONTENT: how rich a frame is, measured against the reference

## AGENT SUMMARY

- A film is compared to its reference PER ACT, dense where the reference is dense, quiet where the
  reference is quiet. `harness/media/content.mjs` measures both sides the same way, never a fixed bar.
- **R1, theme source**: a brand site gives the theme; a bare prompt means ASK; "you choose" means
  INVENT a beautiful one, never plain grey.
- **R2, screens**: a product screen in a film is DESIGNED for the video by default, not a plain mock.
- Checkable action: is each act's content measured against the same act in the reference, not a fixed bar?

## Why this exists

The harness measured a reference's motion, joints and grounds for years and never its CONTENT, so a
film could copy a reference's grammar exactly and still ship with a grey mock window, tiny type and a
white still, and nothing said so. The owner named the gap directly: "their content is designed for the
video; ours is plain." A good camera cannot fix dull content.

## The four numbers

`harness/media/content.mjs`'s `measureFrame`/`measureVideo` is the one owner: the reference's study, the
film's own content-check, and `make ideate --annotate` all read frames through it, so the two sides are
never measured two different ways.

| number | what it says | a still frame can carry it because |
|---|---|---|
| **colorfulness** | Hasler and Süsstrunk 2003's `M` metric, banded not/slightly/moderately/averagely/quite/highly/extremely | it reads off the whole frame's colour spread |
| **fill** | share of pixels that differ from the ground (the median of a 4% border ring) | a real subject occupies space a flat mock does not |
| **detail** | mean luma gradient | type and imagery have edges; a flat panel does not |
| **photo** | share of 16px cells with natural texture (many distinct colours, real luma spread) | a photograph textures differently than a UI panel |

Not measured, stated instead: type size in frame, which needs text detection; the look pass
(`make judge`, your own eye) records it.

## Dense where dense, quiet where quiet

Measured on `example-madera` against an earlier `vawe-flow` render, at four points inside each act:

| act | fill (madera / ours) | detail | photo |
|---|---|---|---|
| editor | 0.14 / 0.07 | 1.7 / 2.6 | 0.01 / 0.03 |
| cards | **0.34 / 0.15** | **12.2 / 4.7** | **0.28 / 0.06** |
| results | **0.71 / 0.17** | **13.3 / 5.9** | **0.22 / 0.05** |

The gap concentrated in the acts that show product and photos, not the quiet editor/tagline acts:
madera's own editor is quiet too. So the rule compares an act to the SAME act in the reference, never
against a global bar: a busy number is not automatically good, and a quiet act is not automatically a
defect. `make ideate --annotate <ref>` writes this per act into the reference's own film prompt
(`grammar/<ref>.prompt.md`) in words, e.g. `content: dense real material, fills about a third of the
frame, photographic (fill 0.34, detail 12.2, photo 0.28)` or `content: quiet, type on ground only`.
`storyboard-check` BLOCKS on `plain-content` when a beat names a screen/window/app/UI/dashboard/grid/
card/product/photo with no real source stated for it (no `fragment:` file on disk, no `assets/` or
`.vawe-data/uploads/` path, no `make capture`/`sections`/`screen`/`assets`/`photos`/`gen-image`/
`gen-video`/`gen-clip` mention). `harness/author/approve.mjs` runs this gate as the one precondition
for a user's sign-off, so a plan cannot reach approval naming a screen or a photo it has no real
source for. A film that names no content noun at all never trips this: a chart-only explainer, a
sting, a pure type film pass untouched. A chosen absence (a beat that draws a screen ON PURPOSE with
no real capture behind it) is a waiver, the one mechanism: `{"authoring":{"allow":
["plain-content@<beat title>"],"_why":{"plain-content@<beat title>":"…"}}}`.

## R1: theme source (owner ruling)

> "Colour from real content makes sense for websites, but normally a user will only have a prompt: ask
> the theme or ask them to point [to a reference]; but you can invent colors and themes beautifully
> when asked."

- A brand site or URL: the theme comes from it, the ordinary route (`make sections` + `make brandspec`
  + `make palette`, [`engine-doctrine/CRAFT/COLOR.md`](COLOR.md)).
- No brand, a bare prompt: ASK. `make quiz` asks a "Theme source" question exactly when no URL is
  known: point at a reference or a theme, or say "you choose".
- "You choose": INVENT a beautiful theme, never default to plain grey. Seed a palette from
  `skills/impeccable/scripts/palette.mjs`, name a colour direction with `command npx -y ui-skills list
  --category color`, and record `theme: invented` in the lock sheet so the choice is not lost.

## R2: screens (owner ruling)

> "Use a UI design harness to build beautiful mocks, not plain by default."

A product screen in a film is DESIGNED for the video by default: a real capture (`make capture` / `make
sections URL=`) when a real, video-ready screen exists; otherwise a fragment built for the shot with
`make screen F=<fragment.html> [KIND=editor|grid|dashboard|chat|card] [REF=<ref> ACT=<n>] [THEME=<name>]`
([`SCREENS.md`](SCREENS.md)). Never a plain grey window standing in for a screen nobody built.

## What "real material" means

- A captured or designed screen at hero size (not a thumbnail), filling the share of frame the
  reference's own act fills.
- Real photos (`make photos`), never an invented image.
- Display-size type: a headline sized to be read, not a caption doing a headline's job.

## See also

- [`IMAGERY.md`](IMAGERY.md): the image ladder, treatment, licensing.
- [`SCREENS.md`](SCREENS.md): `make screen`, the design-harness route for a mock.
- [`TASTE.md`](../TASTE.md): the value test every beat must pass regardless of content richness.
