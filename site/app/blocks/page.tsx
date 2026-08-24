import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { BlocksBrowser, type Block } from "./BlocksBrowser";
import blocks from "../../lib/blocks.json";
import "./blocks.css";

export const metadata: Metadata = {
  title: "Vawe · blocks",
  description:
    "The Vawe block registry: 156 vetted, deterministic, theme-aware components (charts, cards, code, terminals, KPIs, browsers) to compose into videos.",
};

const families = Array.from(new Set((blocks as Block[]).map((b) => b.family))).length;

export default function Blocks() {
  return (
    <div className="shell">
      <Header active="blocks" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
        <section className="phead">
          <span className="kicker">
            <span className="dot" /> block registry
          </span>
          <h1>{blocks.length} blocks, ready to compose.</h1>
          <p>
            A vetted, deterministic component library: charts, cards, code, terminals, KPIs, browser
            frames. Drop one into a scene. Every block is theme-aware, so it reskins to any brand.
          </p>
          <div className="bnote">
            <b>{families} families</b>&nbsp;·&nbsp;drop into a scene with{" "}
            <span className="mono">{'{ "block": "…" }'}</span>&nbsp;·&nbsp;reskins to your theme
          </div>
        </section>

        <section style={{ paddingBottom: 80 }}>
          <BlocksBrowser blocks={blocks as Block[]} />
        </section>
        </main>

        <Footer note="theme-aware, deterministic blocks" />
      </div>
    </div>
  );
}
