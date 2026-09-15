import schemaRaw from "../../../../../films/scene/schema.json";

/* Derive an effect's editable knobs from its own authoring snippet (site/lib/effects-body.json),
 * with a label per field read off films/scene/schema.json — never hand-listed per family. A
 * field the schema does not describe gets no description rather than an invented one.
 *
 * WHY WALK THE SNIPPET INSTEAD OF THE SCHEMA. The schema describes every possible field on every
 * layer type; a single effect's snippet uses a handful of them. Walking the snippet and looking
 * each key up in the schema gives exactly the knobs THIS effect declares, in the shape its own
 * family already wrote (scripts/site/effects-json.mjs's USAGE table).
 */

type SchemaField = { type?: string; label?: string; enum?: string[]; item?: Record<string, SchemaField>; fields?: Record<string, SchemaField> };
const schema = schemaRaw as unknown as { fields: Record<string, SchemaField> };

const F = schema.fields ?? {};

// `preset`, `text`, `size` and a few others mean a DIFFERENT thing on a layer than they do inside
// `captions[]` or `bg[]` (a caption's own `size` label reads "Font size for this caption only", a
// bg's `preset` reads "bgPreset name" — neither is what a kinetic-preset text layer's `preset`/`size`
// means). So the def set is picked by WHICH container this leaf's path sits inside, not merged flat
// — a flat merge let the last-spread container silently win every collision.
function defsFor(path: (string | number)[]): Record<string, SchemaField> {
  const top = path[0];
  if (top === "captions") return F.captions?.item ?? {};
  if (top === "cuts") return F.cuts?.item ?? {};
  if (top === "stings") return F.stings?.item ?? {};
  if (top === "seams") return F.seams?.item ?? {};
  if (top === "bg") return F.bg?.item ?? {};
  if (top === "spectacle") return F.spectacle?.fields ?? {};
  return F.layers?.item ?? {};
}

// Structural plumbing every family's USAGE writes to place the demo layer on the canvas, never the
// effect's own dial: the x/y/w/h box, the layer discriminator, the timing box. Not excluded when
// the SAME leaf is the one naming the effect (see `identifying` below) — that one is shown, locked,
// rather than hidden, because a reader should see what value they are looking at.
const EXCLUDE_TOP = new Set(["type", "x", "y", "w", "h", "start", "duration"]);

export type KnobControl = "text" | "number" | "boolean" | "select";
export type Knob = {
  path: (string | number)[];
  key: string;
  label: string | null;
  control: KnobControl;
  value: string | number | boolean;
  options: string[] | null;
  locked: boolean;
};
export type KnobPlan = { knobs: Knob[]; bodyType: string | null };

// Schema prose is written for a docs page, not a 200px control: cut at a sentence or word boundary
// past 160 characters rather than truncating mid-word.
// THE SAME NORMALISATION effects-json.mjs ALREADY DOES, applied at the second place registry prose
// crosses onto a page. That file's `prose()` carries the reason: the labels are written for a
// markdown doc and lean on the em-dash, and no em-dash reaches a user-facing surface here. These
// labels used to be seen by a validator and an editor field, so nobody had to care; the knob panel
// put 28 of them onto 528 public pages, and the rule did not follow because the helper lived in a
// build script this page never runs. The middle dot is what the rest of the site already uses.
const prose = (s: string) => s.replace(/\s*[—–]\s*/g, " · ");

function trimLabel(raw: string): string {
  const label = prose(raw);
  if (label.length <= 160) return label;
  const cut = label.slice(0, 160);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, stop > 40 ? stop : 160)}…`;
}

function lastStringKey(path: (string | number)[]): string {
  for (let i = path.length - 1; i >= 0; i--) if (typeof path[i] === "string") return path[i] as string;
  return String(path[path.length - 1] ?? "");
}

type Leaf = { path: (string | number)[]; value: string | number | boolean };

function collectLeaves(node: unknown, path: (string | number)[], out: Leaf[]) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectLeaves(item, [...path, i], out));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) collectLeaves(v, [...path, k], out);
  } else if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    out.push({ path, value: node });
  }
}

export function deriveKnobs(json: string, effectName: string): KnobPlan {
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    // A handful of families (drawn-icons, generators-the-playground, lightfield-dials) hand back a
    // JS expression or a comment-prefixed snippet, not JSON — there is no form to walk.
    return { knobs: [], bodyType: null };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { knobs: [], bodyType: null };
  const bodyType = typeof (body as { type?: unknown }).type === "string" ? ((body as { type: string }).type) : null;

  const leaves: Leaf[] = [];
  collectLeaves(body, [], leaves);

  // The leaf that IS this effect: the one value that equals its own name. Locked, because editing
  // it would make the page show a different effect than the one in its title (CLAUDE brief).
  const identifying = leaves.find((l) => l.value === effectName) ?? null;

  const knobs: Knob[] = [];
  for (const leaf of leaves) {
    const locked = leaf === identifying;
    const topKey = leaf.path.length === 1 ? (leaf.path[0] as string) : null;
    if (!locked && topKey && EXCLUDE_TOP.has(topKey)) continue;
    const key = lastStringKey(leaf.path);
    const def = defsFor(leaf.path)[key] ?? F[key];
    const label = def?.label ? trimLabel(def.label) : null;
    const options = Array.isArray(def?.enum) ? (def.enum as string[]) : null;
    const control: KnobControl = options
      ? "select"
      : typeof leaf.value === "number"
        ? "number"
        : typeof leaf.value === "boolean"
          ? "boolean"
          : "text";
    knobs.push({ path: leaf.path, key, label, control, value: leaf.value, options, locked });
  }
  return { knobs, bodyType };
}
