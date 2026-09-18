import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import "../components/intent.css";

export const metadata = pageMetadata({
  title: "Vawe · video rendering for AI agents",
  description:
    "An MCP server an agent calls directly to write, draft and export a video: free watermarked iteration, a paid clean export, and a file server that default-denies everything the render does not need.",
  path: "/ai-agents",
});

/* /ai-agents · third of the three intent pages (see /determinism for the shared rationale
 * comment). HyperFrames markets itself as "the video rendering engine for AI agents"; vawe has the
 * same claim backed by a real, running MCP server (mcp/server.mjs) rather than a slogan, and no
 * page states it. Every fact below is read off mcp/README.md and the server/renderer code it
 * documents; no adoption numbers, no benchmark, no characterisation of any other product.
 */

const INSTALL = `claude mcp add vawe -- node $PWD/mcp/server.mjs
node mcp/smoke.mjs   # proves it end to end`;

const TOOLS: [string, string][] = [
  ["vawe_guide", "scene format + effect vocabulary, call once"],
  ["vawe_reflect", "a brand site's real colours + fonts"],
  ["vawe_capabilities", "every look, preset, cut and block, read live"],
  ["vawe_examples", "worked scenes to learn structure from"],
  ["vawe_draft", "scene -> watermarked video + gate verdicts, free, repeat"],
  ["vawe_export", "the clean file, one or more aspect ratios, paid"],
];

export default function AiAgents() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> for agents
            </span>
            <h1>Let an agent write the video.</h1>
            <p>
              Vawe runs as an MCP server: a caller&apos;s own model writes the scene JSON on its own
              tokens, and this engine renders it. The agent never opens an editor and never guesses
              at a schema by reading source, it calls a tool.
            </p>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Ten tools, one loop.</h2>
              <p>
                An agent calls <code>vawe_guide</code> once for the authoring vocabulary, then
                composes a scene and calls <code>vawe_draft</code> to render it. A draft is free and
                watermarked, so the agent can iterate: fix an invisible effect, a black frame, a
                wrong count, and render again, as many times as the film needs before anyone pays
                for it. <code>vawe_export</code> is the one paid call, the same encode with the
                watermark removed.
              </p>
              <span className="cite">mcp/server.mjs · mcp/README.md</span>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">mcp tools</div>
                <pre className="code">
                  {TOOLS.map(([name, desc]) => `${name.padEnd(18)}${desc}`).join("\n")}
                </pre>
              </div>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Draft free, pay once, at export.</h2>
              <p>
                The reference film in this repo took about ten renders to get right, and every pass
                fixed something real. Charging per render taxes the loop that makes a video good, so
                the watermark is the only difference between a draft and an export: same engine, same
                encode settings, so what an agent approves in draft is exactly what it gets on
                export.
              </p>
              <span className="cite">mcp/README.md · Why drafts are free</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>The file server default-denies.</h2>
              <p>
                This process renders scenes an agent, not this repo&apos;s own authors, wrote. The
                render page can fetch exactly five prefixes: <code>core/</code>,{" "}
                <code>themes/</code>, <code>films/</code>, <code>assets/</code>, and the caller&apos;s
                own <code>.vawe-data/scenes/</code> and <code>.vawe-data/uploads/</code>. Everything
                else, source, doctrine, other callers&apos; records, does not exist as far as the
                render page is concerned. It is a server-side wall, not a per-layer sanitiser that a
                new layer type could forget to apply.
              </p>
              <span className="cite">renderer/internal/scene/scene.go:65</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>What the agent asks for stays public.</h2>
              <p>
                The authoring vocabulary was already public before the MCP server existed:{" "}
                <code>site/public/vawe-rules.md</code> is served off this marketing site, as is{" "}
                <code>core/</code> itself. What the server keeps to itself is the half that makes the
                output good rather than merely valid: the block implementations an agent&apos;s scene
                composes against, the accumulated taste doctrine, and the internal gate suite that
                scores a render before it is called done. Callers get a scene that renders and a
                verdict on it, not the corpus that produced the verdict.
              </p>
              <span className="cite">mcp/README.md · What is public and what is not</span>
            </div>
          </section>

          <section className="isec">
            <div className="isec-text">
              <h2>Wire it into an agent.</h2>
              <p>
                Build the binary once, add the server to an MCP-capable agent, and run the smoke test
                that proves the leak vectors above stay refused before trusting it with a real scene.
              </p>
            </div>
            <div className="isec-art">
              <div className="codeblock">
                <div className="lbl">install</div>
                <pre className="code">{INSTALL}</pre>
              </div>
            </div>
          </section>

          <section className="iend">
            <h2 className="h2">What the agent actually writes.</h2>
            <p className="lead">
              One JSON file, 24 layer types, validated before a frame renders.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/json-to-video">
                Read JSON to video <span className="arw">→</span>
              </a>
            </div>
            <div className="irelated">
              <a href="/determinism">Why the same scene always renders the same bytes</a>
              <a href="/docs/prompting">The five-line brief an agent starts from</a>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
