#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, ROOT } from '../../quality/gates/stage.mjs';
import { computeFeatures } from '../../quality/gates/craft-checklist.mjs';
import { rulesFor, briefLine, STAGE_CATEGORY_ORDER } from '../lib/craft-rules.mjs';
import { appendRun } from '../lib/runlog.mjs';

const SESSION_STATE = path.join(ROOT, '.vawe-data/stage-say-session-state.json');

function readSessionState() {
  try { return JSON.parse(fs.readFileSync(SESSION_STATE, 'utf8')); } catch { return {}; }
}
function writeSessionState(state) {
  try {
    fs.mkdirSync(path.dirname(SESSION_STATE), { recursive: true });
    fs.writeFileSync(SESSION_STATE, JSON.stringify(state));
  } catch { /* best effort: a state-file write failure only costs a repeated block, never a crash */ }
}

if (process.argv.includes('--reset')) {
  let raw = '';
  process.stdin.on('data', (d) => { raw += d; });
  process.stdin.on('end', () => {
    let sessionId = null;
    try { sessionId = JSON.parse(raw).session_id || null; } catch { /* nothing to reset */ }
    if (sessionId) {
      const state = readSessionState();
      delete state[sessionId];
      writeSessionState(state);
    }
    process.exit(0);
  });
} else {
  main();
}

function main() {

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let sessionId = null;
  try { sessionId = JSON.parse(raw).session_id || null; } catch { /* no payload: falls back to always-print below */ }

  const DAY = 24 * 60 * 60 * 1000;
  const dir = path.join(ROOT, process.env.VAWE_FILMS_DIR || 'films/scene');
  let best = null;
  for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
    if (!f.endsWith('.storyboard.md')) continue;
    if (f.startsWith('_')) continue;
    const m = fs.statSync(path.join(dir, f)).mtimeMs;
    if (Date.now() - m > DAY) continue;
    if (!best || m > best.m) best = { m, film: f.slice(0, -'.storyboard.md'.length) };
  }
  if (!best) process.exit(0);

  let st;
  try { st = stageOf(best.film); } catch { process.exit(0); }
  if (st.stage === 'judge') process.exit(0);

  const stageBlock = [
    `vawe: ${st.name} is at stage ${st.stage.toUpperCase()} (${st.order.join(' → ')}).`,
    `  ${st.why}`,
    `  next: ${st.next}`,
    ...(st.skills.length ? [`  skill: ${st.skills.join(', ')}`] : []),
    '  Do that stage, not the one after it. `make stage D=films/scene/'
      + `${st.name}.json\` re-reads this from the files on disk.`,
  ].join('\n');

  const printBlock = process.env.VAWE_STAGE_SAY === 'always' || !sessionId
    || readSessionState()[sessionId] !== stageBlock;
  if (printBlock) {
    console.log(stageBlock);
    if (sessionId) {
      const state = readSessionState();
      state[sessionId] = stageBlock;
      writeSessionState(state);
    }
  }

  const RULES_STATE = path.join(ROOT, '.vawe-data/stage-say-rules-state.json');
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

  try {
    if (!alreadySpoke(best.film, st.stage)) {
      const scene = fs.existsSync(st.scene) ? JSON.parse(fs.readFileSync(st.scene, 'utf8')) : null;
      const sbText = fs.existsSync(st.sb) ? fs.readFileSync(st.sb, 'utf8') : null;
      const features = computeFeatures(scene, sbText);
      const order = STAGE_CATEGORY_ORDER[st.stage];
      const { rules, dropped } = order
        ? rulesFor({ stage: st.stage, features, categories: order, capPerCategory: 2, maxCharsPerCategory: 320, withReceipt: true })
        : rulesFor({ stage: st.stage, features, withReceipt: true });
      for (const r of rules) console.log(`  ${briefLine(r)}`);
      markSpoke(best.film, st.stage);
      try {
        appendRun(best.film, {
          cmd: 'stage-say',
          knowledge: { stage: st.stage, shown: rules.map((r) => r.id), dropped },
        });
      } catch { /* the receipt is a nudge too; never let a log failure touch the printed briefs above */ }
    }
  } catch { /* rule briefs are a nudge; a broken loader must never break this hook */ }
});
}
