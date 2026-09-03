#!/usr/bin/env node
// scripts/live/scene-live.mjs — the four numbers CLAUDE.md argues from, measured on the film you just
// saved, at the moment the JSON is still open.
//
// WHY THIS EXISTS, AS A NUMBER. `node scripts/gates/rung.mjs` reports the enforcement ladder over this
// repo's own doctrine, and it reads:
//
//     [built] 2   the engine makes it true
//     [gated] 4   a gate refuses it
//     [live]  0   something says it while you write
//     [ref]   4   a command answers it on demand
//     [eye]  14   nothing but the sentence
//
// Fourteen rules an author can read, agree with, and not follow, with nothing anywhere noticing. And
// the [live] column is EMPTY. Two hooks already run on every Edit and Write (code-quality, vocabulary)
// and both watch `core/`: the engine is spoken to while it is written and a FILM is not, which is the
// wrong way round, because the engine has gates and tests and the film has a sentence in a markdown
// file. This is the first entry in that empty column.
//
// WHAT IT WILL NOT DO. It will not block, and it will not fire on a film that is doing fine. A hook
// that speaks every time is a hook that gets turned off, which is scripts/live/vocabulary.mjs's
// argument and this file is deliberately its twin. Every threshold below is a measurement from
// `node scripts/dev/library-stats.mjs` over the gate-visible library, never a preference: it says what
// the library actually does, and the two films this repo is proudest of sit far on the other side of it.
//
// It also cannot see the thing that matters most. Whether a picture EXPLAINS or merely decorates is a
// judgement, and the one gate that ever tried to measure it (`visual-vocabulary`) was deleted for
// squaring a 590x18 rule into 590x590 and crediting a hairline with a tenth of the frame. Counting
// layers is not measuring area, and this file counts layers. `make judge` and your eyes are still the check.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// ONE OWNER. This set is copied from scripts/dev/library-stats.mjs:33, which is the script that prints
// every figure CLAUDE.md quotes. If the two ever disagree, the numbers in the doc stop matching the
// numbers in the hook and an author is told two different things about one film. `glow`, `beam` and
// `rect` are deliberately absent there and absent here: a mark is not a picture.
const PICTORIAL = new Set(['image', 'html', 'component', 'svg', 'video', 'clip', 'lottie', 'board', 'doc']);

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file || !file.endsWith('.json')) process.exit(0);
  const rel = path.relative(ROOT, file);
  if (!rel.startsWith('formats/scene/')) process.exit(0);
  // Derivatives are GENERATED. Telling an author their .expanded.json is thin is telling them about a
  // file they did not write and cannot fix in place.
  if (/\.(expanded|animatic|beatsync|template)\.json$/.test(rel)) process.exit(0);
  if (!fs.existsSync(file)) process.exit(0);

  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { process.exit(0); }  // mid-edit, not a finding
  if (j.module !== 'scene') process.exit(0);

  const layers = Array.isArray(j.layers) ? j.layers : [];
  if (layers.length < 3) process.exit(0);        // a scratch file or a fragment, not a film yet

  const pict = layers.filter((L) => PICTORIAL.has(L.type)).length;
  const keyed = layers.filter((L) => Array.isArray(L.motion) && L.motion.length).length;
  const bgWindows = Array.isArray(j.bg) ? j.bg.length : (j.bg ? 1 : 0);
  const pctP = Math.round((pict / layers.length) * 100);
  const pctK = Math.round((keyed / layers.length) * 100);

  const say = [];
  // Each line names the measurement, then what the library does, then the film that argues otherwise.
  // The comparison is the point: "17% is low" means nothing; "the median is 6% and brew is 46%" is a
  // position an author can disagree with on purpose.
  if (pict === 0) {
    say.push(`  no pictorial layers at all. 64 of the 148 gate-visible scenes are the same and that was`);
    say.push(`  nobody's decision, it is debt. brew-launch-act1 is 46% pictorial. docs/CRAFT/SHOW-DONT-TELL.md`);
  } else if (pctP < 6) {
    say.push(`  ${pctP}% pictorial (${pict}/${layers.length}). The library median is 6% and brew is 46%.`);
  }
  if (keyed === 0) {
    say.push(`  no hand-keyed motion track. A preset animates ONE layer over ONE span with ONE curve;`);
    say.push(`  higgsfield hand-keys 6 of its 8 layers. \`make track SHAPE=pan|blast|drift|enter|exit\``);
  }
  if (bgWindows <= 1) {
    say.push(`  ${bgWindows === 0 ? 'no' : 'one'} bg window for the whole runtime. 121 of 148 scenes do this, 82%, and it is`);
    say.push(`  the strongest single lever in CLAUDE.md: brew inverts the world on four of its five cuts.`);
  }
  if (j.audio && j.audio.silent && !j.audio._why) {
    say.push(`  \`audio.silent\` with no \`_why\`. 106 scenes declare the silence and only 26 justify it.`);
    say.push(`  scripts/gates/audio-check.mjs will stop you at ship; a sentence here settles it now.`);
  }
  if (!say.length) process.exit(0);              // the reward for a film doing fine is silence

  console.error(`${path.basename(rel)} · ${layers.length} layers · ${pctP}% pictorial · ${pctK}% hand-keyed\n`
    + say.join('\n')
    + `\n  Nothing here blocks. These are the four numbers CLAUDE.md argues from, measured on this file.`);
  process.exit(2);
});
