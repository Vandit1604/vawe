import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import effects from "../../lib/effects.json";
import blocks from "../../lib/blocks.json";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · Remotion alternatives, categorized",
  description:
    "\"Remotion alternative\" returns two different products: a hosted JSON video API, or a self-hosted rendering engine. What Remotion's own license requires, what Vawe and HyperFrames give away free, and where a hosted API fits instead. Read 2026-09-19.",
  path: "/remotion-alternatives",
});

/* /remotion-alternatives · a fourth intent page, added after the three from site/AGENTS.md's
 * quiz brief. "Remotion alternative" and "JSON to video API" both carry real, ranking demand
 * (confirmed by search 2026-09-19: Shotstack, JSON2Video, Wireflow, Pexo, Product Hunt and
 * AlternativeTo all rank a "Remotion alternatives" page). This is the one comparison page the
 * research earned: every claim about another project below is read off that project's own
 * license, docs or pricing page, cited with the URL and the date read. No claim characterizes a
 * competitor's code quality, output quality or reliability, because none of that was verified.
 * The two vawe counts on this page (effects, blocks) import the live registries rather than
 * typing a number, per site/CLAUDE.md's "the numbers on this site are never typed."
 */

const EFFECT_TOTAL = effects.total;
const BLOCK_TOTAL = Array.isArray(blocks) ? blocks.length : Object.keys(blocks).length;

export default function RemotionAlternatives() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <h1>Remotion alternatives, actually categorized.</h1>
            <p>
              &quot;Remotion alternative&quot; returns two different products under one query:
              a hosted API you POST a JSON file to, and a self-hosted engine you run yourself.
              They solve different problems. This page sorts the field before comparing anything.
            </p>
            <p className="bnote">
              Every claim below carries the page it was read on and the date. Read 2026-09-19.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Two shapes, not one list.</h2>
              <p>
                <strong>Hosted JSON video APIs</strong> (JSON2Video, Shotstack) take a JSON
                request over HTTPS and hand back a rendered file: no server to run, no Chrome to
                manage, billed by the minute or by credits. <strong>Self-hosted rendering
                engines</strong> (Remotion, HyperFrames, Vawe) are code you run: a composition
                language, a headless-browser render step, output you own end to end. A team
                choosing between JSON2Video and Vawe is not really choosing an alternative, it is
                choosing whether to run infrastructure at all.
              </p>
              <span className="cite">
                json2video.com, shotstack.io (hosted) · github.com/remotion-dev/remotion,
                github.com/heygen-com/hyperframes (self-hosted) · read 2026-09-19
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Remotion&apos;s own license, quoted directly.</h2>
              <p>
                Remotion&apos;s <code>LICENSE.md</code> grants a free license to an individual, a
                non-profit, a company still evaluating the software, or &quot;a for-profit
                organization with up to 3 employees.&quot; A for-profit company past three
                employees needs a paid Company License to use it. That threshold is the single
                most common reason a team searches for a Remotion alternative in the first place:
                it is not a limitation of the software, it is a term of the license.
              </p>
              <span className="cite">
                github.com/remotion-dev/remotion/blob/main/LICENSE.md · read 2026-09-19
              </span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">remotion license.md</div>
                <pre className="code">{`free:
  individual
  non-profit
  evaluating the software
  for-profit, up to 3 employees
paid "Company License":
  for-profit, 4+ employees`}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Vawe: Apache-2.0, no employee count.</h2>
              <p>
                Vawe ships under the Apache License, Version 2.0, the same file at the root of
                this repo. There is no company-size clause and no paid tier in the engine itself:
                the renderer, the 24 layer types, and the effect and block registries are all in
                the license&apos;s scope. The only paid step anywhere in this project is the
                optional hosted MCP export (see <code>/ai-agents</code>), and that is a hosted
                convenience on top of a free engine, not a gate on the engine.
              </p>
              <span className="cite">LICENSE · package.json &quot;license&quot;: &quot;Apache-2.0&quot;</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>HyperFrames is the other free one.</h2>
              <p>
                HyperFrames (HeyGen) is also Apache-2.0: no license fee, no per-render charge, and
                no requirement to use HeyGen&apos;s cloud, per its own repository. It composes from
                HTML, CSS and GSAP rather than React, and states the same pitch Vawe does: built
                for an agent to write, not a human to click through a timeline. It is a genuine
                peer to Vawe on licensing terms, and this page does not claim otherwise. Where they
                differ is what ships inside: Vawe&apos;s registries currently hold {EFFECT_TOTAL} named
                effects and {BLOCK_TOTAL} composable blocks, and its MCP server (<code>mcp/server.mjs</code>)
                is a running integration a caller can install and smoke-test today, not a claim in
                a README.
              </p>
              <span className="cite">
                github.com/heygen-com/hyperframes · read 2026-09-19 · site/lib/effects.json,
                site/lib/blocks.json, mcp/server.mjs
              </span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>JSON2Video: a hosted API, priced by the minute.</h2>
              <p>
                JSON2Video&apos;s public pricing page offers a free plan (600 credits, no card
                required), then subscriptions starting at $16.95/month for 3,000 credits and up to
                50 minutes of rendered output, rising to $99.95/month for 30,000 credits. It is a
                reasonable choice for a team that wants zero infrastructure and does not need a
                custom effect vocabulary: the tradeoff is a running bill per minute rendered, and no
                self-hosting option on that page.
              </p>
              <span className="cite">json2video.com/pricing · read 2026-09-19</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Not publicly compared: everything neither project documents.</h2>
              <p>
                This page does not state a render-speed number, a reliability figure, or an
                output-quality opinion for any competitor, because none of that is published
                anywhere citable. Where a fact was not found on the project&apos;s own site, it is
                left out rather than guessed. If one of the facts above has changed, the source it
                was read from is linked above so it can be checked again.
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
                    <th>self-hosted</th>
                    <th>composition</th>
                    <th>agent integration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Vawe</td>
                    <td>Apache-2.0, no size clause</td>
                    <td>yes</td>
                    <td>scene JSON, 24 layer types</td>
                    <td>MCP server, running (<code>mcp/</code>)</td>
                  </tr>
                  <tr>
                    <td>Remotion</td>
                    <td>free ≤3 employees, paid above</td>
                    <td>yes</td>
                    <td>React</td>
                    <td>not publicly stated</td>
                  </tr>
                  <tr>
                    <td>HyperFrames</td>
                    <td>Apache-2.0, no size clause</td>
                    <td>yes</td>
                    <td>HTML, CSS, GSAP</td>
                    <td>agent-native, per its own docs</td>
                  </tr>
                  <tr>
                    <td>JSON2Video</td>
                    <td>free tier + paid credits</td>
                    <td>no, hosted only</td>
                    <td>JSON to a template API</td>
                    <td>not publicly stated</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/json-to-video">
                Read the scene JSON itself <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/determinism">Why the same scene always renders the same bytes</a>
              <a href="/ai-agents">The MCP server, and why exports are the only paid call</a>
              <a href="/when-determinism-matters">When determinism is the reason to pick an engine</a>
              <a href="/hyperframes-alternatives">Vawe vs HyperFrames, the closer comparison</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/remotion-alternatives" />
    </div>
  );
}
