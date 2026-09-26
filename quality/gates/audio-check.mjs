// quality/gates/audio-check.mjs. THE SOUND GATE: is this film's silence a decision, or an omission?
//
// WHY THIS EXISTS. `engine-doctrine/CRAFT/FILM-STRUCTURE.md` found that shipping mute closes a whole family of
// structural device: the sound bridge, music-led structure, the unfinished sentence all need a track
// to exist. The engine had the machinery since `374ffa9` and was barely asked to use it, because the
// derivation it needed was gated behind an OPT-IN flag (`audio.auto`) that almost nobody set.
//
// THAT FLAG IS NOW A DEFAULT. `films/scene/scene.js` (buildSfx) derives a cue for every cut, sting
// and seam UNLESS a scene says `audio.auto: false`. So a film's own junctions now score themselves for
// free, and this gate's job has narrowed: it used to have to notice a film that never asked for cues at
// all (`silent-by-omission`, `audio-block-produces-nothing`). Most of those films now sound on their
// own, and calling them silent would be the exact "message describes the old behaviour" failure this
// gate exists to avoid. `hasScoredJunction()` below re-derives the same fact `buildSfx` derives, via the
// same pure `lowerScene()`, so the two can never read a film's junctions differently.
//
// What is still real, and still gated: `silent:true` still short-circuits the mixer completely
// (`internal/audio/audio.go`, `cfg.Silent`) regardless of any derived cue, so it still costs one
// sentence. A scene with NO junctions to derive from, and no music/vo/cues/bridges of its own, still
// renders true digital silence, whether the audio key is present or not, and that is still worth a
// finding. And `music:"auto"` only resolves to a real bed when the scene ALSO names a `profile`
// (`core/audio/select.js`): picking a bed with nothing to go on is the same mistake `bg` injection
// made for backgrounds (engine-doctrine/MISTAKES.md #159), so a profile-less film choosing to stay musically
// silent is not flagged, that part is unchanged.
//
// This gate does NOT add sound to anything. It cannot: choosing a bed is a taste decision and picking
// one for you is how "buzzing under everything" happens. What it does is make silence COST ONE
// SENTENCE, the same mechanism `authoring._why` already uses for rule waivers, and for the same
// reason: the cost is what turns a reflex back into a decision. A film that says
//
//     "audio": { "silent": true, "_why": "autoplays muted in-feed; the type carries it alone" }
//
// passes and is finished. A film with no junctions AND no audio block has not decided anything, and
// the honest name for that is unfinished, not silent.
//
// It also checks the thing nothing else checks: WHERE THE BED CAME FROM. `assets/music/credits.json`
// records provenance, and every entry in it is currently `licenceVerified: false`. A bed with no
// verified licence under a commercial product film is a Content ID claim waiting to land, so it warns
// loudly and names the file. See engine-doctrine/CRAFT/SOUND.md §Licensing.
//
//   node quality/gates/audio-check.mjs <scene.json> [--strict]   ·   make audio-check D=<file>
//   node quality/gates/audio-check.mjs --all                     ·   make audio-check
// WARN by default; --strict blocks. The library census (--all) never blocks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { population, LIBRARY } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { lowerScene } from '../../core/transitions/lower.js';

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

// Does this scene have a cut, sting or seam for `audio.auto`'s default derivation to score?
// Reuses the SAME pure lowering `films/scene/scene.js` runs before its own `buildSfx` reads
// `data.cuts`/`data.stings`/`data.seams` (and `films/scene/scene.js:buildSfx` reads a layer's own
// `L.cut` too), so this gate cannot read a film's junctions differently than the render path does.
function hasScoredJunction(scene) {
  let data;
  try { data = lowerScene(JSON.parse(JSON.stringify(scene))); } catch { return false; }
  if (Array.isArray(data.cuts) && data.cuts.some((c) => c && c.style !== 'none')) return true;
  if (Array.isArray(data.stings) && data.stings.length) return true;
  if (Array.isArray(data.seams) && data.seams.some((s) => s && s.fx && s.fx !== 'none')) return true;
  const cutLayer = (L) => L && typeof L === 'object'
    && ((L.cut && L.cut !== 'none') || (Array.isArray(L.children) && L.children.some(cutLayer)));
  return Array.isArray(data.layers) && data.layers.some(cutLayer);
}

export function classify(scene) {
  const a = scene && scene.audio;
  const audio = (a && typeof a === 'object') ? a : null;
  if (audio && audio.silent === true) return SILENT;
  // `audio.auto` is a default now (films/scene/scene.js): ON unless a scene says `false` outright.
  const autoOn = !audio || audio.auto !== false;
  const ownsSound = !!audio && (
    (typeof audio.music === 'string' && audio.music !== '')
    || (typeof audio.vo === 'string' && audio.vo !== '')
    // A film can be held together by sound bridges alone (that is the point of them) so a scene
    // whose only audio is a J-cut across its junctions is sounded, not hollow.
    || (Array.isArray(audio.bridges) && audio.bridges.length > 0)
    || (Array.isArray(audio.cues) && audio.cues.length > 0));
  const makesSound = ownsSound || (autoOn && hasScoredJunction(scene));
  if (!audio) return makesSound ? SOUNDED : OMITTED;
  return makesSound ? SOUNDED : HOLLOW;
}

// A reason must be a SENTENCE, not a word. 12 chars is the same floor author-check uses for
// `authoring._why`; matching it means an author learns one rule, not two.
const reasonOf = (a) => {
  const w = a && (a._why || a.why || a.reason);
  return typeof w === 'string' && w.trim().length >= 12 ? w.trim() : null;
};

// THE FINDINGS ARE RECORDS, NOT LINES, AND THAT IS WHAT WIRED THIS GATE INTO THE LADDER.
//
// This gate printed a real verdict for months and nothing anywhere read it: it was not one of
// author-check's steps, and it stated each finding as a tuple in a local array, so
// harness/lib/finding-codes.mjs could not see a single code it emits either. A gate that emits no code
// cannot be cited, ratcheted, waived or routed to a doc, and quality/gates/rung.mjs calls a tag that
// names one a FALSE TAG for exactly that reason. Two failures with one cause: the fact lived in a
// shape only this file understood.
//
// So the codes are written as literals through the shared emitter (engine-doctrine/MISTAKES.md #401). The printed
// line is rendered FROM the record and keeps the wording it always had, so nothing a person reads moved.
const F = gateFindings({
  scene: file,
  line: (r, g) => `    ${g} [${r.code}] ${r.summary}\n        \u2192 ${r.fix}`,
});

// The three shapes of "this film declared nothing to say" (or said it with no reason). Split out of
// `findings` so that function stays one job (the derived-sound checks below); this one is the
// declaration checks. Each message states the CONSEQUENCE (SILENT, and why nobody decided that) rather
// than splitting the sentence across `summary` and `fix`, which used to leave `fix` holding a
// continuation of the description rather than an instruction (a JSON reader saw a broken sentence).
function silenceFindings(state, a) {
  if (state === OMITTED) {
    F.fail('silent-by-omission',
      'this film names no `audio` block and has no cut, sting or seam for the engine\'s default cue '
      + 'derivation to score, so it renders with no sound at all and nobody decided that.',
      { fix: 'Give it a junction to cut on, name a bed (`make media X=audio-bed D=<file> WRITE=1`), or state the silence:\n'
      + '        "audio": { "silent": true, "_why": "why this film is better with no sound" }' });
  } else if (state === SILENT && !reasonOf(a)) {
    F.fail('silence-without-a-reason',
      '`audio.silent:true` with no `_why`. Silence is a legitimate choice and a strong one, but with no '
      + 'stated reason a reviewer cannot tell it apart from a film nobody scored.',
      { fix: 'Write the one line that says what the silence is doing:\n'
      + '        "audio": { "silent": true, "_why": "autoplays muted in-feed; the type carries it alone" }' });
  } else if (state === HOLLOW) {
    F.fail('audio-block-produces-nothing',
      'this scene has an `audio` block, but between it and its own cuts/stings/seams nothing produces a '
      + 'sound: no music, no VO, no cues, no bridges, and either `auto:false` opts out of the default cue '
      + 'derivation or the film has no junction to derive one from. The mixer\'s emptiness guard writes no '
      + 'track at all, so this renders SILENT while `audio-check` reads it as sounded.',
      { fix: 'Name a bed, drop the `auto:false`, or say `"silent": true` with a `_why` and mean it.' });
  }
}

// A DECLARATION IS NOT A TRACK. `auto` defaulting on and an explicit `cues` array both make this
// gate say "this film has sound", and both render DIGITAL SILENCE when `assets/sfx/` is empty: the
// Go mixer resolves each cue to `sfx/<name>.wav` (internal/audio/audio.go:140), finds nothing, and
// writes a silent track. Two films shipped that way this week at -91 dB while this gate printed its
// tick. Checked whenever derivation is actually LIVE, which since the default flip is any scene that
// has not said `auto:false` AND has a junction to score, `a` present or not.
//
// `assets/sfx/` is gitignored build output regenerated by `make gen X=audio`, so a FRESH CLONE is exactly
// the machine where this bites, and it is the machine nobody checks on. The bed already gets this
// treatment (`bed-missing`, below); a cue never did.
// A FILM THAT DECLARED SILENCE HAS NO CUES TO MISS. `silent: true` is the author saying this film
// carries no sound, so asking whether its cue files exist is asking about sound it never wanted, and
// the answer read as a defect. That mattered the moment these codes became blocking: 116 of the
// library's films declare silence, and without this clause every one of them would have been stopped
// by a finding about cues they do not have. engine-doctrine/MISTAKES.md #25 and #159 are the bill for
// exactly that mistake, paid twice; the `sound` step in author-check.mjs cites them.
function cueFindings(scene, a) {
  const declaredSilent = !!(a && a.silent);
  const autoLive = !declaredSilent && (!a || a.auto !== false) && hasScoredJunction(scene);
  if (declaredSilent || !(autoLive || (a && Array.isArray(a.cues) && a.cues.length))) return;
  const dir = path.join(ROOT, 'assets/sfx');
  const have = fs.existsSync(dir) ? new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4))) : new Set();
  const named = new Set(a && Array.isArray(a.cues) ? a.cues.map((c) => c && c.name).filter(Boolean) : []);
  // With `auto`, the cue set is derived from the film's own junctions, so the honest check is
  // whether the sfx pack exists at all rather than which entry a given cut will reach for.
  if (!have.size) {
    F.fail('cues-have-no-sound',
      'this film derives or declares cues (auto by default, or an explicit `cues` array), but '
      + 'assets/sfx/ holds no .wav at all, so every cue resolves to nothing and the mixer writes a '
      + 'SILENT track while this gate reads it as sounded.',
      { fix: 'Bake them:  make gen X=audio' });
  } else {
    const missing = [...named].filter((n) => !have.has(n));
    if (missing.length) F.fail('cue-missing',
      `audio.cues names ${missing.length} sound(s) with no file under assets/sfx/: ${missing.join(', ')}, `
      + 'each one dropped in silence.',
      { fix: 'Run `make gen X=audio`, or name a cue that exists.' });
  }
}

// THE BED: `music`, resolved to a file, credited and licence-checked. Split out of `findings` so
// that function is one job (the declaration/cue checks above); this one is the bed itself.
function bedFindings(scene, a, sceneDir) {
  // `core/audio/select.js` now ALSO defaults `music` to "auto" when a scene names no `music` at all
  // but does declare `profile`: same sentinel, same trap, just no explicit word to have grepped for.
  const impliedAutoMusic = !!(scene && scene.profile) && !(a && 'music' in a);
  if (impliedAutoMusic) {
    F.warn('bed-unresolved',
      '`profile` is set and no `music` is named, so `core/audio/select.js` defaults `music` to the '
      + '"auto" sentinel, resolved at AUTHORING time. The mixer does not run core/audio-select.js at '
      + 'render, so an unresolved "auto" reaching it plays SILENCE.',
      { fix: `Bake it in:  make media X=audio-bed D=${file || '<file>'} WRITE=1` });
  }
  if (!a) return;
  if (a.music === 'auto') {
    F.warn('bed-unresolved',
      '`music:"auto"` is a sentinel resolved at AUTHORING time, not at render: the mixer does not run '
      + 'core/audio-select.js, so an unresolved "auto" reaching it plays SILENCE.',
      { fix: `Bake it in:  make media X=audio-bed D=${file || '<file>'} WRITE=1` });
    return;
  }
  if (typeof a.music !== 'string' || !a.music) return;
  const hit = resolveBed(a.music, sceneDir);
  if (!hit) {
    F.fail('bed-missing',
      `audio.music "${a.music}" resolves to no file: the mixer falls back to SILENCE.`,
      { fix: 'Use a bed that exists under assets/music/ (`make gen X=music-pack`), or a real .wav path.' });
    return;
  }
  const k = bedKey(a.music);
  const c = credits[k];
  if (!c) {
    F.warn('bed-provenance-unknown',
      `bed "${k}" has no entry in assets/music/credits.json: nobody recorded where it came from, so `
      + 'an unattributed track under a commercial product film cannot be defended if it is claimed.',
      { fix: 'Record its source + licence in credits.json, or replace it with a bed that has one.' });
  } else if (c.licenceVerified !== true) {
    F.warn('bed-licence-unverified',
      `bed "${k}" is recorded as ${c.licence || 'an unread licence'} with licenceVerified:false: nobody `
      + `has confirmed the terms allow this use. ${c.note || 'Nobody has read the terms.'}`,
      { fix: 'Read the licence, confirm commercial + no-attribution, then set licenceVerified:true.' });
  }
}

function findings(scene, sceneDir) {
  const out = F.records;
  const a = (scene && typeof scene.audio === 'object' && scene.audio) || null;
  const state = classify(scene);
  silenceFindings(state, a);
  cueFindings(scene, a);
  bedFindings(scene, a, sceneDir);

  if (a && typeof a.musicGain === 'number' && a.musicGain === 0 && !a.vo) {
    F.warn('bed-muted',
      '`musicGain: 0` mutes the bed entirely. That is silence with extra steps.',
      { fix: 'Either give it a level, or drop the bed and declare the silence honestly.' });
  }
  return { state, out };
}

// ---- library census ---------------------------------------------------------------------------
// The four counts, because "we ship silent" was a feeling until somebody counted. `auto` cue
// derivation now defaults ON, so OMITTED/HOLLOW here are what is left AFTER that default: a film with
// nothing for it to derive from, or one that opted out and named no sound of its own. SILENT is an
// author's decision and stays exactly as authored either way.
if (all) {
  const dir = path.join(ROOT, 'films/scene');
  const tally = { [OMITTED]: [], [SILENT]: [], [HOLLOW]: [], [SOUNDED]: [] };
  let reasoned = 0;
  // Population through harness/lib/census.mjs: it states N and refuses a checkout that cannot see the
  // library, instead of reporting "everybody ships silent" over a third of it.
  const pop = population('sound census', { filter: LIBRARY, quiet: true });
  for (const f of pop.names) {
    let s; try { s = readJSON(path.join(dir, f)); } catch { continue; }
    const st = classify(s);
    tally[st].push(f);
    if (st === SILENT && reasonOf(s.audio)) reasoned++;
  }
  const n = Object.values(tally).reduce((a, b) => a + b.length, 0);
  console.log(`\n  sound census · ${n} scene(s) in films/scene\n`);
  console.log(`    ${String(tally[SOUNDED].length).padStart(4)}  sounded          a bed, a VO, cues, or a derived auto cue: the mixer writes a track`);
  console.log(`    ${String(tally[SILENT].length).padStart(4)}  silent:true      ${reasoned} of them state a reason`);
  console.log(`    ${String(tally[OMITTED].length).padStart(4)}  no audio key     no junction to derive a cue from either: silent, nobody decided it`);
  console.log(`    ${String(tally[HOLLOW].length).padStart(4)}  hollow block     opted out (or nothing to derive) and names no sound of its own`);
  console.log(`\n  A scene that says silent:true keeps its silence. That is an author's decision and it stays.\n`);
  for (const f of tally[OMITTED]) console.log(`      · no audio key: ${f}`);
  for (const f of tally[HOLLOW]) console.log(`      · hollow block: ${f}`);
  console.log('');
  process.exit(0);
}

if (!file || !fs.existsSync(file)) {
  console.error('usage: node quality/gates/audio-check.mjs <scene.json> [--strict]  |  --all');
  process.exit(2);
}
const scene = readJSON(file);
const { state, out } = findings(scene, path.dirname(path.resolve(file)));
const blocking = out.filter((f) => f.severity === 'error');

console.log(`\n  sound gate · ${file}  (${state})`);
if (!out.length) {
  const a = scene.audio || {};
  console.log(state === SILENT
    ? `  ✓ silent, and it says why: "${reasonOf(a)}"\n`
    : `  ✓ this film has sound.\n`);
  process.exit(0);
}
F.emit();
console.log(strict && blocking.length
  ? `\n  ✗ sound gate (strict): ${blocking.length} finding(s) block.\n`
  : `\n  Sound is a structural device, not decoration. Docs/CRAFT/SOUND.md. Block these with --strict.\n`);
process.exit(strict && blocking.length ? 1 : 0);
