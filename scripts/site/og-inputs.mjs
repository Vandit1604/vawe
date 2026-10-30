// What each share card and loop in site/public/og/ is rendered from, with a hash of those inputs. og-cards.mjs renders
// from this list and writes the hashes to the stamp; quality/gates/seo-surface.mjs checks each file is there and current.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PAGES, TOPICS } from '../../assets/brand-art/cards.js';
import { SECTIONS, TOPICS as POST_TOPICS, parseFrontMatter } from '../../site/lib/blog-front-matter.mjs';
import { smart } from '../../site/lib/typo.mjs';

export const STAMP = 'site/public/og/stamp.json';

const hash = (v) => crypto.createHash('sha256').update(JSON.stringify(v, (_, x) => (typeof x === 'function' ? String(x) : x))).digest('hex').slice(0, 16);

// The main routes: the pages in site-pages.json with their own opengraph-image.tsx. The home page keeps its own card.
function mainRoutes(root) {
  const { routes } = JSON.parse(fs.readFileSync(path.join(root, 'site/lib/site-pages.json'), 'utf8'));
  return routes.map((r) => r.path).filter((p) => p !== '/' && fs.existsSync(path.join(root, 'site/app', p, 'opengraph-image.tsx')));
}

/**
 * cards: { file, params, hash } per main route and post; loops: { file, route, hash } per main route with a loop;
 * unused: PAGES entries no route serves; problems: inputs that cannot render.
 */
export function ogInputs(root) {
  const problems = [];
  const topicKeys = Object.keys(TOPICS);
  if (topicKeys.join() !== POST_TOPICS.join()) problems.push(`the post topics in site/lib/blog-front-matter.mjs (${POST_TOPICS.join(', ')}) differ from TOPICS in assets/brand-art/cards.js (${topicKeys.join(', ')})`);
  const routes = mainRoutes(root);
  const cards = [], loops = [];
  for (const route of routes) {
    const P = PAGES[route];
    if (!P) { problems.push(`${route} has an opengraph-image.tsx but no card in assets/brand-art/cards.js PAGES`); continue; }
    const { loop, ...still } = P;
    cards.push({ file: `site/public/og${route}.png`, params: [`route=${route}`], hash: hash({ route, ...still }) });
    if (loop) loops.push({ file: `site/public/og${route}.mp4`, route, hash: hash({ route, ...P }) });
  }
  const dir = path.join(root, 'site/content/blog');
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.md') && n !== 'README.md').sort()) {
    const slug = name.replace(/\.md$/, '');
    const { data } = parseFrontMatter(name, fs.readFileSync(path.join(dir, name), 'utf8'));
    const section = SECTIONS.find((s) => s.id === data.section)?.label, T = TOPICS[data.topic];
    if (!section || !T) { problems.push(`content/blog/${name}: section "${data.section}" or topic "${data.topic}" has no card`); continue; }
    const title = smart(data.title);
    cards.push({ file: `site/public/og/blog/${slug}.png`, params: [`post=${slug}`, `title=${title}`, `section=${section}`, `topic=${data.topic}`], hash: hash({ slug, title, section, topic: data.topic, ...T }) });
  }
  const unused = Object.keys(PAGES).filter((r) => !routes.includes(r));
  return { cards, loops, unused, problems };
}

export function readStamp(root) {
  const file = path.join(root, STAMP);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}
