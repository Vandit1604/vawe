// The speed pass must see the edge a viewer sees: a clip-path that closes and a square that turns about
// 45 degrees both leave the bounding box almost still. Needs Chrome.
//   node --test tests/media/render-edge-travel.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openPage, resolveFrame } from '../../harness/media/render-page.mjs';
import { sampleBoxTracks } from '../../harness/lib/box-track.mjs';
import { edgeTravelDeltas } from '../../harness/lib/edge-travel.mjs';

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="duration" content="1">
<style>body{margin:0;background:#000}#clip{position:absolute;inset:0;background:#f80}
#turn{position:absolute;left:800px;top:400px;width:300px;height:300px;background:#fff}</style></head>
<body><div id="clip"></div><div id="turn"></div><script>
document.getElementById('clip').animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: 'inset(0px 1000px 0px 0px round 40px)' }], { duration: 1000, fill: 'both' });
document.getElementById('turn').animate([{ rotate: '0deg' }, { rotate: '90deg' }], { duration: 1000, fill: 'both' });
</script></body></html>`;

test('the speed pass measures a closing clip and a turn at 45 degrees', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-travel-'));
  const pagePath = path.join(dir, 'page.html');
  fs.writeFileSync(pagePath, PAGE);
  const opened = await openPage(pagePath, resolveFrame(pagePath, { final: true }));
  try {
    await opened.page.goto(opened.url, { waitUntil: 'load' });
    const { tracks } = await sampleBoxTracks(opened.page, [0.49, 0.5, 0.51], 'animated');
    const [clip, turn] = tracks.map((t) => edgeTravelDeltas([t]));
    assert.ok(Math.abs(clip[0] - 10) < 0.5, `clip edge travel ${clip[0]} px per 10 ms, expected 10`);
    const arc = (0.9 * Math.PI / 180) * Math.hypot(300, 300) / 2;
    assert.ok(turn[1] > arc * 0.9, `turn edge travel ${turn[1]} px, expected about ${arc.toFixed(2)}`);
  } finally { await opened.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
