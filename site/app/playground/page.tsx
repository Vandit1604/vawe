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
      <Header active="playground" />
      <main className="wrap pgpage">
        <header className="pghead">
          <h1>Playground</h1>
          <p>
            The engine&apos;s generators, running here rather than in a render. Pick a preset, roll it,
            keep what you like.
          </p>
        </header>
        <PlaygroundClient />
      </main>
      <Footer />
    </>
  );
}
