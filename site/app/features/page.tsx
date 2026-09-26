import { Header } from "../components/Header";
import { Clip } from "../components/Clip";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · features",
  description:
    "The decisions the engine makes for you: a clock that refuses wall time, a motion director that picks every cut, and a gate ladder that rejects correct-but-generic output.",
  path: "/features",
});

/* /features · WHAT THE ENGINE DECIDES.
 *
 * This was eight cards over eight detail routes, and six of the eight said a second time what a
 * better surface already says. blocks, kinetic type, cuts and shader stings were prose summaries
 * of registries /arsenal now indexes item by item with a search box. determinism and any-aspect
 * were prose summaries of the two proofs on the landing page, where one of them is a live engine
 * the reader can break on purpose. A card that describes a page the visitor could be standing on
 * is not depth, it is a detour.
 *
 * Two more things made the detail route indefensible rather than merely redundant. Six of its
 * eight pages ended on "Read the docs →" pointing into github.com/Vandit1604/vawe, which was a
 * private repo at the time: the site was carrying a decision and contradicting it on the same visit.
 * The repo went public on 2026-09-16 and the header now links it, but that only removes one of the
 * reasons below; the detail route stays cut on the others. And the sound-design page
 * closed on "Unmute the clip to hear it" over a file with no audio stream in it. Every mp4 on this
 * site is video-only, and components/Clip.tsx hardcodes `muted` with no controls, so that sentence
 * asked the reader to do something the page cannot do.
 *
 * What survived the cut is the part nothing else on the site says: the engine makes choices. The
 * clock refuses wall time whether you remember to or not, a director picks the cuts, and a gate
 * ladder throws work back. That is the honest depth the landing skips, and it is three sections,
 * not eight.
 */

// Mono, dark pane, literal strings. Same syntax spans the block already carried, kept as-is.
const PURITY = `<span class="a">renderFrame</span><span class="p">(</span><span class="k">n</span><span class="p">)</span>  <span class="s">// pure in n</span>
<span class="p">&rarr;</span> same bytes, any order
<span class="p">&rarr;</span> <span class="a">make check GATE=probe</span>  <span class="s">// verifies it</span>`;

const LADDER = `<span class="a">make check GATE=validate</span>     <span class="s">// schema, no em-dash</span>
<span class="a">make check GATE=critique</span>     <span class="s">// value of each beat</span>
<span class="a">make check GATE=designspec-check</span> <span class="s">// palette + font lock</span>
<span class="a">make check GATE=audit</span>        <span class="s">// contrast · overlap</span>
<span class="a">make judge</span>        <span class="s">// vision gate</span>`;

export default function Features() {
  return (
    <div className="shell">
      <Header active="features" />
      <main className="wrap" id="content" tabIndex={-1}>
        <div className="ls ls-top">
          <h1>What the engine decides.</h1>
          <p className="ls-sub">
            Three decisions you do not pass as settings. They make the output reproducible, shaped,
            and still worth watching.
          </p>

          <section className="isec">
            <div className="isec-text">
            <h2>The clock refuses wall time.</h2>
            <p>
              A frame is seeked, not played. <code>Date</code>, <code>requestAnimationFrame</code>{" "}
              and <code>Math.random</code> are coerced to frame time at boot, so there is no wall
              clock to read and nothing un-seeded to draw from. Anything that reaches for real time
              is refused by name before a pixel is drawn.
            </p>
            <p>
              So <code>renderFrame(n)</code> is pure in n, and frame 412 comes out the same whether
              it renders first or last. That is what lets one film shard across parallel browser
              tabs and what makes two renders of a scene diff-able.{" "}
              <code>make check GATE=probe</code> renders sampled frames in scrambled order and diffs the DOM,
              which tests the property rather than restating it.{" "}
              <a className="ilink" href="/determinism">How that proof works, in full →</a>
            </p>
            <span className="tag">guarded by make check GATE=probe</span>
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
            <h2>A director picks every cut.</h2>
            <p>
              You do not choose a transition per beat. A motion director reads the brand&apos;s
              motion personality and picks one per junction: it covers a hard background jump with
              a sting, and whips only where the background does not change. One cut family per
              film, so a film reads as a grammar and not as a sampler.
            </p>
            <p>
              Type obeys the same director. A headline splits by word or by character and each unit
              enters in reading order, left to right and top to bottom, rising from its own
              baseline and settling before it exits. Every cut the director places is also a sound
              cue: a mixer puts a whoosh under each cut and a reveal under each sting, at times
              derived from the same JSON.
            </p>
            <span className="tag">cuts → whoosh · stings → reveal</span>
            </div>
            <div className="isec-art">
              <div className="demo-media">
                <Clip src="/assets/showcase/cuts.mp4" poster="/assets/showcase/cuts.jpg" />
              </div>
              {/* Say what the page cannot show rather than inviting an action that fails. The
                  previous version of this section ended on "Unmute the clip to hear it". */}
              <p className="fnote">
                The clips on this site are exported without an audio track, so the score is the one
                thing here you have to render to hear.
              </p>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
            <h2>Correct is not good enough.</h2>
            <p>
              Any static engine makes technically correct video. Making it worth watching is the
              hard half, so a film climbs a ladder before it ships: the schema and the copy rules,
              then a critique of whether each beat earns its seconds, then a lock on the
              theme&apos;s palette and fonts, then contrast, overlap and safe zones, and last a
              vision gate that looks at the rendered frames and scores composition and fidelity.
            </p>
            <p>
              A rung can be waived, and a waiver has to state its reason in the scene file or the
              build stops. That one sentence is the whole mechanism: it turns a reflex back into a
              decision.
            </p>
            <span className="tag">validate → judge</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">the ladder</div>
                <pre className="code" dangerouslySetInnerHTML={{ __html: LADDER }} />
              </div>
            </div>
          </section>

        </div>
      </main>
      <Footer bookend note="one open canvas of primitives" active="/features" />
    </div>
  );
}
