import { Header } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { Next, PageTop, Toc } from "../components/Xp";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · when determinism actually matters",
  description:
    "Byte-identical rendering is a real property, not a universal one. When it decides which engine to pick, and when a human editing a timeline by eye makes it beside the point.",
  path: "/when-determinism-matters",
});

/* /when-determinism-matters · a decision-shaped companion to /determinism, not a duplicate of
 * it. /determinism explains the mechanism (virtual clock, two gates) in this repo; this page
 * answers a different question, when does the property change a real decision, and states it in
 * a way that survives a competitor's next release because it is about a property, not a
 * scoreboard. No competitor's determinism is characterized as present or absent here: the one
 * competitor fact used (HyperFrames documents the same commitment) is read off that project's own
 * page and cited, exactly like the rest of this SEO pass's rule.
 */

export default function WhenDeterminismMatters() {
  return (
    <div className="shell">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "When determinism matters", url: "/when-determinism-matters" }]))} />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Compare" current="When determinism matters" />
            <h1>When determinism actually matters.</h1>
            <p>
              Byte-identical rendering is a real, checkable property. It is also not the reason
              to pick a rendering engine most of the time. Here is what changes when it is, and
              what stays the same when it is not.
            </p>
            <Toc items={[
              { href: "#nobody", label: "Nobody looks" },
              { href: "#regression", label: "Regressions" },
              { href: "#human", label: "A human is last" },
              { href: "#built-in", label: "Built in" },
            ]} />
          </section>

          <section className="isec" id="nobody">
            <div className="isec-text">
              <h2>It matters when nobody looks at every frame.</h2>
              <p>Three cases. In all three, nobody is scrubbing a timeline to catch a difference by eye, so the guarantee has to be structural.</p>
              <ol className="xp-list">
                <li><span><strong>An agent approves a draft.</strong> It expects the final render to show the same moments, not a re-render that might drift.</span></li>
                <li><span><strong>A thousand personalized ad variants.</strong> One template needs the shared background to be identical across all of them, or the &quot;shared&quot; part is a lie.</span></li>
                <li><span><strong>A render split across parallel machines.</strong> It only produces one correct video if frame 4000 rendered on machine B matches frame 4000 rendered on machine A.</span></li>
              </ol>
            </div>
          </section>

          <section className="isec" id="regression">
            <div className="isec-text">
              <h2>It matters for catching a regression, not just producing a video.</h2>
              <p>
                A render pipeline that changes over time (a new effect, a font update, a library
                bump) can diff two renders of the same input and treat any pixel difference as a
                bug report. That only works if &quot;the same input&quot; is actually guaranteed to
                produce the same bytes absent a real change: without it, every diff is noise, and
                the team stops trusting the check within a month. This is the same reason software
                tests are deterministic before they are useful; video is not exempt from it just
                because it looks like an art form.
              </p>
            </div>
          </section>

          <section className="isec" id="human">
            <div className="isec-text">
              <h2>It matters less when a human is the last step.</h2>
              <p>
                A single creative edit that a person opens, watches, and approves by eye gets
                nothing from byte-identical replay: the human is already the check. Live
                compositing and broadcast have no &quot;render it again&quot; step to be
                identical to. And a generative pixel model producing variation on purpose is
                solving a different problem than reproduction: asking it to be deterministic
                would remove the reason to use it. None of this is a weakness in those tools, it is
                a different job.
              </p>
            </div>
          </section>

          <section className="isec" id="built-in">
            <div className="isec-text">
              <h2>The property has to be built in, not assumed.</h2>
              <p>
                Determinism is not a side effect of using a headless browser; a real clock, an
                unseeded random call, or a mid-render network fetch breaks it immediately, which is
                why an engine that wants the guarantee documents the specific rules it enforces
                rather than asserting the outcome. HyperFrames publishes its own rule set for
                exactly this reason (integer-math frame time, no system timers, no unseeded
                randomness, no mid-render fetches), which is the same shape of commitment Vawe
                makes for its own engine, independently arrived at because the failure modes are
                the same failure modes for anyone rendering frames outside real time.
              </p>
              <span className="cite">hyperframes.heygen.com/concepts/determinism · read 2026-09-19</span>
            </div>
          </section>

          <Next
            title="How Vawe enforces it."
            lead="A virtual clock the page runs under, and a test that renders every fixture twice and compares the frames."
            primary={{ href: "/determinism", label: "Read the mechanism" }}
            related={[
              { href: "/remotion-alternatives", label: "Remotion alternatives, categorized" },
              { href: "/hyperframes-alternatives", label: "Vawe vs HyperFrames, the closer comparison" },
              { href: "/ai-agents", label: "How an agent writes and checks a film" },
            ]}
          />
        </main>
      </div>
      <Footer active="/when-determinism-matters" />
    </div>
  );
}
