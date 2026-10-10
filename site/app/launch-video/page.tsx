import { Header, REPO_URL } from "../components/Header";
import { Footer } from "../components/Footer";
import { MoveClips } from "../components/MoveClips";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · launch video",
  description:
    "How Vawe builds a product launch video: real captured UI, not invented mockups, one message per beat, from the site's own palette and type.",
  path: "/launch-video",
});

/* /launch-video · a use-case page built from guides/ROUTING.md's film-type table.
 * Someone searching "product launch video" names a JOB, not this engine's vocabulary, so the page
 * answers in that wording, and shows the moves a launch film is built from.
 */

export default function LaunchVideo() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
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
                The engine&apos;s own routing table sends a request to &quot;market or show a real
                product, company or site from a URL&quot; to the brand-launch template, ahead of an
                explainer, a UI morph or a music video. Only a reference rebuild, where a film must
                match an existing video, ranks above it.
              </p>
              <span className="cite">guides/ROUTING.md, row 2</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>One message per beat, 15 to 40 seconds.</h2>
              <p>
                The beat list comes first, each beat with a timestamp, one message and the real
                capture that proves it. The hook is the promise, under 12 words on the first frame.
                Then one move per beat: the hook word becomes the product, a cursor does one real
                thing, the key output lands big, then a second surface, a stat you can source, and
                the wordmark. Under 15 seconds, a launch film is one continuous action instead.
              </p>
              <span className="cite">prompts/brand-launch-from-url.md</span>
            </div>
          </section>

          <section className="ifilms">
            <h2>The moves a launch film is built from.</h2>
            <p>A click doing its job, a zoom to one part of the UI, a number proved, the product handed to the brand. Open a move for its snippet and notes.</p>
            <MoveClips names={["cursor-click", "ui-focus-zoom", "count-up", "ui-strip-away"]} />
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>What a launch film may not invent.</h2>
              <p>
                Every screen in the film is a capture of the real site or app, cropped, never a
                placeholder card. The palette, fonts and favicon come from a kit read off the site
                itself, and nothing else is used. A feature you did not see on the site is a feature
                the film must not show, so crawl past the homepage: the feature worth showing is
                often one click past the hero.
              </p>
              <span className="cite">prompts/brand-launch-from-url.md · scripts/brand/kit.mjs</span>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">Start from the launch template.</h2>
            <p className="lead">
              <code>bin/vawe new</code> starts from the brand-launch template unless you name
              another: a starter page and a brief whose questions each carry a default.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href={REPO_URL}>
                Start a launch film <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/moves">Every move, with its clip</a>
              <a href="/ai-agents">Let an agent write the film</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/launch-video" />
    </div>
  );
}
