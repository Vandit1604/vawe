import Link from "next/link";
import { Clip } from "./Clip";
import { clip, moveByName } from "../../lib/moves";

// A row of move clips, each linking to its /moves page. Names that are not a move are skipped.
export function MoveClips({ names }: { names: string[] }) {
  const moves = names.map(moveByName).filter((m) => m !== null);
  return (
    <ul className="imoves">
      {moves.map((m) => {
        const files = clip(m);
        return (
          <li key={m.name} className="panel">
            <Clip src={files.mp4} webm={files.webm} poster={files.poster} />
            <Link href={`/moves/${m.name}`} prefetch={false}>{m.title}</Link>
          </li>
        );
      })}
    </ul>
  );
}
