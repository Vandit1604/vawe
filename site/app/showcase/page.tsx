import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { FilmGrid } from "../components/FilmGrid";
import { pageMetadata } from "../components/seo";
import "./showcase.css";

export const metadata = pageMetadata({
  title: "Vawe · films",
  description:
    "Films rendered by vawe. Hover a film to play it, or click it to watch it large.",
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
          <h1>Films rendered by vawe.</h1>
          <p className="ls-sub">
            Hover a film to play it, or click it to watch it large.
          </p>
          <FilmGrid />
        </section>

        <section className="ls" id="ratios">
          <h2>One film, every ratio.</h2>
          <p className="ls-sub">The same source, rendered to three canvases with one flag.</p>
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
              <span className="tag">--aspect all</span>
            </div>
          </div>
        </section>
      </main>
      <Footer bookend active="/showcase" />
    </div>
  );
}
