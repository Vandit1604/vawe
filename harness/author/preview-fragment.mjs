import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { serveRepo } from '../lib/render-harness.mjs';
import { extractKitBlock } from '../lib/stagekit.mjs';
import { fragPage, FULLBLEED_RE, INSET_RE } from '../lib/frag-page.mjs';
import { expandTheme } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';
import { sanitizeHtml, scopeStyles } from '../../core/type/sanitize-html.js';
import { findFilmLayerBox } from '../lib/film-layer-box.mjs';
import { clipAgainstBox } from './screen.mjs';
import { normalizeColor, shadowOrNull, firstFontFamily, cornerRadii } from './box-style.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const src = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!src || !fs.existsSync(src)) { console.error('usage: node harness/author/preview-fragment.mjs <fragment.html|component.json> [--theme name] [--bg #hex] [--w px]'); process.exit(1); }
const boxW = parseInt(flag('--w', '1400'), 10);
const tSec = parseFloat(flag('--t', '0'));
// and nothing says so (engine-doctrine/MISTAKES.md #271). `#frag` declares a width and no height, so a child at
// engine-doctrine/MISTAKES.md #382.
const themeFileArg = flag('--theme-file', null);
const themeName = themeFileArg ? path.basename(themeFileArg, '.json') : flag('--theme', 'default');
const themeFile = themeFileArg ? path.resolve(themeFileArg) : path.join(ROOT, 'themes', themeName + '.json');
if (!fs.existsSync(themeFile)) {
  if (themeFileArg) { console.error(`preview: --theme-file ${themeFileArg} does not exist.`); process.exit(1); }
  console.error(`preview: no theme "${themeName}", themes/${themeName}.json does not exist.`);
  console.error(`  available: ${fs.readdirSync(path.join(ROOT, 'themes')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).join(', ')}`);
  process.exit(1);
}
const rawTheme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
const theme = expandTheme(rawTheme, { parseColor, colorAlpha });
const bg = flag('--bg', null) || theme.palette.bg;

let raw = fs.readFileSync(src, 'utf8');
if (src.endsWith('.json')) {
  const j = JSON.parse(raw);
  raw = j.html || (j.parts || []).map((p) => `<div style="position:relative;margin:24px auto">${p.html}</div>`).join('') || raw;
}

const kitBlock = extractKitBlock(raw);
const ownMarkup = kitBlock ? raw.replace(kitBlock, '') : raw;
const fullBleed = FULLBLEED_RE.test(ownMarkup) && INSET_RE.test(ownMarkup);

const markup = scopeStyles(sanitizeHtml(raw));

const page$html = fragPage({ raw: markup, theme, bg, boxW, tSec, fullBleed });

async function reportFilmBox(browser, port, out, layerBox, boxesOutFilm) {
  const page2 = await browser.newPage();
  await page2.setViewport({ width: layerBox.W, height: layerBox.H, deviceScaleFactor: 1 });
  await page2.goto(`http://127.0.0.1:${port}/__frag_film`, { waitUntil: 'load' });
  await page2.waitForFunction('window.__themed !== undefined', { timeout: 10000 });
  const themed = await page2.evaluate(() => window.__themed);
  if (themed !== true) { console.log(`  ⚠ film-box render skipped: theme failed to apply, ${themed}`); await page2.close(); return; }
  await page2.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await page2.screenshot({ path: out.replace(/\.png$/, '') + '.film.png', clip: { x: 0, y: 0, width: layerBox.W, height: layerBox.H } });
  const filmBoxes = mapBoxStyle(await page2.evaluate(getFragBoxes));
  await page2.close();
  if (boxesOutFilm) fs.writeFileSync(boxesOutFilm, JSON.stringify({ box: layerBox, elements: filmBoxes }));
  console.log(`  assembled: ${layerBox.film}${layerBox.id ? ` layer "${layerBox.id}"` : ''}, `
    + `box ${layerBox.w}x${layerBox.h} at (${layerBox.x},${layerBox.y}) on a ${layerBox.W}x${layerBox.H} canvas`);
  const filmFindings = clipAgainstBox(filmBoxes, layerBox);
  if (!filmFindings.length) { console.log('  preview matches film: fits inside its assembled layer box.'); return; }
  for (const f of filmFindings)
    console.log(`  preview differs from film: <${f.tag}> "${f.text}" clips ${f.amounts.join(', ')} at its layer box ${layerBox.w}x${layerBox.h}`);
}

const layerBox = findFilmLayerBox(ROOT, src, flag('--film', null));
const filmPage$html = layerBox ? fragPage({ raw: markup, theme, bg, tSec, box: layerBox }) : null;

const { server, port } = await serveRepo({
  route: (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__frag') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page$html); return true; }
    if (p === '/__frag_film' && filmPage$html) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(filmPage$html); return true; }
    return false;
  },
});

const getFragBoxes = () => {
  const frag = document.getElementById('frag');
  if (!frag) return [];
  const out = [];
  for (const el of frag.querySelectorAll('*')) {
    if (el.classList.contains('kit-root')) continue; // the pasted stage-kit's own root wrapper, not the fragment's design
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    const isImg = el.tagName === 'IMG';
    const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const hasBg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none');
    const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
    if (!isImg && !ownText && !hasBg && !hasBorder && !hasShadow) continue;
    out.push({ tag: el.tagName.toLowerCase(), text: isImg ? (el.getAttribute('alt') || el.getAttribute('src') || 'img') : ownText,
      x: r.left, y: r.top, w: r.width, h: r.height, fontPx: isImg ? null : parseFloat(cs.fontSize),
      raw: { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing,
        color: cs.color, backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow,
        borderTopLeftRadius: cs.borderTopLeftRadius, borderTopRightRadius: cs.borderTopRightRadius,
        borderBottomRightRadius: cs.borderBottomRightRadius, borderBottomLeftRadius: cs.borderBottomLeftRadius } });
  }
  return out;
};

// mapBoxStyle(boxes): the Node-side half of getFragBoxes, turning its raw computed-style strings into
// the fields a design check can compare against a spec (harness/author/box-style.mjs). Mutates the
// `raw` field away rather than leaving both shapes on the box, so a consumer sees exactly one.
function mapBoxStyle(boxes) {
  for (const b of boxes) {
    const raw = b.raw;
    delete b.raw;
    if (!raw) continue; // an older boxes-out file replayed through here, or a box with no styling captured
    b.fontFamily = firstFontFamily(raw.fontFamily);
    b.fontWeight = parseInt(raw.fontWeight, 10);
    b.letterSpacing = raw.letterSpacing === 'normal' ? 0 : parseFloat(raw.letterSpacing) || 0;
    b.color = normalizeColor(raw.color);
    b.backgroundColor = normalizeColor(raw.backgroundColor);
    Object.assign(b, cornerRadii(raw.borderTopLeftRadius, raw.borderTopRightRadius, raw.borderBottomRightRadius, raw.borderBottomLeftRadius));
    b.boxShadow = shadowOrNull(raw.boxShadow);
  }
  return boxes;
}

if (argv.includes('--serve')) {
  const url = `http://127.0.0.1:${port}/__frag`;
  console.log(`▶ serving ${path.relative(ROOT, src)} at  ${url}   (theme ${themeName})`);
  console.log('  open that URL in your browser. Ctrl-C to stop.');
  try { await import('node:child_process').then((cp) => cp.exec(`open "${url}"`)); } catch {} // best-effort auto-open (macOS only); the printed URL above is the real fallback
} else {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/__frag`, { waitUntil: 'load' });
await page.waitForFunction('window.__themed !== undefined', { timeout: 10000 });
const themed = await page.evaluate(() => window.__themed);
if (themed !== true) { console.error(`preview: theme "${themeName}" failed to apply, ${themed}`); process.exit(1); }
await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
const out = flag('--out', '/tmp/preview.png');
const overflow = await page.evaluate(() => {
  const r = document.getElementById('frag').getBoundingClientRect();
  return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
});
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  const boxesOut = flag('--boxes-out', null);
  if (boxesOut) fs.writeFileSync(boxesOut, JSON.stringify(mapBoxStyle(await page.evaluate(getFragBoxes))));

  if (layerBox) await reportFilmBox(browser, port, out, layerBox, flag('--boxes-out-film', null));
  else console.log('  not assembled yet, checked at full canvas.');
  const findings = has('--no-detect') ? null : await detect(`http://127.0.0.1:${port}/__frag`, browser);
  await browser.close(); server.close();
  console.log(`  --t: ${tSec}s (the frame clock; pass --t <seconds> for another moment)`);
  console.log(`  layout: ${fullBleed ? 'FULL BLEED 1920x1080 (the fragment positions itself against its container)' : boxW + 'px centred'}`);
console.log(`✓ ${path.relative(ROOT, src)}  →  ${out}   (theme ${themeName}, bg ${bg}, ${fullBleed ? 'full bleed 1920x1080' : `box ${boxW}px`})`);
  const off = [overflow.l < 0 && `${-overflow.l}px past the left`, overflow.t < 0 && `${-overflow.t}px past the top`,
    overflow.r > 1920 && `${overflow.r - 1920}px past the right`, overflow.b > 1080 && `${overflow.b - 1080}px past the bottom`].filter(Boolean);
  if (off.length) console.log(`  ⚠ the fragment runs off the 1920x1080 canvas, ${off.join(', ')}. What you see in the PNG is CROPPED, not the whole thing.`);
  console.log('  open it / Read it and check: real fonts? real assets loaded? spacing + hierarchy right?');
  console.log('  want it live in your browser instead of a PNG?  add --serve');
  report(findings);
}

async function detect(url, browser) {
  const candidates = [
    '../../skills/impeccable/scripts/detector/detect-antipatterns.mjs',
    '../../skills/impeccable/cli/engine/detect-antipatterns.mjs',
  ];
  let detectUrl, why = '';
  for (const cand of candidates) {
    try { ({ detectUrl } = await import(cand)); break; } catch (e) { why = e.code || e.message; }
  }
  if (!detectUrl) return { skipped: `the impeccable skill is not vendored at skills/impeccable (${why})` };
  try { return { findings: await detectUrl(url, { browser, waitUntil: 'load', settleMs: 100, viewport: { width: 1920, height: 1080 } }) }; }
  catch (e) { return { skipped: `the detector threw, ${e.message}` }; }
}

function report(r) {
  if (!r) return;  // --no-detect: the caller said so, so there is nothing to report either way
  if (r.skipped) { console.log(`\n  ⚠ anti-pattern check SKIPPED, so this fragment is unchecked, not clean: ${r.skipped}`); return; }
  if (!r.findings.length) { console.log('\n  ✓ impeccable v3.5.0 (vendored third-party, Apache 2.0): no anti-patterns detected.'
    + '\n    It reads craft tells in the RENDERED page, never whether the idea is right.'); return; }
  console.log(`\n  impeccable v3.5.0 (vendored, Apache 2.0) · ${r.findings.length} anti-pattern(s).`
    + ' Each is a fix or a reason, never a shrug:');
  for (const f of r.findings) console.log(`    [${f.antipattern}] ${String(f.snippet || '').slice(0, 120)}\n      → ${f.description}`);
}
