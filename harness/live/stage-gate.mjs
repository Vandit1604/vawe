#!/usr/bin/env node
// could quote it (engine-doctrine/MISTAKES.md #591). Long sessions erode rule-following, so a rule that must be
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, ROOT } from '../../quality/gates/stage.mjs';
import { appendRun } from '../lib/runlog.mjs';

const FILMS_DIR = process.env.VAWE_FILMS_DIR || 'films/scene';
// AUTHOR-SIDE GATES ADVISE, NEVER BLOCK: this hook used to `deny` unconditionally. Neither reason it
// fires (no storyboard claims the file, or the film has no plan yet) is a schema failure or a
// determinism bug, so by default it now allows the write and prints the same reason as advice.
// STRICT=1 restores the old refusal. See engine-doctrine/SAFEGUARDS.md.
const STRICT = process.env.STRICT === '1';

// `hard` stays true only for a malformed payload: the hook cannot read the tool call at all, which is
// a harness failure, not a craft opinion about a film, so it fails closed regardless of STRICT.
const deny = (reason, rule, film, hard = false) => {
  if (!STRICT && !hard) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: `advisory (STRICT=1 would block): ${reason}` },
    }));
    try { appendRun(film, { cmd: 'stage-gate', advisory: { rule, file: film, reason } }); } catch { /* never let the receipt affect the write */ }
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  try { appendRun(film, { cmd: 'stage-gate', refusal: { rule, file: film, reason } }); } catch { /* never let the receipt affect the deny */ }
  process.exit(0);
};
const allow = () => process.exit(0);

const stemOf = (rel) => path.basename(rel).replace(/^_/, '')
  .replace(/\.(storyboard\.md|kit\.css|json|html|css)$/, '');
function filmOf(rel) {
  const stem = stemOf(rel);
  const dir = path.join(ROOT, FILMS_DIR);
  const films = new Set();
  for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
    if (f.endsWith('.storyboard.md')) films.add(f.slice(0, -'.storyboard.md'.length).replace(/^_/, ''));
    else if (f.endsWith('.json')) films.add(f.slice(0, -'.json'.length).replace(/^_/, ''));
  }
  if (films.has(stem)) return stem;
  const owner = [...films].filter((f) => stem.startsWith(f) && /^[.\-_]/.test(stem.slice(f.length)))
    .sort((a, b) => b.length - a.length)[0];
  return owner || null;               // null: no film on disk claims this file
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file = '', text = '';
  try {
    const inp = JSON.parse(raw).tool_input || {};
    file = inp.file_path || '';
    text = String(inp.content ?? inp.new_string ?? '');
  } catch (e) {
    deny('stage-gate could not parse the PreToolUse payload it was given, so it cannot tell '
      + `whether this write needs a plan behind it. JSON.parse failed: ${e.message}. Retry the write; `
      + 'if this repeats, the tool call is sending stage-gate malformed stdin.',
      'unparsable-input', 'unparsable-input', true);
  }
  if (!file) allow();
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || !rel.startsWith(FILMS_DIR + '/')) allow();

  if (rel.endsWith('.storyboard.md')) allow();

  const film = filmOf(rel);
  if (!film) {
    if (!rel.endsWith('.html')) allow();
    deny(`no storyboard in films/scene/ claims ${path.basename(rel)}, so there is no plan behind this `
      + 'fragment. AGENTS.md orders the deciders storyboard (1), subject (2), scene (3), and scene is the '
      + 'role that writes this file. The beat table is what decides how many fragments exist and names the '
      + 'selectors each must expose (engine-doctrine/MISTAKES.md #591).\nNext: write the storyboard first, '
      + 'from engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md.',
      'no-storyboard', stemOf(rel));
  }
  const st = stageOf(film);

  if (rel.endsWith('.html') && !st.sbExists) {
    deny(`no storyboard for ${film}, so this fragment cannot be written yet. AGENTS.md orders the deciders `
      + 'storyboard (1), subject (2), scene (3), and scene is the role that writes this file. Written first, the '
      + 'fragment count is a guess and the motion handles are invented instead of read off the plan\'s own '
      + `\`motion:\` line (engine-doctrine/MISTAKES.md #591).\nNext: ${st.next}`,
      'no-storyboard', film);
  }
  allow();
});
