import type { Metadata } from "next";
import { isRendered, mdUrlOf } from "../../lib/md/routes.mjs";

// A route with a markdown renderer (lib/md/routes.mjs) also gets its <link rel="alternate" type="text/markdown">.
// `ai-summary` defaults to the meta description; pass `aiSummary` to give a key page its own.
//
// ONE HELPER, NOT 27 COPIES. Every route on vawe.dev calls this instead of hand-rolling its own
// canonical/OpenGraph/Twitter block. `metadataBase` (app/layout.tsx) is set to https://vawe.dev, so a
// relative `path` here resolves correctly for both the canonical link and the OG url.
//
// No `images` field here on purpose: every route this helper serves has a sibling
// `opengraph-image.tsx` (see app/components/ogCard.tsx) that Next reads and injects the og:image /
// twitter:image tags from automatically. Setting an image here too would just print a second,
// competing tag. The homepage and every route without its own card take the root `app/opengraph-image.tsx`; the homepage sets
// its own openGraph/twitter block directly in app/layout.tsx instead of calling this helper.
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  aiSummary?: string;
}): Metadata {
  const { title, description, path, type = "website", aiSummary = description } = opts;
  return {
    title,
    description,
    alternates: { canonical: path, ...(isRendered(path) ? { types: { "text/markdown": mdUrlOf(path) } } : {}) },
    other: { "ai-summary": aiSummary },
    openGraph: {
      title,
      description,
      type,
      url: path,
      siteName: "vawe",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
