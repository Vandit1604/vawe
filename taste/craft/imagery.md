---
when: choosing an image, a gradient or an icon, treating a photo, or fetching a brand mark
answers: the visual ladder · where a real asset comes from · treatment by intent · licensing · icon choice
group: look
---

# IMAGERY and icons: choosing and treating visuals

The highest-taste image source is a captured real product UI. Everything below is for when you need another
visual. An untreated stock photo is worse than none. Where each image came from and what treatment earned its
place should be answerable for every image.

## 1. Sources, in order

1. **A capture of the real UI.** The highest-taste source. Never a fake or mocked-up screen.
2. **Free, openly licensed images.** Brand logos, flags (`flagcdn.com/<iso2>.svg`), CC0 or CC-BY photos.
   CC-BY needs a visible credit.
3. **Drawn icons and inline SVG.**
4. **Generated images.** Treat and grade them like any other: generated is not exempt from taste.
5. **Emoji.** A last resort, or a deliberate hero-scale subject.

**Fetch logos with `curl -f`.** `curl -o` writes the body whatever the status. Simple Icons removes marks on
trademark request, so a bare curl can 404 and leave a zero-byte `.svg` that passes every path check and renders
as an invisible hole. Require a 200 and a literal `<svg` before you keep the file:

```bash
curl -fsS https://cdn.simpleicons.org/<slug> -o <dest> || rm -f <dest>
```

## 2. The lightest visual that carries the meaning

The rule is [image-source-order](../rules/image-source-order.md). Ladder, lightest first. Go heavier only when it adds meaning:

nothing or a solid field, a gradient, a generated card, a captured real UI, an illustration, a photo.

A clean gradient beats a mismatched photo. If a beat reads fine on a plain field, add no image.

## 3. Treat every image

A raw flat image reads as a dropped screenshot. Pick the treatment by what the image must do:

| The image needs to | Treatment |
|---|---|
| sit in the frame without a hard rectangle edge | fade the edges into the ground (a `mask-image` gradient) |
| not be static | a slow Ken Burns push |
| read as a UI card or product, not a photo | clip to a rounded shape, give it a device or card frame |
| carry text on top and stay legible | a scrim: a dark overlay under the type |
| belong to the brand's colours | duotone or a grade to the palette |
| feel like one film, not a scrapbook | one grading recipe across the whole piece |

Other treatments: a perspective tilt, a floating extracted element at another depth, a scroll reveal. Use
the lightest treatment that does the job ([image-treatment](../rules/image-treatment.md)). An over-graded image is as off as a raw one. A held still is right
when the pattern is "hold the picture, move the type" ([grammar.md](grammar.md)).

## 4. Licensing

The rule is [licensed-assets](../rules/licensed-assets.md).

- **Safe:** CC0 and public-domain photos, your own assets, and brand logos used nominatively.
- **Never embed copyrighted material in a published video** (it triggers Content ID claims): posters, album
  covers, film stills, news photos, paid stock without a licence, copyrighted music. Capture the real
  product UI instead.
- Check a new stock source against `../ASSET-SOURCES.md`: shippable sources may be committed, local-only
  sources may only be fetched onto disk, never redistributed inside the repo.

## 5. Icons

The rule is [icon-family](../rules/icon-family.md).

- **Brand marks:** simple-icons. Whenever a company or tool is named, show its mark. A text-only list of
  named things is a missed layer.
- **UI and action icons:** one line set (Lucide or Feather, MIT). Never mix icon families: one stroke set,
  one weight, matched to the text beside it.
- **Mono by default,** colour only for authentic brand logos. Keep a light variant for dark grounds and a
  dark variant for light grounds. A mono logo the same value as the ground is invisible.
- **Size by optical balance.** A circle looks smaller than a square of the same box. A logo has a minimum size ([logo-prominence](../rules/logo-prominence.md)).

Sources: Refactoring UI (images, scrims); Creative Commons; simple-icons and Lucide guidance.
