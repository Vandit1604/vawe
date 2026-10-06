#!/usr/bin/env node
// `vawe frames <page>`: one still of each data-world element alone, before any motion is written.
//   node harness/media/frames.mjs <page.html>
// Writes out/<film>-frames/<id>.png, the labelled contact sheet out/<film>-frames.png and films/<film>/frames.html, then prints the
// still-frame layout rules each world fires. The still is at the middle of the world's visible span; the other worlds are hidden.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openPage, seekAll, settle, resolveFrame, readPageMeta } from './render-page.mjs';
import { sampleWorlds } from './world-sample.mjs';
import { sampleLayout } from './draft-check.mjs';
import { tile } from './compare-frames.mjs';
import { layoutLint, namedText } from '../lib/layout-lint.mjs';
import { readBrief } from '../lib/brief-tables.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { unwaived } from '../lib/motion-lint.mjs';
import { firedRules, firedLines } from '../lib/taste-steps.mjs';
import { stillTime } from '../lib/worlds.mjs';
import { framesPage, worldLines } from '../lib/frames-page.mjs';

const die = (m) => { console.error(`error: ${m}`); process.exit(2); };
const hideOthers = (id) => `[data-world]:not([data-world="${id}"]) { display: none !important; }`;
const noSeek = async () => {};

function labelled(png, text, out) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `drawtext=text='${text}':x=12:y=12:fontsize=44:fontcolor=white:box=1:boxcolor=black@0.6`, out]);
  if (r.status !== 0) die(`label failed: ${String(r.stderr || '').trim()}`);
}

/** Shoots every world of the page; returns [{ id, at, png, lines }] in page order. */
async function shootWorlds(opened, pagePath, stills) {
  const dur = Number(readPageMeta(pagePath, 'duration'));
  const spans = await sampleWorlds(opened.page, dur, (ms) => opened.page.evaluate((t) => window.__pageSeek(t / 1000), ms));
  if (!spans.length) die(`${pagePath} has no data-world element: give each beat one, for example <section data-world="s1">`);
  const named = namedText(readPageMeta(pagePath, 'message'), readBrief(pagePath));
  const authoring = pageAuthoring(pagePath);
  const shots = [];
  for (const span of spans) {
    const style = await opened.page.addStyleTag({ content: hideOthers(span.id) });
    const at = stillTime(span);
    await seekAll(opened.page, at * 1000);
    const png = path.join(stills, `${span.id}.png`);
    await opened.page.screenshot({ path: png });
    const layout = await sampleLayout(opened.page, [at], noSeek);
    await style.evaluate((el) => el.remove());
    const found = unwaived(layoutLint(layout, { named }), authoring);
    shots.push({ id: span.id, at, png, lines: firedLines(firedRules(found, [], [])) });
  }
  return shots;
}

async function main(pagePath) {
  const t0 = Date.now();
  if (!pagePath || !fs.existsSync(pagePath)) die(`usage: node harness/media/frames.mjs <page.html> (no such file: ${pagePath})`);
  const abs = path.resolve(pagePath);
  const film = path.basename(path.dirname(abs));
  const stills = path.resolve('out', `${film}-frames`);
  fs.mkdirSync(stills, { recursive: true });
  const opened = await openPage(abs, resolveFrame(abs), { warm: true });
  let shots;
  try {
    if (!opened.reused) {
      await opened.page.goto(opened.url, { waitUntil: 'load' });
      await settle(opened.page);
      await opened.markWarm?.();
    }
    shots = await shootWorlds(opened, abs, stills);
  } finally {
    await opened.close();
  }
  const sheet = path.resolve('out', `${film}-frames.png`);
  const tmp = fs.mkdtempSync(path.join(path.dirname(sheet), '.frames-'));
  try {
    tile(shots.map((s) => { const out = path.join(tmp, `${s.id}.png`); labelled(s.png, s.id, out); return out; }), sheet);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const html = path.join(path.dirname(abs), 'frames.html');
  const title = path.basename(path.dirname(abs));
  fs.writeFileSync(html, framesPage({ title, aspect: readPageMeta(abs, 'aspect') || '16:9', worlds: shots.map((s) => ({ id: s.id, src: path.relative(path.dirname(abs), s.png) })) }));
  const rel = (p) => path.relative(process.cwd(), p);
  console.log([`frames: ${rel(sheet)} (${shots.length} worlds: ${shots.map((s) => `${s.id} @${s.at}s`).join(', ')}), ${rel(html)}`,
    ...shots.flatMap((s) => worldLines(s.id, s.lines)), `time: ${((Date.now() - t0) / 1000).toFixed(1)} s`].join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv[2]).catch((e) => die(e.stack || String(e)));
