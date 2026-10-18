import data from "../content/inspiration.json";
import { smart } from "./typo.mjs";

export type InspirationType = { id: string; chip: string; label: string };
export type InspirationPost = {
  id: string;
  title: string;
  creator: { name: string; handle: string };
  url: string;
  types: string[];
  tags: string[];
  tool: string;
  prompt?: { text: string; cut?: boolean; source: string };
  poster: string;
  playback: string;
  duration: number;
};
export type InspirationCard = InspirationPost & { posted: string; typeLabel: string };

export const INSPIRATION_PATH = "/inspiration";
export const INSPIRATION_TYPES: InspirationType[] = data.types;

// An X post id is a snowflake: the top bits are milliseconds since X's epoch.
const X_EPOCH = BigInt(1288834974657);
export const postedAt = (id: string) => new Date(Number((BigInt(id) >> BigInt(22)) + X_EPOCH)).toISOString();

const typeLabel = (p: InspirationPost) => INSPIRATION_TYPES.find((t) => t.id === p.types[0])?.label ?? "";

// Newest first; a post with no title (its text could not be read) goes last.
export const INSPIRATION: InspirationCard[] = (data.posts as InspirationPost[])
  .map((p) => ({ ...p, title: smart(p.title), posted: postedAt(p.id), typeLabel: typeLabel(p) }))
  .sort((a, b) => (!a.title === !b.title ? b.posted.localeCompare(a.posted) : a.title ? -1 : 1));

export const titleOf = (p: Pick<InspirationPost, "title">) => p.title || "Post text not available";
export const refCommand = (p: Pick<InspirationPost, "url">) => `bin/vawe refs add ${p.url}`;
