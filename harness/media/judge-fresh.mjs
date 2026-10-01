#!/usr/bin/env node
// A fresh, default-reject taste judge an authoring agent can call itself: it prepares the evidence
// deterministically, then asks a separate headless Claude session (Read tool only) to score it.
//   node harness/media/judge-fresh.mjs <page.html | film.mp4 | sheet.png> [--brief brief.md] [--stage stills|draft|final]
// Advises, never blocks: exit 0 with a verdict either way. Exit 2 when the claude CLI is missing.
// Writes out/<name>.judge.json with the fix ledger (harness/lib/judge-ledger.mjs), or out/<name>.stills.json for stills.
// Env: VAWE_TASTE_CARD (overrides the taste card the judge reads, default engine-doctrine/TASTE-CARD.md), VAWE_JUDGE_TIMEOUT (seconds, default 240).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch } from '../lib/scratch.mjs';
import { isTemplateBrief } from '../lib/draft-check.mjs';
import { parseDirections, rangeProblems, attractorProblems } from '../lib/directions.mjs';
import { sheetFps, TILE_W } from '../lib/sheet-tiles.mjs';
import { previousItems, openItems, ledgerPrompt, mergeLedger, ledgerLines } from '../lib/judge-ledger.mjs';
import { adviceBlock } from '../lib/advice.mjs';
import { reportLines } from '../lib/judge-report.mjs';
import { sizeLines, capLines, anchorLines, anchorResult } from '../lib/judge-prompt.mjs';
import { referenceFor } from '../lib/motion-stamp.mjs';
import { parseBriefTables } from '../lib/brief-tables.mjs';
import { settledMoments } from '../lib/key-frames.mjs';
import { probeSize } from './scene-stats.mjs';
import { lastCaps } from './acceptance-run.mjs';
import { freshRubric, FRESH_AXES } from '../../quality/gates/rubric.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const SHEET_COLS = 10;
const KEY_FRAMES = 6;
const PASS_AT = 8;
const TASTE_CARD = path.join(repoRoot, 'engine-doctrine', 'TASTE-CARD.md');
const FONT = ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf'].find(fs.existsSync);

const die = (m, code = 1) => { console.error(`vawe judge --fresh: ${m}`); process.exit(code); };
const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const ff = (args, opts = {}) => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: opts.raw ? 'buffer' : 'utf8', maxBuffer: 1 << 28 });

function durationOf(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  if (!(d > 0)) die(`cannot read the duration of ${file}`);
  return d;
}

const hasAudio = (file) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim() !== '';

function filmName(input) {
  const base = path.basename(input).replace(/\.[^.]+$/, '');
  return base === 'page' || base === 'directions' ? path.basename(path.dirname(path.resolve(input))) : base.replace(/-draft$/, '');
}

async function screenshotPage(page, out) {
  const { openPage, settle, resolveFrame } = await import('./render-page.mjs');
  const opened = await openPage(page, resolveFrame(page, { final: true }));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    await settle(opened.page);
    await opened.page.screenshot({ path: out });
  } finally { await opened.close(); }
}

async function draftOf(page, name) {
  const video = path.resolve('out', `${name}-draft.mp4`);
  if (fs.existsSync(video) && fs.statSync(video).mtimeMs >= fs.statSync(page).mtimeMs) return video;
  fs.mkdirSync(path.dirname(video), { recursive: true });
  const { renderPage } = await import('./render-page.mjs');
  await renderPage(page, video, {});
  return video;
}

function contactSheet(video, dur, dir) {
  const fps = sheetFps(dur);
  const rows = Math.ceil(dur * fps / SHEET_COLS);
  const label = `drawtext=${FONT ? `fontfile=${FONT}:` : ''}text='%{pts\\:flt}s':x=4:y=4:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7`;
  const out = path.join(dir, 'sheet.png');
  const r = ff(['-i', video, '-vf', `fps=${fps},scale=${TILE_W}:-2,${label},tile=${SHEET_COLS}x${rows}`, '-frames:v', '1', out]);
  if (r.status !== 0 || !fs.existsSync(out)) die(`could not build the sheet: ${String(r.stderr).split('\n').slice(-4).join(' ')}`);
  return { file: out, fps };
}

/** The mean absolute difference between 10 fps thumbnails: [{ t, d }], d the change that arrives at second t. */
function thumbMotion(video) {
  const W = 64, H = 36, FPS = 10, size = W * H;
  const buf = ff(['-i', video, '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { raw: true }).stdout;
  const n = Math.floor(buf.length / size);
  const motion = [];
  for (let i = 1; i < n; i++) {
    let sum = 0;
    for (let p = 0; p < size; p++) sum += Math.abs(buf[i * size + p] - buf[(i - 1) * size + p]);
    motion.push({ t: i / FPS, d: sum / size });
  }
  return motion;
}

function keyFrames(video, dur, dir, tables) {
  const times = settledMoments({ words: tables.words, shots: tables.shots, motion: thumbMotion(video), dur, count: KEY_FRAMES });
  return times.map((t, i) => {
    const file = path.join(dir, `key-${i + 1}-${t.toFixed(1)}s.png`);
    ff(['-ss', String(t), '-i', video, '-frames:v', '1', file]);
    return { t, file };
  }).filter((k) => fs.existsSync(k.file));
}

function loudness(file) {
  const r = ff(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const tail = String(r.stderr).split('Summary:').pop();
  const get = (re) => (tail.match(re) || [])[1];
  const I = get(/I:\s+(-?[\d.]+)\s+LUFS/), LRA = get(/LRA:\s+([\d.]+)\s+LU/), peak = get(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/);
  return I ? `loudness: ${I} LUFS integrated, ${LRA} LU range, true peak ${peak} dBFS` : 'loudness: not measured';
}

function anchorOf(input, brief) {
  const dir = path.extname(input).toLowerCase() === '.html' ? path.dirname(path.resolve(input)) : brief ? path.dirname(path.resolve(brief)) : null;
  const ref = dir && referenceFor(path.join(dir, 'page.html'));
  if (ref && fs.existsSync(path.resolve(ref))) return { kind: 'reference', ref: path.resolve(ref) };
  return { kind: brief ? 'brief' : 'none' };
}

function anchorFrames(ref, keys, dir) {
  const last = Math.max(0, durationOf(ref) - 0.05);
  return keys.map((k, i) => {
    const file = path.join(dir, `anchor-${i + 1}-${k.t.toFixed(1)}s.png`);
    ff(['-ss', String(Math.min(k.t, last)), '-i', ref, '-frames:v', '1', file]);
    return { t: k.t, file };
  }).filter((a) => fs.existsSync(a.file));
}

async function prepare(input, stage, brief) {
  const name = filmName(input);
  const dir = scratch('judge-fresh', name);
  const ext = path.extname(input).toLowerCase();
  if (stage === 'stills') {
    let image = path.resolve(input);
    if (ext === '.html') { image = path.join(dir, 'stills.png'); await screenshotPage(path.resolve(input), image); }
    return { name, stage, files: [image], notes: [`stills: ${image}`] };
  }
  let video = path.resolve(input);
  if (ext === '.html') {
    if (stage === 'final') {
      video = path.resolve('out', `${name}.mp4`);
      if (!fs.existsSync(video)) die(`no final render at ${video}; run: bin/vawe ship ${input}`);
    } else video = await draftOf(path.resolve(input), name);
  }
  const dur = durationOf(video);
  const sheet = contactSheet(video, dur, dir);
  const keys = keyFrames(video, dur, dir, parseBriefTables(brief ? fs.readFileSync(brief, 'utf8') : null));
  const sound = stage === 'final' && hasAudio(video) ? loudness(video) : null;
  const anchor = anchorOf(input, brief);
  const anchorShots = anchor.kind === 'reference' ? anchorFrames(anchor.ref, keys, dir) : [];
  const sizeOf = (label, file, tile) => ({ label, ...probeSize(file), ...(tile ? { tile } : {}) });
  const images = [sizeOf('the sheet', sheet.file, TILE_W), ...keys.map((k, i) => sizeOf(`key frame ${i + 1}`, k.file)), ...anchorShots.map((a, i) => sizeOf(`anchor frame ${i + 1}`, a.file))];
  const notes = [
    `video: ${video} (${dur.toFixed(2)} s)`,
    `sheet: ${sheet.file}  (one frame every ${(1 / sheet.fps).toFixed(2)} s, read left to right and top to bottom, each tile is labelled with its time in seconds)`,
    ...keys.map((k, i) => `key frame ${i + 1} at ${k.t.toFixed(1)} s (a settled moment: nothing mid-transition): ${k.file}`),
    ...anchorShots.map((a, i) => `anchor frame ${i + 1} (the reference at ${a.t.toFixed(1)} s, the anchor for key frame ${i + 1}): ${a.file}`),
    sound || (stage === 'final' ? 'sound: the file has no audio track' : 'sound: not scored at this stage'),
  ];
  return { name, stage, files: [sheet.file, ...keys.map((k) => k.file), ...anchorShots.map((a) => a.file)], notes, dir, keys, images, anchor, caps: lastCaps(name) };
}

const STILLS_TASK = `The image shows three directions side by side: A on the left, B in the middle, C on the right, each a key frame with a caption.
Score each direction 1 to 10 for how well its one frame would carry the film the brief asks for, and how far it is from a template.
Name the strongest with one reason. Then score the axes below for the strongest direction only.`;

const STILLS_JSON = `
Add three more keys to that object: "directions":[{"id":"A","score":n,"note":"one short line"},{"id":"B",...},{"id":"C",...}], "strongest":"A, B or C", "reason":"one sentence".`;

function checkBlock(ev) {
  if (ev.stage === 'stills') return '';
  const parts = [sizeLines(ev.images || []), capLines(ev.caps), ev.keys?.length ? anchorLines(ev.anchor, ev.keys) : []].filter((p) => p.length);
  return parts.map((p) => `${p.join('\n')}\n\n`).join('');
}

function buildPrompt(ev, brief, ledger = '') {
  const optional = [
    brief && `The brief (Read it): ${path.resolve(brief)}`,
    `Taste card: 15 rules and 5 anti-patterns (Read this file once, and no other file or image beside it): ${path.resolve(process.env.VAWE_TASTE_CARD || TASTE_CARD)}. Score the axes below with these rules in mind, and name the rule number in each fix. Where the brief asks for something a card rule treats as a default to avoid (glow, gradients, rich colour, several hues), the brief wins: do not mark it down.`,
  ].filter(Boolean);
  const kind = ev.stage === 'stills' ? 'three still directions for a film' : `a ${ev.stage} cut of a film`;
  return `You are a fresh taste judge. You did not make this work and you own no part of it. You judge ${kind} from the evidence files below.
Use only the Read tool: open the image files and look at them before you score. Do not guess from file names.
${ev.stage === 'stills' ? STILLS_TASK : 'Open the sheet first, then every key frame at full size. The sheet is a grid of separate frames; confirm any defect you see on it (an echo, a repeat, a small copy of the frame) on a full-size key frame before you name it.'}

Evidence:
${ev.notes.map((n) => `- ${n}`).join('\n')}
${optional.length ? `\n${optional.map((o) => `- ${o}`).join('\n')}\n` : ''}
${checkBlock(ev)}${freshRubric({ stage: ev.stage })}${ev.stage === 'stills' ? STILLS_JSON : ''}${ledger ? `\n\n${ledger}` : ''}`;
}

function extractJson(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

function runJudge(prompt, ev) {
  const timeout = Number(process.env.VAWE_JUDGE_TIMEOUT || 240) * 1000;
  const dirs = [...new Set([...ev.files.map((f) => path.dirname(f)), repoRoot])];
  const args = ['-p', '--output-format', 'json', '--tools', 'Read', '--allowedTools', 'Read', '--no-session-persistence', '--disable-slash-commands', '--add-dir', ...dirs];
  const r = spawnSync('claude', args, { input: prompt, encoding: 'utf8', cwd: ev.dir || path.dirname(ev.files[0]), timeout, maxBuffer: 1 << 26 });
  if (r.error?.code === 'ENOENT') die('the claude CLI is not installed. Install it: npm install -g @anthropic-ai/claude-code', 2);
  if (r.error) die(`the judge session failed: ${r.error.message}`);
  let envelope;
  try { envelope = JSON.parse(r.stdout); } catch { die(`the judge session gave no JSON: ${String(r.stderr || r.stdout).slice(0, 300)}`); }
  const verdict = extractJson(String(envelope.result ?? ''));
  if (!verdict?.scores) die(`the judge reply had no scores: ${String(envelope.result).slice(0, 300)}`);
  return { verdict, costUsd: envelope.total_cost_usd ?? null };
}

function finish(ev, raw, ms) {
  const axes = FRESH_AXES[ev.stage === 'stills' ? 'stills' : 'film'].map(([k]) => k).filter((k) => !(k === 'sound' && ev.stage !== 'final'));
  const scores = Object.fromEntries(axes.map((k) => [k, Number(raw.scores[k])]));
  const low = axes.filter((k) => !(scores[k] >= PASS_AT));
  const fixes = low.map((k) => {
    const given = (raw.fixes || []).find((x) => x.axis === k) || {};
    return { axis: k, score: scores[k], at: given.at ?? null, fix: given.fix || 'no fix given' };
  });
  const pass = low.length === 0;
  const first = raw.fixFirst || fixes[0]?.fix || null;
  const time = fixes.map((x) => parseFloat(x.at)).find((t) => Number.isFinite(t)) ?? null;
  return { fresh: true, stage: ev.stage, verdict: pass ? 'PASS' : 'FIX', pass, scores, worlds: ev.stage === 'stills' ? null : raw.worlds ?? null, fixes, fixFirst: first, time, topFix: first, ...(ev.stage === 'stills' ? { directions: raw.directions ?? null, strongest: raw.strongest ?? null, reason: raw.reason ?? null } : {}), ...(ev.keys?.length ? { anchor: anchorResult(raw.anchor, ev.keys) } : {}), ms, recorded: new Date().toISOString().slice(0, 10) };
}

const input = process.argv[2];
if (!input || input.startsWith('--')) die('usage: vawe judge --fresh <page.html | film.mp4 | sheet.png> [--brief brief.md] [--stage stills|draft|final]', 2);
if (!fs.existsSync(input)) die(`no such file: ${input}`, 2);
if (spawnSync('claude', ['--version'], { encoding: 'utf8' }).error) die('the claude CLI is not installed. Install it: npm install -g @anthropic-ai/claude-code', 2);
const briefArg = arg('--brief');
if (briefArg && !fs.existsSync(briefArg)) die(`no such brief: ${briefArg}`, 2);
const templateBrief = briefArg && isTemplateBrief(fs.readFileSync(briefArg, 'utf8'));
if (templateBrief) console.error(`${briefArg} still holds the template defaults: judged without a brief`);
const brief = templateBrief ? null : briefArg;
const ext = path.extname(input).toLowerCase();
const stage = arg('--stage') || (ext === '.mp4' ? 'final' : ext === '.png' || ext === '.jpg' ? 'stills' : 'draft');
if (!['stills', 'draft', 'final'].includes(stage)) die(`--stage is stills, draft or final, not "${stage}"`, 2);

if (stage === 'stills' && briefArg) {
  const text = fs.readFileSync(briefArg, 'utf8');
  const lines = adviceBlock([...rangeProblems(parseDirections(text).slots), ...attractorProblems(text)], '(advice only: the judge ran)');
  if (lines.length) console.log(lines.join('\n'));
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const t0 = Date.now();
const ev = await prepare(input, stage, brief);
const file = path.resolve('out', `${ev.name}.${stage === 'stills' ? 'stills' : 'judge'}.json`);
const prevItems = stage === 'stills' ? [] : previousItems(readJson(file));
const { verdict: raw } = runJudge(buildPrompt(ev, brief, ledgerPrompt(openItems(prevItems), prevItems)), ev);
const result = finish(ev, raw, Date.now() - t0);
if (stage !== 'stills') {
  const led = mergeLedger(prevItems, raw, result.fixes);
  Object.assign(result, { fixes: led.fixes, items: led.items, ledger: ledgerLines(led) });
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(result, null, 1));
console.log(reportLines(result, path.relative(process.cwd(), file)).join('\n'));
process.exit(0);
