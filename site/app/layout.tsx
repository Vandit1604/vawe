import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vawe.dev"),
  title: "Vawe — one JSON, one video",
  description:
    "Vawe is a deterministic motion-graphics engine. Write one self-describing JSON, render one frame-perfect video. Same input, same bytes, every time.",
  icons: { icon: "/assets/favicon.svg" },
  openGraph: {
    title: "Vawe — one JSON, one video",
    description: "A deterministic motion-graphics engine. Write a scene, render a frame-perfect video.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#14161a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
