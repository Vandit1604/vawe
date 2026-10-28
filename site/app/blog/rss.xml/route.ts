import { BLOG_URL, allPosts, latestDate } from "../../../lib/blog";
import { SITE_URL as SITE } from "../../../lib/site";

export const revalidate = 3600;

function xml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Feed readers resolve nothing against the page, so root-relative links in the body become absolute.
function absolute(html: string) {
  return html.replace(/\b(src|href|poster)="\//g, `$1="${SITE}/`);
}

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const rfc822 = (iso: string) => new Date(`${iso}T00:00:00Z`).toUTCString();

export function GET() {
  const posts = allPosts();
  const last = latestDate();
  const items = posts.map((p) => {
    const url = `${BLOG_URL}/${p.slug}`;
    return `    <item>
      <title>${xml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <category>${xml(p.sectionLabel)}</category>
      <description>${xml(p.description)}</description>
      <content:encoded>${cdata(absolute(p.html))}</content:encoded>
    </item>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>vawe blog</title>
    <link>${BLOG_URL}</link>
    <atom:link href="${BLOG_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Engineering notes from building vawe, where agents write motion graphics as HTML.</description>
    <language>en</language>
${last ? `    <lastBuildDate>${rfc822(last)}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
