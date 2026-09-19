import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard } from "../../../components/ogCard";
import blocks from "../../../../lib/blocks.json";
import { slug } from "../shared";

export const size = OG_SIZE;
export const contentType = "image/png";

type Block = { name: string; category?: string };
const ALL = blocks as Block[];
const cat = (b: Block) => b.category ?? "Core";

// Same 13 categories page.tsx derives, recomputed here rather than imported: a page.tsx file can
// only export the fields Next's Page contract allows, so its CATEGORIES constant cannot cross this
// boundary. slug() is the one piece of that logic worth sharing (../shared.ts), the rest is three
// lines and cheaper to repeat than to route around the restriction.
function categories() {
  const counts = new Map<string, number>();
  for (const b of ALL) counts.set(cat(b), (counts.get(cat(b)) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, slug: slug(name), count }));
}

export function generateStaticParams() {
  return categories().map((c) => ({ id: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = categories().find((c) => c.slug === id) ?? null;
  const fonts = await loadOgFonts();

  // No image panel: every block poster is a tightly-cropped component screenshot as small as
  // 194x78 (site/app/arsenal/[name]/page.tsx documents the same finding), which reads as a broken
  // sliver blown up to a 1200x630 card. The text-only card is the honest choice, same call already
  // made for every block leaf's own share card.
  return new ImageResponse(
    renderOgCard({
      tag: category ? `${category.name} · category` : "category",
      title: category ? category.name : "Vawe · blocks",
      description: category ? `${category.count} block${category.count === 1 ? "" : "s"} in the Vawe arsenal.` : "",
      path: category ? `/arsenal/category/${id}` : "/arsenal",
      panel: null,
    }),
    { ...size, fonts },
  );
}
