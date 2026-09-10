// screen.mjs: `make screen F=<fragment.html> [KIND=editor|grid|dashboard|chat|card] [THEME=] [INVENT=1] [REF=<ref> ACT=<n>] [W=1920 H=1080]`
//
// ONE command for the design route of a product screen (docs/CRAFT/SCREENS.md, owner ruling in
// .claude/plans/content-richness.plan.md Update 1: "use a ui design harness to build beautiful mocks,
// not plain by default"). The owner: "why two? not single one". If F does not exist, KIND writes the
// starting fragment first (folded in from the old `screen-new` target, now gone); then it always
// renders, detects and measures. If F exists and KIND is given, refuses rather than overwrite an
// authored screen.
//
//   node harness/author/screen.mjs formats/scene/vawe-flow-editor.html --theme vawe --ref example-madera --act 1
//   node harness/author/screen.mjs formats/scene/new-screen.html --kind grid --theme vawe   # writes it first
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractKitBlock, buildKit, MIN_VIDEO_TEXT_PX } from '../lib/stagekit.mjs';
import { measureFrame, measureVideo } from '../media/content.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { MARGIN } from '../../core/layout/safe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// exported so ideate-ask.mjs can offer these as the real "designed screen" routes, never a second
// hardcoded copy of this list.
export const KINDS = ['editor', 'grid', 'dashboard', 'chat', 'card'];

// ---------------------------------------------------------------------------
// WRITE: a video-ready starting fragment (folded in from the old screen-new.mjs, no make target of its
// own any more, called only from here when F does not exist yet). Theme tokens only, display-size
// type, a layout that fills most of the frame, real image slots marked so they cannot render unfilled.
// ---------------------------------------------------------------------------
const BODIES = {
  // an agent chat/editor: the typed prompt IS the product, so it is the one focal element, large,
  // vertically centred, with a quiet chrome dock below it (never a full toolbar mock, that is decoration).
  editor: () => `<div class="kit-root kit-ground-ink" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:flex;flex-direction:column;justify-content:center;gap:var(--kit-space-5)">
    <p class="kit-eyebrow" style="color:var(--dim)">PROMPT</p>
    <p class="kit-hook" style="max-width:88%">Make a 12 second launch film</p>
    <div class="kit-row" style="display:flex;align-items:center;gap:var(--kit-space-3);margin-top:var(--kit-space-4)">
      <div class="kit-chip" style="background:var(--accent);color:#fff">Render</div>
      <p class="kit-caption">draft &middot; 12s &middot; 16:9</p>
    </div>
  </div>
</div>`,
  // a product results grid: photos, not swatches. One tile leads, the rest follow, asymmetric per
  // AGENTS.md's "asymmetry and scale contrast are defaults". Kept WELL inside the margin: a grid that
  // touches the frame edge is exactly the clipping bug `make screen` now catches.
  grid: () => `<div class="kit-root" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:grid;grid-template-rows:auto 1fr;gap:var(--kit-space-4);padding:var(--kit-space-4) 0">
    <p class="kit-body">Your films</p>
    <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:var(--kit-space-3);min-height:0">
      <div class="kit-card" style="grid-row:span 2;overflow:hidden;position:relative"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:contain;display:block"></div>
      <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:contain;display:block"></div>
      <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:contain;display:block"></div>
      <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:contain;display:block"></div>
      <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:contain;display:block"></div>
    </div>
  </div>
</div>`,
  dashboard: () => `<div class="kit-root" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:grid;grid-template-columns:2fr 1fr;gap:var(--kit-space-4);padding:var(--kit-space-5) 0">
    <div class="kit-card" style="padding:var(--kit-space-5);display:flex;flex-direction:column;justify-content:center">
      <p class="kit-eyebrow">THIS WEEK</p>
      <p class="kit-stat">1,204</p>
      <p class="kit-body">renders shipped</p>
    </div>
    <div class="kit-panel" style="padding:var(--kit-space-4);display:flex;flex-direction:column;gap:var(--kit-space-3);justify-content:center">
      <p class="kit-caption">queue</p>
      <p class="kit-headline">6</p>
    </div>
  </div>
</div>`,
  chat: () => `<div class="kit-root kit-ground-ink" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:flex;flex-direction:column;justify-content:flex-end;gap:var(--kit-space-3);padding-bottom:var(--kit-space-5)">
    <div class="kit-card" style="align-self:flex-end;max-width:70%;padding:var(--kit-space-3) var(--kit-space-4)"><p class="kit-body" style="color:var(--text)">Ship it.</p></div>
    <div class="kit-panel" style="max-width:80%;padding:var(--kit-space-4)"><p class="kit-body">Done. Your film is rendering now.</p></div>
  </div>
</div>`,
  card: () => `<div class="kit-root" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:flex;align-items:center;justify-content:center">
    <div class="kit-card kit-elev-3" style="width:60%;aspect-ratio:4/5;overflow:hidden;position:relative">
      <img src="<fill: image path>" style="width:100%;height:100%;object-fit:contain;display:block">
    </div>
  </div>
</div>`,
};

/** writeStartingFragment(fragPath, kind, themeName, invent) -> true if written, false if it printed an
 * invent seed and stopped (nothing to render yet). Throws (with a message already printed) on a real
 * failure, so the caller can exit(1) without a second message. */
function writeStartingFragment(fragPath, kind, themeName, invent) {
  if (!KINDS.includes(kind)) throw new Error(`KIND must be one of ${KINDS.join('|')}, got "${kind}"`);
  let themeFile = path.join(ROOT, 'themes', `${themeName}.json`);
  if (!fs.existsSync(themeFile)) {
    if (!invent) throw new Error(`no theme "${themeName}", themes/${themeName}.json does not exist. Pass THEME=<real name>, or INVENT=1 to seed a new one.`);
    // Owner ruling (content-richness.plan.md, Update 1): a prompt with no brand and no reference means
    // INVENT a beautiful theme, through impeccable's own palette seed, never a default grey. palette.mjs
    // prints a seed colour + mood in prose, deliberately: composing the other five roles is a judgement
    // call against the brief, not a mechanical fill (its own header comment). So this prints the seed
    // and stops, rather than fabricating a full theme from a hue nobody chose.
    const name = path.basename(fragPath, path.extname(fragPath));
    const invented = path.join(ROOT, 'themes', `${name}-invented.json`);
    const r = spawnSync('node', [path.join(ROOT, 'skills/impeccable/scripts/palette.mjs'), '--from', name], { encoding: 'utf8' });
    if (r.status !== 0 || !r.stdout) throw new Error(`INVENT=1 palette seed failed: ${r.stderr || 'no output'}`);
    console.log(r.stdout);
    console.log(`screen: compose ${path.relative(ROOT, invented)} from the seed above, in the theme contract shape`
      + ` (validate: node core/registry/theme-contract.test.mjs), then re-run with THEME=${name}-invented.`);
    return false;
  }
  const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
  const { css, block } = buildKit(theme, resolveLook, isLightBg);
  const outCss = fragPath.replace(/\.html$/, '') + '.kit.css';
  fs.writeFileSync(outCss, css + '\n');
  fs.writeFileSync(fragPath, `${block}\n${BODIES[kind]()}\n`);
  console.log(`✓ wrote ${path.relative(ROOT, fragPath)} (${kind}, theme ${themeName})`);
  if (/<fill:/.test(BODIES[kind]())) console.log('  fill the <fill: image path> marker(s) with a real served path before this passes.');
  return true;
}

// ---------------------------------------------------------------------------
// VIDEO-READINESS (source-only): what a fragment's own markup can prove, without a render. Exported
// and pure so it is unit-testable on a string (quality/gates/screen-readiness.test.mjs).
// ---------------------------------------------------------------------------
export function readiness(source) {
  const kit = extractKitBlock(source);
  const own = kit ? source.replace(kit, '') : source;

  const roleSizes = {};
  const roleRe = /\.(kit-[a-z0-9-]+)\{[^}]*font:\s*\d+\s+(\d+)px/g;
  let m; while ((m = roleRe.exec(kit || source))) roleSizes[m[1]] = parseInt(m[2], 10);

  const sizes = [];
  const classRe = /class="([^"]*)"/g;
  while ((m = classRe.exec(own))) for (const c of m[1].split(/\s+/)) if (roleSizes[c] != null) sizes.push(roleSizes[c]);
  const inlineRe = /font-size:\s*(\d+)px/g;
  while ((m = inlineRe.exec(own))) sizes.push(parseInt(m[1], 10));
  const smallest = sizes.length ? Math.min(...sizes) : null;

  const elementCount = (own.match(/<[a-zA-Z][a-zA-Z0-9-]*(\s|>|\/)/g) || []).length;

  const tokenUses = (own.match(/var\(--[a-zA-Z0-9-]+/g) || []).length;
  const rawColorUses = (own.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;

  const imgs = [...own.matchAll(/<img[^>]*\ssrc="([^"]*)"/g)].map((x) => x[1]);
  const servedPrefixes = ['/assets/', '/.vawe-data/uploads/', '/core/', '/themes/', '/formats/'];
  const images = imgs.map((src) => {
    if (/^<fill:/i.test(src)) return { src, ok: false, why: 'unfilled placeholder marker' };
    if (!src.startsWith('/')) return { src, ok: false, why: 'relative path: resolves against the preview page\'s own base, not this fragment\'s, and paints nothing (the known trap)' };
    if (!servedPrefixes.some((p) => src.startsWith(p))) return { src, ok: false, why: `not under a served prefix (${servedPrefixes.join(', ')})` };
    return { src, ok: true };
  });

  return { smallest, elementCount, tokenUses, rawColorUses, images, hasRealImage: images.some((i) => i.ok) };
}

// The smallest text the browser actually laid out. The source parse above cannot see the cascade: a
// `font:` shorthand, or an inline size overriding a kit class, reads wrong there and right here.
export function smallestRendered(boxes) {
  const px = (boxes || []).map((b) => b.fontPx).filter((n) => Number.isFinite(n) && n > 0);
  return px.length ? Math.min(...px) : null;
}

// ---------------------------------------------------------------------------
// CLIPPING (rendered): a static parse cannot see a percentage width, a grid track, or an object-fit
// crop resolve; only the LAID-OUT page can. Every element's real bounding box, from
// preview-fragment.mjs's `--boxes-out`, against the 1920x1080 frame and the safe margin
// (core/layout/safe.js MARGIN, 0.06 of the short edge).
// ---------------------------------------------------------------------------
export function clipping(boxes, w = 1920, h = 1080) {
  const margin = Math.round(Math.min(w, h) * MARGIN);
  const safe = { x0: margin, y0: margin, x1: w - margin, y1: h - margin };
  const findings = [];
  for (const b of boxes) {
    const x1 = b.x + b.w, y1 = b.y + b.h;
    const offFrame = b.x < 0 || b.y < 0 || x1 > w || y1 > h;
    const offMargin = !offFrame && (b.x < safe.x0 || b.y < safe.y0 || x1 > safe.x1 || y1 > safe.y1);
    if (!offFrame && !offMargin) continue;
    const amounts = [
      b.x < 0 && `${Math.round(-b.x)}px past the left edge`,
      b.y < 0 && `${Math.round(-b.y)}px past the top edge`,
      x1 > w && `${Math.round(x1 - w)}px past the right edge`,
      y1 > h && `${Math.round(y1 - h)}px past the bottom edge`,
      offMargin && !offFrame && b.x < safe.x0 && `${Math.round(safe.x0 - b.x)}px into the left margin`,
      offMargin && !offFrame && b.y < safe.y0 && `${Math.round(safe.y0 - b.y)}px into the top margin`,
      offMargin && !offFrame && x1 > safe.x1 && `${Math.round(x1 - safe.x1)}px into the right margin`,
      offMargin && !offFrame && y1 > safe.y1 && `${Math.round(y1 - safe.y1)}px into the bottom margin`,
    ].filter(Boolean);
    findings.push({ tag: b.tag, text: String(b.text || '').slice(0, 60), severity: offFrame ? 'frame' : 'margin', amounts });
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const frag = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  if (!frag) {
    console.error('usage: node harness/author/screen.mjs <fragment.html> [--kind editor|grid|dashboard|chat|card] [--theme name] [--invent] [--ref name] [--act n] [--w 1920] [--h 1080]');
    process.exit(1);
  }
  const kind = flag('--kind', null);
  const theme = flag('--theme', 'default');
  const invent = argv.includes('--invent');
  const ref = flag('--ref', null);
  const act = flag('--act', null) ? parseInt(flag('--act'), 10) : null;
  const w = parseInt(flag('--w', '1920'), 10);
  const h = parseInt(flag('--h', '1080'), 10);

  const exists = fs.existsSync(frag);
  if (exists && kind) {
    console.error(`screen: ${frag} already exists. KIND writes a NEW starting fragment; it never overwrites an authored one. Drop --kind to just check it.`);
    process.exit(1);
  }
  if (!exists) {
    if (!kind) { console.error(`screen: ${frag} does not exist. Pass --kind <${KINDS.join('|')}> to write a starting fragment there.`); process.exit(1); }
    try { if (!writeStartingFragment(frag, kind, theme, invent)) return; /* --invent stopped at the seed, nothing to render yet */ }
    catch (e) { console.error(`screen: ${e.message}`); process.exit(1); }
  }

  console.log(`\n▶ make screen  ${path.relative(ROOT, frag)}  (theme ${theme})\n`);

  // (a) render standalone, at film size, through the EXISTING preview path. Never a second renderer:
  // `make preview`'s own script (harness/author/preview-fragment.mjs) already serves the repo, applies
  // the real theme, screenshots 1920x1080, and (with --boxes-out) dumps the laid-out element boxes the
  // clipping check below needs. `--no-detect` here because step (b) runs impeccable's own CLI detector
  // directly on the source; running the browser engine too would print the same family of finding twice.
  const png = `/tmp/screen-${path.basename(frag, path.extname(frag))}.png`;
  const boxesFile = `/tmp/screen-${path.basename(frag, path.extname(frag))}.boxes.json`;
  const raw = fs.readFileSync(frag, 'utf8');
  const kitBlock = extractKitBlock(raw);
  const ownMarkup = kitBlock ? raw.replace(kitBlock, '') : raw;

  let rendered = false, boxes = null;
  if (/<fill:\s*[^>]*>/i.test(ownMarkup)) {
    console.log('  ⚠ REFUSED to render: this fragment still carries an unfilled `<fill: ...>` image marker.');
    console.log('    A KIND=... starter marks its image slots so they cannot render as-is (a served path a');
    console.log('    check refuses, rather than a grey box nobody notices). Fill it with a real path, then re-run.\n');
  } else {
    if (h !== 1080) console.log(`  note: the reused preview path screenshots a fixed 1920x1080 canvas; H=${h} is not yet honoured (W=${w} sizes the centred box only).`);
    const pv = spawnSync('node', [path.join(ROOT, 'harness/author/preview-fragment.mjs'), frag,
      '--theme', theme, '--w', String(w), '--out', png, '--boxes-out', boxesFile, '--no-detect'], { encoding: 'utf8', cwd: ROOT });
    process.stdout.write(pv.stdout || '');
    if (pv.status !== 0) { console.error(pv.stderr || 'screen: preview render failed'); }
    else {
      rendered = fs.existsSync(png);
      if (fs.existsSync(boxesFile)) { try { boxes = JSON.parse(fs.readFileSync(boxesFile, 'utf8')); } catch { /* leave null, reported below */ } }
    }
  }

  // (b) impeccable's bundled detector, over the fragment's SOURCE. Its own CLI entry point
  // (skills/impeccable/scripts/detect.mjs), the static-HTML engine: no browser needed.
  console.log('\n· impeccable v3.5.0 (vendored third-party, Apache 2.0) ·');
  const det = spawnSync('node', [path.join(ROOT, 'skills/impeccable/scripts/detect.mjs'), '--json', frag], { encoding: 'utf8', cwd: ROOT });
  if (det.status !== 0 && !det.stdout) {
    console.log(`  ⚠ detector skipped: ${(det.stderr || 'unknown error').trim().slice(0, 300)}`);
  } else {
    let findings = [];
    try { findings = JSON.parse(det.stdout || '[]'); } catch { console.log(`  ⚠ detector output was not JSON: ${(det.stdout || '').slice(0, 200)}`); }
    if (!findings.length) console.log('  ✓ no anti-patterns detected.');
    else for (const f of findings) console.log(`  [${f.antipattern}] ${String(f.snippet || '').slice(0, 100)}\n    → ${f.description}`);
  }

  // (c) content measurement, harness/media/content.mjs's own contract: decode the PNG the same way
  // measureVideo decodes an mp4 frame, so a fragment and a reference read on the SAME instrument.
  function measurePng(file, W = 480, H = 270) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1',
      '-vf', `scale=${W}:${H}:flags=area`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], { maxBuffer: W * H * 3 + 1024 });
    if (r.status !== 0 || !r.stdout || r.stdout.length < W * H * 3) throw new Error(`could not decode ${file}: ${String(r.stderr || '').trim() || 'no frame'}`);
    return measureFrame(r.stdout, W, H);
  }

  let ours = null;
  if (rendered) {
    try { ours = measurePng(png); } catch (e) { console.log(`\n  ⚠ content measure failed: ${e.message}`); }
  }
  if (ours) {
    console.log(`\n· content (harness/media/content.mjs) ·`);
    console.log(`  colourfulness ${ours.colorfulness} (${ours.band})  fill ${ours.fill}  detail ${ours.detail}  photo ${ours.photo}`);
  }

  if (ours && ref && act) {
    const grammarFile = path.join(ROOT, 'grammar', `${ref}.json`);
    if (!fs.existsSync(grammarFile)) {
      console.log(`\n  ⚠ REF=${ref}: grammar/${ref}.json does not exist, skipping the comparison.`);
    } else {
      const g = JSON.parse(fs.readFileSync(grammarFile, 'utf8'));
      const shot = (g.shots || [])[act - 1];
      if (!shot) {
        console.log(`\n  ⚠ ACT=${act}: grammar/${ref}.json has ${(g.shots || []).length} shot(s), no act ${act}.`);
      } else {
        let refNums = shot.content || null;
        if (!refNums) {
          const clip = path.join(ROOT, 'refs/_clips', `${ref}.mp4`);
          if (!fs.existsSync(clip)) {
            console.log(`\n  ⚠ act ${act} has no recorded content{} and refs/_clips/${ref}.mp4 is not present locally, skipping.`);
          } else {
            const t0 = shot.t0, len = shot.len;
            const times = [0.15, 0.4, 0.6, 0.85].map((f) => +(t0 + f * len).toFixed(2));
            const samples = measureVideo(clip, times);
            const avg = (k) => +(samples.reduce((s, x) => s + x[k], 0) / samples.length).toFixed(2);
            refNums = { colorfulness: avg('colorfulness'), fill: avg('fill'), detail: avg('detail'), photo: avg('photo') };
          }
        }
        if (refNums) {
          console.log(`\n· vs ${ref} act ${act} (${shot.t0}s..${(shot.t0 + shot.len).toFixed(2)}s) ·`);
          for (const k of ['fill', 'detail', 'photo', 'colorfulness']) {
            const mine = ours[k], theirs = refNums[k];
            if (theirs == null) continue;
            const ratio = theirs > 0 ? mine / theirs : (mine > 0 ? Infinity : 1);
            const verdict = ratio >= 0.8 ? 'ok' : 'under';
            console.log(`  ${k.padEnd(12)} ours ${String(mine).padEnd(6)} ref ${String(theirs).padEnd(6)} ${verdict}${verdict === 'under' ? `  (${Math.round(ratio * 100)}% of reference)` : ''}`);
          }
        }
      }
    }
  } else if (ref && !act) {
    console.log(`\n  ⚠ REF=${ref} given with no ACT=<n>, skipping the comparison.`);
  }

  // (d) VIDEO-READINESS (source) + CLIPPING (rendered)
  const r = readiness(raw);
  console.log(`\n· video readiness ·`);
  const rs = boxes ? smallestRendered(boxes) : null;
  const smallest = rs ?? r.smallest;
  console.log(`  smallest text: ${smallest == null ? 'n/a (no sized text found)' : `${smallest}px${rs == null ? ' (read from source, not rendered)' : ''}` + (smallest < MIN_VIDEO_TEXT_PX ? `  ⚠ under ${MIN_VIDEO_TEXT_PX}px at 1920 wide: unreadable in a moving frame` : '  ok')}`);
  console.log(`  elements: ${r.elementCount}`);
  console.log(`  colour: ${r.tokenUses} theme-token use(s), ${r.rawColorUses} raw hex/colour use(s)${r.rawColorUses && !r.tokenUses ? '  ⚠ no theme tokens used' : ''}`);
  if (!r.images.length) console.log('  images: none');
  else for (const im of r.images) console.log(`  image: ${im.src.slice(0, 70)}  ${im.ok ? 'ok, served path' : `⚠ ${im.why}`}`);
  console.log(`  real image present: ${r.hasRealImage ? 'yes' : 'no'}`);

  console.log(`\n· clipped ·`);
  if (!boxes) {
    console.log('  n/a (no rendered box data; the fragment did not render)');
  } else {
    const findings = clipping(boxes, w, h);
    if (!findings.length) console.log('  none: every element sits inside the frame and its margin.');
    else for (const f of findings) console.log(`  [${f.severity === 'frame' ? 'OFF FRAME' : 'in margin'}] <${f.tag}> "${f.text}": ${f.amounts.join(', ')}`);
  }
  console.log('');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
