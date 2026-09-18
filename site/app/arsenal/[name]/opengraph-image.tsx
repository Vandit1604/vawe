import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard } from "../../components/ogCard";
import blocks from "../../../lib/blocks.json";

export const size = OG_SIZE;
export const contentType = "image/png";

type Block = { name: string; family: string; blurb: string; category?: string };
const ALL = blocks as Block[];
const cat = (b: Block) => b.category ?? "Core";

export function generateStaticParams() {
  return ALL.map((b) => ({ name: b.name }));
}

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const b = ALL.find((x) => x.name === name);
  const fonts = await loadOgFonts();

  if (!b) {
    return new ImageResponse(
      renderOgCard({ tag: "block", title: "Vawe · block", description: "", path: "/arsenal", panel: null }),
      { ...size, fonts },
    );
  }

  // Blocks DO carry a real asset (public/assets/blocks/<name>.png), but it is a tightly cropped
  // inline-preview screenshot, as small as 194x78 — not a landscape frame, so it reads as a broken
  // sliver at card size. The block's own "paste into a scene" snippet is the honest panel instead:
  // real content, not a placeholder, and legible at 500x340.
  const snippet = `{
  "type": "block",
  "block": "${b.name}",
  "x": 960, "y": 540,
  "start": 0.5, "duration": 4
}`;

  return new ImageResponse(
    renderOgCard({
      tag: `${cat(b)} · ${b.family}`,
      title: b.name,
      // The SAME sentence page.tsx puts in the meta description, punctuation included. It read
      // `${b.blurb} A deterministic...` here and `${b.name}: ${b.blurb}. A deterministic...` there,
      // so the card rendered "output answers after it A deterministic, theme-aware Vawe block",
      // two sentences run together with no stop. A card and its page must not describe the page
      // differently, and neither should be missing a full stop.
      description: `${b.blurb}. A deterministic, theme-aware Vawe block you drop into a scene.`,
      path: `/arsenal/${name}`,
      panel: { kind: "code", text: snippet },
    }),
    { ...size, fonts },
  );
}
