// kit.mjs: one command that runs the existing capture/sections/palette steps and writes a single
// manifest, assets/brands/<name>/kit.json, instead of an agent chaining three commands by hand and
// copying numbers out of console output. It orchestrates; it does not re-implement any of the three:
// sections.mjs still crawls and screenshots, palette.mjs's eyedrop() still does the pixel histogram,
// localize-assets.mjs's download() still does the one verified fetch.
//
//   node scripts/brand/kit.mjs <url> <name>            ·  make kit URL=https://linear.app NAME=linear
//   node scripts/brand/kit.mjs <url> <name> --init      ·  make kit URL=... NAME=... INIT=1
//     --init also runs `make doctor` and writes the stage-1 brief skeleton (films/scene/<name>.brief.md),
//     so one command takes a fresh film from nothing to "answer the quiz next" (AGENTS.md stage 1).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { eyedrop, writeSwatch } from './palette.mjs';
import { download } from './localize-assets.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const init = args.includes('--init');
const [url, name] = args.filter((a) => !a.startsWith('--'));
if (!url || !name) { console.error('usage: node scripts/brand/kit.mjs <url> <name> [--init]'); process.exit(1); }

const dir = path.join(ROOT, 'assets/brands', name);
fs.mkdirSync(dir, { recursive: true });

// ---- init: is the checkout ready to render, before spending a capture on it? (scripts/vendor-gsap.mjs) ----
if (init) {
  console.log('→ doctor: is the checkout ready to render');
  try {
    console.log(`  ${execFileSync(process.execPath, [path.join(ROOT, 'scripts/vendor-gsap.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' }).trim()}`);
  } catch (e) {
    console.warn(`  ⚠ ${(e.stderr || e.stdout || e.message).trim()}`);
  }
}

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

if (init) {
  // Stage 1 brief skeleton (AGENTS.md "brief"): the five lines a person still owes, not the storyboard
  // itself (`make quiz`/`make quiz-apply` write that, from real answers, not a guess).
  const briefPath = path.join(ROOT, 'films/scene', `${name}.brief.md`);
  fs.mkdirSync(path.dirname(briefPath), { recursive: true });
  const brief = [
    `# Brief: ${name}`,
    '',
    `Captured from ${url} (assets/brands/${name}/kit.json). The five lines below are what \`make quiz\``,
    'still needs answered; nothing here is invented.',
    '',
    '```',
    'SUBJECT   <fill: the product or moment this film is about>',
    'DATA      <fill: any real number/claim this film can back, or "none needed">',
    'PAYOFF    <fill: the one thing the viewer takes away>',
    'AUDIENCE  <fill: who this is for, role and context>',
    'FEELING   <fill: three words for the register>',
    '```',
    '',
    `next: make quiz NAME=${name} URL=${url}`,
    '',
  ].join('\n');
  fs.writeFileSync(briefPath, brief);
  console.log(`\n✓ brief skeleton → ${path.relative(ROOT, briefPath)}`);
  console.log(`\nnext: make quiz NAME=${name} URL=${url}`);
} else {
  console.log('  → author themes/<name>.json from these, then CONFIRM with make beats VS=<name>.');
}
