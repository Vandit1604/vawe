// capture-component.mjs — lift a REAL UI component off a live site into a self-contained, animatable
// scene fragment. Loads the page in headless Chrome, finds the selector, inlines each node's COMPUTED
// styles (so it renders identically without the site's CSS), absolutizes images, and writes a JSON
// { html, w, h } the video engine can drop into a `component` scene and animate.
//
//   node scripts/capture-component.mjs <url> "<css-selector>" <brand> <label> [--viewport 1512x950] [--settle 500]
//   make capture URL=https://site.com SEL=".pricing-card" NAME=acme LABEL=pricing
//
// Output: engine/assets/brands/<brand>/components/<label>.json
// Note: ::before/::after pseudo-elements can't be inlined (a known limitation) — most cards are fine.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const [url, selector, brand, label] = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--viewport' && argv[i - 1] !== '--settle');
if (!url || !selector || !brand || !label) {
  console.error('usage: node scripts/capture-component.mjs <url> "<selector>" <brand> <label> [--viewport WxH] [--settle ms]');
  process.exit(1);
}
const [VW, VH] = flag('--viewport', '1512x950').split('x').map(Number);
const SETTLE = parseInt(flag('--settle', '0'), 10);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 240000 });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }); }
catch (e) { // slow page: retry on domcontentloaded rather than silently capturing a half-loaded DOM
  console.error(`  · networkidle timed out (${e.message}) — retrying with domcontentloaded`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
}
// settle: fonts loaded + target in view + its images decoded + two frames painted. Every wait is
// time-capped so a font/image that never resolves (a lazy <img> with no src fires neither onload nor
// onerror) can't hang the capture — it just proceeds after the cap.
await page.evaluate(async (selector) => {
  const cap = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
  await cap(document.fonts.ready, 4000);
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ block: 'center' });
    await cap(Promise.all([...el.querySelectorAll('img')].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))), 4000);
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, selector);
if (SETTLE) await new Promise((r) => setTimeout(r, SETTLE)); // escape hatch for JS-animated sections

const result = await page.evaluate((selector) => {
  const el = document.querySelector(selector);
  if (!el) return { error: 'selector not found' };
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
  // curated, visually-load-bearing properties — inlining ALL 300+ computed props bloats + fights itself
  const PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'box-sizing', 'width', 'height',
    'min-width', 'min-height', 'max-width', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top', 'border-right', 'border-bottom',
    'border-left', 'border-radius', 'background-color', 'background-image', 'background-size', 'background-position',
    'background-repeat', 'background-clip', 'box-shadow', 'color', 'font-family', 'font-size', 'font-weight',
    'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration', 'text-shadow',
    'white-space', 'opacity', 'transform', 'transform-origin', 'flex-grow', 'flex-shrink', 'flex-basis',
    'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap', 'grid-template-columns', 'grid-template-rows',
    'object-fit', 'overflow', 'list-style', 'vertical-align', 'fill', 'stroke', 'stroke-width', 'backdrop-filter', 'filter',
    'clip-path', 'mask', 'mask-image', 'aspect-ratio', 'mix-blend-mode', 'background-blend-mode', 'outline', 'column-gap', 'row-gap'];
  const DEFAULT = { 'z-index': 'auto', 'transform': 'none', 'background-image': 'none', 'box-shadow': 'none',
    'text-shadow': 'none', 'text-decoration': 'none solid rgb(0, 0, 0)', 'letter-spacing': 'normal', 'filter': 'none',
    'backdrop-filter': 'none', 'list-style': 'outside none none', 'opacity': '1' };
  // FLAT two-pass over a STATIC node list — no recursion over live children, no cloneNode + lockstep
  // copy (that machinery hangs on some sections). Read every node's computed style FIRST (before any
  // mutation, so inherited values stay intact), then apply inline directly on the live nodes and take
  // outerHTML. The page is discarded after, so mutating it is fine.
  const all = [el, ...el.querySelectorAll('*')].filter((n) => n.nodeType === 1);
  const styles = all.map((node) => {
    const cs = getComputedStyle(node); let s = '';
    for (const p of PROPS) { let v = cs.getPropertyValue(p); if (!v) continue;
      if (p.startsWith('margin') && v === '0px') continue; if (p.startsWith('padding') && v === '0px') continue;
      if (p.startsWith('border-') && (v.startsWith('0px') || v.endsWith('none rgb(0, 0, 0)'))) continue;
      if (DEFAULT[p] === v) continue;
      if (p === 'background-image' && v !== 'none') v = v.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url("${abs(u)}")`);
      s += `${p}:${v};`;
    }
    return s;
  });
  const fonts = [...new Set(all.map((n) => getComputedStyle(n).fontFamily.split(',')[0].replace(/['"]/g, '').trim()).filter(Boolean))];
  all.forEach((node, i) => {
    node.setAttribute('style', styles[i]);
    node.removeAttribute('class'); node.removeAttribute('id');
    // before stripping srcset, promote its LARGEST candidate into src (lazy loaders leave a placeholder)
    if (node.tagName === 'IMG' && node.getAttribute('srcset')) {
      const best = node.getAttribute('srcset').split(',').map((x) => { const [u, d] = x.trim().split(/\s+/); return { u, w: parseFloat(d) || 1 }; }).sort((a, b) => b.w - a.w)[0];
      if (best?.u) node.setAttribute('src', best.u);
    }
    for (const a of [...node.attributes]) if (/^on/i.test(a.name) || a.name === 'srcset' || a.name === 'loading') node.removeAttribute(a.name);
    if (node.tagName === 'IMG' && node.getAttribute('src')) node.setAttribute('src', abs(node.getAttribute('src')));
  });
  const r = el.getBoundingClientRect();
  return { html: el.outerHTML, w: Math.round(r.width), h: Math.round(r.height), fonts };
}, selector);

await browser.close();
if (!result || result.error) { console.error('✗ capture failed:', result?.error || 'no result'); process.exit(1); }

const dir = path.join(ROOT, 'engine/assets/brands', brand, 'components');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, label + '.json');
fs.writeFileSync(out, JSON.stringify({ url, selector, w: result.w, h: result.h, fonts: result.fonts, html: result.html }, null, 0) + '\n');
console.log(`✓ captured "${selector}" → ${path.relative(ROOT, out)}  (${result.w}×${result.h}, ${(result.html.length / 1024).toFixed(1)}kb)`);
// warn LOUDLY when a used font isn't installed — otherwise it silently substitutes at render time
try {
  const tokens = fs.readFileSync(path.join(ROOT, 'core/tokens.css'), 'utf8');
  const generic = /^(system-ui|sans-serif|serif|monospace|-apple-system|ui-sans-serif|ui-monospace|arial|helvetica)/i;
  for (const f of result.fonts || []) {
    if (!generic.test(f) && !tokens.includes(`'${f}'`) && !tokens.includes(`"${f}"`))
      console.warn(`  ⚠ font "${f}" is used by this component but has no @font-face in core/tokens.css — it will SUBSTITUTE at render. Run brandkit (downloads fonts) or add it manually.`);
  }
} catch {}
console.log(`  use in a demo scene: { "type": "component", "use": "${label}", "src": "/engine/assets/brands/${brand}/components/${label}.json" }`);
