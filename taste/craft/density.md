---
when: a beat looks flat or slide-like, or a film reads as plain beside its reference
answers: "hero plus proof · the produced-not-generated tell · thin beats · a background that is not empty · the four content numbers against a reference, act by act · theme source"
group: density
---

# Density: produced, not generated

The biggest reason a beat looks generated (flat, web-page-like) instead of produced is too few elements
carrying too little information. One headline on empty space reads as a slide.

## The rule

The rules are [hero-plus-proof](../rules/hero-plus-proof.md) and [theme-source](../rules/theme-source.md); this page keeps the reasons.

- **A long held beat carries a hero plus proof.** The hero states the claim. The proof shows
  it: a captured screen, a stat, a chart, a diff, a live demo. One focal point stays dominant
  ([one-focal-point](../rules/one-focal-point.md)); the proof is subordinate in size, contrast and motion.
- **The background is not empty.** A pure solid `#000` reads as "nothing loaded". Use a radial glow,
  oversized ghost type bleeding off the frame, a hairline rule, a subtle panel, a few decoratives per beat.
- **Decoratives are seasoning.** A decorative that moves does so with the beat's own element motion; a drifting ground is one option for a held frame (rule living-ground), never the fill and never the hold's life. The background
  never carries information and never becomes new content or an unrequested claim.
- **A deliberate held hook or end card may run lean.** The world keeps moving ([moving-tail](../rules/moving-tail.md)).

## Do not

- Put a big word centred on empty space with nothing else.
- Add decorative noise just to fill. Every element informs or frames.
- Make supporting detail louder than the hero. If you read it first, it is too loud.
- End on a bare backdrop with no content layer.
- Add corner labels, registration marks or frame borders ([no-tells](../rules/no-tells.md)): nothing decorates the edge.

Density is information per frame, not element count. [show-dont-tell.md](show-dont-tell.md) is the other half: a decorated
frame does not excuse an unillustrated claim.

## How rich a frame is, measured against the reference

A film that copies a reference's motion exactly can still ship a grey mock window, tiny type and a white still. Compare a film to its reference per act: dense where the reference is dense, quiet where it is quiet. Never use one fixed bar. `harness/media/content.mjs` is the one owner of the four numbers (`harness/media/study.mjs` reads frames through it), so the reference and the film are measured the same way:

| number | what it says |
|---|---|
| colorfulness | Hasler and Susstrunk 2003 `M` metric, banded not to extremes |
| fill | share of pixels that differ from the ground (median of a 4 % border ring): a real subject occupies space a flat mock does not |
| detail | mean luma gradient: type and imagery have edges, a flat panel does not |
| photo | share of 16 px cells with natural texture: a photograph textures differently from a UI panel |

Measured once against a reference film with three acts (fill, reference / ours): editor 0.14 / 0.07, cards 0.34 / 0.15, results 0.71 / 0.17; detail 13.3 / 5.9 and photo 0.22 / 0.05 in results. The gap sat in the acts that show product and photos. The quiet editor act was quiet in both: a busy number is not automatically good, and a quiet act is not automatically a defect. Type size in frame is not measured: look at it (`bin/vawe critique`).

- **Theme source (owner ruling).** A brand site or URL gives the theme ([color.md](color.md)). A bare prompt with no brand: ask for a reference or a theme. "You choose": invent a beautiful theme, never default to plain grey.
- **Real material.** A captured or designed screen at hero size, not a thumbnail, filling the share of frame the reference's act fills (a product screen is designed for the video: see [show-dont-tell.md](show-dont-tell.md)). Real photos, never an invented image ([imagery.md](imagery.md)). Display-size type: a headline sized to be read, not a caption doing a headline's job. The value test every beat must pass is in [law.md](law.md).
