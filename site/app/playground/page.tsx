import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PlaygroundClient } from "./PlaygroundClient";
import "./playground.css";

export const metadata: Metadata = {
  title: "Playground · vawe",
  description:
    "Turn the dials on the engine's generators in your browser. The same pure functions the renderer calls, with their real option schemas.",
};

export default function PlaygroundPage() {
  return (
    <div className="shell">
      <Header active="playground" />
      <div className="wrap">
        {/* id="content" is the skip link's target. Without it the link in layout.tsx moves focus
            nowhere, which is what shipped here. */}
        <main id="content" tabIndex={-1} className="pgpage">
          <header className="pghead"><h1>Playground</h1></header>
          <PlaygroundClient />
        </main>
      </div>
      <Footer />
    </div>
  );
}
