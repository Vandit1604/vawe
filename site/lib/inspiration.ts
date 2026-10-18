import data from "../content/inspiration.json";
import { smart } from "./typo.mjs";
import type { InspirationCard, InspirationPost, InspirationType } from "./inspiration-shared";

export * from "./inspiration-shared";

export const INSPIRATION_TYPES: InspirationType[] = data.types;
const POSTS = data.posts as InspirationPost[];

// An X post id is a snowflake: the top bits are milliseconds since X's epoch.
const X_EPOCH = BigInt(1288834974657);
export const postedAt = (id: string) => new Date(Number((BigInt(id) >> BigInt(22)) + X_EPOCH)).toISOString();

const typeLabel = (p: InspirationPost) => INSPIRATION_TYPES.find((t) => t.id === p.types[0])?.label ?? "";

// Newest first; a post with no title (its text could not be read) goes last.
export const INSPIRATION: InspirationCard[] = POSTS.map(({ prompt, ...p }) => ({
  ...p,
  title: smart(p.title),
  tool: p.tool === "unknown" ? "" : p.tool,
  posted: postedAt(p.id),
  typeLabel: typeLabel(p),
  ...(prompt ? { promptSource: prompt.source } : {}),
})).sort((a, b) => (!a.title === !b.title ? b.posted.localeCompare(a.posted) : a.title ? -1 : 1));

export const INSPIRATION_PROMPTS: Record<string, string> = Object.fromEntries(
  POSTS.filter((p) => p.prompt).map((p) => [p.id, p.prompt!.text]),
);
