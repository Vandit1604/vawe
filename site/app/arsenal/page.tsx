import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Arsenal, type Arsenal as Data } from "./Arsenal";
import { pageMetadata } from "../components/seo";
import data from "../../lib/arsenal.json";
import effects from "../../lib/effects.json";
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
        </main>
        <Footer note="generated from the engine registries" />
      </div>
    </div>
  );
}
