// preview-fragment.mjs: the "is this HTML doing what I want?" loop. Author a hand-written fragment
// (a hero card, a testimonial, a title block), preview it STANDALONE on the theme background at frame
// scale, and actually LOOK at it. Before it disappears into a 900-frame render. Reuses the repo http
// server so /assets/… and @font-face URLs resolve exactly as they do at render time.
//
//   node harness/author/preview-fragment.mjs <fragment.(html|json)> [--theme linear] [--bg #08090a] [--w 1400]
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
import { fragPage, FULLBLEED_RE, INSET_RE } from '../lib/frag-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const src = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!src || !fs.existsSync(src)) { console.error('usage: node harness/author/preview-fragment.mjs <fragment.html|component.json> [--theme name] [--bg #hex] [--w px]'); process.exit(1); }
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
// STAGEKIT block (harness/lib/stagekit.mjs) verbatim, and that block is CSS the fragment's author did
// not write and mostly does not use: this regex used to scan `raw` whole, so any kit rule that happened
// to declare `position:absolute` + an inset made every fragment carrying the kit read as full-bleed,
// including a 140x640 box that never referenced that class. `extractKitBlock` finds the exact pasted
// bytes (the STAGEKIT:start/:end markers are unambiguous) and they are cut out before either regex
// runs, so the detector answers what the fragment's OWN markup uses, not what the kit merely defines.
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
// --theme-file previews a theme that is not (yet) in themes/. It exists for harness/author/invent-look.mjs,
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

const page$html = fragPage({ raw, theme, bg, boxW, tSec, fullBleed });

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
  try { await import('node:child_process').then((cp) => cp.exec(`open "${url}"`)); } catch {} // best-effort auto-open (macOS only); the printed URL above is the real fallback
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
  // --boxes-out <path>: dump every element's LAID-OUT bounding box as JSON. This is the one thing a
  // static source parse cannot answer (a percentage width, a grid track, an object-fit crop all
  // resolve only once the browser lays the page out), and `make screen`'s clipping check needs exactly
  // that: whether an element the author put on screen actually landed inside the frame.
  const boxesOut = flag('--boxes-out', null);
  if (boxesOut) {
    const boxes = await page.evaluate(() => {
      const frag = document.getElementById('frag');
      if (!frag) return [];
      const out = [];
      for (const el of frag.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
        const isImg = el.tagName === 'IMG';
        // own text only (not descendants'), so a wrapper div is not double-reported for its child's words
        const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
        if (!isImg && !ownText) continue;
        out.push({ tag: el.tagName.toLowerCase(), text: isImg ? (el.getAttribute('alt') || el.getAttribute('src') || 'img') : ownText,
          x: r.left, y: r.top, w: r.width, h: r.height, fontPx: isImg ? null : parseFloat(cs.fontSize) });
      }
      return out;
    });
    fs.writeFileSync(boxesOut, JSON.stringify(boxes));
  }
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
// THIRD-PARTY, AND SAID SO. `impeccable` is not house tooling: it is a vendored skill (v3.5.0,
// Apache 2.0, LICENSE at skills/impeccable/LICENSE) and its detector is the only thing in this repo
// that opens a browser and measures what actually rendered. Our OWN anti-slop is elsewhere and is
// named for itself: harness/live/craft-live.mjs reads a fragment's source for off-ramp sizes and
// shadows, and quality/gates/frame-check.mjs compares the plan with the frames. Neither is impeccable
// and neither should ever be called it.
//
// RESOLVED THE WAY THE SKILL RESOLVES IT. skills/impeccable/scripts/detect.mjs is its own entry point
// and it tries TWO layouts before giving up. Hard-coding one of them, which this did, means a skill
// update that moves the detector breaks the check silently and the run still reports a clean preview.
async function detect(url, browser) {
  // Inside the function on purpose: `detect` is hoisted and called from the top of this file, so a
  // module-level const here is in its temporal dead zone at call time and throws.
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
