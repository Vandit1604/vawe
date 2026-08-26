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
  { slug: "creed-launch", brand: "Creed", dur: "0:53" },
  { slug: "argus-launch", brand: "Argus", dur: "0:23" },
  { slug: "saas-hero-launch", brand: "SaaS hero", dur: "0:45", note: "template" },
];

/* THE ARSENAL WALL, read off what actually ships rather than typed.
 *
 * scripts/gates/site-counts.mjs exists because hand-typed counts about a growing registry go stale
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
  // scripts/gates/site-counts.mjs exists to catch. The wall is 5 / 3 columns, which fills every row
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
      <main>
        <div className="hero-wrap">
          {/* The band is the engine's own output under a cobalt scrim: the loudest surface on the
              site is literally the product. The Header sits INSIDE it, so its computed background
              really is cobalt and a contrast checker reads what a viewer sees. #content follows the
              nav, so the skip link still bypasses it. */}
          <div className="bookend tap hero-band">
            <Header variant="pill" />
            {/* backdrop = formats/scene/site-backdrop.json: an ambient shader field with ZERO text
                layers. Never a capability clip: those all carry copy, which blurs into drifting
                smudges behind the headline. */}
            <Clip className="bookend-film" src="/assets/backdrop.mp4" poster="/assets/backdrop.jpg" />
            <div className="wrap hero-head on-accent" id="content" tabIndex={-1}>
              <span className="eyebrow">
                <span className="dot" />
                deterministic motion-graphics engine
              </span>
              <h1>
                One JSON,
                <br />
                one video.
              </h1>
              <p className="sub">
                Write a scene as data. The engine renders it frame by frame, byte-identical every
                run, at any canvas.
              </p>
              <div className="hero-cta">
                <Link className="btn btn-white" href="/editor">
                  Try the editor <span className="arw">→</span>
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
            <div className="kicker">guarantees</div>
            <h2 className="h2">Determinism is enforced, not promised.</h2>
            <p className="lead">
              There is no rule asking you to avoid a wall clock. A frame is seeked, not played, so
              anything that runs on real time is refused at boot, by name, before a pixel is drawn.
              Two things follow from that, and both are worth more than the guarantee itself.
            </p>
            <div className="pf">
              <div>
                <h3>Any render order.</h3>
                <p>
                  renderFrame(n) is pure in n, so frame 412 comes out the same whether it renders
                  first or last. That is what lets one film shard across parallel tabs, and what
                  makes two renders of the same scene diff-able.
                </p>
                <ProofHash />
              </div>
              <div>
                <h3>Any canvas.</h3>
                <p>
                  Pin keywords, a 12-column grid and percentages resolve to pixels per canvas.
                  Compose in those and one source renders 16:9, 9:16, 1:1 and 4:5 in a single pass.
                  Hand-place absolute pixels instead and you have tuned it to one ratio.
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
                <div className="kicker">made with vawe</div>
                <h2 className="h2">Three films. Three text files.</h2>
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
                <div className="kicker">the arsenal</div>
                <h2 className="h2">No templates. A vocabulary.</h2>
              </div>
              <Link href="/arsenal">
                Browse the arsenal <span className="arw">→</span>
              </Link>
            </div>
            <p className="lead">
              You do not pour data into a layout someone else composed. You compose the film from
              primitives, the way you would write anything else. {EFFECTS.total} effects ship today,{" "}
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
