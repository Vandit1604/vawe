#!/usr/bin/env node
// harness/live/stage-gate.mjs: a PreToolUse DENY on the three writes that skip a stage.
//
// Wired on Write|Edit in .claude/settings.json. It answers with
// `hookSpecificOutput.permissionDecision: "deny"` and a reason naming the command to run instead. A
// PreToolUse deny is evaluated BEFORE any permission-mode check, so it holds under bypassPermissions
// too, which is the whole reason the order lives here rather than in a sentence.
//
// WHY THIS EXISTS AND A DOC DOES NOT. The order was written in AGENTS.md, printed by
// `make critics DECIDERS=1` as "Step 1 is not optional", and still run backwards by an author who
// could quote it (docs/MISTAKES.md #591). Long sessions erode rule-following, so a rule that must be
// remembered is a rule that fails late in the work, which is exactly when it matters most.
//
// THREE DENIALS, ONE PER MISTAKE ACTUALLY MADE. It is not a policy engine and must not grow into one:
// every rule here has a real entry in docs/MISTAKES.md behind it. Anything softer belongs in
// harness/live/craft-live.mjs, which speaks and never blocks.
//
// THE WAY OUT IS THE SAME AS EVERY GATE HERE. Make the missing artefact. There is no flag, because a
// flag on this would be a way to skip the step, which is the thing being prevented.
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, filePaths, ROOT } from '../../quality/gates/stage.mjs';

const deny = (reason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  process.exit(0);
};
const allow = () => process.exit(0);

// WHICH FILM DOES THIS FILE BELONG TO. Not guessable from the name alone, because this repo uses two
// fragment conventions at once: `_vawe-oblique.frame.html` (film.part) and `_hinge-hook.html`
// (film-part). Splitting on a separator picks the wrong film on one of them every time. So the answer
// is not parsed, it is LOOKED UP: the longest real film in formats/scene/ whose name this file's stem
// starts with. A name cannot be ambiguous against the films that actually exist.
const stemOf = (rel) => path.basename(rel).replace(/^_/, '')
  .replace(/\.(storyboard\.md|kit\.css|json|html|css)$/, '');
function filmOf(rel) {
  const stem = stemOf(rel);
  const dir = path.join(ROOT, 'formats/scene');
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
  } catch { allow(); }
  if (!file) allow();
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || !rel.startsWith('formats/scene/')) allow();

  // 1. APPROVAL IS A HUMAN ACT. An agent that can write its own sign-off has no gate at all, only a
  //    habit. The user's /vawe-approve writes this line; nothing else may.
  if (rel.endsWith('.storyboard.md') && /^approved\s*:/m.test(text)) {
    const n = stemOf(rel);
    deny('`approved:` is the USER\'s signature on the plan and an agent may not write it. Show the plan '
      + `with \`make studio D=formats/scene/${n}.json\` (press 1), then ask the user to run `
      + `\`/vawe-approve ${n}\`. AGENTS.md: nothing is rendered until the plan is LOCKED and the user signs off.`);
  }
  // A storyboard itself is always writable: it is stage 2, and denying it would deny the way out of
  // every other denial here.
  if (rel.endsWith('.storyboard.md')) allow();

  const film = filmOf(rel);
  // 2. THE ROSTER ORDER, first half: a fragment no film on disk claims has no plan behind it at all.
  if (!film) {
    if (!rel.endsWith('.html')) allow();
    deny(`no storyboard in formats/scene/ claims ${path.basename(rel)}, so there is no plan behind this `
      + 'fragment. AGENTS.md orders the deciders storyboard (1), subject (2), scene (3), and scene is the '
      + 'role that writes this file. The beat table is what decides how many fragments exist and names the '
      + 'selectors each must expose (docs/MISTAKES.md #591).\nNext: write the storyboard first, '
      + '`make scaffold OUT=formats/scene/<film>.json THEME=<theme> DUR=<seconds>`.');
  }
  const p = filePaths(film);
  const st = stageOf(film);

  // 2. THE ROSTER ORDER. The scene decider is third, after storyboard and subject. A fragment written
  //    first guesses the count and invents the motion handles the plan was supposed to name.
  if (rel.endsWith('.html') && !st.sbExists) {
    deny(`no storyboard for ${film}, so this fragment cannot be written yet. AGENTS.md orders the deciders `
      + 'storyboard (1), subject (2), scene (3), and scene is the role that writes this file. Written first, the '
      + 'fragment count is a guess and the motion handles are invented instead of read off the plan\'s own '
      + `\`motion:\` line (docs/MISTAKES.md #591).\nNext: ${st.next}`);
  }

  // 3. NO FILM BEFORE THE PLAN IS SIGNED. Writing layers is building; building before approval is the
  //    contract this repo states in two places and kept losing.
  if (rel === `formats/scene/${film}.json` && !st.approved) {
    let layers = 0;
    try { const d = JSON.parse(text); layers = Array.isArray(d.layers) ? d.layers.length : 0; } catch { layers = /"layers"\s*:\s*\[\s*\{/.test(text) ? 1 : 0; }
    if (layers > 0) {
      deny(`${film}'s plan is not approved, so the scene may not be filled in yet (stage: ${st.stage}). `
        + 'A shell with an empty `layers` is fine; layers are the film.\n'
        + `Next: ${st.next}`);
    }
  }
  allow();
});
