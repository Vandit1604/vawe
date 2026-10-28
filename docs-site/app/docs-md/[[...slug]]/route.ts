import { source } from '@/lib/source';
import { SITE, getPageMarkdown, canonicalUrl, markdownResponse } from '@/lib/markdown';

export async function GET(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await ctx.params;
  const negotiated = request.headers.has('x-vawe-negotiated');
  const page = source.getPage(slug);
  if (!page) {
    const path = slug?.length ? `/docs/${slug.join('/')}` : '/docs';
    return markdownResponse(
      `# Not found\n\nNo docs page at ${SITE}${path}. The list of docs pages is at ${SITE}/docs/llms-index.json\n`,
      `${SITE}${path}`,
      404,
      negotiated,
    );
  }
  return markdownResponse(await getPageMarkdown(page), canonicalUrl(page), 200, negotiated);
}
