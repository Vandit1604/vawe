import { OG_SIZE, prerenderedOg } from "../../components/ogCard";
import { notFound } from "next/navigation";
import { allPosts, postBySlug } from "../../../lib/blog";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!postBySlug(slug)) notFound();
  return prerenderedOg(`/blog/${slug}`);
}
