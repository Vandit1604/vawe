import type { Metadata, Viewport } from "next";
import { Anybody, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Anybody carries a real wdth axis (50-150) alongside wght (100-900). The width axis is the point:
// a motion engine's own type should be able to move. See DESIGN.md → The Width Is Motion Rule.
const sans = Anybody({ subsets: ["latin"], variable: "--font-sans", display: "swap", axes: ["wdth"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vawe.dev"),
  title: "Vawe · one JSON, one video",
  description:
    "Vawe is a deterministic motion-graphics engine. Write one self-describing JSON, render one frame-perfect video. Same input, same bytes, every time.",
  icons: { icon: "/assets/favicon.svg" },
  openGraph: {
    title: "Vawe · one JSON, one video",
    description: "A deterministic motion-graphics engine. Write a scene, render a frame-perfect video.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

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
