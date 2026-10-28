// Which routes have a markdown version. Plain JS with no imports, because the middleware (edge
// runtime) and tests/site/markdown-coverage.test.mjs read it too. lib/md/registry.ts holds one
// renderer per RENDERED pattern and throws at load if the two lists differ.
//
// To add a page: put its pattern in RENDERED and add its renderer to registry.ts. A page that has no
// renderer yet goes in SKIPPED with the reason; the coverage test fails for any page in neither list.

export const RENDERED = [
  "/ai-agents",
  "/blog",
  "/blog/[slug]",
  "/video-components",
  "/video-components/[name]",
  "/easing",
  "/easing/[slug]",
  "/inspiration",
];

const COPY_IN_JSX = "phase 2: copy moves to a data file";
const DOCS = "phase 3: served from docs-site MDX";

export const SKIPPED = [
  { pattern: "/", reason: COPY_IN_JSX },
  { pattern: "/features", reason: COPY_IN_JSX },
  { pattern: "/resources", reason: COPY_IN_JSX },
  { pattern: "/about", reason: COPY_IN_JSX },
  { pattern: "/determinism", reason: COPY_IN_JSX },
  { pattern: "/when-determinism-matters", reason: COPY_IN_JSX },
  { pattern: "/problems", reason: COPY_IN_JSX },
  { pattern: "/roadmap", reason: COPY_IN_JSX },
  { pattern: "/launch-video", reason: COPY_IN_JSX },
  { pattern: "/remotion-alternatives", reason: COPY_IN_JSX },
  { pattern: "/hyperframes-alternatives", reason: COPY_IN_JSX },
  { pattern: "/vs/[slug]", reason: COPY_IN_JSX },
  { pattern: "/docs", reason: DOCS },
  { pattern: "/docs/[slug]", reason: DOCS },
];

// Paths the middleware never rewrites: real files (the move .md files live in public/moves), the
// docs app and the site-level data files.
export const MD_EXCLUDED = ["/moves/", "/docs", "/docs-static/", "/api/", "/_next/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/ai.txt", "/robots.txt", "/sitemap.xml"];

// "/blog/[slug]" against "/blog/my-post": the params, or null.
export function matchPattern(pattern, path) {
  const want = pattern.split("/");
  const got = path.split("/");
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    const dynamic = /^\[(\w+)\]$/.exec(want[i]);
    if (dynamic) {
      if (!got[i]) return null;
      params[dynamic[1]] = got[i];
    } else if (want[i] !== got[i]) return null;
  }
  return params;
}

export const isRendered = (path) => RENDERED.some((p) => matchPattern(p, path));
export const skipReason = (path) => SKIPPED.find((s) => matchPattern(s.pattern, path))?.reason;

// "/blog/my-post.md" is "/blog/my-post"; "/index.md" is "/". Null when the path has no .md suffix.
export function pathOfMdUrl(pathname) {
  if (!pathname.endsWith(".md")) return null;
  const path = pathname.slice(0, -3);
  return path === "/index" ? "/" : path;
}

export const mdUrlOf = (path) => (path === "/" ? "/index.md" : `${path}.md`);
export const isExcluded = (pathname) => MD_EXCLUDED.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
