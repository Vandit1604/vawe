// scripts/site/site-pages.mjs: the list of URLs vawe.dev serves, written where the site can read it.
//
// WHY THIS FILE EXISTS RATHER THAN THE SITEMAP READING THE SOURCES DIRECTLY. The sitemap needs the
// docs URLs: 17 MDX pages in docs-site/, proxied at /docs, and without them the entire documentation
// is undiscoverable. But docs-site is a SECOND Next app, and the Dockerfile copies it AFTER the site
// has already been built (`COPY site/ ./` then `npx next build`, and only then `COPY docs-site/ ./`).
// So a sitemap that reads docs-site/content at build time works locally and dies in the image, which
// is the failure class this repo keeps logging: a path that resolves on one machine and 404s on the
// deploy. Generating the list here, committing it, and letting quality/gates/generated-check.mjs run
// this generator and ask git what moved is the same shape every other derived list in this repo uses.
//
// The effects and blocks lists are NOT duplicated here. site/lib/effects.json and site/lib/blocks.json
// are already generated, already committed, already imported by the pages' own generateStaticParams,
// and the sitemap reads those same two files. One owner per fact: this file owns only what the site
// cannot otherwise see, which is the docs app and the hand-written routes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = path.join(ROOT, 'docs-site/content/docs');
const OUT = path.join(ROOT, 'site/lib/site-pages.json');

// The hand-written routes under site/app, with the priority and change cadence each one honestly has.
// `/playground/[name]` is deliberately absent: that route has no generateStaticParams because the
// generator list lives in the ENGINE and is loaded at runtime (see the page's own header comment), so
// there is no build-time list to enumerate and inventing one would fork the registry.
// `/deck` is a rewrite to a static deck.html, a pitch deck, not a page search should rank.
const ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/showcase', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/arsenal', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/arsenal/type', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/playground', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/editor', priority: 0.7, changeFrequency: 'monthly' },
  // The three intent pages the "actually work on SEO correctly" pass is allowed to add: real
  // demand, no page on vawe.dev before this, each answering a question the repo backs with running
  // code. See each page's own header comment for the search evidence.
  { path: '/determinism', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/json-to-video', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/ai-agents', priority: 0.7, changeFrequency: 'monthly' },
  // Two comparison/decision pages added after researching what actually ranks for "Remotion
  // alternative" and "JSON to video API" (2026-09-19). changeFrequency is monthly, not weekly:
  // both cite dated, external facts (a competitor's license, a competitor's pricing page) that
  // need a human re-check, not an automated one, when they go stale.
  { path: '/remotion-alternatives', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/when-determinism-matters', priority: 0.7, changeFrequency: 'monthly' },
  // Two use-case pages: a job in a searcher's own words, proven with a real rendered film and
  // cited against the doctrine that actually built it. Only two, not the five-to-six the engine's
  // own route table names, because only the launch-video route has real film artefacts behind it
  // (see each page's own header comment and the task report for what was deliberately not built).
  { path: '/launch-video', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/product-tour-video', priority: 0.7, changeFrequency: 'monthly' },
];

// fumadocs routes content/docs/<slug>.mdx at /docs/<slug>, and index.mdx at /docs itself.
function docsPages() {
  if (!fs.existsSync(DOCS)) {
    console.error(`✗ site-pages: ${path.relative(ROOT, DOCS)} does not exist, so the docs URLs cannot be listed.`);
    console.error('  The sitemap would then silently omit every documentation page. Refusing to write a half list.');
    process.exit(1);
  }
  return fs.readdirSync(DOCS)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
    .sort()
    .map((slug) => ({ path: slug === 'index' ? '/docs' : `/docs/${slug}`, priority: 0.8, changeFrequency: 'monthly' }));
}

const docs = docsPages();
const out = { routes: ROUTES, docs, counts: { routes: ROUTES.length, docs: docs.length } };
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`  site pages · ${ROUTES.length} route(s) + ${docs.length} docs page(s) → ${path.relative(ROOT, OUT)}`);
