---
when: "authoring a `theme` palette, choosing bg/accent"
answers: "build from one dominant · 60-30-10 · dominance · deploy-for-mood · gradient-vs-flat · WCAG"
group: look
---

# COLOR — building a palette

Colours come **only from the brand** — eyedrop the real pixels (`make palette`), never invent. This guide is
how to turn those pixels into a full `theme.palette` and use it well. Maps to the theme contract keys:
`bg, bg2, surface, surface2, line, lineStrong, text, text2, dim, ink, accent, accentDim, accentGlow, up, down`
+ 3 `gradient` stops.

## 1. Decide dominance FIRST — by looking, never by a field
A white site gets a **light-first** video; a dark site gets **dark-first**. Decide by looking at the hero
(confirm with `make palette`'s luminance read). A mislabeled dominance is how the worst videos happen
(see [../MISTAKES.md](../MISTAKES.md) #1). Commit fully — don't do 50/50.
- **Light-first:** `bg` = the site's off-white, `text` = near-black `ink`, `accent` = its vivid colour.
- **Dark-first:** `bg` = a tinted near-black (never pure `#000`), `text` = off-white, `accent` = its vivid colour.

## 2. Build from one seed
1. **Neutrals first** — most of a frame is neutral. Set `bg → bg2 → surface → surface2` (the field + card tones)
   and `text → text2 → dim` (primary → secondary → tertiary). `line/lineStrong` are hairline separators.
2. **One accent, held sacred** — `accent` is the 10%: the single thing that pops / moves / reveals last. Overusing
   it kills emphasis. `accentDim`/`accentGlow` are its soft fill + halo.
3. **Semantic:** `up` = success/positive (green family), `down` = danger/negative (red/violet family). Keep them
   distinct from the brand accent — status is not decoration.

## 3. 60-30-10
60% dominant/neutral field · 30% secondary tone · 10% accent. This gives one clear focal colour and prevents
"colour soup". (From interior design.) In practice: a beat is mostly `bg`, structured with `surface`/`text2`,
and the accent appears once.

## 4. Make tints/shades without mud (HSL reasoning)
- Don't only change lightness. **Rotate hue toward a neighbour** as you go (toward yellow when lightening, toward
  blue/violet when darkening — it mimics real light) so ramps stay alive.
- **Raise saturation** as lightness moves away from 50%, or colours wash out to grey.
- **Tint the neutrals** — greys near a colour should carry a hint of the hue (a warm ink, a cool grey); pure
  `#808080`/`#000` reads dead. `bg` and `ink` should be *tinted* near-white / near-black.

## 5. Contrast — overshoot for big video type
WCAG floors: **4.5:1** body · **3:1** large text (≥24px, or ≥18.7px bold) · **3:1** non-text/UI. AAA = **7:1**.
- **Aim ~7:1 for headlines.** Motion, grain, compression, and busy/photographic backgrounds all erode *effective*
  contrast, so AA is not enough for display type. `make audit` hard-fails the unreadable and flags weak headlines.
- **Emphasis (`<b>`) on an accent-coloured background** must not be the accent (blue-on-blue vanishes) — the engine
  auto-falls-back to the layer colour; override with `emColor` if needed (see [../MISTAKES.md](../MISTAKES.md) #9).

## 6. Deploy the palette for a mood (intent → how you use it)
The colours are fixed by the brand; the *mood* comes from how you deploy them. Same palette, different feeling:

| The beat should feel… | Do this with the palette |
|---|---|
| calm, premium, spacious | mostly `bg`/`bg2`, accent held back to one appearance, high whitespace |
| tense, dramatic | deep `bg` (dark-first), a single muted accent, big value contrast on the hero |
| energetic, alive | more saturated accent, accent appears more often, light↔dark value flips between beats |
| trustworthy, technical | flat neutrals, accent only on the one thing that matters (a number, a CTA) |
| warm, human | tinted neutrals (a warm ink, cream `bg`), softer contrast, serif + accent low-sat |

Value is the strongest mood lever: **dark-first = serious/cinematic, light-first = clean/confident.** Saturation
is the energy dial. Accent *frequency* is the excitement dial (once = restrained, several times = lively).

## 7. Gradient field vs flat — when to reach for a gradient
Backgrounds are palette-driven presets (`core/backgrounds.js`). A gradient field adds atmosphere but competes
with content, so it follows the plain-vs-busy rule (see [DENSITY.md](DENSITY.md), [STORY.md](STORY.md)):

- **Reach for a gradient/atmospheric bg** (`aurora` · `mesh` · `brandglow` · `spotlight` · `soft` · `constellation`)
  on **low-copy vibe beats** — the hook, a CTA, a transition, an emotional beat. It sets register in the negative space.
- **Go flat** (`plain` · `paper` · `dark` · `ink` · `deep` · `accentPlain`) on **high-copy and payoff beats** — a big
  number, a bold line, a UI capture that must breathe. Never put a gradient behind the thing the beat exists to land.
- **Only use a gradient the real site has.** A flat/minimal brand gets a flat field; inventing an `aurora` for a brand
  that has none is off-brand (see [../MISTAKES.md](../MISTAKES.md)). The theme's 3 `gradient` stops feed these presets, so
  a gradient always stays inside the brand's family.

## 8. Cohesion
One accent across the whole piece · vary **hue only within the brand's family**, flip **value** (light↔dark) for
drama (a value flip is itself a transition) · patterns are seasoning, not wallpaper. Backgrounds pull from this
same palette (`core/backgrounds.js` is palette-driven), so one pack reskins every bg.

**Sources:** Refactoring UI (accessible colour systems, defining greys first); Material 3 (tonal palettes, error/
semantic roles); WCAG 2.x (1.4.3 / 1.4.11); 60-30-10 (interior-design rule).
