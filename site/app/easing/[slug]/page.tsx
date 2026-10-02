import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Clip } from "../../components/Clip";
import { pageMetadata } from "../../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../../lib/schema";
import { CopyCode } from "../../moves/[name]/CopyCode";
import { EASES, STATS, bezierText, camelOf, easeBySlug, importLine, pageDescription, pageTitle, speedText, summary, techArticleSchema, waapi, type Ease } from "../../../lib/easing";
import { CurveChart, VelocityChart } from "../Charts";
import "../../moves/moves.css";
import "../easing.css";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return EASES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Params) {
  const e = easeBySlug((await params).slug);
  if (!e) return {};
  return pageMetadata({ title: pageTitle(e), description: pageDescription(e), path: `/easing/${e.slug}` });
}

const GROUP = { vawe: "vawe After Effects eases", css: "CSS keywords", classic: "Classic eases" } as const;
const pct = (u: number) => `${Math.round(u * 100)}%`;
const num = (n: number) => n.toLocaleString("en-US");

function turns(y: number[]) {
  let n = 0, last = 0;
  for (let i = 1; i < y.length; i++) {
    const d = Math.sign(y[i] - y[i - 1]);
    if (d && last && d !== last) n++;
    if (d) last = d;
  }
  return n;
}

function Code({ label, text }: { label: string; text: string }) {
  return (
    <figure className="mv-code">
      <div className="mv-code-bar">
        <span>{label}</span>
        <button type="button" className="mv-copy" data-copy>Copy</button>
      </div>
      <pre><code>{text}</code></pre>
    </figure>
  );
}

const handleSpec = (h: { influence: number; speed: number; name: string | null }) => (h.name ? `'${h.name}'` : `{ influence: ${h.influence}, speed: ${h.speed} }`);

function BezierBlock({ e }: { e: Ease }) {
  if (e.kind === "vawe") {
    return (
      <>
        <Code label="cubic-bezier (exact)" text={`animation-timing-function: ${bezierText(e)};`} />
        <p className="ez-note">This ease is a cubic bezier by construction: the two After Effects handles are its two control points. The site ships the <code>linear()</code> string above because it is what the renderer and <code>EASE.{camelOf(e.slug)}</code> use.</p>
      </>
    );
  }
  const worst = e.bezier.worst ?? 0;
  if (e.kind === "css") return <Code label="cubic-bezier (the keyword's definition)" text={e.slug === "linear" ? "animation-timing-function: linear;\n/* the same as cubic-bezier(0, 0, 1, 1) */" : `animation-timing-function: ${bezierText(e)};`} />;
  if (e.bezier.express === "no") {
    const t = turns(e.y);
    return (
      <>
        <Code label="cubic-bezier: no usable fit" text={`/* Best single fit, off by up to ${(worst * 100).toFixed(0)} points of travel: ${bezierText(e)} */`} />
        <p className="ez-note">
          A <code>cubic-bezier()</code> has two control points and makes one smooth S. {e.name} changes direction {t} {t === 1 ? "time" : "times"}, so no four numbers draw it. Use the <code>linear()</code> string above.
        </p>
      </>
    );
  }
  return (
    <>
      <Code label={e.bezier.express === "exact" ? "cubic-bezier (matches within 0.5%)" : "cubic-bezier (nearest fit)"} text={`animation-timing-function: ${bezierText(e)};`} />
      <p className="ez-note">
        Least-squares fit to the {e.name} curve; the worst gap is {(worst * 100).toFixed(1)} points of travel. {e.bezier.express === "close" ? "It is close, not exact: use linear() when the end of the curve matters." : "The linear() string is exact."}
      </p>
    </>
  );
}

function Handles({ e }: { e: Ease }) {
  const h = e.handles;
  if (!h) return null;
  const s = h.shares;
  const row = (side: string, x: typeof h.out, share: number) => (
    <tr>
      <td>{side}</td>
      <td>{x.name ?? "custom"}</td>
      <td className="n">{x.influence}%</td>
      <td className="n">{x.speed}x</td>
      <td className="n">{share}%</td>
    </tr>
  );
  return (
    <section className="ez-sec" aria-labelledby="ae">
      <h2 id="ae">After Effects handles</h2>
      <p>
        One segment between two keys has two handles. In After Effects, open Keyframe Velocity on each key: the outgoing handle belongs to the first key and the incoming handle to the second. <strong>Influence</strong> is how far along the segment the handle reaches, in per cent of its duration. <strong>Speed</strong> is the pace at the key as a multiple of the segment&apos;s average (0 stops dead, 1 is straight).
      </p>
      <div className="ez-scroll">
        <table className="ez-table">
          <thead>
            <tr><th>Handle</th><th>Name</th><th>Influence</th><th>Speed</th><th>Real handles near it</th></tr>
          </thead>
          <tbody>
            {row("out (first key)", h.out, s.outShare)}
            {row("in (second key)", h.in, s.inShare)}
          </tbody>
        </table>
      </div>
      <p className="ez-note">
        Measured on {num(STATS.lottieSegments)} real segments ({num(STATS.lottieHandles)} handles) from Lottie files and {STATS.hfSegments} from HyperFrames blocks. Near means influence within 10 points and speed within 0.3 (25% above 1x).{" "}
        {s.pairCount > 0
          ? `Both handles together: ${s.pairCount} segments (${s.pairShare}%), ${s.entranceShare}% of the ${STATS.entranceSegments} entrances and ${s.exitShare}% of the ${STATS.exitSegments} exits.`
          : "No real Lottie segment has both handles near this pair, so it is a motion-design choice and not an icon default."}{" "}
        {s.hfCount > 0 ? `${s.hfCount} of the ${STATS.hfSegments} HyperFrames segments use it.` : ""}
      </p>
      <div className="ez-codes">
        <Code
          label="vawe: key table"
          text={`import { keys } from 'vawe/core/motion/presets.js';\n\n// out handle on the first key, in handle on the second\nkeys(el, 'translate', [\n  [0, '0 6vh', { out: ${handleSpec(h.out)} }],\n  [0.6, '0 0', { in: ${handleSpec(h.in)} }],\n]);`}
        />
      </div>
    </section>
  );
}

export default async function EasePage({ params }: Params) {
  const e = easeBySlug((await params).slug);
  if (!e) notFound();
  const demoStyle = { "--ez": e.linear } as CSSProperties;
  const crumbs = [{ name: "Home", url: "/" }, { name: "Easing", url: "/easing" }, { name: e.name, url: `/easing/${e.slug}` }];
  const stats: [string, string, string][] = [
    ["50% of travel", pct(e.t50), "of the time"],
    ["90% of travel", pct(e.t90), "of the time"],
    ["After 10% of time", `${e.at10}%`, "of the travel is done"],
    ["Peak speed", speedText(e).replace(" (it ends vertically)", ""), e.peakSpeed > 20 ? "it ends vertically" : "times the average"],
    ["Overshoot", `${e.overshoot}%`, e.overshoot ? "past the end value" : "stays inside the end"],
    ["Undershoot", `${e.undershoot}%`, e.undershoot ? "below the start value" : "never below the start"],
    ["linear() points", String(e.points), "at a 0.002 tolerance"],
    ["cubic-bezier", e.kind === "vawe" || e.bezier.express === "exact" ? "exact" : e.bezier.express === "close" ? "close" : "none", e.kind === "vawe" ? "built from two handles" : e.bezier.express === "no" ? "cannot express it" : `worst gap ${((e.bezier.worst ?? 0) * 100).toFixed(1)} points`],
  ];

  return (
    <div className="shell">
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(techArticleSchema(e))} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema(crumbs))} />
        <article className="ez" id="ez-main">
          <header className="phead ez-head">
            <p className="kicker">
              <Link href="/easing">Easing</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/easing#${e.kind}`}>{GROUP[e.kind]}</Link>
            </p>
            <h1>{e.kind === "css" ? `CSS ${e.name}` : e.name}</h1>
            <p className="ez-sum">{e.blurb}</p>
            <p className="ez-sum">{summary(e)}</p>
            <p className="meta ez-meta">
              <span>{GROUP[e.kind]}</span>
              {e.kind === "classic" ? <span>family: {e.family}</span> : null}
              <span>peak {speedText(e).replace(" (it ends vertically)", "")}</span>
            </p>
          </header>

          <section className="ez-charts" aria-label="Curve and velocity">
            <figure className="panel ez-chart">
              <span className="meta">Progress against time</span>
              <CurveChart e={e} />
              <figcaption className="ez-cap">The dashed line is linear. The dots mark 50% and 90% of the travel.</figcaption>
            </figure>
            <figure className="panel ez-chart">
              <span className="meta">Velocity, in multiples of average speed</span>
              <VelocityChart e={e} />
              <figcaption className="ez-cap">The dashed line is 1x, the speed of linear.{e.peakSpeed > 12 ? " The chart stops at 12x." : ""}</figcaption>
            </figure>
          </section>

          <section className="ez-sec" aria-labelledby="demo">
            <h2 id="demo">Live demo</h2>
            <p>The blue box uses the exact <code>linear()</code> string below, in your browser. The grey box is linear.</p>
            <div className="panel ez-demo" style={demoStyle}>
              <div className="ez-row">
                <span className="ez-lab">{e.name}</span>
                <div className="ez-track"><span className="ez-box" /></div>
              </div>
              <div className="ez-row">
                <span className="ez-lab">linear</span>
                <div className="ez-track"><span className="ez-box ez-box-ref" /></div>
              </div>
              <p className="ez-cap ez-stopnote">Your system asks for reduced motion, so the boxes rest at the end of the move.</p>
            </div>
            {e.kind === "vawe" ? (
              <figure className="panel ez-clip">
                <div className="ez-stage">
                  <img src={`/easing/${e.slug}.webp`} alt="" width={640} height={360} loading="lazy" decoding="async" />
                  <Clip src={`/easing/${e.slug}.mp4`} webm={`/easing/${e.slug}.webm`} />
                </div>
                <figcaption className="ez-cap" style={{ padding: "10px 16px 12px" }}>Rendered with the vawe renderer: a 2 s film, {e.name} against linear. It plays while on screen.</figcaption>
              </figure>
            ) : null}
          </section>

          <section className="ez-sec" aria-labelledby="numbers">
            <h2 id="numbers">Numbers</h2>
            <dl className="ez-stats">
              {stats.map(([k, v, note]) => (
                <div className="panel ez-stat" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}<small>{note}</small></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="ez-sec" aria-labelledby="code">
            <h2 id="code">Copy the code</h2>
            <div className="ez-codes">
              <Code label="css linear() (exact)" text={`animation-timing-function: ${e.linear};`} />
              <BezierBlock e={e} />
              <Code label="web animations api" text={waapi(e)} />
              <Code label={e.kind === "css" ? "css" : "vawe"} text={importLine(e)} />
            </div>
          </section>

          <Handles e={e} />

          <section className="ez-sec" aria-labelledby="when">
            <h2 id="when">When to use it, and when to avoid it</h2>
            <div className="ez-two">
              <div className="panel">
                <h3>Use it for</h3>
                <ul>{e.use.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              <div className="panel">
                <h3>Avoid it for</h3>
                <ul>{e.avoid.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </div>
          </section>

          {e.nearestVawe ? (
            <section className="ez-sec" aria-labelledby="vawe-near">
              <h2 id="vawe-near">The nearest vawe ease</h2>
              <p>
                The closest of the nine vawe After Effects eases is <Link href={`/easing/${e.nearestVawe.slug}`}>{e.nearestVawe.name}</Link>, an RMS gap of {e.nearestVawe.gap} in progress. After Effects and vawe set the shape with two handles, so it can be tuned where a named curve cannot.
              </p>
            </section>
          ) : null}

          <section className="ez-sec" aria-labelledby="related">
            <h2 id="related">Related eases</h2>
            <ul className="ez-rel">
              {e.related.map((r) => (
                <li key={r.slug} className="panel">
                  <Link href={`/easing/${r.slug}`} prefetch={false}>{r.name}</Link>
                  <span className="meta">curve gap {r.gap}</span>
                </li>
              ))}
            </ul>
          </section>

          {e.moves?.length ? (
            <section className="ez-sec" aria-labelledby="moves">
              <h2 id="moves">Moves that use {e.name}</h2>
              <p>{e.moves.length} of the library&apos;s motion moves set <code>EASE.{camelOf(e.slug)}</code> in their snippet.</p>
              <ul className="ez-moves">
                {e.moves.map((m) => (
                  <li key={m.name}><Link href={`/moves/${m.name}`} prefetch={false}>{m.title}</Link></li>
                ))}
              </ul>
            </section>
          ) : null}
          <CopyCode rootId="ez-main" />
        </article>
      </main>
      <Footer active="/easing" />
    </div>
  );
}
