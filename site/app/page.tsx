import Link from "next/link";
import { Header, REPO_URL } from "./components/Header";
import { Footer } from "./components/Footer";
import { Clip } from "./components/Clip";
import { LandingMotion } from "./components/LandingMotion";
import { organizationSchema, websiteSchema, softwareApplicationSchema, softwareSourceCodeSchema, jsonLdScript } from "../lib/schema";
import { faqSchema } from "../lib/schema-content";
import { FAQ } from "../lib/faq";
import { MOVES, clip, moveByName } from "../lib/moves";
import "./landing.css";

/* THE LANDING PAGE (site/IDENTITY.md, DESIGN.md "Landing"). A full-bleed film, four pinned chapters with
 * one large film each (problem, page, render, result), the page contract, the moves, questions, and the
 * way in. The films carry the story; the copy stays short.
 */

type Film = { webm: string; mp4: string; poster: string };

const example = (id: string): Film => ({ webm: `/examples/${id}.webm`, mp4: `/examples/${id}.mp4`, poster: `/examples/${id}.webp` });
const move = (name: string): Film => {
  const m = moveByName(name);
  if (!m) throw new Error(`landing: unknown move ${name}`);
  const f = clip(m);
  return { webm: f.webm, mp4: f.mp4, poster: f.poster };
};

const HERO = example("tracking-hud");

const CHAPTERS = [
  {
    id: "c1",
    tag: "01 / The problem",
    title: "A motion video takes an editor and a week.",
    text: "Timelines, keyframes, private project files. Nothing an agent can read, and nothing you can diff.",
    film: example("retro-remix"),
  },
  {
    id: "c2",
    tag: "02 / The page",
    title: "So write a page.",
    text: "HTML, CSS, Web Animations, SVG, canvas or three.js. You already know it. Nothing private to learn.",
    film: move("caret-typing"),
  },
  {
    id: "c3",
    tag: "03 / The render",
    title: "Time is the seek, not the clock.",
    text: "The renderer seeks the page to each frame and screenshots it. Frame 412 is the same frame on every run.",
    film: move("chain-beats"),
  },
  {
    id: "c4",
    tag: "04 / The result",
    title: "One mp4. Every canvas.",
    text: "16:9, 9:16, 1:1, 4:5 and 4:3 from the same page. Audio mixed offline.",
    film: move("match-cut"),
  },
];

const SHOWN_MOVES = ["text-on-path", "letter-stagger", "panel-live-sync", "integration-hub", "outline-fill", "iris-wipe"];

export default function Home() {
  return (
    <div className="shell home">
      {/* Organization, WebSite, SoftwareApplication and FAQPage, built in site/lib/schema.ts from real repo data. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(websiteSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareApplicationSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareSourceCodeSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqSchema())} />
      <Header overlay />
      <main className="lp" id="content" tabIndex={-1}>
        <nav className="lp-rail" aria-label="Chapters">
          {CHAPTERS.map((c) => (
            <a key={c.id} href={`#${c.id}`} aria-label={`Chapter ${c.tag.replace(" / ", ": ")}`} />
          ))}
        </nav>

        <section className="lp-hero" id="intro" aria-label="vawe">
          <div className="lp-frame lp-hero-frame">
            <Clip className="lp-film" webm={HERO.webm} src={HERO.mp4} poster={HERO.poster} decorative />
            <div className="lp-hero-copy">
              <h1 className="lp-display">
                <span className="mono lp-hero-brand">vawe · HTML to video for developers and AI agents</span>
                One page in.<br />One film out.
              </h1>
              <p className="lp-lede">Write one HTML page. vawe renders it to an mp4. You write the page, or an agent does.</p>
              <div className="lp-row">
                <a className="btn btn-primary" href={REPO_URL}>Get started on GitHub</a>
                <Link className="btn lp-btn-line" href="/moves">See the moves</Link>
              </div>
            </div>
          </div>
        </section>

        {CHAPTERS.map((c) => (
          <section className="lp-ch" id={c.id} key={c.id} aria-labelledby={`${c.id}-h`}>
            <div className="lp-stage">
              <div className="lp-pane lp-frame">
                <Clip className="lp-film" webm={c.film.webm} src={c.film.mp4} poster={c.film.poster} decorative />
                <p className="lp-tag mono">{c.tag}</p>
                <div className="lp-cap">
                  <h2 id={`${c.id}-h`}>{c.title}</h2>
                  <p>{c.text}</p>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="lp-how lp-gridlines" id="how" aria-labelledby="how-h">
          <div className="lp-rv">
            <h2 id="how-h">A film is one page.</h2>
            <pre className="lp-code" tabIndex={0} aria-label="A complete film page">
              <i>{"<!doctype html>\n<html data-aspect=\"16:9\">\n"}</i>
              <b>{"<meta"}</b>{" name=\"duration\" content=\"3\""}<b>{">"}</b>{"\n"}
              <b>{"<meta"}</b>{" name=\"message\" content=\"One page. One film.\""}<b>{">"}</b>{"\n"}
              <b>{"<style>"}</b>{"\n  body { margin: 0; display: grid; place-items: center start;\n         height: 100vh; padding-left: 8vw; background: #000; }\n  h1 { font: 800 9vh/1 system-ui; color: #fff;\n       animation: rise 0.7s cubic-bezier(.2,.8,.2,1) 0.3s both; }\n  @keyframes rise {\n    from { translate: 0 6vh; clip-path: inset(0 0 100% 0); }\n    to   { translate: 0 0;   clip-path: inset(0 0 0 0); }\n  }\n"}<b>{"</style>"}</b>{"\n"}
              <b>{"<h1>"}</b>{"One page. One film."}<b>{"</h1>"}</b>
            </pre>
            <p className="mono lp-code-note">films/hello/page.html</p>
          </div>
          <div className="lp-side lp-rv">
            <p>Open it in a browser and it plays. Hand it to vawe and it renders. A change to the motion is a diff you can read before it ships.</p>
            <div>
              <div className="lp-cmd"><span>$</span>bin/vawe new hello<em>a valid starter</em></div>
              <div className="lp-cmd"><span>$</span>bin/vawe dev films/hello/page.html<em>draft, 30 fps</em></div>
              <div className="lp-cmd"><span>$</span>bin/vawe ship films/hello/page.html<em>final, 60 fps</em></div>
            </div>
            <a className="btn lp-btn-line" href={REPO_URL}>Read the page contract</a>
          </div>
        </section>

        <div className="lp-moves-head" id="moves">
          <h2>{MOVES.length} moves to copy.</h2>
          <Link className="btn lp-btn-line" href="/moves">See every move</Link>
        </div>
        <section className="lp-grid" aria-label="Move clips">
          {SHOWN_MOVES.map((name) => {
            const m = moveByName(name);
            if (!m) return null;
            const f = clip(m);
            return (
              <Link className="lp-cell" href={`/moves/${m.name}`} key={m.name} prefetch={false}>
                <div className="lp-frame"><Clip className="lp-film" webm={f.webm} src={f.mp4} poster={f.poster} decorative /></div>
                <span className="mono">{m.title}</span>
              </Link>
            );
          })}
        </section>

        <section className="lp-faq" id="faq" aria-labelledby="faq-h">
          <h2 id="faq-h" className="lp-rv">Questions.</h2>
          <div className="lp-faq-list lp-rv">
            {FAQ.map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p>
                  {item.a.map((seg, j) => (typeof seg === "string" ? seg : <a key={j} href={seg.href}>{seg.text}</a>))}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-end lp-gridlines" aria-labelledby="end-h">
          <h2 id="end-h" className="lp-rv">Write the page.</h2>
          <div className="lp-row lp-rv">
            <a className="btn btn-primary" href={REPO_URL}>Get started on GitHub</a>
            <a className="btn lp-btn-line" href="/docs">Read the docs</a>
          </div>
          <div className="lp-install lp-rv">
            <div className="lp-cmd"><span>$</span>npm install<em>Node 22+, ffmpeg</em></div>
            <div className="lp-cmd"><span>$</span>bin/vawe doctor<em>checks each tool</em></div>
          </div>
        </section>
      </main>
      <LandingMotion />
      <Footer />
    </div>
  );
}
