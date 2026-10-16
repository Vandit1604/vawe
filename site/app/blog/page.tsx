import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { blogSchema, breadcrumbSchema, jsonLdScript } from "../../lib/schema";
import { allPosts, indexPosts, postsBySection } from "../../lib/blog";
import { Card } from "./Card";
import { ViewToggle } from "./ViewToggle";
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
// The view comes from ?view= (a shared link), then the visitor's saved choice, then the grid. It runs
// before the list is parsed, so the first paint is already in the right view.
const VIEW = `(()=>{let v;try{v=new URLSearchParams(location.search).get("view")}catch{}if(v!=="list"&&v!=="grid"){try{v=localStorage.getItem("vawe-blog-view")}catch{}}document.currentScript.parentElement.dataset.view=v==="list"?"list":"grid"})()`;

// Posts go live on their date: the index is rebuilt hourly, with no redeploy.
export const revalidate = 3600;

const HASH_FILTER = `(()=>{const h=location.hash.slice(1);const r=h&&document.getElementById("f-"+h);if(r)r.checked=true})()`;

export default function BlogIndex() {
  const sections = postsBySection();
  const posts = allPosts();
  const ordered = indexPosts();
  const crumbs = [{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }];

  return (
    <div className="shell">
      <Header active="blog" />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(blogSchema(posts.map((p) => ({ headline: p.title, path: `/blog/${p.slug}`, datePublished: p.date }))))} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema(crumbs))} />
        <div className="bl" data-view="grid" suppressHydrationWarning>
          <script dangerouslySetInnerHTML={{ __html: VIEW }} />
          <header className="bl-mast">
            <h1>
              Notes from building vawe, <span className="bl-h1-2">with the numbers.</span>
            </h1>
            <p className="bl-dek">An agent writes one HTML page and the renderer turns it into a film.</p>
            <p className="meta bl-rss"><a href="/blog/rss.xml">RSS feed</a></p>
          </header>

          {posts.length ? (
            <>
              <div className="bl-bar">
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
              <ViewToggle />
              </div>
              <script dangerouslySetInnerHTML={{ __html: HASH_FILTER }} />
              {sections.map((s) => (
                <p key={s.id} className="bl-intro" data-s={s.id}>{s.intro}</p>
              ))}

              <ul className="bl-grid">
                {ordered.map(({ post, feat }, i) => (
                  <Card key={post.slug} post={post} feat={feat} eager={i < 3} />
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
