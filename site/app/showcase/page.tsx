import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { FilmGrid } from "../components/FilmGrid";
import { SourceViewer } from "../components/SourceViewer";
import { pageMetadata } from "../components/seo";
import LINES from "../../lib/scene-lines.json";
import "./showcase.css";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

export const metadata = pageMetadata({
  title: "Vawe · films",
  description:
    "Films made with vawe, played live in your browser from their scene files. Hover a film to play it, or open its JSON in the editor.",
  path: "/showcase",
});

const RATIOS = [
  { slug: "aspect-169", label: "16:9", cls: "a169" },
  { slug: "aspect-916", label: "9:16", cls: "a916" },
  { slug: "aspect-11", label: "1:1", cls: "a11" },
];

export default function Showcase() {
  return (
    <div className="shell">
      <Header active="showcase" />
      <main className="wrap" id="content" tabIndex={-1}>
        <section className="ls ls-top">
          <h1>Films, played from their scene files.</h1>
          <p className="ls-sub">
            Your browser renders each film live from its JSON. Hover or tap a film to play it.
          </p>
          <FilmGrid />
        </section>

        <section className="ls" id="ratios">
          <h2>One scene, every ratio.</h2>
          <p className="ls-sub">The same file, rendered to three canvases with one flag.</p>
          <div className="panel sc-ratios">
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
        </section>
      </main>
      <Footer bookend active="/showcase" />
    </div>
  );
}
