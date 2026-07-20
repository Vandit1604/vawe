import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { SourceViewer } from "../components/SourceViewer";
import LINES from "../../lib/scene-lines.json";

const lineCount = (name: string) => (LINES as Record<string, number>)[name] ?? 0;

export const metadata: Metadata = {
  title: "Vawe · showcase",
  description:
    "What Vawe can render: kinetic typography, transitions, shader stings, data stories, product UI, and any aspect ratio. Every clip is one JSON scene.",
};

type Film = { slug: string; brand: string; dur: string; line: string; tag: string };

const FILMS: Film[] = [
  { slug: "linear-launch", brand: "Linear", dur: "0:50", line: "The product development system for teams and agents. A dark, keynote-register film: an agent session runs live, then Start building.", tag: "reflected · dark + iris" },
  { slug: "stripe", brand: "Stripe", dur: "0:45", line: "Financial infrastructure to grow your revenue. The signature gradient mesh, a one-tap payment, a Payment complete.", tag: "reflected · gradient mesh" },
  { slug: "argus-launch", brand: "Argus", dur: "0:23", line: "Posting into the void becomes grow on X, on purpose. An X-native waitlist teaser, drafted in your voice.", tag: "reflected · white + cobalt" },
  { slug: "creed-launch", brand: "Creed", dur: "0:53", line: "Every agent forgets who you are. A constellation of AI tools resolves into one memory file: stop starting from scratch.", tag: "reflected · white + ember" },
  { slug: "threadcite-open", brand: "ThreadCite", dur: "0:30", line: "Buyers ask Reddit, and AI answers with Reddit. Threads surfaced early, replies coached warm and ban-safe, and a map of where you show up.", tag: "reflected · white + orange" },
  { slug: "plinth-ad", brand: "Plinth", dur: "0:27", line: "Anyone calls it, you earn on every call. An MCP endpoint that meters itself, priced per request, paid out at eighty percent.", tag: "reflected · white + cobalt" },
];

// `scene` names the JSON the "view source" link opens, defaulting to `showcase-<src>`. It is set to
// null for rows whose scene may NOT be published: site-engine ships every asset a published scene
// references, and the gradient and ransom packs are licensed for use but not for redistribution.
// The rendered mp4 is a use of them; shipping the source files themselves would not be.
type Row = { num: string; title: string; body: string; tag: string; src: string; flip?: boolean; scene?: string | null };

const ROWS: Row[] = [
  { num: "01 / kinetic type", title: "Type that moves like it reads.", tag: "preset: up · decode · gradient", src: "type", body: "Split by word or character, each line enters on its own preset, rise to decode to a focus-and-hold. The motion is part of the meaning." },
  { num: "02 / transitions", title: "Cuts with intent.", tag: "cut: whip · punch · spin · zoom", src: "cuts", flip: true, body: "Whip, punch, spin, zoom. One cut family per film, chosen by the motion director, each covered by a whoosh from the sound library." },
  { num: "03 / shader stings", title: "GPU stings between beats.", tag: "sting: flash · glitch · scan · ripple", src: "stings", body: "Flash, glitch, scan, ripple. Real fragment shaders keyed on (progress, seed) only, so they are seek-safe and byte-reproducible." },
  { num: "04 / data story", title: "Charts that draw themselves.", tag: "block: lineChart · statBig · kpiRow", src: "data", flip: true, body: "A line chart draws on, a number counts up, KPIs land. The easing is the story. All from a data array in the scene JSON." },
  { num: "05 / product UI", title: "Product demos, rebuilt.", tag: "block: browserFrame · cursor · toast", src: "ui", body: "A dashboard inside a browser frame, a cursor that glides in and clicks, and the click has a consequence: a toast confirms the render." },
  { num: "06 / composite looks", title: "One frame, ten grades.", tag: "filter: thermal · nightVision · filmNoir", src: "looks", flip: true, scene: "looks", body: "The picture holds still and only the grade changes, so you can read what each one did: bloom off the highlights, phosphor scanlines, value stripped to mono, a heat palette remap. Each is one string on the layer, and a number after it sets the strength." },
  { num: "07 / cutout type", title: "Ransom notes, set per frame.", tag: "ransom: paper · color · sprites", src: "ransom", scene: null, body: "Every letter is a real scanned cutout, its face, tint and rotation picked from a seeded hash. The same seed gives the same note on every render, so the letters can keep changing without ever flickering." },
  { num: "08 / dithering", title: "Ordered dither, not a texture overlay.", tag: "canvasFx · baked offline", src: "dither", scene: "ditherkit", body: "A Bayer matrix fills a chart with real ordered dither, so it holds up in light and dark and never turns to mud once the video is compressed. Baked once at build, never at frame time." },
  { num: "09 / backdrops", title: "Gradient fields, baked cold.", tag: "image: ken burns · radius", src: "gradients", flip: true, scene: null, body: "A library of gradient backgrounds, downscaled once offline so no render ever decodes 4K it is about to throw away. Drop one under a scene and give it a slow push in." },
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
          <p>Every clip below is a single self-describing scene, rendered deterministically, scored automatically. No timeline, no editor. Hit <span className="mono">View source JSON</span> on any clip to read the exact scene that produced it, and copy it to start from.</p>
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
          <p>The films above are composed from these primitives. Each one is a capability you can reach for by name.</p>
        </div>

          {ROWS.map((r) => (
            <div className={r.flip ? "row flip" : "row"} key={r.src}>
              <div className="media">
                <Clip src={`/assets/showcase/${r.src}.mp4`} poster={`/assets/showcase/${r.src}.jpg`} />
              </div>
              <div className="copy">
                <div className="num">{r.num}</div>
                <h2>{r.title}</h2>
                <p>{r.body}</p>
                <span className="tag">{r.tag}</span>
                {r.scene !== null && (
                  <SourceViewer
                    name={r.scene ?? `showcase-${r.src}`}
                    lines={lineCount(r.scene ?? `showcase-${r.src}`)}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Full width, not a half-column. In the two-up row this beat put a 9:16 clip at 63px
              wide — you could not see the scene, so the one thing it claims to prove (same scene,
              three crops) was unprovable. Three ratios side by side need the whole measure. */}
          <div className="aspects">
            <div className="aspects-head">
              <div>
                <div className="num">10 / any aspect</div>
                <h2>One scene, every ratio.</h2>
              </div>
              <p>Relative coordinates resolve per aspect: pin, a 12-column grid, optical centering. Render 16:9, 9:16, and 1:1 from the same source, in one pass.</p>
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
