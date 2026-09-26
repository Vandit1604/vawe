// tests/media/light-map.test.mjs: house-rule self-check, no framework.
//   node tests/media/light-map.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lightMap, lightMapDistance, lightMapPNG } from '../../harness/lib/light-map.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'light-map-test-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

try {
  // (a) a flat colour field, averaged, must come back as that same colour in every cell (identity of
  // the area average: a still image with nothing to average away).
  const flat = path.join(tmp, 'flat.png');
  ff(['-f', 'lavfi', '-i', 'color=c=#804020:s=160x90', '-frames:v', '1', flat]);
  const flatMap = lightMap(flat);
  assert(flatMap.length === 9 && flatMap[0].length === 16, `expected a 9x16 grid, got ${flatMap.length}x${flatMap[0].length}`);
  for (const row of flatMap) for (const [r, g, b] of row)
    assert(Math.abs(r - 0x80) <= 5 && Math.abs(g - 0x40) <= 5 && Math.abs(b - 0x20) <= 5,
      `a flat field must average back to its own colour, got rgb(${r},${g},${b})`);
  console.log('✓ light-map.test.mjs: a flat field averages back to itself');

  // (b) half white / half black, averaged over the WHOLE image in linear light, must land brighter
  // than the sRGB midpoint (128): gamma-space averaging under-counts a bright half against a dark one,
  // which is the exact miss this module exists to avoid.
  const half = path.join(tmp, 'half.png');
  ff(['-f', 'lavfi', '-i', 'color=c=white:s=80x90', '-f', 'lavfi', '-i', 'color=c=black:s=80x90',
    '-filter_complex', 'hstack', '-frames:v', '1', half]);
  const halfMap = lightMap(half, { cols: 1, rows: 1 });
  const [r] = halfMap[0][0];
  assert(r > 150, `linear-light average of half white/half black must read brighter than the sRGB midpoint 128, got ${r}`);
  console.log(`✓ light-map.test.mjs: linear-light average of a half/half field reads bright (${r}), not the sRGB midpoint`);

  // (c) distance: a map against itself is 0; a clearly different map is clearly more than 0.
  assert(lightMapDistance(flatMap, flatMap) === 0, 'a light map compared with itself must be distance 0');
  const black = flatMap.map((row) => row.map(() => [0, 0, 0]));
  const dist = lightMapDistance(flatMap, black);
  assert(dist > 10, `a flat colour field against solid black must score a clear distance, got ${dist}`);
  console.log(`✓ light-map.test.mjs: distance is 0 against itself and clearly positive against black (${dist.toFixed(1)})`);

  // (d) lightMapPNG writes a real, readably-sized grid image.
  const png = lightMapPNG(flatMap, path.join(tmp, 'grid.png'), { cell: 10 });
  assert(fs.existsSync(png), 'lightMapPNG must write a file');
  const size = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0', png], { encoding: 'utf8' }).trim();
  assert(size === '160,90', `expected a 160x90 grid image (16x9 cells at 10px), got ${size}`);
  console.log('✓ light-map.test.mjs: lightMapPNG writes a correctly-sized grid image');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('light-map.test.mjs: ok');
