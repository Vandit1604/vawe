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
 *
 * NO `host` FIELD. Google's robots.txt parser recognizes exactly four rules: user-agent, disallow,
 * allow, sitemap (developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt,
 * "Google's crawlers support the following rules..."). `Host:` was a Yandex-only extension; Google
 * ignores it. Printing a line the target crawler never reads is the same "looks like a directive but
 * isn't" problem this file's own header warns against, so it stays out.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/deck.html"] }],
    sitemap: "https://vawe.dev/sitemap.xml",
  };
}
