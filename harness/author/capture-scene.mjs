import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { localizeCapture, mediaTargetFor } from '../../scripts/brand/localize-assets.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const [url, sectionSel, brand, label] = pos;
const partSels = (flag('--parts', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!url || !sectionSel || !brand || !label || !partSels.length) {
  console.error('usage: node harness/author/capture-scene.mjs <url> "<sectionSel>" <brand> <label> --parts "sel1,sel2,…" [--viewport WxH]');
  process.exit(1);
}
const [VW, VH] = (flag('--viewport', '1512x950')).split('x').map(Number);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }); }
catch (e) { console.error(`  · networkidle timed out (${e.message}), retrying with domcontentloaded`); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
await page.evaluate(async (sel) => {
  await document.fonts.ready;
  for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
  const el = document.querySelector(sel);
  if (el) { el.scrollIntoView({ block: 'center' }); await Promise.all([...el.querySelectorAll('img')].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))); }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, sectionSel);

const result = await page.evaluate((sectionSel, partSels) => {
  const section = document.querySelector(sectionSel);
  if (!section) return { error: `section not found: ${sectionSel}` };
  const sr = section.getBoundingClientRect();
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
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
  function inlineTree(rootEl) {
    (function walk(node) {
      if (node.nodeType !== 1) return;
      const cs = getComputedStyle(node);
      let st = '';
      for (const pr of PROPS) { let v = cs.getPropertyValue(pr); if (!v) continue;
        if (pr.startsWith('margin') && v === '0px') continue; if (pr.startsWith('padding') && v === '0px') continue;
        if (pr.startsWith('border-') && (v.startsWith('0px') || v.endsWith('none rgb(0, 0, 0)'))) continue;
        if (DEFAULT[pr] === v) continue;
        if (pr === 'background-image' && v !== 'none') v = v.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url("${abs(u)}")`);
        st += `${pr}:${v};`;
      }
      node.__inline = st;
      for (const c of node.children) walk(c);
    })(rootEl);
    const clone = rootEl.cloneNode(true);
    (function copy(live, cl) { cl.__inline = live.__inline; for (let i = 0; i < live.children.length; i++) copy(live.children[i], cl.children[i]); })(rootEl, clone);
    (function apply(node) {
      if (node.nodeType !== 1) return;
      node.setAttribute('style', node.__inline || '');
      node.removeAttribute('class'); node.removeAttribute('id');
      if (node.tagName === 'IMG' && node.getAttribute('srcset')) {
        const best = node.getAttribute('srcset').split(',').map((x) => { const [u, d] = x.trim().split(/\s+/); return { u, w: parseFloat(d) || 1 }; }).sort((a, b) => b.w - a.w)[0];
        if (best?.u) node.setAttribute('src', best.u);
      }
      for (const at of [...node.attributes]) if (/^on/i.test(at.name) || at.name === 'srcset' || at.name === 'loading') node.removeAttribute(at.name);
      if (node.tagName === 'IMG' && node.getAttribute('src')) node.setAttribute('src', abs(node.getAttribute('src')));
      for (const c of node.children) apply(c);
    })(clone);
    return clone.outerHTML;
  }
  const parts = [];
  partSels.forEach((sel, i) => {
    const el = section.querySelector(sel) || document.querySelector(sel);
    if (!el) { parts.push({ name: `p${i + 1}`, error: `not found: ${sel}` }); return; }
    const r = el.getBoundingClientRect();
    parts.push({ name: `p${i + 1}`, sel, html: inlineTree(el),
      x: Math.round(r.left - sr.left), y: Math.round(r.top - sr.top),
      w: Math.round(r.width), h: Math.round(r.height),
      z: parseInt(getComputedStyle(el).zIndex, 10) || i });
  });
  return { w: Math.round(sr.width), h: Math.round(sr.height), parts };
}, sectionSel, partSels);
await browser.close();

if (!result || result.error) { console.error('✗ capture failed:', result?.error || 'no result'); process.exit(1); }
const missing = result.parts.filter((p) => p.error);
for (const m of missing) console.warn(`  ⚠ ${m.error}`);
result.parts = result.parts.filter((p) => !p.error);
if (!result.parts.length) { console.error('✗ no parts captured'); process.exit(1); }

const dir = path.join(ROOT, 'assets/brands', brand, 'scenes');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, label + '.json');

const capture = { url, sectionSel, w: result.w, h: result.h, parts: result.parts };
const { localized, failures } = await localizeCapture(capture, { ...mediaTargetFor(out, ROOT), referer: url });
if (failures.length && !argv.includes('--allow-remote')) {
  console.error(`✗ ${failures.length} asset(s) could not be localized, the capture was NOT written.`);
  for (const f of failures) console.error(`    ${f.reason}: ${f.url}`);
  console.error('  Fix the source, or pass --allow-remote to write it anyway (the render will then depend on the network).');
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify(capture, null, 0) + '\n');
if (localized) console.log(`  ✓ localized ${localized} asset(s) → media/ (render stays offline + deterministic)`);
for (const f of failures) console.warn(`  ⚠ still remote (${f.reason}): ${f.url}`);
console.log(`✓ scene "${label}" → ${path.relative(ROOT, out)}  (${result.w}×${result.h}, ${result.parts.length} part(s), ${(fs.statSync(out).size / 1024).toFixed(0)}kb)`);

const scale = Math.min(1680 / result.w, 900 / result.h);
const ox = Math.round((1920 - result.w * scale) / 2), oy = Math.round((1080 - result.h * scale) / 2);
console.log('  layer stubs (assign start/duration/anim per part, background parts first, fade/dim them; foreground gets elevation):');
for (const p of result.parts.sort((a, b) => a.z - b.z)) {
  console.log(`  { "type": "component", "src": "/assets/brands/${brand}/scenes/${label}.json", "part": "${p.name}", "x": ${ox + Math.round(p.x * scale)}, "y": ${oy + Math.round(p.y * scale)}, "w": ${Math.round(p.w * scale)}, "start": 0, "duration": 5 },  // ${p.sel}`);
}
