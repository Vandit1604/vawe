import { Header } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { REPO_URL } from "../components/Header";
import { Next, PageTop, Toc } from "../components/Xp";
import { AltEvidence, type QA } from "../components/AltEvidence";
import "../components/intent.css";
import "../components/study.css";

export const metadata = pageMetadata({
  title: "HyperFrames alternatives: vawe, Remotion, Motion Canvas, Lottie",
  description:
    "Four alternatives to HyperFrames, HeyGen’s HTML-to-video framework: vawe, Remotion, Motion Canvas and Lottie, with how you author each and the job it fits.",
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

const FAQ: QA[] = [
  {
    q: "What is the main difference between vawe and HyperFrames?",
    a: (
      <>
        How each handles time. HyperFrames forbids <code>Date</code>, timers and <code>Math.random</code> in
        a composition. vawe lets a page call them and replaces them with versions that follow the seek;{" "}
        <a href="/blog/page-clock">the virtual clock reference</a> lists what it owns.
      </>
    ),
  },
  {
    q: "Which one renders faster?",
    a: (
      <>
        Neither project publishes a side-by-side number, so we do not claim one. vawe’s own figure:
        capture of a 20&nbsp;s film fell from 140&nbsp;s to 47&nbsp;s with one Chrome per lane, in{" "}
        <a href="/blog/chrome-per-lane">faster headless Chrome rendering</a>.
      </>
    ),
  },
  {
    q: "Which is better for an AI agent?",
    a: (
      <>
        Both aim at an agent that writes the file. vawe’s film is one plain HTML page with no private
        attributes to learn; the rules are in{" "}
        <a href="/blog/page-contract">render HTML to video: the page contract</a>. HyperFrames ships 21 agent
        skills and a block catalog.
      </>
    ),
  },
  {
    q: "Is Lottie an alternative if I need an MP4?",
    a: "Not directly. Lottie is a playback format for apps, exported from After Effects. Pick one of the HTML-to-video tools when the output is a video file.",
  },
];

export default function HyperframesAlternatives() {
  return (
    <div className="shell">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "HyperFrames alternatives", url: "/hyperframes-alternatives" }]))} />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Compare" current="HyperFrames alternatives" />
            <h1>HyperFrames alternatives.</h1>
            <p>
              HyperFrames is HeyGen’s open-source framework that turns HTML, CSS and seekable
              animations into MP4. People look for an alternative for an authoring model, a determinism rule or a different job. Four tools are
              worth a look. Each has its own comparison page.
            </p>
            <p className="bnote">Read 2026-10-03.</p>
            <Toc items={[
              { href: "#table", label: "The table" },
              { href: "#alternatives", label: "Four alternatives" },
              { href: "#faq", label: "Questions" },
              { href: "#stay", label: "Stay on HyperFrames" },
            ]} />
          </section>

          <section className="iend" id="table">
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
                  <tr className="is-vawe">
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
          </section>

          <ul className="xp-alts" id="alternatives">
            {ALTERNATIVES.map((a) => (
              <li className="xp-alt" key={a.name}>
                <h2>{a.name}</h2>
                <p>{a.body}</p>
                <a href={a.href}>{a.cta} <span className="arw" aria-hidden="true">→</span></a>
              </li>
            ))}
          </ul>

          <AltEvidence faq={FAQ} />

          <section className="tfacts" id="stay">
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

          <Next
            title="Compare vawe with HyperFrames."
            primary={{ href: "/vs/hyperframes", label: "vawe vs HyperFrames" }}
            secondary={{ href: REPO_URL, label: "Star vawe on GitHub" }}
            related={[
              { href: "/remotion-alternatives", label: "Remotion alternatives, categorized" },
              { href: "/determinism", label: "How vawe keeps renders deterministic" },
              { href: "/ai-agents", label: "How an agent writes and checks a film" },
              { href: "/blog/page-contract", label: "How vawe renders HTML to video" },
            ]}
          />
        </main>
      </div>
      <Footer active="/hyperframes-alternatives" />
    </div>
  );
}
