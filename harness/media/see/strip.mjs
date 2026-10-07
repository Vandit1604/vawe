// `vawe strip`: the frames through one moment of a film, as ONE grid, with the motion numbers of that window.
// The frames come from runShot (--shot), the one extractor; this file picks the windows and reads the energy.
import fs from 'node:fs';
import path from 'node:path';
import { refsDir, refSharpVideo, refShots } from '../../lib/refs.mjs';
import { computeEnergy, die, HOLD_FLOOR, probeVideo } from './core.mjs';
import { runShot } from './compare.mjs';
import { energyLines, filmNameOf, motionLines, motionRead, shotCuts, stripWindow, worldCuts } from './strip-math.mjs';

/** { video, name, cuts } of an input: a page (its last draft), an mp4, or a reference id. `cuts()` returns the world changes or shots; it dies naming the command to run when they are not measured. */
export async function resolveInput(input) {
  if (input.endsWith('.html')) {
    if (!fs.existsSync(input)) die(`no such page: ${input}`);
    const { defaultOut } = await import('../render-page.mjs');
    const video = defaultOut(input, { aspect: '16:9', suffixAspect: false, final: false });
    const name = filmNameOf(video);
    return { video, name, page: input, cuts: () => filmCuts(name, input), draftMissing: !fs.existsSync(video), draftOld: fs.existsSync(video) && fs.statSync(video).mtimeMs < fs.statSync(input).mtimeMs };
  }
  if (fs.existsSync(input)) {
    const name = filmNameOf(input);
    return { video: input, name, cuts: () => filmCuts(name, null) };
  }
  const video = refSharpVideo(refsDir(), input);
  if (!video) die(`${input} is not a file, a page or a reference film id (bin/vawe refs list)`);
  return { video, name: input, cuts: () => refCuts(input) };
}

async function filmCuts(name, page) {
  const { lastWorlds } = await import('../acceptance-run.mjs');
  const worlds = lastWorlds(name);
  if (!worlds) die(`no measured data-world spans for ${name}: run bin/vawe dev ${page ?? `films/${name}/page.html`} first (a full draft, no --from or --to), then repeat`);
  const cuts = worldCuts(worlds);
  const unseen = worlds.filter((w) => w.start == null).map((w) => w.id);
  if (unseen.length) console.log(`note: the last draft never showed ${unseen.join(', ')} (a --from/--to draft covers part of the film): run bin/vawe dev ${page ?? `films/${name}/page.html`} with no range for every cut`);
  if (!cuts.length) die(`${name}: no world change measured`);
  return cuts;
}

function refCuts(id) {
  const cuts = shotCuts(refShots(refsDir(), id));
  if (!cuts.length) die(`no measured shots for ${id}: run bin/vawe spec on the film, or pass --at <s>`);
  return cuts;
}

/** The seconds of the cuts of a page or mp4, for `vawe compare --at cuts`. */
export async function cutSeconds(input) {
  const { cuts } = await resolveInput(input);
  return (await cuts()).map((c) => +c.at.toFixed(2));
}

function stripOne(video, outRoot, energy, { at, span, fps }, dur) {
  const { from, to } = stripWindow(at, span, dur);
  const { gridPaths } = runShot(video, outRoot, from, to, fps, { energy, quiet: true });
  return { from, to, gridPaths, read: motionRead(energy, from, to, HOLD_FLOOR) };
}

function printStrip(title, r, fps, { compact, energy }) {
  console.log(`\n${title}`);
  for (const p of r.gridPaths) console.log(`  ${p}`);
  console.log(`  window ${r.from.toFixed(2)}-${r.to.toFixed(2)} s, frames every ${(1 / fps).toFixed(3)} s, left to right, top to bottom`);
  for (const l of energyLines(energy, r.from, r.to, { compact })) console.log(`  ${l}`);
  for (const l of motionLines(r.read, HOLD_FLOOR)) console.log(`  ${l}`);
}

/** Runs `vawe strip`: one grid at `opts.at`, or one per cut with `opts.cuts`. Prints the absolute path of each grid and the motion numbers. */
export async function runStrip(input, opts) {
  const found = await resolveInput(input);
  if (found.draftMissing) die(`no draft of ${input} yet: run bin/vawe dev ${found.page} first (it writes ${found.video}), then repeat`);
  if (found.draftOld) console.log(`note: ${found.video} is older than ${found.page}; run bin/vawe dev ${found.page} for the current page`);
  const { dur } = probeVideo(found.video);
  const energy = computeEnergy(found.video);
  const outRoot = path.resolve(opts.out ?? path.join('out', 'strip', found.name));
  const common = { span: opts.span, fps: opts.fps };
  if (!opts.cuts) {
    printStrip(`strip of ${found.video} at ${opts.at.toFixed(2)} s`, stripOne(found.video, outRoot, energy, { at: opts.at, ...common }, dur), opts.fps, { compact: false, energy });
    return;
  }
  const cuts = await found.cuts();
  console.log(`${cuts.length} cut${cuts.length === 1 ? '' : 's'} in ${found.video}, one strip each (${opts.span} s centred on the cut)`);
  for (const [i, c] of cuts.entries()) printStrip(`${i + 1}. ${c.from} to ${c.to}, cut at ${c.at.toFixed(2)} s`, stripOne(found.video, outRoot, energy, { at: c.at, ...common }, dur), opts.fps, { compact: true, energy });
}
