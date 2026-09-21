import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · JSON to video",
  description:
    "Make a video with code: the exact JSON that renders below it, and how the format works. One JSON document, 24 layer types, five named canvases, validated before a single frame renders.",
  path: "/json-to-video",
});

/* /json-to-video · second of the three intent pages (see /determinism for the shared rationale
 * comment). JSON2Video and json-render both rank for "JSON to video", and vawe already says it is
 * one in its own metadata keywords without a page that explains the shape of the JSON itself. This
 * page states the scene contract as it exists in the repo today: no invented schema, no numbers
 * pulled from anywhere but core/layers/index.js and core/layout/safe.js.
 *
 * The opening section used to show a truncated, non-runnable JSON stub next to nothing. It now
 * shows the real, complete films/scene/sample.json (the file the repo itself keeps for exactly
 * this: its own audio._why field says "the sample is read beside its JSON in a docs page") next to
 * the actual mp4 that file renders to. Both are real and both are here so a reader, human or agent,
 * can copy the left side and get the right side, rather than being told the mapping exists.
 */

const SAMPLE = `{
  "module": "scene",
  "theme": "default",
  "aspect": "9:16",
  "duration": 7.6,
  "captionMode": "sentence",
  "layers": [
    {
      "type": "text", "text": "Motion graphics",
      "x": 100, "y": 340, "w": 860, "size": 84, "weight": 800,
      "split": "word", "preset": "up", "stagger": 0.09, "each": 0.5,
      "start": 0.2, "duration": 3.5
    },
    {
      "type": "text", "text": "from pure <b>data.</b>",
      "x": 100, "y": 470, "w": 860, "size": 84, "weight": 800,
      "split": "word", "preset": "up", "stagger": 0.09, "each": 0.5,
      "start": 0.7, "duration": 3
    },
    {
      "type": "text", "text": "Every frame,", "font": "sans",
      "x": 100, "y": 340, "w": 790, "size": 108, "weight": 800,
      "split": "char", "preset": "blur", "each": 0.7, "stagger": 0.03,
      "start": 3.7, "duration": 3.9
    },
    {
      "type": "text", "text": "deterministic.", "font": "serif",
      "x": 100, "y": 490, "w": 790, "size": 126, "split": "line",
      "preset": "up", "each": 0.7, "start": 4.2, "duration": 3.4
    }
  ],
  "captions": [
    { "t0": 0.4, "t1": 3.4, "text": "Motion graphics from pure data" },
    { "t0": 3.8, "t1": 7.2, "text": "Every frame, deterministic" }
  ],
  "audio": { "silent": true },
  "bg": [{ "t": 0, "preset": "soft" }]
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
              This is how you make a video with code here: write the scene as data, and a headless
              renderer turns it into an mp4. There is exactly one module, <code>scene</code>, and
              every film starts as a single JSON document declaring its theme, its canvas and an
              open list of layers. Nothing else is required to render.
            </p>
          </section>

          <section className="isec iproof">
            <div className="isec-text">
              <h2>The document, and the video it renders.</h2>
              <p>
                This is the real file, unedited: <code>films/scene/sample.json</code>, the sample
                the repo itself keeps for exactly this comparison. Copy it, run{" "}
                <code>./bin/vawe films/scene/sample.json</code>, and this is the mp4 that comes out.
                No project setup, no timeline, no separate schema to learn first.
              </p>
              <span className="cite">films/scene/sample.json · renderer/cmd/render/main.go:30</span>
            </div>
            <div className="isec-art iproof-art">
              <div className="codeblock iproof-code">
                <div className="lbl">films/scene/sample.json</div>
                <pre className="code">{SAMPLE}</pre>
              </div>
              <div className="iproof-video">
                <Clip src="/assets/sample.mp4" poster="/assets/sample.jpg" />
                <span className="cite">out/sample.mp4, rendered from the file on the left</span>
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
