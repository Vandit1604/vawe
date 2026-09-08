// preview-fragment.mjs: the "is this HTML doing what I want?" loop. Author a hand-written fragment
// (a hero card, a testimonial, a title block), preview it STANDALONE on the theme background at frame
// scale, and actually LOOK at it. Before it disappears into a 900-frame render. Reuses the repo http
// server so /assets/… and @font-face URLs resolve exactly as they do at render time.
//
//   node scripts/author/preview-fragment.mjs <fragment.(html|json)> [--theme linear] [--bg #08090a] [--w 1400]
//   make preview HTML=path/to/frag.html THEME=linear
//
// Accepts a raw HTML file, OR a captured component/scene JSON ({html} or {parts:[{html}]}) so you can
// eyeball a `make capture` result too. Writes /tmp/preview.png (1920×1080).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { serveRepo } from '../lib/render-harness.mjs';
import { extractKitBlock } from '../lib/stagekit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const src = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!src || !fs.existsSync(src)) { console.error('usage: node scripts/author/preview-fragment.mjs <fragment.html|component.json> [--theme name] [--bg #hex] [--w px]'); process.exit(1); }
const boxW = parseInt(flag('--w', '1400'), 10);
// `--t` is the frame clock, in SECONDS, written every frame by core/bg-html.js. A preview that never
// sets it leaves every `calc(... var(--t) ...)` INVALID, so the browser drops the whole declaration and
// the fragment previews as a different picture with no warning. Default 0 (the first frame); pass
// `--t 3.5` to preview any other moment, which is also how you check that a backdrop moves at all.
const tSec = parseFloat(flag('--t', '0'));
// A FULL-BLEED fragment sizes itself to its container, so a centred 1400px box previews a STRIP of it
// and nothing says so (docs/MISTAKES.md #271). `#frag` declares a width and no height, so a child at
// `position:absolute; inset:0` collapses to zero. Detected rather than declared, because the author of
// a backdrop should not have to know this tool's layout; the choice is PRINTED so it is never silent.
//
// SCAN THE FRAGMENT'S OWN MARKUP, NOT THE PASTED STAGE KIT. Every scene fragment carries the mandatory
// STAGEKIT block (scripts/lib/stagekit.mjs) verbatim, and that block is CSS the fragment's author did
// not write and mostly does not use: this regex used to scan `raw` whole, so any kit rule that happened
// to declare `position:absolute` + an inset made every fragment carrying the kit read as full-bleed,
// including a 140x640 box that never referenced that class. `extractKitBlock` finds the exact pasted
// bytes (the STAGEKIT:start/:end markers are unambiguous) and they are cut out before either regex
// runs, so the detector answers what the fragment's OWN markup uses, not what the kit merely defines.
const FULLBLEED_RE = /position\s*:\s*(?:absolute|fixed)/i;
const INSET_RE = /inset\s*:\s*0|(?:top|left|right|bottom)\s*:\s*0\s*(?:;|})/i;
// THE THEME IS APPLIED, NOT SAMPLED. This used to read `palette.bg` and nothing else, so `--theme`
// was accepted and then 14 of the 15 palette entries were ignored: a fragment written against
// var(--accent) previewed BLACK, because an undefined custom property makes the declaration invalid
// and the colour falls to the initial value. The body then hard-coded `color:#f7f8f8`, which is what
// hid it, text looked plausible, so the tool read as working.
//
// That matters more here than almost anywhere, because CLAUDE.md makes this the gate: "Preview every
// hand fragment before rendering." A gate that paints the brand colour black is not checking the
// fragment, it is checking a different fragment. The page now calls the ENGINE's own applyTheme
// (core/boot.js), so the token names cannot drift from what a real render sets, and they had already
// drifted, since the palette key is `surface2` while the token is `--surface-2`.
// docs/MISTAKES.md #382.
// --theme-file previews a theme that is not (yet) in themes/. It exists for scripts/author/invent-look.mjs,
// which photographs candidate looks BEFORE one is chosen: without it a generator would have to write
// five throwaway files into themes/ and remember to delete them.
const themeFileArg = flag('--theme-file', null);
const themeName = themeFileArg ? path.basename(themeFileArg, '.json') : flag('--theme', 'default');
const themeFile = themeFileArg ? path.resolve(themeFileArg) : path.join(ROOT, 'themes', themeName + '.json');
// A missing theme was swallowed by a `catch` that substituted a near-black. Naming a theme that does
// not exist is a typo, and a typo that silently previews on someone else's colours is the whole bug.
if (!fs.existsSync(themeFile)) {
  if (themeFileArg) { console.error(`preview: --theme-file ${themeFileArg} does not exist.`); process.exit(1); }
  console.error(`preview: no theme "${themeName}", themes/${themeName}.json does not exist.`);
  console.error(`  available: ${fs.readdirSync(path.join(ROOT, 'themes')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).join(', ')}`);
  process.exit(1);
}
const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
const bg = flag('--bg', null) || theme.palette.bg;

// pull the fragment out of raw HTML or a captured JSON ({html} | {parts:[{html}]})
let raw = fs.readFileSync(src, 'utf8');
if (src.endsWith('.json')) {
  const j = JSON.parse(raw);
  raw = j.html || (j.parts || []).map((p) => `<div style="position:relative;margin:24px auto">${p.html}</div>`).join('') || raw;
}

// Decided after `raw` is resolved, because a captured .json carries its markup one level in. Strip the
// pasted kit block first (see the comment on the regexes above) so its CSS cannot decide this on the
// fragment's behalf.
const kitBlock = extractKitBlock(raw);
const ownMarkup = kitBlock ? raw.replace(kitBlock, '') : raw;
const fullBleed = FULLBLEED_RE.test(ownMarkup) && INSET_RE.test(ownMarkup);

const page$html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/core/tokens.css">
<style>*{box-sizing:border-box}
/* tokens.css is linked for its fonts, but it also sets html,body{width:var(--vw);overflow:hidden} and
   its default --vw is PORTRAIT 1080px. This page never boots, so nothing ever rewrites that default.
   Every fragment wider than 1080px was silently cut at x=1080 while the tool printed "box 1900px
   centred" (docs/MISTAKES.md #351). Undo both: the vars carry the landscape canvas this harness really
   photographs, and html/body grow rather than clip, so --serve still scrolls and the PNG path clips
   through the screenshot rect as the comment below says. */
:root{--vw:1920px;--vh:1080px}
/* color was hard-coded #f7f8f8, which is exactly what made the missing palette invisible: text kept
   looking right while every var(--…) colour resolved to nothing. It follows the theme now. */
html,body{margin:0;background:${bg};color:var(--text);width:auto;height:auto;overflow:visible}
/* min-height (not fixed) + no overflow:hidden → the page SCROLLS when served; the PNG path clips to
   1920x1080 via the screenshot clip, so it's unaffected. */
#stage{min-width:1920px;min-height:1080px;display:flex;align-items:center;justify-content:center}
#frag{--t:${tSec};--p:0;${fullBleed ? 'width:1920px;height:1080px' : `width:${boxW}px`};position:relative;font-family:'Inter',system-ui,sans-serif}</style></head>
<body><div id="stage"><div id="frag">${raw}</div></div>
<script type="module">
  // ONE definition of what a theme means. Importing the engine's own applyTheme is the point: a second
  // copy of the palette-to-token mapping here is how it drifted the first time (#159, #368).
  import { applyTheme } from '/core/engine/boot.js';
  try { applyTheme(${JSON.stringify(theme)}); window.__themed = true; }
  catch (e) { window.__themed = 'error: ' + e.message; }
</script></body></html>`;

const { server, port } = await serveRepo({
  route: (req, res) => {
    if (decodeURIComponent(req.url.split('?')[0]) !== '/__frag') return false;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(page$html);
    return true;
  },
});

// --serve: keep the page live in your browser (real fonts/assets, interactive) instead of a PNG
if (argv.includes('--serve')) {
  const url = `http://127.0.0.1:${port}/__frag`;
  console.log(`▶ serving ${path.relative(ROOT, src)} at  ${url}   (theme ${themeName})`);
  console.log('  open that URL in your browser. Ctrl-C to stop.');
  try { await import('node:child_process').then((cp) => cp.exec(`open "${url}"`)); } catch {}
} else {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/__frag`, { waitUntil: 'load' });
// applyTheme runs in a module script, so the tokens land AFTER `load`. Screenshotting without this
// wait photographs the untokenised frame, which is the bug this fix exists to remove, reintroduced as
// a race. A theme that fails to apply is fatal: the picture would be judged against the wrong colours.
await page.waitForFunction('window.__themed !== undefined', { timeout: 10000 });
const themed = await page.evaluate(() => window.__themed);
if (themed !== true) { console.error(`preview: theme "${themeName}" failed to apply, ${themed}`); process.exit(1); }
await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
// --out lets a caller photograph several fragments in one run without each overwriting the last.
const out = flag('--out', '/tmp/preview.png');
// The PNG is the canvas, so anything outside it is not in the picture you are about to judge. Say so:
// a fragment that hangs off the edge looks in the shot exactly like a fragment that was designed to
// end there, which is how a 1344px capture read as a cropped card for as long as #337 was live.
const overflow = await page.evaluate(() => {
  const r = document.getElementById('frag').getBoundingClientRect();
  return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
});
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  // --no-detect: for a caller photographing many generated fragments (invent-look's candidate sheet),
  // where the craft tells belong to the generator, not to this run. Never pass it for a HAND-written
  // fragment, that is the one this check exists for.
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

// impeccable's anti-pattern detector, over the page we just photographed. A fragment is the least
// reviewed markup in the pipeline, and the moment somebody is looking at it is the moment to say what
// is wrong with it. The picture cannot show a flat type scale or a default face by itself.
//
// The BROWSER engine, deliberately: it reads computed styles off the very page in the screenshot, and it
// needs only puppeteer, which is already open here. The static-HTML engine wants four parser packages
// this repo does not carry, and its own fallback when they are missing is to quietly downgrade to a
// regex pass that reports nothing. A green result meaning "not checked" is the failure mode this repo
// least wants in an approval stop.
async function detect(url, browser) {
  let detectUrl;
  try { ({ detectUrl } = await import('../../skills/impeccable/scripts/detector/detect-antipatterns.mjs')); }
  catch (e) { return { skipped: `the impeccable skill is not vendored at skills/impeccable (${e.code || e.message})` }; }
  try { return { findings: await detectUrl(url, { browser, waitUntil: 'load', settleMs: 100, viewport: { width: 1920, height: 1080 } }) }; }
  catch (e) { return { skipped: `the detector threw, ${e.message}` }; }
}

function report(r) {
  if (!r) return;  // --no-detect: the caller said so, so there is nothing to report either way
  if (r.skipped) { console.log(`\n  ⚠ anti-pattern check SKIPPED, so this fragment is unchecked, not clean: ${r.skipped}`); return; }
  if (!r.findings.length) { console.log('\n  ✓ impeccable: no anti-patterns detected (it reads craft tells, not whether the idea is right)'); return; }
  console.log(`\n  impeccable · ${r.findings.length} anti-pattern(s). Each is a fix or a reason, never a shrug:`);
  for (const f of r.findings) console.log(`    [${f.antipattern}] ${String(f.snippet || '').slice(0, 120)}\n      → ${f.description}`);
}
