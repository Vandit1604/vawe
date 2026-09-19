import type { MetadataRoute } from "next";
import pages from "../lib/site-pages.json";
import effects from "../lib/effects.json";
import blocks from "../lib/blocks.json";

/* site/app/sitemap.ts — every URL vawe.dev serves, generated from the same files the pages are.
 *
 * WHAT THIS FIXES, measured on 2026-09-19: vawe.dev/sitemap.xml returned 404 while the site was
 * already serving 879 crawlable detail pages (694 effects + 185 blocks) plus 7 routes and 17 docs
 * pages. Every one of them had no discovery path. A search for what vawe does returned the GitHub
 * repo and not the site: the README was doing the ranking.
 *
 * READ FROM THE REGISTRIES, NEVER A HAND-KEPT LIST. effects.json and blocks.json are the same two
 * files the detail pages' own generateStaticParams read, so this cannot list a page that does not
 * exist or miss one that does. A hand-written XML file of 879 URLs is stale the day it is written.
 *
 * ALL 694 EFFECTS ARE HERE, including the 362 whose `noPreview` flag means they cannot play a live
 * animation. That flag was checked before this file was written, because submitting near-empty pages
 * teaches Google a site is thin and that judgement lands site-wide, not per URL. It is not a thinness
 * flag: all 694 carry an authoring snippet (median 112 bytes for the static ones against 120 for the
 * live ones) and all 694 carry a description (median 95 characters against 90). Zero of either group
 * lack one. "Static only" means the effect cannot be animated in a preview, not that the page is empty.
 *
 * The docs URLs come from site-pages.json rather than from docs-site/ directly: see that generator's
 * header for why (the Dockerfile builds this app before docs-site exists in the image).
 */

const BASE = "https://vawe.dev";

type EffectsIndex = { list: { id: string; entries: { stem: string }[] }[] };
type Block = { name: string };

// One timestamp for the whole file. A per-URL mtime would claim these pages change independently,
// and they do not: they are all regenerated together from the registries by one build.
const built = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const r of [...pages.routes, ...pages.docs]) {
    entries.push({
      url: `${BASE}${r.path}`,
      lastModified: built,
      changeFrequency: r.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
      priority: r.priority,
    });
  }

  for (const family of (effects as EffectsIndex).list) {
    for (const entry of family.entries) {
      entries.push({
        url: `${BASE}/arsenal/effects/${entry.stem}`,
        lastModified: built,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // The 58 family hubs. Same registry, same loop shape as the leaves above, keyed on the family
  // instead of the entry. Without these the hubs exist and nothing can find them, which is the exact
  // defect this whole file was written to fix: 879 real pages with no discovery path.
  for (const family of (effects as EffectsIndex).list) {
    entries.push({
      url: `${BASE}/arsenal/effects/family/${family.id}`,
      lastModified: built,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const block of blocks as Block[]) {
    entries.push({
      url: `${BASE}/arsenal/${block.name}`,
      lastModified: built,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
