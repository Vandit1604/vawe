#!/usr/bin/env node
// Render vawe.dev's share cards from assets/brand-art/cards.js: one PNG per main page (site/public/og/<route>.png)
// and per blog post (site/public/og/blog/<slug>.png). --loops also renders each main page's share loop
// (site/public/og/<route>.mp4). The opengraph-image.tsx routes serve the PNGs; pageMetadata links the loops.
//   node scripts/site/og-cards.mjs [--loops]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PAGES, TOPICS } from '../../assets/brand-art/cards.js';
import { smart } from '../../site/lib/typo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(SITE, 'public/og');
const sharp = createRequire(path.join(SITE, 'package.json'))('sharp');

function vawe(args) {
  const r = spawnSync(path.join(ROOT, 'bin/vawe'), args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`bin/vawe ${args.join(' ')} failed:\n${r.stderr || r.stdout}`);
}

// The main routes: the pages in site-pages.json with their own opengraph-image.tsx. The home page keeps its own card.
function mainRoutes() {
  const { routes } = JSON.parse(fs.readFileSync(path.join(SITE, 'lib/site-pages.json'), 'utf8'));
  const main = routes.map((r) => r.path).filter((p) => p !== '/' && fs.existsSync(path.join(SITE, 'app', p, 'opengraph-image.tsx')));
  const missing = main.filter((p) => !PAGES[p]);
  if (missing.length) throw new Error(`no card in assets/brand-art/cards.js PAGES for ${missing.join(', ')}`);
  return main;
}

function unquote(raw) {
  const v = raw.trim(), q = v[0];
  if ((q === '"' || q === "'") && v.lastIndexOf(q) > 0) return v.slice(1, v.lastIndexOf(q)).replace(/\\"/g, '"');
  return v;
}

// Each post's slug, title, section label and topic, from its front matter and the section labels in site/lib/blog.ts.
function posts() {
  const labels = Object.fromEntries([...fs.readFileSync(path.join(SITE, 'lib/blog.ts'), 'utf8').matchAll(/\{ id: "([a-z-]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const dir = path.join(SITE, 'content/blog');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort().map((file) => {
    const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(dir, file), 'utf8'))[1];
    const data = Object.fromEntries(head.split(/\r?\n/).filter((l) => l.indexOf(':') > 0).map((l) => [l.slice(0, l.indexOf(':')).trim(), unquote(l.slice(l.indexOf(':') + 1))]));
    if (!TOPICS[data.topic]) throw new Error(`content/blog/${file}: topic must be one of ${Object.keys(TOPICS).join(', ')}, got "${data.topic}"`);
    if (!labels[data.section]) throw new Error(`content/blog/${file}: no label for section "${data.section}" in site/lib/blog.ts`);
    return { slug: file.replace(/\.md$/, ''), title: smart(data.title), section: labels[data.section], topic: data.topic };
  });
}

// A palette PNG measured about 60% smaller than the screenshot, with no pixel off by more than 7 of 255.
async function card(params, out, tmp) {
  const raw = path.join(tmp, 'card.png');
  vawe(['still', 'assets/brand-art/card.html', '--at', '0', '--aspect', '1200:630', '--size', '1200x630', ...params.flatMap((p) => ['--param', p]), '--out', raw]);
  await sharp(raw).png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 }).toFile(out);
  return fs.statSync(out).size;
}

// dev writes a key-frame sheet beside its output, so the loop renders in tmp and only the mp4 moves to the site.
function loop(route, out, tmp) {
  const raw = path.join(tmp, 'loop.mp4');
  vawe(['dev', 'assets/brand-art/loop.html', '--aspect', '1200:630', '--silent', '--fast', '--no-judge', '--small', '--param', `route=${route}`, '--out', raw]);
  fs.copyFileSync(raw, out);
  return fs.statSync(out).size;
}

function clearStale(dir, ext, keep) {
  for (const f of fs.readdirSync(dir)) if (f.endsWith(ext) && !keep.has(f)) fs.rmSync(path.join(dir, f));
}

const mb = (bytes) => `${(bytes / 1e6).toFixed(2)} MB`;

async function main(argv) {
  const routes = mainRoutes(), list = posts();
  fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-cards-'));
  try {
    let cards = 0;
    for (const route of routes) {
      cards += await card([`route=${route}`], path.join(OUT, `${route.slice(1)}.png`), tmp);
      console.log(`✓ og${route}.png`);
    }
    for (const p of list) {
      cards += await card([`post=${p.slug}`, `title=${p.title}`, `section=${p.section}`, `topic=${p.topic}`], path.join(OUT, 'blog', `${p.slug}.png`), tmp);
      console.log(`✓ og/blog/${p.slug}.png`);
    }
    clearStale(OUT, '.png', new Set(routes.map((r) => `${r.slice(1)}.png`)));
    clearStale(path.join(OUT, 'blog'), '.png', new Set(list.map((p) => `${p.slug}.png`)));
    console.log(`cards: ${routes.length + list.length} PNGs, ${mb(cards)}`);
    if (!argv.includes('--loops')) return;
    const looped = routes.filter((r) => PAGES[r].loop);
    let loops = 0;
    for (const route of looped) {
      const size = loop(route, path.join(OUT, `${route.slice(1)}.mp4`), tmp);
      loops += size;
      console.log(`✓ og${route}.mp4 (${mb(size)})`);
    }
    clearStale(OUT, '.mp4', new Set(looped.map((r) => `${r.slice(1)}.mp4`)));
    console.log(`loops: ${looped.length} mp4s, ${mb(loops)}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main(process.argv.slice(2)).catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
