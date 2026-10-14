import { Header } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { REPO_URL } from "../components/Header";
import { Next, PageTop, Toc } from "../components/Xp";
import { AltEvidence, type QA } from "../components/AltEvidence";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Remotion alternative: vawe, HyperFrames and hosted APIs",
  description:
    "Remotion alternatives sorted into self-hosted engines (vawe, HyperFrames) and hosted JSON video APIs, with Remotion's 3-employee license rule quoted.",
  path: "/remotion-alternatives",
});

/* /remotion-alternatives · a fourth intent page, added after the three from site/AGENTS.md's
 * quiz brief. "Remotion alternative" and "JSON to video API" both carry real, ranking demand
 * (confirmed by search 2026-09-19: Shotstack, JSON2Video, Wireflow, Pexo, Product Hunt and
 * AlternativeTo all rank a "Remotion alternatives" page). This is the one comparison page the
 * research earned: every claim about another project below is read off that project's own
 * license, docs or pricing page, cited with the URL and the date read. No claim characterizes a
 * competitor's code quality, output quality or reliability, because none of that was verified.
 */

const FAQ: QA[] = [
  {
    q: "Is there a free Remotion alternative for a company with more than three employees?",
    a: "Yes. vawe and HyperFrames both ship under Apache-2.0, with no company-size clause and no paid tier. Remotion's own license asks a for-profit company past three employees for a paid Company License.",
  },
  {
    q: "Can I keep my React components?",
    a: "Not with vawe. A vawe film is one HTML page with CSS, Web Animations, SVG, canvas or three.js. If your team already writes video as React components, Remotion is the tool built for that, and the license question is the one to settle.",
  },
  {
    q: "Do I have to run servers?",
    a: "With a self-hosted engine you run the render yourself: vawe drives headless Chrome and encodes with ffmpeg on your machine. A hosted API such as JSON2Video or Shotstack runs the render for you and bills per minute or per credit.",
  },
  {
    q: "Will the same input give the same video every time?",
    a: (
      <>
        In vawe, yes: a virtual clock owns time and randomness, and the renderer seeks each frame. How we
        measured it, and the six sources of drift we fixed, are in{" "}
        <a href="/blog/determinism">deterministic rendering in headless Chrome</a>.
      </>
    ),
  },
  {
    q: "Can an AI agent write the video?",
    a: (
      <>
        Yes. Any coding agent can write an HTML page, and vawe ships a CLI and skills for the loop. Our
        notes on <a href="/blog/weaker-model">building the harness for the weaker model</a> show where
        agents still fail.
      </>
    ),
  },
];

export default function RemotionAlternatives() {
  return (
    <div className="shell">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Remotion alternatives", url: "/remotion-alternatives" }]))} />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Compare" current="Remotion alternatives" />
            <h1>Remotion alternatives, actually categorized.</h1>
            <p>
              &quot;Remotion alternative&quot; returns two different products under one query:
              a hosted API you POST a JSON file to, and a self-hosted engine you run yourself.
              They solve different problems. This page sorts the field before comparing anything.
            </p>
            <p className="bnote">
              Every claim below carries the page it was read on and the date. Read 2026-09-19.
            </p>
            <Toc items={[
              { href: "#table", label: "The table" },
              { href: "#shapes", label: "Two shapes" },
              { href: "#license", label: "Remotion's license" },
              { href: "#faq", label: "Questions" },
            ]} />
          </section>

          <section className="iend" id="table">
            <h2 className="h2">The comparison in one row.</h2>
            <p className="lead">Every cell traces to a source cited on this page.</p>
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
                  <tr className="is-vawe">
                    <td>vawe</td>
                    <td>Apache-2.0, no size clause</td>
                    <td>yes</td>
                    <td>one HTML page: CSS, Web Animations, SVG, canvas, three.js</td>
                    <td>CLI and skills (<code>bin/vawe</code>, <code>skills/</code>)</td>
                  </tr>
                  <tr>
                    <td>Remotion</td>
                    <td>free ≤3 employees, paid above</td>
                    <td>yes</td>
                    <td>React</td>
                    <td>Agent Skills (remotion.dev/docs/ai/skills)</td>
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
          </section>

          <section className="isec" id="shapes">
            <div className="isec-text">
              <h2>Two shapes, not one list.</h2>
              <p>
                <strong>Hosted JSON video APIs</strong> (JSON2Video, Shotstack) take a JSON
                request over HTTPS and hand back a rendered file: no server to run, no Chrome to
                manage, billed by the minute or by credits. <strong>Self-hosted rendering
                engines</strong> (Remotion, HyperFrames, vawe) are code you run: a composition
                format, a headless-browser render step, output you own end to end. A team
                choosing between JSON2Video and vawe is not really choosing an alternative, it is
                choosing whether to run infrastructure at all.
              </p>
              <span className="cite">
                json2video.com, shotstack.io (hosted) · github.com/remotion-dev/remotion,
                github.com/heygen-com/hyperframes (self-hosted) · read 2026-09-19
              </span>
            </div>
          </section>

          <section className="isec" id="license">
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
              <h2>vawe and HyperFrames are the free self-hosted ones.</h2>
              <p>
                vawe ships under Apache-2.0 with no company-size clause and no paid tier. A film is
                one HTML page. HyperFrames (HeyGen) is also Apache-2.0 and composes from HTML with
                data attributes. Each has its own side-by-side page: <a href="/vs/remotion">vawe vs
                Remotion</a> and <a href="/vs/hyperframes">vawe vs HyperFrames</a>.
              </p>
              <span className="cite">
                LICENSE and package.json (this repo) · github.com/heygen-com/hyperframes · read
                2026-09-19
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

          <AltEvidence faq={FAQ} />

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

          <Next
            title="Compare vawe with one tool."
            primary={{ href: "/vs/remotion", label: "vawe vs Remotion" }}
            secondary={{ href: REPO_URL, label: "Star vawe on GitHub" }}
            related={[
              { href: "/hyperframes-alternatives", label: "HyperFrames alternatives" },
              { href: "/determinism", label: "Why the same page always renders the same frames" },
              { href: "/ai-agents", label: "How an agent writes and checks a film" },
              { href: "/when-determinism-matters", label: "When determinism is the reason to pick an engine" },
              { href: "/blog/page-contract", label: "How vawe renders HTML to video" },
            ]}
          />
        </main>
      </div>
      <Footer active="/remotion-alternatives" />
    </div>
  );
}
