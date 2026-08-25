import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Catalog, type Block } from "./Catalog";
import blocks from "../../lib/blocks.json";
import "./catalog.css";

// The count is read from the registry, never typed. It was hardcoded here as 156 while the registry
// held 176, and `make site-counts` had to exist to notice — the same hand-kept-number class the rest
// of this repo keeps logging.
const N = (blocks as Block[]).length;

export const metadata: Metadata = {
  title: "Vawe · blocks",
  description: `${N} deterministic, theme-aware blocks — charts, code, terminals, maps, diagrams and interface surfaces — to compose into videos.`,
};

export default function Blocks() {
  return (
    <div className="shell">
      <Header active="blocks" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <Catalog blocks={blocks as Block[]} />
        </main>
        <Footer note="deterministic, theme-aware blocks" />
      </div>
    </div>
  );
}
