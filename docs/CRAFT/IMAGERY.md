# IMAGERY & ICONS — choosing and treating visuals

The highest-taste image source is **captured real product UI** (`make capture`). Everything below is for when you
need another visual. An untreated stock photo is worse than none.

## 1. Use the lightest visual that carries the meaning
Ladder, lightest first — go heavier only if it adds meaning, not decoration:

**nothing / solid field  →  gradient  →  generated card (`make assets`)  →  captured real UI  →  illustration  →  photo**

A clean gradient beats a mismatched photo. If a beat reads fine on a plain field, don't add an image.

## 2. Treat every image so it feels intentional
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

## 3. Licensing — what's safe vs what triggers a claim
- **Safe:** CC0 / public-domain photos (`make photos` records attribution; CC-BY needs a visible credit), your own
  assets, and **brand logos used nominatively** as trademarks (`cdn.simpleicons.org/<slug>/<hex>`).
- **NEVER embed** (triggers Content-ID / copyright on a published video): movie/TV stills, album art, film posters,
  news/press photos, paid stock without a license, copyrighted music. **Capture the real product UI instead.**

## 4. Icons
- **Brand marks → simple-icons** (`curl https://cdn.simpleicons.org/<slug>/<hex>` → `assets/icons/`).
  Whenever a company/product/tool is *named*, show its mark — text-only lists of named things are a missed layer.
- **UI / action icons → one line set** (Lucide/Feather, in `assets/icons/ui/`, MIT). Draw with `svgIcon(name)`.
- **Never mix icon families** — one stroke set, one weight; match stroke weight to the text weight next to it.
- **Mono by default;** colour only for authentic brand logos. Keep a light variant (`#f3f3f0`) for dark bgs and a
  `-dark` variant (`#0e0e0d`) for light bgs — a mono logo the same value as the bg is invisible (see [../MISTAKES.md](../MISTAKES.md) #7).
- **Size on the spacing scale** and optically balance (a circle looks smaller than a square of the same box); a
  logo reads at ~7% of frame height, never below ~5% (`make audit` flags tiny images).

## 5. Generated imagery (kie.ai)
`make gen-image Q="…" NAME=<name>` → a normal `image` layer; `make gen-video`/`gen-clip` → a deterministic `clip`
layer. Still treat generated stills (grade/edge-fade/ken) and match them to the palette — generated ≠ exempt from taste.

**Sources:** Refactoring UI (working with images, scrims/overlap); Creative Commons licensing; simple-icons /
Lucide system guidance; this repo's [../MISTAKES.md](../MISTAKES.md) (untasteful-image, logo-value).
