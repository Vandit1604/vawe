import type { ReactNode } from "react";
import { Header, REPO_URL } from "../components/Header";
import { Footer } from "../components/Footer";
import { Clip } from "../components/Clip";
import { pageMetadata } from "../components/seo";
import { Next, PageTop, Toc } from "../components/Xp";
import { jsonLdScript, breadcrumbSchema, aboutPageSchema } from "../../lib/schema";
import { MOVES } from "../../lib/moves";
import "../components/intent.css";
import "../components/study.css";
import "./about.css";

const OWNER = { name: "Vandit Singh", url: "https://github.com/Vandit1604" };
const DESCRIPTION =
  "vawe renders one HTML page into a film. Why it exists, how it is built, the five rules it holds, who makes it and how to help. Open source under Apache-2.0.";

export const metadata = pageMetadata({
  title: "About vawe: one HTML page in, one film out",
  description: DESCRIPTION,
  path: "/about",
});

const PRINCIPLES: { lead: string; line: string }[] = [
  { lead: "Time is the seek.", line: "The renderer sets the clock. A page has no timers and no unseeded random." },
  { lead: "No private format.", line: "A film is HTML, CSS, Web Animations, SVG, canvas or three.js." },
  { lead: "Every number is a literal.", line: "It sits in the page, so the studio edits it in place." },
  { lead: "Checks advise.", line: "Only determinism and a missing waiver reason refuse a render." },
  { lead: "A fresh session judges.", line: "The agent that wrote the film never records its own pass." },
];

const INVOLVED: { lead: string; line: ReactNode }[] = [
  {
    lead: "Open an issue.",
    line: (
      <>
        Report a bug, or something natural to write that the renderer rejects, in the{" "}
        <a href={`${REPO_URL}/issues`}>GitHub issues</a>. The project treats that as a framework bug.
      </>
    ),
  },
  {
    lead: "Read the repo.",
    line: (
      <>
        Start with <code>AGENTS.md</code> and <code>CONTRIBUTING.md</code> in <a href={REPO_URL}>the repository</a>.
      </>
    ),
  },
  {
    lead: "Read the blog.",
    line: (
      <>
        The <a href="/blog">blog</a> records what broke and what was measured.
      </>
    ),
  },
];

const SECTIONS = [
  { href: "#what", label: "What it is" },
  { href: "#why", label: "Why" },
  { href: "#built", label: "How it is built" },
  { href: "#rules", label: "Rules" },
  { href: "#who", label: "Who" },
  { href: "#help", label: "Get involved" },
];

function Steps({ items }: { items: { lead: string; line: ReactNode }[] }) {
  return (
    <ol className="xp-list">
      {items.map((p) => (
        <li key={p.lead}>
          <span>
            <strong>{p.lead}</strong> {p.line}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function About() {
  return (
    <div className="shell">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "About", url: "/about" }]))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(aboutPageSchema({ description: DESCRIPTION, owner: OWNER }))}
      />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Project" current="About" />
            <h1>About vawe</h1>
            <p>vawe is an open source framework that renders one HTML page into a film.</p>
            <Toc items={SECTIONS} />
          </section>

          <section className="isec" id="what">
            <div className="isec-text">
              <h2>What it is</h2>
              <p>
                You write one <code>page.html</code>. The renderer seeks it frame by frame and encodes an MP4.
                The library has {MOVES.length} video components, each a short clip and one markdown file to copy.
              </p>
            </div>
            <div className="isec-art">
              <div className="ab-film">
                <Clip webm="/examples/showcase.webm" src="/examples/showcase.mp4" poster="/examples/showcase.webp" decorative />
              </div>
              <span className="meta ab-cap">The showcase, a 14&nbsp;s film. One page, rendered by vawe.</span>
            </div>
          </section>

          <section className="isec" id="why">
            <div className="isec-text">
              <h2>Why it exists</h2>
              <p>
                AI agents write web code well. Most video tools ask for a private format that an agent has
                never seen. In vawe a film is one HTML page, written in what the agent already knows.
              </p>
              <p>
                A blind A/B test of a custom JSON format against one HTML page went to the page:{" "}
                <a href="/blog/html-over-json">the test and its numbers</a>.
              </p>
            </div>
          </section>

          <section className="isec" id="built">
            <div className="isec-text">
              <h2>How it is built</h2>
              <p>
                vawe is open source under Apache-2.0. The repository started in June 2026 under the name
                Shortwave and became vawe on 2026-07-15. It has been public since 2026-09-16.
              </p>
              <p>
                There is no npm package, no hosted API and no account. You clone the repo and run it on your
                machine: <a href="/docs/quickstart">the quickstart</a>.
              </p>
            </div>
          </section>

          <section className="isec" id="rules">
            <div className="isec-text">
              <h2>Five rules</h2>
              <Steps items={PRINCIPLES} />
              <span className="cite">AGENTS.md</span>
            </div>
          </section>

          <section className="isec ab-who" id="who">
            <div className="isec-text">
              <h2>Who makes it</h2>
              <p>
                {OWNER.name} owns the repository and made the first commit. GitHub profile:{" "}
                <a href={OWNER.url}>github.com/Vandit1604</a>.
              </p>
            </div>
          </section>

          <section className="isec" id="help">
            <div className="isec-text">
              <h2>Get involved</h2>
              <Steps items={INVOLVED} />
            </div>
          </section>

          <Next
            title="What is next"
            lead="The roadmap lists what is in work now, what comes next and what is later. Each item links to the problem it addresses."
            primary={{ href: "/roadmap", label: "Read the roadmap" }}
            secondary={{ href: REPO_URL, label: "vawe on GitHub" }}
          />
        </main>
      </div>
      <Footer active="/about" />
    </div>
  );
}
