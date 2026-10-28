import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { PageTop } from "../components/Xp";
import { NextView, RichText } from "../components/RichText";
import { ROADMAP as C } from "../../lib/content/roadmap";
import "../components/intent.css";
import "../components/study.css";

export const metadata = pageMetadata({ ...C.meta, path: C.path });

export default function Roadmap() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group={C.crumb.group} current={C.crumb.current} />
            <h1>{C.h1}</h1>
            <p>{C.lede}</p>
            <p className="bnote"><RichText p={C.note} /></p>
          </section>

          <div className="cols">
            {C.columns.map((c, n) => (
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

          <NextView n={C.next} />
        </main>
      </div>
      <Footer active={C.path} />
    </div>
  );
}
