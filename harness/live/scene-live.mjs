#!/usr/bin/env node
// harness/live/scene-live.mjs - the five numbers CLAUDE.md argues from, measured on the film you just
// saved, at the moment the JSON is still open.
//
// WHY THIS EXISTS, AS A NUMBER. `node quality/gates/rung.mjs` reports the enforcement ladder over this
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
// that speaks every time is a hook that gets turned off, which is harness/live/vocabulary.mjs's
// argument and this file is deliberately its twin. Every threshold below is a measurement from
// `node harness/dev/library-stats.mjs` over the gate-visible library, never a preference: it says what
// the library actually does, and the two films this repo is proudest of sit far on the other side of it.
//
// IT NAMES THE ALTERNATIVE, NOT JUST THE PROBLEM. A rule that says "you have one bg window" and stops
// tells an author they are wrong; it does not tell them what to do, and the expensive step (finding the
// alternative) is exactly the step that gets cut under any pressure. So every finding below that CAN be
// turned into a concrete next edit is: three presets THIS film does not use, two layers that could carry
// the hand-keyed track, real files sitting unused on disk. Where naming a concrete edit would mean
// guessing at the film's content (which idea a picture would carry, whether a preset's tone fits), it
// does not guess: a wrong suggestion is worse than an honest "here are your options, you decide."
//
// It also cannot see the thing that matters most. Whether a picture EXPLAINS or merely decorates is a
// judgement, and the one gate that ever tried to measure it (`visual-vocabulary`) was deleted for
// squaring a 590x18 rule into 590x590 and crediting a hairline with a tenth of the frame. Counting
// layers is not measuring area, and this file counts layers. `make judge` and your eyes are still the
// check.
import fs from 'node:fs';
import path from 'node:path';
import { PRESETS } from '../../core/backgrounds/presets.js';
import { appendRun } from '../lib/runlog.mjs';
import { summarize } from '../lib/hook-report.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// The five independent checks below, in the order they run. Recorded so the run log can say which
// ran CLEAN on a save, not only which one spoke: "never fired" and "never checked" look identical from
// the console alone.
const CHECKS = ['pictorial-share', 'hand-keyed-motion', 'single-bg-window', 'unjustified-silence', 'numeric-in-beat-cue'];

// A cue's `t` names another layer's `id` the same way a layer's own `start` can (core/timeline/
// relative-time.js): bare id = that layer's start, `id.end` = start+duration, plus an optional
// offset. Same recursion as that resolver's eachLayerDeep, so a nested layer's id is found too.
function idBoundaries(layers, out) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.id && typeof L.start === 'number') {
      out.push({ id: L.id, t: L.start, end: false });
      if (typeof L.duration === 'number') out.push({ id: L.id, t: L.start + L.duration, end: true });
    }
    idBoundaries(L.children, out);
    idBoundaries(L.layers, out);
  }
}

// A cue an author typed as a plain number that happens to sit close to a real layer arrival is very
// likely marking THAT arrival, the exact failure `core/timeline/relative-time.js` was built to close:
// a hand-copied number is a snapshot, and it goes stale the moment the layer it was measuring moves
// (vawe-flow-2 shipped two cues 1118ms and 765ms early this way). 1.5s is measured, not guessed: across
// every gate-visible film with both a numeric cue and an id-bearing layer, the median cue-to-nearest-
// boundary distance is 0.44s and the 75th percentile is 1.32s (node harness/dev/library-stats.mjs would
// print this if it tracked cues; measured by hand against films/scene/*.json for this hook).
const CUE_NEAR_S = 1.5;
function nearbyCueSuggestions(j) {
  const cues = (j.audio && Array.isArray(j.audio.cues)) ? j.audio.cues : [];
  const numeric = cues.filter((c) => c && typeof c.t === 'number');
  if (!numeric.length) return [];
  const boundaries = [];
  idBoundaries(j.layers, boundaries);
  if (!boundaries.length) return [];             // nothing an author could reference; don't guess
  const out = [];
  for (const c of numeric) {
    let best = null;
    for (const b of boundaries) {
      const d = Math.abs(c.t - b.t);
      if (!best || d < best.d) best = { ...b, d };
    }
    if (best && best.d <= CUE_NEAR_S) {
      const offset = Math.round((c.t - best.t) * 1000) / 1000;
      const ref = best.id + (best.end ? '.end' : '') + (Math.abs(offset) < 0.005 ? '' : (offset > 0 ? `+${offset}` : `${offset}`));
      out.push({ cue: c, ref });
    }
  }
  return out;
}

// ONE OWNER. This set is copied from harness/dev/library-stats.mjs:33, which is the script that prints
// every figure CLAUDE.md quotes. If the two ever disagree, the numbers in the doc stop matching the
// numbers in the hook and an author is told two different things about one film. `glow`, `beam` and
// `rect` are deliberately absent there and absent here: a mark is not a picture.
const PICTORIAL = new Set(['image', 'html', 'component', 'svg', 'video', 'clip', 'lottie', 'board', 'doc']);

// STABLE PER FILE, VARIED BETWEEN FILES. The same string→int hash quality/gates/motion-audit.mjs uses
// to pick a deterministic ancestor chain. Two saves of the same film pick the same three presets; two
// different films almost never do. That is the whole point: advice that churns between saves is noise
// an author learns to skip, and advice that is identical for every film converges the library instead
// of diversifying it.
const strHash = (s) => { let h = 0; for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) | 0; return h >>> 0; };

// Three presets this FILM does not use, picked by the film's own path so the pick is stable here and
// different next door. `bg` stays required (engine-doctrine/MISTAKES.md #159): this only ever suggests a value,
// never writes one.
function unusedPresets(rel, used) {
  const pool = PRESETS.filter((p) => !used.has(p.name));
  if (!pool.length) return [];
  const offset = strHash(rel) % pool.length;
  const pick = [];
  for (let i = 0; i < Math.min(3, pool.length); i++) pick.push(pool[(offset + i) % pool.length]);
  return pick;
}

// Real files sitting beside this film that no layer currently points at. `post-corva.json` shows the
// pattern already working: a `<stem>.<slug>.html` sidecar an author captured and then wired with
// `src`. A sidecar nobody wired yet is not a hypothesis, it is a file on disk, so this is the one
// pictorial suggestion honest enough to make without guessing at the film's content.
function unusedSidecars(file, rel, j) {
  const dir = path.dirname(file);
  const stem = path.basename(rel, '.json');
  const used = new Set((j.layers || []).map((L) => L.src).filter(Boolean));
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return []; }
  return entries.filter((f) => f !== path.basename(rel)
    && f.startsWith(`${stem}.`)
    && /\.(html|png|jpe?g|svg|webp)$/i.test(f)
    && !/\.(storyboard|intent|lock)\./.test(f)
    && ![...used].some((s) => s.endsWith(f)));
}

// A real brand asset folder for this film, found by shortening the stem one hyphen-segment at a time
// (`brew-launch-act1` -> `brew-launch` -> `brew`). Existence on disk, not a guess from the name: this
// only fires when the directory is actually there.
function brandAssets(rel) {
  const parts = path.basename(rel, '.json').split('-');
  for (let i = parts.length; i > 0; i--) {
    const dir = path.join(ROOT, 'assets/brands', parts.slice(0, i).join('-'));
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file || !file.endsWith('.json')) process.exit(0);
  const rel = path.relative(ROOT, file);
  if (!rel.startsWith('films/scene/')) process.exit(0);
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
  const keyedLayers = layers.filter((L) => Array.isArray(L.motion) && L.motion.length);
  const bg = Array.isArray(j.bg) ? j.bg : (j.bg ? [j.bg] : []);
  const pctP = Math.round((pict / layers.length) * 100);
  const pctK = Math.round((keyedLayers.length / layers.length) * 100);

  const say = [];
  const fired = [];
  // Each line names the measurement, then what the library does, then the film that argues otherwise,
  // then a concrete next edit where one can be made honestly.
  if (pict === 0) {
    say.push(`  no pictorial layers at all. 70 of the 171 gate-visible scenes are the same and that was`);
    say.push(`  nobody's decision, it is debt. brew-launch-act1 is 46% pictorial. engine-doctrine/CRAFT/SHOW-DONT-TELL.md`);
  } else if (pctP < 8) {
    say.push(`  ${pctP}% pictorial (${pict}/${layers.length}). The library median is 8% and brew is 46%.`);
  }
  if (pict === 0 || pctP < 8) {
    const stem = path.basename(rel, '.json');
    const sidecars = unusedSidecars(file, rel, j);
    if (sidecars.length) {
      say.push(`  ${stem} already has ${sidecars.join(', ')} sitting next to it, unwired. Add it as an`);
      say.push(`  \`html\` or \`image\` layer with \`src: "${rel.replace(/[^/]+$/, sidecars[0])}"\`.`);
    } else {
      const dir = brandAssets(rel);
      if (dir) say.push(`  assets/brands/${path.basename(dir)}/ exists (\`ls ${path.relative(ROOT, dir)}\`); a real image from there beats an invented one.`);
    }
    fired.push('pictorial-share');
  }
  if (!keyedLayers.length) {
    const unkeyed = layers.filter((L) => !(Array.isArray(L.motion) && L.motion.length) && L.type !== 'camera');
    const longest = [...unkeyed].sort((a, b) => (b.duration || 0) - (a.duration || 0)).slice(0, 2);
    // A layer rarely carries its own name (most don't set `id`), so fall back to a snippet of the text
    // it renders, then to type@start, always something an author can find by eye in the JSON.
    const name = (L) => L.id || (typeof L.text === 'string' && L.text.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24))
      || `${L.type}@${L.start ?? 0}s`;
    say.push(`  no hand-keyed motion track. A preset animates ONE layer over ONE span with ONE curve;`);
    say.push(`  higgsfield hand-keys 6 of its 8 layers. \`make track SHAPE=pan|blast|drift|enter|exit\``);
    if (longest.length) {
      say.push(`  candidates from THIS film, on screen longest: ${longest.map((L) => `"${name(L)}" (${L.duration ?? '?'}s)`).join(', ')}.`);
    }
    fired.push('hand-keyed-motion');
  }
  if (bg.length <= 1) {
    const used = new Set(bg.map((b) => b && b.preset).filter(Boolean));
    const suggestions = unusedPresets(rel, used);
    say.push(`  ${bg.length === 0 ? 'no' : 'one'} bg window for the whole runtime. 133 of 171 scenes do this, 78%, and it is`);
    say.push(`  the strongest single lever in CLAUDE.md: brew inverts the world on four of its five cuts.`);
    if (suggestions.length) {
      say.push(`  this film has not tried: ${suggestions.map((p) => `\`${p.name}\` (${p.blurb})`).join(' · ')}.`);
      say.push(`  or hand-author one: an \`html\` layer at full-bleed z, behind everything else.`);
    }
    fired.push('single-bg-window');
  }
  if (j.audio && j.audio.silent && !j.audio._why) {
    say.push(`  \`audio.silent\` with no \`_why\`. 119 scenes declare the silence and only 40 justify it.`);
    say.push(`  quality/gates/audio-check.mjs will stop you at ship; a sentence here settles it now.`);
    fired.push('unjustified-silence');
  }
  const cueSuggestions = nearbyCueSuggestions(j);
  if (cueSuggestions.length) {
    say.push(`  ${cueSuggestions.length} cue${cueSuggestions.length > 1 ? 's' : ''} written as a plain number that sits close to a real layer's`);
    say.push(`  arrival: a hand-copied number is a snapshot and goes stale the moment that layer moves`);
    say.push(`  (this is how vawe-flow-2 shipped two cues 1.1s and 0.8s early). Name the layer instead:`);
    for (const { cue, ref } of cueSuggestions.slice(0, 2)) say.push(`    "t": ${cue.t} -> "t": "${ref}"`);
    fired.push('numeric-in-beat-cue');
  }
  if (!say.length) process.exit(0);              // the reward for a film doing fine is silence

  // The receipt: which of the four checks fired (shown below) and which ran clean on this same save.
  // Logged only now, the same gate the console.error below already uses: a fine save prints nothing
  // and logs nothing.
  try {
    appendRun(path.basename(rel, '.json'), {
      cmd: 'scene-live',
      sceneLive: { file: rel, shown: fired, withheld: CHECKS.filter((id) => !fired.includes(id)) },
    });
  } catch { /* the receipt is a nudge too; never let a log failure touch the printed findings below */ }

  const full = `${path.basename(rel)} · ${layers.length} layers · ${pctP}% pictorial · ${pctK}% hand-keyed\n`
    + say.join('\n')
    + `\n  Nothing here blocks. These are the five numbers CLAUDE.md argues from, measured on this file.`;

  const out = summarize('scene-live', rel, full);
  if (!out) process.exit(0);            // same finding as last time; already said, no need to repeat
  console.error(out);
  process.exit(2);
});
