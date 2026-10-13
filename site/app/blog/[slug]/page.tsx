import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, DOCS_URL, REPO_URL } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { pageMetadata } from "../../components/seo";
import { blogPostingSchema, breadcrumbSchema, jsonLdScript } from "../../../lib/schema";
import { allPosts, formatDate, neighbours, postBySlug, relatedPosts } from "../../../lib/blog";
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
  const images = [`${path}/opengraph-image`, ...(post.hero && !post.hero.src.endsWith(".svg") ? [post.hero.src] : [])];
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
        <article className="bp">
          <header className="phead bp-head">
            <p className="kicker">
              <Link href="/blog">Blog</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/blog#${post.section}`}>{post.sectionLabel}</Link>
            </p>
            <h1>{post.title}</h1>
            <p className="meta bp-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>{post.minutes} min read</span>
              {post.updated !== post.date ? <span>updated <time dateTime={post.updated}>{formatDate(post.updated)}</time></span> : null}
            </p>
          </header>

          {post.hero ? (
            <figure className="bp-hero">
              <img src={post.hero.src} alt={post.hero.alt} width={post.hero.width} height={post.hero.height} fetchPriority="high" decoding="async" />
            </figure>
          ) : null}

          <div className="bp-grid">
            <div className="bp-body" dangerouslySetInnerHTML={{ __html: post.html }} />
            {post.toc.length > 1 ? (
              <nav className="bp-toc" aria-label="On this page">
                <span className="meta">On this page</span>
                <ol>
                  {post.toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </div>

          <aside className="panel bp-end" aria-label="About vawe">
            <p>
              vawe is open source under Apache 2.0. Read the code on <a href={REPO_URL} rel="noopener">GitHub</a>, or start
              with the <a href={DOCS_URL}>docs</a>.
            </p>
          </aside>

          {older || newer ? (
            <nav className="bp-pager" aria-label="More posts">
              {newer ? (
                <Link className="panel bp-page" href={`/blog/${newer.slug}`} prefetch={false}>
                  <span className="meta">Newer</span>
                  <span className="bp-page-title">{newer.title}</span>
                </Link>
              ) : <span />}
              {older ? (
                <Link className="panel bp-page bp-page-next" href={`/blog/${older.slug}`} prefetch={false}>
                  <span className="meta">Older</span>
                  <span className="bp-page-title">{older.title}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}

          {related.length ? (
            <section className="bp-related" aria-labelledby="bp-related">
              <h2 id="bp-related">Related posts</h2>
              <ul className="bl-grid bl-grid-3">
                {related.map((p) => (
                  <li key={p.slug} className="panel bl-card">
                    <h3>
                      <Link href={`/blog/${p.slug}`} prefetch={false}>{p.title}</Link>
                    </h3>
                    <p className="meta bl-card-meta">
                      <span>{p.sectionLabel}</span>
                      <time dateTime={p.date}>{formatDate(p.date)}</time>
                    </p>
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
