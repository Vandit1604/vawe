#!/usr/bin/env node
// A fresh, default-reject taste judge an authoring agent can call itself: it prepares the evidence
// deterministically, then asks a separate headless Claude session (Read tool only) to score it.
//   node harness/media/judge-fresh.mjs <page.html | film.mp4 | sheet.png> [--brief brief.md] [--stage stills|draft|final]
// Advises, never blocks: exit 0 with a verdict either way. Exit 2 when the claude CLI is missing.
// Env: VAWE_TASTE_CARD (overrides the taste card the judge reads, default engine-doctrine/TASTE-CARD.md), VAWE_JUDGE_TIMEOUT (seconds, default 240).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch } from '../lib/scratch.mjs';
import { freshRubric, FRESH_AXES } from '../../quality/gates/rubric.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const SHEET_FPS = 5;
const SHEET_COLS = 10;
const SHEET_MAX_FRAMES = 150;
const TILE_W = 288;
const KEY_FRAMES = 6;
const KEY_GAP_S = 0.4;
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
  const fps = Math.min(SHEET_FPS, SHEET_MAX_FRAMES / dur);
  const rows = Math.ceil(dur * fps / SHEET_COLS);
  const label = `drawtext=${FONT ? `fontfile=${FONT}:` : ''}text='%{pts\\:flt}s':x=4:y=4:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7`;
  const out = path.join(dir, 'sheet.png');
  const r = ff(['-i', video, '-vf', `fps=${fps},scale=${TILE_W}:-2,${label},tile=${SHEET_COLS}x${rows}`, '-frames:v', '1', out]);
  if (r.status !== 0 || !fs.existsSync(out)) die(`could not build the sheet: ${String(r.stderr).split('\n').slice(-4).join(' ')}`);
  return { file: out, fps };
}

/** The moments of largest change: peaks of the mean absolute difference between 10 fps thumbnails. */
function changePeaks(video) {
  const W = 64, H = 36, FPS = 10, size = W * H;
  const r = ff(['-i', video, '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { raw: true });
  const buf = r.stdout;
  const n = Math.floor(buf.length / size);
  const diffs = [];
  for (let i = 1; i < n; i++) {
    let sum = 0;
    for (let p = 0; p < size; p++) sum += Math.abs(buf[i * size + p] - buf[(i - 1) * size + p]);
    diffs.push({ t: i / FPS, d: sum / size });
  }
  const picked = [];
  for (const c of [...diffs].sort((a, b) => b.d - a.d || a.t - b.t)) {
    if (picked.length === KEY_FRAMES) break;
    if (picked.every((p) => Math.abs(p.t - c.t) >= KEY_GAP_S)) picked.push(c);
  }
  return picked.sort((a, b) => a.t - b.t).map((p) => p.t);
}

function keyFrames(video, dur, dir) {
  const times = changePeaks(video).map((t) => Math.min(t, dur - 0.05));
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

async function prepare(input, stage) {
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
  const keys = keyFrames(video, dur, dir);
  const sound = stage === 'final' && hasAudio(video) ? loudness(video) : null;
  const notes = [
    `video: ${video} (${dur.toFixed(2)} s)`,
    `sheet: ${sheet.file}  (one frame every ${(1 / sheet.fps).toFixed(2)} s, read left to right and top to bottom, each tile is labelled with its time in seconds)`,
    ...keys.map((k, i) => `key frame ${i + 1} at ${k.t.toFixed(1)} s (a moment of large change): ${k.file}`),
    sound || (stage === 'final' ? 'sound: the file has no audio track' : 'sound: not scored at this stage'),
  ];
  return { name, stage, files: [sheet.file, ...keys.map((k) => k.file)], notes, dir };
}

function buildPrompt(ev, brief) {
  const optional = [
    brief && `The brief (Read it): ${path.resolve(brief)}`,
    `Taste card: 15 rules and 5 anti-patterns (Read this file once, and no other file or image beside it): ${path.resolve(process.env.VAWE_TASTE_CARD || TASTE_CARD)}. Score the axes below with these rules in mind, and name the rule number in each fix.`,
  ].filter(Boolean);
  const kind = ev.stage === 'stills' ? 'still directions for a film' : `a ${ev.stage} cut of a film`;
  return `You are a fresh taste judge. You did not make this work and you own no part of it. You judge ${kind} from the evidence files below.
Use only the Read tool: open the image files and look at them before you score. Do not guess from file names.
${ev.stage === 'stills' ? 'The image may show several directions side by side: score the strongest and name the direction you mean.' : 'Open the sheet first, then every key frame at full size.'}

Evidence:
${ev.notes.map((n) => `- ${n}`).join('\n')}
${optional.length ? `\n${optional.map((o) => `- ${o}`).join('\n')}\n` : ''}
${freshRubric({ stage: ev.stage })}`;
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
  return { fresh: true, stage: ev.stage, verdict: pass ? 'PASS' : 'FIX', pass, scores, worlds: ev.stage === 'stills' ? null : raw.worlds ?? null, fixes, fixFirst: first, time, topFix: first, ms, recorded: new Date().toISOString().slice(0, 10) };
}

function report(r) {
  const lines = [`judge --fresh (${r.stage}): ${r.verdict}`, Object.entries(r.scores).map(([k, v]) => `${k} ${v}`).join(', ') + (r.worlds != null ? `; worlds ${r.worlds}` : '')];
  for (const x of r.fixes) lines.push(`- ${x.axis} ${x.score}${x.at != null ? ` at ${x.at}` : ''}: ${x.fix}`);
  lines.push(`Fix first: ${r.fixFirst ?? 'nothing'}`, r.verdict);
  return lines.join('\n');
}

const input = process.argv[2];
if (!input || input.startsWith('--')) die('usage: vawe judge --fresh <page.html | film.mp4 | sheet.png> [--brief brief.md] [--stage stills|draft|final]', 2);
if (!fs.existsSync(input)) die(`no such file: ${input}`, 2);
if (spawnSync('claude', ['--version'], { encoding: 'utf8' }).error) die('the claude CLI is not installed. Install it: npm install -g @anthropic-ai/claude-code', 2);
const brief = arg('--brief');
if (brief && !fs.existsSync(brief)) die(`no such brief: ${brief}`, 2);
const ext = path.extname(input).toLowerCase();
const stage = arg('--stage') || (ext === '.mp4' ? 'final' : ext === '.png' || ext === '.jpg' ? 'stills' : 'draft');
if (!['stills', 'draft', 'final'].includes(stage)) die(`--stage is stills, draft or final, not "${stage}"`, 2);

const t0 = Date.now();
const ev = await prepare(input, stage);
const { verdict: raw } = runJudge(buildPrompt(ev, brief), ev);
const result = finish(ev, raw, Date.now() - t0);
const file = path.resolve('out', `${ev.name}.judge.json`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(result, null, 1));
console.log(`${report(result)}\n(${(result.ms / 1000).toFixed(0)} s, ${path.relative(process.cwd(), file)})`);
process.exit(0);
