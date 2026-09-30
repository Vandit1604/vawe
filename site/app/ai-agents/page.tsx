import { Header, REPO_URL } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · video rendering for AI agents",
  description:
    "An agent writes a Vawe film as one HTML page, in the web platform it already knows, and one command renders, checks and ships it. A fresh session judges the result, never the one that wrote it.",
  path: "/ai-agents",
});

/* /ai-agents · the intent page for "video rendering for AI agents". Every fact below is read off the
 * repo AGENTS.md, QUICKSTART.md, harness/cli/verbs.mjs and skills/; no adoption numbers, no
 * benchmark, no characterisation of any other product.
 */

const LOOP = `bin/vawe new launch          # page.html + brief.md
bin/vawe dev films/launch/page.html
bin/vawe critique films/launch/page.html
bin/vawe ship films/launch/page.html`;

const INSTALL = `npm install
bin/vawe doctor      # names each missing tool
bin/vawe new hello`;

export default function AiAgents() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <section className="phead">
            <h1>Let an agent write the video.</h1>
            <p>
              A Vawe film is one HTML page: CSS, Web Animations, SVG, canvas or three.js. An agent
              already writes all of that well, so it never learns a private format and never
              guesses at a schema. If something it would naturally write fails, that is a bug in
              the engine, not in the agent.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>One command, one loop.</h2>
              <p>
                <code>bin/vawe</code> runs everything. <code>new</code> starts a film from a
                template, <code>dev</code> renders a half-size, silent draft and checks it,{" "}
                <code>critique</code> lays out the frames to look at, and <code>ship</code> renders
                the final at 60fps with motion blur and audio. A wrong flag exits with the list of
                valid ones, so an agent corrects itself in one step instead of reading source.
              </p>
              <span className="cite">bin/vawe --help · harness/cli/verbs.mjs</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">the loop</div>
                <pre className="code">{LOOP}</pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The writer never grades its own film.</h2>
              <p>
                A critique runs in a session that did not write the page, and{" "}
                <code>bin/vawe judge</code> prepares the key frames and the rubric for a fresh
                session to score. A pass is never self-recorded. The agent that wrote the film fixes
                only the seconds the critique named and renders those seconds again, not the whole
                film.
              </p>
              <span className="cite">AGENTS.md · skills/vawe-critique</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Skills teach the parts that are not defaults.</h2>
              <p>
                The repo ships skills an agent loads on demand: <code>vawe-brief</code> turns a
                request into a brief, <code>vawe-page</code> writes the page, <code>vawe-critique</code>{" "}
                looks at a render as a fresh session, and <code>vawe-reference</code> matches a
                reference video. <code>AGENTS.md</code> holds only what an agent would get wrong on
                its own: the page contract, the motion rules that are not its defaults, and the
                first-draft habits it should not ship.
              </p>
              <span className="cite">skills/ · AGENTS.md</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Wire it into an agent.</h2>
              <p>
                Clone the repo, install, and let <code>bin/vawe doctor</code> name any missing tool
                with the install line for your system. Then point the agent at{" "}
                <code>AGENTS.md</code> and ask for a film.
              </p>
              <span className="cite">QUICKSTART.md</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">install</div>
                <pre className="code">{INSTALL}</pre>
              </div>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">Why the draft matches the final.</h2>
            <p className="lead">
              The page runs under a virtual clock, so a moment the agent approves in a draft is the
              same moment in the final.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/determinism">
                Read the mechanism <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href={REPO_URL}>The source, on GitHub</a>
              <a href="/moves">Moves to copy, each with its clip</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/ai-agents" />
    </div>
  );
}
