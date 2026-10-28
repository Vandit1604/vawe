import { Header } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { PageTop, Toc } from "../components/Xp";
import { NextView, SectionView } from "../components/RichText";
import { WHEN_DETERMINISM as C } from "../../lib/content/when-determinism-matters";
import "../components/intent.css";

export const metadata = pageMetadata({ ...C.meta, path: C.path });

/* /when-determinism-matters · a decision-shaped companion to /determinism, not a duplicate of
 * it. /determinism explains the mechanism (virtual clock, two gates) in this repo; this page
 * answers a different question, when does the property change a real decision, and states it in
 * a way that survives a competitor's next release because it is about a property, not a
 * scoreboard. No competitor's determinism is characterized as present or absent here: the one
 * competitor fact used (HyperFrames documents the same commitment) is read off that project's own
 * page and cited, exactly like the rest of this SEO pass's rule.
 */

export default function WhenDeterminismMatters() {
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
