import fs from 'node:fs';
import { refsDir, refSharpVideo, refShots } from '../../lib/refs.mjs';
import { die } from './core.mjs';
import { filmNameOf, shotCuts, worldCuts } from './strip-math.mjs';

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
