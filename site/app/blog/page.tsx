import Link from "next/link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { blogSchema, breadcrumbSchema, jsonLdScript } from "../../lib/schema";
import { allPosts, formatDate, postsBySection } from "../../lib/blog";
import "./blog.css";

const TITLE = "vawe blog: building agent-native motion graphics";
const DESCRIPTION =
  "Engineering notes from building vawe, where agents write motion graphics as HTML: what broke, what we measured and what we changed.";

const base = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/blog" });
export const metadata = {
  ...base,
  alternates: { ...base.alternates, types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default function BlogIndex() {
  const sections = postsBySection();
  const posts = allPosts();
  const crumbs = [{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }];

  return (
    <div className="shell">
      <Header active="blog" />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(blogSchema(posts.map((p) => ({ headline: p.title, path: `/blog/${p.slug}`, datePublished: p.date }))))} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema(crumbs))} />
        <div className="bl">
          <header className="phead bl-head">
            <h1>The vawe blog</h1>
            <p>
              We build a framework where an agent writes one HTML page and the renderer turns it into a film. These posts
              say what broke on the way, what we measured, and what we changed because of it.
            </p>
            <p className="meta bl-feed">
              <span>{posts.length} {posts.length === 1 ? "post" : "posts"}</span>
              <a href="/blog/rss.xml">RSS feed</a>
            </p>
            {sections.length > 1 ? (
              <nav className="bl-jump" aria-label="Sections">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`}>
                    {s.label} <span className="bl-count">{s.posts.length}</span>
                  </a>
                ))}
              </nav>
            ) : null}
          </header>

          {sections.map((s) => (
            <section key={s.id} className="bl-sec" aria-labelledby={s.id}>
              <h2 id={s.id}>{s.label}</h2>
              <p className="bl-intro">{s.intro}</p>
              <ul className="bl-grid">
                {s.posts.map((p) => (
                  <li key={p.slug} className="panel bl-card">
                    <h3>
                      <Link href={`/blog/${p.slug}`} prefetch={false}>{p.title}</Link>
                    </h3>
                    <p>{p.description}</p>
                    <p className="meta bl-card-meta">
                      <time dateTime={p.date}>{formatDate(p.date)}</time>
                      <span>{p.minutes} min read</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {posts.length === 0 ? <p className="bl-intro">The first posts are on their way.</p> : null}
        </div>
      </main>
      <Footer active="/blog" />
    </div>
  );
}
