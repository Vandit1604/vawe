import { Header } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { Clip } from "../components/Clip";
import { clip, moveByName } from "../../lib/moves";
import "./features.css";

export const metadata = pageMetadata({
  title: "vawe features: deterministic HTML to video rendering",
  description:
    "What the vawe HTML-to-video engine decides for you: a virtual clock that refuses wall time, motion blur that follows the motion, and a loop that judges a film in a fresh session.",
  path: "/features",
});

/* /features · WHAT THE ENGINE DECIDES. Three things a page author does not pass as settings, each shown with its own proof. Every
 * claim reads off a file cited in its section: core/engine/page-clock.js, harness/media/render-page.mjs,
 * harness/cli/verbs.mjs and the repo AGENTS.md.
 */

// Mono, dark pane, literal strings.
const PURITY = `<span class="a">seek</span><span class="p">(</span><span class="k">t</span><span class="p">)</span>  <span class="s">// pure in t</span>
<span class="p">&rarr;</span> same picture, any order
<span class="p">&rarr;</span> <span class="a">bin/vawe e2e</span>  <span class="s">// renders twice, compares</span>`;

const BLUR = `<span class="a">still frame</span>   <span class="p">&rarr;</span> 1 subframe
<span class="a">fast move</span>     <span class="p">&rarr;</span> up to 3, blended
<span class="a">bin/vawe ship</span> <span class="s">// 60 fps, blur, audio</span>`;

const LADDER = `<span class="a">bin/vawe dev</span>       <span class="s">// draft + draft check</span>
<span class="a">bin/vawe critique</span>  <span class="s">// sheet, strip, deltas</span>
<span class="a">bin/vawe review</span>    <span class="s">// clipped glyphs, timing</span>
<span class="a">bin/vawe judge</span>     <span class="s">// a fresh session scores</span>
<span class="a">bin/vawe ship</span>      <span class="s">// final + fresh judge</span>`;

const fast = moveByName("iris-wipe");
const fastClip = fast ? clip(fast) : null;
const STEPS: [string, string][] = [
  ["dev", "draft + draft check"],
  ["critique", "sheet, strip, deltas"],
  ["review", "clipped glyphs, timing"],
  ["judge", "a fresh session scores"],
  ["ship", "final + fresh judge"],
];

export default function Features() {
  return (
    <div className="shell">
      <Header active="features" />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Features", url: "/features" }]))} />
      <main className="ft" id="content" tabIndex={-1}>
        <h1>What the engine decides.</h1>
        <p className="ft-sub">
          Three decisions you do not pass as settings. They make the output reproducible, smooth, and still worth watching.
        </p>

        <div className="ft-stats" role="list">
          <div className="ft-stat" role="listitem"><b>5</b><span>time sources the clock replaces</span></div>
          <div className="ft-stat" role="listitem"><b>1&ndash;3</b><span>subframes per frame, set by speed</span></div>
          <div className="ft-stat" role="listitem"><b>5</b><span>stages from draft to final</span></div>
        </div>

        <section className="ft-row" aria-labelledby="f1">
          <div className="ft-text">
            <h2 id="f1">The clock refuses wall time.</h2>
            <p>
              A frame is seeked, not played. Before any script runs, <code>Date</code>, <code>performance.now</code>,{" "}
              <code>requestAnimationFrame</code>, the timers and <code>Math.random</code> become functions of the seek time.
            </p>
            <p className="ft-note">
              So the picture at time t is the same whether it renders first or last. That lets the renderer capture fixed slices
              at once on one browser, and makes two renders comparable. The end-to-end test renders fixture pages twice and
              compares the decoded frame hashes.
            </p>
            <a className="ft-link" href="/determinism">How that works, in full &rarr;</a>
            <span className="mono">core/engine/page-clock.js</span>
          </div>
          <div className="ft-proof">
            <div className="ft-well">
              <div className="ft-order">
                <span className="mono">render order A</span>
                <div className="ft-tiles">{[0, 1, 2, 3].map((t) => <span className="ft-tile" key={t}>t={t}</span>)}</div>
              </div>
              <div className="ft-order">
                <span className="mono">render order B</span>
                <div className="ft-tiles">{[3, 0, 2, 1].map((t) => <span className="ft-tile" key={t}>t={t}</span>)}</div>
              </div>
              <span className="ft-eq">Same four pictures, either way.</span>
              <pre className="ft-code" tabIndex={0} aria-label="seek is pure in t" dangerouslySetInnerHTML={{ __html: PURITY }} />
            </div>
          </div>
        </section>

        <section className="ft-row" aria-labelledby="f2">
          <div className="ft-text">
            <h2 id="f2">Blur follows the motion.</h2>
            <p>
              You do not set motion blur per element. A speed pass measures how far things move in each frame: a still frame gets
              one sample, a fast one enough subframes to blend into one streak.
            </p>
            <p className="ft-note">
              Sound is decided offline too. <code>&lt;audio&gt;</code> tags are never played live: the final render mixes them at
              their <code>data-at</code> times, and a voice-over track ducks the music bed under it.
            </p>
            <span className="mono">harness/media/render-page.mjs</span>
          </div>
          <div className="ft-proof">
            {fastClip ? (
              <div>
                <div className="ft-film">
                  <Clip webm={fastClip.webm} src={fastClip.mp4} poster={fastClip.poster} decorative />
                </div>
                <span className="mono ft-cap">{fast?.title}, a fast move</span>
              </div>
            ) : null}
            <div className="ft-well">
              <div className="ft-blur" aria-label="Still frame gets 1 subframe, a fast move gets up to 3">
                <div className="ft-lane"><span className="mono">still</span><div className="ft-track"><span className="ft-dot" style={{ left: "46%" }} /></div><b>1</b></div>
                <div className="ft-lane"><span className="mono">fast</span><div className="ft-track">
                  <span className="ft-dot" style={{ left: "20%", opacity: 0.25 }} /><span className="ft-dot" style={{ left: "45%", opacity: 0.55 }} /><span className="ft-dot" style={{ left: "70%" }} />
                </div><b>3</b></div>
              </div>
              <pre className="ft-code" tabIndex={0} aria-label="blur settings" dangerouslySetInnerHTML={{ __html: BLUR }} />
            </div>
          </div>
        </section>

        <section className="ft-row" aria-labelledby="f3">
          <div className="ft-text">
            <h2 id="f3">Correct is not good enough.</h2>
            <p>
              Any engine can render correct video. Worth watching is the hard half, so a film goes through a loop before it ships.
              A pass is never self-recorded.
            </p>
            <p className="ft-note">
              A draft check names static windows, blank runs, small text and a mix that is too quiet or too loud. A critique runs
              in a session that did not write the page. A judge in a fresh session scores the key frames. A rule can be waived,
              and the waiver has to state its reason in the page or the render refuses.
            </p>
            <span className="mono">dev &rarr; ship</span>
          </div>
          <div className="ft-proof">
            <div className="ft-well">
              <ol className="ft-steps">
                {STEPS.map(([cmd, what], i) => (
                  <li key={cmd}><i>{i + 1}</i><b>bin/vawe {cmd}</b><span>{what}</span></li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="ft-end" aria-label="A film made with vawe">
          <div className="ft-film">
            <Clip webm="/examples/cindre.webm" src="/examples/cindre.mp4" poster="/examples/cindre.webp" decorative />
          </div>
          <span className="mono">CINDRE, a 10 s perfume film. One page, rendered by vawe.</span>
        </section>
      </main>
      <Footer bookend active="/features" />
    </div>
  );
}
