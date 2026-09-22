import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · launch video",
  description:
    "How Vawe builds a product launch video: real captured UI, not invented mockups, on the six-beat spine the engine's own doctrine defines.",
  path: "/launch-video",
});

/* /launch-video · fourth intent page, and the first of three use-case pages built from
 * engine-doctrine/CRAFT/ROUTING.md's route table rather than a feature or a question. Someone
 * searching "product launch video" or "SaaS launch video" is naming a JOB, not this engine's
 * vocabulary, so the page answers in that wording.
 *
 * IT USED TO PROVE EACH CLAIM WITH A NAMED FILM: argus-launch, threadcite-open, saas-hero-launch,
 * vawe-launch, each with its own clip and a citation into that film's storyboard or lock sheet.
 * None of those films could be re-rendered from source, so they came down site-wide, and the
 * per-film sections went with them rather than narrate a clip that is no longer there. This page
 * now states the doctrine only and points to /showcase for the honest word on what is rendered
 * today. New baseline films earn their sections back here once they exist.
 */

export default function LaunchVideo() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> launch video
            </span>
            <h1>A product launch video, built from the real site.</h1>
            <p>
              A launch film in this engine is not written from a description of the product. It is
              built from CAPTURE: the real UI, the real logo, the real palette, carried into
              motion. The taste already exists on the site; the film&apos;s job is to reflect it,
              never redesign it.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The route: market a real product, from a URL.</h2>
              <p>
                The engine&apos;s own routing table sends any request to &quot;market or showcase a
                real product, company, or site from a URL or site-specific brief&quot; to the
                launch-video route, ahead of an explainer, a sting, or a demo. That is the second
                highest-priority row in the table, below only a recreation with no product to sell.
              </p>
              <span className="cite">engine-doctrine/CRAFT/ROUTING.md, priority row 2</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Six beats, past fifteen seconds.</h2>
              <p>
                Past the engine&apos;s continuous-action threshold, a launch film takes a fixed
                spine: hook, then the captured UI itself, then feature proof, then a payoff stat,
                then the brand lockup, then the call to action. The payoff lands right before the
                brand beat on purpose, because a stat after the logo reads as an afterthought.
              </p>
              <span className="cite">skills/vawe-type-launch/SKILL.md</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text" style={{ gridColumn: "1 / -1", maxWidth: "70ch" }}>
              <h2>No rendered example here right now.</h2>
              <p>
                This page proved the spine above against named films: a real product, a fillable
                template, and the engine&apos;s own launch film. None of the three could be
                re-rendered from its source, so all of them came down rather than sit here stale.{" "}
                <a href="/showcase">See /showcase</a> for what the engine has rendered today.
              </p>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>What the engine will not let a launch film skip.</h2>
              <p>
                Five standing rules run on every save of a launch film: captured UI instead of a
                hand-drawn dashboard, one continuous object that survives every cut, a backdrop that
                changes tone beat to beat, a real beat for the logo instead of a bullet beside a
                headline, and an exit that leaves the direction it entered from. Crawl every page of
                the real site, not just the homepage: the feature worth showing is often one click
                past the hero.
              </p>
              <span className="cite">AGENTS.md, &quot;Stage 4, design&quot;</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">More than one feature to walk through.</h2>
            <p className="lead">
              A single product with one hero feature takes the fixed six-beat spine above. A
              product with three features worth a beat each takes a different shape: chapters,
              not one continuous run.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/editor">
                Try the editor <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/product-tour-video">A chaptered product tour, three features in one film</a>
              <a href="/showcase">Every finished film, open in the editor</a>
              <a href="/docs/brand-reflection">The capture-first workflow, in the docs</a>
              <a href="/arsenal">Every layer, effect and preset, searchable</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/launch-video" />
    </div>
  );
}
