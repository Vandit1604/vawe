import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, WaveGlyph } from "../../components/Header";
import { Icon } from "../../components/Icon";
import { REPO_URL } from "../../components/Header";
import { Next, PageTop, Sources, Toc } from "../../components/Xp";
import { Footer } from "../../components/Footer";
import { pageMetadata } from "../../components/seo";
import { jsonLdScript, breadcrumbSchema } from "../../../lib/schema";
import { RIVALS, RIVAL_BY_SLUG, VAWE_SOURCES, type Mark } from "../data";
import "../../components/intent.css";
import "../../components/study.css";

export const dynamicParams = false;

const MARK_LABEL: Record<Mark, string> = { yes: "Yes", no: "No", partial: "Partly" };

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
                { name: "Compare", url: "/remotion-alternatives" },
                { name: `vawe vs ${r.name}`, url: `/vs/${r.slug}` },
              ]),
            )}
          />
          <section className="phead">
            <PageTop parent={{ href: "/remotion-alternatives", label: "Compare" }} current={`vawe vs ${r.name}`} />
            <h1>{r.h1}</h1>
            <p>{r.intro}</p>
            <p className="bnote">
              Facts read from {r.name}&apos;s own pages on {r.read}. Sources are listed at the end. vawe
              runs on your machine, needs no account and has no per-render fee.
            </p>
            <Toc items={[
              { href: "#choose", label: "Which to choose" },
              { href: "#table", label: "Side by side" },
              { href: "#stronger", label: `Where ${r.name} is stronger` },
              { href: "#faq", label: "Questions" },
            ]} />
          </section>

          <section className="tldr" id="choose" aria-label="Which one to choose">
            <div>
              <h2>Choose {r.name} when</h2>
              <ul>
                {r.chooseThem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Choose vawe when</h2>
              <ul>
                {r.choosevawe.map((t) => (
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
                    <th scope="col">
                      {r.name}
                    </th>
                    <th scope="col" className="is-vawe">
                      <WaveGlyph className="glyph-sm" />
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
            <h2>Where {r.name} is stronger.</h2>
            <ul className="tldr-list">
              {r.stronger.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="faq" aria-labelledby="faq">
            <h2 id="faq">Questions.</h2>
            <dl>
              {r.faq.map((f) => (
                <div key={f.q}>
                  <dt>{f.q}</dt>
                  <dd>{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Next
            title="Try vawe on one page."
            lead="Write a page, run one command, get an MP4."
            primary={{ href: "/docs/html-to-mp4-with-claude-code", label: "HTML to MP4 with Claude Code" }}
            secondary={{ href: REPO_URL, label: "Star vawe on GitHub" }}
            related={[...r.related, { href: "/moves", label: "See the moves" }, { href: "/problems", label: "Hard problems and where vawe stands" }]}
          />
          <Sources count={r.sources.length + VAWE_SOURCES.length}>
            {[...r.sources, ...VAWE_SOURCES].map((s) => (
              <a key={s.url} href={s.url} rel="noopener">{s.label}</a>
            ))}
          </Sources>
        </main>
      </div>
      <Footer active={`/vs/${r.slug}`} />
    </div>
  );
}
