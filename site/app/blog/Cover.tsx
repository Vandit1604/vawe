import type { Post } from "../../lib/blog";

// A post's cover image. It always sits next to the post's title, so its alt is empty.
export function Cover({ post, eager = false }: { post: Post; eager?: boolean }) {
  const c = post.cover;
  if (!c) return null;
  return (
    <div className="cv" data-s={post.section}>
      <img src={c.src} alt="" width={c.width} height={c.height} loading={eager ? "eager" : "lazy"} decoding="async" {...(eager ? { fetchPriority: "high" as const } : {})} />
    </div>
  );
}
