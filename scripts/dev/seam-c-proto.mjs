// scripts/dev/seam-c-proto.mjs: does the Seam C technique hold renderFrame(n) purity?
//
//   node scripts/dev/seam-c-proto.mjs
//
// Serves the repo, renders five frames forwards, backwards, shuffled and again, and compares pixel
// hashes. See the header of seam-c-proto.html for what this is and why it exists.
import puppeteer from 'puppeteer'; import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo } from '../lib/render-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8917;
// file:// cannot load an ES module, so the proof needs an origin. Its own server rather than a make
// target, so this stays one command with nothing to remember.
const { server } = await serveRepo({ port: PORT });

const b = await puppeteer.launch({ args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setCacheEnabled(false);
p.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
await p.goto(`http://127.0.0.1:${PORT}/scripts/dev/seam-c-proto.html`);
await p.waitForFunction("document.title === 'READY'", { timeout: 20000 });
const order = [0, 12, 25, 40, 60];
const fwd = await p.evaluate((n) => window.__frames(n), order);
const rev = await p.evaluate((n) => window.__frames(n), [...order].reverse());
const shuf = await p.evaluate((n) => window.__frames(n), [40, 0, 60, 12, 25]);
const again = await p.evaluate((n) => window.__frames(n), order);
const byT = new Map([40, 0, 60, 12, 25].map((t, i) => [t, shuf[i].hash]));
const eq = (a, c) => a.every((x, i) => x.hash === c[i].hash);
console.log('lit pixels     :', fwd.map((f) => f.lit).join(' '));
console.log('distinct frames:', new Set(fwd.map((f) => f.hash)).size, 'of', order.length);
console.log('replayed       :', eq(fwd, again) ? 'IDENTICAL' : '*** DIFFERS ***');
console.log('backwards      :', eq(fwd, [...rev].reverse()) ? 'IDENTICAL' : '*** DIFFERS ***');
console.log('out of order   :', order.every((t, i) => byT.get(t) === fwd[i].hash) ? 'IDENTICAL' : '*** DIFFERS ***');
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/seam-c-proto.png'), Buffer.from((await p.evaluate(() => window.__png())).split(',')[1], 'base64'));
await b.close();
server.close();
