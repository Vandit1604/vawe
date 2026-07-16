// design-sheet.mjs — the REVIEW step between capture and compose. Renders every captured element for a
// brand onto ONE page (on the theme background), each labelled with its name/size/fonts, so you vet the
// raw material — ghost bleed, substituted fonts, missing assets — and fix it BEFORE building a video.
//
//   node scripts/design-sheet.mjs <brand> [--theme name] [--serve]
//   make sheet NAME=linear            → /tmp/sheet.png  (one tall contact sheet)
//   make sheet NAME=linear SERVE=1    → live in your browser (real fonts/assets, scrollable)
//
// Reads every assets/brands/<brand>/components/*.json ({html,w,h,fonts}) — the captures.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const brand = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!brand) { console.error('usage: node scripts/design-sheet.mjs <brand> [--theme name] [--serve]'); process.exit(1); }
const themeName = flag('--theme', brand);
let bg = '#0a0a0c';
try { bg = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', themeName + '.json'), 'utf8')).palette.bg; } catch {}

const dir = path.join(ROOT, 'assets/brands', brand, 'components');
if (!fs.existsSync(dir)) { console.error(`✗ no components for "${brand}" — run: make capture …  (dir: ${path.relative(ROOT, dir)})`); process.exit(1); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
if (!files.length) { console.error(`✗ no captured components in ${path.relative(ROOT, dir)}`); process.exit(1); }

// which fonts a component needs that tokens.css can't provide (→ they substitute at render)
const tokens = (() => { try { return fs.readFileSync(path.join(ROOT, 'core/tokens.css'), 'utf8'); } catch { return ''; } })();
const generic = /^(system-ui|sans-serif|serif|monospace|-apple-system|ui-sans-serif|ui-monospace|arial|helvetica|inherit|initial)/i;
const missingFonts = (fonts) => (fonts || []).filter((f) => f && !generic.test(f) && !tokens.includes(`'${f}'`) && !tokens.includes(`"${f}"`));

const COLW = 1280; // each element rendered at this width
const cards = files.map((f) => {
  const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const name = f.replace(/\.json$/, '');
  const scale = COLW / Math.max(1, c.w);
  const miss = missingFonts(c.fonts);
  const warn = miss.length ? `<span style="color:#eb5757">⚠ substitutes: ${miss.join(', ')}</span>` : `<span style="color:#4cb782">fonts ok</span>`;
  return `<section style="margin:0 auto 56px;width:${COLW}px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-family:'Geist Mono',monospace;font-size:15px;color:#8a8f98;padding:0 4px 12px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:16px">
      <span style="color:#f7f8f8;font-size:17px">${name}</span><span>${c.w}×${c.h} · ${warn}</span></div>
    <div style="width:${COLW}px;height:${Math.round(c.h * scale)}px;overflow:hidden;border-radius:12px;outline:1px solid rgba(255,255,255,0.06)">
      <div style="width:${c.w}px;height:${c.h}px;transform:scale(${scale.toFixed(4)});transform-origin:top left">${c.html}</div>
    </div></section>`;
}).join('\n');

const sheetHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/core/tokens.css">
<style>*{box-sizing:border-box}html,body{margin:0;background:${bg};color:#f7f8f8;font-family:'Inter',system-ui,sans-serif}
.wrap{padding:56px 40px 80px}h1{font-size:26px;font-weight:540;margin:0 0 6px}.sub{color:#8a8f98;font-size:15px;margin:0 0 44px;font-family:'Geist Mono',monospace}</style></head>
<body><div class="wrap"><h1>${brand} · design sheet</h1><p class="sub">${files.length} captured elements · review + fix before building a video</p>
${cards}</div></body></html>`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__sheet') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(sheetHtml); }
  const p = path.join(ROOT, url.replace(/^\/+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/__sheet`;

if (argv.includes('--serve')) {
  console.log(`▶ ${brand} design sheet (${files.length} elements) live at  ${url}`);
  console.log('  open it, review each element, Ctrl-C to stop. fix a capture, re-run to refresh.');
  try { await import('node:child_process').then((cp) => cp.exec(`open "${url}"`)); } catch {}
} else {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
  const page = await browser.newPage();
  await page.setViewport({ width: COLW + 80, height: 1400, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  const out = '/tmp/sheet.png';
  await page.screenshot({ path: out, fullPage: true });
  await browser.close(); server.close();
  const miss = files.map((f) => { try { return missingFonts(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).fonts); } catch { return []; } }).flat();
  console.log(`✓ ${brand} design sheet · ${files.length} elements → ${out}`);
  if (miss.length) console.log(`  ⚠ substituted fonts: ${[...new Set(miss)].join(', ')} — add @font-face aliases in core/tokens.css`);
  console.log('  live/interactive version:  make sheet NAME=' + brand + ' SERVE=1');
}
