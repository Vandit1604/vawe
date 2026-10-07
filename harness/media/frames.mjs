#!/usr/bin/env node
// `vawe frames <page>`: one still of each data-world element alone, before any motion is written.
//   node harness/media/frames.mjs <page.html> [--full] [--world <id>[,<id>]]
// Writes out/<film>-frames/<id>.png, the labelled contact sheet out/<film>-frames.png and films/<film>/frames.html, then prints the
// absolute path of each PNG and the still-frame layout rules each world fires. The still is at the middle of the world's visible span
// (the first second inside it where the world shows); the other worlds are hidden.
// --full: full-size stills out/<film>-frames/<id>-full.png, no sheet or frames.html. --world: only those worlds, no sheet or frames.html.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openPage, seekAll, settle, resolveFrame, readPageMeta } from './render-page.mjs';
import { sampleWorlds, stillCandidates, worldShowsNow } from './world-sample.mjs';
import { sampleLayout } from './draft-check.mjs';
import { tile } from './compare-frames.mjs';
import { layoutLint, namedText } from '../lib/layout-lint.mjs';
import { readBrief } from '../lib/brief-tables.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { unwaived } from '../lib/motion-lint.mjs';
import { firedRules, firedLines } from '../lib/taste-steps.mjs';
import { framesPage, worldLines, parseFramesArgs, selectWorlds, isStarterPage } from '../lib/frames-page.mjs';

const die = (m) => { console.error(`error: ${m}`); process.exit(2); };
const hideOthers = (id) => `[data-world]:not([data-world="${id}"]) { display: none !important; }`;
const noSeek = async () => {};

function labelled(png, text, out) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', `drawtext=text='${text}':x=12:y=12:fontsize=44:fontcolor=white:box=1:boxcolor=black@0.6`, out]);
  if (r.status !== 0) die(`label failed: ${String(r.stderr || '').trim()}`);
}

/** Seeks to the first candidate second at which the world shows (the others are hidden); returns that second, or the first candidate when none does. */
async function seekToShown(page, span) {
  const times = stillCandidates(span);
  for (const t of times) {
    await seekAll(page, t * 1000);
    if (await worldShowsNow(page, span.id)) return t;
  }
  console.error(`frames: world ${span.id} shows at none of ${times.join(', ')} s; its still may be blank`);
  await seekAll(page, times[0] * 1000);
  return times[0];
}

/** Shoots the wanted worlds of the page (all when `ids` is empty); returns [{ id, at, png, fired }] in page order. */
async function shootWorlds(opened, pagePath, stills, { ids, suffix }) {
  const dur = Number(readPageMeta(pagePath, 'duration'));
  const found = await sampleWorlds(opened.page, dur, (ms) => opened.page.evaluate((t) => window.__pageSeek(t / 1000), ms));
  if (!found.length) die(`${pagePath} has no data-world element: give each beat one, for example <section data-world="s1">`);
  let spans;
  try { spans = selectWorlds(found, ids); } catch (e) { die(e.message); }
  const named = namedText(readPageMeta(pagePath, 'message'), readBrief(pagePath));
  const authoring = pageAuthoring(pagePath);
  const shots = [];
  for (const span of spans) {
    const style = await opened.page.addStyleTag({ content: hideOthers(span.id) });
    const at = await seekToShown(opened.page, span);
    const png = path.join(stills, `${span.id}${suffix}.png`);
    await opened.page.screenshot({ path: png });
    const layout = await sampleLayout(opened.page, [at], noSeek);
    await style.evaluate((el) => el.remove());
    const found = unwaived(layoutLint(layout, { named }), authoring);
    shots.push({ id: span.id, at, png, fired: firedRules(found, [], []) });
  }
  return shots;
}

async function main(argv) {
  const t0 = Date.now();
  let args;
  try { args = parseFramesArgs(argv); } catch (e) { die(e.message); }
  const { page: pagePath, full, worlds: ids } = args;
  if (!pagePath) die('missing <page>; usage: node harness/media/frames.mjs <page.html> [--full] [--world <id>[,<id>]]');
  if (!fs.existsSync(pagePath)) die(`no such page: ${pagePath}`);
  const abs = path.resolve(pagePath);
  const film = path.basename(path.dirname(abs));
  const stills = path.resolve('out', `${film}-frames`);
  fs.mkdirSync(stills, { recursive: true });
  const opened = await openPage(abs, resolveFrame(abs, { final: full }), { warm: true });
  let shots;
  try {
    if (!opened.reused) {
      await opened.page.goto(opened.url, { waitUntil: 'load' });
      await settle(opened.page);
      await opened.markWarm?.();
    }
    shots = await shootWorlds(opened, abs, stills, { ids, suffix: full ? '-full' : '' });
  } finally {
    await opened.close();
  }
  const partial = full || ids.length > 0;
  const head = `${shots.length} worlds: ${shots.map((s) => `${s.id} @${s.at}s`).join(', ')}`;
  const paths = shots.map((s) => `  ${s.id}  ${s.png}`);
  const rules = worldLines(shots, firedLines, { starter: isStarterPage(fs.readFileSync(abs, 'utf8')) });
  const done = () => `time: ${((Date.now() - t0) / 1000).toFixed(1)} s`;
  if (partial) {
    console.log([`frames${full ? ' (full size)' : ''}: ${head}`, ...paths, ...rules, done()].join('\n'));
    return;
  }
  const sheet = path.resolve('out', `${film}-frames.png`);
  const tmp = fs.mkdtempSync(path.join(path.dirname(sheet), '.frames-'));
  try {
    tile(shots.map((s) => { const out = path.join(tmp, `${s.id}.png`); labelled(s.png, s.id, out); return out; }), sheet);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const html = path.join(path.dirname(abs), 'frames.html');
  fs.writeFileSync(html, framesPage({ title: film, aspect: readPageMeta(abs, 'aspect') || '16:9', worlds: shots.map((s) => ({ id: s.id, src: path.relative(path.dirname(abs), s.png) })) }));
  console.log([`frames: ${head}`, `  sheet  ${sheet}`, `  page   ${html}`, ...paths, ...rules, done()].join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).catch((e) => die(e.stack || String(e)));
