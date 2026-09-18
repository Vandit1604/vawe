import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard, type OgPanel } from "../../../components/ogCard";
import type { Index, Family, Entry } from "../shared";
import index from "../../../../lib/effects.json";
import bodies from "../../../../lib/effects-body.json";

export const size = OG_SIZE;
export const contentType = "image/png";

const ix = index as Index;
const BODY = bodies as Record<string, string | object>;
const snippet = (v: string | object | undefined) =>
  v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2);

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../public");
const stillPath = (stem: string) => path.join(PUBLIC_DIR, "assets/effects", `${stem}.jpg`);

function find(stem: string): { family: Family; entry: Entry } | null {
  for (const f of ix.list) {
    const e = f.entries.find((x) => x.stem === stem);
    if (e) return { family: f, entry: e };
  }
  return null;
}

export function generateStaticParams() {
  return ix.list.flatMap((f) => f.entries.map((e) => ({ stem: e.stem })));
}

export default async function Image({ params }: { params: Promise<{ stem: string }> }) {
  const { stem } = await params;
  const hit = find(stem);
  const fonts = await loadOgFonts();

  if (!hit) {
    return new ImageResponse(
      renderOgCard({ tag: "effect", title: "Vawe · effects", description: "", path: "/arsenal/effects", panel: null }),
      { ...size, fonts },
    );
  }

  const { family, entry } = hit;

  // The real preview frame is the honest card: 224 of the 694 effects have a captured still
  // (public/assets/effects/<stem>.jpg). Where one exists it goes on the card as a real image;
  // otherwise the panel shows the page's own authoring JSON, which is real content too, never a
  // placeholder.
  let panel: OgPanel = null;
  try {
    const bytes = await fs.readFile(stillPath(stem));
    panel = { kind: "image", dataUri: `data:image/jpeg;base64,${bytes.toString("base64")}`, alt: entry.name };
  } catch {
    const json = snippet(BODY[stem]);
    if (json) panel = { kind: "code", text: json };
  }

  return new ImageResponse(
    renderOgCard({
      tag: `${family.tag} · ${family.title}`,
      title: entry.name,
      description: entry.desc || `From the ${family.title} family in the Vawe effects arsenal.`,
      path: `/arsenal/effects/${stem}`,
      panel,
    }),
    { ...size, fonts },
  );
}
