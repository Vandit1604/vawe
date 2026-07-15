import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Vawe — showcase",
  description:
    "What Vawe can render: kinetic typography, transitions, shader stings, data stories, product UI, and any aspect ratio. Every clip is one JSON scene.",
};

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
