import type { CSSProperties } from "react";
import Link from "next/link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { CSS, EASES, FAMILIES, STATS, VAWE, classicIn, copyIsBezier, copyValue, itemListSchema, roleOf, speedText, type Ease } from "../../lib/easing";
import { Thumb } from "./Charts";
import { Finder } from "./Finder";
import { Next } from "../components/Xp";
import "./easing.css";

export const metadata = pageMetadata({
  title: "Easing functions: CSS cubic-bezier, linear() and After Effects handles | vawe",
  description: `${EASES.length} easing functions as CSS: search, preview, compare and copy cubic-bezier or linear(). Nine are After Effects handles.`,
  path: "/easing",
});

const FAMILY_NOTE: Record<string, string> = {
  sine: "gentlest",
  quad: "mild",
  cubic: "common default",
  quart: "strong",
  quint: "very strong",
  expo: "extreme",
  circ: "wall-like stop",
  back: "passes or pulls past its ends",
  elastic: "rings around the end value",
  bounce: "rebounds off the end value",
};

const num = (n: number) => n.toLocaleString("en-US");
const pct = (u: number) => `${Math.round(u * 100)}%`;

function Card({ e }: { e: Ease }) {
  const bezier = copyIsBezier(e);
  const close = e.kind === "classic" && e.bezier.express === "close";
  return (
    <li
      className="panel ez-card"
      data-ez-card
      data-slug={e.slug}
      data-name={e.name}
      data-role={roleOf(e)}
      data-search={`${e.name} ${e.slug} ${e.family} ${roleOf(e)}`.toLowerCase()}
      style={{ "--ez": copyValue(e) } as CSSProperties}
    >
      <div className="ez-thumbwrap">
        <Thumb e={e} />
        <span className="ez-mini" aria-hidden="true"><i /></span>
      </div>
      <Link href={`/easing/${e.slug}`} prefetch={false}>{e.name}</Link>
      <span className="meta">50% at {pct(e.t50)} / peak {speedText(e).replace(" (it ends vertically)", "").replace("over ", ">")}</span>
      <div className="ez-card-act">
        <button type="button" className="ez-copy" data-label={bezier ? "Copy bezier" : "Copy linear()"} title={close ? `Nearest cubic-bezier fit, worst gap ${((e.bezier.worst ?? 0) * 100).toFixed(1)} points` : undefined}>{bezier ? "Copy bezier" : "Copy linear()"}</button>
        <button type="button" className="ez-pick" aria-pressed="false">Compare</button>
      </div>
    </li>
  );
}

export default function EasingIndex() {
  return (
    <div className="shell">
      <Header active="easing" />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(itemListSchema())} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Easing", url: "/easing" }]))} />
        <div className="ez">
          <header className="phead ez-head">
            <h1>Easing functions as CSS</h1>
            <p className="ez-sum">
              {EASES.length} curves. Hover a card to preview it, copy its <code>cubic-bezier()</code> or <code>linear()</code>, or compare up to three side by side. Open one for the exact <code>linear()</code>, the Web Animations line and the numbers.
            </p>
          </header>

          <Finder total={EASES.length}>
            <section className="ez-group" id="vawe" aria-labelledby="g-vawe" data-ez-group>
              <h2 id="g-vawe">vawe After Effects eases</h2>
              <p>Nine eases named by their After Effects handles. In a page: <code>EASE.land</code>.</p>
              <ul className="ez-grid-cards">{VAWE.map((e) => <Card key={e.slug} e={e} />)}</ul>
            </section>

            <section className="ez-group" id="css" aria-labelledby="g-css" data-ez-group>
              <h2 id="g-css">CSS keywords</h2>
              <ul className="ez-grid-cards">{CSS.map((e) => <Card key={e.slug} e={e} />)}</ul>
            </section>

            <section className="ez-group" id="classic" aria-labelledby="g-classic" data-ez-group>
              <h2 id="g-classic">Classic eases by family</h2>
              <p>The 30 Penner easings from easings.net. Elastic and bounce have no <code>cubic-bezier()</code> form, so they copy as <code>linear()</code>.</p>
              <p className="ez-fam">{FAMILIES.map((f) => <a key={f} href={`#f-${f}`}>{f}</a>)}</p>
              {FAMILIES.map((f) => (
                <div key={f} id={`f-${f}`} className="ez-group ez-group-tight" data-ez-group>
                  <h3 className="meta ez-h3">{f}: {FAMILY_NOTE[f]}</h3>
                  <ul className="ez-grid-cards">{classicIn(f).map((e) => <Card key={e.slug} e={e} />)}</ul>
                </div>
              ))}
            </section>
          </Finder>

          <details className="panel ez-why">
            <summary>How the vawe eases were chosen</summary>
            <p>
              A <code>cubic-bezier()</code> is four numbers. An After Effects keyframe has two handles. <strong>Influence</strong> is how far along the segment the handle reaches, in per cent of its duration. <strong>Speed</strong> is the pace at the key, as a multiple of the segment&apos;s average.
            </p>
            <p>
              The nine vawe eases are the handle pairs found in {num(STATS.lottieSegments)} Lottie segments and {STATS.hfSegments} HyperFrames segments. Each is exact as a cubic bezier and ships as a <code>linear()</code> string that runs in any browser.
            </p>
            <ul className="ez-facts">
              <li><b>{Math.round(STATS.defaultShare)}%</b><span>of segments keep both handles at an After Effects default, linear or Easy Ease. {num(STATS.tunedSegments)} are tuned.</span></li>
              <li><b>{Math.round(STATS.entranceStopShare)}%</b><span>of the {STATS.entranceSegments} entrances end on a long dead stop (influence 55 or more, speed 0).</span></li>
              <li><b>{STATS.exitsFasterThan15}</b><span>of the {STATS.exitSegments} exits end faster than 1.5x the average. Real exits slow down.</span></li>
              <li><b>{num(STATS.lottieHandles)}</b><span>handles measured, from Apache-2.0 and MIT Lottie sources.</span></li>
            </ul>
          </details>

          <Next
            title="Use an ease in a film"
            primary={{ href: "/moves", label: "See the moves" }}
            secondary={{ href: "/docs/motion", label: "Motion in the docs" }}
          />
        </div>
      </main>
      <Footer active="/easing" />
    </div>
  );
}
