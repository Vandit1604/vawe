import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";

// Three faces, three jobs (site/IDENTITY.md): Archivo for headings and body, Unbounded only for
// titles, JetBrains Mono for every number and label.
const sans = Archivo({ subsets: ["latin"], variable: "--font-sans", display: "swap", axes: ["wdth"] });
const title = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

// METADATA IS THE HEADLINE FOR PEOPLE WHO NEVER REACH THE PAGE. It read "one JSON, one video" and
// "a deterministic motion-graphics engine", which is the mechanism, and it is what a search result and
// a shared link show. The rule the page itself now follows applies here first: name the OUTCOME, and
// name WHO it is for. An agent or a coding session is the audience that can actually use a text file
// as a video format, so the title says so.
const TITLE = "Vawe · make videos by vibe coding";
const BLURB =
  "Motion graphics without a motion designer. Vawe renders video from a text file, so you or an AI "
  + "agent can write a film the way you write anything else, and re-render it the day the numbers change.";

export const metadata: Metadata = {
  metadataBase: new URL("https://vawe.dev"),
  title: TITLE,
  description: BLURB,
  keywords: [
    "video from code", "AI video generation", "motion graphics engine", "programmatic video",
    "vibe coding", "AI agent video", "video as code", "deterministic rendering",
  ],
  // Google Search's favicon crawler does not support SVG (its documented formats are BMP, GIF,
  // ICO, PNG, JPEG, PPM and TIFF), so the SVG mark ships first for browsers that do, and a real
  // 96x96 PNG rendered from the same mark (public/assets/favicon-96.png) covers Search itself.
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/favicon-96.png", type: "image/png", sizes: "96x96" },
    ],
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: BLURB,
    type: "website",
    url: "/",
    siteName: "Vawe",
    images: [{ url: "/assets/og.png", width: 1200, height: 630, alt: "Vawe: make videos by vibe coding" }],
  },
  // summary_large_image is the only card that shows a 1200x630 at full width; the default "summary"
  // crops it to a small square and the headline is on the left, so it would crop the claim away.
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: BLURB,
    images: ["/assets/og.png"],
  },
};

export const viewport: Viewport = { themeColor: "#16151a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${title.variable} ${mono.variable}`}>
      <head>
        {/* THE ENGINE'S BLOCK LIBRARY RUNS IN THIS PAGE, and one of its 17 families says
            `from 'd3-geo'`. A browser cannot resolve a bare specifier, so without this map
            /blocklib/index.mjs throws at module scope and EVERY block family vanishes from
            /playground, not only the maps. The three entries are the whole chain: d3-geo needs
            d3-array, which needs internmap. scripts/site/site-engine.mjs vendors all three.

            dangerouslySetInnerHTML because an import map must be literal script text; React would
            otherwise escape it into something the parser ignores silently, which is the failure this
            comment exists to stop the next person re-discovering. */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({ imports: {
            "d3-geo": "/vendor/d3-geo/index.js",
            "d3-array": "/vendor/d3-array/index.js",
            "internmap": "/vendor/internmap/index.js",
          } }) }}
        />
      </head>
      <body>
        {/* WCAG 2.4.1. Lives here, not in Header, so it is the document's first focusable element
            without constraining where the nav sits in the tree. It targets #content, the first
            thing AFTER the nav on every page, rather than a landmark that might contain the nav. */}
        <a className="skip" href="#content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
