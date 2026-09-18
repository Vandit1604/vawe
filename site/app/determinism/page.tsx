import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · deterministic video rendering",
  description:
    "renderFrame(n) is a pure function of n: the same scene JSON produces byte-identical frames on any machine, in any order. How Vawe proves it, and why that lets a long render split across parallel browser tabs.",
  path: "/determinism",
});

/* /determinism · one of three intent pages this SEO pass is allowed to add (site/AGENTS.md quiz
 * brief: THE THREE INTENTS). vawe already answers "why is my render nondeterministic" nowhere a
 * search engine can find, and the property is the engine's central, verifiable claim: HyperFrames
 * and Remotion both carry a dedicated page on this exact concept. This page states only what the
 * repo runs and cites the file, per the task's second bar: it would still be worth reading with
 * search deleted, because it explains a real engineering decision (a virtual clock, two order-
 * scrambling gates) that a reader can go verify.
 *
 * No competitor is named. The task rules that out unless a weakness is independently verified,
 * and describing vawe's own mechanism is the whole point of the page anyway.
 */

const PROBE = `render(n) -> signature A
render(FAR-AWAY frame)   // dirty any hidden state
render(n) -> signature B
assert A === B`;

const SNAP = `render frames ascending  -> signature
render frames descending -> signature
assert both signatures match`;

export default function Determinism() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> determinism
            </span>
            <h1>Same JSON in. Same bytes out.</h1>
            <p>
              A Vawe render is a pure function of the frame number. Ask for frame 412 twice, on two
              machines, in any order, and it comes back byte-identical. That is not a tuning goal,
              it is enforced at boot and checked by two gates on every scene the engine ships.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The clock is fake, on purpose.</h2>
              <p>
                Before the first frame renders, a virtual clock replaces every source of ambient
                state. <code>Date.now()</code> returns the current frame&apos;s timestamp, not the
                wall clock; <code>requestAnimationFrame</code> and <code>setTimeout</code> fire
                against frame time; <code>Math.random</code> is seeded, so a scatter that looks
                random is the same scatter on every render. Nothing in a scene can read real time or
                draw from unseeded entropy, so <code>renderFrame(n)</code> depends on nothing but
                <code>n</code>.
              </p>
              <p>
                The build contract is explicit about it: a format exposes
                <code>{" "}build(data, fps, theme) -&gt; {"{"} fps, duration, stings, sfx, renderFrame(n) {"}"}</code>,
                and every comment around that function in the boot code repeats the same rule:
                <code>renderFrame</code> stays pure in <code>n</code> and never touches async.
              </p>
              <span className="cite">core/engine/boot.js:402, :623</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">the invariant</div>
                <pre className="code">renderFrame(n) is pure in n
{"->"} frame 412 renders the same
   first, last, or on its own</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>A scrambler proves it, not a claim.</h2>
              <p>
                <code>quality/gates/probe-purity.mjs</code> renders a sampled frame <code>n</code>,
                then deliberately renders a far-away frame to dirty any state a scene might be
                hiding, then renders <code>n</code> again. It records a DOM signature at each pass
                (visible text, transform, opacity, colour, filter, clip-path) rather than a raw
                screenshot, because that is what the browser actually painted and it is immune to
                GPU antialiasing noise. The two signatures must match exactly.
              </p>
              <p>
                It compares against a reference tab that only ever seeks forward, never backward,
                because a tab that has replayed a later frame can carry stale state the scrambler
                alone would not catch. It is a real bug this gate found and fixed.
              </p>
              <span className="cite">quality/gates/probe-purity.mjs · make probe</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">probe-purity.mjs</div>
                <pre className="code">{PROBE}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The whole library is swept, not one scene.</h2>
              <p>
                <code>quality/gates/snap-scenes.mjs</code> renders every shipped scene&apos;s sampled
                frames ascending, then descending, and diffs the two runs. A scene whose signature
                moves when the order changes has state leaking across frames, and it is quarantined
                out of the baselined set rather than shipped quietly wrong. For everything that
                passes, the same pass saves a regression baseline keyed by scene name, so a future
                refactor either leaves the picture untouched or shows exactly what moved.
              </p>
              <p>
                Purity is also why a render is fast. Because frame 900 depends on nothing before it,
                the Go renderer opens several tabs on one browser and lets each seek straight to its
                assigned frames, capped at six tabs sharing one GPU process, tuned down from eight
                after raster starvation corrupted frames under load.
              </p>
              <span className="cite">quality/gates/snap-scenes.mjs · renderer/cmd/render/main.go</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">snap-scenes.mjs</div>
                <pre className="code">{SNAP}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>60fps final, 30fps for a fast look.</h2>
              <p>
                One JSON file (<code>{"{"} "module": "scene" {"}"}</code>) becomes one mp4: 60fps by
                default, or 30fps with <code>--draft</code> for a quick check before the real
                render. The frame rate is the one knob that changes; determinism is not a mode you
                opt into, every render goes through the same virtual clock.
              </p>
              <span className="cite">renderer/cmd/render/main.go:30 · films/scene/sample.json:3</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">What one JSON file actually contains.</h2>
            <p className="lead">
              A scene is 24 layer types over five named canvases, validated before it ever reaches a
              browser. That structure is the next page.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/json-to-video">
                Read JSON to video <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/ai-agents">How an agent writes the JSON</a>
              <a href="/docs/determinism">The technical reference in the docs</a>
              <a href="/editor">Break a render on purpose, in the editor</a>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
