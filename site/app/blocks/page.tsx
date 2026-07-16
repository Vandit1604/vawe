import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import blocks from "../../lib/blocks.json";

export const metadata: Metadata = {
  title: "Vawe — blocks",
  description:
    "The Vawe block registry: 96 vetted, deterministic, theme-aware components — charts, cards, code, terminals, KPIs, browsers — to compose into videos.",
};

type Block = { name: string; family: string; blurb: string; props: Record<string, unknown> };

const still = (name: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.png`;
const propKeys = (props: Record<string, unknown>) => Object.keys(props).slice(0, 6).join(" · ") || "—";

const families = Array.from(new Set((blocks as Block[]).map((b) => b.family))).length;

export default function Blocks() {
  return (
    <div className="shell">
      <Header active="blocks" />
      <div className="wrap">
        <main id="main">
        <section className="phead">
          <span className="kicker">
            <span className="dot" /> block registry
          </span>
          <h1>{blocks.length} blocks, ready to compose.</h1>
          <p>
            A vetted, deterministic component library — charts, cards, code, terminals, KPIs, browser frames — that
            you drop into a scene. Every block is theme-aware: it reskins to any brand.
          </p>
          <div className="bnote">
            <b>{families} families</b>&nbsp;·&nbsp;drop into a scene with{" "}
            <span className="mono">{'{ "block": "…" }'}</span>&nbsp;·&nbsp;reskins to your theme
          </div>
        </section>

        <section style={{ paddingBottom: 80 }}>
          <div className="bgrid">
            {(blocks as Block[]).map((b) => (
              <div className="bcard" key={b.name}>
                <div className="thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={still(b.name)} alt={b.name} loading="lazy" />
                </div>
                <div className="meta">
                  <div className="bn">{b.name}</div>
                  <div className="bf">{b.family}</div>
                  <div className="bp">{b.blurb || propKeys(b.props)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        </main>

        <Footer note="theme-aware, deterministic blocks" />
      </div>
    </div>
  );
}
