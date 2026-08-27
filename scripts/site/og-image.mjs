// scripts/site/og-image.mjs — the social card, rendered from one HTML file.
//
//   node scripts/site/og-image.mjs            # write site/public/assets/og.png
//
// WHY A SCRIPT AND NOT A HAND-MADE PNG. A card carries the product's claim and its domain, and both
// move. An exported image drifts from the site the moment either changes, and nobody notices because
// nothing renders it twice. The source here is site/og/card.html, it reads the SITE's own tokens and
// the SITE's own vendored fonts, and regenerating is one command.
//
// It serves the repo through scripts/lib/render-harness.mjs rather than standing up another server:
// that module exists because this file's job had been copy-pasted 22 times (docs/MISTAKES.md #488).
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, REPO_ROOT } from '../lib/render-harness.mjs';

const OUT = path.join(REPO_ROOT, 'site/public/assets/og.png');
// 1200x630 is the Open Graph standard and what X, Slack, LinkedIn and iMessage all crop against.
// Shot at 2x so it stays sharp on a retina timeline, which is where most of these are seen.
const W = 1200, H = 630;

const { server, port } = await serveRepo();
const { page, close } = await launchPage({ width: W, height: H, scale: 2 });
await page.goto(`http://127.0.0.1:${port}/site/og/card.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);   // a card with a fallback face is a wrong card
await page.screenshot({ path: OUT, type: 'png' });
await close();
server.close();

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`✓ og image → ${path.relative(REPO_ROOT, OUT)}  ${W}x${H} @2x  ${kb}KB`);
