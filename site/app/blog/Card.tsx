import Link from "next/link";
import { smart, type Post } from "../../lib/blog";
import { Cover } from "./Cover";

// The one post card: the grid card, the list row and the featured card are this markup; blog.css sets the layout.
// The reading time shows in the list view only.
export function Card({ post, eager = false, feat }: { post: Post; eager?: boolean; feat?: "lead" | "mid" }) {
  return (
    <li className="bl-card" data-s={post.section} data-feat={feat}>
      <Cover post={post} eager={eager} />
      <div className="bl-card-text">
        <p className="meta bl-sec">
          <span className="sw" />
          {post.sectionLabel}
          <span className="bl-min">{post.minutes}{" "}min read</span>
        </p>
        <h2>
          <Link href={`/blog/${post.slug}`} prefetch={false}>{smart(post.title)}</Link>
        </h2>
        <p className="bl-card-desc">{smart(post.description)}</p>
      </div>
    </li>
  );
}
