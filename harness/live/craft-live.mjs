#!/usr/bin/env node
// harness/live/craft-live.mjs - structural checks on a hand-written FRAGMENT, said at the moment the
// file is still open: a corrupted STAGEKIT block, or a fragment written before its film has a plan.
//
// WHY ONLY THESE TWO. This file used to also carry three scene-taste checks (pair-entrances-exits,
// logo-prominence, emoji-no-picture) and two process reminders (engine capture-path timing, new-gate
// last-resort). Those were judgement calls dressed as findings, not facts a JSON reader can be sure of,
// and they cost context on every edit whether or not the author wanted the opinion. They are gone; the
// two checks left here are both syntactic facts about the file just saved, never a taste call:
//
//   IT DOES NOT BLOCK. Exit 2, a message, and the work continues.
//   IT IS SILENT WHEN THE WORK IS FINE. A hook that speaks every time is a hook that gets turned off.
//   IT ONLY COMPLAINS ABOUT WHAT THE AUTHOR WROTE. Generated derivatives are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { extractKitBlock } from '../lib/stagekit.mjs';
import { appendRun } from '../lib/runlog.mjs';
import { summarize } from '../lib/hook-report.mjs';

// The full family of checks fragment() can fire, in the order they are evaluated. Recorded so the run
// log can say which ran CLEAN on a save, not only which one spoke: "never fired" and "never checked"
// look identical from the console alone.
const FRAGMENT_CHECKS = ['kit-intact', 'storyboard-order'];

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const FILMS_DIR = process.env.VAWE_FILMS_DIR || 'films/scene';

// ── a hand-written FRAGMENT, at the moment it is saved ────────────────────────────────────────────
// Two rules that were held up by nothing but a sentence, and that the sentence did not hold. Both were
// broken on `films/scene/_vawe-oblique.*.html` by an author who had read them (engine-doctrine/MISTAKES.md #591,
// and the type/elevation ramps in engine-doctrine/CRAFT/HTML-FRAGMENTS.md). A rule at [eye] is a rule you can
// agree with and not follow; these two are cheap to check syntactically, so they move to [live].
//
// The ceiling, said rather than dressed up: this reads BYTES. It reports that the kit block is
// missing or broken, and that a fragment exists before its film has a plan. Both are facts about
// the file. Any size, shadow, radius or spacing an author writes is theirs to write.
function fragment(rel, file) {
  const out = [];
  const fired = [];
  const raw = fs.readFileSync(file, 'utf8');
  const kit = extractKitBlock(raw);
  // 0. THE KIT BLOCK IS INTACT. Said first because everything below is measured against it, and said
  //    at the keystroke because this one recurs: the FIRST `</style>` in a fragment is the kit's own
  //    closing tag, so `replace('</style>', css + '</style>')` appends the fragment's CSS INSIDE the
  //    generated block and corrupts the markers. Made twice in one session by the same author, both
  //    times caught only later by a gate (engine-doctrine/MISTAKES.md #594).
  if (!kit && /STAGEKIT:start/.test(raw)) {
    out.push('  the STAGEKIT markers are present but the block no longer parses, so some CSS was written',
      '  INSIDE it. The first `</style>` in a fragment closes the KIT, not your own styles: append to the',
      '  SECOND one. Every tool that strips the kit before judging a fragment is now judging the kit.');
    fired.push('kit-intact');
  } else if (!kit) {
    out.push('  no STAGEKIT block. Paste `buildKit().block` verbatim, markers and all, not the generated',
      '  `<film>.kit.css` sidecar: the markers are the boundary between what you wrote and what the',
      '  generator did, and four separate checks depend on that boundary (engine-doctrine/MISTAKES.md #594).');
    fired.push('kit-intact');
  }
  // 1. THE ROSTER ORDER. The scene decider is third, after storyboard and subject. A fragment written
  //    before the beat table exists is a guess at the count and an invented set of motion handles.
  const film = rel.replace(/\/_?([^/]+?)(\.[^./]+)?\.html$/, '/$1');
  const near = fs.existsSync(path.join(ROOT, FILMS_DIR))
    ? fs.readdirSync(path.join(ROOT, FILMS_DIR)).filter((f) => f.endsWith('.storyboard.md')) : [];
  if (!near.length) {
    out.push(`  no storyboard anywhere in ${FILMS_DIR}/. AGENTS.md orders the deciders storyboard (1),`,
      `  subject (2), scene (3), and scene is the role that writes THIS file. Written first, the fragment`,
      `  count is a guess and the motion handles are invented after the fact rather than read off the`,
      `  plan's own \`motion:\` line. engine-doctrine/MISTAKES.md #591.`);
    fired.push('storyboard-order');
  }

  return { say: out, fired, filmKey: path.basename(film) };
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file) process.exit(0);
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..')) process.exit(0);

  const isFragment = rel.startsWith(FILMS_DIR + '/') && rel.endsWith('.html') && fs.existsSync(file);
  if (!isFragment) process.exit(0);

  const result = fragment(rel, file);
  const say = result.say;
  if (!say.length) process.exit(0);                    // the reward for work doing fine is silence

  const full = `${path.basename(rel)}\n${say.join('\n')}\n`
    + `  Nothing here blocks. These are structural facts about this fragment, not a style opinion.`;
  const out = summarize('craft-live', rel, full);
  console.error(out);

  // The receipt: which checks fired (shown above) and which ran clean on the same save (withheld).
  // Logged only now, the same gate the console.error above already used: the hook is silent on a fine
  // save, so nothing is logged for one either.
  if (result.filmKey) {
    try {
      appendRun(result.filmKey, {
        cmd: 'craft-live',
        craftLive: { file: rel, shown: result.fired, withheld: FRAGMENT_CHECKS.filter((id) => !result.fired.includes(id)) },
      });
    } catch { /* the receipt is a nudge too; never let a log failure touch the printed findings above */ }
  }
  process.exit(2);
});
