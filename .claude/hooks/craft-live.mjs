#!/usr/bin/env node
// .claude/hooks/craft-live.mjs — three rules of CLAUDE.md that were held up by nothing but the
// sentence, said at the moment the file is still open.
//
// WHY A SECOND LIVE HOOK. `node scripts/gates/rung.mjs` reports how each rule in CLAUDE.md is
// enforced, and thirteen of them sat at [eye]: a rule an author can read, agree with, and not follow,
// with nothing anywhere noticing. .claude/hooks/scene-live.mjs took the first three of those and this
// file takes three more. It is deliberately its twin, and it inherits the whole contract:
//
//   IT DOES NOT BLOCK. Exit 2, a message, and the work continues.
//   IT IS SILENT WHEN THE WORK IS FINE. A hook that speaks every time is a hook that gets turned off.
//   IT ONLY COMPLAINS ABOUT WHAT THE AUTHOR WROTE. Generated derivatives are skipped, as there.
//   EVERY NUMBER IS A MEASUREMENT. The counts below come from the gate-visible library (149 scenes
//   here, `node scripts/gates/waiver-drift.mjs` prints the census), never from a preference. Each one
//   is quoted so an author can disagree with a real position instead of with an opinion.
//
// WHAT IT CANNOT SEE, said rather than dressed up. Every check here is SYNTACTIC. It knows that
// `anim` and `out` name the same direction; it does not know whether the retreat was the point. It
// knows an emoji sits where the film has no picture; it cannot tell a decorative emoji from a load-
// bearing one. That is the ceiling of a JSON reader, and it is why nothing here blocks.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// The same set scripts/dev/library-stats.mjs:33 and scene-live use, minus `html`: this check asks
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
  if (/\.(expanded|animatic|beatsync|template)\.json$/.test(rel)) return [];
  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }   // mid-edit, not a finding
  if (j.module !== 'scene') return [];
  const all = flatten(j.layers);
  if (all.length < 3) return [];                       // a fragment or a scratch file, not a film yet
  const say = [];

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
      say.push(`  docs/CRAFT/IMAGERY.md carries the rest of the ladder with emoji at the bottom of it.`);
    }
  }
  return say;
}

/**
 * CLAUDE.md · "Changing the ENGINE, not a film?" Two of its five triggers are decidable from a path.
 *
 * The capture path is named in the rule itself: `internal/scene` and `internal/render`. A new gate is
 * a file under scripts/gates/ that git has never seen. The other three triggers (sugar that resolves
 * at boot, the extension primitives, the post-render harvest) are not decidable from a filename, and
 * saying nothing about them is better than guessing at them.
 */
function engine(rel, file) {
  if (/^internal\/(scene|render)\//.test(rel)) {
    return [`  ${rel} is the CAPTURE PATH. docs/CRAFT/ENGINE-CHANGES.md: render one film before and`,
      `  after, and put BOTH wall-clock times in the commit body. A correctness fix may cost speed;`,
      `  not knowing what it cost is the failure the rule exists for.`];
  }
  if (/^scripts\/gates\/[^/]+\.mjs$/.test(rel)) {
    let tracked = true;
    try { execFileSync('git', ['ls-files', '--error-unmatch', rel], { cwd: ROOT, stdio: 'ignore' }); }
    catch { tracked = false; }
    if (!tracked && fs.existsSync(file)) {
      return [`  ${rel} is a NEW GATE. docs/CRAFT/ENGINE-CHANGES.md: a gate is the LAST resort. If the`,
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

  const say = rel.startsWith('formats/scene/') && rel.endsWith('.json') && fs.existsSync(file)
    ? scene(rel, file)
    : engine(rel, file);
  if (!say.length) process.exit(0);                    // the reward for work doing fine is silence

  console.error(`${path.basename(rel)}\n${say.join('\n')}\n`
    + `  Nothing here blocks. These are CLAUDE.md's own rules, measured on this file.`);
  process.exit(2);
});
