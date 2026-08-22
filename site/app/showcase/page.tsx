import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { SourceViewer } from "../components/SourceViewer";
import LINES from "../../lib/scene-lines.json";
import EFFECTS from "../../lib/effects-counts.json";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

export const metadata: Metadata = {
  title: "Vawe · showcase",
  description:
    "What Vawe can render: kinetic typography, transitions, shader stings, data stories, product UI, and any aspect ratio. Every clip is one JSON scene.",
};

/* A GALLERY, not an essay.
 *
 * This page used to carry about 620 words of prose: a paragraph under the hero, a paragraph under
 * each of two section heads, a 30-word description on every film card, and a 35-word paragraph
 * beside each of nine capability clips laid out as nine full-width alternating rows. Nine rows of
 * picture-plus-paragraph is nine screens to see nine clips, and every one of those paragraphs said
 * in words what the clip beside it was already showing.
 *
 * So the clips became the content. The capability rows are a grid: the whole vocabulary is visible
 * at once, and each entry is a title and the names you type. What is left in prose is the part a
 * clip genuinely cannot say, which is what this page CANNOT show you (two scenes whose source may
 * not be published) and where to go next.
 */

type Film = { slug: string; brand: string; dur: string; line: string; tag: string };

const FILMS: Film[] = [
  { slug: "linear-launch", brand: "Linear", dur: "0:50", line: "An agent session runs live, then Start building.", tag: "reflected · dark + iris" },
  { slug: "stripe", brand: "Stripe", dur: "0:45", line: "The gradient mesh, one tap, payment complete.", tag: "reflected · gradient mesh" },
  { slug: "argus-launch", brand: "Argus", dur: "0:23", line: "Posting into the void becomes growth on X.", tag: "reflected · white + cobalt" },
  { slug: "creed-launch", brand: "Creed", dur: "0:53", line: "A wall of AI tools resolves into one memory file.", tag: "reflected · white + ember" },
  { slug: "threadcite-open", brand: "ThreadCite", dur: "0:30", line: "Buyers ask Reddit. This maps where you appear.", tag: "reflected · white + orange" },
  { slug: "plinth-ad", brand: "Plinth", dur: "0:27", line: "An MCP endpoint that meters itself, and pays out.", tag: "reflected · white + cobalt" },
];

// `scene` names the JSON the "view source" link opens, defaulting to `showcase-<src>`. It is set to
// null for tiles whose scene may NOT be published: site-engine ships every asset a published scene
// references, and the gradient and ransom packs are licensed for use but not for redistribution.
// The rendered mp4 is a use of them; shipping the source files themselves would not be. The page
// says this out loud under the grid rather than leaving two tiles quietly missing a link.
type Cap = { title: string; tag: string; src: string; scene?: string | null };

const CAPS: Cap[] = [
  { title: "Type that moves like it reads.", tag: "preset: up · decode · gradient", src: "type" },
  { title: "Cuts with intent.", tag: "cut: whip · punch · spin · zoom", src: "cuts" },
  { title: "GPU stings between beats.", tag: "sting: flash · glitch · scan · ripple", src: "stings" },
  { title: "Charts that draw themselves.", tag: "block: lineChart · statBig · kpiRow", src: "data" },
  { title: "Product demos, rebuilt.", tag: "block: browserFrame · cursor · toast", src: "ui" },
  { title: "One frame, ten grades.", tag: "filter: thermal · nightVision · filmNoir", src: "looks", scene: "looks" },
  { title: "Ransom notes, set per frame.", tag: "ransom: paper · color · sprites", src: "ransom", scene: null },
  { title: "Ordered dither, baked cold.", tag: "canvasFx: dither · bayer", src: "dither", scene: "ditherkit" },
  { title: "Gradient fields, downscaled offline.", tag: "image: ken burns · radius", src: "gradients", scene: null },
];

export default function Showcase() {
  return (
    <div className="shell">
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
        <section className="phead">
          <span className="kicker">
            <span className="dot" /> showcase
          </span>
          <h1>What one JSON can render.</h1>
          <p>Every clip on this page is a single scene file. Open the source on any of them.</p>
        </section>

        <section className="films">
          <div className="films-head">
            <h2>Six brands, six films.</h2>
            <p>Each one authored as one JSON scene from the brand&apos;s own site.</p>
          </div>
          <div className="filmgrid">
            {FILMS.map((f) => (
              <figure className="filmcard" key={f.slug}>
                <div className="fmedia">
                  <Clip src={`/assets/films/${f.slug}.mp4`} poster={`/assets/films/${f.slug}.jpg`} />
                </div>
                <figcaption>
                  <div className="fbrand">
                    {f.brand}
                    <span className="fdur">{f.dur}</span>
                  </div>
                  <div className="fline">{f.line}</div>
                  <span className="tag">{f.tag}</span>
                  <SourceViewer name={f.slug} lines={lineCount(f.slug)} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="cap-lead">
          <div className="num">the vocabulary</div>
          <h2>And every part, on its own.</h2>
          {/* Nine clips are the tour, not the vocabulary: the engine registers 518 effects. An
              author needs the index open beside them, so it gets the strongest link on the page. */}
          <Link className="cap-index" href="/showcase/effects">
            <span className="cap-index-n">{EFFECTS.total}</span>
            <span>
              <b>Every effect, indexed</b>
              <span>{EFFECTS.families} families, searchable, with the JSON that uses each one.</span>
            </span>
            <span className="cap-index-go" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="capgrid">
          {CAPS.map((c) => (
            <figure className="capcard" key={c.src}>
              <div className="capmedia">
                <Clip src={`/assets/showcase/${c.src}.mp4`} poster={`/assets/showcase/${c.src}.jpg`} />
              </div>
              <figcaption>
                <h3>{c.title}</h3>
                <span className="tag">{c.tag}</span>
                {c.scene !== null && (
                  <SourceViewer
                    name={c.scene ?? `showcase-${c.src}`}
                    lines={lineCount(c.scene ?? `showcase-${c.src}`)}
                  />
                )}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="capnote">
          Two of these ship without their source. The gradient and ransom packs are licensed for use,
          not for redistribution, so the films are here and the scene files are not.
        </p>

        {/* Full width, not a half-column. In the two-up row this beat put a 9:16 clip at 63px
            wide, so the one thing it claims to prove (same scene, three crops) was unprovable.
            Three ratios side by side need the whole measure. */}
        <div className="aspects">
          <div className="aspects-head">
            <div>
              <h2>One scene, every ratio.</h2>
            </div>
            <p>Rendered 16:9, 9:16 and 1:1 from the same source, in one pass.</p>
          </div>
          <div className="trio">
            <figure className="ar a169">
              <Clip src="/assets/showcase/aspect-169.mp4" poster="/assets/showcase/aspect-169.jpg" />
              <figcaption>16:9</figcaption>
            </figure>
            <figure className="ar a916">
              <Clip src="/assets/showcase/aspect-916.mp4" poster="/assets/showcase/aspect-916.jpg" />
              <figcaption>9:16</figcaption>
            </figure>
            <figure className="ar a11">
              <Clip src="/assets/showcase/aspect-11.mp4" poster="/assets/showcase/aspect-11.jpg" />
              <figcaption>1:1</figcaption>
            </figure>
          </div>
          <div className="aspects-foot">
            <span className="tag">--aspect 16:9,9:16,1:1</span>
            <SourceViewer name="showcase-aspect" lines={lineCount("showcase-aspect")} />
          </div>
        </div>

        <section className="section end">
          <h2 className="h2">
            Compose your own, in <span className="accent">JSON</span>.
          </h2>
          <div className="hero-cta">
            <Link className="btn btn-primary" href="/editor">
              Try the editor
            </Link>
            <Link className="btn btn-ghost" href="/">
              ← Back home
            </Link>
          </div>
        </section>
        </main>

        <Footer note="every clip is one JSON scene" />
      </div>
    </div>
  );
}
