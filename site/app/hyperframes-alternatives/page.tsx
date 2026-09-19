import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import effects from "../../lib/effects.json";
import blocks from "../../lib/blocks.json";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · HyperFrames alternatives, one real comparison",
  description:
    "HyperFrames is HeyGen's self-hosted, Apache-2.0, agent-facing rendering engine, the closest peer Vawe has. Same license, same headless-Chrome shape, different composition language and a different way of enforcing determinism. Read 2026-09-19.",
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

const EFFECT_TOTAL = effects.total;
const BLOCK_TOTAL = Array.isArray(blocks) ? blocks.length : Object.keys(blocks).length;

export default function HyperframesAlternatives() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> alternatives
            </span>
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
              <h2>Two different things to write.</h2>
              <p>
                HyperFrames composes from HTML with data attributes for timing, animated by GSAP, CSS,
                Lottie, Three.js, Anime.js or the Web Animations API, per its README: &quot;Define a
                video as HTML. Add data attributes for timing and tracks.&quot; Vawe composes from one
                JSON document: a scene with an open canvas of 24 layer types (<code>core/layers/</code>),
                plus camera, transitions and captions, with no HTML timeline of its own to hand-author
                (an <code>html</code> layer is one picture inside that canvas, not the whole
                composition). An agent targeting HyperFrames is writing and timing markup; an agent
                targeting Vawe is writing structured JSON a validator checks before a frame renders.
                Neither shape is being called better here, they are genuinely different inputs.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes README · read 2026-09-19 · AGENTS.md, `ls core/layers/`
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
                does not forbid those calls, it intercepts them. <code>core/engine/boot.js</code>
                replaces <code>Date.now</code>, <code>performance.now</code>, <code>Math.random</code>
                and <code>requestAnimationFrame</code> with versions that are pure functions of the
                current frame number, reseeded on every frame (<code>core/engine/boot.js:355-374</code>),
                so ordinary code that calls them keeps working and still renders byte-identically. Both
                reach the same guarantee; one reaches it by disallowing the call, the other by rewriting
                what the call returns.
              </p>
              <span className="cite">
                hyperframes.heygen.com/concepts/determinism · read 2026-09-19 ·
                core/engine/boot.js:355-374 (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Agent integration: skills and a CLI, or one MCP server.</h2>
              <p>
                HyperFrames ships 21 skills an agent loads on demand (a router skill plus creation
                workflows and domain skills, installed with <code>npx skills add heygen-com/hyperframes</code>),
                paired with a non-interactive CLI: <code>npx hyperframes init</code>,{" "}
                <code>preview</code>, <code>render</code>. Vawe ships an MCP server with four tools
                (<code>vawe_guide</code>, <code>vawe_draft</code>, <code>vawe_export</code>,{" "}
                <code>vawe_status</code>) that a calling model invokes directly inside the conversation,
                no separate CLI install step for the agent side (<code>mcp/server.mjs</code>). Both are
                real, running integrations rather than a claim in a README; they just hand the agent a
                different surface, a skill-and-CLI pair versus a tool-call protocol.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes README · read 2026-09-19 · mcp/server.mjs (this repo)
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Registries and hosted rendering: both name an optional paid step.</h2>
              <p>
                HyperFrames&apos; README mentions a HeyGen-hosted cloud render command and an optional
                AWS Lambda path for distributed rendering, alongside a template gallery it says holds
                &quot;15+ design templates&quot; browsable at hyperframes.dev/design; it publishes no
                price for either. Vawe has no hosted API and no template library by design: its
                registries are {EFFECT_TOTAL} named effects and {BLOCK_TOTAL} composable blocks
                (<code>site/lib/effects.json</code>, <code>site/lib/blocks.json</code>) that a scene
                composes from directly, and the one paid step anywhere in the project is the hosted MCP
                export, a convenience layered on a free engine rather than a gate on it. Neither
                project&apos;s hosted-rendering price is public, so neither is stated here.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes README · read 2026-09-19 · site/lib/effects.json,
                site/lib/blocks.json, mcp/pricing.mjs (this repo)
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
                    <td>scene JSON, 24 layer types</td>
                    <td>coerces Date.now/rAF/Math.random into pure functions of the frame</td>
                    <td>MCP server, 4 tools (<code>mcp/</code>)</td>
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
              <a href="/ai-agents">The MCP server, and why exports are the only paid call</a>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
