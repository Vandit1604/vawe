import type { ReactNode } from "react";
import { Header, REPO_URL } from "../components/Header";
import { Footer } from "../components/Footer";
import { EaseCurve } from "../components/EaseCurve";
import { pageMetadata } from "../components/seo";
import { PageTop, Toc } from "../components/Xp";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { EASES } from "../../lib/easing";
import { MOVES, clip, moveByName } from "../../lib/moves";
import { RIVALS } from "../vs/data";
import "../components/study.css";
import "../components/intent.css";
import "./resources.css";

export const metadata = pageMetadata({
  title: "Motion graphics resources: CSS easing, moves and AI agent video | vawe",
  description: `${EASES.length} CSS easing functions, ${MOVES.length} motion moves with clips, the files an AI agent reads to make a video, guides, and comparisons with Remotion, HyperFrames, Motion Canvas and Lottie.`,
  path: "/resources",
});

type Item = { href: string; title: string; line: string; code?: boolean; thumb?: ReactNode; external?: boolean };
type Group = { id: string; title: string; lead?: string; items: Item[] };

const skill = (name: string, line: string): Item => ({
  href: `${REPO_URL}/blob/main/skills/${name}/SKILL.md`,
  title: name,
  line,
  code: true,
  external: true,
});

function moveThumb(name: string) {
  const m = moveByName(name);
  if (!m) return undefined;
  return <img src={clip(m).poster} alt="" width={640} height={360} loading="lazy" decoding="async" />;
}

const GROUPS: Group[] = [
  {
    id: "tools",
    title: "Tools",
    items: [
      {
        href: "/easing",
        title: "Easing curves",
        line: `${EASES.length} easing functions: preview, compare, copy a CSS cubic-bezier or linear().`,
        thumb: <EaseCurve name="settle" label="An easing curve that settles" />,
      },
      {
        href: "/moves",
        title: "The moves library",
        line: `${MOVES.length} motion moves. Each has a short clip, the CSS and one markdown file to copy.`,
        thumb: moveThumb("scale-punch"),
      },
    ],
  },
  {
    id: "agents",
    title: "For agents",
    lead: "Plain files an AI agent can fetch without a browser.",
    items: [
      { href: "/llms.txt", title: "/llms.txt", line: "The site as a short index: install, the page contract, every page and move.", code: true },
      { href: "/llms-full.txt", title: "/llms-full.txt", line: "The guide, the pages and the moves in one text file.", code: true },
      { href: "/ai-agents.md", title: "/ai-agents.md", line: "How an agent writes and renders a film, as Markdown.", code: true },
      { href: "/moves/index.json", title: "/moves/index.json", line: "Every move with its group, look, jobs, duration and file, to filter by script.", code: true },
      { href: "/ai-agents", title: "How an agent installs vawe", line: "Clone the repo, run bin/vawe doctor, then write one HTML page." },
    ],
  },
  {
    id: "skills",
    title: "Agent skills",
    lead: "Five SKILL.md files in the skills/ folder of the GitHub repo.",
    items: [
      skill("vawe-brief", "Ask for the missing facts, then write the film’s brief."),
      skill("vawe-page", "Write page.html: audio tags, springs and the usual first-draft mistakes."),
      skill("vawe-transitions", "Plan what carries over at every cut."),
      skill("vawe-critique", "Review a rendered film in a fresh session."),
      skill("vawe-reference", "Match a reference film, line by line."),
    ],
  },
  {
    id: "learn",
    title: "Learn",
    items: [
      { href: "/docs", title: "Docs", line: "Quickstart, the page contract, the CLI and troubleshooting." },
      { href: "/docs/recipes", title: "Recipes", line: "Chains of moves for common short films, with the traps at each seam." },
      { href: "/determinism", title: "Determinism", line: "Why the same page gives the same frames, and how a test proves it." },
      { href: "/when-determinism-matters", title: "When determinism matters", line: "When byte-identical output decides the engine, and when it does not." },
      { href: "/launch-video", title: "Launch videos", line: "A product launch film built from captured UI, one message per beat." },
      { href: "/blog", title: "Blog", line: "Notes on what broke, what we measured and what changed." },
    ],
  },
  {
    id: "compare",
    title: "Compare",
    items: [
      { href: "/remotion-alternatives", title: "Remotion alternatives", line: "A hosted JSON API or a self-hosted engine, and what each license requires." },
      { href: "/hyperframes-alternatives", title: "HyperFrames alternatives", line: "The closest peer: both compose from HTML and make time deterministic differently." },
      ...RIVALS.map((r) => ({ href: `/vs/${r.slug}`, title: `vawe vs ${r.name}`, line: `${r.metaTitle.split(": ")[1].replace(/^./, (c) => c.toUpperCase())}.` })),
    ],
  },
  {
    id: "project",
    title: "Project",
    items: [
      { href: "/problems", title: "Hard problems", line: "Thirteen problems in agent-made video: seven solved with numbers, six open." },
      { href: "/roadmap", title: "Roadmap", line: "What is in work now, next and later." },
      { href: REPO_URL, title: "GitHub", line: "The source, Apache 2.0, and the issue tracker.", external: true },
    ],
  },
];

const COUNT = GROUPS.reduce((n, g) => n + g.items.length, 0);

export default function Resources() {
  return (
    <div className="shell">
      <Header active="resources" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Resources", url: "/resources" }]))}
      />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop current="Resources" />
            <h1>Resources for motion graphics by code</h1>
            <p>Easing curves, motion moves, files for AI agents, guides and comparisons: {COUNT} links in six groups.</p>
            <Toc items={GROUPS.map((g) => ({ href: `#${g.id}`, label: g.title }))} label="Groups" />
          </section>

          {GROUPS.map((g) => (
            <section className="rs-group" id={g.id} key={g.id}>
              <h2>{g.title}</h2>
              {g.lead ? <p>{g.lead}</p> : null}
              <ul className="rs-list">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <a className="rs-row" href={i.href}>
                      {i.thumb ? <span className="rs-thumb">{i.thumb}</span> : null}
                      <span className="rs-body">
                        <span className={i.code ? "rs-title is-code" : "rs-title"}>{i.title}</span>
                        <span className="rs-line">{i.line}</span>
                      </span>
                      <span className="arw" aria-hidden="true">{i.external ? "↗" : "→"}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </main>
      </div>
      <Footer active="/resources" />
    </div>
  );
}
