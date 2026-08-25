/** @type {import('next').NextConfig} */

// The docs are a separate Next app (docs-site/) pinned to Next 16 + fumadocs 16, while this site
// is on Next 15. Rather than force a framework upgrade on one of them so they can share a codebase,
// this app proxies /docs/* to it. docs-site sets basePath:"/docs", so its own links and assets
// already carry the prefix and pass straight through untouched.
//
//   dev  : docs-site on :3001 (npm run dev inside docs-site) — the default below
//   prod : set DOCS_ORIGIN to the docs service's origin, e.g. http://docs:3000
const DOCS_ORIGIN = process.env.DOCS_ORIGIN || "http://127.0.0.1:3001";

// A PRODUCTION BUILD MUST NOT WRITE INTO THE DEV SERVER'S .next.
// `next build` against the same directory a dev server is serving leaves dev reading half-written
// chunks: it 500s with "Cannot find module ./981.js" on whichever route was mid-write, and only
// `rm -rf .next` clears it. That cost this session twice. `--distDir` is NOT a CLI flag in Next 15
// (it was removed; `next build --distDir x` exits "unknown option"), so the split has to live here.
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // Docker: emit a self-contained server so the runtime image carries no dev deps.
  output: "standalone",
  async rewrites() {
    return [
      // the animation explainer: one source (docs/animation.html), published here by
      // `make deck`. A rewrite rather than a page route, because it is a self-contained
      // file that also has to open straight from disk in the repo.
      { source: "/deck", destination: "/deck.html" },
      // the docs pages (fumadocs already routes these at /docs in its own app)
      { source: "/docs", destination: `${DOCS_ORIGIN}/docs` },
      { source: "/docs/:path*", destination: `${DOCS_ORIGIN}/docs/:path*` },
      // its assets, which docs-site emits under assetPrefix "/docs-static" precisely so they do
      // not collide with this app's own /_next/*
      { source: "/docs-static/:path*", destination: `${DOCS_ORIGIN}/docs-static/:path*` },
      // fumadocs' search endpoint
      { source: "/api/search", destination: `${DOCS_ORIGIN}/api/search` },
    ];
  },
};
export default nextConfig;
