import { source } from '@/lib/source';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDXContent = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

// This app has no metadataBase: it is proxied under https://vawe.dev/docs in production but built
// and previewed from its own origin, so a relative `alternates.canonical` would resolve against
// THAT origin instead. `page.url` already carries the "/docs" prefix (lib/source.ts sets
// `baseUrl: '/docs'`), so the canonical only needs the real site's origin prepended, written out
// literally rather than left to Next to infer.
const SITE = 'https://vawe.dev';

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const { title, description } = page.data;
  const url = `${SITE}${page.url}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: 'Vawe docs',
      images: [{ url: `${SITE}/assets/og.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE}/assets/og.png`],
    },
  };
}
