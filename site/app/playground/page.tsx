import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PlaygroundClient } from "./PlaygroundClient";
import { pageMetadata } from "../components/seo";
import "./playground.css";

// One string, read by both the metadata description and the visible paragraph below, so the two
// can never say a different thing about what this page is.
const PLAYGROUND_DESCRIPTION =
  "Turn the dials on the engine's generators in your browser. The same pure functions the renderer calls, with their real option schemas.";

export const metadata = pageMetadata({
  title: "Playground · vawe",
  description: PLAYGROUND_DESCRIPTION,
  path: "/playground",
});

export default function PlaygroundPage() {
  return (
    <div className="shell">
      <Header active="playground" />
      <div className="wrap">
        {/* id="content" is the skip link's target. Without it the link in layout.tsx moves focus
            nowhere, which is what shipped here. */}
        <main id="content" tabIndex={-1} className="pgpage">
          <header className="pghead">
            <h1>Playground</h1>
            {/* Server-rendered, so a crawler that does not run JavaScript reads this instead of the
                client component's "Loading the engine…" placeholder. developers.google.com/search/
                docs/crawling-indexing/javascript/javascript-seo-basics: "server-side or pre-rendering
                is still a great idea because it makes your website faster for users and crawlers, and
                not all bots can run JavaScript." The dials themselves stay client-only: the engine
                that draws them is a runtime import of core/generators/generators.js, not a build-time registry
                this page could read without duplicating it. */}
            <p>{PLAYGROUND_DESCRIPTION}</p>
          </header>
          <PlaygroundClient />
        </main>
      </div>
      <Footer />
    </div>
  );
}
