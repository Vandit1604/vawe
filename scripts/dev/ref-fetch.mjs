// scripts/dev/ref-fetch.mjs — download a reference video for STUDY (refs/, gitignored, never shipped).
// Pull the real video file behind a Pinterest pin. The pin page renders the player client-side and
// the mp4 never appears in the served HTML, so watch the network and read the embedded payload.
// Prefers the plain h264 ladder (expMp4) — the av1/hevc variants decode unevenly in ffmpeg, and a
// reference you cannot step frame by frame is not a reference.
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'refs';
const PINS = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

const rank = (u) => (/expMp4/.test(u) ? 0 : /h265-pt-mp4/.test(u) ? 2 : /hevcMp4/.test(u) ? 3 : /av1/.test(u) ? 4 : 1)
  + (/_720w/.test(u) ? 0 : /_540w/.test(u) ? 10 : /_360w/.test(u) ? 20 : /_240w/.test(u) ? 30 : 5);

for (const url of PINS) {
  const id = (url.match(/pin\/(\d+)/) || [])[1] || String(PINS.indexOf(url));
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 900 });
  const seen = new Set();
  page.on('request', (r) => { const u = r.url(); if (/\.mp4(\?|$)/.test(u)) seen.add(u); });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));
    const dom = await page.evaluate(() => {
      const m = document.documentElement.innerHTML.match(/https:\\?\/\\?\/v1?\.pinimg\.com[^"'\\ ]+?\.mp4/g) || [];
      return [...new Set(m.map((s) => s.replace(/\\/g, '')))];
    });
    const title = (await page.title()).replace(/\s*\|.*$/, '').slice(0, 44);
    const all = [...new Set([...seen, ...dom])].sort((a, b) => rank(a) - rank(b));
    if (!all.length) { console.log(`✗ ${id}  no video source`); await page.close(); continue; }
    const buf = Buffer.from(await (await fetch(all[0], { headers: { 'User-Agent': UA, Referer: 'https://www.pinterest.com/' } })).arrayBuffer());
    const file = path.join(OUT, `pin-${id}.mp4`);
    fs.writeFileSync(file, buf);
    console.log(`✓ ${file}  ${(buf.length / 1024 / 1024).toFixed(1)}MB  "${title}"`);
  } catch (e) { console.log(`✗ ${id}  ${String(e.message).slice(0, 80)}`); }
  await page.close();
}
await browser.close();
