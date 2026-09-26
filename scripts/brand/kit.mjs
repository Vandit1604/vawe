// kit.mjs: one command that runs the existing capture/sections/palette steps and writes a single
// manifest, assets/brands/<name>/kit.json, instead of an agent chaining three commands by hand and
// copying numbers out of console output. It orchestrates; it does not re-implement any of the three:
// sections.mjs still crawls and screenshots, palette.mjs's eyedrop() still does the pixel histogram,
// localize-assets.mjs's download() still does the one verified fetch.
//
//   node scripts/brand/kit.mjs <url> <name>     ·     make kit URL=https://linear.app NAME=linear
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { eyedrop, writeSwatch } from './palette.mjs';
import { download } from './localize-assets.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [url, name] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!url || !name) { console.error('usage: node scripts/brand/kit.mjs <url> <name>'); process.exit(1); }

const dir = path.join(ROOT, 'assets/brands', name);
fs.mkdirSync(dir, { recursive: true });

// ---- sections: reuse sections.mjs as-is (it clears/writes assets/brands/<name>/sections itself) ----
console.log(`→ sections: crawling ${url}`);
execFileSync(process.execPath, [path.join(ROOT, 'scripts/brand/sections.mjs'), url, name], { stdio: 'inherit', cwd: ROOT });
const sectionsDir = path.join(dir, 'sections');
const sections = JSON.parse(fs.readFileSync(path.join(sectionsDir, 'sections.json'), 'utf8'));

// ---- palette: the same eyedrop() the CLI uses, over every captured section ----
console.log('→ palette: eyedropping the captured sections');
const files = fs.readdirSync(sectionsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).map((f) => path.join(sectionsDir, f));
const p = await eyedrop(files);
await writeSwatch(path.join(dir, 'palette.png'), p);

// ---- favicon: the one declared icon link (biggest, then the first), else /favicon.ico ----
console.log('→ favicon: reading the page for a declared icon');
let favicon = null;
try {
  const html = await (await fetch(url)).text();
  const links = [...html.matchAll(/<link\b[^>]*rel=["']?[^"'>]*icon[^"'>]*["']?[^>]*>/gi)].map((m) => m[0]);
  const hrefOf = (tag) => tag.match(/href=["']([^"']+)["']/i)?.[1];
  const sizeOf = (tag) => Number(tag.match(/sizes=["'](\d+)x\d+["']/i)?.[1] || 0);
  const candidates = links.map((tag) => ({ href: hrefOf(tag), size: sizeOf(tag) })).filter((c) => c.href).sort((a, b) => b.size - a.size);
  const rel = candidates[0]?.href;
  const iconUrl = rel ? new URL(rel, url).href : new URL('/favicon.ico', url).href;
  const { buf, ext } = await download(iconUrl, url);
  const file = `favicon${ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  favicon = file;
} catch (e) { console.warn(`  ⚠ favicon not fetched: ${e.message}`); }

// ---- the manifest ----
const kit = {
  url, name, capturedAt: new Date().toISOString(),
  sections: { count: sections.sections.length, dir: path.relative(ROOT, sectionsDir), manifest: path.relative(ROOT, path.join(sectionsDir, 'sections.json')) },
  palette: { light: p.light, avgLum: p.avgLum, bg: p.bg, text: p.text, accents: p.accents, swatch: path.relative(ROOT, path.join(dir, 'palette.png')) },
  favicon: favicon ? path.relative(ROOT, path.join(dir, favicon)) : null,
};
fs.writeFileSync(path.join(dir, 'kit.json'), JSON.stringify(kit, null, 2) + '\n');
console.log(`\n✓ kit → ${path.relative(ROOT, dir)}/kit.json`);
console.log(`  ${kit.sections.count} sections · ${p.light ? 'LIGHT' : 'DARK'}-first · bg ${p.bg} · text ${p.text} · accents ${p.accents.join(' ')}${favicon ? ` · favicon ${favicon}` : ''}`);
console.log('  → author themes/<name>.json from these, then CONFIRM with make beats VS=<name>.');
