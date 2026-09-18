import type { MetadataRoute } from "next";

/* site/app/robots.ts — the crawl stance, stated on purpose rather than by omission.
 *
 * vawe.dev/robots.txt returned 404 until 2026-09-19. With no file, crawlers treat a site as fully
 * open, so nothing was being blocked; but "allowed by accident" and "allowed on purpose" look the
 * same to a crawler and only one of them survives the next person who wonders whether to add a file.
 *
 * AI CRAWLERS ARE ALLOWED, DELIBERATELY. The owner's ask was that people AND agents can find vawe, so
 * GPTBot, ClaudeBot, PerplexityBot, Google-Extended and the rest are not merely unblocked, they are
 * the audience. They are not listed individually: a per-bot allowlist is a list that goes stale every
 * time a new crawler ships, and the honest stance here is "all of it, to everyone".
 *
 * The two disallows are not content. /api is machinery, and /deck.html is a pitch deck that exists at
 * a fixed URL for sharing, not a page anyone should reach from a search result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/deck.html"] }],
    sitemap: "https://vawe.dev/sitemap.xml",
    host: "https://vawe.dev",
  };
}
