import KINDS from "../../lib/layer-kinds.json";

// A scene read as studio clips: one bar per timed layer, in its lane colour. The landing hero and the
// showcase cards both draw from it.

export type Layer = { type: string; start?: number; duration?: number; dur?: number; [k: string]: unknown };
export type Scene = { aspect?: string; duration: number; layers: Layer[] };
export type Clip = { i: number; kind: string; start: number; end: number; label: string; line: string };

export const LANE_NAME: Record<string, string> = { text: "Text", media: "Media", shape: "Shape", comp: "Comp", cap: "Captions", sound: "Sound" };
// Fields too long to read in one line of the scene view; the line shows that they exist, not their body.
const BULKY = new Set(["html", "motion", "children", "layers", "parts", "style", "css", "points", "data"]);
const kindOf = (type: string) => (KINDS.kind as Record<string, string>)[type] ?? "comp";

const labelOf = (l: Layer) => {
  const src = typeof l.src === "string" ? l.src.split("/").pop() : undefined;
  const raw = [l.text, l.label, l.id, src, l.block, l.type].find((v) => typeof v === "string" && v) as string;
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 48);
};

const lineOf = (l: Layer) =>
  JSON.stringify(Object.fromEntries(Object.entries(l).map(([k, v]) => [k, BULKY.has(k) ? (Array.isArray(v) ? `[…${v.length}]` : "…") : v])));

export function clipsOf(scene: Scene): Clip[] {
  return scene.layers.flatMap((l, i) => {
    if (typeof l.start !== "number") return [];
    const length = l.duration ?? l.dur ?? scene.duration - l.start;
    return [{ i, kind: kindOf(l.type), start: l.start, end: Math.min(scene.duration, l.start + length), label: labelOf(l), line: lineOf(l) }];
  });
}

// Overlapping layers stack into rows, as the studio timeline draws them, capped so a busy lane stays short.
const MAX_ROWS = 3;
export function packRows(items: Clip[]): (Clip & { row: number })[] {
  const ends: number[] = [];
  return items.map((c) => {
    let row = ends.findIndex((e) => e <= c.start);
    if (row < 0) row = ends.length < MAX_ROWS ? ends.push(0) - 1 : ends.indexOf(Math.min(...ends));
    ends[row] = c.end;
    return { ...c, row };
  });
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

