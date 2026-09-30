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
          <h1>Moves to copy, each with its clip.</h1>
          <p className="ls-sub">
            A move is one markdown file: when to use it, the snippet, the notes and the sound cue. Pick
            from the clip, then hand the file to your agent.
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
