import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Header, REPO_URL } from "./components/Header";
import { HeroSplit } from "./components/HeroSplit";
import { SectionStrip } from "./components/SectionStrip";
import { Footer } from "./components/Footer";
import { ProofHash, ProofAspect } from "./components/proofs";
import EFFECTS from "../lib/effects-counts.json";
import { organizationSchema, websiteSchema, softwareApplicationSchema, jsonLdScript } from "../lib/schema";
import "./landing.css";

/* THE LANDING PAGE (site/IDENTITY.md). A film playing live in the reader's browser, its layer
 * timeline and its scene file first; then how it works, the real scene file, the effects that ship,
 * what you get, and questions. Nothing here asks to be believed: the hero is the engine running,
 * the proofs are drawings whose geometry is the claim, and the wall is read off the preview files.
 */

// The scene file shown in "The film is the file", read from the same file the editor opens, so
// the page can never show JSON that the engine would not run.
const SCENE_TEXT = fs.readFileSync(path.join(process.cwd(), "public/scenes/hero-site.json"), "utf8").trim();

const SECTIONS = [
  { id: "intro", label: "Film" },
  { id: "how", label: "How" },
  { id: "file", label: "File" },
  { id: "arsenal", label: "FX" },
  { id: "perks", label: "Perks" },
  { id: "faq", label: "FAQ" },
];

// Lucide icons (ISC), the family site/public/assets/icons/ui already uses.
const ICONS = {
  pr: <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" x2="6" y1="9" y2="21" /></>,
  bot: <><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></>,
  ratio: <><rect width="12" height="20" x="6" y="2" rx="2" /><rect width="20" height="12" x="2" y="6" rx="2" /></>,
  repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>,
};
const Icon = ({ name }: { name: keyof typeof ICONS }) => (
  <span className="ls-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg></span>
);

/* THE ARSENAL WALL, read off what actually ships rather than typed.
 *
 * quality/gates/site-counts.mjs exists because hand-typed counts about a growing registry go stale
 * by default. The same logic applies to a hand-picked list of examples: it rots the first time a
 * preview is renamed. So the wall is the preview directory, sorted, one entry per family, capped.
 * Add an effect family and it appears here; delete one and it leaves. Sorting keeps the build
 * deterministic, which is the only promise this whole site makes.
 */
const WALL = (() => {
  const dir = path.join(process.cwd(), "public/assets/effects");
  // The BIGGEST preview in each family, not the alphabetically first. A JPEG's size tracks how much
  // detail is in the frame, so this picks the busiest specimen a family has and a near-blank first
  // frame can never win. It is still derived and still deterministic: nothing here is a hand-picked
  // list, so renaming or adding a preview re-sorts the wall instead of rotting it.
  const best = new Map<string, { stem: string; bytes: number }>();
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".jpg")) continue;
    const stem = f.slice(0, -4);
    const [family, name] = stem.split("--");
    if (!name) continue;
    const bytes = fs.statSync(path.join(dir, f)).size;
    const held = best.get(family);
    if (!held || bytes > held.bytes) best.set(family, { stem, bytes });
  }
  // Every family that has a preview, not a slice of them. A cut list needs a number in the copy to
  // stay honest, and a number in the copy about a growing registry is the exact failure
  // quality/gates/site-counts.mjs exists to catch. The wall is 5 / 3 columns, which fills every row
  // at the fifteen families that ship previews today; a sixteenth would leave a short last row,
  // which is cosmetic, not broken.
  return [...best.values()]
    .map((e) => e.stem)
    .sort()
    .map((stem) => {
      const [family, name] = stem.split("--");
      return { stem, family: family.replace(/-/g, " "), name };
    });
})();

export default function Home() {
  return (
    <div className="shell">
      {/* Organization, WebSite, SoftwareApplication, built in site/lib/schema.ts from real repo data. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(websiteSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareApplicationSchema())} />
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <HeroSplit />

        <section className="ls" id="how">
          <h2>Write a scene. Get a film.</h2>
          <div className="ls-grid ls-2">
            <div className="panel ls-card ls-wide">
              <div className="ls-vis"><div className="ls-code">{"{ "}<b>&quot;type&quot;</b>{': "text",\n  '}<b>&quot;text&quot;</b>{': "One JSON. One film.",\n  '}<b>&quot;start&quot;</b>{": 0.2, "}<b>&quot;duration&quot;</b>{": 2.4 }"}</div></div>
              <div>
                <h3>Write</h3>
                <p>Layers, camera, captions and transitions, in one JSON file. You write it, or an agent does.</p>
              </div>
            </div>
            <div className="panel ls-card">
              <div className="ls-vis"><ProofHash /></div>
              <h3>Render</h3>
              <p>Each frame is drawn from its number alone, so frame 412 comes out the same in any order.</p>
            </div>
            <div className="panel ls-card">
              <div className="ls-vis"><ProofAspect /></div>
              <h3>Ship</h3>
              <p>One scene resolves to every canvas: 16:9, 9:16, 1:1, 4:5 and 4:3.</p>
            </div>
          </div>
        </section>

        <section className="ls" id="file">
          <h2>The film is the file.</h2>
          <p className="ls-sub">This is the real scene file of a film on this site. Open it in the editor and change a line.</p>
          <div className="ls-grid ls-2">
            <div className="panel ls-card">
              <h3>Read it</h3>
              <p>Each layer says what it is, where it sits and when it is on screen.</p>
              <h3 style={{ marginTop: 22 }}>Review it</h3>
              <p>A change to the motion is a diff you can read before it ships.</p>
              <div className="hs-actions"><a className="btn btn-ghost" href="/editor?scene=hero-site">Open it in the editor</a></div>
            </div>
            <div className="panel ls-card">
              <div className="ls-vis" style={{ placeItems: "start", maxHeight: 360, overflow: "auto", borderBottom: 0, margin: 0, padding: 0 }}>
                <pre className="ls-code">{SCENE_TEXT}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="ls" id="arsenal">
          <h2>Compose from primitives, not templates.</h2>
          <p className="ls-sub">
            {EFFECTS.total} effects ship today, {EFFECTS.previewed} of them with a rendered preview. One frame from each family that has one:
          </p>
          <div className="fxwall">
            {WALL.map((fx) => (
              <figure className="fx" key={fx.stem}>
                <img src={`/assets/effects/${fx.stem}.jpg`} alt={`${fx.name}, a still from its preview`} loading="lazy" width={320} height={180} />
                <figcaption>
                  {fx.name}
                  <span className="fxfam">{fx.family}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="hs-actions"><Link className="btn btn-ghost" href="/arsenal">Browse the arsenal</Link></div>
        </section>

        <section className="ls" id="perks">
          <h2>What you get.</h2>
          <div className="ls-grid ls-2">
            <div className="panel ls-card ls-benefit"><Icon name="pr" /><div><h3>Review like code</h3><p>Motion changes arrive as a readable diff, not a binary project file.</p></div></div>
            <div className="panel ls-card ls-benefit"><Icon name="bot" /><div><h3>Hand it to an agent</h3><p>An agent writes the scene, gates check it, and a judge looks at the frames.</p></div></div>
            <div className="panel ls-card ls-benefit"><Icon name="ratio" /><div><h3>Every canvas, one file</h3><p>16:9 through 9:16 from the same scene, with safe areas for each.</p></div></div>
            <div className="panel ls-card ls-benefit"><Icon name="repeat" /><div><h3>Same frames, every run</h3><p>No clock and no randomness. Frame 412 is always frame 412.</p></div></div>
          </div>
        </section>

        <section className="ls" id="faq">
          <h2>Questions.</h2>
          <div className="panel ls-faq">
            <details open><summary>Is it open source?</summary><p>Yes, under Apache 2.0. The engine, the studio and this site are <a href={REPO_URL}>on GitHub</a>.</p></details>
            <details><summary>Where does it run?</summary><p>The editor and playground run the engine in your browser. The studio and the renderer run on your machine.</p></details>
            <details><summary>Does it work with my agent?</summary><p>Yes. vawe ships an MCP server, so an agent can draft, check and export a film.</p></details>
            <details><summary>Can it match my brand?</summary><p>A theme holds your colours, fonts and motion, and a film refers to them by name.</p></details>
          </div>
        </section>
      </main>
      <Footer bookend />
      <SectionStrip sections={SECTIONS} />
    </div>
  );
}
