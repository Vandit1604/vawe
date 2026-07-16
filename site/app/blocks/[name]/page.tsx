import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import blocks from "../../../lib/blocks.json";

type Block = { name: string; family: string; blurb: string; props: Record<string, unknown> };

const ALL = blocks as Block[];
const byName = (name: string) => ALL.find((b) => b.name === name);
const still = (name: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.png`;

// Values are whatever the block's real prop table holds — numbers, strings, arrays, nested objects.
// Show them as the JSON an author would actually type, not as "[object Object]".
const fmt = (v: unknown) => (typeof v === "string" ? `"${v}"` : JSON.stringify(v));
const kind = (v: unknown) => (Array.isArray(v) ? `array(${v.length})` : v === null ? "null" : typeof v);

export function generateStaticParams() {
  return ALL.map((b) => ({ name: b.name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const b = byName(name);
  if (!b) return { title: "Vawe · block" };
  return {
    title: `Vawe · ${b.name}`,
    description: `${b.name}: ${b.blurb}. A deterministic, theme-aware Vawe block you drop into a scene.`,
  };
}

export default async function BlockDetail({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const b = byName(name);
  if (!b) notFound();

  const siblings = ALL.filter((x) => x.family === b.family && x.name !== b.name);
  const entries = Object.entries(b.props);
  const snippet = `{
  "type": "block",
  "block": "${b.name}",
  "x": 960, "y": 540,
  "start": 0.5, "duration": 4
}`;

  return (
    <div className="shell">
      <Header active="blocks" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="bdetail">
            <Link className="backlink" href="/blocks">
              ← all blocks
            </Link>

            <div className="bd-head">
              <div>
                <div className="kicker">
                  <span className="dot" /> {b.family}
                </div>
                <h1>{b.name}</h1>
                <p className="bd-blurb">{b.blurb}</p>
              </div>
              {/* The still is the point of this page: it is the block, rendered by the engine. */}
              <figure className="bd-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={still(b.name)} alt={`${b.name} block, rendered`} />
                <figcaption className="mono">rendered · theme-aware · deterministic</figcaption>
              </figure>
            </div>

            <div className="bd-grid">
              <div className="bd-col">
                <h2 className="bd-h2">Drop it in a scene</h2>
                <p className="bd-note">
                  Blocks are sugar: <span className="mono">make expand</span> resolves this into real layers at
                  build time. Coordinates are the block&apos;s centre.
                </p>
                <pre className="bd-code mono">{snippet}</pre>
              </div>

              <div className="bd-col">
                <h2 className="bd-h2">
                  Props <span className="bd-count">{entries.length}</span>
                </h2>
                <p className="bd-note">Defaults below are the values this block ships with. Override any of them.</p>
                {entries.length ? (
                  <div className="bd-props">
                    {entries.map(([k, v]) => (
                      <div className="bd-prop" key={k}>
                        <span className="bd-key mono">{k}</span>
                        <span className="bd-type mono">{kind(v)}</span>
                        <span className="bd-val mono">{fmt(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="bd-note">No props: this block takes its look entirely from the theme.</p>
                )}
              </div>
            </div>

            {siblings.length > 0 && (
              <div className="bd-sib">
                <h2 className="bd-h2">
                  More in <span className="mono">{b.family}</span>
                </h2>
                <div className="bd-siblist">
                  {siblings.map((s) => (
                    <Link className="bd-sibcard" href={`/blocks/${s.name}`} key={s.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={still(s.name)} alt={s.name} loading="lazy" />
                      <span className="mono">{s.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>

        <Footer note={`${b.family} · one of ${ALL.length} blocks`} />
      </div>
    </div>
  );
}
