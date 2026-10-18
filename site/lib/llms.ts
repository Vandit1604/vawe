import fs from "node:fs";
import path from "node:path";
import { BLOG_URL, allPosts } from "./blog";
import { INSPIRATION, titleOf } from "./inspiration";

// llms.txt is content/llms-base.txt with the blog section filled from the live posts, so a
// scheduled post appears on its date without a redeploy (the route revalidates hourly).
export function llmsText() {
  const base = fs.readFileSync(path.join(process.cwd(), "content/llms-base.txt"), "utf8");
  const posts = allPosts().map((p) => `- [${p.title}](${BLOG_URL}/${p.slug}): ${p.description}`);
  const blog = [
    `- [Blog](${BLOG_URL}): Tutorials and engineering notes from building vawe. Every post is also a Markdown file at ${BLOG_URL}/<slug>.md.`,
    `- [RSS feed](${BLOG_URL}/rss.xml): every post with its full text.`,
    ...posts,
  ].join("\n");
  const inspiration = INSPIRATION.map((p) => {
    const by = p.creator.name ? `${p.creator.name} (@${p.creator.handle})` : `@${p.creator.handle}`;
    return `- [${titleOf(p)}](${p.url}): by ${by}${p.tool ? `, made with ${p.tool}` : ""}`;
  }).join("\n");
  return base.replace("{{BLOG}}", blog).replace("{{INSPIRATION}}", inspiration);
}
