/* The shapes site/lib/effects.json ships, plus the one renderer the effect pages share.
 *
 * These lived in EffectsBrowser.tsx, the client component behind the old /showcase/effects index.
 * That index is gone — /arsenal indexes blocks and effects together now — but the per-effect page
 * still needs the family/entry types and still has to render the registry's markdown, so the two
 * survivors moved here rather than keeping a browser alive for its type exports.
 */

export type Entry = { name: string; stem: string; desc: string; scene: string | null; noPreview: string | null };
export type Family = {
  id: string; title: string; tag: string; intro: string;
  mode: "table" | "chips"; note: string | null; noPreview: string | null;
  count: number; undescribed: number; entries: Entry[];
};
export type Index = { total: number; previewed: number; families: number; tags: [string, number][]; list: Family[] };

// The intro and desc strings are markdown from the doc generator: `code` and **bold** carry real
// meaning (they are the property names), so they are rendered rather than shown as punctuation.
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code>
        : p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b>
        : <span key={i}>{p}</span>,
      )}
    </>
  );
}
