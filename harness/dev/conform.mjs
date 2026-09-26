// harness/dev/conform.mjs: BRIEF CONFORMANCE, not craft. Reads the film's brief/storyboard for
// CHECKABLE claims (exact copy, a weight ramp in a window, a stroke drawing on, an exit direction, a
// caption that must clear a mark, a hold ceiling) and answers each from engine data via
// harness/dev/probe-frame.mjs, never from a judge's eye. A real test film's misses were almost all
// this shape: wrong copy, a ramp that never ran, an exit that faded instead of moving, a caption sitting
// on the mark it was supposed to clear. Structured judges (make judge) already cover everything a
// number cannot answer; this is what runs BEFORE them, per engine-doctrine/JUDGE.md.
//
// Usage: node harness/dev/conform.mjs D=<film.json> [--brief "<claim lines>"]
//
// Claims source, in order: <film>.storyboard.md if it declares beats, else <film>.brief.md beside the
// film, else --brief text. One claim per line, `#`-prefixed lines and blanks ignored. A line matching
// none of the five patterns below is not un-checkable noise, it is a claim this tool cannot yet answer:
// it is kept, verbatim, as JUDGE-ONLY, for the structured judges to weigh instead.
//
//   copy: <id> = "<exact text>"                    the rendered text at <id>'s mid-life is this, verbatim
//   weight: <id> <from>->  <to> in <t0>-<t1>        <id>'s font weight ramps from -> to across that window
//   draw: <id> full by <t>                          <id>'s svg stroke is fully drawn on by t
//   exit: <id> up by <t>                             <id>'s box has risen (moved up) by t, its exit's own end
//   overlap: <id1> !x <id2>                          <id1> and <id2> must never share screen space
//   hold: max <seconds>                              no single layer holds one dead frame longer than this
//
// claims.json (this run's full record) is written under CLAUDE_JOB_DIR/tmp (harness/lib/scratch.mjs)
// and its path is printed; the fixed text block above it is what to paste into a review, same shape as
// harness/dev/verify.mjs's block.
import fs from 'node:fs';
import path from 'node:path';
import { probeMany } from './probe-frame.mjs';
import { scratch } from '../lib/scratch.mjs';
import { storyboardPathFor } from '../../quality/gates/craft-checklist.mjs';
import { parseStoryboard } from '../author/storyboard-parse.mjs';

function readArg(key) {
  const pref = `${key}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : process.env[key];
}

function readFlag(name) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

function briefPathFor(filmPath) {
  const dir = path.dirname(filmPath);
  const base = path.basename(filmPath).replace(/\.json$/, '');
  return path.join(dir, `${base}.brief.md`);
}

// The claims source: a storyboard with declared beats first (the plan a film is judged against), then
// a sibling brief.md, then --brief text handed on the command line. Whichever wins, its raw text is
// what every regex below runs over; a storyboard's `onscreen:`/`mechanism:` prose is free text too, so
// it is treated exactly like a hand-written brief line.
function claimsText(filmPath, briefArg) {
  const sbPath = storyboardPathFor(filmPath);
  if (fs.existsSync(sbPath)) {
    const text = fs.readFileSync(sbPath, 'utf8');
    let hasBeats = false;
    try { hasBeats = parseStoryboard(text).beats.length > 0; } catch { /* falls through */ }
    if (hasBeats) return { text, source: sbPath };
  }
  const briefPath = briefPathFor(filmPath);
  if (fs.existsSync(briefPath)) return { text: fs.readFileSync(briefPath, 'utf8'), source: briefPath };
  if (briefArg) return { text: briefArg, source: '--brief argument' };
  return { text: '', source: null };
}

const PATTERNS = [
  { kind: 'copy', re: /^copy:\s*(\S+)\s*=\s*(['"])([\s\S]*)\2\s*$/ },
  { kind: 'weight', re: /^weight:\s*(\S+)\s+(\d+)\s*->\s*(\d+)\s+in\s+([\d.]+)-([\d.]+)\s*$/ },
  { kind: 'draw', re: /^draw:\s*(\S+)\s+full by\s+([\d.]+)\s*$/ },
  { kind: 'exit', re: /^exit:\s*(\S+)\s+up by\s+([\d.]+)\s*$/ },
  { kind: 'overlap', re: /^overlap:\s*(\S+)\s+!x\s+(\S+)\s*$/ },
  { kind: 'hold', re: /^hold:\s*max\s+([\d.]+)\s*$/ },
];

function extractClaims(text) {
  const claims = [];
  const leftover = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^[-*]\s*/, '').trim();
    if (!line || line.startsWith('#')) continue;
    let matched = false;
    for (const { kind, re } of PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      matched = true;
      if (kind === 'copy') claims.push({ kind, line, id: m[1], text: m[3] });
      else if (kind === 'weight') claims.push({ kind, line, id: m[1], from: Number(m[2]), to: Number(m[3]), t0: Number(m[4]), t1: Number(m[5]) });
      else if (kind === 'draw') claims.push({ kind, line, id: m[1], t: Number(m[2]) });
      else if (kind === 'exit') claims.push({ kind, line, id: m[1], t: Number(m[2]) });
      else if (kind === 'overlap') claims.push({ kind, line, a: m[1], b: m[2] });
      else if (kind === 'hold') claims.push({ kind, line, maxHold: Number(m[1]) });
      break;
    }
    if (!matched) leftover.push(line);
  }
  return { claims, leftover };
}

function findLayer(id, layers) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.id === id) return L;
    const found = findLayer(id, L.children);
    if (found) return found;
  }
  return null;
}

const EPS = 1e-6;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Every timestamp any claim needs to look at, so probeMany boots ONE page for the whole film rather
// than one per claim. `hold` needs a dense scan across the whole duration; every other claim needs at
// most two or three points, each named by the claim itself.
function planSamples(claims, scene, dur) {
  const at = new Map(); // t (rounded) -> Set(id)
  const need = (t, id) => {
    const key = Math.round(t * 1000) / 1000;
    if (!at.has(key)) at.set(key, new Set());
    at.get(key).add(id);
  };
  const allIds = [];
  (function walk(layers) {
    for (const L of layers || []) { if (L?.id) allIds.push(L.id); walk(L.children); }
  })(scene.layers);

  for (const c of claims) {
    if (c.kind === 'copy') {
      const L = findLayer(c.id, scene.layers);
      const start = L?.start ?? 0, duration = L?.duration ?? 1;
      need(Math.min(dur - EPS, start + duration / 2), c.id);
    } else if (c.kind === 'weight') {
      const n = 5;
      for (let i = 0; i < n; i++) need(c.t0 + (c.t1 - c.t0) * (i / (n - 1)), c.id);
    } else if (c.kind === 'draw') {
      need(Math.min(dur - EPS, c.t), c.id);
    } else if (c.kind === 'exit') {
      const L = findLayer(c.id, scene.layers);
      const exitDur = L?.exitDur ?? 0.3;
      need(Math.max(0, c.t - exitDur), c.id);
      need(Math.min(dur - EPS, c.t), c.id);
    } else if (c.kind === 'overlap') {
      const A = findLayer(c.a, scene.layers), B = findLayer(c.b, scene.layers);
      if (A && B) {
        const lo = Math.max(A.start ?? 0, B.start ?? 0);
        const hiA = (A.start ?? 0) + (A.duration ?? dur), hiB = (B.start ?? 0) + (B.duration ?? dur);
        const hi = Math.min(hiA, hiB);
        if (hi > lo) { const t = Math.min(dur - EPS, (lo + hi) / 2); need(t, c.a); need(t, c.b); }
      }
    } else if (c.kind === 'hold') {
      const step = 0.2;
      for (let t = 0; t < dur; t += step) for (const id of allIds) need(Math.min(dur - EPS, t), id);
    }
  }
  return [...at.entries()].map(([t, ids]) => ({ t, ids: [...ids] })).sort((a, b) => a.t - b.t);
}

function boxOf(row) {
  const d = row?.dom;
  return d ? { x: d.rect.x, y: d.rect.y, w: d.rect.width, h: d.rect.height, opacity: d.effectiveOpacity } : null;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function sampleAt(index, t, id) {
  const key = Math.round(t * 1000) / 1000;
  const r = index.get(key);
  return r?.samples?.[id] ?? null;
}

function judgeCopy(c, index, scene, dur) {
  const L = findLayer(c.id, scene.layers);
  const start = L?.start ?? 0, duration = L?.duration ?? 1;
  const t = Math.min(dur - EPS, start + duration / 2);
  const row = sampleAt(index, t, c.id);
  const got = row?.dom?.textContent ?? null;
  const pass = got === c.text;
  return { ...c, pass, t, expected: c.text, measured: got };
}

function judgeWeight(c, index) {
  const n = 5;
  const points = [];
  for (let i = 0; i < n; i++) {
    const t = c.t0 + (c.t1 - c.t0) * (i / (n - 1));
    const row = sampleAt(index, t, c.id);
    points.push({ t, weight: row?.dom?.fontWeight ?? null });
  }
  const seen = points.map((p) => p.weight).filter((w) => w != null);
  const lo = seen.length ? Math.min(...seen) : null, hi = seen.length ? Math.max(...seen) : null;
  const span = Math.abs(c.to - c.from);
  const pass = seen.length > 1 && (hi - lo) >= 0.5 * span;
  return { ...c, pass, points, measuredRange: seen.length ? [lo, hi] : null };
}

function judgeDraw(c, index, dur) {
  const t = Math.min(dur - EPS, c.t);
  const row = sampleAt(index, t, c.id);
  const ratio = row?.dom?.drawRatio;
  const pass = ratio != null && ratio >= 0.95;
  return { ...c, pass, t, measured: ratio ?? null };
}

function judgeExit(c, index, scene, dur) {
  const L = findLayer(c.id, scene.layers);
  const exitDur = L?.exitDur ?? 0.3;
  const t0 = Math.max(0, c.t - exitDur), t1 = Math.min(dur - EPS, c.t);
  const row0 = sampleAt(index, t0, c.id), row1 = sampleAt(index, t1, c.id);
  const b0 = boxOf(row0), b1 = boxOf(row1);
  const rose = b0 && b1 ? b0.y - b1.y : null; // positive: the box moved up (smaller y)
  const wasVisible = b0 ? b0.opacity > 0.05 : false;
  const pass = wasVisible && rose != null && rose >= 8;
  return { ...c, pass, t0, t1, measured: rose, wasVisible };
}

function judgeOverlap(c, index, scene, dur) {
  const A = findLayer(c.a, scene.layers), B = findLayer(c.b, scene.layers);
  if (!A || !B) return { ...c, pass: null, note: 'one or both ids not found in the scene' };
  const lo = Math.max(A.start ?? 0, B.start ?? 0);
  const hiA = (A.start ?? 0) + (A.duration ?? dur), hiB = (B.start ?? 0) + (B.duration ?? dur);
  const hi = Math.min(hiA, hiB);
  if (hi <= lo) return { ...c, pass: true, note: 'windows never coincide' };
  const t = Math.min(dur - EPS, (lo + hi) / 2);
  const rowA = sampleAt(index, t, c.a), rowB = sampleAt(index, t, c.b);
  const bA = boxOf(rowA), bB = boxOf(rowB);
  const bothVisible = bA && bB && bA.opacity > 0.05 && bB.opacity > 0.05;
  const overlaps = bothVisible && rectsOverlap(bA, bB);
  return { ...c, pass: !overlaps, t, measured: overlaps, boxA: bA, boxB: bB };
}

function judgeHold(c, index, scene, dur) {
  const step = 0.2;
  const ids = [];
  (function walk(layers) { for (const L of layers || []) { if (L?.id) ids.push(L.id); walk(L.children); } })(scene.layers);
  let worst = { id: null, run: 0, at: 0 };
  for (const id of ids) {
    let run = 0, runStart = 0, prev = null;
    for (let t = 0; t < dur; t += step) {
      const tt = Math.min(dur - EPS, t);
      const row = sampleAt(index, tt, id);
      const b = boxOf(row);
      const stamp = b && b.opacity > 0.05 ? `${b.x.toFixed(1)},${b.y.toFixed(1)},${b.w.toFixed(1)},${b.h.toFixed(1)},${b.opacity.toFixed(3)}` : null;
      if (stamp && stamp === prev) run += step;
      else { if (run > worst.run) worst = { id, run, at: runStart }; run = 0; runStart = tt; }
      prev = stamp;
    }
    if (run > worst.run) worst = { id, run, at: runStart };
  }
  const pass = worst.run <= c.maxHold + EPS;
  return { ...c, pass, worstId: worst.id, worstRun: worst.run, worstAt: worst.at };
}

export async function conform(filmArg, briefArg) {
  const filmPath = path.resolve(filmArg);
  if (!fs.existsSync(filmPath)) throw new Error(`no such film: ${filmArg}`);
  const scene = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const dur = typeof scene.duration === 'number' ? scene.duration : 5;

  const { text, source } = claimsText(filmPath, briefArg);
  const { claims, leftover } = extractClaims(text);

  const lines = [`=== CONFORM: ${path.basename(filmPath)} ===`];
  lines.push(`claims source: ${source || '(none: no storyboard beats, no .brief.md, no --brief given)'}`);
  lines.push(`${claims.length} checkable claim(s), ${leftover.length} judge-only leftover(s)`);

  let results = [];
  if (claims.length) {
    const requests = planSamples(claims, scene, dur);
    const reports = await probeMany(filmPath, requests);
    const index = new Map(reports.map((r) => [Math.round(r.viewerT * 1000) / 1000, r]));

    results = claims.map((c) => {
      if (c.kind === 'copy') return judgeCopy(c, index, scene, dur);
      if (c.kind === 'weight') return judgeWeight(c, index);
      if (c.kind === 'draw') return judgeDraw(c, index, dur);
      if (c.kind === 'exit') return judgeExit(c, index, scene, dur);
      if (c.kind === 'overlap') return judgeOverlap(c, index, scene, dur);
      if (c.kind === 'hold') return judgeHold(c, index, scene, dur);
      return { ...c, pass: null, note: 'unhandled claim kind' };
    });

    for (const r of results) {
      const mark = r.pass === true ? 'PASS' : r.pass === false ? 'FAIL' : '  ? ';
      if (r.kind === 'copy') lines.push(`[${mark}] copy ${r.id} @${r.t.toFixed(2)}s: expected "${r.expected}", got ${r.measured === null ? '(no text)' : `"${r.measured}"`}`);
      else if (r.kind === 'weight') lines.push(`[${mark}] weight ${r.id} in ${r.t0}-${r.t1}s: wanted ${r.from}->${r.to}, measured range ${r.measuredRange ? r.measuredRange.map((v) => v.toFixed(0)).join('-') : 'n/a'}`);
      else if (r.kind === 'draw') lines.push(`[${mark}] draw ${r.id} by ${r.t.toFixed(2)}s: measured ${r.measured == null ? 'n/a (no stroke path found)' : `${(r.measured * 100).toFixed(0)}% drawn`}`);
      else if (r.kind === 'exit') lines.push(`[${mark}] exit ${r.id} up by ${r.t.toFixed(2)}s: rose ${r.measured == null ? 'n/a' : `${r.measured.toFixed(1)}px`} from ${r.t0.toFixed(2)}s to ${r.t1.toFixed(2)}s${r.wasVisible ? '' : ' (not visible at window start)'}`);
      else if (r.kind === 'overlap') lines.push(`[${mark}] overlap ${r.a} !x ${r.b}: ${r.note || `${r.measured ? 'DO overlap' : 'clear'} @${r.t.toFixed(2)}s`}`);
      else if (r.kind === 'hold') lines.push(`[${mark}] hold max ${r.maxHold}s: longest static run ${r.worstRun.toFixed(1)}s on "${r.worstId}" starting @${r.worstAt.toFixed(2)}s`);
    }
  }

  if (leftover.length) {
    lines.push('-- JUDGE-ONLY (not measurable from engine data, for the structured judges) --');
    for (const l of leftover) lines.push(`  · ${l}`);
  }

  const failed = results.filter((r) => r.pass === false);
  lines.push(`${failed.length ? failed.length : 'no'} claim(s) FAILED`, '=== END CONFORM ===');

  const claimsJson = { film: path.relative(process.cwd(), filmPath), source, claims: results, leftover };
  const outPath = scratch('conform', `${path.basename(filmPath, '.json')}.claims.json`);
  fs.writeFileSync(outPath, JSON.stringify(claimsJson, null, 2));

  return { text: lines.join('\n'), ok: failed.length === 0, results, leftover, claimsJsonPath: outPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const D = readArg('D') || process.argv.slice(2).find((a) => !a.includes('=') && !a.startsWith('--'));
  const brief = readFlag('--brief');
  if (!D) {
    console.error('usage: node harness/dev/conform.mjs D=<film.json> [--brief "<claim lines>"]');
    process.exit(2);
  }
  let result;
  try { result = await conform(D, brief); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
  console.log(`\n${result.text}\n`);
  console.log(`claims.json: ${result.claimsJsonPath}`);
  process.exit(result.ok ? 0 : 1);
}
