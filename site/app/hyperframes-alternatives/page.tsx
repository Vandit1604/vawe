import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · HyperFrames alternatives, one real comparison",
  description:
    "HyperFrames is HeyGen's self-hosted, Apache-2.0, agent-facing rendering engine, the closest peer Vawe has. Same license, same headless-Chrome shape, both compose from HTML, with a different way of timing it and of enforcing determinism. Read 2026-09-19.",
  path: "/hyperframes-alternatives",
});

/* /hyperframes-alternatives · the one HyperFrames page this research earned. /remotion-alternatives
 * already sorts "Remotion alternative" into hosted-API vs self-hosted-engine and gives HyperFrames one
 * row in its table; that page's question (which SHAPE of product do you want) does not repeat here.
 * This page's question is narrower and only makes sense for a peer: Vawe and HyperFrames are both
 * self-hosted, both Apache-2.0, both drive a headless browser, both pitch themselves at an agent
 * writing the file, so "which one" is a real decision with real differences to name, not a licensing
 * threshold to explain. Written as one page rather than two (comparison + alternatives) because a
 * second page listing "alternatives to HyperFrames" would restate this same content with the nouns
 * swapped: there is exactly one alternative worth naming in depth, and generic multi-tool roundups
 * (JSON2Video, Shotstack) are already covered from Remotion's side on /remotion-alternatives.
 *
 * Every HyperFrames claim below is read off hyperframes.heygen.com/concepts/determinism, the
 * heygen-com/hyperframes GitHub README, and its LICENSE, all read 2026-09-19, cited inline with the
 * URL. No claim states a limitation, price, or quality judgement not read on those pages: HyperFrames
 * publishes no price anywhere in its docs or README, so this page states none, and it does not
 * characterize either project's code quality, output quality, or reliability, per the same rule
 * /remotion-alternatives holds. Vawe claims are cited to the file that proves them.
 */

export default function HyperframesAlternatives() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <h1>HyperFrames alternatives, one real comparison.</h1>
            <p>
              Most &quot;X alternatives&quot; queries return a grab-bag of unrelated tools. HyperFrames
              (HeyGen&apos;s open-source rendering engine) actually has one close peer: Vawe. Same
              license shape, same self-hosted headless-browser pipeline, same pitch to an agent writing
              the file instead of a human clicking a timeline. This page compares the two directly.
            </p>
            <p className="bnote">
              Every claim below carries the page it was read on and the date. Read 2026-09-19.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Where they agree, stated plainly.</h2>
              <p>
                Both projects are self-hosted: you run the render, not a vendor&apos;s API. Both drive
                a real headless browser to turn markup into frames rather than compositing video
                natively. Both ship under Apache-2.0 with no company-size clause and no per-render fee
                in the engine itself, and HyperFrames&apos; own README says exactly that: &quot;no
                per-render fees or commercial-use thresholds.&quot; Both projects also lead with the
                same audience, an AI agent writing the composition rather than a person dragging clips
                on a timeline. Where the two are the same, this page says so instead of inventing a
                difference.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes (README, LICENSE) · read 2026-09-19 · LICENSE,
                package.json &quot;license&quot;: &quot;Apache-2.0&quot; (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Both write HTML, timed two different ways.</h2>
              <p>
                HyperFrames composes from HTML with data attributes for timing, animated by GSAP, CSS,
                Lottie, Three.js, Anime.js or the Web Animations API, per its README: &quot;Define a
                video as HTML. Add data attributes for timing and tracks.&quot; A Vawe film is also one
                HTML page, and it carries no timing attributes of its own: the page declares a
                duration in a <code>&lt;meta&gt;</code> tag, and time comes from ordinary CSS{" "}
                <code>@keyframes</code> and <code>element.animate()</code>, which the renderer seeks,
                or from a <code>window.seek(t)</code> function that paints the frame at t. Neither
                shape is being called better here: one adds a timing vocabulary to the page, the other
                reads the timing the web platform already has.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes README · read 2026-09-19 · AGENTS.md, &quot;The page
                contract&quot; (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Determinism, enforced two different ways.</h2>
              <p>
                Both projects promise the same guarantee, the same composition always produces the
                same video, and both ship the same list of failure modes: a wall clock, unseeded
                randomness, a mid-render network fetch. HyperFrames&apos; own determinism page states
                its rule as a prohibition: &quot;No <code>Date.now()</code>, <code>requestAnimationFrame</code>,
                or system timers permitted,&quot; and &quot;<code>Math.random()</code> without a seed
                gives a different frame every run,&quot; meaning code that calls those APIs directly is
                the thing the composition is not supposed to do. Vawe takes the other mechanism: it
                does not forbid those calls, it intercepts them. Before any page script runs,{" "}
                <code>core/engine/page-clock.js</code> replaces <code>Date</code>,{" "}
                <code>performance.now</code>, <code>requestAnimationFrame</code>, the timers and{" "}
                <code>Math.random</code> with versions that are pure functions of the seek time,
                with the random sequence reseeded on every seek, so ordinary code that calls them keeps working and still renders byte-identically. Both
                reach the same guarantee; one reaches it by disallowing the call, the other by rewriting
                what the call returns.
              </p>
              <span className="cite">
                hyperframes.heygen.com/concepts/determinism · read 2026-09-19 ·
                core/engine/page-clock.js (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Agent integration: skills and a CLI on both sides.</h2>
              <p>
                HyperFrames ships 21 skills an agent loads on demand (a router skill plus creation
                workflows and domain skills, installed with <code>npx skills add heygen-com/hyperframes</code>),
                paired with a non-interactive CLI: <code>npx hyperframes init</code>,{" "}
                <code>preview</code>, <code>render</code>. Vawe has the same shape: one command,{" "}
                <code>bin/vawe</code> (<code>new</code>, <code>dev</code>, <code>critique</code>,{" "}
                <code>ship</code>, <code>judge</code>), and a small set of skills in the repo
                (<code>vawe-brief</code>, <code>vawe-page</code>, <code>vawe-critique</code>,{" "}
                <code>vawe-reference</code>). Where Vawe differs is the review step: a film is
                critiqued and judged by a fresh session that did not write it, and a pass is never
                self-recorded.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes README · read 2026-09-19 · harness/cli/verbs.mjs,
                skills/, AGENTS.md (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Hosted rendering: one names an optional paid step.</h2>
              <p>
                HyperFrames&apos; README mentions a HeyGen-hosted cloud render command and an optional
                AWS Lambda path for distributed rendering, alongside a template gallery it says holds
                &quot;15+ design templates&quot; browsable at hyperframes.dev/design; it publishes no
                price for either. Vawe has no hosted API and no paid step: it renders on your machine,
                and its starting points are the film templates in <code>prompts/</code>. HyperFrames&apos;
                hosted-rendering price is not public, so it is not stated here.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes README · read 2026-09-19 · prompts/ (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Not compared: anything neither project documents.</h2>
              <p>
                This page states no render-speed number, no reliability figure, and no output-quality
                opinion for either project, because neither publishes one anywhere citable. Third-party
                blog posts comparing render times between the two exist; they are not HyperFrames&apos;
                own numbers, so they are not repeated here. If a fact above has changed, the source it
                was read from is linked so it can be checked again.
              </p>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">The comparison in one row.</h2>
            <p className="lead">Every cell below traces to a source cited above.</p>
            <div className="itable-wrap">
              <table className="itable">
                <thead>
                  <tr>
                    <th>project</th>
                    <th>license</th>
                    <th>composition</th>
                    <th>determinism mechanism</th>
                    <th>agent integration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Vawe</td>
                    <td>Apache-2.0, no size clause</td>
                    <td>one HTML page, timed by CSS, Web Animations or <code>seek(t)</code></td>
                    <td>coerces Date/rAF/timers/Math.random into pure functions of the seek time</td>
                    <td>CLI + skills, judged by a fresh session</td>
                  </tr>
                  <tr>
                    <td>HyperFrames</td>
                    <td>Apache-2.0, no size clause</td>
                    <td>HTML + data attributes, GSAP/CSS/Lottie/Three/Anime/WAAPI</td>
                    <td>prohibits Date.now/rAF/unseeded Math.random outright</td>
                    <td>21 skills + non-interactive CLI</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/determinism">
                Read Vawe&apos;s determinism mechanism <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/remotion-alternatives">Remotion alternatives, categorized</a>
              <a href="/when-determinism-matters">When determinism is the reason to pick an engine</a>
              <a href="/ai-agents">How an agent writes and checks a film</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/hyperframes-alternatives" />
    </div>
  );
}
