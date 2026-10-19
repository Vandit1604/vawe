import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { REPO_URL } from "../components/Header";
import { Next, PageTop } from "../components/Xp";
import "../components/intent.css";
import "../components/study.css";

export const metadata = pageMetadata({
  title: "vawe · roadmap: now, next, later",
  description:
    "What vawe works on now, next and later: render reliability, a pairwise judge, motion-shape measures and faster final capture. Each item links to the problem it addresses.",
  path: "/roadmap",
});

type Item = { name: string; note: string; problem: number };

const COLUMNS: { title: string; lead: string; items: Item[] }[] = [
  {
    title: "Now",
    lead: "In work today.",
    items: [
      { name: "Render reliability", note: "Resume a final render after a crash, and report the crash.", problem: 12 },
      { name: "One shared render lock", note: "One lock that every render command uses.", problem: 12 },
      { name: "Determinism under load", note: "Frames stay identical when the machine is busy.", problem: 1 },
    ],
  },
  {
    title: "Next",
    lead: "Planned after Now.",
    items: [
      { name: "Windowed drafts with their checks", note: "Draft one window of a film and run the checks on that window.", problem: 6 },
      { name: "vawe moves --check", note: "A command that checks the video component library.", problem: 4 },
      { name: "A pairwise judge", note: "The judge compares two films instead of scoring one.", problem: 9 },
      { name: "Motion-shape measures", note: "Numbers for the shape of a move.", problem: 10 },
      { name: "Hook and palette numbers", note: "Numbers for the opening hook and the palette.", problem: 10 },
      { name: "A default grain layer", note: "Grain on by default, to finish the frame.", problem: 3 },
    ],
  },
  {
    title: "Later",
    lead: "Not started.",
    items: [
      { name: "Eye-path and thread measures", note: "Measure where the eye goes and whether one thread runs through the film.", problem: 10 },
      { name: "Faster final capture", note: "Cut the screenshot time of a final render.", problem: 11 },
      { name: "Sound", note: "Parked until synthesized cues stop sounding machine-made.", problem: 13 },
    ],
  },
];

export default function Roadmap() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Project" current="Roadmap" />
            <h1>Roadmap: now, next, later.</h1>
            <p>
              The order of work on vawe. There are no dates: Now comes before Next, and Next before Later.
              Each item links to the problem it addresses.
            </p>
            <p className="bnote">
              The reasons are on <a href="/problems">the problems page</a>.
            </p>
          </section>

          <div className="cols">
            {COLUMNS.map((c, n) => (
              <section className="col" key={c.title} data-now={n === 0 || undefined} aria-labelledby={`r-${c.title}`}>
                <h2 id={`r-${c.title}`}>{c.title}</h2>
                <p>{c.lead}</p>
                <ul>
                  {c.items.map((i) => (
                    <li key={i.name}>
                      <strong>{i.name}</strong>
                      <span>{i.note}</span>
                      <a href={`/problems#p${i.problem}`}>Problem {i.problem}</a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <Next
            title="Follow the work."
            lead="vawe is open source under Apache-2.0, runs on your machine, needs no account and has no per-render fee. Open an issue if a problem here costs you a film."
            primary={{ href: REPO_URL, label: "vawe on GitHub" }}
            secondary={{ href: "/problems", label: "Read the problems" }}
          />
        </main>
      </div>
      <Footer active="/roadmap" />
    </div>
  );
}
