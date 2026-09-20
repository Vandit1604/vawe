import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { pageMetadata } from "../../../components/seo";
import blocks from "../../../../lib/blocks.json";
import { breadcrumbSchema, jsonLdScript } from "../../../../lib/schema";
import { slug } from "../shared";
import "../../arsenal.css";
// .fxpage / .backlink / .fxtags / .fxtagchip / .fxpage-nav are the family-hub page furniture the
// effects route already ships; reused as-is rather than redrawn for a second hub shape.
import "../../effects/effects.css";

/* /arsenal/category/[id] — the index layer the 185 blocks never had.
 *
 * blocks.json gives every block a `family` (97 groups, 57 of them holding exactly one block: a hub
 * there would be a leaf page with extra words, the scaled-content shape Google's spam policy warns
 * about) and a `category` (13 real groups, sizes 41 down to 1). This hub is built on `category`
 * because it is the one grouping wide enough to browse, mirroring the choice already made for
 * effects at /arsenal/effects/family/[id]: same reasoning, a different field on the same registry.
 *
 * GENERATED, NEVER HAND-KEPT. CATEGORIES below is computed from blocks.json's own `category` field,
 * so a renamed or added category lands here with no edit, the same way generateStaticParams for
 * /arsenal/[name] never types a block name.
 *
 * WHAT THE PAGE SAYS ABOUT A CATEGORY: blocks.json now carries a `categoryIntro` per block (same
 * value for every block in one category), sourced from blocks/index.mjs's CATEGORY_INTRO map, one
 * sentence saying WHEN you'd reach for the category rather than what it contains. The page still
 * states the computed facts too: how many blocks, how many families, and the blocks themselves, each
 * showing its own real blurb.
 */

type Block = { name: string; family: string; blurb: string; category?: string; categoryIntro?: string; props: Record<string, unknown> };

const ALL = blocks as Block[];
const cat = (b: Block) => b.category ?? "Core";

type Category = { name: string; slug: string; blocks: Block[]; families: number; intro: string };

const CATEGORIES: Category[] = (() => {
  const map = new Map<string, Block[]>();
  for (const b of ALL) {
    const c = cat(b);
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(b);
  }
  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      slug: slug(name),
      blocks: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      families: new Set(list.map((b) => b.family)).size,
      // Every block in a category carries the same categoryIntro (blocks/index.mjs's CATEGORY_INTRO
      // keyed by the category, not the block), so the first one's is the category's.
      intro: list[0]?.categoryIntro ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

const asset = (name: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.png`;

function find(id: string): { category: Category; index: number } | null {
  const i = CATEGORIES.findIndex((c) => c.slug === id);
  return i === -1 ? null : { category: CATEGORIES[i], index: i };
}

// A CATEGORY OF ONE GETS NO PAGE. `Camera` holds a single block, and its hub rendered 47 words of
// real content: the name, "1 block across 1 family", and that block's own name and blurb, which is a
// leaf page with extra words. /arsenal lists every category either way and links the single-block
// ones straight to the block, so the taxonomy a reader browses stays complete while no page exists
// that adds nothing to the one below it.
export function generateStaticParams() {
  return CATEGORIES.filter((c) => c.blocks.length > 1).map((c) => ({ id: c.slug }));
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const hit = find(id);
  if (!hit) return { title: "Vawe · blocks", alternates: { canonical: `/arsenal/category/${id}` } };
  const { category } = hit;
  return pageMetadata({
    title: `Vawe · ${category.name} blocks`,
    description: truncateAtWord(
      `${category.blocks.length} ${category.name.toLowerCase()} block${category.blocks.length === 1 ? "" : "s"} in the Vawe arsenal, across ${category.families} famil${category.families === 1 ? "y" : "ies"}: ${category.blocks.map((b) => b.name).join(", ")}.`,
      300,
    ),
    path: `/arsenal/category/${id}`,
  });
}

export default async function CategoryHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hit = find(id);
  if (!hit) notFound();
  const { category, index } = hit;
  const prev = CATEGORIES[index - 1] ?? null;
  const next = CATEGORIES[index + 1] ?? null;
  const families = [...new Set(category.blocks.map((b) => b.family))].sort();

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Arsenal", url: "/arsenal" },
    { name: category.name, url: `/arsenal/category/${category.slug}` },
  ]);

  return (
    <div className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumb)} />
      <Header active="arsenal" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="fxpage" style={{ maxWidth: 900 }}>
            <Link className="backlink" href={`/arsenal?axis=${encodeURIComponent("block:" + category.name)}`}>← arsenal<span aria-hidden="true"> / </span>{category.name}</Link>

            <div className="phead" style={{ padding: 0, maxWidth: "none" }}>
              <span className="kicker"><span className="dot" /> {category.name} · category</span>
              <h1 className="mono">{category.name}</h1>
              {category.intro ? <p>{category.intro}</p> : null}
              <p>
                {category.blocks.length} block{category.blocks.length === 1 ? "" : "s"} in the Vawe
                arsenal, across {category.families} famil{category.families === 1 ? "y" : "ies"}.
              </p>
            </div>

            <div className="fxtags" aria-label="Families">
              {families.map((f) => (
                <span className="fxtagchip mono" key={f}>{f}</span>
              ))}
            </div>

            <ul className="ar-grid">
              {category.blocks.map((b) => (
                <li key={b.name}>
                  <Link className="ar-card" href={`/arsenal/${b.name}`}>
                    <span className="ar-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset(b.name)} alt={`The ${b.name} block, rendered still`} loading="lazy" decoding="async" data-fit="contain" />
                    </span>
                    <span className="ar-meta">
                      <code>{b.name}</code>
                      <span className="ar-blurb">{b.blurb}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <nav className="fxpage-nav" aria-label="Other categories">
              {prev ? (
                <Link href={`/arsenal/category/${prev.slug}`} className="fxpage-prev">← <span className="mono">{prev.name}</span></Link>
              ) : <span />}
              {next ? (
                <Link href={`/arsenal/category/${next.slug}`} className="fxpage-next"><span className="mono">{next.name}</span> →</Link>
              ) : <span />}
            </nav>
          </section>
        </main>

        <Footer note={`${category.name} · ${category.blocks.length} blocks`} />
      </div>
    </div>
  );
}
