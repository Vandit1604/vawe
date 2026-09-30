import type { MetadataRoute } from "next";
import pages from "../lib/site-pages.json";

/* site/app/sitemap.ts: every URL vawe.dev serves, read from lib/site-pages.json, the same file the
 * footer nav reads, so the sitemap cannot list a route the footer does not.
 */

const BASE = "https://vawe.dev";

// One timestamp for the whole file: the pages are all rebuilt together by one build.
const built = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [...pages.routes, ...pages.docs].map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: built,
    changeFrequency: r.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: r.priority,
  }));
}
