#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { extractKitBlock } from '../lib/stagekit.mjs';
import { appendRun } from '../lib/runlog.mjs';
import { summarize } from '../lib/hook-report.mjs';

const FRAGMENT_CHECKS = ['kit-intact', 'storyboard-order'];

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const FILMS_DIR = process.env.VAWE_FILMS_DIR || 'films/scene';

// broken on `films/scene/_vawe-oblique.*.html` by an author who had read them (engine-doctrine/MISTAKES.md #591,
function fragment(rel, file) {
  const out = [];
  const fired = [];
  const raw = fs.readFileSync(file, 'utf8');
  const kit = extractKitBlock(raw);
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
