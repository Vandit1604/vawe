/** @type {import('next').NextConfig} */

// The docs are a separate Next app (docs-site/) pinned to Next 16 + fumadocs 16, while this site
// is on Next 15. Rather than force a framework upgrade on one of them so they can share a codebase,
// this app proxies /docs/* to it. docs-site sets basePath:"/docs", so its own links and assets
// already carry the prefix and pass straight through untouched.
//
//   dev  : docs-site on :3001 (npm run dev inside docs-site) — the default below
//   prod : set DOCS_ORIGIN to the docs service's origin, e.g. http://docs:3000
const DOCS_ORIGIN = process.env.DOCS_ORIGIN || "http://127.0.0.1:3001";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // Docker: emit a self-contained server so the runtime image carries no dev deps.
  output: "standalone",
  async rewrites() {
    return [
      { source: "/docs", destination: `${DOCS_ORIGIN}/docs` },
      { source: "/docs/:path*", destination: `${DOCS_ORIGIN}/docs/:path*` },
    ];
  },
};
export default nextConfig;
