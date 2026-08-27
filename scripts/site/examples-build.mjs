// scripts/site/examples-build.mjs: rebuild the whole example showcase from the committed sources.
// For each registry entry: if its video is a `.beatsync.mp4`, beat-sync the source onto its own music
// (deterministic) and render that; otherwise render the source directly. Then build the gallery. This
// is what makes the examples reproducible fixtures. A clean clone runs `make examples` and gets the
// same showcase (after `make music-pack` for the beat-synced ones). Run via `make examples`.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });

const reg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats/scene/examples.json'), 'utf8'));
for (const it of reg.examples || []) {
  const source = path.join('formats/scene', it.source);
  const scene = JSON.parse(fs.readFileSync(path.join(repoRoot, source), 'utf8'));
  let target = source;
  if (it.video.endsWith('.beatsync.mp4')) {
    const music = scene.audio && scene.audio.music;
    if (!music) { console.warn(`  ⚠ ${it.title}: registry says beatsync but source has no audio.music, rendering source instead.`); }
    else {
      console.log(`▶ ${it.title}: beatsync onto ${music}`);
      run('node', ['scripts/media/beatsync.mjs', source, '--music', music, '--write']);
      target = source.replace(/\.json$/, '.beatsync.json');
    }
  }
  // Blocks are build-time sugar: the renderer rejects an un-expanded `{type:"block"}` layer outright.
  // Without this step a flagship example could not use the repo's own charting vocabulary at all, which
  // matters for any example whose point is the chart it draws. Expanded IN PLACE so
  // the artefact keeps the name the registry asks for (`<name>.beatsync.mp4`); the target is already a
  // generated derivative by this point, or the source itself when there is nothing to expand.
  const hasSugar = (L) => Array.isArray(L) && L.some((l) => l && (l.type === 'block' || l.type === 'comp' || hasSugar(l.children)));
  if (hasSugar(JSON.parse(fs.readFileSync(path.join(repoRoot, target), 'utf8')).layers)) {
    if (target === source) {
      // never expand a COMMITTED source in place: that would strip the sugar the author wrote and leave
      // the raw layers behind. Build a copy under the same BASENAME, since the renderer names the mp4
      // after it and the registry expects that exact name.
      const build = path.join('build/examples', path.basename(source));
      fs.mkdirSync(path.join(repoRoot, 'build/examples'), { recursive: true });
      fs.copyFileSync(path.join(repoRoot, source), path.join(repoRoot, build));
      target = build;
    }
    console.log(`▶ ${it.title}: expand blocks → ${target}`);
    run('node', ['scripts/author/expand-blocks.mjs', target, target]);
  }

  console.log(`▶ ${it.title}: render ${target}`);
  run('./bin/vawe', [target]);
}

console.log('▶ gallery');
run('node', ['scripts/site/examples-gallery.mjs']);
