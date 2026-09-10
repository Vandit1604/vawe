// screen.mjs: `make screen F=<fragment.html> [THEME=<name>] [REF=<ref> ACT=<n>] [W=1920 H=1080]`
//
// The design route for a PRODUCT SCREEN in a film (docs/CRAFT/SCREENS.md, owner ruling in
// .claude/plans/content-richness.plan.md Update 1: "use a ui design harness to build beautiful mocks,
// not plain by default"). Renders the fragment standalone at film size, runs impeccable's bundled
// anti-slop detector over it, measures the rendered PNG the same way `harness/media/content.mjs`
// measures a reference (fill / detail / photo / colourfulness), and prints a VIDEO-READINESS list the
// fragment's own source can prove. Report-only: exit 0 always, nothing here blocks a render.
//
//   node harness/author/screen.mjs formats/scene/vawe-flow-editor.html --theme vawe --ref example-madera --act 1
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractKitBlock } from '../lib/stagekit.mjs';
import { measureFrame, measureVideo } from '../media/content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const frag = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!frag || !fs.existsSync(frag)) {
  console.error('usage: node harness/author/screen.mjs <fragment.html> [--theme name] [--ref name] [--act n] [--w 1920] [--h 1080]');
  process.exit(1);
}
const theme = flag('--theme', 'default');
const ref = flag('--ref', null);
const act = flag('--act', null) ? parseInt(flag('--act'), 10) : null;
const w = parseInt(flag('--w', '1920'), 10);
const h = parseInt(flag('--h', '1080'), 10);

console.log(`\n▶ make screen  ${path.relative(ROOT, frag)}  (theme ${theme})\n`);

// ---------------------------------------------------------------------------
// (a) render standalone, at film size, through the EXISTING preview path. Never a second renderer:
// `make preview`'s own script (harness/author/preview-fragment.mjs) already serves the repo, applies
// the real theme and screenshots 1920x1080. `--no-detect` here because step (b) below runs impeccable's
// CLI detector directly on the source (its static-HTML engine), which needs no browser and is what the
// task asks for; running the browser engine too would just print the same family of finding twice.
// ---------------------------------------------------------------------------
const png = `/tmp/screen-${path.basename(frag, path.extname(frag))}.png`;
const raw = fs.readFileSync(frag, 'utf8');
const kitBlock = extractKitBlock(raw);
const ownMarkup = kitBlock ? raw.replace(kitBlock, '') : raw;

let rendered = false;
if (/<fill:\s*[^>]*>/i.test(ownMarkup)) {
  console.log('  ⚠ REFUSED to render: this fragment still carries an unfilled `<fill: ...>` image marker.');
  console.log('    A screen-new.mjs starter marks its image slots so they cannot render as-is (a served');
  console.log('    path a check refuses, rather than a grey box nobody notices). Fill it with a real path,');
  console.log('    then re-run.\n');
} else {
  if (h !== 1080) console.log(`  note: the reused preview path screenshots a fixed 1920x1080 canvas; H=${h} is not yet honoured (W=${w} sizes the centred box only).`);
  const pv = spawnSync('node', [path.join(ROOT, 'harness/author/preview-fragment.mjs'), frag,
    '--theme', theme, '--w', String(w), '--out', png, '--no-detect'], { encoding: 'utf8', cwd: ROOT });
  process.stdout.write(pv.stdout || '');
  if (pv.status !== 0) { console.error(pv.stderr || 'screen: preview render failed'); }
  else rendered = fs.existsSync(png);
}

// ---------------------------------------------------------------------------
// (b) impeccable's bundled detector, over the fragment's SOURCE. Its own CLI entry point
// (skills/impeccable/scripts/detect.mjs), the static-HTML engine: no browser needed, catches what
// `make preview`'s browser engine also catches for a rendered page, run here on the file directly.
// ---------------------------------------------------------------------------
console.log('\n— impeccable v3.5.0 (vendored third-party, Apache 2.0) —');
const det = spawnSync('node', [path.join(ROOT, 'skills/impeccable/scripts/detect.mjs'), '--json', frag], { encoding: 'utf8', cwd: ROOT });
if (det.status !== 0 && !det.stdout) {
  console.log(`  ⚠ detector skipped: ${(det.stderr || 'unknown error').trim().slice(0, 300)}`);
} else {
  let findings = [];
  try { findings = JSON.parse(det.stdout || '[]'); } catch { console.log(`  ⚠ detector output was not JSON: ${(det.stdout || '').slice(0, 200)}`); }
  if (!findings.length) console.log('  ✓ no anti-patterns detected.');
  else for (const f of findings) console.log(`  [${f.antipattern}] ${String(f.snippet || '').slice(0, 100)}\n    → ${f.description}`);
}

// ---------------------------------------------------------------------------
// (c) content measurement, harness/media/content.mjs's own contract: decode the PNG the same way
// measureVideo decodes an mp4 frame, so a fragment and a reference read on the SAME instrument.
// ---------------------------------------------------------------------------
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
  console.log(`\n— content (harness/media/content.mjs) —`);
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
        console.log(`\n— vs ${ref} act ${act} (${shot.t0}s..${(shot.t0 + shot.len).toFixed(2)}s) —`);
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

// ---------------------------------------------------------------------------
// (d) VIDEO-READINESS: what the fragment's own source can prove, without a render.
// ---------------------------------------------------------------------------
export function readiness(source) {
  const kit = extractKitBlock(source);
  const own = kit ? source.replace(kit, '') : source;

  // role -> px, read off the KIT's own ramp (the block this fragment pasted, or the fallback vawe
  // ramp if the file carries no kit yet), so a role's size is never guessed twice.
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

const r = readiness(raw);
console.log(`\n— video readiness —`);
console.log(`  smallest text: ${r.smallest == null ? 'n/a (no sized text found)' : `${r.smallest}px` + (r.smallest < 28 ? '  ⚠ under 28px at 1920 wide: unreadable in a moving frame' : '  ok')}`);
console.log(`  elements: ${r.elementCount}`);
console.log(`  colour: ${r.tokenUses} theme-token use(s), ${r.rawColorUses} raw hex/colour use(s)${r.rawColorUses && !r.tokenUses ? '  ⚠ no theme tokens used' : ''}`);
if (!r.images.length) console.log('  images: none');
else for (const im of r.images) console.log(`  image: ${im.src.slice(0, 70)}  ${im.ok ? 'ok, served path' : `⚠ ${im.why}`}`);
console.log(`  real image present: ${r.hasRealImage ? 'yes' : 'no'}`);
console.log('');
