#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, ROOT } from '../../quality/gates/stage.mjs';
import { computeFeatures } from '../../quality/gates/craft-checklist.mjs';
import { rulesFor, briefLine, STAGE_CATEGORY_ORDER } from '../lib/craft-rules.mjs';
import { appendRun } from '../lib/runlog.mjs';
import { finishAdvice } from '../lib/finish-advice.mjs';
import { newestPageFilm, pageStageOf } from '../lib/page-stage.mjs';

// VAWE_STATE_DIR lets a test keep its own state: two test files share this hook and raced on one file.
const STATE_DIR = process.env.VAWE_STATE_DIR || path.join(ROOT, '.vawe-data');
const SESSION_STATE = path.join(STATE_DIR, 'stage-say-session-state.json');
const RULES_STATE = path.join(STATE_DIR, 'stage-say-rules-state.json');
const DAY = 24 * 60 * 60 * 1000;

function readSessionState() {
  try { return JSON.parse(fs.readFileSync(SESSION_STATE, 'utf8')); } catch { return {}; }
}
function writeSessionState(state) {
  try {
    fs.mkdirSync(path.dirname(SESSION_STATE), { recursive: true });
    fs.writeFileSync(SESSION_STATE, JSON.stringify(state));
  } catch { /* best effort: a state-file write failure only costs a repeated block, never a crash */ }
}

/** readJsonQuiet/readTextQuiet: a best-effort read, `null` on anything wrong. Pulled out of main() so
 *  a stage's own scene+storyboard reads (for finishAdvice) do not add a branch to that function twice
 *  over, once here and again for the craft-rule briefs. */
function readJsonQuiet(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function readTextQuiet(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

function readStdin(onEnd) {
  let raw = '';
  process.stdin.on('data', (d) => { raw += d; });
  process.stdin.on('end', () => {
    let sessionId = null;
    try { sessionId = JSON.parse(raw).session_id || null; } catch { /* no payload: falls back to always-print below */ }
    onEnd(sessionId);
  });
}

/** Print the block once per session and stage; VAWE_STAGE_SAY=always or no session id always prints. */
function printOnce(sessionId, block) {
  const print = process.env.VAWE_STAGE_SAY === 'always' || !sessionId || readSessionState()[sessionId] !== block;
  if (!print) return;
  console.log(block);
  if (!sessionId) return;
  const state = readSessionState();
  state[sessionId] = block;
  writeSessionState(state);
}

/** The films/scene storyboard touched within a day with the newest mtime, or null. */
function newestStoryboard() {
  const dir = path.join(ROOT, process.env.VAWE_FILMS_DIR || 'films/scene');
  let best = null;
  for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
    if (!f.endsWith('.storyboard.md')) continue;
    if (f.startsWith('_')) continue;
    const m = fs.statSync(path.join(dir, f)).mtimeMs;
    if (Date.now() - m > DAY) continue;
    if (!best || m > best.m) best = { m, film: f.slice(0, -'.storyboard.md'.length) };
  }
  return best;
}

function alreadySpoke(film, stage) {
  try {
    const s = JSON.parse(fs.readFileSync(RULES_STATE, 'utf8'));
    return s.film === film && s.stage === stage;
  } catch { return false; }
}
function markSpoke(film, stage) {
  try {
    fs.mkdirSync(path.dirname(RULES_STATE), { recursive: true });
    fs.writeFileSync(RULES_STATE, JSON.stringify({ film, stage }));
  } catch { /* best effort: a state-file write failure only costs a repeated brief, never a crash */ }
}

/** The craft-rule briefs for a JSON film's stage, spoken once per (film, stage). */
function speakRuleBriefs(film, st) {
  try {
    if (alreadySpoke(film, st.stage)) return;
    const scene = fs.existsSync(st.scene) ? JSON.parse(fs.readFileSync(st.scene, 'utf8')) : null;
    const sbText = fs.existsSync(st.sb) ? fs.readFileSync(st.sb, 'utf8') : null;
    const features = computeFeatures(scene, sbText);
    const order = STAGE_CATEGORY_ORDER[st.stage];
    const { rules, dropped } = order
      ? rulesFor({ stage: st.stage, features, categories: order, capPerCategory: 2, maxCharsPerCategory: 320, withReceipt: true })
      : rulesFor({ stage: st.stage, features, withReceipt: true });
    for (const r of rules) console.log(`  ${briefLine(r)}`);
    markSpoke(film, st.stage);
    try {
      appendRun(film, { cmd: 'stage-say', knowledge: { stage: st.stage, shown: rules.map((r) => r.id), dropped } });
    } catch { /* the receipt is a nudge too; never let a log failure touch the printed briefs above */ }
  } catch { /* rule briefs are a nudge; a broken loader must never break this hook */ }
}

function pageBlock(pageRel) {
  const ps = pageStageOf(pageRel);
  return [
    `vawe: ${ps.name} is at stage ${ps.stage.toUpperCase()} (${ps.order.join(' → ')}), a page film.`,
    `  ${ps.why}`,
    `  next: ${ps.next}`,
    `  skill: ${ps.skills.join(', ')}   (read: skills/<name>/SKILL.md; house rules: AGENTS.md)`,
    '  Do that stage, not the one after it.',
  ].join('\n');
}

function sceneBlock(st) {
  const tip = finishAdvice({ stage: st.stage,
    scene: st.sceneExists ? readJsonQuiet(st.scene) : null,
    sbText: st.sbExists ? readTextQuiet(st.sb) : null,
    slug: st.name });
  return [
    `vawe: ${st.name} is at stage ${st.stage.toUpperCase()} (${st.order.join(' → ')}).`,
    `  ${st.why}`,
    `  next: ${st.next}`,
    ...(st.skills.length ? [`  skill: ${st.skills.join(', ')}`] : []),
    ...(st.craftDocs.length ? [`  read: ${st.craftDocs.join(', ')}`] : []),
    '  Do that stage, not the one after it. `make stage D=films/scene/'
      + `${st.name}.json\` re-reads this from the files on disk.`,
    ...(st.lookAdvice ? [st.lookAdvice] : []),
    ...(tip ? [tip] : []),
  ].join('\n');
}

function main(sessionId) {
  const best = newestStoryboard();
  const page = newestPageFilm();
  if (page && (!best || page.m > best.m)) {
    printOnce(sessionId, pageBlock(page.page));
    return;
  }
  if (!best) return;

  let st;
  try { st = stageOf(best.film); } catch { return; }
  if (st.stage === 'judge') return;

  printOnce(sessionId, sceneBlock(st));
  speakRuleBriefs(best.film, st);
}

if (process.argv.includes('--reset')) {
  readStdin((sessionId) => {
    if (sessionId) {
      const state = readSessionState();
      delete state[sessionId];
      writeSessionState(state);
    }
  });
} else {
  readStdin(main);
}
