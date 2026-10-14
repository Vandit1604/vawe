import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, DOCS_URL, REPO_URL, WaveGlyph } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { pageMetadata } from "../../components/seo";
import { blogPostingSchema, breadcrumbSchema, jsonLdScript } from "../../../lib/schema";
import { allPosts, neighbours, postBySlug, relatedPosts, smart } from "../../../lib/blog";
import { Cover } from "../Cover";
import "../blog.css";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  const base = pageMetadata({ title: `${post.title} | vawe blog`, description: post.description, path: `/blog/${post.slug}`, type: "article" });
  return {
    ...base,
    keywords: post.keywords,
    alternates: { ...base.alternates, types: { "application/rss+xml": "/blog/rss.xml" } },
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated,
      section: post.sectionLabel,
      tags: post.tags,
      authors: ["vawe"],
    },
  };
}

export default async function PostPage({ params }: Params) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const path = `/blog/${post.slug}`;
  const { older, newer } = neighbours(post.slug);
  const related = relatedPosts(post);
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: path },
  ];
  const images = [...(post.cover ? [post.cover.src] : [`${path}/opengraph-image`]), ...(post.hero && !post.hero.src.endsWith(".svg") ? [post.hero.src] : [])];
  const schema = blogPostingSchema({
    headline: post.title,
    description: post.description,
    path,
    datePublished: post.date,
    dateModified: post.updated,
    images,
    section: post.sectionLabel,
    keywords: post.keywords,
  });

  return (
    <div className="shell">
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(schema)} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema(crumbs))} />
        <article className="bp" data-s={post.section}>
          <header className="bp-head">
            <div className="bp-head-text">
              <p className="kicker">
                <Link href="/blog">Blog</Link>
                <span aria-hidden="true">/</span>
                <Link className="bl-sec" href={`/blog#${post.section}`}><span className="sw" />{post.sectionLabel}</Link>
              </p>
              <h1>{smart(post.title)}</h1>
              <p className="bp-dek">{smart(post.description)}</p>
              <p className="meta bp-meta">
                {post.no ? <span>No. {String(post.no).padStart(2, "0")}</span> : null}
                <span>{post.minutes} min read</span>
              </p>
            </div>
          </header>

          {post.cover ? (
            <figure className="bp-hero">
              <Cover post={post} eager />
            </figure>
          ) : post.hero ? (
            <figure className="bp-hero bp-hero-fig">
              <img src={post.hero.src} alt={post.hero.alt} width={post.hero.width} height={post.hero.height} fetchPriority="high" decoding="async" />
            </figure>
          ) : null}

          <div className="bp-grid">
            <div className="bp-body">
              {post.cover && post.hero && !post.heroInBody ? (
                <figure>
                  <img src={post.hero.src} alt={post.hero.alt} width={post.hero.width} height={post.hero.height} loading="lazy" decoding="async" />
                </figure>
              ) : null}
              <div className="bp-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
            </div>
            {post.toc.length > 1 ? (
              <nav className="bp-toc" aria-label="On this page">
                <span className="meta">On this page</span>
                <ol>
                  {post.toc.map((h, i) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`}><span className="bp-toc-n">{String(i + 1).padStart(2, "0")}</span>{h.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </div>

          <aside className="panel bp-made" aria-labelledby="bp-made">
            <WaveGlyph className="bp-made-glyph" />
            <div className="bp-made-text">
              <h2 id="bp-made">Made with vawe</h2>
              <p>
                vawe is the open source framework behind these notes: an agent writes one HTML page and the renderer turns
                it into a film. Apache 2.0.
              </p>
            </div>
            <div className="bp-made-act">
              <a className="btn btn-primary" href={REPO_URL} rel="noopener">Read the code</a>
              <a className="btn btn-ghost" href={DOCS_URL}>Start with the docs</a>
            </div>
          </aside>

          {older || newer ? (
            <nav className="bp-pager" aria-label="Newer and older posts">
              {newer ? (
                <Link className="panel bp-page" href={`/blog/${newer.slug}`} prefetch={false} data-s={newer.section}>
                  <span className="meta">&larr; Newer</span>
                  <span className="bp-page-title">{newer.title}</span>
                </Link>
              ) : <span />}
              {older ? (
                <Link className="panel bp-page bp-page-next" href={`/blog/${older.slug}`} prefetch={false} data-s={older.section}>
                  <span className="meta">Older &rarr;</span>
                  <span className="bp-page-title">{older.title}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}

          {related.length ? (
            <section className="bp-related" aria-labelledby="bp-related">
              <h2 id="bp-related">Read next</h2>
              <ul className="bl-grid bl-grid-3">
                {related.map((p) => (
                  <li key={p.slug} className="panel bl-card" data-s={p.section}>
                    <Cover post={p} />
                    <div className="bl-card-text">
                      <p className="meta bl-card-meta">
                        <span className="bl-sec"><span className="sw" />{p.sectionLabel}</span>
                      </p>
                      <h3>
                        <Link href={`/blog/${p.slug}`} prefetch={false}>{smart(p.title)}</Link>
                      </h3>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      </main>
      <Footer active="/blog" />
    </div>
  );
}
