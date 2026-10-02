import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { jsonLdScript, techArticleSchema } from "../../lib/schema";
import { Clip } from "../components/Clip";
import { EaseCurve } from "../components/EaseCurve";
import { GithubCta, Icon, OpenSourceMark } from "../components/Icon";
import { MOVES, clip } from "../../lib/moves";
import { OPEN, PROBLEMS, SOLVED, STATUS_LABEL, VISUALS, type Problem } from "./data";
import "../components/intent.css";
import "../components/study.css";

const TITLE = "The hard problems in agent-made motion graphics, and where vawe stands";
const DESCRIPTION =
  "Thirteen problems that decide whether an agent can make a good film: determinism, blur, eases, model cost, taste and render speed. Seven are solved, with numbers. Six are open.";

export const metadata = pageMetadata({
  title: "vawe · hard problems in agent-made motion graphics",
  description: DESCRIPTION,
  path: "/problems",
});

function Visual({ id }: { id: number }) {
  const v = VISUALS[id];
  if (!v) return null;
  if (v.kind === "code") return <pre className="prob-code" aria-label="A film is one HTML page">{v.text}</pre>;
  if (v.kind === "curve") return <div className="prob-media prob-curve"><EaseCurve name={v.ease} label={v.alt} /></div>;
  const f = clip(MOVES.find((m) => m.name === v.move) ?? { name: v.move, clipHash: null });
  if (v.kind === "clip")
    return (
      <div className="prob-media" role="img" aria-label={v.alt}>
        <Clip src={f.mp4} webm={f.webm} poster={f.poster} />
      </div>
    );
  return (
    <div className="prob-media">
      <img src={f.poster} alt={v.alt} width={640} height={360} loading="lazy" decoding="async" />
    </div>
  );
}

function ProblemCard({ p }: { p: Problem }) {
  return (
    <li className="prob" id={`p${p.id}`}>
      <div>
        <div className="prob-head">
          <span className="prob-n">{String(p.id).padStart(2, "0")}</span>
          <span className={`chip chip-${p.status}`}><Icon name={p.status} size={13} />{STATUS_LABEL[p.status]}</span>
        </div>
        <h3>{p.title}</h3>
        <dl>
          <div>
            <dt>Why it is hard</dt>
            <dd>{p.why}</dd>
          </div>
          <div>
            <dt>Where vawe stands</dt>
            <dd>{p.does}</dd>
          </div>
        </dl>
      </div>
      <div className="prob-side">
        <Visual id={p.id} />
        <div className="prob-fig">
          <strong>{p.figure}</strong>
          <span>{p.figureLabel}</span>
        </div>
      </div>
    </li>
  );
}

export default function Problems() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={jsonLdScript(
              techArticleSchema({
                headline: TITLE,
                description: DESCRIPTION,
                path: "/problems",
                datePublished: "2026-10-03",
              }),
            )}
          />
          <section className="phead">
            <OpenSourceMark />
            <h1>The hard problems in agent-made motion graphics.</h1>
            <p>
              An agent can write a page of HTML in a minute. Turning that page into a film that looks
              designed is the hard part. These are the {PROBLEMS.length} problems vawe works on, with
              the measured result for each. {SOLVED.length} are solved. {OPEN.length} are still open. The
              acceptance table has 17 rows: 16 are measured by code and 1 by the judge.
            </p>
            <p className="bnote">
              The plan for the open problems is on the <a href="/roadmap">roadmap</a>. Numbers come
              from vawe&apos;s own runs and tests. vawe runs on your machine, needs no account and has
              no per-render fee.
            </p>
          </section>

          <section className="sgroup" aria-labelledby="solved">
            <h2 id="solved">Solved</h2>
            <p>Each of these has a mechanism in the engine and a measured result.</p>
            <ol className="slist">
              {SOLVED.map((p) => (
                <ProblemCard key={p.id} p={p} />
              ))}
            </ol>
          </section>

          <section className="sgroup" aria-labelledby="open">
            <h2 id="open">Still solving</h2>
            <p>These are open. Each entry says what is known and what is not.</p>
            <ol className="slist" start={SOLVED.length + 1}>
              {OPEN.map((p) => (
                <ProblemCard key={p.id} p={p} />
              ))}
            </ol>
          </section>

          <section className="iend" style={{ marginTop: 48 }}>
            <h2 className="h2">See the engine at work.</h2>
            <p className="lead">
              Every move in the library uses the eases from problem 4. The determinism page shows the
              clock from problem 1.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/moves">
                Browse the 94 moves <span className="arw">→</span>
              </a>
              <a className="btn btn-ghost" href="/roadmap">
                Read the roadmap
              </a>
              <GithubCta />
            </div>
            <div className="irelated">
              <a href="/determinism">Why the same page renders the same frames</a>
              <a href="/ai-agents">How an agent writes and checks a film</a>
              <a href="/vs/remotion">vawe vs Remotion</a>
            </div>
          </section>
        </main>
      </div>
      <Footer active="/problems" />
    </div>
  );
}
