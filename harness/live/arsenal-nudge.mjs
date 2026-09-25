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
//   PostToolUse/Edit|Write on a scene file OR a `core/` engine file: look at what THIS edit added. If
//   it reads like a hand-built device (a CSS/HTML tell, a storyboard mechanism, or a newly named
//   `core/` capability) with no recent matching search, name the search to run and the top few things
//   it would find. Never blocks (exit 2 only carries the message, same contract as
//   beat-surfacer.mjs/craft-live.mjs).
//
// THE ENGINE-PRIMITIVE GAP THIS CLOSED. A radial blur was nearly rebuilt from scratch on top of
// `zoomBlur`, which already did it (core/resample/effects.js). The scene-file scan above never saw
// this: it only watches `films/scene/`. The `core/` branch below is the same nudge, narrowed to a
// NEWLY NAMED capability (a quoted registry entry or an `export function`/`export const`), never a
// body edit to code that already exists, so touching an existing effect stays silent.
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

// A cursor's OWN vocabulary (`snapTo`/`clicks`/`styleAt`, aimed at a target layer id, recipes.json
// "hover-click") already covers "arrive on a control and click it". The generic tell scan above
// never catches an author who hand-types that arrival as pixel coordinates instead: `"type":
// "cursor"` is itself a legitimate field value, so the word "cursor" gets cancelled as already-used
// (see deviceWordsIn below) and a raw `"x": 820, "y": 400` reads as ordinary composition, not a
// device tell. This is a second, NARROW check for exactly that one measured gap (3,831 hand-typed
// `x` values across the library, zero uses of `snapTo`), not a second nudge mechanism: it shares the
// same log, state and message shape as the generic path in handleEdit.
const CURSOR_PATH_RE = /"type"\s*:\s*"cursor"[\s\S]{0,400}?"path"\s*:\s*\[\s*\{\s*"t"\s*:[\s\S]{0,80}?"x"\s*:\s*-?\d/;
function handTypedCursorPath(text) {
  return CURSOR_PATH_RE.test(text)
    && !/"snapTo"\s*:/.test(text)
    && !/"recipe"\s*:\s*"hover-click"/.test(text);
}

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

// `core/` capability names: a quoted registry entry ('radialBlur') or an export declaration
// (export function radialBlur). camelCase-split so a compound name still matches a bare TELL word
// ("radialBlur" -> "radial", "blur"); a name with no tell word (clampCenter) never fires.
const CORE_QUOTED_RE = /['"]([A-Za-z][A-Za-z0-9]*)['"]/g;
const CORE_EXPORT_RE = /^export\s+(?:function|const|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;

function splitCamel(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[\s_-]+/).filter(Boolean);
}

function coreDeviceWordsIn(text) {
  const names = [];
  for (const m of text.matchAll(CORE_QUOTED_RE)) names.push(m[1]);
  for (const m of text.matchAll(CORE_EXPORT_RE)) names.push(m[1]);
  const words = new Set();
  for (const name of names) {
    for (const w of splitCamel(name)) {
      if (TELLS.includes(w)) words.add(w);
    }
  }
  return [...words];
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

/** The names arsenal would answer with, each carrying its doc route when it has one (a layer type's
 * craft doctrine, core/registry/registry.js's `docs` option). Printed as "name (doc: <path>)" so the
 * nudge that already tells an author what to search for also hands them the doctrine directly, rather
 * than a second message an author has to go run `make arsenal` again to see. */
function topNames(query) {
  // 4s is a UX ceiling for the real keystroke hook; ARSENAL_NUDGE_TIMEOUT_MS overrides it for a
  // resource-contended environment (many parallel test processes) where the subprocess itself is
  // slow to schedule, not slow to answer.
  const timeout = Number(process.env.ARSENAL_NUDGE_TIMEOUT_MS) || 4000;
  const r = spawnSync('node', [path.join(ROOT, 'harness/author/arsenal.mjs'), query, '--json', '--n', '3'],
    { cwd: ROOT, encoding: 'utf8', timeout });
  if (r.status !== 0 || !r.stdout) return [];
  try {
    const parsed = JSON.parse(r.stdout);
    return (parsed.results || []).map((e) => (e.doc ? `${e.name} (doc: ${e.doc})` : e.name));
  } catch { return []; }
}

// A CATALOGUE VIEW IS NOT A SEARCH FOR ANYTHING. These flags print a whole vocabulary, a census or a
// sheet; none of them is evidence that the author asked about the thing they are now hand-building.
const CATALOGUE_VIEW = /--(census|new|at|presets|theme|mistakes|shape|for)\b/;

/**
 * The QUERY inside an arsenal command, or null when the command asked no question.
 *
 * WHY THIS IS NOT `cmd`. It used to be: the log fell back to the whole command line whenever no quoted
 * query matched, and `recentSearchOverlaps` below substring-matches against it. So every flag run and
 * every shell pipeline looked like a search for every word it happened to contain. Measured on the real
 * log: 29 of 96 rows were pipelines or flag runs, and `cursor`, `caret` and `blur` each appeared in 9
 * command strings, so an unrelated `grep` silenced its nudge for the full 20-minute window. A push
 * mechanism that suppresses itself on noise is the same as not having one.
 */
export function queryOf(cmd) {
  const m = /Q="([^"]*)"/.exec(cmd) || /arsenal\.mjs\s+"([^"]*)"/.exec(cmd);
  if (m) return m[1].trim() || null;
  if (CATALOGUE_VIEW.test(cmd)) return null;
  // The unquoted form the CLI also accepts (`arsenal.mjs cursor caret --n 3`). Same rule arsenal's own
  // main() uses: drop every `--flag`, drop the value a value-taking flag consumes, keep the words.
  const after = /arsenal\.mjs\s+([^|;&>]*)/.exec(cmd);
  if (!after) return null;
  const args = after[1].trim().split(/\s+/).filter(Boolean);
  const VALUE_FLAGS = new Set(['--kind', '--n']);
  const words = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(args[i - 1]));
  return words.join(' ').trim() || null;
}

function handleBash(cmd) {
  if (!/(^|\s)(make\s+arsenal|node\s+harness\/author\/arsenal\.mjs)\b/.test(cmd)) return;
  const q = queryOf(cmd);
  if (!q) return;                       // nothing was asked, so nothing is recorded as having been asked
  ensureDataDir();
  fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), q }) + '\n');
}

function handleEdit(file, addedText) {
  const rel = path.relative(ROOT, file);
  const filmsDir = (process.env.VAWE_FILMS_DIR || 'films/scene') + '/';
  if (rel.startsWith('..')) return;
  const isJson = rel.startsWith(filmsDir) && rel.endsWith('.json');
  const isHtml = rel.startsWith(filmsDir) && rel.endsWith('.html');
  const isBoard = rel.startsWith(filmsDir) && rel.endsWith('.storyboard.md');
  const isCore = rel.startsWith('core/') && rel.endsWith('.js');
  if (!isJson && !isHtml && !isBoard && !isCore) return;
  if (typeof addedText !== 'string' || !addedText) return;

  const state = readState();
  const last = state[rel] || 0;
  if (Date.now() - last < RATE_LIMIT_MS) return;           // one nudge per file per 10 minutes

  // A new engine primitive: same failure shape (radial blur nearly rebuilt on top of zoomBlur), a
  // different vocabulary. `core/` names a capability as a quoted registry entry (`RESAMPLE_FX`'s
  // `'zoomBlur'`) or an `export function`/`export const` declaration, never a CSS/HTML tell, so this
  // is its own narrow scan: only a NEWLY NAMED capability whose name reads as a device tell, never a
  // body edit to one that already exists (nothing quoted or exported: silent).
  if (isCore) {
    const words = coreDeviceWordsIn(addedText);
    if (!words.length) return;
    if (recentSearchOverlaps(words)) return;
    const query = words.slice(0, 3).join(' ');
    const names = topNames(query);
    if (!names.length) return;
    state[rel] = Date.now();
    writeState(state);
    console.error(`search first: make arsenal Q="${query}" -> ${names.join(', ')}`);
    process.exit(2);
  }

  // Narrow cursor-path check first: fires before the generic scan below would cancel it out.
  if (isJson && handTypedCursorPath(addedText) && !recentSearchOverlaps(['cursor', 'snapto', 'hover-click'])) {
    const query = 'cursor target click';
    const names = topNames(query);
    if (names.length) {
      state[rel] = Date.now();
      writeState(state);
      console.error(`search first: make arsenal Q="${query}" -> ${names.join(', ')}`);
      process.exit(2);
    }
  }

  const { words } = deviceWordsIn(rel, addedText);
  if (!words.length) return;                              // no device word: silent

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
