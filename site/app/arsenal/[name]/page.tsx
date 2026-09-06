import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import blocks from "../../../lib/blocks.json";
import frames from "../../../lib/block-frames.json";
import { Stage, Copy } from "./Stage";
import "./detail.css";

type Block = { name: string; family: string; blurb: string; category?: string; props: Record<string, unknown> };
type Frame = { x: number; y: number; w: number; h: number };

const ALL = blocks as Block[];
const FRAMES = frames as Record<string, Frame>;
const cat = (b: Block) => b.category ?? "Core";
const asset = (name: string, ext: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.${ext}`;

// Values are whatever the block's real prop table holds — numbers, strings, arrays, nested objects.
// Show them as the JSON an author would actually type, not as "[object Object]".
const fmt = (v: unknown) => (typeof v === "string" ? `"${v}"` : JSON.stringify(v));
const kind = (v: unknown) => (Array.isArray(v) ? `array(${v.length})` : v === null ? "null" : typeof v);

export function generateStaticParams() {
  return ALL.map((b) => ({ name: b.name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const b = ALL.find((x) => x.name === name);
  if (!b) return { title: "Vawe · block" };
  return {
    title: `Vawe · ${b.name}`,
    description: `${b.name}: ${b.blurb}. A deterministic, theme-aware Vawe block you drop into a scene.`,
  };
}

export default async function BlockDetail({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const b = ALL.find((x) => x.name === name);
  if (!b) notFound();

  // Walking is by CATEGORY because that is what the index groups by: 97 families, most holding one
  // block, make a next/prev pair that mostly has nowhere to go.
  const peers = ALL.filter((x) => cat(x) === cat(b)).sort((x, y) => x.name.localeCompare(y.name));
  const i = peers.findIndex((x) => x.name === b.name);
  const prev = peers[i - 1];
  const next = peers[i + 1];

  const entries = Object.entries(b.props);
  const snippet = `{
  "type": "block",
  "block": "${b.name}",
  "x": 960, "y": 540,
  "start": 0.5, "duration": 4
}`;

  return (
    <div className="shell">
      <Header active="arsenal" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <article className="bx">
            <nav className="bx-nav" aria-label="Block navigation">
              {/* The index filters in the URL's absence, so this carries the one thing worth carrying
                  back: which category the visitor was walking. */}
              <Link className="bx-back" href={`/arsenal?axis=${encodeURIComponent("block:" + cat(b))}`}>
                ← arsenal<span aria-hidden="true"> / </span>{cat(b)}
              </Link>
              <span className="bx-walk">
                {prev ? (
                  <Link href={`/arsenal/${prev.name}`} rel="prev"><span aria-hidden="true">←</span> {prev.name}</Link>
                ) : (
                  <span className="bx-off">← first</span>
                )}
                <em>{i + 1}/{peers.length}</em>
                {next ? (
                  <Link href={`/arsenal/${next.name}`} rel="next">{next.name} <span aria-hidden="true">→</span></Link>
                ) : (
                  <span className="bx-off">last →</span>
                )}
              </span>
            </nav>

            <header className="bx-head">
              <h1 className="mono">{b.name}</h1>
              <p className="bx-blurb">{b.blurb}</p>
              <p className="bx-tags mono">
                {cat(b)}<span aria-hidden="true"> · </span>{b.family}
              </p>
            </header>

            <Stage name={b.name} poster={asset(b.name, "png")} src={asset(b.name, "json")} frame={FRAMES[b.name]} />

            <div className="bx-cols">
              <section className="bx-col">
                <div className="bx-h">
                  <h2>Paste into a scene</h2>
                  <Copy text={snippet} />
                </div>
                <pre className="bx-code mono">{snippet}</pre>
                <p className="bx-note">
                  This resolves into real layers automatically at load, no separate step.
                  <b> x and y are the block&apos;s top-left corner</b>, not its centre.
                </p>
              </section>

              <section className="bx-col">
                <div className="bx-h">
                  <h2>Props</h2>
                  <span className="bx-n mono">{entries.length}</span>
                </div>
                {entries.length ? (
                  <dl className="bx-props">
                    {entries.map(([k, v]) => (
                      <div className="bx-prop" key={k}>
                        <dt className="mono">{k}</dt>
                        <dd className="bx-type mono">{kind(v)}</dd>
                        <dd className="bx-val mono">{fmt(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="bx-note">No props: this block takes its look entirely from the theme.</p>
                )}
              </section>
            </div>
          </article>
        </main>
        <Footer note={`${cat(b)} · one of ${ALL.length} blocks`} />
      </div>
    </div>
  );
}
