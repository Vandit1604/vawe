import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// ONE TEMPLATE, NOT THREE COPIES. Every opengraph-image.tsx route (effects, blocks, the static
// pages) calls renderOgCard with its own text and, where one exists, its own real content panel.
// The card is built with next/og's ImageResponse (Satori), which needs actual font BYTES: the
// site's fonts ship as woff2 for the browser, and Satori does not read woff2, so three static TTF
// instances live in ./og-fonts (Anybody 400/800, JetBrains Mono 400), cut once from the vendored
// variable woff2 with fonttools. That is the whole reason this folder exists next to this file.

export const OG_SIZE = { width: 1200, height: 630 } as const;

const FONT_DIR = path.join(process.cwd(), "app/components/og-fonts");
let fontsCache: { name: string; data: Buffer; weight: 400 | 800; style: "normal" }[] | null = null;

export async function loadOgFonts() {
  if (fontsCache) return fontsCache;
  const [bold, regular, mono] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "Anybody-800.ttf")),
    fs.readFile(path.join(FONT_DIR, "Anybody-400.ttf")),
    fs.readFile(path.join(FONT_DIR, "JetBrainsMono-400.ttf")),
  ]);
  fontsCache = [
    { name: "Anybody", data: bold, weight: 800, style: "normal" },
    { name: "Anybody", data: regular, weight: 400, style: "normal" },
    { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
  ];
  return fontsCache;
}

// The site's own tokens (DESIGN.md), never a second palette for this one surface.
const TOKENS = {
  bg: "#ffffff",
  ink: "#0f1620",
  ink2: "#454f5e",
  muted: "#697182",
  line: "#e7eaf0",
  accent: "#2563eb",
  bg2: "#f6f8fb",
};

// The same clip-path mark site/og/card.html draws for the homepage card, so the two image-generation
// paths (that one screenshots a browser, this one runs Satori) still read as one wordmark.
function Mark() {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        background: TOKENS.accent,
        clipPath: "polygon(0 62%,25% 22%,50% 62%,75% 22%,100% 62%,100% 100%,0 100%)",
      }}
    />
  );
}

function clamp(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export type OgPanel =
  | { kind: "image"; dataUri: string; alt: string }
  | { kind: "code"; text: string }
  | null;

// The panel is the one place this composition nests a box inside the padded content area, so it is
// the one place the concentric-radius rule (outer = inner + padding) actually applies: the panel sits
// on 1px hairlines rather than a shadow (site/DESIGN.md's rule, not next/og's), at a radius one step
// inside the 14px the site uses everywhere else a corner is rounded.
const PANEL_RADIUS = 10;

export function renderOgCard(opts: { tag: string; title: string; description: string; path: string; panel: OgPanel }) {
  const { tag, title, description, path: urlPath, panel } = opts;
  const hasPanel = panel != null;

  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        background: TOKENS.bg,
        fontFamily: "Anybody",
        color: TOKENS.ink,
      }}
    >
      {/* Masthead: the wordmark, quiet, and the path it belongs to. */}
      <div style={{ display: "flex", alignItems: "center", padding: "40px 64px 0 64px" }}>
        <Mark />
        <div style={{ marginLeft: 10, fontSize: 19, fontWeight: 800, letterSpacing: "-0.015em" }}>vawe</div>
        <div style={{ display: "flex", marginLeft: "auto", fontFamily: "JetBrains Mono", fontSize: 14, color: TOKENS.muted, letterSpacing: "0.02em" }}>
          {`vawe.dev${urlPath}`}
        </div>
      </div>
      <div style={{ margin: "24px 64px 0 64px", height: 1, background: TOKENS.line, display: "flex" }} />

      {/* Body */}
      <div style={{ display: "flex", flex: 1, padding: "40px 64px 48px 64px", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", width: hasPanel ? 500 : 1056 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 14,
              color: TOKENS.accent,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {tag}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: hasPanel ? 56 : 64,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.022em",
              display: "flex",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 21,
              lineHeight: 1.5,
              color: TOKENS.ink2,
              fontWeight: 400,
              maxWidth: hasPanel ? 500 : 780,
              display: "flex",
            }}
          >
            {clamp(description, hasPanel ? 130 : 170)}
          </div>
        </div>

        {hasPanel && (
          <div style={{ display: "flex", marginLeft: 56, width: 500, height: 340, alignItems: "center" }}>
            {panel.kind === "image" ? (
              <img
                src={panel.dataUri}
                alt={panel.alt}
                width={500}
                height={281}
                style={{
                  width: 500,
                  height: 281,
                  objectFit: "cover",
                  borderRadius: PANEL_RADIUS,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 500,
                  height: 320,
                  padding: 28,
                  background: TOKENS.bg2,
                  borderRadius: PANEL_RADIUS,
                  border: "1px solid rgba(0,0,0,0.1)",
                  fontFamily: "JetBrains Mono",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: TOKENS.ink2,
                  whiteSpace: "pre",
                  overflow: "hidden",
                }}
              >
                {clamp(panel.text, 420)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// The seven plain routes (features, arsenal, arsenal/type, playground, playground/[name], editor,
// showcase) have no still or snippet to show, so their opengraph-image.tsx files are three lines
// each: call this with the same title/description their page.tsx already carries.
export async function staticOgImage(opts: { tag: string; title: string; description: string; path: string }) {
  const fonts = await loadOgFonts();
  return new ImageResponse(renderOgCard({ ...opts, panel: null }), { ...OG_SIZE, fonts });
}
