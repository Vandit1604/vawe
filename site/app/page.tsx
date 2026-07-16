import Link from "next/link";
import { Header } from "./components/Header";
import { HeroEditor } from "./components/HeroEditor";
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

const FEATURES = [
  { t: "Deterministic", d: "renderFrame(n) is pure in n. Same JSON, same bytes, any render order. Every video is reproducible and diff-able.", i: "M20 6 9 17l-5-5" },
  { t: "Agent-native", d: "Authored from a schema and a taste system, not clicked together in a UI. One open canvas of composable primitives.", i: "M12 2v20M2 12h20" },
  { t: "Any aspect", d: "One source renders 16:9, 9:16, 1:1, and 4:5 in a single pass. Every platform ratio from the same scene.", i: "M3 3h18v18H3zM9 3v18M15 3v18" },
];

export default function Home() {
  return (
    <>
      {/* ===== HERO ===== */}
      <div className="hero-wrap">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-dots" />
        </div>
        <Header variant="over" />
        <div className="wrap hero-head">
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

        {/* THE HERO EDITOR — an editable browser running the real engine (components/HeroEditor) */}
        <div className="hero-stage pop">
          <HeroEditor />
          {/* mobile: no code pane — you are not typing JSON on a phone. Same scene, rendered. */}
          <figure className="hero-mobile">
            <video src="/assets/hero.mp4" poster="/assets/hero.jpg" autoPlay loop muted playsInline />
            <figcaption className="hm-cta">
              <span>rendered from one JSON</span>
              <Link href="/editor">open the editor →</Link>
            </figcaption>
          </figure>
        </div>
      </div>

      <div className="hero-foot" />

      {/* ===== FEATURES ===== */}
      <section className="section">
        <div className="wrap">
          <div className="kicker">why vawe</div>
          <h2 className="h2">Video, as code.</h2>
          <div className="feat3">
            {FEATURES.map((f) => (
              <div className="fcard" key={f.t}>
                <div className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.i} />
                  </svg>
                </div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
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
              <video src="/assets/stings.mp4" poster="/assets/stings.jpg" autoPlay loop muted playsInline />
              <span className="lab">
                <b>stings</b> · shader effects
              </span>
            </div>
            <div className="clip">
              <video src="/assets/type.mp4" poster="/assets/type.jpg" autoPlay loop muted playsInline />
              <span className="lab">
                <b>type</b> · kinetic typography
              </span>
            </div>
            <div className="clip">
              <video src="/assets/cuts.mp4" poster="/assets/cuts.jpg" autoPlay loop muted playsInline />
              <span className="lab">
                <b>cuts</b> · transitions
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== END ===== */}
      <section className="section end">
        <div className="wrap">
          <h2 className="h2">Compose a scene. Render it. Ship it.</h2>
          <p className="lead">Free for individuals and small teams. One JSON in, one frame-perfect video out.</p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="https://github.com/Vandit1604/vawe">
              ★ Star on GitHub
            </a>
            <Link className="btn btn-ghost" href="/features">
              Explore features
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
