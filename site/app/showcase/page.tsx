import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { SourceViewer } from "../components/SourceViewer";
import LINES from "../../lib/scene-lines.json";
import EFFECTS from "../../lib/effects-counts.json";
import "./hero.css";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

export const metadata: Metadata = {
  title: "Vawe · showcase",
  description:
    "What Vawe can render: kinetic typography, transitions, shader stings, data stories, product UI, and any aspect ratio. Every clip is one JSON scene.",
};

/* A GALLERY, not an essay.
 *
 * This page has been cut twice. It carried ~620 words, then ~450, and the failure both times was
 * the same shape: prose in front of the work. Two headlines each with a paragraph beside it, then
 * a sentence under every film narrating what the clip already shows. At 1440 the first film sat
 * 466px down the page, so a visitor scrolled past a screen of type to reach a page of films.
 *
 * So: ONE headline, no lead paragraph, and the first film opens at full measure directly under it.
 * A film's caption is its brand, its runtime and its source. The clip is the description.
 *
 * The film grid is scale-contrasted rather than six equal tiles: one hero at full width, then two
 * at half, then three at a third. Six items, six cells, no empty cell, and the eye has somewhere
 * to start. The cards lost their border too. A bordered box around a video that already has its
 * own frame is a second frame doing nothing.
 *
 * What is left in prose is the part a clip genuinely cannot say: what this page CANNOT show you
 * (two scenes whose source may not be published) and where to go next.
 */

type Film = { slug: string; brand: string; dur: string };

const FILMS: Film[] = [
  { slug: "linear-launch", brand: "Linear", dur: "0:50" },
  { slug: "creed-launch", brand: "Creed", dur: "0:53" },
  { slug: "stripe", brand: "Stripe", dur: "0:45" },
  { slug: "argus-launch", brand: "Argus", dur: "0:23" },
  { slug: "threadcite-open", brand: "ThreadCite", dur: "0:30" },
  { slug: "plinth-ad", brand: "Plinth", dur: "0:27" },
];

// `scene` names the JSON the "view source" link opens, defaulting to `showcase-<src>`. It is set to
// null for tiles whose scene may NOT be published: site-engine ships every asset a published scene
// references, and the gradient and ransom packs are licensed for use but not for redistribution.
// The rendered mp4 is a use of them; shipping the source files themselves would not be. The page
// says this out loud under the grid rather than leaving two tiles quietly missing a link.
type Cap = { title: string; tag: string; src: string; scene?: string | null };

const CAPS: Cap[] = [
  { title: "Kinetic type", tag: "preset: up · decode · gradient", src: "type" },
  { title: "Cuts", tag: "cut: whip · punch · spin · zoom", src: "cuts" },
  { title: "GPU stings", tag: "sting: flash · glitch · scan · ripple", src: "stings" },
  { title: "Charts that draw", tag: "block: lineChart · statBig · kpiRow", src: "data" },
  { title: "Product demos", tag: "block: browserFrame · cursor · toast", src: "ui" },
  { title: "Grades", tag: "filter: thermal · nightVision · filmNoir", src: "looks", scene: "looks" },
  { title: "Ransom notes", tag: "ransom: paper · color · sprites", src: "ransom", scene: null },
  { title: "Ordered dither", tag: "canvasFx: dither · bayer", src: "dither", scene: "ditherkit" },
  { title: "Gradient fields", tag: "image: ken burns · radius", src: "gradients", scene: null },
];

// THE FAN. Five stills, not nine: nine of the capability posters read as a stack of thumbnails
// because five of the nine are a short line of type on an almost-empty field (`type`, `cuts`,
// `stings`, `data`, `ransom` were all opened and checked, not assumed from their names or their
// own capability's title). A card this small has to be full of picture to read as a picture, so
// the fan keeps only the four capability stills that already are (a browser frame mid-toast, a
// full-bleed thermal portrait, a dark dither area-chart, a saturated gradient card) and borrows
// one more from the films: `plinth-ad`'s dense earnings list is fuller than any of the five it
// would otherwise need to stand in for. That still reappears in the film grid below, which is a
// real repeat and the reason it is one card, not two.
type FanCard = { id: string; jpg: string; href: string; alt: string; bubble?: string; bubbleGhost?: boolean };

const FAN: FanCard[] = [
  { id: "dither", jpg: "/assets/showcase/dither.jpg", href: "#cap-dither", alt: "Ordered dither" },
  { id: "ui", jpg: "/assets/showcase/ui.jpg", href: "#cap-ui", alt: "Product demos", bubble: "product demos" },
  { id: "looks", jpg: "/assets/showcase/looks.jpg", href: "#cap-looks", alt: "Color grades", bubble: "color grades", bubbleGhost: true },
  { id: "plinth-ad", jpg: "/assets/films/plinth-ad.jpg", href: "#film-plinth-ad", alt: "Plinth, a full launch film" },
  { id: "gradients", jpg: "/assets/showcase/gradients.jpg", href: "#cap-gradients", alt: "Gradient fields" },
];

// The fan's vertical curve: the middle card rides highest, the two ends sit on the baseline.
// Five points of 1-((i-2)/2)^2, not a formula in CSS, because calc() has no pow() we can rely
// on everywhere yet, and five numbers are cheaper than a polyfill.
const FAN_LIFT = [0, 0.75, 1, 0.75, 0];

function fanVars(i: number): CSSProperties {
  return { "--i": i, "--liftf": FAN_LIFT[i] } as CSSProperties;
}

function FilmTile({ film }: { film: Film }) {
  return (
    <figure className="film" id={`film-${film.slug}`}>
      <div className="fmedia">
        <Clip src={`/assets/films/${film.slug}.mp4`} poster={`/assets/films/${film.slug}.jpg`} />
      </div>
      <figcaption>
        <span className="fbrand">{film.brand}</span>
        <span className="fdur">{film.dur}</span>
        <SourceViewer name={film.slug} lines={lineCount(film.slug)} />
      </figcaption>
    </figure>
  );
}

export default function Showcase() {
  const [hero, ...rest] = FILMS;

  return (
    <div className="shell">
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
        {/* THE OPENING. One headline, a fan of five capability stills, then the ask. This is the
            only thing on the page that moves on load: everything below is a static gallery, so
            the one deliberate piece of motion earns the top of the page instead of competing
            with five other things doing it too. */}
        <section className="hero-open">
          <h1 className="hero-open-h1">
            Nine looks.
            <br />
            One JSON each.
          </h1>

          {/* .fan-wrap, not .fan, is the positioned ancestor the pills measure against. .fanitem
              carries a `transform` (the entrance animation), and a transformed element becomes
              the containing block for its own absolutely-positioned descendants, same as
              `position:relative` would. A pill nested inside .fanitem was measuring itself
              against that small, rotated box instead of the fan, and landed off-screen. Keeping
              the pills as .fan's siblings, not .fanitem's children, is the fix, not a patch on
              top of the bug. */}
          <div className="fan-wrap">
            <ul className="fan">
              {FAN.map((c, i) => (
                <li className="fanitem" key={c.id} style={fanVars(i)}>
                  {/* Decoration would be five tab stops going nowhere. These go somewhere: the
                      same still, full-size, further down the page. */}
                  <Link className="fancard" href={c.href} aria-label={`${c.alt}. Jump to it below.`}>
                    <img src={c.jpg} alt="" />
                  </Link>
                </li>
              ))}
            </ul>
            {FAN.map((c, i) =>
              c.bubble ? (
                <span
                  key={c.id}
                  className={`fanpill${c.bubbleGhost ? " fanpill-ghost" : ""}`}
                  style={fanVars(i)}
                  aria-hidden="true"
                >
                  {c.bubble}
                </span>
              ) : null,
            )}
          </div>

          <p className="hero-open-sub">
            Nine different capabilities, every one rendered from the same JSON scene format.
          </p>

          <div className="hero-cta hero-open-cta">
            <Link className="btn btn-primary" href="/showcase/effects">
              {EFFECTS.total} effects, indexed
            </Link>
            <Link className="btn btn-ghost" href="/editor">
              Try the editor
            </Link>
          </div>
        </section>

        {/* One headline, no lead. The film below it is the lead. */}
        <section className="films">
          <h2 className="films-h1">
            <span className="kicker">
              <span className="dot" /> showcase
            </span>
            Six brands. One JSON each.
          </h2>
          {/* The one fact a clip cannot show. It used to sit on all six cards as the word
              `reflected`, which is six repeats of one idea; it belongs here once. */}
          <p className="scsub">Each one reflected from the brand&rsquo;s own site.</p>

          <div className="filmgrid">
            <div className="film-hero">
              <FilmTile film={hero} />
            </div>
            {rest.map((f) => (
              <FilmTile film={f} key={f.slug} />
            ))}
          </div>
        </section>

        <div className="cap-lead">
          <h2>And every part, on its own.</h2>
          {/* Nine clips are the tour, not the vocabulary: the engine registers 518 effects. An
              author needs the index open beside them, so it gets the strongest link on the page. */}
          <Link className="cap-index" href="/showcase/effects">
            <span className="cap-index-n">{EFFECTS.total}</span>
            <span>
              <b>Every effect, indexed</b>
              <span>{EFFECTS.families} families, with the JSON for each.</span>
            </span>
            <span className="cap-index-go" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="capgrid">
          {CAPS.map((c) => (
            <figure className="capcard" id={`cap-${c.src}`} key={c.src}>
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
          Two ship without source. The gradient and ransom packs are licensed for use, not for
          redistribution.
        </p>

        {/* Full width, not a half-column. In the two-up row this beat put a 9:16 clip at 63px
            wide, so the one thing it claims to prove (same scene, three crops) was unprovable.
            Three ratios side by side need the whole measure. */}
        <div className="aspects">
          <h2>One scene, every ratio.</h2>
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
          </div>
        </section>
        </main>

        <Footer note="every clip is one JSON scene" />
      </div>
    </div>
  );
}
