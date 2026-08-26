/* THE `make expand` CLIFF.
 *
 * The engine ships four authoring sugars. Three of them — `block`, `beat`, `comp` — are BUILD-TIME:
 * `make expand` turns them into real layers, and the renderer refuses them by name at boot
 * (core/layers/index.js:88). The fourth, `cameraMove`, bakes at boot (core/produce.js) and is
 * therefore fine in a browser; it is deliberately not listed here.
 *
 * A browser author has no shell, so `make expand` is not a step they can take. The engine's refusal
 * is correct and it names a fix they cannot reach. So the editor catches the three FIRST, while they
 * are typing, and says the true thing: this needs the CLI, here is the layer, here is the line.
 *
 * Why not expand here. `blocks/index.mjs` discovers its ~156 factories with `fs.readdirSync` plus a
 * dynamic `import(pathToFileURL(...))`. No bundler can follow that, so neither a client bundle nor a
 * traced `output: "standalone"` server route would carry the modules — it would work in dev and ship
 * broken, which is the silent-substitution failure this repo refuses.
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
    `${found.length} build-time sugar layer${one ? "" : "s"}. The renderer refuses ${one ? "it" : "them"}:\n`
    + `block, beat and comp are expanded before a render, not during one.\n\n`
    + `${list}\n\n`
    + `The browser cannot expand ${one ? "it" : "them"}: the block factories are discovered from the `
    + `filesystem, so they do not exist here. Run \`make expand D=<scene.json>\` and paste the `
    + `.expanded.json, or replace the layer with the primitives it emits.`
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
