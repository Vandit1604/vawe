// scripts/dev/grab-beats.mjs — grab an explicit list of timestamps from a scene.
// `make styleframes` picks frames by visual distinctness, so it cannot be aimed at a beat.
// Usage: node scripts/dev/grab-beats.mjs <scene.json> <outDir> <t1> <t2> ...
import fs from 'node:fs';
import path from 'node:path';
import { openScene } from '../author/scene-page.mjs';

const [, , file, outDir, ...times] = process.argv;
if (!file || !outDir || !times.length) {
  console.error('usage: grab-beats.mjs <scene.json> <outDir> <seconds...>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const page = await openScene(file, { scale: 1 });
for (const raw of times) {
  const t = Number(raw);
  const out = path.join(outDir, `t-${String(t).replace('.', 'p')}s.png`);
  await page.grab(t, out);
  console.log(out);
}
await page.close();
