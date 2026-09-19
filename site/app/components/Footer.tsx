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

/* `bookend` closes the page on the same material it opened on: the contentless backdrop scene
 * under cobalt. Never a capability clip — those all carry copy, which blurs into drifting smudges
 * behind the CTA. Interior pages keep the plain hairline footer.
 *
 * The bookend does NOT get the fuller grouped nav below: the home page's own header already carries
 * the full top nav (Editor, Showcase, Arsenal, Playground, Features), and `foot-links` above already
 * repeats the product surfaces as the page's closing move. A second, larger multi-column nav on a
 * cobalt band that is deliberately kept content-free to protect the render behind it (see the
 * `.bookend` rule in globals.css) would compete with the CTA it exists to deliver. The topic, job and
 * comparison pages the grouped nav below adds are reached from every interior page instead. */
export function Footer({ note = "one JSON, one video", bookend = false, active }: { note?: string; bookend?: boolean; active?: string }) {
  if (!bookend) {
    return (
      <footer className="wrap foot-plain">
        <FooterNav active={active} />
        <div className="foot">
          <span>© 2026 Vawe · free to experiment with while it is early</span>
          <span className="mono">{note}</span>
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
        <div className="foot-links">
          <a href="/arsenal">Arsenal</a>
          <a href="/showcase">Showcase</a>
          <a href="/editor">Editor</a>
          <a href="/features">Features</a>
        </div>
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
