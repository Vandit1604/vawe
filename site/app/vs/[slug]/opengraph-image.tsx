import { OG_SIZE, staticOgImage } from "../../components/ogCard";
import { RIVALS, RIVAL_BY_SLUG } from "../data";

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return RIVALS.map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = RIVAL_BY_SLUG[slug];
  return staticOgImage({
    tag: "compare",
    title: `Vawe vs ${r.name}`,
    description: r.metaDescription,
    path: `/vs/${r.slug}`,
  });
}
