import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · features",
  description:
    "The decisions the engine makes for you: a virtual clock that refuses wall time, motion blur that follows the motion, and a loop that judges a film in a fresh session.",
  path: "/features",
});

/* /features · WHAT THE ENGINE DECIDES. Three things a page author does not pass as settings. Every
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

export default function Features() {
  return (
    <div className="shell">
      <Header active="features" />
      <main className="wrap" id="content" tabIndex={-1}>
        <div className="ls ls-top">
          <h1>What the engine decides.</h1>
          <p className="ls-sub">
            Three decisions you do not pass as settings. They make the output reproducible, smooth,
            and still worth watching.
          </p>

          <section className="isec">
            <div className="isec-text">
            <h2>The clock refuses wall time.</h2>
            <p>
              A frame is seeked, not played. Before any script on the page runs,{" "}
              <code>Date</code>, <code>performance.now</code>, <code>requestAnimationFrame</code>,
              the timers and <code>Math.random</code> are replaced with functions of the seek time,
              so there is no wall clock to read and nothing unseeded to draw from.
            </p>
            <p>
              So the picture at time t is the same whether it renders first or last. That is what
              lets the renderer split a film into fixed slices and capture several at once on one
              browser, and what makes two renders of a page comparable. The end-to-end test renders
              fixture pages twice and compares the decoded frame hashes.{" "}
              <a className="ilink" href="/determinism">How that works, in full →</a>
            </p>
            <span className="tag">core/engine/page-clock.js</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">purity</div>
                <pre className="code" dangerouslySetInnerHTML={{ __html: PURITY }} />
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
            <h2>Blur follows the motion.</h2>
            <p>
              You do not set motion blur per element. For the final render, a speed pass measures
              how far things move in each frame: a still frame gets one sample, and a fast one gets
              enough subframes to blend into one streak. A moving thing blurs; a still thing never
              does.
            </p>
            <p>
              Sound is decided offline too. <code>&lt;audio&gt;</code> tags are never played live:
              the final render mixes them at their <code>data-at</code> times, and a voice-over
              track ducks the music bed under it.
            </p>
            <span className="tag">harness/media/render-page.mjs</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">blur</div>
                <pre className="code" dangerouslySetInnerHTML={{ __html: BLUR }} />
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
            <h2>Correct is not good enough.</h2>
            <p>
              Any engine can render technically correct video. Making it worth watching is the hard
              half, so a film goes through a loop before it ships: a draft check names static
              windows, blank runs, small text and a mix that is too quiet or too loud; a critique
              runs in a session that did not write the page; and a judge in a fresh session scores
              the key frames. A pass is never self-recorded.
            </p>
            <p>
              A rule can be waived, and the waiver has to state its reason in the page or the render
              refuses. That one sentence is the whole mechanism: it turns a reflex back into a
              decision.
            </p>
            <span className="tag">dev → ship</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">the loop</div>
                <pre className="code" dangerouslySetInnerHTML={{ __html: LADDER }} />
              </div>
            </div>
          </section>

        </div>
      </main>
      <Footer bookend active="/features" />
    </div>
  );
}
