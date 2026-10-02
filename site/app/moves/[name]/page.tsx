import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Clip } from "../../components/Clip";
import { pageMetadata } from "../../components/seo";
import { MOVES, clip, groupLabel, moveByName, type Ease, type Move } from "../../../lib/moves";
import { moveAlt } from "../../../lib/move-words";
import { moveSeoDescription, moveSeoTitle, relatedMoves } from "../../../lib/move-seo";
import { jsonLdScript } from "../../../lib/schema";
import { moveBreadcrumbSchema, techArticleSchema, videoObjectSchema } from "../../../lib/schema-content";
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
    title: moveSeoTitle(move),
    description: moveSeoDescription(move),
    path: `/moves/${move.name}`,
    type: "article",
    markdown: `/moves/${move.name}.md`,
  });
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const handle = (h: Ease["out"]) => `${h.influence}% influence, speed ${h.speed}`;

function easeTable(eases: Ease[]) {
  if (!eases.length) return "";
  const rows = eases
    .map((e) => `<tr><th scope="row"><a href="/easing/${kebab(e.name)}"><code>${e.name}</code></a></th><td>${handle(e.out)}</td><td>${handle(e.into)}</td></tr>`)
    .join("");
  return [
    `<p>The clip uses ${eases.length === 1 ? "one named ease" : `${eases.length} named eases`} from <code>core/motion/presets.js</code>. Each is a pair of After Effects handles: influence is how far along the segment the handle reaches, and speed is how fast the value moves at the key, as a multiple of the segment's average speed. <a href="/docs/motion">Motion in the docs</a> explains both.</p>`,
    `<div class="mvd-table"><table><thead><tr><th scope="col">Ease</th><th scope="col">Leaving a key</th><th scope="col">Arriving at a key</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  ].join("\n");
}

function docHtml(m: Move) {
  const timing = [m.duration ? `The clip runs ${m.duration} s.` : "", `The look is <code>${m.look}</code>.`].filter(Boolean).join(" ");
  const parts = [
    `<h2 id="when-to-use">When to use</h2>`,
    m.useHtml,
    `<h2 id="the-code">The code</h2>`,
    m.codeHtml,
    `<h2 id="easing-and-timing">Easing and timing</h2>`,
    `<p>${timing}</p>`,
    easeTable(m.eases),
    m.notesHtml ? `<h2 id="notes">Notes</h2>\n${m.notesHtml}` : "",
    m.soundHtml ? `<h2 id="sound">Sound</h2>\n${m.soundHtml}` : "",
  ];
  return parts.filter(Boolean).join("\n");
}

export default async function MovePage({ params }: Params) {
  const move = moveByName((await params).name);
  if (!move) notFound();
  const files = clip(move);
  const related = relatedMoves(move);

  return (
    <div className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(videoObjectSchema(move))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(techArticleSchema(move))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(moveBreadcrumbSchema(move))} />
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
              <img src={files.posterHd} alt={moveAlt(move)} width={1280} height={720} fetchPriority="high" decoding="async" />
              <Clip src={files.mp4} />
            </div>
            <figcaption className="mvd-tap meta">Tap the clip to play it.</figcaption>
          </figure>

          <div className="mvd-doc" id="move-doc" dangerouslySetInnerHTML={{ __html: docHtml(move) }} />
          <CopyCode rootId="move-doc" />

          <section className="mvd-related" aria-labelledby="related">
            <h2 id="related">Related moves</h2>
            <ul className="mvd-rel">
              {related.map((m) => (
                <li key={m.name} className="panel">
                  <img src={clip(m).poster} alt={moveAlt(m)} width={640} height={360} loading="lazy" decoding="async" />
                  <Link href={`/moves/${m.name}`} prefetch={false}>{m.title}</Link>
                </li>
              ))}
            </ul>
            <p className="mvd-more">
              See all <Link href="/moves">{MOVES.length} moves</Link>. Learn how a page becomes a film in the{" "}
              <a href="/docs">docs</a>, copy chains of moves from the <a href="/docs/recipes">recipes</a>, or read
              the <a href="/docs/motion">motion guide</a>.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
