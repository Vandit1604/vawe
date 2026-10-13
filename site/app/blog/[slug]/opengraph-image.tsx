import { ImageResponse } from "next/og";
import { OG_SIZE, loadOgFonts, renderOgCard } from "../../components/ogCard";
import { allPosts, postBySlug } from "../../../lib/blog";

export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
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
