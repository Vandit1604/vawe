#!/usr/bin/env node
// harness/live/stage-gate.mjs: a PreToolUse DENY on writes that skip a stage.
//
// Wired on Write|Edit in .claude/settings.json. It answers with
// `hookSpecificOutput.permissionDecision: "deny"` and a reason naming the command to run instead. A
// PreToolUse deny is evaluated BEFORE any permission-mode check, so it holds under bypassPermissions
// too, which is the whole reason the order lives here rather than in a sentence.
//
// WHY THIS EXISTS AND A DOC DOES NOT. The order was written in AGENTS.md, printed by
// `make critics DECIDERS=1` as "Step 1 is not optional", and still run backwards by an author who
// could quote it (engine-doctrine/MISTAKES.md #591). Long sessions erode rule-following, so a rule that must be
// remembered is a rule that fails late in the work, which is exactly when it matters most.
//
// ONE DENIAL PER MISTAKE ACTUALLY MADE. It is not a policy engine and must not grow into one:
// every rule here has a real entry in engine-doctrine/MISTAKES.md behind it. Anything softer belongs in
// harness/live/craft-live.mjs, which speaks and never blocks.
//
// THE WAY OUT IS THE SAME AS EVERY GATE HERE. Make the missing artefact. There is no flag, because a
// flag on this would be a way to skip the step, which is the thing being prevented.
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, ROOT } from '../../quality/gates/stage.mjs';
import { appendRun } from '../lib/runlog.mjs';

const FILMS_DIR = process.env.VAWE_FILMS_DIR || 'films/scene';

// A DENY leaves no other trace: stdout carries the reason back to the model and nothing else sees it.
// So every deny is also logged to the run log, under the film the write was ATTEMPTED against (even
// one that has no plan yet: `stemOf` derives a key from the filename alone, same as the "no storyboard
// claims this file" branch below already does to name the file in its own message). This never throws
// and never delays the deny: the log write happens after `process.stdout.write`, wrapped so a log
// failure can't turn a refusal into a hang or a stack trace shown to the model instead of the reason.
const deny = (reason, rule, film) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  try { appendRun(film, { cmd: 'stage-gate', refusal: { rule, file: film, reason } }); } catch { /* never let the receipt affect the deny */ }
  process.exit(0);
};
const allow = () => process.exit(0);

// WHICH FILM DOES THIS FILE BELONG TO. Not guessable from the name alone, because this repo uses two
// fragment conventions at once: `_vawe-oblique.frame.html` (film.part) and `_hinge-hook.html`
// (film-part). Splitting on a separator picks the wrong film on one of them every time. So the answer
// is not parsed, it is LOOKED UP: the longest real film in films/scene/ whose name this file's stem
// starts with. A name cannot be ambiguous against the films that actually exist.
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
    // This hook's ONE job is to refuse three writes. A malformed payload means it cannot tell
    // whether this write is one of them, so it cannot vouch for it either: fail closed, not open.
    // A gate that permits on its own confusion is not a gate.
    deny('stage-gate could not parse the PreToolUse payload it was given, so it cannot tell '
      + `whether this write needs a plan behind it. JSON.parse failed: ${e.message}. Retry the write; `
      + 'if this repeats, the tool call is sending stage-gate malformed stdin.',
      'unparsable-input', 'unparsable-input');
  }
  if (!file) allow();
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || !rel.startsWith(FILMS_DIR + '/')) allow();

  // A storyboard itself is always writable: it is stage 2, and denying it would deny the way out of
  // every other denial here.
  if (rel.endsWith('.storyboard.md')) allow();

  const film = filmOf(rel);
  // THE ROSTER ORDER, first half: a fragment no film on disk claims has no plan behind it at all.
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

  // THE ROSTER ORDER. The scene decider is third, after storyboard and subject. A fragment written
  //    first guesses the count and invents the motion handles the plan was supposed to name.
  if (rel.endsWith('.html') && !st.sbExists) {
    deny(`no storyboard for ${film}, so this fragment cannot be written yet. AGENTS.md orders the deciders `
      + 'storyboard (1), subject (2), scene (3), and scene is the role that writes this file. Written first, the '
      + 'fragment count is a guess and the motion handles are invented instead of read off the plan\'s own '
      + `\`motion:\` line (engine-doctrine/MISTAKES.md #591).\nNext: ${st.next}`,
      'no-storyboard', film);
  }
  allow();
});
