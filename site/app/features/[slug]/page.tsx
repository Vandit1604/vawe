import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../components/Header";
import { Clip } from "../../components/Clip";
import { Footer } from "../../components/Footer";
import { FEATURES, bySlug } from "../../../lib/features";

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = bySlug(slug);
  if (!f) return { title: "Vawe — features" };
  return { title: `Vawe — ${f.title}`, description: f.tagline };
}

// render inline `code` spans within a paragraph
function Prose({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g);
  return (
    <p>
      {parts.map((p, i) => (i % 2 === 1 ? <code key={i}>{p}</code> : <span key={i}>{p}</span>))}
    </p>
  );
}

export default async function FeatureDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = bySlug(slug);
  if (!f) notFound();

  const isInternalDocs = f.docs.startsWith("/");

  return (
    <div className="shell">
      <Header active="features" />
      <div className="wrap">
        <main id="main">
        <section className="fdetail">
          <Link className="backlink" href="/features">
            ← all features
          </Link>
          <div className="phead" style={{ padding: 0, maxWidth: "none" }}>
            <span className="kicker">{f.kicker}</span>
            <h1>{f.title}</h1>
            <p className="tagline">{f.tagline}</p>
          </div>

          {f.aspectTrio ? (
            <div className="demo-media" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
              <div className="trio">
                <div className="ar a169">
                  <Clip src="/assets/showcase/aspect-169.mp4" poster="/assets/showcase/aspect-169.jpg" />
                  <span>16:9</span>
                </div>
                <div className="ar a916">
                  <Clip src="/assets/showcase/aspect-916.mp4" poster="/assets/showcase/aspect-916.jpg" />
                  <span>9:16</span>
                </div>
                <div className="ar a11">
                  <Clip src="/assets/showcase/aspect-11.mp4" poster="/assets/showcase/aspect-11.jpg" />
                  <span>1:1</span>
                </div>
              </div>
            </div>
          ) : f.demo ? (
            <div className="demo-media">
              <Clip src={f.demo} poster={f.poster ?? undefined} />
            </div>
          ) : null}

          <div className="prose" style={{ marginTop: f.demo || f.aspectTrio ? 0 : 30 }}>
            {f.body.map((p, i) => (
              <Prose key={i} text={p} />
            ))}
          </div>

          {f.code && (
            <div className="codeblock">
              {f.codeLabel && <div className="lbl">{f.codeLabel}</div>}
              <pre className="code" dangerouslySetInnerHTML={{ __html: f.code }} />
            </div>
          )}

          <div>
            <span className="tag">{f.tag}</span>
          </div>

          <div className="foot-links">
            {isInternalDocs ? (
              <Link className="btn btn-primary" href={f.docs}>
                View the {f.slug === "blocks" ? "registry" : "docs"} →
              </Link>
            ) : (
              <a className="btn btn-primary" href={f.docs}>
                Read the docs →
              </a>
            )}
            <Link className="btn btn-ghost" href="/features">
              ← All features
            </Link>
          </div>
        </section>
        </main>

        <Footer note={f.tag} />
      </div>
    </div>
  );
}
