import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // The marketing site serves this app at /docs by rewriting to it (see site/next.config.mjs).
  // This app's fumadocs routes ALREADY live at /docs, so basePath:"/docs" would double the prefix
  // into /docs/docs — the routes need no help. Only the assets do: without a prefix they sit at
  // /_next/*, which collides with the site's own /_next/* and never reaches this app. assetPrefix
  // moves them somewhere the site can proxy unambiguously.
  // Stays on Next 16 + fumadocs 16 while the site stays on Next 15 — that separation is the whole
  // reason for proxying instead of merging.
  assetPrefix: "/docs-static",
  output: "standalone",
};

export default withMDX(config);
