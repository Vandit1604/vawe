import { Header, REPO_URL } from "../components/Header";
import { Footer } from "../components/Footer";
import { FilmGrid } from "../components/FilmGrid";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · product tour video",
  description:
    "A chaptered product tour or feature-update video: three chapters, a continuous progress rail, one tracked issue carried through.",
  path: "/product-tour-video",
});

/* /product-tour-video · the chaptered shape of a launch video, shown by the rendered product-feature-tour. */

export default function ProductTourVideo() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <h1>A feature tour with more than one thing to show.</h1>
            <p>
              Some products have three features worth a beat each, not one. This shape carries a
              continuous accent rail across the top and one issue tracked through every chapter, so
              the film reads as one object changing state, not several unrelated shots.
            </p>
          </section>

          <section className="ifilms">
            <h2>A chaptered tour.</h2>
            <p>Three chapters, one progress rail, one tracked issue. Hover to play it, or click to watch it large.</p>
            <FilmGrid ids={["product-feature-tour"]} />
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Still one route, still one doctrine.</h2>
              <p>
                A product tour is not a sixth deliverable in the engine&apos;s own routing table: it
                still routes as a launch video, because the ask is the same one the table names,
                &quot;market or show a real product,&quot; just with three features to carry
                instead of one. What changes is the spine inside that route, chapters instead of one
                run of beats, chosen because the brief needed more than one proof point.
              </p>
              <span className="cite">engine-doctrine/CRAFT/ROUTING.md, row 2</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">One feature, not three.</h2>
            <p className="lead">
              A single product with one hero feature takes the launch beat list instead of chapters.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href={REPO_URL}>
                Start a product tour <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/launch-video">A single-product launch video, one message per beat</a>
              <a href="/showcase">Every finished film</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/product-tour-video" />
    </div>
  );
}
