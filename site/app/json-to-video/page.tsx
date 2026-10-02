import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "HTML to video: render an HTML page to MP4 | vawe",
  description:
    "Write one HTML page with CSS animation, Web Animations or canvas, and vawe renders it to an MP4 frame by frame, the same way every run. An AI agent can write the page.",
  path: "/json-to-video",
});

/* /json-to-video · kept because the URL ranks for the query. The JSON scene format this page used to
 * describe was removed on 2026-09-30; a film is one HTML page now (AGENTS.md, "The page contract"). The
 * page says so plainly and answers the query it still gets: turn a description of a video into an MP4.
 */

const PAGE = `<!doctype html>
<html data-aspect="16:9">
<meta name="duration" content="3">
<style>
  body { margin: 0; display: grid; place-items: center; height: 100vh; background: #16151a; }
  h1 { font: 800 9vh/1 system-ui; color: #f4f2ee;
       animation: rise 0.7s cubic-bezier(.2,.8,.2,1) 0.3s both; }
  @keyframes rise { from { translate: 0 6vh; opacity: 0 } to { translate: 0 0; opacity: 1 } }
</style>
<h1>One page. One film.</h1>`;

const RENDER = `bin/vawe new hello
bin/vawe dev films/hello/page.html     # half-size draft
bin/vawe ship films/hello/page.html    # final MP4 at 60 fps`;

export default function HtmlToVideo() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <h1>HTML to video: render a page to MP4.</h1>
            <p>
              A vawe film is one HTML page. You write it with the CSS animation, Web Animations, SVG,
              canvas or three.js you already know, and vawe renders it to an MP4. An AI agent can write
              the page for you, and a change to the motion is a diff you can read.
            </p>
            <p className="bnote">
              Early versions of vawe described a film as JSON. That format is gone. If you came here
              for JSON to video, the HTML page replaces it.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The page is the film.</h2>
              <p>
                Open the page in a browser and it plays. Hand it to vawe and it renders. The page
                declares its length in a <code>&lt;meta name=&quot;duration&quot;&gt;</code> tag, and
                time comes from <code>@keyframes</code> or <code>element.animate()</code>. The
                renderer seeks the page to each frame, so frame 412 is the same in every run.
              </p>
              <span className="cite">AGENTS.md · The page contract</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">a whole film</div>
                <pre className="code">{PAGE}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Render it with one command.</h2>
              <p>
                <code>dev</code> renders a fast draft you can check. <code>ship</code> renders the
                final MP4 with motion blur and audio. Run <code>bin/vawe doctor</code> first: it
                names each tool you are missing, such as Chrome or ffmpeg.
              </p>
              <span className="cite">docs: Quickstart</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">render</div>
                <pre className="code">{RENDER}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Start from a move.</h2>
              <p>
                You do not write each animation from nothing. The <a href="/moves">moves library</a>{" "}
                holds proven motion patterns, each with a clip, a CSS and Web Animations snippet and a
                sound cue. Copy one into your page, then change the text, colour and timing.
              </p>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">Render your first page.</h2>
            <p className="lead">The quickstart installs vawe and renders a starter page in a few minutes.</p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/docs/quickstart">
                Read the quickstart <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/docs">All the docs</a>
              <a href="/docs/the-page">The page contract</a>
              <a href="/moves">Moves to copy, each with its clip</a>
              <a href="/ai-agents">Let an agent write the video</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/json-to-video" />
    </div>
  );
}
