import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "../lib/site";
import { HOME } from "../lib/content/home";

// Two faces, two jobs (site/IDENTITY.md): Geist for headings and body, IBM Plex Mono for every number and label.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

// METADATA IS THE HEADLINE FOR PEOPLE WHO NEVER REACH THE PAGE. It read "one JSON, one video" and
// "a deterministic motion-graphics engine", which is the mechanism, and it is what a search result and
// a shared link show. The rule the page itself now follows applies here first: name the OUTCOME, and
// name WHO it is for. An agent or a coding session is the audience that can actually use a text file
// as a video format, so the title says so.
const TITLE = "vawe: open-source HTML to video for AI agents";
const BLURB =
  "Write one HTML page (CSS, SVG, canvas, three.js) and vawe renders a deterministic video. "
  + "Motion graphics as code for you or an AI agent: a free, Apache-2.0 Remotion alternative.";

// The landing hero film (lib/content/home.ts); the size below is that file's. og:video wants an absolute URL.
const HERO_VIDEO = `${SITE_URL}/examples/${HOME.hero.film}.mp4`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: BLURB,
  other: { "ai-summary": BLURB },
  keywords: [
    "HTML to video", "video from code", "AI agent video generation", "motion graphics with code",
    "programmatic video", "Remotion alternative", "vibe coding", "deterministic rendering",
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
  openGraph: {
    title: TITLE,
    description: BLURB,
    type: "website",
    url: "/",
    siteName: "vawe",
    videos: [{ url: HERO_VIDEO, secureUrl: HERO_VIDEO, type: "video/mp4", width: 1280, height: 720 }],
  },
  // summary_large_image is the only card that shows a 1200x630 at full width; the default "summary"
  // crops it to a small square and the headline is on the left, so it would crop the claim away.
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: BLURB,
  },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
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
