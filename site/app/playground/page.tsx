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
            These are the engine&apos;s generators, running here rather than in a render. Every control
            is built from the generator&apos;s own option schema, so what you can turn is exactly what it
            accepts, and an option it does not understand says so instead of quietly doing nothing.
          </p>
          <p className="pgsub">
            Copy the options into a scene, or copy the HTML straight out. If a dial should exist and
            does not, that is worth telling us.
          </p>
        </header>
        <PlaygroundClient />
      </main>
      <Footer />
    </>
  );
}
