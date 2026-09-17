---
when: choosing image vs gradient, treating a photo, icons, or fetching a brand mark
answers: the visual ladder · where a real asset comes from · treatment→intent · licensing · icon choice
group: look
applies-when: hasImages
confirm: "where did each image come from, and what treatment earned it its place?"
---

# IMAGERY & ICONS: choosing and treating visuals

## AGENT SUMMARY

- Prefer the lightest real visual: captured real UI (`make capture`) first, a raw stock photo last.
  Treat every image (edge-fade, `ken`, clip-to-shape, scrim, grade) so it feels intentional, and
  fetch logos through `make assets` (or `curl -f`), never a bare `curl -o`.
- Enforced by the beats fidelity gate (untreated/off-brand images fail it) and `make audit`
  (flags tiny logos below ~5% of frame height).
- Checkable action: where did each image come from, and what treatment earned it its place?

The highest-taste image source is **captured real product UI** (`make capture`). Everything below is for when you
need another visual. An untreated stock photo is worse than none.

## 0. Always prefer a real image. Where one comes from, in order

1. **Captured real UI**: `make capture` (a live component) is the highest-taste source.
2. **Free/openly-licensed images**: brand logos, flags `flagcdn.com/<iso2>.svg` → `assets/flags/`;
   CC0/CC-BY photos via `make photos` (attribution auto-recorded; CC-BY needs visible credit).
3. **Drawn icons**: `svgIcon(name)`. 4. **Generated cards**: `make assets`. 5. **Emoji**: last resort.

**Use `make assets` for logos, and if you curl one by hand, use `-f`.** `curl -o` writes the response
body whatever the status is, and Simple Icons removes marks on trademark request, so a bare curl can
404 and leave a **zero-byte .svg** on disk. The file then exists, passes every path check, and renders
as an invisible hole. `harness/media/assets.mjs`'s `tryFetch` gets this right: it requires 200, a
minimum size AND a literal `<svg` before it writes, which is why `make assets` is the answer and a
bare curl is not:

```bash
curl -fsS https://cdn.simpleicons.org/<slug> -o <dest> || rm -f <dest>
```

## 1. Use the lightest visual that carries the meaning
Ladder, lightest first. Go heavier only if it adds meaning, not decoration:

**nothing / solid field  →  gradient  →  generated card (`make assets`)  →  captured real UI  →  illustration  →  photo**

A clean gradient beats a mismatched photo. If a beat reads fine on a plain field, don't add an image.

## 2. Treat every image so it feels intentional

> **Never embed a raw flat image. Every image must have motion treatment.** There are five treatments,
> and this engine supports all five: a perspective tilt (camera `rx`/`ry`, `three:"uiParallax"`), a slow
> Ken Burns zoom (`ken`), a device frame (clip + `radius`), a floating extracted element at another
> depth, and a scroll reveal (`recordedPan`). You will drop the screenshot in flat and move on. The `ken`
> row below is this rule in our own words, and it is the DEFAULT for a reason.

A raw, untreated, off-brand photo reads as slop and fails the beats fidelity gate. Pick the treatment by what the
image needs to DO, not by habit:

| The image needs to… | Treatment | Note |
|---|---|---|
| sit in the frame without a hard rectangle edge | **`edgeFade`** | dissolve L+R edges into the bg; set `edgeFadeColor` to the bg on dark scenes |
| not be static (a held still) | **`ken`** | slow Ken-Burns zoom (3–8%); the default so nothing sits dead |
| read as a UI card / product, not a photo | **clip to a shape** + `radius` | a card, not a raw rectangle |
| carry text on top and stay legible | **scrim** | a 40–60% dark overlay under the type |
| belong to the brand's colours | **duotone / grade to the palette** | pull the accent from the brand (see [COLOR.md](COLOR.md)) |
| feel like one film, not a scrapbook | **one grading recipe across the whole piece** | same duotone/grain/crop logic everywhere, or it fragments |

Reach for the **lightest** treatment that does the job (a clip + ken is enough for most UI captures); stack more
only when the image genuinely needs it. An over-graded image is as off as a raw one.

## 3. Licensing, what's safe vs what triggers a claim
- **Safe:** CC0 / public-domain photos (`make photos` records attribution; CC-BY needs a visible credit), your own
  assets, and **brand logos used nominatively** as trademarks (`cdn.simpleicons.org/<slug>/<hex>`).
- **Never embed copyrighted material** into a published video (it triggers Content ID claims): movie/TV
  posters, album covers, film stills, news photos, paid stock without a license, copyrighted music.
  **Capture the real product UI instead.**
- **Fetching stock footage or photos from a new site?** Check it against
  [`../ASSET-SOURCES.md`](../ASSET-SOURCES.md) first: SHIPPABLE sources may be committed, LOCAL ONLY
  sources may only be fetched fresh onto disk, never redistributed inside this repo.

## 4. Icons
- **Brand marks → simple-icons**, fetched with `make assets` (or the `curl -f` form in §0) → `assets/icons/`.
  Whenever a company/product/tool is *named*, show its mark. Text-only lists of named things are a missed layer.
- **UI / action icons → one line set** (Lucide/Feather, in `assets/icons/ui/`, MIT). Draw with `svgIcon(name)`.
- **Never mix icon families**: one stroke set, one weight; match stroke weight to the text weight next to it.
- **Mono by default;** colour only for authentic brand logos. Keep a light variant (`#f3f3f0`) for dark bgs and a
  `-dark` variant (`#0e0e0d`) for light bgs. A mono logo the same value as the bg is invisible (see [../MISTAKES.md](../MISTAKES.md) #7).
- **Size on the spacing scale** and optically balance (a circle looks smaller than a square of the same box); a
  logo reads at ~7% of frame height, never below ~5% (`make audit` flags tiny images).

## 5. Generated imagery (kie.ai)
`make gen-image Q="…" NAME=<name>` → a normal `image` layer; `make gen-video`/`gen-clip` → a deterministic `clip`
layer. Still treat generated stills (grade/edge-fade/ken) and match them to the palette, generated ≠ exempt from taste.

## Provenance

**Do not re-add:** a bare `curl -o` for fetching a logo. It zero-byted two shipped assets
(`assets/icons/amazon.svg` among them), breaking three scenes silently, before `core/engine/boot.js` learned
to refuse an asset that never loaded. Use `make assets` or `curl -f`.

**Sources:** Refactoring UI (working with images, scrims/overlap); Creative Commons licensing; simple-icons /
Lucide system guidance; this repo's [../MISTAKES.md](../MISTAKES.md) (untasteful-image, logo-value); this
doc's own mandatory image treatment rule above.
