import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

// ONE TEMPLATE, NOT THREE COPIES. The generated cards (easing curves, video components, /vs pages) call
// renderOgCard with their own text and, where one exists, a code panel. The main pages and the blog posts serve
// pre-rendered brand-art cards from public/og/ instead (prerenderedOg, written by scripts/site/og-cards.mjs).
// The card is built with next/og's ImageResponse (Satori), which needs actual font BYTES. Satori
// reads ttf, otf and woff, and NOT woff2, which is the only format the site's variable faces ship.
//
// SO THE STATIC INSTANCES ARE FETCHED, NEVER COMMITTED. The first attempt cut TTFs out of the
// vendored woff2 with fonttools and committed them next to this file, which breaks the repo's oldest
// asset rule: "no font binary ships from this repo, paid or not" (.gitignore:10), and it would have
// needed Python and fonttools inside a node:22-alpine image to ever rebuild. Fontsource's
// non-variable packages publish exactly these three instances as .woff, so generators/media/fonts.mjs
// now fetches them like every other face, hash-locked, into the gitignored assets/fonts/, and
// scripts/site/vendor-assets.mjs copies that whole directory into site/public/assets/fonts. Nothing is
// converted, nothing is redistributed, and the Dockerfile already runs that generator before the site
// builds.

// SATORI MEASURES TEXT ONE LETTER AT A TIME (no kerning pairs) AND DRAWS IT WITH THEM. Geist kerns "hosted" 78 units
// tighter than the sum of its letters, so the word is drawn narrower than it was measured, the next word starts where
// the wide measure ended, and the gap after it grows. That showed as uneven, too-wide gaps in descriptions. It is not
// the nonbreaking space (the glyph is 250 units, same as the space). Dropping the GPOS table from the font bytes the
// card loads makes the measure and the draw agree. Kerning is a hair at 21px; even gaps are not.
// A woff keeps its tables at absolute offsets, so removing a directory entry leaves the others valid.
function withoutKerning(woff: Buffer): Buffer {
  const count = woff.readUInt16BE(12);
  const entries: Buffer[] = [];
  let removedSize = 0;
  for (let i = 0; i < count; i++) {
    const entry = woff.subarray(44 + i * 20, 64 + i * 20);
    if (entry.toString("latin1", 0, 4) === "GPOS") removedSize = Math.ceil(entry.readUInt32BE(12) / 4) * 4;
    else entries.push(entry);
  }
  const out = Buffer.from(woff);
  out.writeUInt16BE(entries.length, 12);
  out.writeUInt32BE(woff.readUInt32BE(16) - removedSize - (count - entries.length) * 16, 16);
  entries.forEach((entry, i) => entry.copy(out, 44 + i * 20));
  out.fill(0, 44 + entries.length * 20, 44 + count * 20);
  return out;
}

export const OG_SIZE = { width: 1200, height: 630 } as const;

const FONT_DIR = path.join(process.cwd(), "public/assets/fonts");
let fontsCache: { name: string; data: Buffer; weight: 400 | 600; style: "normal" }[] | null = null;

export async function loadOgFonts() {
  if (fontsCache) return fontsCache;
  const [semibold, regular, mono] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "Geist-600.woff")),
    fs.readFile(path.join(FONT_DIR, "Geist-400.woff")),
    fs.readFile(path.join(FONT_DIR, "IBMPlexMono-400.woff")),
  ]);
  fontsCache = [
    { name: "Geist", data: withoutKerning(semibold), weight: 600, style: "normal" },
    { name: "Geist", data: withoutKerning(regular), weight: 400, style: "normal" },
    { name: "IBM Plex Mono", data: mono, weight: 400, style: "normal" },
  ];
  return fontsCache;
}

// The site's own tokens (DESIGN.md), never a second palette for this one surface.
const TOKENS = {
  bg: "#000000",
  ink: "#ffffff",
  ink2: "#ededed",
  muted: "#a1a1a1",
  line: "#242424",
  bg2: "#0a0a0a",
};

// Satori draws an <img> from a data URI, not a currentColor SVG, so the lockup is read white (one colour, DESIGN.md "Logo").
let lockupCache: string | null = null;
function lockupDataUri() {
  if (lockupCache) return lockupCache;
  const svg = readFileSync(path.join(process.cwd(), "public/assets/vawe-lockup.svg"), "utf8").replaceAll("currentColor", TOKENS.ink);
  lockupCache = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return lockupCache;
}

const LOCKUP_RATIO = 217 / 56;

function Lockup({ height }: { height: number }) {
  return <img src={lockupDataUri()} alt="vawe" width={Math.round(height * LOCKUP_RATIO)} height={height} style={{ display: "flex" }} />;
}

function clamp(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export type OgPanel = { kind: "code"; text: string } | null;

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
        fontFamily: "Geist",
        color: TOKENS.ink,
      }}
    >
      {/* Masthead: the lockup, quiet, and the path it belongs to. */}
      <div style={{ display: "flex", alignItems: "center", padding: "40px 64px 0 64px" }}>
        <Lockup height={28} />
        <div style={{ display: "flex", marginLeft: "auto", fontFamily: "IBM Plex Mono", fontSize: 14, color: TOKENS.muted, letterSpacing: "0.02em" }}>
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
              fontFamily: "IBM Plex Mono",
              fontSize: 14,
              color: TOKENS.muted,
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
              fontWeight: 600,
              lineHeight: 1.06,
              letterSpacing: "-0.04em",
              display: "flex",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 21,
              lineHeight: 1.45,
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
            <div
              style={{
                display: "flex",
                width: 544,
                height: 400,
                padding: 28,
                background: TOKENS.bg2,
                borderRadius: PANEL_RADIUS,
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "IBM Plex Mono",
                fontSize: 15,
                lineHeight: 1.7,
                color: TOKENS.ink2,
                whiteSpace: "pre",
                overflow: "hidden",
              }}
            >
              {clamp(panel.text, 420)}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// A route with no still or snippet to show calls this with the same title/description its page.tsx
// already carries.
export async function staticOgImage(opts: { tag: string; title: string; description: string; path: string }) {
  const fonts = await loadOgFonts();
  return new ImageResponse(renderOgCard({ ...opts, panel: null }), { ...OG_SIZE, fonts });
}

// A share card rendered ahead of time from assets/brand-art: public/og/<route>.png, written by scripts/site/og-cards.mjs.
// PNG, because LinkedIn does not read WebP for og:image.
export function prerenderedOg(route: string) {
  const file = path.join(process.cwd(), "public/og", `${route}.png`);
  if (!existsSync(file)) throw new Error(`no share card for ${route}: run node scripts/site/og-cards.mjs and commit site/public/og`);
  return new Response(new Uint8Array(readFileSync(file)), { headers: { "Content-Type": "image/png" } });
}
