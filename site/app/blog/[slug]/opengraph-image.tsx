import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard } from "../../components/ogCard";
import { allPosts, postBySlug } from "../../../lib/blog";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

// The post's cover is its share card. PNG, because LinkedIn does not read WebP for og:image.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (post?.cover) {
    const file = path.join(process.cwd(), "public", post.cover.src);
    const png = await sharp(fs.readFileSync(file)).resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover" }).png().toBuffer();
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
  }
  const fonts = await loadOgFonts();
  return new ImageResponse(
    renderOgCard({
      tag: post ? `blog · ${post.sectionLabel}` : "blog",
      title: post?.title ?? "The vawe blog",
      description: post?.description ?? "",
      path: `/blog/${slug}`,
      panel: null,
    }),
    { ...OG_SIZE, fonts },
  );
}
