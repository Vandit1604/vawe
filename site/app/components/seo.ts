import type { Metadata } from "next";

// ONE HELPER, NOT 27 COPIES. Every route on vawe.dev calls this instead of hand-rolling its own
// canonical/OpenGraph/Twitter block. `metadataBase` (app/layout.tsx) is set to https://vawe.dev, so a
// relative `path` here resolves correctly for both the canonical link and the OG url.
//
// No `images` field here on purpose: every route this helper serves has a sibling
// `opengraph-image.tsx` (see app/components/ogCard.tsx) that Next reads and injects the og:image /
// twitter:image tags from automatically. Setting an image here too would just print a second,
// competing tag. The one route that keeps a hand-made image (the homepage, `/assets/og.png`) sets
// its own openGraph/twitter block directly in app/layout.tsx instead of calling this helper.
export function pageMetadata(opts: { title: string; description: string; path: string }): Metadata {
  const { title, description, path } = opts;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "website",
      url: path,
      siteName: "Vawe",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
