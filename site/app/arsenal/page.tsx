import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Arsenal, type Arsenal as Data } from "./Arsenal";
import { pageMetadata } from "../components/seo";
import data from "../../lib/arsenal.json";
import effects from "../../lib/effects.json";
import blocks from "../../lib/blocks.json";
import "./arsenal.css";

/* /arsenal — what the engine is MADE OF, next door to /showcase, which is what it has MADE.
 *
 * Every number on this page is read out of site/lib/arsenal.json, which is generated from the two
 * registries (scripts/site/arsenal-json.mjs). None of them is typed. The page this replaces had its
 * block count hardcoded at 156 against a registry holding 176, which is the whole reason
 * quality/gates/site-counts.mjs exists.
 */

const D = data as Data;
// Read from the same registry the hub pages generate from, so this list cannot name a family that
// has no page, or miss one that does.
const FAMILIES = (effects as { list: { id: string; title: string; count: number }[] }).list
  .map((f) => ({ id: f.id, title: f.title, count: f.count }))
  .sort((a, b) => a.title.localeCompare(b.title));

// The block twin of FAMILIES above: 13 real groups (blocks.json's own `category` field), against
// block families where most hold exactly one block, too thin to browse. `id` matches the slug
// site/app/arsenal/category/[id]/page.tsx derives from the same field, so this link can never point
// at a hub that does not exist.
const CATEGORIES = (() => {
  const counts = new Map<string, number>();
  for (const b of blocks as { category?: string }[]) {
    const c = b.category ?? "Core";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  // A CATEGORY OF ONE GETS NO HUB, IT GETS ITS BLOCK. `Camera` holds exactly one block, and its hub
  // rendered 47 words of real content: the category name, "1 block across 1 family", and that one
  // block's name and blurb. That is a leaf page with extra words, which is the thin end of what
  // Google calls scaled content abuse ("many pages are generated for the primary purpose of
  // manipulating search rankings and not helping users",
  // developers.google.com/search/docs/essentials/spam-policies).
  //
  // So the taxonomy stays complete in the navigation, every category is listed and clickable, and the
  // single-block ones link straight to the block. Nothing is hidden from a reader and nothing exists
  // that adds nothing. The hub route's own generateStaticParams applies the same rule, so no such
  // page is generated at all.
  const only = new Map<string, string>();
  for (const b of blocks as { category?: string; name: string }[]) {
    const c = b.category ?? "Core";
    if (counts.get(c) === 1) only.set(c, b.name);
  }
  return [...counts.entries()]
    .map(([title, count]) => ({
      id: title.toLowerCase(),
      title,
      count,
      href: only.has(title) ? `/arsenal/${only.get(title)}` : `/arsenal/category/${title.toLowerCase()}`,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
})();

export const metadata = pageMetadata({
  title: "Vawe · arsenal",
  description:
    `Everything the Vawe engine is made of: ${D.total} blocks and effects, searchable, ` +
    `each with the JSON that uses it and ${D.live} of them playing in the real engine.`,
  path: "/arsenal",
});

export default function ArsenalPage() {
  return (
    <div className="shell">
      <Header active="arsenal" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <Arsenal data={D} />

          {/* THE FAMILY INDEX, AND IT IS NOT DECORATION.
            *
            * The 58 family hubs under /arsenal/effects/family/ were reachable only from a leaf
            * page's kicker and from sitemap.xml, so a reader could only find a category after
            * already finding one of its members. Google's spam policy calls out exactly that shape:
            * doorway abuse includes "pages that are closer to search results than a clearly defined,
            * browseable hierarchy" (developers.google.com/search/docs/essentials/spam-policies), and
            * the same page lists "navigation of products or categories" as real added value. The
            * difference between those two readings is whether a person can browse down from the top,
            * so here is the top.
            *
            * The rail above filters in place through ?axis=, which is right for someone already on
            * this page and useless to someone arriving at a category from anywhere else. This is
            * server-rendered, so it is in the HTML before any JS, and it links the pages themselves
            * rather than a query string.
            */}
          <section className="ar-fams" aria-labelledby="fams-h">
            <h2 id="fams-h">Browse by family</h2>
            <p className="ar-fams-sub">
              Every effect belongs to one family. {FAMILIES.length} of them, each with its own page.
            </p>
            <ul className="ar-fams-list">
              {FAMILIES.map((f) => (
                <li key={f.id}>
                  <a href={`/arsenal/effects/family/${f.id}`}>
                    <span className="ar-fams-name">{f.title}</span>
                    <span className="ar-fams-n">{f.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* THE CATEGORY INDEX, the block twin of the family index above and built for the same
            * reason: every block had a leaf page and no layer above them, reachable only by
            * already knowing one member. Same markup, same CSS classes, so the two lists read as
            * one pattern rather than two. */}
          <section className="ar-fams" aria-labelledby="cats-h">
            <h2 id="cats-h">Browse by category</h2>
            <p className="ar-fams-sub">
              Every block belongs to one category. {CATEGORIES.length} of them, each with its own page.
            </p>
            <ul className="ar-fams-list">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <a href={c.href}>
                    <span className="ar-fams-name">{c.title}</span>
                    <span className="ar-fams-n">{c.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </main>
        <Footer note="generated from the engine registries" active="/arsenal" />
      </div>
    </div>
  );
}
