import type { ReactNode } from "react";
import Link from "next/link";
import { Header, REPO_URL } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { Clip } from "../components/Clip";
import { MoveClips } from "../components/MoveClips";
import { Next, PageTop, Toc } from "../components/Xp";
import { GROUPS, MOVES } from "../../lib/moves";
import { EASES } from "../../lib/easing";
import { Thumb } from "../easing/Charts";
import { BlurDemo } from "./Demos";
import "../components/intent.css";
import "../easing/easing.css";
import "./features.css";

export const metadata = pageMetadata({
  title: "vawe features: deterministic HTML to video rendering",
  description:
    "vawe features, in three groups: agents write a film in plain HTML and every command names the next step, a library of video components and a fresh-session critique keep it from looking generated, and drafts render in seconds.",
  path: "/features",
});

/* /features · THREE PILLARS: agent experience, taste, speed. Every claim reads off the repo: AGENTS.md,
 * harness/media/render-page.mjs, core/surfaces/lens.js, and `bin/vawe <verb> --help`. The session under "AX" is
 * real output of bin/vawe new, dev and critique on a 6 s page (lines trimmed with an ellipsis). The speed bars are
 * wall times measured with bin/vawe dev on 2026-10-14 (out/<film>.runs.jsonl, wallS). The moves and easing counts
 * read lib/moves.json and lib/easing.json.
 */

const ease = EASES.find((e) => e.slug === "land");
const showcase = { webm: "/examples/showcase.webm", mp4: "/examples/showcase.mp4", poster: "/examples/showcase.webp" };

function Code({ label, children }: { label: string; children: string }) {
  return (
    <div className="codeblock">
      <div className="lbl">{label}</div>
      <pre className="code" tabIndex={0}>{children}</pre>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <p className="ft-stat"><b>{n}</b><span>{label}</span></p>
  );
}

function Feature({ title, children, proof }: { title: string; children: ReactNode; proof: ReactNode }) {
  return (
    <li className="ft-row">
      <div className="ft-text">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      <div className="ft-proof">{proof}</div>
    </li>
  );
}

function Section({ id, title, lead, visual, children }: { id: string; title: string; lead: string; visual: ReactNode; children: ReactNode }) {
  return (
    <section className="isec ft-sec" id={id} aria-labelledby={`${id}-h`}>
      <div className="ft-head">
        <h2 id={`${id}-h`}>{title}</h2>
        <p>{lead}</p>
      </div>
      <div className="ft-visual">{visual}</div>
      <ul className="ft-list">{children}</ul>
    </section>
  );
}

const SESSION: { cmd: string; out: string[] }[] = [
  {
    cmd: `bin/vawe new ax-demo --request "A 6 second sting for Ember coffee…" --defaults`,
    out: [
      `wrote films/ax-demo/page.html, films/ax-demo/brief.md and …/directions.html`,
      `--defaults: details guessed, not asked: subject, message, show, assets, ending`,
      `next: bin/vawe refs list, bin/vawe refs frames <id>, Read the frames at full size, …`,
      `vawe: new ok in 0.1s`,
    ],
  },
  {
    cmd: `bin/vawe dev films/ax-demo/page.html`,
    out: [
      `✓ out/ax-demo-draft.mp4: 180 frame(s) at 30fps, 960x540 (16:9), 0s-6.00s`,
      `@0.7s static window 0.7-2.6 s (1.9 s, limit 0.5 s): nothing moves; give the hold an element motion …`,
      `next: bin/vawe strip films/ax-demo/page.html --cuts and Read every cut at full size; …`,
      `vawe: dev ok in 18.1s`,
    ],
  },
  {
    cmd: `bin/vawe critique films/ax-demo/page.html`,
    out: [
      `- no-settle: S1 h1 "Say the one thing" is still moving at 7.9 px/f when the shot ends [f89 (2.97s)]. Fix: end the move 4 frames before the cut, …`,
      `next: … bin/vawe judge films/ax-demo/page.html --struct --runs A,B in a fresh session, then fix the named seconds with bin/vawe dev films/ax-demo/page.html --from s --to s`,
      `vawe: critique ok in 20.6s`,
    ],
  },
];

function Session() {
  return (
    <figure className="ftt panel">
      <div className="lbl">a real agent session, trimmed with …</div>
      <pre className="code" tabIndex={0}>
        {SESSION.map((s) => (
          <span className="ftt-step" key={s.cmd}>
            <span className="ftt-cmd">{s.cmd}</span>
            {s.out.map((l) => (
              <span className="ftt-out" key={l}>{l}</span>
            ))}
          </span>
        ))}
      </pre>
    </figure>
  );
}

const PAGE = `<meta name="duration" content="12.4">
<html data-aspect="16:9">
<!-- CSS @keyframes, element.animate(),
     SVG, canvas, three.js -->
<script>window.seek = (t) => draw(t)</script>`;

const CHECK = `@0.7s static window 0.7-2.6 s (1.9 s, limit 0.5 s):
nothing moves; give the hold an element motion
instead: put one element move in every span that
sits still over 0.5 s (type a line, tick a counter,
pass a glint), never a camera drift`;

const READ = `/llms.txt
/ai-agents.md
/llms-full.txt
/moves/index.json
/moves/<name>.md   // one per move`;

const SKILLS = "vawe-brief, vawe-page, vawe-critique, vawe-transitions and vawe-reference";

const RATES = `bin/vawe dev  <page>   // half size, 30 fps, silent
bin/vawe ship <page>   // 60 fps, blur, audio`;

const REDO = `bin/vawe dev <page> --from 4 --to 6
✓ …-draft-4-6.mp4: 60 frame(s) at 30fps, 4s-6.00s
time: capture 3.2 s · checks 1.0 s · encode 0.8 s`;

const GATE = `bin/vawe critique <page>
// in a session that did not write the page
bin/vawe judge <page> --fresh
// a separate headless session scores
bin/vawe approve <page>
// only the owner runs it; ship refuses without it`;

const BARS: { label: string; s: number }[] = [
  { label: "colour-sting, 5\u00a0s film, whole draft", s: 24.9 },
  { label: "moth-photogram, 12\u00a0s film, whole draft", s: 23.1 },
  { label: "moth-photogram, seconds 4 to 6 only", s: 6.8 },
];

function SpeedBars() {
  const max = Math.max(...BARS.map((b) => b.s));
  return (
    <figure className="fts panel">
      {BARS.map((b, i) => (
        <div className="fts-row" key={b.label}>
          <span className="fts-l">{b.label}</span>
          <div className="fts-bar" aria-hidden="true"><i data-last={i === BARS.length - 1} style={{ width: `${(b.s / max) * 100}%` }} /></div>
          <b className="mono">{b.s.toFixed(1)}&nbsp;s</b>
        </div>
      ))}
      <figcaption className="meta">
        <code>bin/vawe dev</code> wall time, measured 2026-10-14 on an Apple M4 laptop (10 cores) with other renders running. Your numbers will differ; the ratio is the point.
      </figcaption>
    </figure>
  );
}

export default function Features() {
  return (
    <div className="shell">
      <Header active="resources" />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Features", url: "/features" }]))} />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Product" current="Features" />
            <h1>Agents write it. It looks made. It renders fast.</h1>
            <Toc items={[
              { href: "#ax", label: "Agent experience" },
              { href: "#taste", label: "Taste" },
              { href: "#speed", label: "Speed" },
            ]} />
            <div className="ft-film ft-hero">
              <Clip webm={showcase.webm} src={showcase.mp4} poster={showcase.poster} decorative />
            </div>
          </section>

          <Section
            id="ax"
            title="Agents write it well."
            lead="A film is plain HTML, and each command tells the agent what to run next."
            visual={<Session />}
          >
            <Feature title="Plain HTML, no private format" proof={<Code label="page.html">{PAGE}</Code>}>
              A film is <code>films/&lt;name&gt;/page.html</code> plus an assets folder. CSS, Web Animations, SVG, canvas and three.js all
              work. If something an agent would naturally write fails, that is a bug in vawe. <a href="/docs/the-page">The page contract</a>.
            </Feature>
            <Feature title="Every command names the next step" proof={<Code label="a check, with its fix">{CHECK}</Code>}>
              Each verb ends with a <code>next:</code> line, and each check names the problem, the second and the fix. The agent never
              guesses the next command.
            </Feature>
            <Feature title="An agent reads vawe directly" proof={<Code label="plain files">{READ}</Code>}>
              The site serves the guide as <code>llms.txt</code> and markdown. Five skills carry the parts an agent gets wrong:{" "}
              {SKILLS}. <a href="/ai-agents">How an agent writes the page</a>.
            </Feature>
          </Section>

          <Section
            id="taste"
            title="It looks made, not generated."
            lead="Copy a proven video component, let the renderer film it, and let a fresh session judge."
            visual={<MoveClips names={["caret-typing", "bracket-callout", "iris-wipe", "camera-moves", "text-on-path", "letter-stagger"]} />}
          >
            <Feature
              title={`${MOVES.length} video components and ${EASES.length} easing curves`}
              proof={ease ? <Link href="/easing/land" className="panel ft-curve"><Thumb e={ease} /><span className="meta">{ease.name}: cubic-bezier({ease.bezier.params.join(", ")}), {ease.points} linear() points</span></Link> : null}
            >
              The video components sit in {GROUPS.length} groups. Each is a clip and one markdown file with the snippet and its sound cue. Every curve
              copies as CSS. 15 recipes chain video components into a film type. <a href="/video-components">Browse the video components</a>, <a href="/easing">the curves</a>{" "}
              and <a href="/docs/recipes">the recipes</a>.
            </Feature>
            <Feature title="Real motion blur and a lens" proof={<BlurDemo />}>
              A final measures how far things move and takes 1–32 subframes per frame, so a fast move smears and a still frame stays sharp.
              One lens shader then films the screen: depth of field, bloom, grain and ten named looks.{" "}
              <a href="/docs/motion">Looks and blur</a>.
            </Feature>
            <Feature title="A fresh session judges; the owner approves" proof={<Code label="the gate">{GATE}</Code>}>
              A pass is never self-recorded. The critique runs in a session that did not write the page, and <code>ship</code> refuses until
              the owner approves the full draft.
            </Feature>
          </Section>

          <Section
            id="speed"
            title="Fast drafts, exact re-renders."
            lead={"A 2\u00a0s slice of a 12\u00a0s film re-rendered in 6.8\u00a0s. The whole draft took 23.1\u00a0s."}
            visual={<SpeedBars />}
          >
            <Feature title="Drafts at half size" proof={<Code label="two renders">{RATES}</Code>}>
              A draft is half size, 30&nbsp;fps and silent, for a quick look. Only the final adds the audio mix and motion blur.
            </Feature>
            <Feature title="Parallel slices, the same pixels" proof={<Stat n="60" label="frames per slice, for any worker count" />}>
              The clock is replaced before the page runs, so a frame does not depend on the others. The renderer captures fixed 60-frame
              slices at once, and a test renders pages twice and compares every frame. <a href="/determinism">How that works</a>.
            </Feature>
            <Feature title="Re-render only the seconds named" proof={<Code label="a partial draft">{REDO}</Code>}>
              The critique names the seconds to fix. <code>--from</code> and <code>--to</code> render just those seconds into their own file.
            </Feature>
          </Section>

          <section className="ft-end" aria-label="A film made with vawe">
            <div className="ft-film">
              <Clip webm="/examples/cindre.webm" src="/examples/cindre.mp4" poster="/examples/cindre.webp" decorative />
            </div>
            <span className="meta">CINDRE, a 10&nbsp;s perfume film. One page, rendered by vawe.</span>
          </section>

          <Next
            title="Write your first page"
            lead="Run the loop on a six second sting."
            primary={{ href: REPO_URL, label: "Get started on GitHub" }}
          />
        </main>
      </div>
      <Footer active="/features" />
    </div>
  );
}
