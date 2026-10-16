import type { MetadataRoute } from "next";
import pages from "../lib/site-pages.json";
import lastmod from "../lib/lastmod.json";
import { MOVES } from "../lib/moves";
import { EASES } from "../lib/easing";
import { allPosts, latestDate } from "../lib/blog";

/* site/app/sitemap.ts: every URL vawe.dev serves. The routes come from lib/site-pages.json, the same
 * file the footer nav reads; the move pages come from lib/moves.json, the posts from lib/blog.ts. To
 * add a route, add one entry to the list in `entries()` or to site-pages.json.
 *
 * lastmod is the date of the last commit that touched the page's source (scripts/site/lastmod.mjs for
 * routes, scripts/site/moves.mjs for moves). A post's is its `updated` date (else its date), and /blog's is the
 * newest post's. A route with no known date gets none: Google ignores a lastmod that is always "now",
 * so a missing one is better than a made-up one. Google ignores changefreq and priority, so they are
 * not emitted.
 */

const BASE = "https://vawe.dev";

type Entry = { path: string; lastmod?: string };

const dates = lastmod as Record<string, string>;

// A scheduled post enters the sitemap on its date: regenerate hourly.
export const revalidate = 3600;

function entries(): Entry[] {
  return [
    ...[...pages.routes, ...pages.docs].map((r) => ({ path: r.path, lastmod: r.path === "/blog" ? latestDate() : dates[r.path] })),
    ...MOVES.map((m) => ({ path: `/moves/${m.name}`, lastmod: m.modified })),
    ...EASES.map((e) => ({ path: `/easing/${e.slug}`, lastmod: dates["/easing"] })),
    ...allPosts().map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updated })),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return entries().map((e) => ({
    url: `${BASE}${e.path}`,
    ...(e.lastmod ? { lastModified: e.lastmod } : {}),
  }));
}
