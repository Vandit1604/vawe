import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { GROUPS, JOBS, LOOKS, MOVES, toCard } from "../../lib/moves";
import { MovesGallery } from "./MovesGallery";
import "./moves.css";

export const metadata = pageMetadata({
  title: "Vawe · moves",
  description: `${MOVES.length} proven motion moves, each a clip and the markdown an agent copies: when to use it, the CSS and Web Animations snippet, the notes and the sound cue.`,
  path: "/moves",
});

export default function Moves() {
  return (
    <div className="shell">
      <Header active="moves" />
      <main className="wrap" id="content" tabIndex={-1}>
        <section className="ls ls-top mv">
          <h1>Moves</h1>
          <p className="ls-sub">
            Each move is a clip and one markdown file: when to use it, the snippet, the notes and the
            sound cue. Agents can filter the same list in <a href="/moves/index.json">index.json</a>.
          </p>
          <MovesGallery
            moves={MOVES.map(toCard)}
            groups={GROUPS}
            looks={LOOKS}
            jobs={JOBS.map(({ id, label }) => ({ id, label }))}
          />
        </section>
      </main>
      <Footer active="/moves" />
    </div>
  );
}
