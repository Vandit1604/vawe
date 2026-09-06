/* THE `make expand` CLIFF, for HAND-TYPED sugar only.
 *
 * The engine ships four authoring sugars. Three of them — `block`, `beat`, `comp` — are BUILD-TIME:
 * `core/expand.js` `expandScene` turns them into real layers, at load. The picker's own scenes never
 * hit this any more: scripts/site/scenes-json.mjs expands them at PUBLISH time, before they ever reach
 * `site/public/scenes/`. What is left, and what this file still exists for, is a scene a visitor TYPES
 * by hand into the editor, with no publish step to run it through.
 *
 * Why the render page (and this editor's live stage, the same iframe) cannot expand it live. It is not
 * a bundler limitation: `blocks/index.mjs` is static-import based precisely so it CAN be bundled
 * (see its own file banner). It is a deliberate SERVER boundary instead: `formats/scene/scene.js` never
 * imports `core/expand.js`, because the render page's file server default-denies the ~186 block/beat
 * factories by design (`internal/scene/scene.go` `served`, a security wall for MCP/stranger scenes),
 * and one factory (`blocks/geo.mjs`) imports `d3-geo` by bare specifier, resolvable only through an
 * import map that page does not carry. So the editor catches the three FIRST, while a visitor is
 * typing, and says the true thing: this needs a publish step it cannot run here, here is the layer,
 * here is the line.
 */

export type Sugar = { type: string; name: string; line: number };

const SUGAR = new Set(["block", "beat", "comp"]);
/** the prop that names WHICH one, per sugar type — used to find the line in the source text */
const NAME_PROP: Record<string, string> = { block: "block", beat: "beat", comp: "ref" };

/** Line of the first occurrence of `"<prop>": "<value>"`, 1-based. 0 when the text does not say. */
function lineOf(doc: string, prop: string, value: string, from: number): number {
  const needle = new RegExp(`"${prop}"\\s*:\\s*"${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  const lines = doc.split("\n");
  for (let i = from; i < lines.length; i++) if (needle.test(lines[i])) return i + 1;
  return 0;
}

/** Every build-time sugar layer in a PARSED scene, in document order, each with its source line. */
export function findSugar(scene: unknown, doc: string): Sugar[] {
  const found: Sugar[] = [];
  let cursor = 0;
  const walk = (layers: unknown) => {
    if (!Array.isArray(layers)) return;
    for (const l of layers) {
      if (!l || typeof l !== "object") continue;
      const L = l as Record<string, unknown>;
      const t = typeof L.type === "string" ? L.type : "";
      if (SUGAR.has(t)) {
        const name = String(L[NAME_PROP[t]] ?? "?");
        const line = lineOf(doc, NAME_PROP[t], name, cursor);
        if (line) cursor = line; // keep the scan moving so repeats resolve to distinct lines
        found.push({ type: t, name, line });
      }
      walk(L.children);
    }
  };
  const s = scene as { layers?: unknown; comps?: Record<string, { layers?: unknown }> };
  walk(s?.layers);
  for (const c of Object.values(s?.comps ?? {})) walk(c?.layers);
  return found;
}

/** The refusal, in the editor's own voice. Named the way the engine names things: what, and the fix. */
export function sugarMessage(found: Sugar[]): string {
  const one = found.length === 1;
  const list = found.map((f) => `  line ${f.line || "?"} · "type": "${f.type}" → ${f.name}`).join("\n");
  return (
    `${found.length} build-time sugar layer${one ? "" : "s"} typed by hand. This stage cannot expand `
    + `${one ? "it" : "them"} live:\n`
    + `block, beat and comp are expanded before a render, not during one.\n\n`
    + `${list}\n\n`
    + `A scene picked from the list above is already expanded (scripts/site/scenes-json.mjs does that `
    + `at publish time); typing a NEW block/beat layer by hand has no publish step to run it through. `
    + `Run \`make expand D=<scene.json>\` and paste the printed JSON, or replace the layer with the `
    + `primitives it emits.`
  );
}

/** First 1-based line a JSON.parse SyntaxError points at, or 0. V8 spells both forms. */
export function errorLine(message: string, doc: string): number {
  const named = /line (\d+)/.exec(message);
  if (named) return +named[1];
  const pos = /position (\d+)/.exec(message);
  if (!pos) return 0;
  return doc.slice(0, +pos[1]).split("\n").length;
}
