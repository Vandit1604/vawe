import { notFound } from "next/navigation";
import { postBySlug } from "../../../lib/blog";

export const revalidate = 3600;

const SITE = "https://vawe.dev";

// Root-relative links and images become absolute, because the file is read away from the page.
const absolute = (md: string) => md.replace(/\]\(\//g, `](${SITE}/`);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const text = `# ${post.title}\n\n${post.description}\n\nCanonical page: ${SITE}/blog/${post.slug}\n\n${absolute(post.body.trim())}\n`;
  return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
