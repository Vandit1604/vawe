import Link from "next/link";
import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import films from "../../lib/films.json";
import { SourceViewer } from "../components/SourceViewer";
import { pageMetadata } from "../components/seo";
import LINES from "../../lib/scene-lines.json";
import { videoObjectSchema, jsonLdScript } from "../../lib/schema";
import "./showcase.css";
import "../components/intent.css";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

export const metadata = pageMetadata({
  title: "Vawe · showcase",
  description:
    "What the engine made: one scene cropped to three canvases today, with baseline launch films on the way, each one a JSON file you can open in the editor.",
  path: "/showcase",
});

/* /showcase · WHAT THE ENGINE MADE. Nothing else.
 *
 * It used to be a hub: six films, then nine capability clips, then two cards pointing at
 * /showcase/effects and /showcase/type. Those two pages folded into /arsenal this pass, so the
 * cards pointed at 308s, and the nine capability clips were a hand-picked index over a library
 * /arsenal now indexes in full with a search box. Nine of 743 entries, chosen once and never
 * re-chosen, is not a smaller catalog, it is a worse one. Both are gone: /arsenal is what the
 * engine is made of, this page is what it made, and the split is now clean enough to state.
 *
 * The rail went with them. A sticky column of contents earns its width over dozens of headings;
 * over two it is chrome sitting beside the films, and the films are the content. Dropping it also
 * hands the grid the whole 1160px measure, which is the one thing a page of video actually wants.
 */

type Film = { slug: string; brand: string; template?: boolean };

// THE DURATION IS READ FROM THE FILM, NEVER TYPED. Each `dur` used to sit in the array below and go
// stale the moment a film was recut: `preface-launch` went from 53s to 36s and this page said 0:53,
// `plinth-ad` said 0:27 against a 0:28 render. Same class as the eight stale counts `site-counts`
// exists to catch. `scripts/site/films-json.mjs` ffprobes the mp4s the site actually serves.
const durOf = (slug: string) => (films as Record<string, { label: string }>)[slug]?.label ?? "";

// EMPTY ON PURPOSE. The six films this page used to list could not be re-rendered from their
// source and four carried paths broken by the films rename, so none of them represented the
// engine honestly. They were removed rather than patched over. This array is the one place a new
// baseline film gets added once it is authored, reviewed and approved; nothing stands in for it
// until then.
const FILMS: Film[] = [];

const RATIOS = [
  { slug: "aspect-169", label: "16:9", cls: "a169" },
  { slug: "aspect-916", label: "9:16", cls: "a916" },
  { slug: "aspect-11", label: "1:1", cls: "a11" },
];

function FilmTile({ film }: { film: Film }) {
  return (
    <figure className="film">
      <div className="fmedia">
        <Clip src={`/assets/films/${film.slug}.mp4`} poster={`/assets/films/${film.slug}.jpg`} />
      </div>
      <figcaption>
        <span className="fbrand">{film.brand}</span>
        <span className="fdur">{film.template ? `template · ${durOf(film.slug)}` : durOf(film.slug)}</span>
        <SourceViewer name={film.slug} lines={lineCount(film.slug)} />
      </figcaption>
    </figure>
  );
}

export default function Showcase() {
  const [hero, ...rest] = FILMS;
  const hasFilms = FILMS.length > 0;
  // One VideoObject per film that genuinely has a duration on file (films.json), carrying the real
  // publish date that file also records. See the comment on videoObjectSchema in lib/schema.ts.
  const videoSchemas = FILMS
    .map((f) => (films as Record<string, { seconds: number; published?: string }>)[f.slug])
    .map((entry, i) => (entry
      ? videoObjectSchema({ slug: FILMS[i].slug, brand: FILMS[i].brand, seconds: entry.seconds, published: entry.published })
      : null))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <div className="shell">
      {videoSchemas.map((v, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(v)} />
      ))}
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> showcase
            </span>
            <h1>No house style. One JSON format.</h1>
            <p>
              A film in this engine is a single text file. Open it in the editor and the scene
              that made it is the thing you edit.
            </p>
            <div className="irelated">
              <a href="/launch-video">Making a product launch video? Start here.</a>
              <a href="/product-tour-video">A feature tour with more than one thing to show?</a>
            </div>
          </section>

          <section className="films">
            {hasFilms ? (
              <>
                <h2 className="h2">Films.</h2>
                <div className="filmgrid">
                  <div className="film-hero">
                    <FilmTile film={hero} />
                  </div>
                  {rest.map((f) => (
                    <FilmTile film={f} key={f.slug} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="h2">No films yet.</h2>
                <p className="scsub">
                  The films that used to sit here could not be re-rendered from their source, so
                  they came down rather than stay stale. New baseline films go here once they are
                  authored, approved and rendered. Until then, the scene below is the real proof:
                  one JSON file, three canvases, cropped from the same render.
                </p>
              </>
            )}
          </section>

          {/* Full width, not a half-column. In the two-up row this beat put a 9:16 clip at 63px
              wide, so the one thing it claims to prove (same scene, three crops) was unprovable.
              Three ratios side by side need the whole measure. */}
          <div className="aspects">
            <h2>One scene, every ratio.</h2>
            <div className="trio">
              {RATIOS.map((r) => (
                <figure className={`ar ${r.cls}`} key={r.slug}>
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

          <section className="scend">
            <h2 className="h2">
              Compose your own, in <span className="accent">JSON</span>.
            </h2>
            {/* Two doors, not two index cards. The pair the cut capability grid used to point at
                (/showcase/effects, /showcase/type) is one page now, so one link reaches it. */}
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/editor">
                Try the editor
              </Link>
              <Link className="btn btn-ghost" href="/arsenal">
                Browse the arsenal
              </Link>
            </div>
          </section>
        </main>

        <Footer note="every clip is one JSON scene" active="/showcase" />
      </div>
    </div>
  );
}
