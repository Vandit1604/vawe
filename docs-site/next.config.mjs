import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // The marketing site serves this app at /docs by rewriting to it (see site/next.config.mjs).
  // basePath makes every link and asset this app emits already carry the /docs prefix, so the
  // proxied pages work without rewriting HTML on the way through.
  // It stays on Next 16 + fumadocs 16 while the site stays on Next 15: the rewrite is what lets
  // the two keep their own versions instead of forcing a framework upgrade on the site.
  basePath: "/docs",
  output: "standalone",
};

export default withMDX(config);
