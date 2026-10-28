import { SITE_URL } from "../../lib/site";

/* site/app/robots.txt/route.ts, the crawl stance, stated on purpose rather than by omission.
 *
 * vawe.dev/robots.txt returned 404 until 2026-09-19. With no file, crawlers treat a site as fully
 * open, so nothing was being blocked; but "allowed by accident" and "allowed on purpose" look the
 * same to a crawler and only one of them survives the next person who wonders whether to add a file.
 *
 * AI CRAWLERS ARE ALLOWED, DELIBERATELY. The owner's ask was that people AND agents can find vawe, so
 * GPTBot, ClaudeBot, Google-Extended and the training crawlers are not merely unblocked, they are the
 * audience, and they ride on the `*` group below. Only the search and user-fetch bots are named: they
 * decide whether an answer engine can cite the site, and a named group is the proof it was meant.
 *
 * The one disallow is not content: /api is machinery.
 *
 * It is a route and not app/robots.ts because the metadata form cannot print comments, and the
 * comments are how a crawler finds /llms.txt and /ai.txt.
 *
 * NO `host` FIELD. Google's robots.txt parser recognizes exactly four rules: user-agent, disallow,
 * allow, sitemap (developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt,
 * "Google's crawlers support the following rules..."). `Host:` was a Yandex-only extension; Google
 * ignores it. Printing a line the target crawler never reads is the same "looks like a directive but
 * isn't" problem this file's own header warns against, so it stays out.
 */
const ANSWER_BOTS = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User"];

const body = `# Keep in sync with ${SITE_URL}/llms.txt and ${SITE_URL}/ai.txt.
# Site map for language models: ${SITE_URL}/llms.txt. Usage policy for AI systems: ${SITE_URL}/ai.txt.

# AI search and user-fetch crawlers: allowed. They decide whether answer engines can cite the site.
${ANSWER_BOTS.map((bot) => `User-agent: ${bot}`).join("\n")}
Allow: /
Disallow: /api/

# Everyone else, training crawlers included: allowed.
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function GET() {
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
