---
when: you are merging the inline-assets branch and need its MISTAKES entries
answers: "the capture localizer findings, staged for docs/MISTAKES.md so two agents do not edit that file at once"
group: process
---

# Pending MISTAKES entries (branch `wt-inline-assets`)

Append these to `docs/MISTAKES.md` at merge time and delete this file. They live here only because
several agents shared the tree and `docs/MISTAKES.md` was owned by another one.

## #264 — a capture localizer that only recognised an asset by its file extension

**What.** `formats/scene/brew-launch.json` re-downloaded five email previews and three product
screenshots from `brew.new` on every render. The film was not reproducible, degraded silently when the
CDN was slow or unreachable, and would have changed if brew edited those images. Sixteen `<img>` tags
across four captures were affected, plus nine on `linear.app`.

**Root cause, three faults in one line of `capture-component.mjs`.** The script already tried to
localize. It collected URLs with `/https?:\/\/[^"')\s]+/g` over the raw html and kept only those
matching `/\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i`.

1. The filter demanded the extension be followed by `?` or end-of-string.
   `…image?url=…preview.png&w=1200&q=70` has the extension mid-query, so every brew asset was skipped
   and no message said so. Linear's `imagedelivery` URLs carry no extension at all.
2. The scan read attribute TEXT, where `&` is stored as `&amp;`. Even a URL that passed the filter was
   fetched as a different URL than the browser resolves. `core/preload.js` records the identical
   mistake being made and corrected in `preloadEmbeddedImages`.
3. It was a scan for URLs, not for asset references. `http://www.w3.org/2000/svg` in an `xmlns` and
   `<a href="https://reddit.com/…">` are both URLs and neither is an asset. The filter hid this by
   accident, and any widening of the filter would have started fetching namespaces.

**Fix.** `scripts/brand/localize-assets.mjs`. One tokenizer finds asset references BY CONTEXT, from a
table of (tag, attribute) pairs: `img`/`source` `src` and `srcset`, `video` `src` and `poster`,
`audio`/`track` `src`, SVG `image`/`use` `href` and `xlink:href`, the legacy `background` attribute,
`url()` inside a `style` attribute, and `url()` inside a `<style>` block. Entities are decoded before
the fetch. Downloads are identified by MAGIC BYTES, so a CDN that answers a hotlink with a 200 and an
HTML error page cannot be written to disk as `<hash>.png` and render as a broken card. Hyperlinks,
namespaces, `data:` URIs and `#fragment` references are never fetched.

**Why files beside the JSON and not `data:` URIs.** `core/seams.js` inlines fonts as `data:` because a
`url()` cannot resolve at all inside the isolated SVG raster; that is a rendering constraint, not this
one. Ours is a network dependency and a local file removes it just as completely, matches the `media/`
convention already on disk, dedupes an asset shared by two captures, and avoids inflating by a third a
JSON that every render worker parses.

**The identical bug next door.** `capture-scene.mjs` produces the same kind of html and never localized
anything. Both scripts now call `localizeCapture`.

**What now catches it.** A capture whose asset will not download FAILS and is not written, naming each
URL (`--allow-remote` is the deliberate escape hatch). `node scripts/brand/localize-assets.mjs` reports
the debt across every capture on disk; `--write` clears it. A capture that still carries a remote URL
keeps rendering, and `preloadEmbeddedImages` now warns once per remote URL, so the dependency shows in
the render log instead of only in a frame.

**Limit worth knowing.** A component inside a `seam` bake still renders its images blank
(`core/seams.js:371`). That limitation applies to every `image` layer too, so a component is not
special; curing it means teaching `seams.js` to inline what it rasterises.
