import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { Rich, type Index, type Family, type Entry } from "../EffectsBrowser";
import { EffectStage } from "./EffectStage";
import index from "../../../../lib/effects.json";
import bodies from "../../../../lib/effects-body.json";
import "../effects.css";

/* /showcase/effects/[stem] — one effect, one page, the way a component library gives each
 * component a page. 521 of these, statically generated: every registered effect gets a URL, not
 * just the 227 that can play.
 *
 * The `json` body (the authoring snippet, keyed by `stem`) lives in effects-body.json and is read
 * ONLY here, at build time, by a SERVER component — it lands in this one page's static HTML and
 * never in the client bundle the index page ships. That split (not a runtime fetch) is what the
 * per-effect-page amendment bought: /showcase/effects no longer carries a `json` field at all.
 */

const ix = index as Index;
const BODY = bodies as Record<string, string>;

function find(stem: string): { family: Family; entry: Entry; prev: Entry | null; next: Entry | null } | null {
  for (const f of ix.list) {
    const i = f.entries.findIndex((e) => e.stem === stem);
    if (i !== -1) return { family: f, entry: f.entries[i], prev: f.entries[i - 1] ?? null, next: f.entries[i + 1] ?? null };
  }
  return null;
}

export function generateStaticParams() {
  return ix.list.flatMap((f) => f.entries.map((e) => ({ stem: e.stem })));
}

export async function generateMetadata({ params }: { params: Promise<{ stem: string }> }): Promise<Metadata> {
  const { stem } = await params;
  const hit = find(stem);
  if (!hit) return { title: "Vawe · effects" };
  const { family, entry } = hit;
  return {
    title: `Vawe · ${entry.name}`,
    description: entry.desc || `${entry.name}, from the ${family.title} family in the Vawe effects arsenal, with the JSON that uses it.`,
  };
}

export default async function EffectDetail({ params }: { params: Promise<{ stem: string }> }) {
  const { stem } = await params;
  const hit = find(stem);
  if (!hit) notFound();
  const { family, entry, prev, next } = hit;
  const json = BODY[stem] ?? "";

  return (
    <div className="shell">
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="fxpage">
            <Link className="backlink" href={`/showcase/effects#${family.id}`}>← {family.title}</Link>

            <div className="phead" style={{ padding: 0, maxWidth: "none" }}>
              <span className="kicker">
                <span className="dot" /> {family.tag} · {family.title}
                {!family.noPreview && !entry.noPreview && <> · <span className="tag fxtag-live">plays live</span></>}
              </span>
              <h1 className="mono">{entry.name}</h1>
              {entry.desc && <p><Rich text={entry.desc} /></p>}
            </div>

            <EffectStage name={entry.name} scene={entry.scene} json={json} noPreview={entry.noPreview ?? family.noPreview} />

            <nav className="fxpage-nav" aria-label="Other effects in this family">
              {prev ? (
                <Link href={`/showcase/effects/${prev.stem}`} className="fxpage-prev">← <span className="mono">{prev.name}</span></Link>
              ) : <span />}
              {next ? (
                <Link href={`/showcase/effects/${next.stem}`} className="fxpage-next"><span className="mono">{next.name}</span> →</Link>
              ) : <span />}
            </nav>
          </section>
        </main>

        <Footer note={`${family.title} · ${entry.name}`} />
      </div>
    </div>
  );
}
