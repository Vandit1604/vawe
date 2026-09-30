import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · deterministic video rendering",
  description:
    "A Vawe film is a page seeked to each frame's time, never played: the same page produces the same frames on every render, in any order. How Vawe makes that true, how it checks it, and why that lets a render split into parallel slices.",
  path: "/determinism",
});

/* /determinism · the intent page for "why is my render nondeterministic". It states only what the
 * repo runs and cites the file: core/engine/page-clock.js, harness/media/render-page.mjs and
 * tests/media/render-page-determinism.test.mjs. No competitor is named.
 */

const CLOCK = `Date, performance.now   film time in ms
requestAnimationFrame   flushed once per seek
setTimeout/setInterval  fire when t passes them
Math.random             reseeded from t`;

const TEST = `render page -> frame hashes A
render page -> frame hashes B
assert A === B
assert frames differ over t`;

export default function Determinism() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <h1>Same page in. Same frames out.</h1>
            <p>
              A Vawe film is an HTML page that the renderer seeks to each frame&apos;s time. Ask for
              the frame at 4.2 seconds twice, in any order, and it comes back the same. That is not
              a tuning goal: the clock is replaced before the page runs, and a test renders pages
              twice and compares every frame.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The clock is fake, on purpose.</h2>
              <p>
                Before any script on the page runs, a virtual clock replaces every source of ambient
                state. <code>Date</code> and <code>performance.now</code> return film time, not the
                wall clock; <code>requestAnimationFrame</code> callbacks flush once per seek, and
                timers fire when the seek passes their due time. <code>Math.random</code> is
                reseeded from the seek time, so a scatter that looks random is the same scatter on
                every render.
              </p>
              <p>
                The page itself is seeked, never played: the renderer sets the clock, calls{" "}
                <code>window.seek(t)</code> when the page defines one, then seeks every CSS and Web
                Animation to t before the screenshot. Ordinary code that reads the time keeps
                working, and still paints a pure function of t.
              </p>
              <span className="cite">core/engine/page-clock.js · harness/media/render-page.mjs</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">page-clock.js</div>
                <pre className="code">{CLOCK}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>A test proves it, not a claim.</h2>
              <p>
                <code>tests/media/render-page-determinism.test.mjs</code> renders two fixture pages
                twice each and compares the decoded frame hashes. One page paints from{" "}
                <code>window.seek(t)</code> on a canvas; the other reads <code>Date.now</code>,{" "}
                <code>performance.now</code> and <code>Math.random</code> directly. Both renders
                must match frame for frame, and the frames must differ over time, so a page that
                froze would fail too. <code>bin/vawe e2e</code> runs it.
              </p>
              <span className="cite">tests/media/render-page-determinism.test.mjs · harness/dev/e2e.mjs</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">the test</div>
                <pre className="code">{TEST}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Parallel slices, the same pixels.</h2>
              <p>
                Because the frame at t depends on nothing before it, the renderer splits a film into
                fixed 60-frame slices and captures several at once, each on its own fresh page of
                one shared browser. The slice size is a constant, never the worker count: a page
                keeps raster state between seeks, so a frame reached by seeking can differ in the
                last decimal place from the same frame on a fresh page. Fixing the boundaries makes
                the pixels identical for any number of workers.
              </p>
              <span className="cite">harness/media/render-page.mjs, SLICE_FRAMES</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>60fps final, 30fps for a fast look.</h2>
              <p>
                One page becomes one mp4: <code>bin/vawe ship</code> renders 60fps at full size with
                motion blur and audio, and <code>bin/vawe dev</code> renders a half-size, 30fps,
                silent draft for a quick check. Frames are seeked at fractional times, so the render
                rate is independent of the page. Determinism is not a mode you opt into: every render
                goes through the same virtual clock.
              </p>
              <span className="cite">harness/cli/verbs.mjs · harness/media/render-page.mjs</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">When this property decides which engine to pick.</h2>
            <p className="lead">
              Byte-identical output matters most where nobody looks at every frame.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/when-determinism-matters">
                When determinism matters <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/ai-agents">How an agent writes the page</a>
              <a href="/features">What else the engine decides</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/determinism" />
    </div>
  );
}
