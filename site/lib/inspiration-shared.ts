// The part of lib/inspiration.ts a client component may import: no data, so the bundle stays small.
export type InspirationType = { id: string; chip: string; label: string };
export type InspirationPrompt = { text: string; source: string };
export const MAKERS = ["Claude", "OpenAI", "Google", "Other", "Unknown"] as const;
export type Maker = (typeof MAKERS)[number];
export type InspirationPost = {
  id: string;
  title: string;
  creator: { name: string; handle: string };
  url: string;
  types: string[];
  tags: string[];
  maker: Maker;
  model: string[];
  prompt?: InspirationPrompt;
  poster: string;
  playback: string;
  duration: number;
  saves?: number;
  likes?: number;
  avatar?: string;
};
// What the wall needs per post. The prompt text stays out of the page and loads on demand (PROMPTS_PATH).
export type InspirationCard = Omit<InspirationPost, "prompt"> & { posted: string; typeLabel: string; madeWith: string; promptSource?: string };

export const INSPIRATION_PATH = "/inspiration";
export const PROMPTS_PATH = "/inspiration/prompts.json";

export const titleOf = (p: Pick<InspirationPost, "title">) => p.title || "Post text not available";
export const refCommand = (p: Pick<InspirationPost, "url">) => `bin/vawe refs add ${p.url}`;
