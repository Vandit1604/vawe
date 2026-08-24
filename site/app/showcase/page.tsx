import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { SourceViewer } from "../components/SourceViewer";
import { ShowcaseRail, type Category } from "./ShowcaseRail";
import { resolveTag } from "./tagLinks";
import LINES from "../../lib/scene-lines.json";
import EFFECTS from "../../lib/effects-counts.json";
import TYPE_CATALOGUE from "../../lib/type-specimens.json";
import "./showcase.css";

const TYPE_SPECIMENS = (TYPE_CATALOGUE as { counts: { specimens: number } }).counts.specimens;

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

export const metadata: Metadata = {
  title: "Vawe · showcase",
  description:
    "What Vawe can render: kinetic typography, transitions, shader stings, data stories, product UI, and any aspect ratio. Every clip is one JSON scene.",
};

/* A COMPONENT LIBRARY, not a gallery with a poster hero.
 *
 * The page carried a hero of five STILL images fanned like a hand of cards. It looked good and did
 * nothing this page's own medium (video) doesn't do better: five jpgs ahead of eighteen real clips
 * told a visitor the important thing here is a picture, then spent the next two screens proving
 * that's wrong. Cut, not shrunk — a smaller deck of stills is still stills first. What replaced it
 * is one headline and a subline; the first thing that moves on this page is now the first film.
 *
 * The other half of the rebuild follows /showcase/effects, which already went from a flat scroll to
 * a rail-plus-work layout this week: a sticky left column names every category and the entries in
 * it (ShowcaseRail), the catalog sits on the right, and a capability's tag now LINKS to the real
 * effect pages it names (tagLinks.ts) instead of repeating their names as inert mono text.
 */

type Film = { slug: string; brand: string; dur: string; template?: boolean };

// Two of these used to be pixel recreations of other companies' marketing pages, shipped whole:
// their headlines, their gradients, their copy. A recreation is also useless to anybody else, because
// a finished film of someone else's website is not a starting point. Both were converted rather than
// deleted: same composition, same timing, same camera, same beat structure, with the borrowed
// identity taken out and the copy, palette and mark made fillable. They are the templates below.
const FILMS: Film[] = [
  { slug: "creed-launch", brand: "Creed", dur: "0:53" },
  { slug: "saas-hero-launch", brand: "SaaS hero launch", dur: "0:45", template: true },
  { slug: "product-feature-tour", brand: "Product feature tour", dur: "0:50", template: true },
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

type Ratio = { id: string; slug: string; label: string; cls: string };

const RATIOS: Ratio[] = [
  { id: "ratio-169", slug: "aspect-169", label: "16:9", cls: "a169" },
  { id: "ratio-916", slug: "aspect-916", label: "9:16", cls: "a916" },
  { id: "ratio-11", slug: "aspect-11", label: "1:1", cls: "a11" },
];

const CATEGORIES: Category[] = [
  { id: "cat-films", title: "Launch films", entries: FILMS.map((f) => ({ id: `film-${f.slug}`, label: f.brand })) },
  { id: "cat-caps", title: "Capabilities", entries: CAPS.map((c) => ({ id: `cap-${c.src}`, label: c.title })) },
  { id: "cat-ratios", title: "Ratios", entries: RATIOS.map((r) => ({ id: r.id, label: r.label })) },
];

function FilmTile({ film }: { film: Film }) {
  return (
    <figure className="film" id={`film-${film.slug}`}>
      <div className="fmedia">
        <Clip src={`/assets/films/${film.slug}.mp4`} poster={`/assets/films/${film.slug}.jpg`} />
      </div>
      <figcaption>
        <span className="fbrand">{film.brand}</span>
        <span className="fdur">{film.template ? `template · ${film.dur}` : film.dur}</span>
        <SourceViewer name={film.slug} lines={lineCount(film.slug)} />
      </figcaption>
    </figure>
  );
}

// Turns "preset: up · decode · gradient" into the prefix plus a run of names, each linked to its
// real effect page where one resolved (tagLinks.ts) and left as plain text where it didn't — never
// a link to a page that isn't there.
function CapTag({ tag }: { tag: string }) {
  const { prefix, segments } = resolveTag(tag);
  return (
    <span className="tag captag">
      {prefix}:{" "}
      {segments.map((s, i) => (
        <span key={s.text}>
          {i > 0 && " · "}
          {s.href ? <Link href={s.href}>{s.text}</Link> : s.text}
        </span>
      ))}
    </span>
  );
}

export default function Showcase() {
  const [hero, ...rest] = FILMS;

  return (
    <div className="shell">
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> showcase
            </span>
            <h1>No house style. One JSON format.</h1>
            <p>
              Six films, two of them fillable templates, plus nine capabilities and every aspect
              ratio, browsable like a component library. {EFFECTS.total} effects sit under all of it.
            </p>
          </section>

          <div className="sclayout">
            <div className="scrailcol">
              <ShowcaseRail categories={CATEGORIES} />
            </div>

            <div className="sclist">
              <section className="films">
                <h2 className="films-h1">Six films.</h2>
                {/* The one fact a clip cannot show. It used to sit on all six cards as the word
                    `reflected`, which is six repeats of one idea; it belongs here once. */}
                <p className="scsub">
                  Four are real products. Two are templates: open the JSON, swap the copy and the
                  theme, keep the film.
                </p>

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
                {/* Nine clips are the tour, not the vocabulary: the engine registers {EFFECTS.total}
                    effects. An author needs the index open beside them, so it gets the strongest
                    link on the page. */}
                <Link className="cap-index" href="/showcase/effects">
                  <span className="cap-index-n">{EFFECTS.total}</span>
                  <span className="cap-index-text">
                    <b>Every effect, indexed</b>
                    <span>{EFFECTS.families} families, with the JSON for each.</span>
                  </span>
                  <span className="cap-index-go" aria-hidden="true">→</span>
                </Link>
                {/* /type moved under /showcase this pass, for the reason showcase/effects/page.tsx
                    already argues: it is this same question asked exhaustively about one layer, and
                    as a sixth nav item it made a visitor guess which entry held what they wanted.
                    Leaving the nav means it needs a door, and this is where a reader is already
                    looking for the exhaustive version. */}
                <Link className="cap-index" href="/showcase/type">
                  <span className="cap-index-n">{TYPE_SPECIMENS}</span>
                  <span className="cap-index-text">
                    <b>Every type specimen, moving</b>
                    <span>Grouped by the job, each one playable in the real engine.</span>
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
                      <CapTag tag={c.tag} />
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
                  {RATIOS.map((r) => (
                    <figure className={`ar ${r.cls}`} id={r.id} key={r.id}>
                      <Clip src={`/assets/showcase/${r.slug}.mp4`} poster={`/assets/showcase/${r.slug}.jpg`} />
                      <figcaption>{r.label}</figcaption>
                    </figure>
                  ))}
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
            </div>
          </div>
        </main>

        <Footer note="every clip is one JSON scene" />
      </div>
    </div>
  );
}
