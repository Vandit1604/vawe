// capture-component.mjs — lift a REAL UI component off a live site into a self-contained, animatable
// scene fragment. Loads the page in headless Chrome, finds the selector, inlines each node's COMPUTED
// styles (so it renders identically without the site's CSS), absolutizes images, and writes a JSON
// { html, w, h } the video engine can drop into a `component` scene and animate.
//
//   node scripts/capture-component.mjs <url> "<css-selector>" <brand> <label>
//   make capture URL=https://site.com SEL=".pricing-card" NAME=acme LABEL=pricing
//
// Output: engine/assets/brands/<brand>/components/<label>.json
// Note: ::before/::after pseudo-elements can't be inlined (a known limitation) — most cards are fine.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [url, selector, brand, label] = process.argv.slice(2);
if (!url || !selector || !brand || !label) {
  console.error('usage: node scripts/capture-component.mjs <url> "<selector>" <brand> <label>');
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1512, height: 950, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 800)); // let fonts/animations settle

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
    'object-fit', 'overflow', 'list-style', 'vertical-align', 'fill', 'stroke', 'stroke-width', 'backdrop-filter', 'filter'];
  const DEFAULT = { 'z-index': 'auto', 'transform': 'none', 'background-image': 'none', 'box-shadow': 'none',
    'text-shadow': 'none', 'text-decoration': 'none solid rgb(0, 0, 0)', 'letter-spacing': 'normal', 'filter': 'none',
    'backdrop-filter': 'none', 'list-style': 'outside none none', 'opacity': '1' };
  // pass 1: read computed (from the live cascade) and write inline onto each node
  function inline(node) {
    if (node.nodeType !== 1) return;
    const cs = getComputedStyle(node);
    let s = '';
    for (const p of PROPS) { let v = cs.getPropertyValue(p); if (!v) continue;
      if (p.startsWith('margin') && v === '0px') continue; if (p.startsWith('padding') && v === '0px') continue;
      if (p.startsWith('border-') && (v.startsWith('0px') || v.endsWith('none rgb(0, 0, 0)'))) continue;
      if (DEFAULT[p] === v) continue;
      if (p === 'background-image' && v !== 'none') v = v.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url("${abs(u)}")`);
      s += `${p}:${v};`;
    }
    node.__inline = s;
    for (const c of node.children) inline(c);
  }
  inline(el);
  // pass 2: apply inline, strip classes/ids/handlers, absolutize images
  function apply(node) {
    if (node.nodeType !== 1) return;
    node.setAttribute('style', node.__inline || '');
    node.removeAttribute('class'); node.removeAttribute('id');
    for (const a of [...node.attributes]) if (/^on/i.test(a.name) || a.name === 'srcset' || a.name === 'loading') node.removeAttribute(a.name);
    if (node.tagName === 'IMG' && node.getAttribute('src')) node.setAttribute('src', abs(node.getAttribute('src')));
    for (const c of node.children) apply(c);
  }
  const clone = el.cloneNode(true);
  // walk clone + live in lockstep to copy the __inline we computed on the live tree
  (function copy(live, cl) { cl.__inline = live.__inline; for (let i = 0; i < live.children.length; i++) copy(live.children[i], cl.children[i]); })(el, clone);
  apply(clone);
  const r = el.getBoundingClientRect();
  return { html: clone.outerHTML, w: Math.round(r.width), h: Math.round(r.height) };
}, selector);

await browser.close();
if (!result || result.error) { console.error('✗ capture failed:', result?.error || 'no result'); process.exit(1); }

const dir = path.join(ROOT, 'engine/assets/brands', brand, 'components');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, label + '.json');
fs.writeFileSync(out, JSON.stringify({ url, selector, w: result.w, h: result.h, html: result.html }, null, 0) + '\n');
console.log(`✓ captured "${selector}" → ${path.relative(ROOT, out)}  (${result.w}×${result.h}, ${(result.html.length / 1024).toFixed(1)}kb)`);
console.log(`  use in a demo scene: { "type": "component", "use": "${label}", "src": "/engine/assets/brands/${brand}/components/${label}.json" }`);
