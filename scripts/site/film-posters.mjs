// scripts/site/film-posters.mjs · one still per live film, for the film cards at rest.
//
//   node scripts/site/film-posters.mjs
//
// The films are the ones site/app/components/films.ts lists; each is a scene under
// site/public/scenes/. A card shows this still until it is hovered, then boots the engine on the
// same scene, so the still is a frame of the real film and cannot drift from it: rerun this after
// a film's scene changes. Writes site/public/assets/film-posters/<id>.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, waitForEngine } from '../../harness/lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILMS_TS = path.join(repoRoot, 'site/app/components/films.ts');
const OUT = path.join(repoRoot, 'site/public/assets/film-posters');

const ids = [...fs.readFileSync(FILMS_TS, 'utf8').matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
if (!ids.length) { console.error(`✗ no film ids found in ${path.relative(repoRoot, FILMS_TS)}`); process.exit(1); }

// A third of the way in: past the opening beat, which is often a bare title on the ground, and
// before the closing lockup, so the still shows the film at work.
const POSTER_AT = 1 / 3;

fs.mkdirSync(OUT, { recursive: true });
const { server, port } = await serveRepo();
// A card is at most ~700px wide; 1920x1080 at half scale is 960x540.
const { browser, page } = await launchPage({ width: 1920, height: 1080, scale: 1 / 2 });

let failed = 0;
for (const id of ids) {
  const scene = JSON.parse(fs.readFileSync(path.join(repoRoot, 'site/public/scenes', `${id}.json`), 'utf8'));
  await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/site/public/scenes/${id}.json&fps=30&aspect=${encodeURIComponent(scene.aspect ?? '16:9')}`, { waitUntil: 'load' });
  const boot = await waitForEngine(page, { throwOnTimeout: false });
  if (boot) { console.error(`  ✗ ${id}: ${boot}`); failed++; continue; }
  await page.evaluate((f) => window.__engine.renderFrame(f), Math.round(scene.duration * POSTER_AT * 30));
  fs.writeFileSync(path.join(OUT, `${id}.jpg`), await page.screenshot({ type: 'jpeg', quality: 78 }));
  console.log(`  ✓ ${id}`);
}

await browser.close();
server.close();
if (failed) process.exit(1);
console.log(`✓ ${ids.length - failed} film posters → ${path.relative(repoRoot, OUT)}`);
