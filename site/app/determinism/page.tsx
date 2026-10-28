import { Header } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { PageTop, Toc } from "../components/Xp";
import { NextView, SectionView } from "../components/RichText";
import { DETERMINISM as C } from "../../lib/content/determinism";
import "../components/intent.css";

export const metadata = pageMetadata({ ...C.meta, path: C.path });

/* /determinism · the intent page for "why is my render nondeterministic". It states only what the
 * repo runs and cites the file: core/engine/page-clock.js, harness/media/render-page.mjs and
 * tests/media/render-page-determinism.test.mjs. No competitor is named.
 */

export default function Determinism() {
  return (
    <div className="shell">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: C.crumb.current, url: C.path }]))} />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group={C.crumb.group} current={C.crumb.current} />
            <h1>{C.h1}</h1>
            <p>{C.lede}</p>
            <Toc items={C.toc} />
          </section>

          {C.sections.map((s) => (
            <SectionView key={s.id} s={s} />
          ))}

          <NextView n={C.next} />
        </main>
      </div>
      <Footer active={C.path} />
    </div>
  );
}
