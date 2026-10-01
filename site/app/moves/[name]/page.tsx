import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Clip } from "../../components/Clip";
import { pageMetadata } from "../../components/seo";
import { JOBS, MOVES, clip, groupLabel, moveByName } from "../../../lib/moves";
import { CopyCode } from "./CopyCode";
import "../moves.css";

type Params = { params: Promise<{ name: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return MOVES.map((m) => ({ name: m.name }));
}

export async function generateMetadata({ params }: Params) {
  const move = moveByName((await params).name);
  if (!move) return {};
  return pageMetadata({
    title: `${move.title} · vawe move`,
    description: `Use when ${move.use}. The clip, the snippet and the notes an agent copies.`,
    path: `/moves/${move.name}`,
  });
}

export default async function MovePage({ params }: Params) {
  const move = moveByName((await params).name);
  if (!move) notFound();
  const files = clip(move.name);
  const rows = JOBS.filter((j) => j.moves.includes(move.name))
    .map((j) => ({ ...j, others: j.moves.filter((n) => n !== move.name).map(moveByName).filter((m) => m !== null) }))
    .filter((j) => j.others.length);

  return (
    <div className="shell">
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <article className="mvd">
          <header className="phead mvd-head">
            <p className="kicker">
              <Link href="/moves">Moves</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/moves?group=${move.group}`}>{groupLabel(move.group)}</Link>
            </p>
            <h1>{move.title}</h1>
            <p className="meta mvd-meta">
              <span>look: {move.look}</span>
              {move.duration ? <span>{move.duration} s</span> : null}
              <a className="mvd-raw" href={files.md} type="text/markdown">
                {move.name}.md
              </a>
            </p>
          </header>

          <figure className="mvd-clip panel">
            <div className="mvd-stage">
              <img src={files.posterHd} alt="" width={1280} height={720} fetchPriority="high" decoding="async" />
              <Clip src={files.mp4} />
            </div>
            <figcaption className="mvd-tap meta">Tap the clip to play it.</figcaption>
          </figure>

          <div className="mvd-doc" id="move-doc" dangerouslySetInnerHTML={{ __html: move.html }} />
          <CopyCode rootId="move-doc" />

          {rows.length ? (
            <section className="mvd-related" aria-labelledby="related">
              <h2 id="related">Same job, other moves</h2>
              {rows.map((row) => (
                <div className="mvd-row" key={row.id}>
                  <p className="meta">
                    <Link href={`/moves?job=${row.id}`}>{row.label}</Link>
                  </p>
                  <ul className="mvd-rel">
                    {row.others.map((m) => (
                      <li key={m.name} className="panel">
                        <img src={clip(m.name).poster} alt="" width={640} height={360} loading="lazy" decoding="async" />
                        <Link href={`/moves/${m.name}`} prefetch={false}>{m.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
        </article>
      </main>
      <Footer />
    </div>
  );
}
