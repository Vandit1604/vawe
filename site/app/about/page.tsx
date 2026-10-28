import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Clip } from "../components/Clip";
import { pageMetadata } from "../components/seo";
import { Next, PageTop, Toc } from "../components/Xp";
import { RichText } from "../components/RichText";
import { jsonLdScript, breadcrumbSchema, aboutPageSchema } from "../../lib/schema";
import { ABOUT, type Step } from "../../lib/content/about";
import "../components/intent.css";
import "../components/study.css";
import "./about.css";

const { meta, owner, crumb, toc, sections, next } = ABOUT;

export const metadata = pageMetadata({ ...meta, path: ABOUT.path });

function Steps({ items }: { items: Step[] }) {
  return (
    <ol className="xp-list">
      {items.map((p) => (
        <li key={p.lead}>
          <span>
            <strong>{p.lead}</strong> <RichText p={p.line} />
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
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: crumb.current, url: ABOUT.path }]))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(aboutPageSchema({ description: meta.description, owner }))}
      />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group={crumb.group} current={crumb.current} />
            <h1>{ABOUT.h1}</h1>
            <p>{ABOUT.lede}</p>
            <Toc items={toc} />
          </section>

          {sections.map((sec) => (
            <section className={sec.className ? `isec ${sec.className}` : "isec"} id={sec.id} key={sec.id}>
              <div className="isec-text">
                <h2>{sec.title}</h2>
                {sec.paragraphs?.map((p, i) => (
                  <p key={i}><RichText p={p} /></p>
                ))}
                {sec.steps ? <Steps items={sec.steps} /> : null}
                {sec.cite ? <span className="cite">{sec.cite}</span> : null}
              </div>
              {sec.filmCaption ? (
                <div className="isec-art">
                  <div className="ab-film">
                    <Clip webm="/examples/showcase.webm" src="/examples/showcase.mp4" poster="/examples/showcase.webp" decorative />
                  </div>
                  <span className="meta ab-cap">{sec.filmCaption}</span>
                </div>
              ) : null}
            </section>
          ))}

          <Next
            title={next.title}
            lead={next.lead ? <RichText p={next.lead} /> : undefined}
            primary={next.primary}
            secondary={next.secondary}
          />
        </main>
      </div>
      <Footer active={ABOUT.path} />
    </div>
  );
}
