import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, VaweMark } from "../../components/Header";
import { Icon } from "../../components/Icon";
import { PageTop, Sources, Toc } from "../../components/Xp";
import { NextView } from "../../components/RichText";
import { Footer } from "../../components/Footer";
import { pageMetadata } from "../../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../../lib/schema";
import { MARK_LABEL, RIVALS, RIVAL_BY_SLUG, VAWE_SOURCES, vsPage, type Mark } from "../../../lib/content/vs";
import "../../components/intent.css";
import "../../components/study.css";

export const dynamicParams = false;

function Cell({ text, mark, vawe }: { text: string; mark?: Mark; vawe?: boolean }) {
  return (
    <td className={vawe ? "is-vawe" : undefined}>
      {mark && (
        <span className={`mk mk-${mark}`}>
          <Icon name={mark === "yes" ? "check" : mark === "no" ? "x" : "minus"} size={14} label={MARK_LABEL[mark]} />
        </span>
      )}
      {text}
    </td>
  );
}

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
  const c = vsPage(r);

  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={jsonLdScript(
              breadcrumbSchema([
                { name: "vawe", url: "/" },
                { name: c.parent.label, url: c.parent.href },
                { name: c.current, url: c.path },
              ]),
            )}
          />
          <section className="phead">
            <PageTop parent={c.parent} current={c.current} />
            <h1>{r.h1}</h1>
            <p>{r.intro}</p>
            <p className="bnote">{c.note}</p>
            <Toc items={c.toc} />
          </section>

          <section className="tldr" id="choose" aria-label={c.chooseLabel}>
            <div>
              <h2>{c.chooseThem}</h2>
              <ul>
                {r.chooseThem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2>{c.choosevawe}</h2>
              <ul>
                {r.choosevawe.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="tfacts">
            <h2>{c.what}</h2>
            <p>{r.what}</p>
          </section>

          <section className="iend" aria-labelledby="table">
            <h2 className="h2" id="table">{c.table.title}</h2>
            <div className="itable-wrap">
              <table className="itable">
                <thead>
                  <tr>
                    <th scope="col">{c.table.feature}</th>
                    <th scope="col">
                      {r.name}
                    </th>
                    <th scope="col" className="is-vawe">
                      <VaweMark className="glyph-sm" />
                      vawe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <Cell text={row.them} mark={row.t} />
                      <Cell text={row.vawe} mark={row.v} vawe />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tfacts" id="stronger">
            <h2>{c.stronger}</h2>
            <ul className="tldr-list">
              {r.stronger.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="faq" aria-labelledby="faq">
            <h2 id="faq">{c.faqTitle}</h2>
            <dl>
              {r.faq.map((f) => (
                <div key={f.q}>
                  <dt>{f.q}</dt>
                  <dd>{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <NextView n={c.next} />
          <Sources count={r.sources.length + VAWE_SOURCES.length}>
            {[...r.sources, ...VAWE_SOURCES].map((s) => (
              <a key={s.url} href={s.url} rel="noopener">{s.label}</a>
            ))}
          </Sources>
        </main>
      </div>
      <Footer active={c.path} />
    </div>
  );
}
