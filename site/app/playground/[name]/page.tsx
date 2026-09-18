import type { Metadata } from "next";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { PlaygroundClient } from "../PlaygroundClient";
import { pageMetadata } from "../../components/seo";
import "../playground.css";

/**
 * One URL per generator: /playground/bands, /playground/colonnade.
 *
 * The page used to hold the open generator in React state, so a refresh dropped you back to the
 * library and a link could not be sent to anyone. The name lives in the path now and the options stay
 * in `?o=`, which is what the copy-link button was already producing.
 *
 * There is no `generateStaticParams`. The list of generators lives in the ENGINE, which this app loads
 * at runtime from a static file rather than bundling (see PlaygroundClient) — importing it here to
 * enumerate names would fork the engine into a webpack copy that drifts from the one /editor boots.
 * An unknown name is handled where the registry actually is: on the client, which shows the library.
 */
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return pageMetadata({
    title: "Playground · vawe",
    description: "Turn the dials on the engine's generators in your browser.",
    path: `/playground/${name}`,
  });
}

export default async function GeneratorPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return (
    <div className="shell">
      <Header active="playground" />
      <div className="wrap">
        <main id="content" tabIndex={-1} className="pgpage">
          <header className="pghead"><h1>Playground</h1></header>
          <PlaygroundClient initial={name} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
