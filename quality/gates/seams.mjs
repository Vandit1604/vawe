// quality/gates/seams.mjs: every checked defect AT A JOIN, in one gate, because each one is a real,
// cited bug, never a fitted taste score. Three lineages merged here, each kept because a hand read of a
// real render found the exact thing it now checks for:
//
//   1. THE FLASH / THE EMPTY STAGE (was seam-snap.mjs). engine-doctrine/MISTAKES.md #144: the highest-
//      value render bugs live INSIDE a transition's overlap, a luminance DIP present at the seam but not
//      just outside it (a flash), and a colour-blind EMPTINESS drop, the stage's spread of grey collapsing
//      toward flat regardless of which way the brightness moved (a blank frame between two lit beats never
//      dips, it drains to flat, and the dip check alone missed it). Both read the RENDERED mp4, because a
//      seam is composited during the render (core/timeline/seams.js) and exists nowhere else.
//   2. THE GHOST / THE RESURRECTION / THE SPLIT SEAM (was seam-forensics.mjs): three defects a whole-frame
//      luminance average never touches, found by a hand frame-by-frame read of out/demo.mp4 (the same
//      exemplar #144 came from): an outgoing layer still visible, fading, past its own transition (a
//      GHOST); a layer redrawn at the canvas origin after it already ended (a RESURRECTION); a background
//      that steps instantly while the layers on top of it dissolve across the same window (a SPLIT SEAM).
//   3. THE DOUBLE EXPOSURE (was dissolve-check.mjs): engine-doctrine/MISTAKES.md #171, #174, this repo's
//      most-repeated defect, five instances across three films: two TEXT states crossfading through the
//      same point read as mush at the midpoint, legible before, legible after. This is the markup twin of
//      a ghost/resurrection: the same "something is visible when it should not be" family, just caught by
//      reading the html+CSS a layer authors rather than the pixels a render produces, so it needs no mp4
//      and runs even before the film has one.
//
// All six codes below are HARD: they fire on a real, specific, previously-shipped defect, never a fitted
// threshold tuned by feel, so none of them is gated behind TASTE=1. `crossfade-mud` is also in
// author-check.mjs's HARD_CODES, so it blocks a ship outright; the pixel codes (seam-flash, seam-empty,
// seam-ghost, seam-resurrection, seam-split) are enforced at `make ship`'s render-time seam-check step,
// which has always been unconditional (no TASTE flag ever gated it).
//
//   node quality/gates/seams.mjs films/scene/<file>.json     ·     make seam-check D=<file>
//
// The markup check (crossfade-mud) always runs; it needs only the scene JSON. The five pixel checks need
// a fresh render (out/<name>.mp4, not older than the scene) and are skipped, not failed, when there is
// none: `make check`/author-check run pre-render and must not report a false "no defect" for something
// that was never looked at, so the skip is printed, never silent. `make ship` always has a fresh render
// by the time it reaches this gate, so the skip path is a pre-render fact only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { flattenLayers, nearestBeats } from '../../harness/lib/layers.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { allBoundaries } from '../../core/timeline/junctions.js';
import { layerBoxes, sceneDims } from '../../harness/lib/layer-boxes.mjs';
import { gradeable } from './tile.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';
import {
  requireTool, probeFps, probeTotalFrames, gridStatsAt, gridStatsSweep, emptinessAt,
  edgeReadingAt, diffBoxes, meanColorAt, savePNG, median,
} from '../../harness/lib/frame-forensics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ═══ 1. DOUBLE EXPOSURE: two TEXT states crossfading through the same point (was dissolve-check.mjs) ══
//
// A crossfade is the reflex for "A becomes B". For TEXT it is the wrong move: two strings at half
// opacity on top of each other are not a transition, they are a double exposure, and the midpoint of
// every one of them is illegible. WHAT IT MEASURES: for every pair of absolutely-positioned elements
// that sit at the SAME point inside one html layer and drive their opacity from the SAME variable, it
// evaluates both opacity expressions across that variable's whole range and asks how much of it both are
// visible for. THE FIX IT WILL NOT FLAG, deliberately: a WIPE, one box, two strings, clipped from
// opposite sides by the same variable. An element under a `clip-path` is exempt. It reads markup, not
// pixels, so it cannot see a dissolve authored between two separate LAYERS, and it says nothing about a
// pair whose opacities move the SAME way (a group fade, not one state replacing another).
// No craft literature on dissolve-legibility thresholds exists (these grade OUR OWN compositor's
// crossfade output): engine-doctrine/RESEARCH/TIMING-SOURCES.md part 4/6.
const VISIBLE = 0.15;   // opacity at which a glyph is legible enough to muddy the one behind it
const MUDDY = 0.12;     // share of the driving variable's range both may share before it reads as mush
const STEPS = 101;

// A restricted CSS arithmetic evaluator. Only clamp/calc/var/numbers/operators survive; anything that
// does not reduce to bare arithmetic is skipped rather than guessed at.
function evalCss(expr, vars) {
  let s = String(expr).trim();
  for (let i = 0; i < 12 && /var\(/.test(s); i++) {
    s = s.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*?))?\s*\)/g, (m, name, dflt) => {
      if (Object.prototype.hasOwnProperty.call(vars, name)) return `(${vars[name]})`;
      return dflt != null && dflt !== '' ? `(${dflt})` : '(0)';
    });
  }
  for (let i = 0; i < 16 && /clamp\(/.test(s); i++) {
    const call = findCall(s, 'clamp');
    if (!call) return null;
    const parts = splitTop(call.inner);
    if (parts.length !== 3) return null;
    const [lo, val, hi] = parts.map((p) => evalCss(p, vars));
    if (lo == null || val == null || hi == null) return null;
    s = s.slice(0, call.start) + `(${Math.min(Math.max(val, lo), hi)})` + s.slice(call.end + 1);
  }
  s = s.replace(/calc\(/g, '(').replace(/px|deg|em|%/g, '');
  if (!/^[\d\s+\-*/().e]+$/i.test(s)) return null;
  try { const v = Function(`"use strict";return (${s})`)(); return Number.isFinite(v) ? v : null; }
  catch { return null; }
}
function findCall(s, name) {
  let last = -1;
  for (let i = 0; (i = s.indexOf(`${name}(`, i)) >= 0; i++) last = i;
  if (last < 0) return null;
  let depth = 0, j = last + name.length;
  for (; j < s.length && depth >= 0; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')') depth--;
    if (depth === 0) break;
  }
  return depth === 0 ? { start: last, end: j, inner: s.slice(last + name.length + 1, j) } : null;
}
function splitTop(str) {
  const out = []; let depth = 0, cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur); return out;
}
const declCss = (style, prop) => {
  const m = String(style).match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : null;
};

// Every absolutely-positioned, unclipped element in `html` that drives its opacity from a CSS var.
function dissolveCandidates(html) {
  const els = [];
  const stack = [];
  const tagRe = /<(\/?)(div|span)\b([^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    if (m[1] === '/') { stack.pop(); continue; }
    const attrs = m[3] || '';
    const style = (attrs.match(/style\s*=\s*"([^"]*)"/i) || [])[1] || '';
    const clipped = stack.some((sc) => sc.clip) || !!declCss(style, 'clip-path');
    els.push({ style, clipped });
    if (!/\/\s*$/.test(attrs)) stack.push({ clip: clipped });
  }
  return els.filter((e) => !e.clipped && declCss(e.style, 'opacity') && /var\(\s*--/.test(declCss(e.style, 'opacity'))
    && /position\s*:\s*absolute/i.test(e.style));
}
function pointKey(e) { return ['left', 'top', 'right', 'bottom'].map((p) => `${p}=${declCss(e.style, p) || ''}`).join('|'); }
function groupByPoint(cands) {
  const groups = new Map();
  for (const e of cands) { const key = pointKey(e); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); }
  return groups;
}
function allPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
  return out;
}

// One pair -> a finding, 'unreadable', or null (not a crossfade, or not muddy enough).
function checkDissolvePair(a, b, key) {
  const oa = declCss(a.style, 'opacity'), ob = declCss(b.style, 'opacity');
  const vars = [...new Set([...`${oa} ${ob}`.matchAll(/var\(\s*(--[\w-]+)/g)].map((x) => x[1]))];
  if (vars.length !== 1) return null; // driven by different clocks
  const v = vars[0];
  let both = 0;
  for (let step = 0; step < STEPS; step++) {
    const p = step / (STEPS - 1);
    const va = evalCss(oa, { [v]: p }), vb = evalCss(ob, { [v]: p });
    if (va == null || vb == null) return { unreadable: true, oa: oa.slice(0, 48), ob: ob.slice(0, 48) };
    if (Math.min(va, vb) >= VISIBLE) both++;
  }
  // A CROSSFADE NEEDS ONE RISING AND ONE FALLING; two elements fading the same way are a group fade.
  const dirA = (evalCss(oa, { [v]: 1 }) ?? 0) - (evalCss(oa, { [v]: 0 }) ?? 0);
  const dirB = (evalCss(ob, { [v]: 1 }) ?? 0) - (evalCss(ob, { [v]: 0 }) ?? 0);
  if (dirA * dirB >= 0) return null;
  const share = both / STEPS;
  if (share < MUDDY) return null;
  const blur = /filter\s*:\s*blur/i.test(a.style) || /filter\s*:\s*blur/i.test(b.style);
  return { v, share, blur, key, oa: oa.slice(0, 60), ob: ob.slice(0, 60) };
}

function scanLayerForDissolve(L) {
  const findings = [], unreadable = [];
  const groups = groupByPoint(dissolveCandidates(L.html));
  for (const [key, group] of groups) for (const [a, b] of allPairs(group)) {
    const r = checkDissolvePair(a, b, key);
    if (!r) continue;
    if (r.unreadable) unreadable.push(r); else findings.push({ layer: L.id || L.type, ...r });
  }
  return { findings, unreadable };
}

function checkDissolve(raw, f) {
  const s = (n) => `${Math.round(n * 100)}%`;
  console.log(`\n  seams · 1/2 double exposure (markup)`);
  if (raw.module !== 'scene') { console.log(`  not a scene module, nothing to check here.`); return; }
  const allow = new Set((raw.authoring && Array.isArray(raw.authoring.allow)) ? raw.authoring.allow : []);
  const walkLayers = [];
  const walk = (L) => { if (!L || typeof L !== 'object') return; walkLayers.push(L); (L.children || []).forEach(walk); };
  (Array.isArray(raw.layers) ? raw.layers : []).forEach(walk);

  const findings = [], unreadable = [];
  let htmlLayers = 0;
  for (const L of walkLayers) {
    if (typeof L.html !== 'string') continue;
    htmlLayers++;
    const r = scanLayerForDissolve(L);
    findings.push(...r.findings);
    unreadable.push(...r.unreadable.map((u) => ({ ...u, layer: L.id || L.type })));
  }

  console.log(`  ${htmlLayers} html layer(s), same-point opacity pair(s) measured`
    + `${unreadable.length ? ` · ${unreadable.length} NOT measured (see below)` : ''}`);
  for (const d of findings) {
    const waived = allow.has('crossfade-mud');
    f.fail('crossfade-mud', `layer "${d.layer}": two elements at the same point (${d.key.replace(/\|/g, ' ')}) `
      + `cross-dissolve on ${d.v}, and BOTH stay above ${VISIBLE} opacity for ${s(d.share)} of its range`
      + `${d.blur ? ', with a blur on top of it' : ''}.`,
      { at: `layer ${d.layer}`, waived,
        fix: `Use a WIPE instead: one box, both strings, clip-path insets from opposite sides driven by ${d.v}, with a read head at the seam.` });
    console.log(`  ${waived ? '○' : '✗'} [crossfade-mud] "${d.oa}"  vs  "${d.ob}"`);
  }
  for (const u of unreadable) {
    console.log(`  ⚠ layer "${u.layer}": a same-point opacity pair this gate could NOT evaluate, so it is unjudged, not cleared.`);
    console.log(`      "${u.oa}"  vs  "${u.ob}"   (extend evalCss in quality/gates/seams.mjs if this shape should be measurable)`);
  }
  if (!findings.length && !unreadable.length) console.log('  ✓ no transition dissolves one text state into another in place.');
  else if (!findings.length) console.log('  ✓ nothing measurable dissolves, but see the unjudged pair(s) above.');
}

// ═══ 2. THE PIXEL CHECKS: flash, empty stage, ghost, resurrection, split seam ═══════════════════════
//
// All five need the RENDERED mp4: a seam is composited during the render (core/timeline/seams.js), so
// none of this exists in the source JSON. Skipped, never failed, when there is no fresh render.

function measureEmptySec(ctx, nt, triggerFrame) {
  const { mp4, fps, total, W, H } = ctx;
  const CAP = fps * 2;
  const settledEdge = edgeReadingAt(mp4, Math.min(total - 1, nt + 6), { x: 0, y: 0, w: W, h: H }, W, H) ?? 0;
  const floor = Math.max(15, settledEdge * 0.5);
  for (let k = 0; k <= CAP; k++) {
    const e = edgeReadingAt(mp4, Math.min(total - 1, triggerFrame + k), { x: 0, y: 0, w: W, h: H }, W, H);
    if (e != null && e >= floor) return k / fps;
  }
  return CAP / fps;
}

// per-boundary flash (luma dip) + emptiness read, at every declared/inferred boundary.
function scanBoundary(ctx, nt) {
  const { mp4, fps, total, lumaAt, beatsAround } = ctx;
  const before = lumaAt(Math.max(0, nt - 6));
  const after = lumaAt(Math.min(total - 1, nt + 6));
  const win = [];
  for (let d = -2; d <= 2; d++) { const fr = nt + d; const l = lumaAt(fr); if (l != null) win.push({ f: fr, l }); }
  if (before == null || after == null || win.length < 5) return { unread: true };
  const outside = Math.min(before, after);
  const dip = win.reduce((mn, w) => (w.l < mn.l ? w : mn), win[0]);
  const { out, inn } = beatsAround(nt / fps);
  const out1 = (outside > 0.06 && dip.l < outside * 0.55)
    ? { t: (nt / fps).toFixed(2), frame: dip.f, dip: dip.l.toFixed(3), outside: outside.toFixed(3),
        emptySec: measureEmptySec(ctx, nt, dip.f).toFixed(2), out, inn }
    : null;
  const empty = emptinessAt(mp4, fps, total, nt);
  const out2 = empty ? { t: (nt / fps).toFixed(2), ...empty, emptySec: empty.emptySec.toFixed(2), out, inn } : null;
  return { flash: out1, empty: out2 };
}

// coarse whole-film sweep for an empty stage away from any declared boundary (binary-search onset).
function sweepForEmptyStage(ctx, covered) {
  const { mp4, fps, total, beatsAround } = ctx;
  const SWEEP_STRIDE = Math.max(2, Math.round(fps * 0.15));
  const isCovered = (n) => covered.some(([lo, hi]) => n >= lo && n <= hi);
  const coarse = gridStatsSweep(mp4, SWEEP_STRIDE);
  const found = [];
  let lastClean = 6, ci = 0;
  while (ci < coarse.length) {
    const sweepNt = coarse[ci].frame;
    const g = coarse[ci];
    const skip = sweepNt <= 6 || sweepNt >= total - 6 || g.spread > 0.06 || isCovered(sweepNt);
    if (skip) { lastClean = sweepNt; ci++; continue; }
    const onset = findOnset(mp4, lastClean, sweepNt);
    const empty = emptinessAt(mp4, fps, total, onset);
    if (empty && !isCovered(empty.frame)) {
      const { out, inn } = beatsAround(empty.frame / fps);
      found.push({ t: (empty.frame / fps).toFixed(2), ...empty, emptySec: empty.emptySec.toFixed(2), out, inn });
      covered.push([empty.frame - fps, empty.frame + Math.round(empty.emptySec * fps) + fps]);
      const resume = empty.frame + Math.round(empty.emptySec * fps) + SWEEP_STRIDE;
      while (ci < coarse.length && coarse[ci].frame < resume) ci++;
    } else ci++;
    lastClean = ci < coarse.length ? coarse[ci].frame : total;
  }
  return found;
}
// binary search [lo,hi] for the frame the spread statistic actually crosses its flat-floor at.
function findOnset(mp4, lo, hi) {
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const gm = gridStatsAt(mp4, mid);
    if (gm != null && gm.spread > 0.06) lo = mid; else hi = mid;
  }
  return hi + 2;
}

function buildSeamSheet(mp4, fps, sheetFrames, slug) {
  const SHEET = `/tmp/seams/${slug}.png`;
  const tmp = `/tmp/seams/${slug}.frames`; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const tiles = [];
  for (const nt of sheetFrames) {
    const rawTile = path.join(tmp, `s${nt}.png`);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${nt}),scale=300:-1`, '-frames:v', '1', rawTile]);
    if (!fs.existsSync(rawTile)) continue;
    const lab = path.join(tmp, `s${nt}_l.png`);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', rawTile, '-vf',
      `drawtext=text='seam ${(nt / fps).toFixed(1)}s':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65`, lab]);
    tiles.push(lab);
  }
  if (tiles.length) {
    spawnSync('ffmpeg', ['-v', 'error', '-y', ...tiles.flatMap((t) => ['-i', t]),
      '-filter_complex', `hstack=inputs=${tiles.length}`, '-frames:v', '1', SHEET]);
  }
  return SHEET;
}

function checkFlashAndEmpty(base) {
  const { data, mp4, fps, total, W, H, slug, f } = base;
  const flat = flattenLayers(data.layers);
  const beatsAround = (tSec) => nearestBeats(flat, tSec);
  const lumaCache = new Map();
  const lumaAt = (frameIdx) => {
    if (!lumaCache.has(frameIdx)) lumaCache.set(frameIdx, gridStatsAt(mp4, frameIdx)?.luma ?? null);
    return lumaCache.get(frameIdx);
  };
  const ctx = { mp4, fps, total, W, H, lumaAt, beatsAround };
  const seamFrames = allBoundaries(data, flat).map((t) => Math.round(t * fps)).filter((n) => n > 2 && n < total - 2);

  const flashFindings = [], emptyFindings = [], sheetFrames = [], unread = [];
  for (const nt of seamFrames) {
    sheetFrames.push(nt);
    const r = scanBoundary(ctx, nt);
    if (r.unread) { unread.push(nt); continue; }
    if (r.flash) flashFindings.push(r.flash);
    if (r.empty) emptyFindings.push(r.empty);
  }
  const covered = [];
  for (const sm of flashFindings) covered.push([sm.frame - fps, sm.frame + Math.round(Number(sm.emptySec) * fps) + fps]);
  for (const sm of emptyFindings) covered.push([sm.frame - fps, sm.frame + Math.round(Number(sm.emptySec) * fps) + fps]);
  const sweepFindings = sweepForEmptyStage(ctx, covered);
  for (const sw of sweepFindings) sheetFrames.push(sw.frame);

  const SHEET = buildSeamSheet(mp4, fps, sheetFrames, slug);
  console.log(`  ${seamFrames.length - unread.length} of ${seamFrames.length} transition boundary(ies) read · sheet → ${SHEET}`);
  for (const nt of unread) {
    console.error(`  ? boundary at ${(nt / fps).toFixed(2)}s (frame ${nt}) would not decode, NOT checked.`);
    f.warn('seam-unread', `boundary at ${(nt / fps).toFixed(2)}s (frame ${nt}) would not decode, NOT checked`, { at: `frame ${nt}` });
  }
  const flashFix = (seam) => Number(seam.emptySec) > 0
    ? `overlap "${seam.out}"'s exit with "${seam.inn}"'s entrance so the stage never empties (TRANSITIONS.md: no transition-dip)`
    : 'fix the seam compositing or the clip timing, then re-render';
  for (const seam of flashFindings) {
    console.error(`  ✗ seam "${seam.out}" → "${seam.inn}" at ${seam.t}s: luma dips to ${seam.dip} vs ${seam.outside} just outside, empty ${seam.emptySec}s before content reads. ${flashFix(seam)}.`);
    f.fail('seam-flash', `seam "${seam.out}" -> "${seam.inn}" at ${seam.t}s: luma dips to ${seam.dip} vs ${seam.outside} just outside, empty ${seam.emptySec}s before content reads. ${flashFix(seam)}`,
      { at: `frame ${seam.frame}`, doc: 'engine-doctrine/MISTAKES.md#144' });
  }
  const emptyFix = (seam) => `overlap "${seam.out}"'s exit with "${seam.inn}"'s entrance so the stage never empties (TRANSITIONS.md: no transition-dip)`;
  for (const seam of emptyFindings) {
    console.error(`  ✗ seam "${seam.out}" → "${seam.inn}" at ${seam.t}s: spread drops to ${seam.spread} vs ${seam.outsideSpread} just outside (32x18 grid, colour-blind), empty ${seam.emptySec}s before content reads. ${emptyFix(seam)}.`);
    f.fail('seam-empty', `seam "${seam.out}" -> "${seam.inn}" at ${seam.t}s: spread drops to ${seam.spread} vs ${seam.outsideSpread} just outside (32x18 grid, colour-blind), empty ${seam.emptySec}s before content reads. ${emptyFix(seam)}`,
      { at: `frame ${seam.frame}`, doc: 'engine-doctrine/MISTAKES.md#144' });
  }
  for (const seam of sweepFindings) {
    console.error(`  ✗ empty stage at ${seam.t}s (no declared boundary nearby): "${seam.out}" -> "${seam.inn}", spread drops to ${seam.spread} vs ${seam.outsideSpread} (32x18 grid, colour-blind), empty ${seam.emptySec}s before content reads. ${emptyFix(seam)}.`);
    f.fail('seam-empty', `empty stage at ${seam.t}s with no declared boundary nearby: "${seam.out}" -> "${seam.inn}", spread drops to ${seam.spread} vs ${seam.outsideSpread} (32x18 grid, colour-blind), empty ${seam.emptySec}s before content reads`,
      { at: `${seam.t}s (frame ${seam.frame})`, fix: emptyFix(seam), doc: 'engine-doctrine/MISTAKES.md#144' });
  }

  // seam-blank: an ABSOLUTE near-uniform run near a declared boundary, not a dip relative to the
  // frames around it. seam-empty/seam-flash above both compare the boundary to an "outside" reference
  // walked out from it, so two visually flat beats back to back (a near-blank white hold ending on a
  // cut into another plain scene) never trip them: "outside" reads just as flat as the boundary itself,
  // and a dip or drop relative to something already near zero is not a dip. This warns on the RAW
  // spread instead, whatever sits either side of it, over the same transition window (Netflix/BBC
  // guidance treats under ~1s of near-blank content at a cut as invisible; the two films this closes
  // both ran nearer 1s). Warn, waivable (authoring.allow: "seam-blank"): a still card or a deliberate
  // hold IS sometimes the beat.
  const ABS_BLANK = 0.03;
  const BLANK_RUN_MIN = Math.max(2, Math.round(fps * 0.1));
  const seamAllow = new Set(Array.isArray(data.authoring?.allow) ? data.authoring.allow : []);
  const blankCovered = [...covered];
  for (const nt of seamFrames) {
    const found = longestBlankRun(mp4, nt, fps, total, ABS_BLANK);
    if (!found || found.run < BLANK_RUN_MIN) continue;
    if (blankCovered.some(([lo, hi]) => found.start >= lo && found.start <= hi)) continue;
    blankCovered.push([found.start - fps, found.start + found.run + fps]);
    const waived = seamAllow.has('seam-blank');
    const durSec = (found.run / fps).toFixed(2);
    const atSec = (found.start / fps).toFixed(2);
    console.error(`  ${waived ? '○' : '~'} seam-blank at ${atSec}s (boundary ${(nt / fps).toFixed(2)}s): ${durSec}s near-uniform (spread ${found.spread}/255), unrelated to what is either side of it.`);
    f.warn('seam-blank', `${durSec}s near-uniform hold at ${atSec}s, around the boundary at ${(nt / fps).toFixed(2)}s (spread ${found.spread}/255, colour-blind, absolute not relative)`,
      { at: `frame ${found.start}`, waived, fix: 'overlap the outgoing and incoming content so the stage is never this flat for this long, or hold on purpose and waive it', doc: 'engine-doctrine/MISTAKES.md#144' });
  }
}

// The single longest contiguous run, within ±1s of `nt`, of frames whose colour-blind spread stays
// under `floor`. Shares gridStatsAt's own arithmetic (32x18 gray, max-min) so "near-uniform" never
// drifts from what seam-empty already calls "empty" one floor up.
function longestBlankRun(mp4, nt, fps, total, floor) {
  const WIN = fps;
  let bestRun = 0, bestStart = null, bestSpread = 1;
  let run = 0, runStart = null, runWorst = 1;
  const flush = () => { if (run > bestRun) { bestRun = run; bestStart = runStart; bestSpread = runWorst; } run = 0; runWorst = 1; };
  for (let d = -WIN; d <= WIN; d++) {
    const f = Math.max(0, Math.min(total - 1, nt + d));
    const sp = gridStatsAt(mp4, f)?.spread;
    if (sp != null && sp < floor) { if (!run) runStart = f; run++; if (sp < runWorst) runWorst = sp; }
    else flush();
  }
  flush();
  return bestRun ? { run: bestRun, start: bestStart, spread: Math.round(bestSpread * 255) } : null;
}

function collectBoundaries(data) {
  const boundaries = [];
  for (const c of data.cuts || []) if (typeof c.t === 'number') boundaries.push({ t: c.t, dur: typeof c.dur === 'number' ? c.dur : 0.5, mech: 'cut', style: c.style });
  for (const sm of data.seams || []) if (typeof sm.t === 'number') boundaries.push({ t: sm.t, dur: typeof sm.dur === 'number' ? sm.dur : 0.5, mech: 'seam' });
  for (const sm of data.stings || []) if (typeof sm.t === 'number') boundaries.push({ t: sm.t, dur: typeof sm.dur === 'number' ? sm.dur : 0.5, mech: 'sting' });
  return boundaries.sort((a, b) => a.t - b.t);
}
function overlapFraction(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const areaA = a.w * a.h;
  return areaA > 0 ? (ix * iy) / areaA : 0;
}
const boxesOverlap = (a, b) => !b.box || Math.max(overlapFraction(a, b.box), overlapFraction(b.box, a)) > 0.4;

// GHOST: an outgoing layer still visible, fading, past its own transition.
function checkGhost(ctx) {
  const { boundaries, layers, mp4, total, fps, W, H, snap, f } = ctx;
  const GHOST_FLOOR = 4, GHOST_RATIO = 1.3;
  for (const b of boundaries) checkGhostAtBoundary(b);
  function checkGhostAtBoundary(b) {
    const jointFrame = Math.round(b.t * fps);
    const durFrames = Math.round(b.dur * fps);
    const f1 = jointFrame + durFrames + 1;
    const f2 = jointFrame + durFrames + 10;
    const fSettled = Math.min(total - 2, jointFrame + durFrames + 40);
    if (f2 >= fSettled) return;
    const t1 = f1 / fps;
    const arrivingOver = (l) => layers.some((o) => o.i !== l.i && o.start != null
      && o.start <= t1 && t1 <= o.start + 0.6 && (o.end == null || t1 <= o.end) && boxesOverlap(l.box, o));
    const outgoing = layers.filter((l) => l.box && l.end != null && l.end >= b.t - b.dur - 0.5 && l.end <= b.t + b.dur + 0.05);
    for (const l of outgoing) {
      if (arrivingOver(l)) continue;
      const d1 = diffBoxes(mp4, f1, fSettled, l.box, W, H);
      const d2 = diffBoxes(mp4, f2, fSettled, l.box, W, H);
      if (d1 == null || d2 == null) { f.warn('seam-unread', `ghost check at boundary ${b.t}s, layer "${l.label}": a frame would not decode`); continue; }
      if (d1 >= GHOST_FLOOR && d1 >= d2 * GHOST_RATIO) {
        const p1 = snap(f1, `ghost-${b.t}s-${l.i}`);
        f.fail('seam-ghost',
          `ghost at ${b.t}s: "${l.label}" still visible and fading ${(f1 - jointFrame - durFrames)}f past its own transition (Δ${d1.toFixed(1)} at +1f vs Δ${d2.toFixed(1)} at +10f, both against the settled frame)`,
          { at: `frame ${f1}`, fix: p1, doc: 'engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-ghost' });
      }
    }
  }
}

// RESURRECTION: a layer redrawn after its own authored end.
function checkResurrection(ctx) {
  const { boundaries, layers, mp4, W, H, fps, snap, f } = ctx;
  const RES_FLOOR = 4;
  for (const l of layers) checkLayerResurrection(l);
  function checkLayerResurrection(l) {
    if (l.start == null || l.end == null) return;
    const laterBoundaries = boundaries.filter((b) => b.t > l.end + Math.max(0.3, b.dur));
    if (!laterBoundaries.length) return;
    const boxesToCheck = [];
    if (l.box) boxesToCheck.push({ tag: 'box', box: l.box });
    if (l.type === 'cursor') {
      const side = Math.round(Math.min(W, H) * 0.05);
      boxesToCheck.push({ tag: 'origin', box: { x: 0, y: 0, w: side, h: side } });
    }
    if (!boxesToCheck.length) return;
    const b = laterBoundaries[0];
    const baselineFrame = Math.max(0, Math.round(l.start * fps) - 2);
    const probeFrame = Math.round(b.t * fps) - 1;
    const activeGroup = layers.some((o) => o.type === 'group' && o.i !== l.i && o.start != null
      && o.start <= b.t && (o.end == null || b.t <= o.end + 0.6));
    const reoccupied = activeGroup || layers.some((o) => o.i !== l.i && o.start != null
      && o.start <= b.t && (o.end == null || b.t <= o.end + 0.6) && boxesOverlap(l.box, o));
    for (const { tag, box } of boxesToCheck) {
      if (tag === 'box' && reoccupied) continue;
      probeBox(l, tag, box, baselineFrame, probeFrame, b);
    }
  }
  function probeBox(l, tag, box, baselineFrame, probeFrame, b) {
    const e0 = edgeReadingAt(mp4, baselineFrame, box, W, H);
    const e1 = edgeReadingAt(mp4, probeFrame, box, W, H);
    if (e0 == null || e1 == null) { f.warn('seam-unread', `resurrection check for "${l.label}" (${tag}): a frame would not decode`); return; }
    if (Math.abs(e1 - e0) < RES_FLOOR) return;
    const p1 = snap(probeFrame, `resurrection-${l.i}-${tag}`);
    f.fail('seam-resurrection',
      `resurrection: "${l.label}" ended at ${l.end.toFixed(2)}s but its ${tag === 'origin' ? 'origin corner' : 'authored box'} reads differently at ${b.t.toFixed(2)}s (edge reading ${e1} vs ${e0} clean, before it ever drew)`,
      { at: `frame ${probeFrame}`, fix: p1, doc: 'engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-resurrection' });
  }
}

// SPLIT SEAM: the field steps while the layers on top of it dissolve.
function checkSplitSeam(ctx) {
  const { boundaries, mp4, fps, total, W, H, snap, f, layers } = ctx;
  // Read off a real defect, not guessed: engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-tuning
  const SPLIT_FLOOR = 2;
  const stripH = Math.max(20, Math.round(H * 0.037));
  const fieldBox = { x: 0, y: H - stripH, w: W, h: stripH };
  const SOFT_STYLES = new Set(['fade', 'blur', 'softwipe', 'softiris', 'dissolve', 'riseBlur', 'matchCut']);
  for (const b of boundaries) {
    if (b.mech !== 'cut' || (b.style && !SOFT_STYLES.has(b.style))) continue;
    checkSplitAtBoundary(b);
  }
  function sampleField(startFrame, endFrame) {
    const colors = [];
    for (let fr = startFrame; fr <= endFrame; fr++) { const c = meanColorAt(mp4, fr, fieldBox, W, H); if (c) colors.push({ fr, c }); }
    return colors;
  }
  function checkSplitAtBoundary(b) {
    const half = b.dur / 2;
    const startFrame = Math.max(0, Math.round((b.t - half) * fps));
    const endFrame = Math.min(total - 1, Math.round((b.t + half) * fps));
    if (endFrame - startFrame < 3) return;
    const colors = sampleField(startFrame, endFrame);
    if (colors.length < 4) { f.warn('seam-unread', `split-seam check at boundary ${b.t}s: too few frames decoded`); return; }
    const steps = [];
    for (let i = 1; i < colors.length; i++) {
      const [pr, pg, pb] = colors[i - 1].c, [cr, cg, cb] = colors[i].c;
      steps.push((Math.abs(cr - pr) + Math.abs(cg - pg) + Math.abs(cb - pb)) / 3 * 255);
    }
    const med = median(steps);
    const maxStep = Math.max(...steps);
    if (maxStep <= Math.max(3 * med, SPLIT_FLOOR)) return;
    const idx = steps.indexOf(maxStep);
    const stepFrame = colors[idx + 1].fr;
    const adapted = adaptFinding({ kind: 'seam-split', fieldBox }, { layers }).adapted;
    if (adapted) { console.log(`  ~ ${adapted.line}`); return; }
    const p1 = snap(stepFrame, `split-${b.t}s`);
    f.fail('seam-split',
      `split seam at ${b.t}s: the field jumps ${maxStep.toFixed(1)} at frame ${stepFrame} (median step ${med.toFixed(1)} across the ${b.dur}s window) while the transition is still dissolving the layers on top of it`,
      { at: `frame ${stepFrame}`, fix: p1, doc: 'engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-split-seam' });
  }
}

function checkForensics(base) {
  const { data, mp4, fps, total, W, H, slug, f } = base;
  const boundaries = collectBoundaries(data);
  if (!boundaries.length) { console.log('  ~ ghost/resurrection/split-seam: no declared transition boundaries to sample (nothing to check)'); return; }
  const layers = layerBoxes(data);
  const SHEET_DIR = `/tmp/seam-forensics/${slug}`;
  fs.rmSync(SHEET_DIR, { recursive: true, force: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  const snap = (frameIdx, tag) => { const dest = path.join(SHEET_DIR, `${tag}_f${frameIdx}.png`); savePNG(mp4, frameIdx, dest); return dest; };
  const before = f.count;
  const ctx = { boundaries, layers, mp4, fps, total, W, H, snap, f };
  checkGhost(ctx);
  checkResurrection(ctx);
  checkSplitSeam(ctx);
  const found = f.records.slice(before).filter((r) => r.severity === 'error').length;
  console.log(found
    ? `  ✗ ${found} ghost/resurrection/split-seam defect(s). Frames written under ${SHEET_DIR}.`
    : `  ✓ clean across ${boundaries.length} boundary(ies): no ghost, resurrection or split seam (sheet dir: ${SHEET_DIR})`);
}

function runPixelChecks(dataArg, f) {
  console.log(`\n  seams · 2/2 pixel checks (flash · empty · ghost · resurrection · split seam)`);
  const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`);
  const ready = gradeable(dataArg, mp4);
  if (!ready.ok) { console.log(`  ~ skipped: ${ready.why}. ${ready.fix}`); return; }

  requireTool('ffprobe');
  requireTool('ffmpeg');
  const fps = probeFps(mp4);
  const total = probeTotalFrames(mp4);
  if (!fps) { console.error(`✗ seams: ffprobe read no frame rate out of ${mp4}.`); f.emit(); process.exit(2); }
  if (!total) { console.error(`✗ seams: ffprobe could not count the frames in ${mp4}.`); f.emit(); process.exit(2); }

  const data = loadScene(structuredClone(JSON.parse(fs.readFileSync(dataArg, 'utf8'))));
  const [W, H] = sceneDims(data, data.aspect);
  const slug = path.basename(dataArg, '.json');
  const base = { data, mp4, fps, total, W, H, slug, f };
  checkFlashAndEmpty(base);
  checkForensics(base);
}

// ═══ entry ════════════════════════════════════════════════════════════════════════════════════════
const dataArg = process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node quality/gates/seams.mjs <scene.json>'); process.exit(2); }
let raw;
try { raw = JSON.parse(fs.readFileSync(dataArg, 'utf8')); } catch (e) { console.error(`✗ ${dataArg} is not valid JSON: ${e.message}`); process.exit(1); }

const f = gateFindings({ scene: dataArg });
checkDissolve(raw, f);
runPixelChecks(dataArg, f);

const errors = f.records.filter((r) => r.severity === 'error' && !r.waived).length;
console.log(`\n════════ seams · ${path.basename(dataArg)} ════════`);
if (!errors) console.log(`  ✓ clean: no double exposure, flash, empty stage, ghost, resurrection or split seam found.`);
else console.log(`  ✗ ${errors} defect(s) at a join. Fix them, or waive crossfade-mud with a reason: {"authoring":{"allow":["crossfade-mud"],"_why":{"crossfade-mud":"…"}}}`);
f.emit();
process.exit(errors ? 1 : 0);
