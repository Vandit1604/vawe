import effects from "../../lib/effects.json";

/* A capability's tag ("preset: up · decode · gradient") names real engine effects. Every one of
 * those names has its own page at /showcase/effects/<stem> (site/lib/effects.json), so the tag
 * should link to them instead of sitting there as inert text repeating a name the reader cannot
 * click. This is the concrete interlink CLAUDE.md asks for: catalog entry -> the primitive it uses.
 *
 * A name is ambiguous on its own (`up`, `flash`, `thermal` each live in more than one family), so
 * resolution picks the family that matches the MOST names in the same tag, then links only the
 * names present in that family. A name absent everywhere, or present only in a family the rest of
 * the tag didn't pick, is left as unlinked text and reported so nobody has to guess later which
 * ones failed silently.
 */

type EffectEntry = { name: string; stem: string };
type EffectFamily = { id: string; entries: EffectEntry[] };
const FAMILIES = (effects as { list: EffectFamily[] }).list;

// name -> every (familyId, stem) it appears under, across the whole registry.
const NAME_INDEX = new Map<string, { familyId: string; stem: string }[]>();
for (const f of FAMILIES) {
  for (const e of f.entries) {
    const hits = NAME_INDEX.get(e.name) ?? [];
    hits.push({ familyId: f.id, stem: e.stem });
    NAME_INDEX.set(e.name, hits);
  }
}

export type TagSegment = { text: string; href: string | null };
export type ResolvedTag = { prefix: string; segments: TagSegment[]; unresolved: string[] };

export function resolveTag(tag: string): ResolvedTag {
  const sep = tag.indexOf(": ");
  const prefix = sep === -1 ? tag : tag.slice(0, sep);
  const rest = sep === -1 ? "" : tag.slice(sep + 2);
  const names = rest.split(" · ").filter(Boolean);

  // Score each candidate family by how many of THIS tag's names it contains.
  const scoreByFamily = new Map<string, number>();
  for (const n of names) {
    for (const hit of NAME_INDEX.get(n) ?? []) {
      scoreByFamily.set(hit.familyId, (scoreByFamily.get(hit.familyId) ?? 0) + 1);
    }
  }
  let winner: string | null = null;
  let best = 0;
  for (const [familyId, score] of scoreByFamily) {
    if (score > best) { best = score; winner = familyId; }
  }

  const segments: TagSegment[] = [];
  const unresolved: string[] = [];
  for (const n of names) {
    const hit = winner ? (NAME_INDEX.get(n) ?? []).find((h) => h.familyId === winner) : undefined;
    if (hit) segments.push({ text: n, href: `/showcase/effects/${hit.stem}` });
    else { segments.push({ text: n, href: null }); unresolved.push(n); }
  }
  return { prefix, segments, unresolved };
}
