// The acceptance table's I/O: reads the measures of a draft or a final, builds the rows
// (harness/lib/acceptance.mjs) and keeps the history in out/<name>.acceptance.json.
import fs from 'node:fs';
import path from 'node:path';
import { frameMotion, FPS } from './motion-curve.mjs';
import { readFeatures, summarize } from './scene-stats.mjs';
import { sheetTileDiffs } from './draft-check.mjs';
import { parseBriefTables, readBrief } from '../lib/brief-tables.mjs';
import { smoothness, hardJumps } from '../lib/smoothness.mjs';
import { undeclaredStills } from '../lib/still-limit.mjs';
import { tailTiles } from '../lib/sheet-tiles.mjs';
import { heldTextRuns } from '../lib/draft-check.mjs';
import { draftLowContrast } from '../lib/text-contrast.mjs';
import { textCollisions } from '../lib/text-collision.mjs';
import { readHoldProblems, readHoldUnmeasured, probeTracks } from '../lib/read-hold.mjs';
import { wordChecks, cutChecks, skippedWords, measuredSpec } from '../lib/spec-conformance.mjs';
import { buildRows, withHistory, tableLines, allMeasuredGreen, syncLine } from '../lib/acceptance.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { isWaived } from '../lib/waivers.mjs';

const outFile = (name, kind) => path.resolve('out', `${name}.${kind}.json`);
const nameOf = (mp4) => path.basename(mp4, '.mp4').replace(/-draft$/, '');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** What the video alone tells: smoothness, still windows, tail tiles and the hard jumps' times. Throws when ffmpeg fails. */
function videoMeasures(mp4, authoring, shots) {
  const diffs = frameMotion(mp4);
  const stats = summarize(readFeatures(mp4));
  const tiles = sheetTileDiffs(mp4);
  const cuts = shots.slice(1).map((s) => s.start).filter((t) => typeof t === 'number');
  return {
    smooth: smoothness(diffs, { fps: FPS, cuts, turns: stats.turns.map((t) => t.t) }),
    stills: undeclaredStills(stats.static, authoring),
    tail: tailTiles(tiles.diffs, tiles.fps, authoring),
    cuts: shots.length ? cutChecks(shots, hardJumps(diffs, FPS), FPS) : null,
    hasShots: shots.length > 0,
  };
}

/** What the live page's samples tell: text size, contrast, collisions, read holds, exits and the spec checks. */
function pageMeasures({ probe, findings, authoring }, tables) {
  const spec = probe.spec;
  const wordResult = spec && tables.words.length ? wordChecks(tables.words, spec.samples, spec, spec.times) : null;
  const tracks = probeTracks(probe.samples, probe, tables.words);
  return {
    caps: heldTextRuns(probe.samples, probe).map((r) => ({ text: r.key, cap: r.cap * 100, t: r.t, ...(r.chrome ? { chrome: true } : {}) })),
    contrast: isWaived(authoring, 'text-low-contrast') ? [] : draftLowContrast(probe.samples),
    collisions: textCollisions(probe.samples),
    readHold: readHoldProblems(tracks),
    readHoldUnmeasured: readHoldUnmeasured(tracks),
    skippedWords: skippedWords(tables.words),
    exits: findings.filter((f) => f.code === 'exit-length').map((f) => ({ at: f.at, what: f.what })),
    appear: wordResult && wordResult.filter((c) => c.label.endsWith('appears')),
    layout: wordResult && wordResult.filter((c) => !c.label.endsWith('appears')),
    objects: spec?.objects ?? null,
    measuredSpec: spec ? measuredSpec(tables.words, spec.times, spec.objects ?? []) : null,
  };
}

function judgeMeasure(name) {
  const anchor = readJson(outFile(name, 'judge'))?.anchor;
  if (!anchor?.length) return null;
  const no = anchor.filter((a) => !a.yes);
  return { yes: anchor.length - no.length, total: anchor.length, fixes: no.map((a) => `${a.frame}${a.at != null ? ` at ${a.at} s` : ''}: ${a.fix}`) };
}

function record(name, rows, stage, caps = null, spec = null) {
  const { file, was } = withHistory(readJson(outFile(name, 'acceptance')), rows, { stage, caps, spec, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(outFile(name, 'acceptance')), { recursive: true });
  fs.writeFileSync(outFile(name, 'acceptance'), JSON.stringify(file, null, 1));
  return tableLines(rows, was);
}

/** The acceptance table lines for a full-length draft. `findings` are the page's motion-lint findings. */
export function draftAcceptance({ mp4, pagePath, probe, level, findings }) {
  const tables = parseBriefTables(readBrief(pagePath));
  const authoring = pageAuthoring(pagePath);
  const name = nameOf(mp4);
  let video = {};
  try { video = videoMeasures(mp4, authoring, tables.shots); } catch (e) { console.error(`  acceptance: video not read: ${e.message}`); }
  const page = pageMeasures({ probe, findings, authoring }, tables);
  const m = { ...video, ...page, lufs: level?.I ?? null, peak: level?.TP ?? null, judge: judgeMeasure(name) };
  const lines = record(name, buildRows(tables.acceptance, m, { objects: tables.objects.length > 0 }), 'draft', page.caps, page.measuredSpec);
  return ['acceptance:', ...lines, syncLine([...(page.appear ?? []), ...(page.objects ?? [])], pagePath)].filter(Boolean);
}

async function finalLevel(mp4) {
  try { return (await import('./page-audio.mjs')).measureFile(mp4); } catch { return null; }
}

/**
 * The acceptance table for a finished final, after its judge ran: { lines, allGreen }. The rows that need the
 * live page (text, collisions, exits, spec words) keep the value of the last run, marked "(draft)".
 */
export async function finalAcceptance({ page, outputs }) {
  const mp4 = outputs[0];
  const tables = parseBriefTables(readBrief(page));
  const name = nameOf(mp4);
  const history = readJson(outFile(name, 'acceptance'))?.history ?? [];
  const level = await finalLevel(mp4);
  const m = { ...videoMeasures(mp4, pageAuthoring(page), tables.shots), lufs: level?.I ?? null, peak: level?.TP ?? null, judge: judgeMeasure(name) };
  const rows = buildRows(tables.acceptance, m, { objects: tables.objects.length > 0, carry: history.at(-1)?.rows ?? [] });
  return { lines: [`acceptance (final ${path.basename(mp4)}):`, ...record(name, rows, 'final')], allGreen: allMeasuredGreen(rows) };
}

/** The measured text sizes of the last draft, [{ text, cap, t }] with cap in % of frame height, for the judge. Product chrome is not a line to read, so it is left out. */
export function lastCaps(name) {
  return ((readJson(outFile(name, 'acceptance'))?.history ?? []).findLast((e) => e.caps)?.caps ?? []).filter((c) => !c.chrome);
}

/** The times the last draft measured for the brief's SPEC rows, { words, objects }, or null before any draft. */
export function lastSpec(name) {
  return (readJson(outFile(name, 'acceptance'))?.history ?? []).findLast((e) => e.spec)?.spec ?? null;
}
