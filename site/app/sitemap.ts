import type { MetadataRoute } from "next";
import pages from "../lib/site-pages.json";
import { MOVES } from "../lib/moves";

/* site/app/sitemap.ts: every URL vawe.dev serves. The routes come from lib/site-pages.json, the same
 * file the footer nav reads; the move pages come from lib/moves.json.
 */

const BASE = "https://vawe.dev";

// One timestamp for the whole file: the pages are all rebuilt together by one build.
const built = new Date();

const moves = MOVES.map((m) => ({ path: `/moves/${m.name}`, priority: 0.6, changeFrequency: "monthly" }));

export default function sitemap(): MetadataRoute.Sitemap {
  return [...pages.routes, ...moves, ...pages.docs].map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: built,
    changeFrequency: r.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: r.priority,
  }));
}
