// A blog post's front matter: the parser, the sections and the share-card topics. lib/blog.ts reads posts through it;
// scripts/site/og-cards.mjs reads it to render each post's card, so both see one front matter.

export const SECTIONS = /** @type {const} */ ([
  { id: "how-to", label: "How-to", intro: "Step-by-step guides that end with a file you can run: render HTML to a video, export an animation, drive vawe from an agent." },
  { id: "rendering", label: "Rendering", intro: "Headless Chrome, Puppeteer, speed and repeatable frames: what broke when we rendered a page to video, and what fixed it." },
  { id: "agents", label: "Agents", intro: "What an AI agent gets wrong on its own, and the commands, defaults, checks and judges that make it succeed." },
  { id: "motion-sound", label: "Motion and sound", intro: "Easing, transitions, blur, depth and audio: how we turned a good film into measured rules." },
]);

// The `topic` a post names picks its share card's scene; each one is a key of TOPICS in assets/brand-art/cards.js.
export const TOPICS = /** @type {const} */ (["agents", "determinism", "rendering", "audio", "motion", "watching", "how-to", "site"]);

/** @param {string} raw */
function unquote(raw) {
  const v = raw.trim();
  const q = v[0];
  if (q === '"' || q === "'") {
    const end = v.lastIndexOf(q);
    if (end > 0) return v.slice(1, end).replace(/\\"/g, '"');
  }
  return v.replace(/\s+#.*$/, "").trim();
}

/**
 * The key: value lines between the --- fences, and the Markdown after them. Throws, naming the file, on a malformed head.
 * @param {string} file
 * @param {string} src
 * @returns {{ data: Record<string, string>, body: string }}
 */
export function parseFrontMatter(file, src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) throw new Error(`content/blog/${file}: no front matter between --- fences`);
  /** @type {Record<string, string>} */
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i < 1) throw new Error(`content/blog/${file}: front matter line is not "key: value": ${line}`);
    data[line.slice(0, i).trim()] = unquote(line.slice(i + 1));
  }
  return { data, body: m[2] };
}
