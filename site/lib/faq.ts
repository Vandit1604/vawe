// The home FAQ. The page renders these items and lib/schema-content.ts builds the FAQPage from them, so the
// visible answers and the structured data cannot differ.
import { REPO_URL } from "./schema";

export type Segment = string | { text: string; href: string };
export type FaqItem = { q: string; a: Segment[] };

export const FAQ: FaqItem[] = [
  { q: "What is vawe?", a: ["vawe is an open source framework that turns one HTML page into a video file. You, or a coding agent, write the film in HTML, CSS, Web Animations, SVG, canvas or three.js; the renderer seeks the page frame by frame in headless Chrome and encodes it with ffmpeg. The ", { text: "blog", href: "/blog" }, " covers how it is built and measured."] },
  { q: "Is it open source?", a: ["Yes, under Apache 2.0. The engine, the studio and this site are ", { text: "on GitHub", href: REPO_URL }, "."] },
  { q: "Where does it run?", a: ["On your machine. The renderer drives Chrome and encodes with ffmpeg, and the studio previews a page live."] },
  { q: "Does it work with my agent?", a: ["Yes. A film is plain HTML, so any coding agent can write one, and vawe ships skills that teach it the loop: write, draft, critique, ship. See ", { text: "vawe for AI agents", href: "/ai-agents" }, "."] },
  { q: "Can it match my brand?", a: ["Yes. A page uses your fonts and colours as CSS, the same way your site does."] },
  { q: "How is it different from Remotion?", a: ["Remotion builds video from React components under a source-available licence. vawe renders one HTML page under Apache 2.0, with no React and no build step. Both render in headless Chrome. Read ", { text: "vawe vs Remotion", href: "/vs/remotion" }, " or the wider list of ", { text: "Remotion alternatives", href: "/remotion-alternatives" }, "."] },
  { q: "Is vawe free?", a: ["Yes. vawe is free and open source under Apache 2.0, for any purpose including commercial use. There is no paid tier."] },
  { q: "How do I install vawe?", a: ["From source: git clone https://github.com/Vandit1604/vawe.git && cd vawe && npm install && bin/vawe doctor. There is no npm package. The doctor command checks each tool and prints the install line for any that is missing. See ", { text: "the quickstart", href: "/docs/quickstart" }, "."] },
  { q: "Does vawe need an account or a hosted API?", a: ["No. There is no account, no hosted API and no per-render fee. vawe runs on your machine."] },
  { q: "What does vawe need on my machine?", a: ["Node 22 or newer, git, and ffmpeg with libx264 and drawtext. The renderer drives Chrome, and a command that needs it prints the install line if Chrome is missing. tesseract is optional, for OCR."] },
  { q: "What does vawe output?", a: ["An H.264 mp4, in 16:9, 9:16, 1:1, 4:5 and 4:3 from the same page, with audio mixed offline. A final render is 60 fps. A draft is half size at 30 fps and silent."] },
  { q: "What are the limits of vawe?", a: ["vawe renders on one machine, with no distributed rendering. Output can differ between hosts that rasterise on a different GPU or Chrome version. The project is under active development, and the open problems are listed on the ", { text: "problems page", href: "/problems" }, "."] },
];

export const faqText = (item: FaqItem) => item.a.map((s) => (typeof s === "string" ? s : s.text)).join("");
