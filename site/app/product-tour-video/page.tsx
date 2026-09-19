import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Clip } from "../components/Clip";
import { SourceViewer } from "../components/SourceViewer";
import { pageMetadata } from "../components/seo";
import films from "../../lib/films.json";
import LINES from "../../lib/scene-lines.json";
import "../components/intent.css";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;
const durOf = (slug: string) => (films as Record<string, { label: string }>)[slug]?.label ?? "";

export const metadata = pageMetadata({
  title: "Vawe · product tour video",
  description:
    "A chaptered product tour or feature-update video, built as one JSON file: three chapters, a continuous progress rail, one tracked issue carried through. The real rendered film that proves it.",
  path: "/product-tour-video",
});

/* /product-tour-video · second of the three use-case pages, and the one that exists because a
 * single film in the repo genuinely takes a different shape from the other five: not one
 * six-beat launch run, but three chapters. films/scene/product-feature-tour.storyboard.md is the
 * only source for every structural claim on this page; the rendered duration is read from
 * site/lib/films.json, never retyped from the storyboard's own (shorter, pre-recut) figure.
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
              Some products have three features worth a beat each, not one. This engine has a real,
              rendered film built that way: three chapters, one issue carried through all of them,
              and a progress rail that never leaves the frame.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>One issue, tracked through three chapters.</h2>
              <p>
                <code>product-feature-tour</code> follows Star-Story-Solution: the product is the
                star, and the three chapters are the story of one issue, labelled NW-1184, moving
                through it, raised in chapter one, scheduled in chapter two, closed by an agent in
                chapter three. The end card is the solution. A continuous accent rail across the top
                fills with the film&apos;s own progress and flinches on every cut, so the whole film
                reads as one object changing state, not eight unrelated shots.
              </p>
              <span className="cite">films/scene/product-feature-tour.storyboard.md</span>
            </div>
            <div className="isec-art">
              <div className="fmedia">
                <Clip
                  src="/assets/films/product-feature-tour.mp4"
                  poster="/assets/films/product-feature-tour.jpg"
                />
              </div>
              <span className="cite">
                product-feature-tour · {durOf("product-feature-tour")} · template
              </span>
              <SourceViewer name="product-feature-tour" lines={lineCount("product-feature-tour")} />
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The match cut that hands the plan to the work.</h2>
              <p>
                At 14 seconds in, the roadmap bar labelled &quot;Agents&quot; does not leave the
                frame. It IS the agent panel in the next chapter, handed over in its own pose with
                no entrance and no exit, and that panel then types the fix out character by
                character. The plan becomes the work in one cut, which is the one moment the film
                raises its voice; every other shot holds one idea at one volume.
              </p>
              <span className="cite">films/scene/product-feature-tour.storyboard.md, &quot;spectacle&quot;</span>
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
