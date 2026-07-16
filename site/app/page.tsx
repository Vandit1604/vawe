import Link from "next/link";
import { Header } from "./components/Header";
import { HeroEditor } from "./components/HeroEditor";
import { Clip } from "./components/Clip";
import { Footer } from "./components/Footer";

const CODE = `<span class="p">{</span> <span class="k">"module"</span><span class="p">:</span> <span class="s">"scene"</span><span class="p">,</span> <span class="k">"theme"</span><span class="p">:</span> <span class="s">"vawe"</span><span class="p">,</span>
  <span class="k">"layers"</span><span class="p">:</span> <span class="p">[</span>
    <span class="p">{</span> <span class="k">"type"</span><span class="p">:</span> <span class="s">"text"</span><span class="p">,</span>
      <span class="k">"text"</span><span class="p">:</span> <span class="s">"Motion graphics"</span><span class="p">,</span>
      <span class="k">"preset"</span><span class="p">:</span> <span class="a">"up"</span><span class="p">,</span> <span class="k">"size"</span><span class="p">:</span> <span class="a">92</span> <span class="p">},</span>
    <span class="p">{</span> <span class="k">"type"</span><span class="p">:</span> <span class="s">"text"</span><span class="p">,</span>
      <span class="k">"text"</span><span class="p">:</span> <span class="s">"from pure data."</span><span class="p">,</span>
      <span class="k">"preset"</span><span class="p">:</span> <span class="a">"up"</span><span class="p">,</span> <span class="k">"size"</span><span class="p">:</span> <span class="a">92</span> <span class="p">}</span>
  <span class="p">]</span> <span class="p">}</span>`;

/* Each claim carries its OWN kind of evidence — that difference is the design. A shared shape
   here would say these three facts are interchangeable, and they are not. */
const CLAIMS = [
  {
    t: "Deterministic",
    d: "renderFrame(n) is pure in n. Same JSON, same bytes, any render order. Every video is reproducible and diff-able.",
    proof: (
      <div className="pf pf-hash" aria-hidden="true">
        <i>
          <span>frame 412</span>
          <b>a4f0…9c1</b>
        </i>
        <i>
          <span>frame 412, re-rendered</span>
          <b>a4f0…9c1</b>
        </i>
        <i className="eq">identical ✓</i>
      </div>
    ),
  },
  {
    t: "Agent-native",
    d: "Authored from a schema and a taste system, not clicked together in a UI. One open canvas of composable primitives.",
    proof: (
      <div className="pf pf-say" aria-hidden="true">
        <q>“a 15s launch film, cobalt, ends on the wordmark”</q>
        <code>{`{ "module": "scene", "theme": "vawe",\n  "layers": [ … ] }`}</code>
      </div>
    ),
  },
  {
    t: "Any aspect",
    d: "One source renders 16:9, 9:16, 1:1, and 4:5 in a single pass. Every platform ratio from the same scene.",
    proof: (
      <div className="pf pf-ar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>one scene</span>
      </div>
    ),
  },
];

export default function Home() {
  return (
    <div className="shell">
      {/* ===== HERO =====
          The band is the engine's own output under a cobalt scrim: the site's loudest surface is
          literally the product. Structure is borrowed from a comp that put a stock sky here — the
          sky is the part anyone can buy, so ours renders instead. The editor floats over the V, so
          the eye lands on the live thing rather than the backdrop. */}
      <Header variant="pill" />
      <main id="main">
      <div className="hero-wrap">
        <div className="bookend tap hero-band">
          {/* backdrop = formats/scene/site-backdrop.json: an ambient shader field with ZERO text
              layers, rendered for this band. Never swap in a capability clip — those all contain
              copy (stings.mp4 is the word "proof." animating), which blurs into drifting smudges
              behind the headline. See DESIGN.md → The Bookend Rule. */}
          <Clip className="bookend-film" src="/assets/backdrop.mp4" poster="/assets/backdrop.jpg" />
          <div className="wrap hero-head on-accent">
            <span className="eyebrow rise">
              <span className="dot" />
              deterministic motion-graphics engine
            </span>
            <h1 className="rise d1">
              One JSON,
              <br />
              one video.
            </h1>
            <p className="sub rise d2">
              A deterministic motion-graphics engine. Write a scene, render a frame-perfect video in any aspect ratio.
            </p>
            <div className="hero-cta rise d3">
              <a className="btn btn-white" href="https://github.com/Vandit1604/vawe">
                Get early access <span className="arw">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* THE HERO EDITOR — an editable browser running the real engine (components/HeroEditor) */}
        <div className="hero-stage pop">
          <HeroEditor />
          {/* mobile: no code pane — you are not typing JSON on a phone. Same scene, rendered. */}
          <figure className="hero-mobile">
            <Clip src="/assets/hero.mp4" poster="/assets/hero.jpg" />
            <figcaption className="hm-cta">
              <span>rendered from one JSON</span>
              <Link href="/editor">open the editor →</Link>
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="hero-foot" />

      {/* ===== THE CLAIMS ===== */}
      <section className="section">
        <div className="wrap">
          <div className="kicker">why vawe</div>
          <h2 className="h2">Video, as code.</h2>
          <div className="claims">
            {CLAIMS.map((c) => (
              <div className="claim" key={c.t}>
                <div>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
                {c.proof}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      <section className="section alt">
        <div className="wrap">
          <div className="gal-head">
            <div>
              <div className="kicker">showcase</div>
              <h2 className="h2">Every frame is JSON.</h2>
            </div>
            <Link href="/showcase">
              See the full showcase <span className="arw">→</span>
            </Link>
          </div>
          <div className="strip">
            <div className="clip big">
              <Clip src="/assets/stings.mp4" poster="/assets/stings.jpg" />
              <span className="lab">
                <b>stings</b> · shader effects
              </span>
            </div>
            <div className="clip">
              <Clip src="/assets/type.mp4" poster="/assets/type.jpg" />
              <span className="lab">
                <b>type</b> · kinetic typography
              </span>
            </div>
            <div className="clip">
              <Clip src="/assets/cuts.mp4" poster="/assets/cuts.jpg" />
              <span className="lab">
                <b>cuts</b> · transitions
              </span>
            </div>
          </div>
        </div>
      </section>

      </main>

      <Footer bookend />
    </div>
  );
}
