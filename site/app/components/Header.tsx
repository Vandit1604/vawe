import Link from "next/link";

export function WaveGlyph({ className = "glyph" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 24" fill="none" aria-hidden="true">
      <path d="M1 12 Q7 1 12 12 T23 12 T34 12 T46 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// Ordered by what a visitor came for: the films first, then the two in-browser tools, then the
// catalogue. Features lives in the footer, where the full route table already lists it.
const NAV = [
  { href: "/showcase", label: "Films", key: "showcase" },
  { href: "/editor", label: "Editor", key: "editor" },
  { href: "/playground", label: "Playground", key: "playground" },
  { href: "/arsenal", label: "Arsenal", key: "arsenal" },
];

// The docs are a separate fumadocs app (docs-site/) served at /docs via a rewrite in
// next.config.mjs, so this is just a path — no origin to configure, and nothing to get wrong in
// production. It used to fall back to a localhost URL, which shipped a dead link to every visitor.
// Exported so Footer.tsx points at the same two URLs instead of re-typing them.
export const DOCS_URL = "/docs";

// The engine repository, public since 2026-09-16.
export const REPO_URL = "https://github.com/Vandit1604/vawe";

export function Header({ active }: { active?: string }) {
  return (
    <div className="wrap">
      <header className="bar">
        <Link className="mark" href="/">
          <WaveGlyph />
          vawe
        </Link>
        {/* The current page is a <span aria-current="page">, never a link to itself (Footer.tsx
            uses the same rule). */}
        <nav className="nav" aria-label="Main">
          {NAV.map((n) =>
            active === n.key ? (
              <span key={n.key} aria-current="page">
                {n.label}
              </span>
            ) : (
              <Link key={n.key} href={n.href}>
                {n.label}
              </Link>
            ),
          )}
          <a href={DOCS_URL}>Docs</a>
        </nav>
        {/* The one filled action: the repo is public, so the source is the thing to go and get. */}
        <a className="ghbtn" href={REPO_URL}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
      </header>
    </div>
  );
}
