import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { GithubCta, OpenSourceMark } from "../components/Icon";
import "../components/intent.css";
import "../components/study.css";

export const metadata = pageMetadata({
  title: "vawe · HyperFrames alternatives: vawe, Remotion, Motion Canvas, Lottie",
  description:
    "Four alternatives to HyperFrames, HeyGen's HTML-to-video framework: vawe, Remotion, Motion Canvas and Lottie. What each one is, how you author with it, and which job it fits. Read 2026-10-03.",
  path: "/hyperframes-alternatives",
});

/* /hyperframes-alternatives keeps its URL (it ranks) and its angle: a short list of what to look at
 * instead of HyperFrames, vawe included. The per-tool facts, tables and sources live on /vs/<name>
 * (app/vs/data.ts), so none of that text is repeated here. The HyperFrames facts below were read
 * 2026-10-03 from github.com/heygen-com/hyperframes and hyperframes.heygen.com/introduction. */

const ALTERNATIVES = [
  {
    name: "vawe",
    href: "/vs/hyperframes",
    cta: "vawe vs HyperFrames",
    body: "The closest peer. Both are Apache-2.0, both drive headless Chrome, and both aim at an agent that writes the file. vawe takes timing from CSS keyframes, element.animate() or a seek(t) function, and replaces Date, timers and Math.random with versions that follow the seek. HyperFrames forbids those calls instead.",
  },
  {
    name: "Remotion",
    href: "/vs/remotion",
    cta: "vawe vs Remotion",
    body: "Video from React components, with a Studio editor and distributed rendering on AWS Lambda and Cloud Run. Its licence is free up to 3 employees in a for-profit company. It publishes Agent Skills for coding agents.",
  },
  {
    name: "Motion Canvas",
    href: "/vs/motion-canvas",
    cta: "vawe vs Motion Canvas",
    body: "A TypeScript library for vector animation, written as generator functions, with a real-time editor. MIT licence. It fits diagram and explainer animation synced to a voice-over.",
  },
  {
    name: "Lottie",
    href: "/vs/lottie",
    cta: "vawe vs Lottie",
    body: "A JSON format for vector animation, exported from After Effects and played inside apps. It is a playback format, not an MP4 renderer. Pick it for animated icons and loaders in a product.",
  },
];

export default function HyperframesAlternatives() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <OpenSourceMark />
            <h1>HyperFrames alternatives.</h1>
            <p>
              HyperFrames is HeyGen&apos;s open-source framework that turns HTML, CSS and seekable
              animations into MP4. People look for an alternative for different reasons: a different
              authoring model, a different determinism rule, or a different job. Four tools are worth
              a look. Each has its own comparison page.
            </p>
            <p className="bnote">Read 2026-10-03.</p>
          </section>

          {ALTERNATIVES.map((a) => (
            <section className="isec" key={a.name}>
              <div className="isec-text">
                <h2>{a.name}</h2>
                <p>{a.body}</p>
                <div className="irelated">
                  <a href={a.href}>{a.cta}</a>
                </div>
              </div>
            </section>
          ))}

          <section className="tfacts">
            <h2>When to stay on HyperFrames.</h2>
            <p>
              HyperFrames has a Studio browser editor, a catalog of reusable blocks, 21 agent skills,
              and cloud rendering on Lambda, Cloud Run and HeyGen. If you want those, stay. The
              HyperFrames comparison page lists them with sources.
            </p>
            <div className="srcs">
              <a href="https://github.com/heygen-com/hyperframes" rel="noopener">HyperFrames README</a>
              <a href="https://hyperframes.heygen.com/introduction" rel="noopener">HyperFrames introduction</a>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">The short table.</h2>
            <div className="itable-wrap">
              <table className="itable">
                <thead>
                  <tr>
                    <th scope="col">tool</th>
                    <th scope="col">authoring</th>
                    <th scope="col">licence</th>
                    <th scope="col">output</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>HyperFrames</td>
                    <td>HTML with data attributes</td>
                    <td>Apache-2.0</td>
                    <td>MP4</td>
                  </tr>
                  <tr>
                    <td>vawe</td>
                    <td>One HTML page</td>
                    <td>Apache-2.0</td>
                    <td>MP4</td>
                  </tr>
                  <tr>
                    <td>Remotion</td>
                    <td>React components</td>
                    <td>Source-available, free up to 3 employees</td>
                    <td>MP4</td>
                  </tr>
                  <tr>
                    <td>Motion Canvas</td>
                    <td>TypeScript generators</td>
                    <td>MIT</td>
                    <td>Image sequence or MP4</td>
                  </tr>
                  <tr>
                    <td>Lottie</td>
                    <td>JSON from After Effects</td>
                    <td>MIT players</td>
                    <td>Playback in apps</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/vs/hyperframes">
                vawe vs HyperFrames <span className="arw">→</span>
              </a>
              <GithubCta />
            </div>
            <div className="irelated">
              <a href="/remotion-alternatives">Remotion alternatives, categorized</a>
              <a href="/determinism">How vawe keeps renders deterministic</a>
              <a href="/ai-agents">How an agent writes and checks a film</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/hyperframes-alternatives" />
    </div>
  );
}
