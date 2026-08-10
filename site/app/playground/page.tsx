import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PlaygroundClient } from "./PlaygroundClient";

export const metadata: Metadata = {
  title: "Playground · vawe",
  description:
    "Turn the dials on the engine's generators in your browser. The same pure functions the renderer calls, with their real option schemas.",
};

export default function PlaygroundPage() {
  return (
    <>
      {/* The generators are dark light-fields, and a white page around one is a frame fighting its
          picture. The dark is scoped to this route by redefining the TOKENS on a wrapper, so the header,
          the panel and every input follow without a single component being overridden. */}
      <div className="pgdark">
      {/* `solid`, not `pill`. The pill floats ABSOLUTELY over a hero band, and this page has no band, so
          it landed on top of the first heading. A header in flow cannot collide with the content under it. */}
      <Header active="playground" />
      <main className="wrap pgpage">
        <header className="pghead">
          <h1>Playground</h1>
          <p>
            The engine&apos;s generators, running here rather than in a render. Every card is the real
            thing, drawn still. Open one to turn its dials.
          </p>
        </header>
        <PlaygroundClient />
      </main>
      <Footer />
      </div>
    </>
  );
}
