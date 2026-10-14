import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { blogSchema, breadcrumbSchema, jsonLdScript } from "../../lib/schema";
import { allPosts, postsBySection } from "../../lib/blog";
import { Card } from "./Card";
import "./blog.css";

const TITLE = "vawe blog: building agent-native motion graphics";
const DESCRIPTION =
  "Engineering notes from building vawe, where agents write motion graphics as HTML: what broke, what we measured and what we changed.";

const base = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/blog" });
export const metadata = {
  ...base,
  alternates: { ...base.alternates, types: { "application/rss+xml": "/blog/rss.xml" } },
};

// A post page links to /blog#<section>; the hash selects that filter. Without script every post shows.
const HASH_FILTER = `(()=>{const h=location.hash.slice(1);const r=h&&document.getElementById("f-"+h);if(r)r.checked=true})()`;

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
          <header className="bl-mast">
            <h1>
              Notes from building vawe, <span className="bl-h1-2">with the numbers.</span>
            </h1>
            <p className="bl-dek">An agent writes one HTML page and the renderer turns it into a film.</p>
            <p className="meta bl-rss"><a href="/blog/rss.xml">RSS feed</a></p>
          </header>

          {posts.length ? (
            <>
              <fieldset className="bl-filter">
                <legend className="sr-only">Show posts from</legend>
                <input className="sr-only" type="radio" name="sec" id="f-all" defaultChecked />
                <label htmlFor="f-all">All <span className="bl-count">{posts.length}</span></label>
                {sections.map((s) => (
                  <span key={s.id} className="bl-fchip" data-s={s.id}>
                    <input className="sr-only" type="radio" name="sec" id={`f-${s.id}`} />
                    <label htmlFor={`f-${s.id}`}>
                      <span className="sw" />
                      {s.label} <span className="bl-count">{s.posts.length}</span>
                    </label>
                  </span>
                ))}
              </fieldset>
              <script dangerouslySetInnerHTML={{ __html: HASH_FILTER }} />
              {sections.map((s) => (
                <p key={s.id} className="bl-intro" data-s={s.id}>{s.intro}</p>
              ))}

              <ul className="bl-grid">
                {posts.map((post, i) => (
                  <Card key={post.slug} post={post} eager={i < 3} />
                ))}
              </ul>
            </>
          ) : (
            <p className="bl-intro">No posts yet.</p>
          )}
        </div>
      </main>
      <Footer active="/blog" />
    </div>
  );
}
