import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../../../components/Header";
import { Footer } from "../../../../components/Footer";
import { pageMetadata } from "../../../../components/seo";
import { Rich, type Index, type Family, type Entry } from "../../shared";
import index from "../../../../../lib/effects.json";
import { breadcrumbSchema, jsonLdScript } from "../../../../../lib/schema";
import "../../effects.css";

/* /arsenal/effects/family/[id] — one page per family, the index layer the 694 leaf pages never had.
 *
 * WHY THIS SHAPE. /arsenal/effects/[stem] already owns every single-segment child of
 * /arsenal/effects/, so a family route cannot live at /arsenal/effects/<id> without colliding with a
 * family id that also happens to be an effect stem. Next resolves a static sibling segment
 * ("family") before it ever tries the dynamic one ([stem]) at the same level, so nesting the family
 * id one level deeper — /arsenal/effects/family/<id> — is a real fork in the route tree, not a naming
 * convention hoping for no collision.
 *
 * WHY A PAGE PER FAMILY IS NOT A REDRAWN /showcase/effects. That old family-rail index (deleted in
 * ce5e3023, see the CSS file banner) put all 58 families on one client-rendered page behind a search
 * box: findable by scrolling, not by search engine, and not linkable to one family on its own. This
 * gives each family its own URL and static HTML, the same move [stem]/page.tsx already made for each
 * effect. The .fxfam/.fxintro/.fxchips/.fxgrid rules that page's CSS still ships (effects.css) were
 * dead code with nothing rendering them since that deletion; this is what un-deletes them.
 *
 * SITEMAP: not wired. site/app/sitemap.ts is owned by another change (see AGENTS.md task note) and
 * this task's hard rules forbid touching it. It derives dynamic detail routes by reading effects.json
 * and blocks.json directly, so the fix is one loop there, structurally identical to the existing
 * `for (const family of effects.list)` block, keyed on `family.id` instead of each entry's `stem`:
 *   entries.push({ url: `${BASE}/arsenal/effects/family/${family.id}`, changeFrequency: "monthly", priority: 0.5 })
 */

const ix = index as Index;

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../../public");
const hasStill = (stem: string) => fs.existsSync(path.join(PUBLIC_DIR, "assets/effects", `${stem}.jpg`));

// Strips the registry's `code` / **bold** markdown down to plain text for a <meta description>,
// which cannot render the Rich() markup the page itself uses.
const plain = (text: string) => text.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");

// A hard `.slice(0, N)` cut the description mid-word on 31 of the 58 families ("...the nu",
// "...camera stays "), which fails Google's own snippet guidance: "A meta description tag
// generally informs and interests users with a short, relevant summary"
// (developers.google.com/search/docs/appearance/snippet). Google truncates on its own to fit the
// SERP, so this only needs to stop at a whole word rather than mid-token.
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function find(id: string): { family: Family; index: number } | null {
  const i = ix.list.findIndex((f) => f.id === id);
  return i === -1 ? null : { family: ix.list[i], index: i };
}

// Effective "does this entry play live" reason, matching [stem]/page.tsx's own rule: an entry's own
// noPreview overrides the family's, and either one set means it does not.
const liveReason = (family: Family, e: Entry) => e.noPreview ?? family.noPreview;
const isLive = (family: Family, e: Entry) => !liveReason(family, e);

export function generateStaticParams() {
  return ix.list.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const hit = find(id);
  if (!hit) return { title: "Vawe · effects", alternates: { canonical: `/arsenal/effects/family/${id}` } };
  const { family } = hit;
  const label = /effects?\b/i.test(family.title) ? family.title : `${family.title} effects`;
  return pageMetadata({
    title: `Vawe · ${label}`,
    description: truncateAtWord(`${family.count} ${family.title.toLowerCase()} effect${family.count === 1 ? "" : "s"} (${family.tag}) in the Vawe arsenal. ${plain(family.intro)}`, 300),
    path: `/arsenal/effects/family/${id}`,
  });
}

export default async function FamilyHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hit = find(id);
  if (!hit) notFound();
  const { family, index: familyIndex } = hit;
  const prev = ix.list[familyIndex - 1] ?? null;
  const next = ix.list[familyIndex + 1] ?? null;
  const liveCount = family.entries.filter((e) => isLive(family, e)).length;

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Arsenal", url: "/arsenal" },
    { name: family.title, url: `/arsenal/effects/family/${family.id}` },
  ]);

  return (
    <div className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumb)} />
      <Header active="arsenal" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="fxpage" style={{ maxWidth: 900 }}>
            <Link className="backlink" href={`/arsenal?axis=${encodeURIComponent("effect:" + family.tag)}`}>← arsenal<span aria-hidden="true"> / </span>{family.tag}</Link>

            <div className="phead" style={{ padding: 0, maxWidth: "none" }}>
              <span className="kicker">
                <span className="dot" /> {family.tag} · family
                {liveCount > 0 && <> · <span className="tag fxtag-live">{liveCount} play live</span></>}
              </span>
              <h1 className="mono">{family.title}</h1>
              <p><Rich text={family.intro} /></p>
            </div>

            <div className="fxtags" aria-label="Tags">
              <span className="fxtagchip">{family.tag}</span>
              <span className="fxtagchip">{family.count} effect{family.count === 1 ? "" : "s"}</span>
              {family.noPreview && <span className="fxtagchip" title={family.noPreview}>static only</span>}
            </div>

            {family.undescribed > 0 && (
              <p className="fxgap">
                {family.undescribed === family.count
                  ? "None of these carry a per-name description in the registry yet."
                  : `${family.undescribed} of these carry no per-name description in the registry yet.`}{" "}
                The name and the form below are what there is.
              </p>
            )}

            {family.mode === "chips" ? (
              <>
                <p className="fxskip">Near-identical across all {family.count}: {family.note}. Pick one by name.</p>
                <div className="fxchips">
                  {family.entries.map((e) => (
                    <Link key={e.stem} href={`/arsenal/effects/${e.stem}`} className="fxchip mono">
                      {e.name}
                      {isLive(family, e) && <span className="fxdot" aria-hidden="true" title="Plays live" />}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="fxgrid">
                {family.entries.map((e) => (
                  <Link key={e.stem} href={`/arsenal/effects/${e.stem}`} className="fxcard">
                    <span className="fxcard-media">
                      {hasStill(e.stem) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/assets/effects/${e.stem}.jpg`} alt={`${e.name}, a still from its preview`} width={320} height={180} loading="lazy" className="is-loaded" />
                      ) : (
                        <span className="fxcard-noimg"><span className="mono">{family.tag}</span></span>
                      )}
                      {isLive(family, e) && <span className="fxdot" aria-hidden="true" title="Plays live" />}
                    </span>
                    <span className="fxcard-body">
                      <span className="fxcard-name mono">{e.name}</span>
                      {e.desc && <span className="fxcard-desc"><Rich text={e.desc} /></span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <nav className="fxpage-nav" aria-label="Other families">
              {prev ? (
                <Link href={`/arsenal/effects/family/${prev.id}`} className="fxpage-prev">← <span className="mono">{prev.title}</span></Link>
              ) : <span />}
              {next ? (
                <Link href={`/arsenal/effects/family/${next.id}`} className="fxpage-next"><span className="mono">{next.title}</span> →</Link>
              ) : <span />}
            </nav>
          </section>
        </main>

        <Footer note={`${family.title} · ${family.count} effects`} />
      </div>
    </div>
  );
}
