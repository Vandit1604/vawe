import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · product tour video",
  description:
    "A chaptered product tour or feature-update video, built as one JSON file: three chapters, a continuous progress rail, one tracked issue carried through.",
  path: "/product-tour-video",
});

/* /product-tour-video · second of the three use-case pages, and the one that exists because a
 * single film in the repo genuinely took a different shape from the others: not one six-beat
 * launch run, but three chapters. That film, product-feature-tour, could not be re-rendered from
 * its source and came down site-wide along with the rest of the stale set; the two sections that
 * narrated its clip went with it. What remains here is the doctrine, still true without a film to
 * show it: a product tour still routes as a launch video, chaptered instead of six fixed beats.
 */

export default function ProductTourVideo() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> product tour video
            </span>
            <h1>A feature tour with more than one thing to show.</h1>
            <p>
              Some products have three features worth a beat each, not one. This shape carries a
              continuous accent rail across the top and one issue tracked through every chapter, so
              the film reads as one object changing state, not several unrelated shots.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text" style={{ gridColumn: "1 / -1", maxWidth: "70ch" }}>
              <h2>No rendered example here right now.</h2>
              <p>
                The film that proved this shape, <code>product-feature-tour</code>, could not be
                re-rendered from its source and came down with the rest of the stale set.{" "}
                <a href="/showcase">See /showcase</a> for what the engine has rendered today.
              </p>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Still one route, still one doctrine.</h2>
              <p>
                A product tour is not a sixth deliverable in the engine&apos;s own routing table: it
                still routes as a launch video, because the ask is the same one the table names,
                &quot;market or showcase a real product,&quot; just with three features to carry
                instead of one. What changes is the spine inside that route, chapters instead of a
                fixed six beats, chosen because the brief needed more than one proof point.
              </p>
              <span className="cite">engine-doctrine/CRAFT/ROUTING.md, priority row 2</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">One feature, not three.</h2>
            <p className="lead">
              A single product with one hero feature takes the fixed six-beat launch spine instead
              of chapters.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/editor">
                Try the editor <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/launch-video">A single-product launch video, six fixed beats</a>
              <a href="/showcase">Every finished film, open in the editor</a>
              <a href="/arsenal">Every layer, effect and preset, searchable</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/product-tour-video" />
    </div>
  );
}
