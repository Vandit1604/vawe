import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard, type OgPanel } from "../../../../components/ogCard";
import type { Index, Family } from "../../shared";
import index from "../../../../../lib/effects.json";

export const size = OG_SIZE;
export const contentType = "image/png";

const ix = index as Index;

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../../public");
const stillPath = (stem: string) => path.join(PUBLIC_DIR, "assets/effects", `${stem}.jpg`);

function find(id: string): Family | null {
  return ix.list.find((f) => f.id === id) ?? null;
}

export function generateStaticParams() {
  return ix.list.map((f) => ({ id: f.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const family = find(id);
  const fonts = await loadOgFonts();

  if (!family) {
    return new ImageResponse(
      renderOgCard({ tag: "effect family", title: "Vawe · effects", description: "", path: "/arsenal/effects", panel: null }),
      { ...size, fonts },
    );
  }

  // The card's real content, the same rule as the leaf effect card: the first member with a captured
  // still stands in for the family, never a generic placeholder.
  let panel: OgPanel = null;
  for (const e of family.entries) {
    try {
      const bytes = await fs.readFile(stillPath(e.stem));
      panel = { kind: "image", dataUri: `data:image/jpeg;base64,${bytes.toString("base64")}`, alt: `${e.name}, from ${family.title}` };
      break;
    } catch { /* try the next entry */ }
  }

  return new ImageResponse(
    renderOgCard({
      tag: `${family.tag} · family`,
      title: family.title,
      description: `${family.count} effect${family.count === 1 ? "" : "s"} in the Vawe arsenal.`,
      path: `/arsenal/effects/family/${id}`,
      panel,
    }),
    { ...size, fonts },
  );
}
