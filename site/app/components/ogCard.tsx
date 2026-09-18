import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// ONE TEMPLATE, NOT THREE COPIES. Every opengraph-image.tsx route (effects, blocks, the static
// pages) calls renderOgCard with its own text and, where one exists, its own real content panel.
// The card is built with next/og's ImageResponse (Satori), which needs actual font BYTES. Satori
// reads ttf, otf and woff, and NOT woff2, which is the only format the site's variable faces ship.
//
// SO THE STATIC INSTANCES ARE FETCHED, NEVER COMMITTED. The first attempt cut TTFs out of the
// vendored woff2 with fonttools and committed them next to this file, which breaks the repo's oldest
// asset rule: "no font binary ships from this repo, paid or not" (.gitignore:10), and it would have
// needed Python and fonttools inside a node:22-alpine image to ever rebuild. Fontsource's
// non-variable packages publish exactly these three instances as .woff, so generators/media/fonts.mjs
// now fetches them like every other face, hash-locked, into the gitignored assets/fonts/, and
// scripts/site/site-engine.mjs vendors that whole directory into site/public/assets/fonts. Nothing is
// converted, nothing is redistributed, and the Dockerfile already runs that generator before the site
// builds.

export const OG_SIZE = { width: 1200, height: 630 } as const;

const FONT_DIR = path.join(process.cwd(), "public/assets/fonts");
let fontsCache: { name: string; data: Buffer; weight: 400 | 800; style: "normal" }[] | null = null;

export async function loadOgFonts() {
  if (fontsCache) return fontsCache;
  const [bold, regular, mono] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "Anybody-800.woff")),
    fs.readFile(path.join(FONT_DIR, "Anybody-400.woff")),
    fs.readFile(path.join(FONT_DIR, "JetBrainsMono-400.woff")),
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

      {/* Body. TOP-ALIGNED, NOT CENTRED, and the two columns share one starting line.
          Centring a 200px text column against a 340px panel inside a 437px body left about 105px of
          empty frame above the content and 130px below, and pushed the tag and the panel's first
          line to different heights, so the eye had two places to start. A social card is also the
          thing most often shown small and cropped, where the dead band at the top is the part that
          survives. So the two columns are top-aligned TO EACH OTHER, inside a row that is centred in
          the frame: one entry point for the eye, and the remaining air splits evenly above and below
          instead of collecting at one end. */}
      <div style={{ display: "flex", flex: 1, padding: "24px 64px 40px 64px", alignItems: "center" }}>
        <div style={{ display: "flex", width: "100%", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", width: hasPanel ? 480 : 1056 }}>
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
              maxWidth: hasPanel ? 480 : 780,
              display: "flex",
            }}
          >
            {clamp(description, hasPanel ? 130 : 170)}
          </div>
        </div>

        {hasPanel && (
          <div style={{ display: "flex", marginLeft: 48, width: 544, alignItems: "flex-start" }}>
            {panel.kind === "image" ? (
              <img
                src={panel.dataUri}
                alt={panel.alt}
                width={544}
                height={306}
                style={{
                  width: 544,
                  height: 306,
                  objectFit: "cover",
                  borderRadius: PANEL_RADIUS,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 544,
                  height: 400,
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
