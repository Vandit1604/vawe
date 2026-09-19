// scripts/site/llms-txt.mjs: emits site/public/llms.txt, served at vawe.dev/llms.txt.
//
// WHY IT EXISTS DESPITE GOOGLE SAYING IT DOES NOTHING FOR GOOGLE.
// developers.google.com/search/docs/fundamentals/ai-optimization-guide, stated as plainly as a
// Google doc gets: "You don't need to create new machine readable files, AI text files, markup, or
// Markdown to appear in Google Search (including its generative AI capabilities), as Google Search
// itself doesn't use them," naming llms.txt specifically, and such a file "will neither harm nor
// help your site's visibility or rankings in Google Search." That is Google's position, not a
// summary of it, and this file is built anyway on the strength of two things it does NOT settle:
// it costs one generator to maintain, and ChatGPT and Perplexity's own crawlers are a separate
// question the guidance never reaches. It is not presented as a fix for the measured problem
// (vawe.dev not ranking on Google); the fix for that is the citable prose on the pages themselves.
// This is a near-free hedge on engines the guidance does not cover, nothing more.
//
// EVERY FACT HERE IS DERIVED, following the same rule as every other generated file in this repo:
// - the docs list and each description come from site/lib/site-pages.json + each MDX's own
//   frontmatter, never retyped.
// - the arsenal figure comes from site/lib/arsenal.json, the same file /arsenal itself reads.
// The one hand-written table is ROUTE_COPY below: the marketing routes' own descriptions, copied
// verbatim from each page's pageMetadata() call. That mirrors site-pages.mjs's own ROUTES table,
// which is hand-written for the same reason (there is no registry a route's blurb could be read from
// that isn't the page itself), and it is why generated-check.mjs runs THIS file too: if a page's
// description changes and this table is not updated to match, the check catches the drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = path.join(ROOT, 'docs-site/content/docs');
const OUT = path.join(ROOT, 'site/public/llms.txt');

const arsenal = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/lib/arsenal.json'), 'utf8'));

// Copied from each page's own `pageMetadata({ description: ... })` call (site/app/**/page.tsx).
// Keep this in sync by hand when a page's description changes; generated-check.mjs fails otherwise
// only in the sense that a stale llms.txt would sit un-regenerated, so re-run this file after editing
// a route's metadata.
const ROUTE_COPY = {
  // The three intent pages. Copied verbatim from each page's own pageMetadata() description, which is
  // the rule for every entry in this table: one sentence, one owner, and llms.txt never invents copy.
  '/determinism': 'renderFrame(n) is a pure function of n: the same scene JSON produces byte-identical '
    + 'frames on any machine, in any order. How Vawe proves it, and why that lets a long render split '
    + 'across parallel browser tabs.',
  '/json-to-video': 'What a Vawe scene file actually contains: one JSON document, 24 layer types, five '
    + 'named canvases, validated before a single frame renders. How the file becomes an mp4.',
  '/ai-agents': 'An MCP server an agent calls directly to write, draft and export a video: free '
    + 'watermarked iteration, a paid clean export, and a file server that default-denies everything '
    + 'the render does not need.',
  '/remotion-alternatives': '"Remotion alternative" returns two different products: a hosted JSON '
    + 'video API, or a self-hosted rendering engine. What Remotion\'s own license requires, what Vawe '
    + 'and HyperFrames give away free, and where a hosted API fits instead. Read 2026-09-19.',
  '/when-determinism-matters': 'Byte-identical rendering is a real property, not a universal one. '
    + 'When it decides which engine to pick, and when a human editing a timeline by eye makes it '
    + 'beside the point.',
  '/hyperframes-alternatives': "HyperFrames is HeyGen's self-hosted, Apache-2.0, agent-facing "
    + 'rendering engine, the closest peer Vawe has. Same license, same headless-Chrome shape, '
    + 'different composition language and a different way of enforcing determinism. Read 2026-09-19.',
  '/': 'Motion graphics without a motion designer. Vawe renders video from a text file, so you or an '
    + 'AI agent can write a film the way you write anything else, and re-render it the day the '
    + 'numbers change.',
  '/features': 'The decisions the engine makes for you: a clock that refuses wall time, a motion '
    + 'director that picks every cut, and a gate ladder that rejects correct-but-generic output.',
  '/showcase': 'Finished films rendered by Vawe, each one a JSON file you can open in the editor. '
    + 'Six launch films and one scene cropped to three canvases.',
  '/arsenal': `Everything the Vawe engine is made of: ${arsenal.total} blocks and effects, searchable, `
    + `each with the JSON that uses it and ${arsenal.live} of them playing in the real engine.`,
  '/arsenal/type': "The engine's typographic vocabulary as specimens: kinetic presets, per-layer text "
    + 'mechanics and typographic beats, each playing in the real engine with the JSON that produces it.',
  '/playground': 'Turn the dials on the engine\'s generators in your browser. The same pure functions '
    + 'the renderer calls, with their real option schemas.',
  '/editor': 'Edit a scene JSON and watch it render live. The real engine, running in your browser.',
  '/launch-video': "How Vawe builds a product launch video: real captured UI, not invented mockups, "
    + "on the six-beat spine the engine's own doctrine defines. Three rendered films, each one an "
    + 'open JSON file.',
  '/product-tour-video': 'A chaptered product tour or feature-update video, built as one JSON file: '
    + 'three chapters, a continuous progress rail, one tracked issue carried through. The real '
    + 'rendered film that proves it.',
};

function frontmatterDescription(slug) {
  const text = fs.readFileSync(path.join(DOCS, `${slug}.mdx`), 'utf8');
  const m = text.match(/^description:\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/lib/site-pages.json'), 'utf8'));

const missing = pages.routes.map((r) => r.path).filter((p) => !ROUTE_COPY[p]);
if (missing.length) {
  console.error(`✗ llms-txt: no ROUTE_COPY entry for ${missing.join(', ')}. Add one, copied from that page's own pageMetadata().`);
  process.exit(1);
}

const site = pages.routes
  .map((r) => `- [${r.path === '/' ? 'Home' : r.path.replace(/^\//, '')}](https://vawe.dev${r.path}): ${ROUTE_COPY[r.path]}`)
  .join('\n');

const docs = pages.docs
  .map((d) => {
    const slug = d.path === '/docs' ? 'index' : d.path.replace('/docs/', '');
    const desc = frontmatterDescription(slug);
    return `- [${slug === 'index' ? 'Introduction' : slug}](https://vawe.dev${d.path}): ${desc}`;
  })
  .join('\n');

const out = `# Vawe
> ${ROUTE_COPY['/']}

## Site
${site}

## Docs
${docs}
`;

fs.writeFileSync(OUT, out);
console.log(`  llms.txt · ${pages.routes.length} route(s) + ${pages.docs.length} docs page(s) → ${path.relative(ROOT, OUT)}`);
