// The home FAQ. The page renders these items and lib/schema-content.ts builds the FAQPage from them, so the
// visible answers and the structured data cannot differ.
import { REPO_URL } from "./schema";

export type Segment = string | { text: string; href: string };
export type FaqItem = { q: string; a: Segment[] };

export const FAQ: FaqItem[] = [
  { q: "Is it open source?", a: ["Yes, under Apache 2.0. The engine, the studio and this site are ", { text: "on GitHub", href: REPO_URL }, "."] },
  { q: "Where does it run?", a: ["On your machine. The renderer drives Chrome and encodes with ffmpeg, and the studio previews a page live."] },
  { q: "Does it work with my agent?", a: ["Yes. A film is plain HTML, so any coding agent can write one, and vawe ships skills that teach it the loop: write, draft, critique, ship."] },
  { q: "Can it match my brand?", a: ["Yes. A page uses your fonts and colours as CSS, the same way your site does."] },
];

export const faqText = (item: FaqItem) => item.a.map((s) => (typeof s === "string" ? s : s.text)).join("");
