import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard } from "../../components/ogCard";
import { MOVES, moveByName } from "../../../lib/moves";

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return MOVES.map((m) => ({ name: m.name }));
}

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const move = moveByName(name);
  const fonts = await loadOgFonts();
  return new ImageResponse(
    renderOgCard({
      tag: "video component",
      title: move?.title ?? "Video components",
      description: move ? `Use when ${move.use}.` : "",
      path: `/video-components/${name}`,
      panel: move?.snippet ? { kind: "code", text: move.snippet } : null,
    }),
    { ...OG_SIZE, fonts },
  );
}
