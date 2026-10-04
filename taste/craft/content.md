---
when: a beat draws a screen, window, product or photo, or a film reads as plain beside its reference
answers: the four content numbers · dense where dense, quiet where quiet · theme source · designed screens · what real material means
group: density
---

# CONTENT: how rich a frame is, measured against the reference

The rules are [dense-where-dense](../rules/dense-where-dense.md) and [theme-source](../rules/theme-source.md). A film that copies a reference's motion exactly can still ship a grey mock window, tiny type and a white
still. A good camera cannot fix dull content. Compare a film to its reference per act: dense where the
reference is dense, quiet where it is quiet. Never use one fixed bar.

## The four numbers

`harness/media/content.mjs` is the one owner (`harness/media/study.mjs` reads frames through it), so the
reference and the film are measured the same way.

| number | what it says |
|---|---|
| colorfulness | Hasler and Susstrunk 2003 `M` metric, banded not to extremely |
| fill | share of pixels that differ from the ground (median of a 4 % border ring): a real subject occupies space a flat mock does not |
| detail | mean luma gradient: type and imagery have edges, a flat panel does not |
| photo | share of 16 px cells with natural texture: a photograph textures differently from a UI panel |

Type size in frame is not measured. Look at it (`bin/vawe critique`, a fresh judge).

## Dense where dense, quiet where quiet

Measured once against a reference film with three acts:

| act | fill (reference / ours) | detail | photo |
|---|---|---|---|
| editor | 0.14 / 0.07 | 1.7 / 2.6 | 0.01 / 0.03 |
| cards | 0.34 / 0.15 | 12.2 / 4.7 | 0.28 / 0.06 |
| results | 0.71 / 0.17 | 13.3 / 5.9 | 0.22 / 0.05 |

The gap sat in the acts that show product and photos. The quiet editor act was quiet in both. A busy
number is not automatically good, and a quiet act is not automatically a defect.

## Theme source (owner ruling)

- A brand site or URL: the theme comes from it ([color.md](color.md)).
- A bare prompt with no brand: ask for a reference or a theme.
- "You choose": invent a beautiful theme. Never default to plain grey.

## Screens (owner ruling)

A product screen in a film is designed for the video, not a plain mock. Use a real capture when a
video-ready screen exists. Otherwise build a fragment for the shot ([screens.md](screens.md), [screen-designed](../rules/screen-designed.md)). Never a plain grey
window standing in for a screen nobody built.

## What real material means

- A captured or designed screen at hero size, not a thumbnail, filling the share of frame the
  reference's act fills.
- Real photos, never an invented image.
- Display-size type: a headline sized to be read, not a caption doing a headline's job.

See [imagery.md](imagery.md) (sources, treatment, licensing), [screens.md](screens.md) and [law.md](law.md) (the value test every beat
must pass).
