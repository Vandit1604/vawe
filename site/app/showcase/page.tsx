import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Vawe — showcase",
  description:
    "What Vawe can render: kinetic typography, transitions, shader stings, data stories, product UI, and any aspect ratio. Every clip is one JSON scene.",
};

type Film = { slug: string; brand: string; dur: string; line: string; tag: string };

const FILMS: Film[] = [
  { slug: "linear-launch", brand: "Linear", dur: "0:50", line: "The product development system for teams and agents. A dark, keynote-register film: an agent session runs live, then Start building.", tag: "reflected · dark + iris" },
  { slug: "stripe", brand: "Stripe", dur: "0:45", line: "Financial infrastructure to grow your revenue. The signature gradient mesh, a one-tap payment, a Payment complete.", tag: "reflected · gradient mesh" },
  { slug: "argus-launch", brand: "Argus", dur: "0:23", line: "Posting into the void becomes grow on X, on purpose. An X-native waitlist teaser, drafted in your voice.", tag: "reflected · white + cobalt" },
  { slug: "creed-launch", brand: "Creed", dur: "0:53", line: "Every agent forgets who you are. A constellation of AI tools resolves into one memory file: stop starting from scratch.", tag: "reflected · white + ember" },
];

type Row = { num: string; title: string; body: string; tag: string; src: string; flip?: boolean };

const ROWS: Row[] = [
  { num: "01 / kinetic type", title: "Type that moves like it reads.", tag: "preset: up · decode · gradient", src: "type", body: "Split by word or character, each line enters on its own preset, rise to decode to a focus-and-hold. The motion is part of the meaning." },
  { num: "02 / transitions", title: "Cuts with intent.", tag: "cut: whip · punch · spin · zoom", src: "cuts", flip: true, body: "Whip, punch, spin, zoom. One cut family per film, chosen by the motion director, each covered by a whoosh from the sound library." },
  { num: "03 / shader stings", title: "GPU stings between beats.", tag: "sting: flash · glitch · scan · ripple", src: "stings", body: "Flash, glitch, scan, ripple. Real fragment shaders keyed on (progress, seed) only, so they are seek-safe and byte-reproducible." },
  { num: "04 / data story", title: "Charts that draw themselves.", tag: "block: lineChart · statBig · kpiRow", src: "data", flip: true, body: "A line chart draws on, a number counts up, KPIs land. The easing is the story. All from a data array in the scene JSON." },
  { num: "05 / product UI", title: "Product demos, rebuilt.", tag: "block: browserFrame · cursor · toast", src: "ui", body: "A dashboard inside a browser frame, a cursor that glides in and clicks, and the click has a consequence: a toast confirms the render." },
];

export default function Showcase() {
  return (
    <>
      <Header active="showcase" />
      <div className="wrap">
        <section className="phead">
          <span className="kicker">
            <span className="dot" /> showcase
          </span>
          <h1>What one JSON can render.</h1>
          <p>Every clip below is a single self-describing scene, rendered deterministically, scored automatically. No timeline, no editor.</p>
        </section>

        <section className="films">
          <div className="films-head">
            <h2>Four brands, four films.</h2>
            <p>End-to-end launch films, each authored as one JSON scene from the brand&apos;s own site: reflected colours, real UI, motion in the brand&apos;s own personality. No two look alike.</p>
          </div>
          <div className="filmgrid">
            {FILMS.map((f) => (
              <figure className="filmcard" key={f.slug}>
                <div className="fmedia">
                  <video src={`/assets/films/${f.slug}.mp4`} poster={`/assets/films/${f.slug}.jpg`} autoPlay loop muted playsInline />
                </div>
                <figcaption>
                  <div className="fbrand">
                    {f.brand}
                    <span className="fdur">{f.dur}</span>
                  </div>
                  <div className="fline">{f.line}</div>
                  <span className="tag">{f.tag}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="cap-lead">
          <div className="num">the vocabulary</div>
          <h2>And every part, on its own.</h2>
          <p>The films above are composed from these primitives. Each one is a capability you can reach for by name.</p>
        </div>

        <main>
          {ROWS.map((r) => (
            <div className={r.flip ? "row flip" : "row"} key={r.src}>
              <div className="media">
                <video src={`/assets/showcase/${r.src}.mp4`} poster={`/assets/showcase/${r.src}.jpg`} autoPlay loop muted playsInline />
              </div>
              <div className="copy">
                <div className="num">{r.num}</div>
                <h2>{r.title}</h2>
                <p>{r.body}</p>
                <span className="tag">{r.tag}</span>
              </div>
            </div>
          ))}

          <div className="row flip">
            <div className="media">
              <div className="trio">
                <div className="ar a169">
                  <video src="/assets/showcase/aspect-169.mp4" poster="/assets/showcase/aspect-169.jpg" autoPlay loop muted playsInline />
                  <span>16:9</span>
                </div>
                <div className="ar a916">
                  <video src="/assets/showcase/aspect-916.mp4" poster="/assets/showcase/aspect-916.jpg" autoPlay loop muted playsInline />
                  <span>9:16</span>
                </div>
                <div className="ar a11">
                  <video src="/assets/showcase/aspect-11.mp4" poster="/assets/showcase/aspect-11.jpg" autoPlay loop muted playsInline />
                  <span>1:1</span>
                </div>
              </div>
            </div>
            <div className="copy">
              <div className="num">06 / any aspect</div>
              <h2>One scene, every ratio.</h2>
              <p>Relative coordinates resolve per aspect: pin, a 12-column grid, optical centering. Render 16:9, 9:16, and 1:1 from the same source, in one pass.</p>
              <span className="tag">--aspect 16:9,9:16,1:1</span>
            </div>
          </div>
        </main>

        <section className="section end">
          <h2 className="h2">
            Compose your own, in <span className="accent">JSON</span>.
          </h2>
          <div className="hero-cta">
            <a className="btn btn-primary" href="https://github.com/Vandit1604/vawe">
              Get early access
            </a>
            <Link className="btn btn-ghost" href="/">
              ← Back home
            </Link>
          </div>
        </section>

        <Footer note="every clip is one JSON scene" />
      </div>
    </>
  );
}
