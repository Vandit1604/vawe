// scripts/gates/audio-check.mjs. THE SOUND GATE: is this film's silence a decision, or an omission?
//
// WHY THIS EXISTS. Measured across the library: 90 scenes set `audio.silent:true`, 20 name no `audio`
// key at all, and 25 carry a real bed. So five films in six ship with no sound, and nothing anywhere
// asked why. `docs/CRAFT/FILM-STRUCTURE.md` found that this closes a whole family of structural device:
// the sound bridge, music-led structure, the unfinished sentence all need a track to exist, and the
// engine has had the machinery for all of it since `374ffa9` and has barely been asked to use it.
//
// This gate does NOT add sound to anything. It cannot: choosing a bed is a taste decision and picking
// one for you is how "buzzing under everything" happens. What it does is make silence COST ONE
// SENTENCE, the same mechanism `authoring._why` already uses for rule waivers, and for the same
// reason: the cost is what turns a reflex back into a decision. A film that says
//
//     "audio": { "silent": true, "_why": "autoplays muted in-feed; the type carries it alone" }
//
// passes and is finished. A film that just omits the block has not decided anything, and the honest
// name for that is unfinished, not silent.
//
// It also checks the thing nothing else checks: WHERE THE BED CAME FROM. `assets/music/credits.json`
// records provenance, and every entry in it is currently `licenceVerified: false`. A bed with no
// verified licence under a commercial product film is a Content ID claim waiting to land, so it warns
// loudly and names the file. See docs/CRAFT/SOUND.md §Licensing.
//
//   node scripts/gates/audio-check.mjs <scene.json> [--strict]   ·   make audio-check D=<file>
//   node scripts/gates/audio-check.mjs --all                     ·   make audio-check
// WARN by default; --strict blocks. The library census (--all) never blocks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { population, LIBRARY } from '../lib/census.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const all = argv.includes('--all');
const file = argv.find((a) => !a.startsWith('--'));

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---- bed provenance ---------------------------------------------------------------------------
// credits.json is keyed by bed NAME ("lofi"), and a scene may name the bed either way, bare, or as
// the path the bare name resolves to. Reduce both to the basename so one table answers both.
const creditsPath = path.join(ROOT, 'assets/music/credits.json');
const credits = fs.existsSync(creditsPath) ? readJSON(creditsPath) : {};
const bedKey = (m) => path.basename(String(m)).replace(/\.[a-z0-9]+$/i, '');

// A bed resolves the way internal/audio/audio.go resolves it: a real path, or a bare name against
// assets/music/<name>.wav. Keep this in step with the mixer, the two disagreeing is MISTAKES #132.
const resolveBed = (m, sceneDir) => {
  if (typeof m !== 'string' || !m || m === 'auto') return null;
  const bases = [m, path.join(ROOT, m.replace(/^\/+/, '')), path.join(sceneDir, m)];
  if (!/[\\/]/.test(m) && !path.extname(m)) bases.push(path.join(ROOT, 'assets/music', m + '.wav'));
  return bases.find((b) => { try { return fs.statSync(b).isFile(); } catch { return false; } }) || null;
};

// ---- classify one scene -----------------------------------------------------------------------
// Four states, and the split that matters is between the two kinds of quiet: one was chosen and one
// was never considered. `sounded` means the mixer will actually write a track, an audio block that
// names nothing produces silence too, and calling that "sounded" would be the silent substitution
// this repo keeps having to fix.
const OMITTED = 'omitted', SILENT = 'silent', HOLLOW = 'hollow', SOUNDED = 'sounded';

export function classify(scene) {
  const a = scene && scene.audio;
  if (a === undefined || a === null) return OMITTED;
  if (typeof a !== 'object') return OMITTED;
  if (a.silent === true) return SILENT;
  const makesSound = (typeof a.music === 'string' && a.music !== '')
    || (typeof a.vo === 'string' && a.vo !== '')
    || a.auto === true
    || (Array.isArray(a.cues) && a.cues.length > 0)
    // A film can be held together by sound bridges alone (that is the point of them) so a scene
    // whose only audio is a J-cut across its junctions is sounded, not hollow.
    || (Array.isArray(a.bridges) && a.bridges.length > 0);
  return makesSound ? SOUNDED : HOLLOW;
}

// A reason must be a SENTENCE, not a word. 12 chars is the same floor author-check uses for
// `authoring._why`; matching it means an author learns one rule, not two.
const reasonOf = (a) => {
  const w = a && (a._why || a.why || a.reason);
  return typeof w === 'string' && w.trim().length >= 12 ? w.trim() : null;
};

function findings(scene, sceneDir) {
  const out = [];
  const a = (scene && typeof scene.audio === 'object' && scene.audio) || null;
  const state = classify(scene);

  if (state === OMITTED) {
    out.push(['silent-by-omission', true,
      'this film names no `audio` block, so it renders with no sound and nobody decided that.',
      'Give it a bed (`make audio-bed D=<file> WRITE=1`), or state the silence:\n' +
      '        "audio": { "silent": true, "_why": "why this film is better with no sound" }']);
  } else if (state === SILENT && !reasonOf(a)) {
    out.push(['silence-without-a-reason', true,
      '`audio.silent:true` with no `_why`. Silence is a legitimate choice and a strong one, but it is a',
      'choice, so write the one line that says what the silence is doing:\n' +
      '        "audio": { "silent": true, "_why": "autoplays muted in-feed; the type carries it alone" }']);
  } else if (state === HOLLOW) {
    out.push(['audio-block-produces-nothing', true,
      'there is an `audio` block, but it names no music, no VO, no cues and no `auto`, the mixer\'s',
      'emptiness guard writes no track at all, so this renders SILENT while reading as sounded.\n' +
      '        Name a bed, or say `"silent": true` with a `_why` and mean it.']);
  }

  if (!a) return { state, out };

  // A DECLARATION IS NOT A TRACK. `auto: true` and an explicit `cues` array both make this gate say
  // "this film has sound", and both render DIGITAL SILENCE when `assets/sfx/` is empty: the Go mixer
  // resolves each cue to `sfx/<name>.wav` (internal/audio/audio.go:140), finds nothing, and writes a
  // silent track. Two films shipped that way this week at -91 dB while this gate printed its tick.
  //
  // `assets/sfx/` is gitignored build output regenerated by `make sfx`, so a FRESH CLONE is exactly
  // the machine where this bites, and it is the machine nobody checks on. The bed already gets this
  // treatment (`bed-missing`, above); a cue never did.
  if (a.auto === true || (Array.isArray(a.cues) && a.cues.length)) {
    const dir = path.join(ROOT, 'assets/sfx');
    const have = fs.existsSync(dir) ? new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4))) : new Set();
    const named = new Set(Array.isArray(a.cues) ? a.cues.map((c) => c && c.name).filter(Boolean) : []);
    // With `auto`, the cue set is derived from the film's own junctions, so the honest check is
    // whether the sfx pack exists at all rather than which entry a given cut will reach for.
    if (!have.size) {
      out.push(['cues-have-no-sound', true,
        'this film declares cues (or `auto: true`) and assets/sfx/ holds no .wav at all, so every cue',
        'resolves to nothing and the mixer writes a SILENT track while this gate reads it as sounded.\n' +
        '        Bake them:  make sfx']);
    } else {
      const missing = [...named].filter((n) => !have.has(n));
      if (missing.length) out.push(['cue-missing', true,
        `audio.cues names ${missing.length} sound(s) with no file under assets/sfx/: ${missing.join(', ')}.`,
        'Each one is dropped in silence. Run `make sfx`, or name a cue that exists.']);
    }
  }

  if (a.music === 'auto') {
    out.push(['bed-unresolved', false,
      '`music:"auto"` is a sentinel resolved at AUTHORING time, not at render, the mixer does not run',
      'core/audio-select.js, so an unresolved "auto" reaching it plays SILENCE.\n' +
      `        Bake it in:  make audio-bed D=${file || '<file>'} WRITE=1`]);
  } else if (typeof a.music === 'string' && a.music) {
    const hit = resolveBed(a.music, sceneDir);
    if (!hit) {
      out.push(['bed-missing', true,
        `audio.music "${a.music}" resolves to no file: the mixer falls back to SILENCE.`,
        'Use a bed that exists under assets/music/ (`make music-pack`), or a real .wav path.']);
    } else {
      const k = bedKey(a.music);
      const c = credits[k];
      if (!c) {
        out.push(['bed-provenance-unknown', false,
          `bed "${k}" has no entry in assets/music/credits.json: nobody recorded where it came from.`,
          'An unattributed track under a commercial product film cannot be defended if it is claimed.\n' +
          '        Record its source + licence in credits.json, or replace it with a bed that has one.']);
      } else if (c.licenceVerified !== true) {
        out.push(['bed-licence-unverified', false,
          `bed "${k}" is recorded as ${c.licence || 'an unread licence'} with licenceVerified:false.`,
          `        ${c.note || 'Nobody has read the terms.'}\n` +
          '        Read the licence, confirm commercial + no-attribution, then set licenceVerified:true.']);
      }
    }
  }

  if (typeof a.musicGain === 'number' && a.musicGain === 0 && !a.vo) {
    out.push(['bed-muted', false,
      '`musicGain: 0` mutes the bed entirely. That is silence with extra steps.',
      'Either give it a level, or drop the bed and declare the silence honestly.']);
  }
  return { state, out };
}

// ---- library census ---------------------------------------------------------------------------
// The three counts, because "we ship silent" was a feeling until somebody counted. Only OMITTED
// changes behaviour if a default is ever flipped; SILENT is an author's decision and stays.
if (all) {
  const dir = path.join(ROOT, 'formats/scene');
  const tally = { [OMITTED]: [], [SILENT]: [], [HOLLOW]: [], [SOUNDED]: [] };
  let reasoned = 0;
  // Population through scripts/lib/census.mjs: it states N and refuses a checkout that cannot see the
  // library, instead of reporting "everybody ships silent" over a third of it.
  const pop = population('sound census', { filter: LIBRARY, quiet: true });
  for (const f of pop.names) {
    let s; try { s = readJSON(path.join(dir, f)); } catch { continue; }
    const st = classify(s);
    tally[st].push(f);
    if (st === SILENT && reasonOf(s.audio)) reasoned++;
  }
  const n = Object.values(tally).reduce((a, b) => a + b.length, 0);
  console.log(`\n  sound census · ${n} scene(s) in formats/scene\n`);
  console.log(`    ${String(tally[SOUNDED].length).padStart(4)}  sounded          a bed, a VO, or cues, the mixer writes a track`);
  console.log(`    ${String(tally[SILENT].length).padStart(4)}  silent:true      ${reasoned} of them state a reason`);
  console.log(`    ${String(tally[OMITTED].length).padStart(4)}  no audio key     silent, and nobody decided it`);
  console.log(`    ${String(tally[HOLLOW].length).padStart(4)}  hollow block     an audio block that produces no sound`);
  console.log(`\n  Only the last two would change if the engine default were ever flipped. A scene that says`);
  console.log(`  silent:true keeps its silence. That is an author's decision and it stays.\n`);
  for (const f of tally[OMITTED]) console.log(`      · no audio key: ${f}`);
  for (const f of tally[HOLLOW]) console.log(`      · hollow block: ${f}`);
  console.log('');
  process.exit(0);
}

if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/gates/audio-check.mjs <scene.json> [--strict]  |  --all');
  process.exit(2);
}
const scene = readJSON(file);
const { state, out } = findings(scene, path.dirname(path.resolve(file)));
const blocking = out.filter((f) => f[1]);

console.log(`\n  sound gate · ${file}  (${state})`);
if (!out.length) {
  const a = scene.audio || {};
  console.log(state === SILENT
    ? `  ✓ silent, and it says why: "${reasonOf(a)}"\n`
    : `  ✓ this film has sound.\n`);
  process.exit(0);
}
for (const [code, blocks, headline, fix] of out) {
  console.log(`    ${blocks ? '✗' : '~'} [${code}] ${headline}`);
  console.log(`        → ${fix}`);
}
console.log(strict && blocking.length
  ? `\n  ✗ sound gate (strict): ${blocking.length} finding(s) block.\n`
  : `\n  Sound is a structural device, not decoration. Docs/CRAFT/SOUND.md. Block these with --strict.\n`);
process.exit(strict && blocking.length ? 1 : 0);
