import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Clip } from "../components/Clip";
import { SourceViewer } from "../components/SourceViewer";
import { pageMetadata } from "../components/seo";
import films from "../../lib/films.json";
import LINES from "../../lib/scene-lines.json";
import "../components/intent.css";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;
const durOf = (slug: string) => (films as Record<string, { label: string }>)[slug]?.label ?? "";

export const metadata = pageMetadata({
  title: "Vawe · launch video",
  description:
    "How Vawe builds a product launch video: real captured UI, not invented mockups, on the six-beat spine the engine's own doctrine defines. Three rendered films, each one an open JSON file.",
  path: "/launch-video",
});

/* /launch-video · fourth intent page, and the first of three use-case pages built from
 * engine-doctrine/CRAFT/ROUTING.md's route table rather than a feature or a question. Someone
 * searching "product launch video" or "SaaS launch video" is naming a JOB, not this engine's
 * vocabulary, so the page answers in that wording and proves it with the same three films
 * /showcase already ships: argus-launch and threadcite-open (real products, not templates per
 * that page's own FILMS array) and saas-hero-launch (a template, marked as one there too). Every
 * claim below cites the file that makes it true; nothing here is a number this page invented.
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
            <div className="isec-art">
              <div className="fmedia">
                <Clip src="/assets/films/argus-launch.mp4" poster="/assets/films/argus-launch.jpg" />
              </div>
              <span className="cite">
                argus-launch · {durOf("argus-launch")} · a real product, not a template
              </span>
              <SourceViewer name="argus-launch" lines={lineCount("argus-launch")} />
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
            <div className="isec-art">
              <div className="fmedia">
                <Clip
                  src="/assets/films/threadcite-open.mp4"
                  poster="/assets/films/threadcite-open.jpg"
                />
              </div>
              <span className="cite">
                threadcite-open · {durOf("threadcite-open")} · a real product, not a template
              </span>
              <SourceViewer name="threadcite-open" lines={lineCount("threadcite-open")} />
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>A film built to be refilled.</h2>
              <p>
                <code>saas-hero-launch</code> ships as one of the site&apos;s two launch templates:
                the same cut, the same camera, the same beat timing, with the copy, the theme and
                the logo left open to swap. Its own storyboard names the frame it follows: hook,
                proof, demo, reverse, number, capability, CTA, built on the FAB structure (feature,
                advantage, benefit) because a launch film for a product with no real pain to agitate
                has a claim, a demonstration and a number instead.
              </p>
              <span className="cite">films/scene/saas-hero-launch.storyboard.md</span>
            </div>
            <div className="isec-art">
              <div className="fmedia">
                <Clip
                  src="/assets/films/saas-hero-launch.mp4"
                  poster="/assets/films/saas-hero-launch.jpg"
                />
              </div>
              <span className="cite">
                saas-hero-launch · {durOf("saas-hero-launch")} · template
              </span>
              <SourceViewer name="saas-hero-launch" lines={lineCount("saas-hero-launch")} />
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The continuous object and the hue-turning field.</h2>
              <p>
                <code>vawe-launch</code>, the engine&apos;s own launch film for itself, is the
                clearest real example of two rules this type leans on hardest: one object (a single
                surface) that persists and changes identity across every cut, and a backdrop that
                turns tone at each of the film&apos;s four cuts rather than holding one still colour.
                Its frozen lock sheet spells out the frame-by-frame result: cobalt, white, cobalt,
                white, cobalt, four cuts on the beat boundaries at 2.5s, 7.5s, 11.5s and 16.0s, one
                camera push and nothing else, &quot;the film is cut, not flown.&quot;
              </p>
              <span className="cite">films/scene/vawe-launch.lock.md</span>
            </div>
            <div className="isec-art">
              <div className="fmedia">
                <Clip src="/assets/films/vawe-launch.mp4" poster="/assets/films/vawe-launch.jpg" />
              </div>
              <span className="cite">vawe-launch · {durOf("vawe-launch")}</span>
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
      <Footer />
    </div>
  );
}
