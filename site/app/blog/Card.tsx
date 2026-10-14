import Link from "next/link";
import { smart, type Post } from "../../lib/blog";
import { Cover } from "./Cover";

// The one post card: every card on /blog and under "Read next" has the same parts and the same size.
export function Card({ post, eager = false }: { post: Post; eager?: boolean }) {
  return (
    <li className="bl-card" data-s={post.section}>
      <Cover post={post} eager={eager} />
      <div className="bl-card-text">
        <p className="meta bl-sec"><span className="sw" />{post.sectionLabel}</p>
        <h3>
          <Link href={`/blog/${post.slug}`} prefetch={false}>{smart(post.title)}</Link>
        </h3>
        <p className="bl-card-desc">{smart(post.description)}</p>
      </div>
    </li>
  );
}
