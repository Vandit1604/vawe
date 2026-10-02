import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard } from "../../components/ogCard";
import { EASES, bezierText, easeBySlug, pageDescription } from "../../../lib/easing";

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return EASES.map((e) => ({ slug: e.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = easeBySlug(slug);
  const fonts = await loadOgFonts();
  const usable = e && (e.kind === "vawe" || e.bezier.express !== "no");
  return new ImageResponse(
    renderOgCard({
      tag: "easing",
      title: e?.name ?? "Easing",
      description: e ? pageDescription(e) : "",
      path: `/easing/${slug}`,
      panel: e ? { kind: "code", text: usable ? bezierText(e) : e.linear.slice(0, 160) } : null,
    }),
    { ...OG_SIZE, fonts },
  );
}
