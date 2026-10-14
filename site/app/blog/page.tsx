import Link from "next/link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { blogSchema, breadcrumbSchema, jsonLdScript } from "../../lib/schema";
import { allPosts, postsBySection, smart, type Post } from "../../lib/blog";
import { Cover } from "./Cover";
import { preload } from "react-dom";
import "./blog.css";

const TITLE = "vawe blog: building agent-native motion graphics";
const DESCRIPTION =
  "Engineering notes from building vawe, where agents write motion graphics as HTML: what broke, what we measured and what we changed.";

const base = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/blog" });
export const metadata = {
  ...base,
  alternates: { ...base.alternates, types: { "application/rss+xml": "/blog/rss.xml" } },
};

// Card widths on the 12-column grid, repeated in order: a wide card and a narrow one, then a row of
// three, then the pair mirrored. Dense packing keeps rows full when a filter hides cards.
const RHYTHM = ["w7", "w5", "w4", "w4", "w4", "w5", "w7", "w6", "w6"];

// A post page links to /blog#<section>; the hash selects that filter. Without script every post shows.
const HASH_FILTER = `(()=>{const h=location.hash.slice(1);const r=h&&document.getElementById("f-"+h);if(r)r.checked=true})()`;

function Card({ post, w }: { post: Post; w: string }) {
  return (
    <li className={`panel bl-card ${w}`} data-s={post.section}>
      <Cover post={post} />
      <div className="bl-card-text">
        <p className="meta bl-card-meta">
          <span className="bl-sec"><span className="sw" />{post.sectionLabel}</span>
        </p>
        <h3>
          <Link href={`/blog/${post.slug}`} prefetch={false}>{smart(post.title)}</Link>
        </h3>
        <p className="bl-card-desc">{smart(post.description)}</p>
        <p className="meta bl-card-foot">{post.minutes} min read</p>
      </div>
    </li>
  );
}

export default function BlogIndex() {
  const sections = postsBySection();
  const posts = allPosts();
  preload("/assets/fonts/PlusJakartaSans.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  const crumbs = [{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }];
  // The featured post leads; the rest group by section, newest first inside each. No date is shown.
  const [lead] = posts;
  const rest = sections.flatMap((sec) => sec.posts).filter((p) => p !== lead);

  return (
    <div className="shell">
      <Header active="blog" />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(blogSchema(posts.map((p) => ({ headline: p.title, path: `/blog/${p.slug}`, datePublished: p.date }))))} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema(crumbs))} />
        <div className="bl">
          <header className="bl-mast">
            <p className="kicker">The vawe blog</p>
            <h1>
              What broke, what we measured, <span className="bl-h1-2">and what we changed.</span>
            </h1>
            <p className="bl-dek">
              We build a framework where an agent writes one HTML page and the renderer turns it into a film. These are
              the notes from building it, with the numbers.
            </p>
            {posts.length ? (
              <dl className="bl-stats">
                  <div><dt className="meta">Posts</dt><dd>{posts.length}</dd></div>
                  <div><dt className="meta">Sections</dt><dd>{sections.length}</dd></div>
                  <div className="bl-rss"><dt className="meta">Feed</dt><dd><a href="/blog/rss.xml">RSS</a></dd></div>
              </dl>
            ) : null}
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
                <li className="panel bl-lead" data-s={lead.section}>
                  <Cover post={lead} eager />
                  <div className="bl-lead-text">
                    <p className="meta bl-card-meta">
                      <span className="bl-new">Featured</span>
                      <span className="bl-sec"><span className="sw" />{lead.sectionLabel}</span>
                    </p>
                    <h2>
                      <Link href={`/blog/${lead.slug}`} prefetch={false}>{smart(lead.title)}</Link>
                    </h2>
                    <p className="bl-card-desc">{smart(lead.description)}</p>
                    <p className="meta bl-card-foot">{lead.minutes} min read</p>
                  </div>
                </li>
                {rest.map((p, i) => (
                  <Card key={p.slug} post={p} w={RHYTHM[i % RHYTHM.length]} />
                ))}
              </ul>
            </>
          ) : (
            <p className="bl-intro">The first posts are on their way.</p>
          )}
        </div>
      </main>
      <Footer active="/blog" />
    </div>
  );
}
