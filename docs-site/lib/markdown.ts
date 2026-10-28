import { source } from '@/lib/source';

export { prefersMarkdown } from './accept';

export const SITE = 'https://vawe.dev';

type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';

// The docs MDX uses only <Callout> and <Cards>/<Card>; any new component needs a case here.
function flattenComponents(markdown: string) {
  return markdown
    .replace(/<Callout\b([^>]*)>\n?([\s\S]*?)<\/Callout>/g, (_, tag: string, body: string) => {
      const title = attr(tag, 'title');
      const lines = [...(title ? [`**${title}**`] : []), ...body.trim().split('\n').map((line) => line.trim())];
      return lines.map((line) => `> ${line}`.trimEnd()).join('\n');
    })
    .replace(/^[ \t]*<Card\b([^>]*?)\/>/gm, (_, tag: string) => {
      const description = attr(tag, 'description');
      return `- [${attr(tag, 'title')}](${attr(tag, 'href')})${description ? `: ${description}` : ''}`;
    })
    .replace(/^[ \t]*<\/?Cards>\n/gm, '')
    .replace(/(^- \[.*\n)\n(?=- \[)/gm, '$1');
}

const absolutize = (markdown: string) =>
  markdown.replace(/\]\((\/(?!\/)[^)\s]*)\)/g, (_, path: string) => `](${SITE}${path})`);

export function canonicalUrl(page: DocsPage) {
  return `${SITE}${page.url}`;
}

export function markdownUrl(page: DocsPage) {
  const slug = page.url.replace(/^\/docs\/?/, '') || 'index';
  return `${SITE}/docs/${slug}.md`;
}

export async function getPageMarkdown(page: DocsPage) {
  const body = absolutize(flattenComponents(await page.data.getText('processed'))).trim();
  const lines = [`# ${page.data.title}`, ''];
  if (page.data.description) lines.push(`> ${page.data.description}`, '');
  lines.push(`Canonical: ${canonicalUrl(page)}`, '', body, '');
  return lines.join('\n');
}

export function listDocsRoutes() {
  return source.getPages().map((page) => ({
    title: page.data.title,
    description: page.data.description ?? '',
    url: canonicalUrl(page),
    markdown: markdownUrl(page),
  }));
}

export function markdownResponse(body: string, canonical: string, status = 200, negotiated = false) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'X-Markdown-Tokens': String(Math.ceil(body.length / 4)),
    'X-Robots-Tag': 'noindex, follow',
    'Content-Location': canonical,
    Link: `<${canonical}>; rel="canonical"`,
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  };
  if (negotiated) headers.Vary = 'Accept';
  return new Response(body, { status, headers });
}
