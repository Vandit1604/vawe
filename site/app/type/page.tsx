import { permanentRedirect } from "next/navigation";

/* /type moved to /showcase/type.
 *
 * The reason is the one already written into site/app/showcase/effects/page.tsx and it applies
 * identically here: /showcase is the answer to "what can this render", and the type specimens are
 * that same question asked exhaustively about one layer. As a peer in the top nav it made a visitor
 * guess which of three entries held the thing they wanted, and the nav carried six.
 *
 * A redirect rather than a delete, because this route was linked from outside the app and a 404 is
 * a worse answer than a move. `permanentRedirect` is a 308, so the old URL stops costing a hop once
 * anything that cares has followed it.
 */
export default function TypeMoved() {
  permanentRedirect("/showcase/type");
}
