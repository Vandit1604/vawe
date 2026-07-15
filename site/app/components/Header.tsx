import Link from "next/link";

export function WaveGlyph({ className = "glyph" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 24" fill="none" aria-hidden="true">
      <path d="M1 12 Q7 1 12 12 T23 12 T34 12 T46 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

const NAV = [
  { href: "/showcase", label: "Showcase", key: "showcase" },
  { href: "/blocks", label: "Blocks", key: "blocks" },
  { href: "/features", label: "Features", key: "features" },
];

export function Header({ active, variant = "solid" }: { active?: string; variant?: "over" | "solid" }) {
  return (
    <div className="wrap">
      <header className={`bar ${variant}`}>
        <Link className="mark" href="/">
          <WaveGlyph />
          Vawe
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} className={active === n.key ? "on" : undefined}>
              {n.label}
            </Link>
          ))}
          <a className="ghbtn" href="https://github.com/Vandit1604/vawe" aria-label="GitHub">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            79
          </a>
        </nav>
      </header>
    </div>
  );
}
