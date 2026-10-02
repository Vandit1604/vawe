import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { pageMetadata } from "../../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../../lib/schema";
import { RIVALS, RIVAL_BY_SLUG, VAWE_SOURCES } from "../data";
import "../../components/intent.css";
import "../../components/study.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return RIVALS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = RIVAL_BY_SLUG[slug];
  if (!r) return {};
  return pageMetadata({ title: r.metaTitle, description: r.metaDescription, path: `/vs/${r.slug}` });
}

export default async function Vs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = RIVAL_BY_SLUG[slug];
  if (!r) notFound();

  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage" tabIndex={-1}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={jsonLdScript(
              breadcrumbSchema([
                { name: "Vawe", url: "/" },
                { name: "Compare", url: "/remotion-alternatives" },
                { name: `Vawe vs ${r.name}`, url: `/vs/${r.slug}` },
              ]),
            )}
          />
          <section className="phead">
            <h1>{r.h1}</h1>
            <p>{r.intro}</p>
            <p className="bnote">Facts read from {r.name}&apos;s own pages on {r.read}. Sources are listed at the end.</p>
          </section>

          <section className="tldr" aria-label="Which one to choose">
            <div>
              <h2>Choose {r.name} when</h2>
              <ul>
                {r.chooseThem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Choose Vawe when</h2>
              <ul>
                {r.chooseVawe.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="tfacts">
            <h2>What {r.name} is.</h2>
            <p>{r.what}</p>
          </section>

          <section className="iend" aria-labelledby="table">
            <h2 className="h2" id="table">Side by side.</h2>
            <div className="itable-wrap">
              <table className="itable">
                <thead>
                  <tr>
                    <th scope="col">feature</th>
                    <th scope="col">{r.name}</th>
                    <th scope="col">Vawe</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>{row.them}</td>
                      <td>{row.vawe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tfacts">
            <h2>Where {r.name} is stronger.</h2>
            <ul className="tldr-list">
              {r.stronger.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="faq" aria-labelledby="faq">
            <h2 id="faq">Questions people ask.</h2>
            <dl>
              {r.faq.map((f) => (
                <div key={f.q}>
                  <dt>{f.q}</dt>
                  <dd>{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="iend">
            <h2 className="h2">Try Vawe on one page.</h2>
            <p className="lead">
              Write a page, run one command, get an MP4. The quickstart takes a few minutes.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/docs/html-to-mp4-with-claude-code">
                HTML to MP4 with Claude Code <span className="arw">→</span>
              </a>
              <a className="btn btn-ghost" href="/moves">See the moves</a>
            </div>
            <div className="irelated">
              {r.related.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
              <a href="/problems">Hard problems and where Vawe stands</a>
            </div>
            <div className="srcs" aria-label="Sources">
              {[...r.sources, ...VAWE_SOURCES].map((s) => (
                <a key={s.url} href={s.url} rel="noopener">{s.label}</a>
              ))}
            </div>
          </section>
        </main>
      </div>
      <Footer active={`/vs/${r.slug}`} />
    </div>
  );
}
