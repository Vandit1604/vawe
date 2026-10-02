import Link from "next/link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { CSS, EASES, FAMILIES, STATS, VAWE, classicIn, itemListSchema, speedText, type Ease } from "../../lib/easing";
import { Thumb } from "./Charts";
import "./easing.css";

export const metadata = pageMetadata({
  title: "Easing functions: CSS cubic-bezier, linear() and After Effects handles | vawe",
  description: `${EASES.length} easing functions as CSS: curve, velocity, cubic-bezier, exact linear() string and a live demo. Nine from After Effects handles.`,
  path: "/easing",
});

const FAMILY_NOTE: Record<string, string> = {
  sine: "The gentlest curves.",
  quad: "Mild and even.",
  cubic: "The usual default.",
  quart: "A strong ease.",
  quint: "A very strong ease.",
  expo: "An extreme ease.",
  circ: "A geometric, wall-like stop.",
  back: "Passes or pulls past its ends.",
  elastic: "Rings around the end value.",
  bounce: "Rebounds off the end value.",
};

const num = (n: number) => n.toLocaleString("en-US");
const pct = (u: number) => `${Math.round(u * 100)}%`;

function Card({ e }: { e: Ease }) {
  return (
    <li className="panel ez-card">
      <Thumb e={e} />
      <Link href={`/easing/${e.slug}`} prefetch={false}>{e.name}</Link>
      <span className="meta">50% at {pct(e.t50)} / peak {speedText(e).replace(" (it ends vertically)", "").replace("over ", ">")}</span>
    </li>
  );
}

export default function EasingIndex() {
  return (
    <div className="shell">
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(itemListSchema())} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Easing", url: "/easing" }]))} />
        <div className="ez">
          <header className="phead ez-head">
            <p className="kicker"><span>Easing</span></p>
            <h1>Easing functions as CSS</h1>
            <p className="ez-sum">
              {EASES.length} easing curves, each with its progress curve, its velocity curve, a live demo and the code to copy: the CSS <code>linear()</code> string, the nearest <code>cubic-bezier()</code>, and the Web Animations line. Every number on these pages is computed from the vawe motion library.
            </p>
            <p className="meta ez-meta">
              <a href="#vawe">vawe After Effects eases</a>
              <a href="#css">CSS keywords</a>
              <a href="#classic">Classic eases</a>
            </p>
          </header>

          <section className="panel ez-intro" aria-labelledby="why">
            <h2 id="why">Why vawe uses After Effects speed and influence</h2>
            <p>
              A <code>cubic-bezier()</code> is four numbers with no meaning you can read. An After Effects keyframe has two handles with two meanings each. <strong>Influence</strong> is how far along the segment the handle reaches, in per cent of its duration. <strong>Speed</strong> is the pace at the key, as a multiple of the segment&apos;s average. A designer can say &ldquo;leave fast, arrive on a long soft stop&rdquo; and set two handles.
            </p>
            <p>
              We read the handles of {num(STATS.lottieSegments)} real segments from Lottie files and {STATS.hfSegments} from HyperFrames blocks. The nine vawe names are the pairs that real work uses. Each is exact as a cubic bezier and ships as a <code>linear()</code> string that runs in any browser.
            </p>
            <ul className="ez-facts">
              <li><b>{Math.round(STATS.defaultShare)}%</b><span>of segments keep both handles at an After Effects default, linear or Easy Ease. {num(STATS.tunedSegments)} are tuned.</span></li>
              <li><b>{Math.round(STATS.entranceStopShare)}%</b><span>of the {STATS.entranceSegments} entrances end on a long dead stop (influence 55 or more, speed 0).</span></li>
              <li><b>{STATS.exitsFasterThan15}</b><span>of the {STATS.exitSegments} exits end faster than 1.5x the average. Real exits slow down.</span></li>
              <li><b>{num(STATS.lottieHandles)}</b><span>handles measured, from Apache-2.0 and MIT Lottie sources.</span></li>
            </ul>
          </section>

          <section className="ez-group" id="vawe" aria-labelledby="g-vawe">
            <h2 id="g-vawe">vawe After Effects eases</h2>
            <p>Nine names for nine handle pairs, used as <code>EASE.land</code> in a page. Each page shows the handles and how many real segments sit near them.</p>
            <ul className="ez-grid-cards">{VAWE.map((e) => <Card key={e.slug} e={e} />)}</ul>
          </section>

          <section className="ez-group" id="css" aria-labelledby="g-css">
            <h2 id="g-css">CSS keywords</h2>
            <p>The five names CSS gives you without a function: <code>ease</code>, <code>ease-in</code>, <code>ease-out</code>, <code>ease-in-out</code> and <code>linear</code>.</p>
            <ul className="ez-grid-cards">{CSS.map((e) => <Card key={e.slug} e={e} />)}</ul>
          </section>

          <section className="ez-group" id="classic" aria-labelledby="g-classic">
            <h2 id="g-classic">Classic eases by family</h2>
            <p>The 30 Penner easings from easings.net: ten families in three directions. Eight families can be drawn by one <code>cubic-bezier()</code>; elastic and bounce cannot, so they ship as <code>linear()</code>.</p>
            <p className="ez-fam">{FAMILIES.map((f) => <a key={f} href={`#f-${f}`}>{f}</a>)}</p>
            {FAMILIES.map((f) => (
              <div key={f} id={`f-${f}`} className="ez-group" style={{ marginTop: 32 }}>
                <h3 className="meta" style={{ whiteSpace: "normal" }}>{f}: {FAMILY_NOTE[f]}</h3>
                <ul className="ez-grid-cards">{classicIn(f).map((e) => <Card key={e.slug} e={e} />)}</ul>
              </div>
            ))}
          </section>
        </div>
      </main>
      <Footer active="/easing" />
    </div>
  );
}
