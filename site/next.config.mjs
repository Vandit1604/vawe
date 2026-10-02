/** @type {import('next').NextConfig} */
import { LEGACY_REDIRECTS } from "./lib/redirects.mjs";

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
  async redirects() {
    return [
      // www.vawe.dev and vawe.dev both served 200 with no redirect between them, so Google split
      // the site's crawl and its link authority across two hostnames for the same 984 pages (GSC
      // confirmed both being indexed). `alternates.canonical` in app/layout.tsx already names the
      // apex as canonical, but a canonical tag only advises; it does not stop the second hostname
      // from being crawled and ranked on its own. A real 308 here does that, and it lives HERE
      // rather than at the Coolify/proxy layer: this app is the one thing both hostnames point at
      // (Coolify's own multi-domain redirect toggle is dashboard state, not something this repo can
      // commit or review), and Next's `has: [{ type: "host" }]` match runs on the Host header the
      // proxy forwards, which Coolify's default Traefik config passes through unmodified.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vawe.dev" }],
        destination: "https://vawe.dev/:path*",
        permanent: true,
      },
      ...LEGACY_REDIRECTS,
      // THE FEATURES FOLD: eight feature detail pages became three sections on /features itself.
      // Wildcarded, because the slugs were content and a new one must not 404 either. The route's
      // own social card lives under /features too, so it is excluded from the catch-all.
      { source: "/features/:slug((?!opengraph-image$).+)", destination: "/features", permanent: true },
    ];
  },
  // Clip files keep their names when a move is re-rendered, so the pages link them as ?v=<hash of the
  // source clip> (lib/clip.ts). A versioned URL never changes content: cache it for a year. The same
  // file without ?v= (an agent following index.json or llms.txt) and the .md revalidate after an hour.
  // Later entries win, so the versioned rule comes last.
  async headers() {
    const media = "/moves/:file(.+\\.(?:mp4|webm|webp|md))";
    return [
      { source: media, headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
      {
        source: media,
        has: [{ type: "query", key: "v" }],
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async rewrites() {
    return [
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
