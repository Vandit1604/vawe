import Link from "next/link";
import { Clip } from "./Clip";
import { DOCS_URL, REPO_URL } from "./Header";
import sitePages from "../../lib/site-pages.json";

type Route = { path: string; group?: string; label?: string };

// One owner for the grouping: scripts/site/site-pages.mjs assigns `group` and `label` to every
// route, site-pages.json is its generated output, and this is the only place that reads it into a
// nav. Adding a route means editing the generator, never adding a link here by hand.
const ROUTES = (sitePages.routes as Route[]).filter((r): r is Required<Route> => Boolean(r.group && r.label));

const NAV_GROUPS: { title: string; group: string }[] = [
  { title: "Product", group: "product" },
  { title: "Learn", group: "topic" },
  { title: "Use cases", group: "job" },
  { title: "Compare", group: "comparison" },
];

/* Same active-hint mechanism Header.tsx uses (a prop naming the current item, so the current page
 * never links to itself), here keyed by the real path rather than Header's short NAV key, because
 * the footer's link set is the full route table, not one fixed array a key can index into. */
function FooterNav({ active }: { active?: string }) {
  const cols = NAV_GROUPS.map(({ title, group }) => ({
    title,
    items: ROUTES.filter((r) => r.group === group),
  })).filter((c) => c.items.length);

  return (
    <nav className="foot-nav" aria-label="Site">
      {cols.map((col) => (
        <div className="foot-col" key={col.title}>
          <span className="foot-h">{col.title}</span>
          {col.items.map((r) =>
            active === r.path ? (
              <span key={r.path} aria-current="page">
                {r.label}
              </span>
            ) : (
              <Link key={r.path} href={r.path}>
                {r.label}
              </Link>
            ),
          )}
        </div>
      ))}
      <div className="foot-col">
        <span className="foot-h">Docs</span>
        <a href={DOCS_URL}>Documentation</a>
        <a href={REPO_URL}>GitHub</a>
      </div>
    </nav>
  );
}

/* ONE FOOTER, ONE STYLE, EVERY PAGE.
 *
 * `bookend` closes the home page on the material it opened on: the contentless backdrop scene under
 * cobalt. Never a capability clip, those all carry copy, which blurs into drifting smudges behind
 * the CTA.
 *
 * Interior pages used to get a different footer entirely: a hairline rule, grey links, no band. Two
 * footers meant the site ended two different ways depending which page you were on, and the owner's
 * call is that it ends one way. So both variants are the same cobalt band carrying the same grouped
 * nav, and the bookend adds the CTA and the film ABOVE that shared base rather than replacing it.
 * The navigation a reader finds at the bottom of any page is now the same navigation.
 *
 * The accent is used at full bleed here, which `site/DESIGN.md`'s 60/30/10 reading would normally
 * spend more carefully. A footer band is the one place that is right: it is the page's last frame,
 * it is below the fold on every page, and it is the only element on the site that appears on all of
 * them, so making it the brand's colour is what makes the site read as one site. */
export function Footer({ note = "one JSON, one video", bookend = false, active }: { note?: string; bookend?: boolean; active?: string }) {
  if (!bookend) {
    return (
      <footer className="bookend foot-band foot-band-plain">
        <div className="wrap foot-in on-accent">
          <FooterNav active={active} />
          <div className="foot-rule" />
          <div className="foot-meta">
            <span>© 2026 Vawe · free to experiment with while it is early</span>
            <span className="mono">{note}</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bookend foot-band">
      <Clip className="bookend-film" src="/assets/backdrop.mp4" poster="/assets/backdrop.jpg" />
      <div className="wrap foot-in on-accent">
        <p className="foot-cta">Compose a scene. Render it. Ship it.</p>
        <p className="foot-sub">One JSON in, one frame-perfect video out. No account, no key, nothing sent anywhere.</p>
        <div className="foot-act">
          <a className="btn btn-white" href="/editor">
            Try the editor <span className="arw">→</span>
          </a>
          <a className="btn btn-onaccent" href="/features">
            Explore features <span className="arw">→</span>
          </a>
        </div>
        <FooterNav active={active} />
        <div className="foot-rule" />
        {/* No licence badge here. Vawe is Apache 2.0, plain and permissive, so there is no tier
            or limit to state. The LICENSE file is still in the repo for anyone who goes looking.
            Invite the experiment instead. */}
        <div className="foot-meta">
          <span>© 2026 Vawe · free to experiment with while it is early</span>
          <span className="mono">{note}</span>
        </div>
      </div>
    </footer>
  );
}
