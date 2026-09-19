import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · JSON to video",
  description:
    "What a Vawe scene file actually contains: one JSON document, 24 layer types, five named canvases, validated before a single frame renders. How the file becomes an mp4.",
  path: "/json-to-video",
});

/* /json-to-video · second of the three intent pages (see /determinism for the shared rationale
 * comment). JSON2Video and json-render both rank for "JSON to video", and vawe already says it is
 * one in its own metadata keywords without a page that explains the shape of the JSON itself. This
 * page states the scene contract as it exists in the repo today: no invented schema, no numbers
 * pulled from anywhere but core/layers/index.js and core/layout/safe.js.
 */

const SAMPLE = `{
  "module": "scene",
  "theme": "argus",
  "aspect": "16:9",
  "duration": 23,
  "layers": [ /* text, image, group, ... */ ]
}`;

export default function JsonToVideo() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> json to video
            </span>
            <h1>One JSON file. One rendered video.</h1>
            <p>
              There is exactly one module: <code>scene</code>. Every Vawe film starts as a single
              JSON document declaring its theme, its canvas and an open list of layers, and ends as
              one mp4. Nothing else is required to render.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The document itself.</h2>
              <p>
                A scene starts with <code>{"{"} "module": "scene" {"}"}</code> and adds a theme, an
                aspect ratio, a duration in seconds and a <code>layers</code> array. Every shipped
                sample opens the same way, and the render CLI reads the <code>module</code> field
                straight off the file to pick the right renderer if one is not passed explicitly.
              </p>
              <span className="cite">films/scene/sample.json:3 · renderer/cmd/render/main.go</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">films/scene/*.json</div>
                <pre className="code">{SAMPLE}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>24 layer types, one open canvas.</h2>
              <p>
                A layer is not chosen from a fixed set of templates: it is one of 24 registered
                types, from <code>text</code> and <code>image</code> to <code>svg</code>,{" "}
                <code>lottie</code> and <code>particles</code>, composed freely inside{" "}
                <code>group</code> and <code>composition</code> layers. There is no fixed slot
                layout: a layer declares its own position, its own timing, and the layer registry is
                the same list both the validator and the authoring tools read, so a type that exists
                in code is always one an author can reach.
              </p>
              <span className="cite">core/layers/index.js</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Five named canvases, and an escape hatch for the rest.</h2>
              <p>
                <code>aspect</code> picks a canvas from a table of five: <code>16:9</code>,{" "}
                <code>9:16</code>, <code>1:1</code>, <code>4:5</code>, <code>4:3</code>. A ratio the
                table does not name is still honoured: it is sized to fit the long edge at 1920
                pixels, so the JSON is never rejected for asking for a canvas nobody happened to
                enumerate.
              </p>
              <span className="cite">core/layout/safe.js:35, :53</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Validated before a browser ever opens.</h2>
              <p>
                The schema checks only the fields it declares: an unknown data key like{" "}
                <code>module</code> passes through untouched rather than failing a strict-mode
                check, which is what lets the same file carry metadata the render pipeline reads (the
                module name) alongside data purely a scene&apos;s own layers consume. A scene with a
                real error, a missing font, a layer type that does not exist, fails here, before the
                renderer spends a single frame on it.
              </p>
              <span className="cite">core/validate/validate.mjs:17</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The file becomes an mp4 with one command.</h2>
              <p>
                <code>./bin/vawe path/to/video.json</code> renders it, and{" "}
                <code>--draft</code> renders a fast 30fps pass to check the shape before the full
                60fps encode. No project setup, no timeline scrubbing by hand: the JSON is the whole
                input and the mp4 is the whole output.
              </p>
              <span className="cite">renderer/cmd/render/main.go:30</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">Who writes the JSON.</h2>
            <p className="lead">
              Most scenes are not hand-typed. An AI agent composes the file from a five-line brief,
              renders a free watermarked draft, and iterates.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/ai-agents">
                Read AI agents and video <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/determinism">Why the same file always renders the same bytes</a>
              <a href="/docs/the-scene">The full scene reference in the docs</a>
              <a href="/arsenal">Every layer, effect and preset, searchable</a>
              <a href="/remotion-alternatives">How this compares to other JSON video formats</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/json-to-video" />
    </div>
  );
}
