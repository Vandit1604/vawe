#!/usr/bin/env node
// scripts/gates/frame-check.mjs: THE PLAN, COMPARED WITH THE FRAMES BUILT FROM IT.
//
//   make frame-check D=formats/scene/<film>.json   ·   node scripts/gates/frame-check.mjs <film> [--json]
//
// Nothing in this repo did this. `storyboard-check` grades the plan against itself; `critique` and
// `eye-trace` read the scene JSON after assembly; `make preview` judges one fragment with no idea which
// beat it serves. So a storyboard could describe one picture while its fragment drew another, and every
// gate stayed green: beat 3 of vawe-oblique planned `blueprint: terminalReveal`, described "a white
// pill bar with a round cobalt run button" in its own `picture:` line, and shipped an AI chat input
// into a film about a command line (docs/MISTAKES.md #596).
//
// WHAT IT MEASURES RATHER THAN READS. `weight: peak` is a promise about SIZE, so it is checked by
// rendering each fragment at 1920x1080 in the same wrapper `make preview` photographs and measuring the
// largest element in each. A film whose quietest beat holds its biggest object has not made the
// decision its plan claims.
//
// THE ARITHMETIC, because this repo has been burned by it: AREA IS WIDTH TIMES HEIGHT AND NOTHING ELSE.
// The deleted `visual-vocabulary` gate squared a 590x18 rule into 590x590 and credited a hairline with a
// tenth of the frame. `--self-test` asserts against that exact shape before any film is read.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStoryboard, blocksOf, fieldIn } from '../author/storyboard-parse.mjs';
import { extractKitBlock } from '../lib/stagekit.mjs';
import { KIT_ROLE, offRampSizes, offRampShadows } from '../lib/kit-ramp.mjs';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANVAS = { w: 1920, h: 1080 };
/** Area, on both axes, once. A share stated on one axis produces no area at all. */
export const areaOf = (w, h) => Math.max(0, w) * Math.max(0, h);
export const shareOf = (w, h) => areaOf(w, h) / areaOf(CANVAS.w, CANVAS.h);

if (process.argv.includes('--self-test')) {
  const a = areaOf(590, 18);
  if (a !== 10620) { console.error(`areaOf(590,18) = ${a}, expected 10620 (width times height, never a square)`); process.exit(1); }
  if (shareOf(590, 18) > 0.006) { console.error('a hairline must not read as a large share of the frame'); process.exit(1); }
  if (areaOf(-5, 10) !== 0) { console.error('a negative dimension is not negative area'); process.exit(1); }
  console.log('  ✓ frame-check self-test: area is width times height, a hairline stays a hairline');
  process.exit(0);
}

const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
if (!arg) { console.error('usage: make frame-check D=formats/scene/<film>.json'); process.exit(2); }
const base = String(arg).replace(/\.(json|storyboard\.md)$/, '');
const sbPath = [base + '.storyboard.md', path.join('formats/scene', path.basename(base) + '.storyboard.md')]
  .map((f) => path.resolve(ROOT, f)).find((f) => fs.existsSync(f));
if (!sbPath) { console.error(`no storyboard for "${arg}"`); process.exit(2); }

const src = fs.readFileSync(sbPath, 'utf8');
const sb = parseStoryboard(src);
const blocks = blocksOf(src);
const beats = sb.beats.map((b, i) => ({
  ...b,
  archetype: (fieldIn(blocks[i], 'archetype') || '').trim(),
  weight: (fieldIn(blocks[i], 'weight') || '').trim(),
  fragment: (fieldIn(blocks[i], 'fragment') || '').split(/\s+\(/)[0].trim() || null,
}));

const gf = gateFindings();
const errs = [], warns = [];
const err = (code, msg, extra) => { errs.push(msg); gf.fail(code, msg, extra); };
const warn = (code, msg, extra) => { warns.push(msg); gf.warn(code, msg, extra); };

// ── 1. every size and every shadow in a fragment traces to the kit ─────────────────────────────────
// Live at the keystroke already (scripts/live/craft-live.mjs), and a gate too, because the live hook
// speaks to whoever is typing and says nothing to whoever is reviewing a branch.
for (const b of beats) {
  if (!b.fragment) continue;
  const file = path.join(ROOT, b.fragment);
  if (!fs.existsSync(file)) { err('fragment-missing', `beat "${b.name}" names ${b.fragment} and no such file exists.`); continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const kit = extractKitBlock(raw);
  if (!kit) {
    warn('kit-markers-missing', `${b.fragment} carries no STAGEKIT markers, so every tool that strips the kit `
      + 'before judging a fragment is judging the kit as the author\'s own CSS. Paste `buildKit().block`, not the '
      + '`<film>.kit.css` sidecar (docs/MISTAKES.md #594).');
  }
  const own = (kit ? raw.replace(kit, '') : raw).replace(/\/\*[\s\S]*?\*\//g, '');
  const sizes = offRampSizes(own);
  if (sizes.length >= 3 && !KIT_ROLE.test(own)) {
    err('off-ramp-size', `${b.fragment} sets ${sizes.length} literal type sizes (${sizes.slice(0, 6).join(', ')}) and names no `
      + '`.kit-` role. The kit ships the ramp; a film whose frames each invent a scale is several films.');
  }
  // A shadow is on the ramp if it NAMES the ramp anywhere in the value, not only at the start. A
  // hairline ring plus a kit elevation is one composite surface, and so is an inset highlight, which
  // is not elevation at all: it is where the light hits the top edge. Requiring `var(--kit-elev` to be
  // the first token rejected the double-bezel, which is the technique that makes a surface read as
  // machined rather than as a sticker.
  const offRamp = offRampShadows(own);
  if (offRamp.length) {
    err('off-ramp-shadow', `${b.fragment} writes ${offRamp.length} box-shadow(s) that name no kit elevation. `
      + 'Elevation is a three-level ramp (`--kit-elev-1/2/3`), one level per element, neutral black. A ring '
      + 'or an inset highlight may ride along with one; neither is an elevation on its own.');
  }
}

// ── 2. the peak is a promise about size, so it gets measured ───────────────────────────────────────
// Rendered, because this is the one claim no amount of reading the CSS settles: a 1000px plate and two
// 660px plates are three numbers in three files and one comparison nobody was making.
async function measure() {
  const withFrags = beats.filter((b) => b.fragment && fs.existsSync(path.join(ROOT, b.fragment)));
  if (!withFrags.length || !beats.some((b) => b.weight)) return null;
  let puppeteer, serveRepo, fragPage, FULLBLEED_RE, INSET_RE;
  try {
    puppeteer = (await import('puppeteer')).default;
    ({ serveRepo } = await import('../lib/render-harness.mjs'));
    ({ fragPage, FULLBLEED_RE, INSET_RE } = await import('../lib/frag-page.mjs'));
  } catch { return null; }                       // no browser here: the static half above still ran
  const themeName = sb.theme ? (/themes\/([\w.-]+)\.json/.exec(sb.theme) || [])[1] || sb.theme.trim() : 'default';
  const themeFile = path.join(ROOT, 'themes', themeName + '.json');
  if (!fs.existsSync(themeFile)) return null;
  const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
  const pages = new Map();
  const { server, port } = await serveRepo({
    route: (req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').searchParams.get('src') || '');
      if (!req.url.startsWith('/__fc') || !pages.has(rel)) return false;
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(pages.get(rel)); return true;
    },
  });
  for (const b of withFrags) {
    const raw = fs.readFileSync(path.join(ROOT, b.fragment), 'utf8');
    const kit = extractKitBlock(raw);
    const own = kit ? raw.replace(kit, '') : raw;
    pages.set(b.fragment, fragPage({ raw, theme, bg: theme.palette.bg,
      fullBleed: FULLBLEED_RE.test(own) && INSET_RE.test(own) }));
  }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: CANVAS.w, height: CANVAS.h });
  const out = [];
  for (const b of withFrags) {
    await page.goto(`http://127.0.0.1:${port}/__fc?src=${encodeURIComponent(b.fragment)}`, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
    // THE LARGEST OBJECT, WHICH IS NOT THE LARGEST BOX. The first version of this measured every
    // element and reported `.f-stage` and `.tm-stage`, transparent flex wrappers that span the margins
    // on every beat: it made three beats identical at 83% and called that a tie. An OBJECT is something
    // a viewer can see, so it either PAINTS (a fill, a shadow, an image) or it is a leaf of text. A
    // wrapper that paints nothing is furniture, whatever its size.
    const px = await page.evaluate((canvas) => {
      const paints = (el, cs) => cs.backgroundImage !== 'none'
        || (cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor))
        || cs.boxShadow !== 'none' || /^(img|svg|canvas|video)$/i.test(el.tagName);
      let best = 0, what = '';
      for (const el of document.querySelectorAll('#frag *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        // A BACKDROP IS NOT AN OBJECT. The ambient depth layer is a pair of accent fields at under 10%
        // opacity behind 120px of blur; it painted, so the first version of this measured it as the
        // largest thing in all seven frames and dropped the peak's lead from 1.51x to 1.06x. The rule
        // is the doctrine restated: a backdrop a viewer NOTICES has stopped being a backdrop, so
        // anything this faint or this blurred cannot be what makes a beat loud.
        if (+cs.opacity < 0.15) continue;
        if (/blur\((\d+)px\)/.test(cs.filter) && +RegExp.$1 >= 40) continue;
        const textLeaf = !el.firstElementChild && el.textContent.trim().length > 0;
        if (!paints(el, cs) && !textLeaf) continue;
        const r = el.getBoundingClientRect();
        // CLIPPED TO THE CANVAS. A plane that runs off two edges is credited with its off-screen half
        // otherwise, which reported beat 2's bleed plane as four times the size of the peak's plate
        // when barely half of it is in the picture. What is outside the frame is not in the frame.
        const a = Math.max(0, Math.min(r.right, canvas.w) - Math.max(r.left, 0))
                * Math.max(0, Math.min(r.bottom, canvas.h) - Math.max(r.top, 0));
        if (a / (canvas.w * canvas.h) >= 0.92) continue;   // the ground is not an object
        if (a > best) { best = a; what = el.className || el.tagName.toLowerCase(); }
      }
      return { area: best, what: String(what).split(' ')[0] };
    }, CANVAS);
    out.push({ ...b, area: px.area, share: px.area / areaOf(CANVAS.w, CANVAS.h), what: px.what });
  }
  await browser.close(); server.close();
  return out;
}

const measured = await measure();
if (measured) {
  const peak = measured.find((b) => b.weight === 'peak');
  const biggest = measured.reduce((m, b) => (b.area > m.area ? b : m), measured[0]);
  if (peak && biggest && biggest.name !== peak.name) {
    err('peak-not-largest', `beat "${peak.name}" is declared the peak and beat "${biggest.name}" holds the larger object `
      + `(${(biggest.share * 100).toFixed(0)}% of the frame in .${biggest.what}, against ${(peak.share * 100).toFixed(0)}% `
      + `in .${peak.what}). Naming a peak is a promise the other beats stay quieter, and the frames say otherwise. `
      + 'The fix is one decisive move on the peak, then quieting whatever competes with it, so the move stays '
      + 'legible. Turning every beat up is how a film gets flatter, not louder.');
  }
  if (peak && biggest && biggest.name === peak.name) {
    const second = measured.filter((b) => b.name !== peak.name).reduce((m, b) => (b.area > m.area ? b : m), { area: 0, name: '' });
    if (second.area && peak.area / second.area < 1.25) {
      warn('peak-barely-leads', `the peak "${peak.name}" is only ${(peak.area / second.area).toFixed(2)}x the next beat. `
        + 'A peak a viewer has to measure is not a peak.');
    }
  }
}

// ── report ─────────────────────────────────────────────────────────────────────────────────────────
if (process.argv.includes('--json')) { console.log(JSON.stringify(gf.toJSON ? gf.toJSON() : { errs, warns }, null, 2)); process.exit(errs.length ? 1 : 0); }
console.log(`\n  frame-check · ${path.relative(ROOT, sbPath)} · ${beats.filter((b) => b.fragment).length} fragment(s)`);
if (measured) {
  for (const b of measured.sort((a, c) => c.area - a.area)) {
    console.log(`    ${(b.weight || '·').padEnd(6)} ${String(b.name).padEnd(10)} ${(b.share * 100).toFixed(1).padStart(5)}% of frame  .${b.what}`);
  }
}
for (const m of errs) console.log(`    ✗ ${m}`);
for (const m of warns) console.log(`    ~ ${m}`);
if (!errs.length && !warns.length) console.log('    ✓ every frame matches what its beat planned\n');
else console.log('');
process.exit(errs.length ? 1 : 0);
