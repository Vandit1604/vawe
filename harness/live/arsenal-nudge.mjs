#!/usr/bin/env node
// harness/live/arsenal-nudge.mjs - push toward `make arsenal` BEFORE a device gets hand-built.
//
// WHY. A real failure: an agent hand-built fake typing (word fades plus a static "|" caret) while the
// arsenal already held `text` typing+caret, the `terminal` block, and `codeTyping`. Nothing asked it
// to search first. `make arsenal Q="..."` already answers this; the gap was that nobody ran it.
//
// TWO ROLES, ONE FILE.
//   PostToolUse/Bash: an arsenal search just ran. Log it (silently) so the second role can tell a
//   fresh search from a stale one.
//   PostToolUse/Edit|Write on a scene file: look at what THIS edit added. If it reads like a
//   hand-built device (a CSS/HTML tell, or a storyboard mechanism) with no recent matching search,
//   name the search to run and the top few things it would find. Never blocks (exit 2 only carries
//   the message, same contract as beat-surfacer.mjs/craft-live.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
// Overridable so the test suite can run against a scratch dir instead of the real runtime state.
const DATA_DIR = process.env.ARSENAL_NUDGE_DATA_DIR || path.join(ROOT, '.vawe-data');
const LOG = path.join(DATA_DIR, 'arsenal-log.jsonl');
const STATE = path.join(DATA_DIR, 'arsenal-nudge-state.json');

const SEARCH_WINDOW_MS = 20 * 60 * 1000;
const RATE_LIMIT_MS = 10 * 60 * 1000;

// Hand-built device tells: the raw HTML/CSS an author reaches for INSTEAD of a registry name.
const TELLS = ['caret', 'cursor', 'typing', 'glow', 'gradient', 'blur', 'ring', 'chip', 'progress',
  'spinner', 'marquee', 'ticker', 'parallax', 'tilt', 'counter', 'chart'];
const TELL_RE = new RegExp(`\\b(${TELLS.join('|')})\\b`, 'gi');
const FIELD_RE = /"(?:type|preset|anim|block)"\s*:\s*"([\w-]+)"/g;
const STOPWORDS = new Set(['with', 'that', 'this', 'from', 'into', 'over', 'onto', 'then', 'while']);

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; }
}

function writeState(s) {
  ensureDataDir();
  fs.writeFileSync(STATE, JSON.stringify(s));
}

/** Words this edit's own JSON fields already spent on a real arsenal name: `type`/`preset`/`anim`/`block`
 * values. A tell that is itself a substring of one of these is already the registry, not a hand-build. */
function usedFieldNames(text) {
  const used = new Set();
  for (const m of text.matchAll(FIELD_RE)) used.add(m[1].toLowerCase());
  return used;
}

function deviceWordsIn(rel, text) {
  const used = usedFieldNames(text);
  const words = new Set();

  if (rel.endsWith('.storyboard.md')) {
    for (const line of text.split('\n')) {
      const m = /^\s*mechanism\s*:\s*(.+)$/i.exec(line);
      if (!m) continue;
      for (const w of m[1].toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
        if (!STOPWORDS.has(w)) words.add(w);
      }
    }
    return { words: [...words], used };
  }

  // JSON layer type/preset/anim/block names: worth searching on too (an author who typed `"type":
  // "text"` plus hand-rolled caret CSS still benefits from being told `codeTyping` exists), but they
  // are also the "already used" signal, so they never themselves cause a nudge if a tell overlaps them.
  for (const m of text.matchAll(TELL_RE)) words.add(m[1].toLowerCase());

  // Drop any tell that's already covered by a structured field the same edit wrote (e.g. `"type":
  // "codeTyping"` covers the tell "typing").
  for (const w of [...words]) {
    if ([...used].some((u) => u.includes(w) || w.includes(u))) words.delete(w);
  }
  return { words: [...words], used };
}

function recentSearchOverlaps(words) {
  if (!words.length) return false;
  const now = Date.now();
  const entries = readJsonl(LOG).filter((e) => now - e.t < SEARCH_WINDOW_MS);
  return entries.some((e) => {
    const q = String(e.q || '').toLowerCase();
    return words.some((w) => q.includes(w));
  });
}

function topNames(query) {
  const r = spawnSync('node', [path.join(ROOT, 'harness/author/arsenal.mjs'), query, '--json', '--n', '3'],
    { cwd: ROOT, encoding: 'utf8', timeout: 4000 });
  if (r.status !== 0 || !r.stdout) return [];
  try {
    const parsed = JSON.parse(r.stdout);
    return (parsed.results || []).map((e) => e.name);
  } catch { return []; }
}

function handleBash(cmd) {
  if (!/(^|\s)(make\s+arsenal|node\s+harness\/author\/arsenal\.mjs)\b/.test(cmd)) return;
  const m = /Q="([^"]*)"/.exec(cmd) || /arsenal\.mjs\s+"([^"]*)"/.exec(cmd);
  ensureDataDir();
  fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), q: m ? m[1] : cmd }) + '\n');
}

function handleEdit(file, addedText) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..')) return;
  const isJson = rel.startsWith('formats/scene/') && rel.endsWith('.json');
  const isHtml = rel.startsWith('formats/scene/') && rel.endsWith('.html');
  const isBoard = rel.startsWith('formats/scene/') && rel.endsWith('.storyboard.md');
  if (!isJson && !isHtml && !isBoard) return;
  if (typeof addedText !== 'string' || !addedText) return;

  const { words } = deviceWordsIn(rel, addedText);
  if (!words.length) return;                              // no device word: silent

  const state = readState();
  const last = state[rel] || 0;
  if (Date.now() - last < RATE_LIMIT_MS) return;           // one nudge per file per 10 minutes

  if (recentSearchOverlaps(words)) return;                 // a matching search already happened

  const query = words.slice(0, 3).join(' ');
  const names = topNames(query);
  if (!names.length) return;                               // arsenal itself found nothing: say nothing

  state[rel] = Date.now();
  writeState(state);
  console.error(`search first: make arsenal Q="${query}" -> ${names.join(', ')}`);
  process.exit(2);
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const toolName = input.tool_name || '';
  const ti = input.tool_input || {};

  if (toolName === 'Bash') {
    try { handleBash(ti.command || ''); } catch { /* logging never blocks */ }
    process.exit(0);
  }

  if (toolName === 'Edit' || toolName === 'Write') {
    const file = ti.file_path || '';
    if (!file) process.exit(0);
    const added = toolName === 'Write' ? ti.content : ti.new_string;
    try { handleEdit(file, added); } catch { process.exit(0); }
    process.exit(0);
  }

  process.exit(0);
});
