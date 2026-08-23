import effects from "../../lib/effects.json";
import blocks from "../../lib/blocks.json";

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
 *
 * TWO REGISTRIES, NOT ONE, because the tags already name both and only one was being searched.
 * `block: lineChart · statBig · kpiRow` and `block: browserFrame · cursor · toast` are BLOCKS, and
 * a block is not an effect: it lives in site/lib/blocks.json and has its own page at /blocks/<name>.
 * Searching effects alone left ten names inert on a page whose whole point was that they are not.
 * Effects are tried first and blocks are the fallback, because an effect name is the ambiguous case
 * that needs the family-scoring above, while a block name is unique and matches exactly.
 *
 * FIVE NAMES STILL DO NOT LINK, AND THAT IS CORRECT: `color`, `sprites`, `bayer`, `ken burns` and
 * `radius`. Every one of them is a PROP VALUE, not a catalogue entry: a ransom mode, a dither
 * variant, an image-layer option. There is no page for them because there is no thing for a page to
 * be about, and inventing a destination would be worse than plain text. They are named here so the
 * next reader does not go looking for a registry that would hold them.
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

// name -> /blocks/<name>. A block name is unique in its registry, so this needs no scoring.
const BLOCK_NAMES = new Set((blocks as { name: string }[]).map((b) => b.name));

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
    else if (BLOCK_NAMES.has(n)) segments.push({ text: n, href: `/blocks/${n}` });
    else { segments.push({ text: n, href: null }); unresolved.push(n); }
  }
  return { prefix, segments, unresolved };
}
