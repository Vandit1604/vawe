#!/usr/bin/env node
// harness/live/craft-live.mjs - three rules of CLAUDE.md that were held up by nothing but the
// sentence, said at the moment the file is still open.
//
// WHY A SECOND LIVE HOOK. `node quality/gates/rung.mjs` reports how each rule in CLAUDE.md is
// enforced, and thirteen of them sat at [eye]: a rule an author can read, agree with, and not follow,
// with nothing anywhere noticing. harness/live/scene-live.mjs took the first three of those and this
// file takes three more. It is deliberately its twin, and it inherits the whole contract:
//
//   IT DOES NOT BLOCK. Exit 2, a message, and the work continues.
//   IT IS SILENT WHEN THE WORK IS FINE. A hook that speaks every time is a hook that gets turned off.
//   IT ONLY COMPLAINS ABOUT WHAT THE AUTHOR WROTE. Generated derivatives are skipped, as there.
//   EVERY NUMBER IS A MEASUREMENT. The counts below come from the gate-visible library (149 scenes
//   here, `node quality/gates/waiver-drift.mjs` prints the census), never from a preference. Each one
//   is quoted so an author can disagree with a real position instead of with an opinion.
//
// WHAT IT CANNOT SEE, said rather than dressed up. Every check here is SYNTACTIC. It knows that
// `anim` and `out` name the same direction; it does not know whether the retreat was the point. It
// knows an emoji sits where the film has no picture; it cannot tell a decorative emoji from a load-
// bearing one. That is the ceiling of a JSON reader, and it is why nothing here blocks.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { extractKitBlock } from '../lib/stagekit.mjs';
import { appendRun } from '../lib/runlog.mjs';

// The full family of checks scene() and fragment() can each fire, in the order they are evaluated.
// Recorded so the run log can say which of a family ran CLEAN on a save, not only which one spoke:
// "never fired" and "never checked" look identical from the console alone.
const SCENE_CHECKS = ['pair-entrances-exits', 'logo-prominence', 'emoji-no-picture'];
const FRAGMENT_CHECKS = ['kit-intact', 'storyboard-order'];

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// The same set harness/dev/library-stats.mjs:33 and scene-live use, minus `html`: this check asks
// whether the film has a real PICTURE anywhere, and hand-written markup is the thing an author reaches
// for INSTEAD of one. A mark (`glow`, `beam`, `rect`) was never a picture in any of the three.
const PICTURE = new Set(['image', 'svg', 'video', 'clip', 'lottie', 'component', 'board', 'doc']);
const SLIDE = /^slide-(left|right|up|down)$/;
const EMOJI = /\p{Extended_Pictographic}/u;

/** Every layer, including the ones nested inside a group or a composition. */
function flatten(layers, out = []) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    out.push(L);
    for (const k of ['layers', 'children', 'items']) if (Array.isArray(L[k])) flatten(L[k], out);
  }
  return out;
}

const name = (L, i) => `${L.type || '?'}${L.id ? `#${L.id}` : ''} (layer ${i + 1})`;

/** CLAUDE.md · "Launch-video rules" and "Icons & images", measured on one scene. */
function scene(rel, file) {
  if (/\.(expanded|animatic|beatsync|template)\.json$/.test(rel)) return { say: [], fired: [] };
  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { say: [], fired: [] }; }   // mid-edit, not a finding
  if (j.module !== 'scene') return { say: [], fired: [] };
  const all = flatten(j.layers);
  if (all.length < 3) return { say: [], fired: [] };    // a fragment or a scratch file, not a film yet
  const say = [];
  const fired = [];

  // LAUNCH-VIDEO RULE 3 · "Pair entrances with their exits, directionally."
  // core/clips.js:77 is the owner of the direction: `slide-left` "enters from the left edge; as an
  // `out`, leaves toward it". So the SAME word twice is enter-and-retreat, and the correct pair is the
  // opposite word, which is what CLAUDE.md writes: anim:"slide-right" + out:"slide-left".
  const retreat = all.map((L, i) => [L, i])
    .filter(([L]) => SLIDE.test(L.anim || '') && L.anim === L.out);
  if (retreat.length) {
    say.push(`  ${retreat.length} layer(s) enter and RETREAT: ${retreat.map(([L, i]) => `${name(L, i)} anim+out "${L.anim}"`).join(', ')}.`);
    say.push(`  core/clips.js:77: slide-left "enters from the left edge; as an \`out\`, leaves toward it",`);
    say.push(`  so the same word twice walks the layer back out the door it came in. One direction of`);
    say.push(`  travel per beat: anim:"slide-right" + out:"slide-left". 38 layers in the library pair two`);
    say.push(`  slides and only 6, across 4 films, name the same direction, so this is rare and it reads.`);
    fired.push('pair-entrances-exits');
  }

  // LAUNCH-VIDEO RULE 2 · "Give the logo prominence." A mark sized like a bullet reads as punctuation.
  // Only a film carrying ONE OR TWO logo layers is asked: three or more is an icon wall, where small is
  // the whole design. 4 of the 149 gate-visible scenes name a logo layer and not one is under 100px,
  // so this speaks to a new mistake and to nothing already in the library.
  const logos = all.map((L, i) => [L, i])
    .filter(([L]) => (L.type === 'image' || L.type === 'svg') && /logo|wordmark/i.test(String(L.src || '')));
  if (logos.length && logos.length <= 2) {
    const small = logos.filter(([L]) => {
      const m = Math.max(+L.w || 0, +L.h || 0);
      return m > 0 && m < 100;
    });
    if (small.length) {
      say.push(`  the logo is ${small.map(([L, i]) => `${Math.max(+L.w || 0, +L.h || 0)}px on ${name(L, i)}`).join(', ')}.`);
      say.push(`  CLAUDE.md wants ~100px+ beside a title and 150px+ on an end card. Under that a mark sits`);
      say.push(`  next to the headline as punctuation rather than as the thing the film is about.`);
      fired.push('logo-prominence');
    }
  }

  // ICONS & IMAGES · "real assets first, emoji last." An emoji is only a finding when it is standing in
  // for the picture the film never got: a film WITH real imagery may use one freely. 7 of the 149
  // gate-visible scenes put an emoji in on-screen text, and 4 of those carry no picture at all.
  if (!all.some((L) => PICTURE.has(L.type))) {
    const em = all.map((L, i) => [L, i]).filter(([L]) => typeof L.text === 'string' && EMOJI.test(L.text));
    if (em.length) {
      say.push(`  ${em.length} emoji in on-screen text and no image, svg or captured surface anywhere:`);
      say.push(`  ${em.map(([L, i]) => name(L, i)).join(', ')}. The emoji IS the picture in this film.`);
      say.push(`  \`make capture\` takes real product UI, \`make assets\` fetches a real logo, and`);
      say.push(`  engine-doctrine/CRAFT/IMAGERY.md carries the rest of the ladder with emoji at the bottom of it.`);
      fired.push('emoji-no-picture');
    }
  }
  return { say, fired, filmKey: path.basename(rel, '.json') };
}

/**
 * CLAUDE.md · "Changing the ENGINE, not a film?" Two of its five triggers are decidable from a path.
 *
 * The capture path is named in the rule itself: `internal/scene` and `internal/render`. A new gate is
 * a file under quality/gates/ that git has never seen. The other three triggers (sugar that resolves
 * at boot, the extension primitives, the post-render harvest) are not decidable from a filename, and
 * saying nothing about them is better than guessing at them.
 */
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
  const near = fs.existsSync(path.join(ROOT, 'films/scene'))
    ? fs.readdirSync(path.join(ROOT, 'films/scene')).filter((f) => f.endsWith('.storyboard.md')) : [];
  if (!near.length) {
    out.push(`  no storyboard anywhere in films/scene/. AGENTS.md orders the deciders storyboard (1),`,
      `  subject (2), scene (3), and scene is the role that writes THIS file. Written first, the fragment`,
      `  count is a guess and the motion handles are invented after the fact rather than read off the`,
      `  plan's own \`motion:\` line. engine-doctrine/MISTAKES.md #591.`);
    fired.push('storyboard-order');
  }

  return { say: out, fired, filmKey: path.basename(film) };
}

function engine(rel, file) {
  if (/^internal\/(scene|render)\//.test(rel)) {
    return [`  ${rel} is the CAPTURE PATH. engine-doctrine/CRAFT/ENGINE-CHANGES.md: render one film before and`,
      `  after, and put BOTH wall-clock times in the commit body. A correctness fix may cost speed;`,
      `  not knowing what it cost is the failure the rule exists for.`];
  }
  if (/^quality\/gates\/[^/]+\.mjs$/.test(rel)) {
    let tracked = true;
    try { execFileSync('git', ['ls-files', '--error-unmatch', rel], { cwd: ROOT, stdio: 'ignore' }); }
    catch { tracked = false; }
    if (!tracked && fs.existsSync(file)) {
      return [`  ${rel} is a NEW GATE. engine-doctrine/CRAFT/ENGINE-CHANGES.md: a gate is the LAST resort. If the`,
        `  bad value has a write site, the refusal belongs there and the whole class of bug ends. A gate`,
        `  that runs afterwards only promises to notice. Write it anyway if there is no write site.`];
    }
  }
  return [];
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file) process.exit(0);
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..')) process.exit(0);

  const inScenes = rel.startsWith('films/scene/') && fs.existsSync(file);
  // scene()/fragment() report {say, fired, filmKey} so the run log can record the withheld half;
  // engine() has no film to log against (a capture-path or new-gate save is not scoped to one film), so
  // it keeps returning bare lines.
  const isScene = inScenes && rel.endsWith('.json');
  const isFragment = inScenes && rel.endsWith('.html');
  const result = isScene ? scene(rel, file) : isFragment ? fragment(rel, file) : { say: engine(rel, file) };
  const say = result.say;
  if (!say.length) process.exit(0);                    // the reward for work doing fine is silence

  console.error(`${path.basename(rel)}\n${say.join('\n')}\n`
    + `  Nothing here blocks. These are CLAUDE.md's own rules, measured on this file.`);

  // The receipt: which checks in this file's family fired (shown above) and which ran clean on the
  // same save (withheld). Logged only now, the same gate the console.error above already used: the
  // hook is silent on a fine save, so nothing is logged for one either.
  if ((isScene || isFragment) && result.filmKey) {
    const checks = isScene ? SCENE_CHECKS : FRAGMENT_CHECKS;
    try {
      appendRun(result.filmKey, {
        cmd: 'craft-live',
        craftLive: { file: rel, shown: result.fired, withheld: checks.filter((id) => !result.fired.includes(id)) },
      });
    } catch { /* the receipt is a nudge too; never let a log failure touch the printed findings above */ }
  }
  process.exit(2);
});
