import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Header } from "./components/Header";
import { HeroEditor } from "./components/HeroEditor";
import { Clip } from "./components/Clip";
import { Footer } from "./components/Footer";
import { SourceViewer } from "./components/SourceViewer";
import { ProofHash, ProofAspect } from "./components/proofs";
import LINES from "../lib/scene-lines.json";
import EFFECTS from "../lib/effects-counts.json";
import { organizationSchema, websiteSchema, softwareApplicationSchema, jsonLdScript } from "../lib/schema";
import "./landing.css";

/* THE LANDING PAGE.
 *
 * What it does NOT do, stated once so the defaults it excludes stay excluded: no gradient hero, no
 * logo wall, no three equal feature cards, no stat tiles, no testimonial, no scroll-hijacked pin,
 * no icon in a circle. Every one of those was available and none of them shows anything.
 *
 * What it does instead is run the engine three times in three registers. The hero is a live,
 * editable scene rendering in the reader's own browser, and it can be broken on purpose so the
 * refusal is a thing that happens rather than a thing we claim. The proofs are two drawings whose
 * geometry IS the claim. The films are finished work with the line count of the file that made
 * each one. Nothing on this page asks to be believed.
 *
 * The section that used to sit between the hero and the films was three claims on a 250vh pinned
 * runway. It is gone. It spent three and a half screens delivering three sentences, it needed a
 * second layout for reduced motion and a third for no-JS, and pinning is the marketing default
 * this page is supposed to reach past. Two of its diagrams survived; the runway did not.
 */

const lines = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

type Film = { slug: string; brand: string; dur: string; note?: string };

/* Three, not six. /showcase carries the set; the landing carries the argument, and the argument is
 * one film large enough to read plus two beside it for range. The first is a launch film, the
 * second a product tour, the third a fillable template, so the row is three KINDS of work rather
 * than three of the same. */
const FILMS: Film[] = [
  { slug: "preface-launch", brand: "Preface", dur: "0:53" },
  { slug: "argus-launch", brand: "Argus", dur: "0:23" },
  { slug: "saas-hero-launch", brand: "SaaS hero", dur: "0:45", note: "template" },
];

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
      {/* Entity resolution for AI Overviews / AI Mode: what Vawe IS, before a reader or a crawler
          reads a word of copy. Built in site/lib/schema.ts from real repo data, never typed here. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(websiteSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareApplicationSchema())} />
      <main>
        <div className="hero-wrap">
          {/* The band is the engine's own output under a cobalt scrim: the loudest surface on the
              site is literally the product. The Header sits INSIDE it, so its computed background
              really is cobalt and a contrast checker reads what a viewer sees. #content follows the
              nav, so the skip link still bypasses it. */}
          <div className="bookend tap hero-band">
            <Header variant="pill" />
            {/* backdrop = films/scene/site-backdrop.json: an ambient shader field with ZERO text
                layers. Never a capability clip: those all carry copy, which blurs into drifting
                smudges behind the headline. */}
            <Clip className="bookend-film" src="/assets/backdrop.mp4" poster="/assets/backdrop.jpg" />
            <div className="wrap hero-head on-accent" id="content" tabIndex={-1}>
              {/* Names the audience. It used to read "for teams with no motion designer", which is
                  the h1's own second line, so the first two things on the page said one thing twice. */}
              <span className="eyebrow">
                <span className="dot" />
                for product and marketing teams
              </span>
              {/* OUTCOME FIRST, MECHANISM SECOND, and it took two tries to get right. It read
                  "One JSON, one video.", which is how the thing WORKS. Then "Ship the film with the
                  feature.", which is WHEN it ships. Neither says what the reader GETS. This one names
                  the thing (motion graphics, the real category) and the cost it removes (the designer,
                  the agency, the round trips), and carries no mechanism at all.
                  Every heading on this page had the first shape, so the site argued its architecture
                  to someone who had not yet been told why to want it. The mechanism did not go away:
                  "One JSON, one video" is now the first line of the sub, where it answers "how" for a
                  reader the headline has already convinced. */}
              <h1>
                Motion graphics without{" "}
                <br />
                a motion designer.
              </h1>
              <p className="sub">
                One JSON, one video. Write the scene as data, and re-render it the day the numbers
                change.
              </p>
              <div className="hero-cta">
                <Link className="btn btn-white" href="/editor">
                  Make one now <span className="arw">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* The editor overlaps up into the V, so the band reads as pouring into it. */}
          <div className="hero-stage">
            <HeroEditor />
            {/* Phone: no code pane. You are not typing JSON on a phone, so it gets the same scene
                rendered instead of the editor that renders it. */}
            <figure className="hero-mobile">
              <Clip src="/assets/hero.mp4" poster="/assets/hero.jpg" />
              <figcaption className="hm-cta">
                <span>rendered from one JSON</span>
                <Link href="/editor">open the editor →</Link>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="hero-foot" />

        {/* ===== THE TWO PROOFS =====
            The claim is not "deterministic". Everything claims that. The claim is that you cannot
            opt out, and the paragraph names the mechanism so the sentence can be checked. The
            reader has already watched the engine refuse, one screen up. */}
        <section className="section">
          <div className="wrap">
            <div className="kicker">what you can promise a client</div>
            <h2 className="h2">What you approve is what ships.</h2>
            <p className="lead">
              Vawe is a deterministic motion-graphics engine: it turns one self-describing JSON file
              into one rendered video, with no timeline and no editor and no dragging clips around.
              You describe the scene and the engine draws every frame. A scene JSON names its layers,
              a camera, and a theme, and that file is the only source of truth; the mp4 is a build
              artifact you can delete and regenerate at any time. <code>renderFrame(n)</code> is a
              pure function of the frame number, so the same JSON always produces byte-identical
              pixels, no matter which machine renders it or in what order the frames come out. That
              purity is coerced, not merely asked for: the engine installs a virtual clock, so{" "}
              <code>Date.now</code>, <code>requestAnimationFrame</code> and <code>Math.random</code>{" "}
              all become pure functions of the frame being drawn, even inside a third-party library
              that never heard of Vawe. Nothing about the picture depends on when or where the
              render ran.
            </p>
            <div className="pf">
              <div>
                <h3>Any render order.</h3>
                <p>
                  {/* site-counts-allow: "412 looks" is frame 412, not a count of looks */}
                  Frame 412 looks the same whether it renders first or last. That is what lets one film
                  split across parallel workers, and what lets you diff two renders of it.
                </p>
                <ProofHash />
              </div>
              <div>
                <h3>Any canvas.</h3>
                <p>
                  Place things by grid and percentage and one file renders 16:9, 9:16, 1:1 and 4:5 in a
                  single pass. Hand-place raw pixels and you have tuned it to one shape.
                </p>
                <ProofAspect />
              </div>
            </div>
          </div>
        </section>

        {/* ===== THE FILMS =====
            The only section on the page that shows finished work, and the line count is why it is
            here rather than on /showcase alone. A film is not a video file on this site, it is a
            file you can open, read and edit, and the number says how big that file is. */}
        <section className="section alt">
          <div className="wrap">
            <div className="gal-head">
              <div>
                <div className="kicker">what came out of it</div>
                {/* The claim the three tiles below can be checked against: each carries the line
                    count of the file that made it. It read "Made without a timeline or a designer.",
                    which is a description of the process and a second copy of the h1's promise. */}
                <h2 className="h2">Every film here fits in one file.</h2>
              </div>
              <Link href="/showcase">
                See the full showcase <span className="arw">→</span>
              </Link>
            </div>
            <div className="filmgrid">
              {FILMS.map((f, i) => (
                <figure key={f.slug} className={i === 0 ? "film film-hero" : "film"}>
                  <div className="fmedia">
                    <Clip src={`/assets/films/${f.slug}.mp4`} poster={`/assets/films/${f.slug}.jpg`} />
                  </div>
                  <figcaption>
                    <span className="fbrand">{f.brand}</span>
                    <span className="fdur">{f.note ? `${f.note} · ${f.dur}` : f.dur}</span>
                    <SourceViewer name={f.slug} lines={lines(f.slug)} />
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ===== THE ARSENAL =====
            Delete this and the page never says what you compose FROM, which is the difference
            between this engine and a template tool. Names, not icons: a vocabulary only reads as
            one when you can see how much of it there is. */}
        <section className="section">
          <div className="wrap">
            <div className="gal-head">
              <div>
                {/* The kicker used to say the heading's sentence again, one line above it. It now
                    names what the wall IS and the heading makes the claim. */}
                <div className="kicker">what you compose from</div>
                <h2 className="h2">Nothing here looks like a template.</h2>
              </div>
              <Link href="/arsenal">
                Browse the arsenal <span className="arw">→</span>
              </Link>
            </div>
            <p className="lead">
              You compose a film from primitives the way you would write anything else, rather than
              pouring data into a layout someone else already composed. {EFFECTS.total} effects ship today,{" "}
              {EFFECTS.previewed} of them with a rendered preview. Below is one frame from each
              family that has one.
            </p>
            <div className="fxwall">
              {WALL.map((fx) => (
                <figure className="fx" key={fx.stem}>
                  <img src={`/assets/effects/${fx.stem}.jpg`} alt="" loading="lazy" width={320} height={180} />
                  <figcaption>
                    {fx.name}
                    <span className="fxfam">{fx.family}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer bookend />
    </div>
  );
}
