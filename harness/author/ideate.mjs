// harness/author/ideate.mjs: THE FILM, IN PLAIN WORDS, before any JSON exists. Stage 1.5, between
// brief and plan (AGENTS.md's eight stages). Writes ONE human-readable prompt: the film act by act,
// what is on screen, how it enters and leaves, the ground and its colour, the camera, the pace, and
// which recipe (recipes/README.md) each joint uses. The owner reads it, edits it by hand, and the
// harness builds the storyboard from it. This file never writes a storyboard or a scene JSON itself.
//
//   node harness/author/ideate.mjs --ref example-madera            (from a reference: grammar/<ref>.json)
//   node harness/author/ideate.mjs --name <film> --idea "..."       (from an idea: acts left <fill:>)
//   node harness/author/ideate.mjs --name <film> --idea "..." --ref example-madera   (idea, ref's structure)
//   node harness/author/ideate.mjs --self-test
//   make ideate REF=example-madera   ·   make ideate NAME=<film> IDEA="..." [REF=<ref>]
//
// NUMBERS COME FROM THE STUDY, NEVER FROM MEMORY. `grammar/<ref>.json` (make study) carries the real
// shot list and the real seams: t, gap, axis, direction, ground before/after. What the study cannot
// measure (what is literally on screen, how it moves, the camera, the type) is never invented: this
// writes a marked placeholder `<look: 4.54s to 6.00s, see <strip path>>` and extracts the frames that
// answer it, so a person (or an agent told to look) fills it by LOOKING, not by guessing.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RECIPES } from '../../recipes/index.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── pure parts (self-tested below) ─────────────────────────────────────────────────────────────────

/** buildActs(shots, seams) → one act per shot, with the measured seam either side attached (or null
 * at the film's open/close). `seams[k]` sits between `shots[k]` and `shots[k+1]` (0-indexed): the
 * study writes it that way (seam.t === shots[k+1].t0 === shots[k].t0+shots[k].len). */
export function buildActs(shots, seams) {
  return shots.map((s, k) => ({
    i: s.i, t0: s.t0, t1: +(s.t0 + s.len).toFixed(2), len: s.len,
    ground: s.ground, luma: s.luma, accent: s.accent,
    entersFrom: k > 0 ? seams[k - 1] : null,
    leavesTo: k < seams.length ? seams[k] : null,
  }));
}

/** buildJoints(seams) → one joint per seam, naming the acts either side (1-indexed, matching the
 * act headings this file prints). */
export function buildJoints(seams) {
  return seams.map((s, k) => ({ ...s, outAct: k + 1, inAct: k + 2 }));
}

/** recipeLineFor(joint) → the exact storyboard syntax harness/lib/contract.mjs#parseRecipeLine reads:
 * `<name> out=<id> in=<id> axis=<x|y>`. Picks the one promoted recipe of kind "seam"; a film with more
 * than one seam recipe would need a real choice here, not a menu (that's what `pickRecipe` refuses). */
export function recipeLineFor(joint, recipes = RECIPES) {
  const name = Object.keys(recipes).find((n) => recipes[n].kind === 'seam');
  if (!name) return null;
  return `${name} out=act${joint.outAct} in=act${joint.inAct} axis=${joint.axis}`;
}

/** recipeMenu(recipes) → one line per known recipe: name, kind, blurb, first source. Used in IDEA mode,
 * where no joint is measured yet, so the author picks structure from what real films actually do. */
export function recipeMenu(recipes = RECIPES) {
  return Object.entries(recipes).map(([name, r]) =>
    `- ${name} (${r.kind}): ${r.blurb} [first source: ${r.sources[0].ref}@${r.sources[0].t}s]`);
}

const nearestAspect = (w, h) => {
  const CANVASES = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3 };
  const ratio = w / h;
  return Object.entries(CANVASES).sort((a, b) => Math.abs(a[1] - ratio) - Math.abs(b[1] - ratio))[0][0];
};

// ── strips: the frames that answer a <look:> marker ────────────────────────────────────────────────

/** Resolve the clip for a studied ref: an explicit --clip, else refs/_clips/<ref>.mp4 in this tree,
 * else the same path in the main tree (refs/ is gitignored, so a worktree usually doesn't have it). */
export function resolveClip(ref, explicit) {
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const here = path.join(ROOT, 'refs/_clips', `${ref}.mp4`);
  if (fs.existsSync(here)) return here;
  try {
    const commonGitDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const mainRoot = path.dirname(commonGitDir); // .git's parent, when not bare
    const there = path.join(mainRoot, 'refs/_clips', `${ref}.mp4`);
    if (fs.existsSync(there)) return there;
  } catch { /* not a git repo, or no common dir: fall through to null */ }
  return null;
}

/** One dense strip (filmstrip.mjs) for a time window, copied out of its scratch dir (filmstrip.mjs
 * clears that dir on every run, so it must be copied before the next window overwrites it) into
 * refs/<ref>/ideate-strips/, which sits beside refs/<ref>/ from `make study` and is gitignored the
 * same way: frames from someone else's film never get published (AGENTS.md, "never embed copyrighted
 * material"). Returns the copied sheet path, or null if ffmpeg found nothing (reported, not silenced). */
function extractStrip(clip, ref, label, from, to, fps) {
  const outDir = path.join(ROOT, 'refs', ref, 'ideate-strips');
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync(process.execPath, [path.join(ROOT, 'harness/author/filmstrip.mjs'),
    `VIDEO=${clip}`, `FROM=${from}`, `TO=${to}`, `FPS=${fps}`], { encoding: 'utf8', env: { ...process.env, VIDEO: clip, FROM: String(from), TO: String(to), FPS: String(fps) } });
  const sheet = /^\s+(\/\S+sheet-\d+\.png)/m.exec(r.stdout || '');
  if (!sheet) { console.error(`  ! strip ${label} (${from}s-${to}s) failed: ${(r.stderr || r.stdout || '').slice(0, 200)}`); return null; }
  const dest = path.join(outDir, `${label}.png`);
  fs.copyFileSync(sheet[1], dest);
  return path.relative(ROOT, dest);
}

const look = (from, to, stripPath) => stripPath
  ? `<look: ${from}s to ${to}s, see ${stripPath}>`
  : `<look: ${from}s to ${to}s, no clip found, extract by hand: make filmstrip VIDEO=<clip> FROM=${from} TO=${to} FPS=12>`;

// ── prompt assembly ─────────────────────────────────────────────────────────────────────────────────

function actSection(act, ref, clip) {
  const stripAct = clip ? extractStrip(clip, ref, `act${act.i}`, act.t0, act.t1, act.len < 2 ? 20 : 12) : null;
  const lines = [`## Act ${act.i} (${act.t0}s-${act.t1}s)`];
  lines.push(`on screen: ${look(act.t0, act.t1, stripAct)}`);
  if (act.entersFrom) {
    const j = act.entersFrom;
    lines.push(`enters: from the ${j.direction.split('-to-')[0]} along the ${j.axis} axis (measured, gap ${j.gap}s)`);
  } else lines.push('enters: (film opens, no prior joint)');
  if (act.leavesTo) {
    const j = act.leavesTo;
    const from = +Math.max(0, j.t - 0.3).toFixed(2), to = +(j.t + 0.3).toFixed(2);
    const stripJoint = clip ? extractStrip(clip, ref, `joint-${act.i}-${act.i + 1}`, from, to, 20) : null;
    lines.push(`leaves: toward the ${j.direction.split('-to-')[1]} along the ${j.axis} axis (measured, gap ${j.gap}s). ${look(from, to, stripJoint)} for what exits`);
  } else lines.push('leaves: (film ends, no next joint)');
  lines.push(`ground: ${act.ground}${act.accent ? `, ${act.accent}` : ''} (measured, luma ${act.luma})`);
  lines.push(`camera: ${look(act.t0, act.t1, stripAct)}`);
  lines.push(`type: ${look(act.t0, act.t1, stripAct)}`);
  return lines.join('\n');
}

function jointSection(joint) {
  const line = recipeLineFor(joint);
  const lines = [`## Joint at ${joint.t}s`];
  lines.push(line ? `recipe: ${line}` : '(no promoted seam recipe yet: recipes/recipes.json has none of kind "seam")');
  lines.push(`measured: gap ${joint.gap}s, axis ${joint.axis}, ground ${joint.groundBefore} to ${joint.groundAfter}`);
  return lines.join('\n');
}

function fillActSection(i, t0, t1) {
  return [`## Act ${i} (${t0}s-${t1}s)`, 'on screen: <fill: what is on screen>', 'enters: <fill: how it enters>',
    'leaves: <fill: how it leaves>', 'ground: <fill: colour>', 'camera: <fill: still, push, drift>',
    'type: <fill: what carries the copy>'].join('\n');
}

function fillJointSection(t) {
  return [`## Joint at ${t}s`, 'recipe: <fill: pick one from the menu below, or write the line by hand>'].join('\n');
}

/** buildRefPrompt(ref, grammar) → the prompt text for `make ideate REF=<ref>`. Exported so tests can
 * check the shape without shelling out to ffmpeg. */
export function buildRefPrompt(ref, grammar, clip) {
  const { measured, shots, seams, groundPattern } = grammar;
  const acts = buildActs(shots, seams);
  const joints = buildJoints(seams);
  const aspect = `${measured.width}:${measured.height} (nearest canvas ${nearestAspect(measured.width, measured.height)})`;
  const header = [
    `# ${ref} · film prompt`,
    '',
    `<fill: the film in one breath>`,
    '',
    `duration: ${measured.duration}s · aspect: ${aspect} · pace: median act ${measured.medianShot}s, ` +
      `${measured.cutsPerMinute} joints/min · ground: ${groundPattern}`,
    '',
  ];
  const body = [];
  acts.forEach((act, k) => {
    body.push(actSection(act, ref, clip), '');
    if (act.leavesTo) body.push(jointSection(joints[k]), '');
  });
  const footer = [
    '## Change me',
    'Every `<look:>` line names a real frame: open it, then replace the marker with what you see, never',
    'from memory. `on screen`, `camera` and `type` are always yours to rewrite once looked at. `ground`,',
    '`enters`, `leaves` and the recipe lines are measured off the reference: change them only if you want',
    'a different reference feel, and keep the recipe line syntax (harness/lib/contract.mjs#parseRecipeLine)',
    'so `make assemble` can still read it once this becomes a storyboard.',
  ];
  return [...header, ...body, ...footer].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** buildIdeaPrompt(name, idea, refGrammar?) → the prompt text for `make ideate NAME= IDEA=`. Without
 * `--ref`, a modest default structure (ACTS acts over DUR seconds); with it, the reference's own act
 * count and joint axes are copied as structure, content left to fill (never its content, which would
 * be lifting a real film's copy). */
export function buildIdeaPrompt(name, idea, { dur = 12, actsCount = 4, refGrammar = null } = {}) {
  const acts = refGrammar
    ? buildActs(refGrammar.shots, refGrammar.seams)
    : Array.from({ length: actsCount }, (_, k) => ({ i: k + 1, t0: +((k * dur) / actsCount).toFixed(2), t1: +(((k + 1) * dur) / actsCount).toFixed(2) }));
  const joints = refGrammar ? buildJoints(refGrammar.seams) : acts.slice(0, -1).map((a, k) => ({ t: a.t1, axis: 'x', outAct: k + 1, inAct: k + 2 }));
  const total = refGrammar ? refGrammar.measured.duration : dur;
  const header = [
    `# ${name} · film prompt`,
    '',
    idea ? `the idea: ${idea}` : '<fill: the idea, in one breath>',
    '',
    `duration: ${total}s (fill in)${refGrammar ? ` · structure copied from ${refGrammar.name}` : ''}`,
    '',
  ];
  const body = [];
  acts.forEach((act, k) => {
    body.push(fillActSection(act.i, act.t0, act.t1), '');
    if (k < joints.length) body.push(fillJointSection(joints[k].t), '', ...recipeMenu(), '');
  });
  const footer = ['## Change me', 'Every line is `<fill:>`. Pick a recipe from the menu printed under each joint',
    'instead of inventing a transition; recipes/README.md explains the format and how to add one.'];
  return [...header, ...body, ...footer].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// ── self-test (the pure parts: joints → acts, seam → recipe line) ─────────────────────────────────
function selfTest() {
  const shots = [{ i: 1, t0: 0, len: 4.54, ground: 'light', luma: 209.1, accent: '#def9fe' },
    { i: 2, t0: 4.54, len: 1.46, ground: 'light', luma: 221.1, accent: null }];
  const seams = [{ t: 4.54, gap: 0.1, axis: 'x', direction: 'right-to-left', groundBefore: '#ecefec', groundAfter: '#ebeeeb' }];
  const acts = buildActs(shots, seams);
  assert.equal(acts.length, 2);
  assert.equal(acts[0].t0, 0); assert.equal(acts[0].t1, 4.54); assert.equal(acts[0].entersFrom, null);
  assert.equal(acts[0].leavesTo.t, 4.54);
  assert.equal(acts[1].entersFrom.t, 4.54); assert.equal(acts[1].leavesTo, null);

  const joints = buildJoints(seams);
  assert.equal(joints[0].outAct, 1); assert.equal(joints[0].inAct, 2);
  assert.equal(recipeLineFor(joints[0]), 'flow-seam out=act1 in=act2 axis=x');

  const fakeRecipes = { 'flow-seam': RECIPES['flow-seam'] };
  const menu = recipeMenu(fakeRecipes);
  assert.equal(menu.length, 1);
  assert.match(menu[0], /^- flow-seam \(seam\): /);

  console.log('ideate.mjs self-test: ok (buildActs, buildJoints, recipeLineFor, recipeMenu)');
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }
  const flag = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
  const ref = flag('ref');
  const name = flag('name');
  const idea = flag('idea');
  const clipArg = flag('clip');

  if (!ref && !name) {
    console.error('usage: node harness/author/ideate.mjs --ref <ref>   |   --name <film> --idea "..." [--ref <ref>]');
    process.exit(2);
  }

  if (ref && !name) {
    // FROM A REFERENCE VIDEO.
    const grammarPath = path.join(ROOT, 'grammar', `${ref}.json`);
    if (!fs.existsSync(grammarPath)) {
      console.error(`ideate: no study for "${ref}" (${path.relative(ROOT, grammarPath)} does not exist).`);
      console.error(`  Run this first: make study VIDEO=refs/_clips/${ref}.mp4 NAME=${ref} STRIPS=3 STRIPFPS=10`);
      process.exit(1);
    }
    const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
    if (!Array.isArray(grammar.seams) || !grammar.seams.length) {
      console.error(`ideate: ${path.relative(ROOT, grammarPath)} has no measured seams yet. Re-run the study.`);
      process.exit(1);
    }
    // Forward-compat with the fuller-coverage study (refs/<name>/pages*, grammar.coverage.ledger):
    // once a study can say its frame coverage is incomplete, ideate refuses rather than building a
    // prompt off a partial read. Inert today: no study writes `coverage` yet.
    if (grammar.coverage && grammar.coverage.ledger && grammar.coverage.ledger !== 'complete') {
      console.error(`ideate: ${ref}'s coverage ledger is "${grammar.coverage.ledger}", not "complete". Run: make study-check NAME=${ref}`);
      process.exit(1);
    }
    const clip = resolveClip(ref, clipArg);
    if (!clip) console.error(`  ! no clip found for "${ref}" (checked --clip, refs/_clips/, and the main tree). Every <look:> will point at ffmpeg you run by hand.`);
    const prompt = buildRefPrompt(ref, grammar, clip);
    const out = path.join(ROOT, 'grammar', `${ref}.prompt.md`);
    fs.writeFileSync(out, prompt);
    console.log(`ideate → ${path.relative(ROOT, out)}`);
    return;
  }

  // FROM AN IDEA.
  if (!idea && !ref) { console.error('ideate: --name needs --idea "..." (and optionally --ref <ref> for structure).'); process.exit(2); }
  let refGrammar = null;
  if (ref) {
    const grammarPath = path.join(ROOT, 'grammar', `${ref}.json`);
    if (!fs.existsSync(grammarPath)) {
      console.error(`ideate: --ref ${ref} has no study yet. Run: make study VIDEO=refs/_clips/${ref}.mp4 NAME=${ref} STRIPS=3 STRIPFPS=10`);
      process.exit(1);
    }
    refGrammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
  }
  const prompt = buildIdeaPrompt(name, idea, { refGrammar });
  const out = path.join(ROOT, 'formats/scene', `${name}.prompt.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, prompt);
  console.log(`ideate → ${path.relative(ROOT, out)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
