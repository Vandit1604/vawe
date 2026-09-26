// font-audit.mjs: fail the build if any text renders in a font we did not intend.
//
//   node quality/gates/font-audit.mjs scene films/scene/tpot-launch.json
//   make gen X=fonts D=films/scene/tpot-launch.json
//
// Writes a deterministic sidecar next to the render: out/<name>.fonts.json.
// Deliberately records only the VERDICT per family, never the probe widths, which are
// OS/version dependent and would churn the file on every machine that touches it.
//
// This exists because both prior occurrences of this bug were warnings that scrolled past in
// unrelated command output. A warning nobody reads is not a safeguard, so this exits non-zero.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { serveRepo, waitForEngine } from '../../harness/lib/render-harness.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const f = gateFindings();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const format = process.argv[2] || 'scene';
const dataArg = process.argv[3];
const dataUrl = dataArg
  ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/films/${format}/sample.json`;

const { server, port } = await serveRepo();

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/films/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
const err = await waitForEngine(page);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }

// Sample across the whole timeline: a family used by ONE late beat (a captured component that
// enters at 12s) is invisible at frame 0, and that is precisely the case that shipped broken.
const total = await page.evaluate(() => window.__engine.meta.totalFrames);
const merged = new Map();
for (let i = 0; i < 12; i++) {
  const n = Math.floor((i / 12) * total);
  const rows = await page.evaluate((f) => { window.__engine.renderFrame(f); return window.__engine.auditFonts(); }, n);
  for (const r of rows) if (!merged.has(r.family)) merged.set(r.family, r);
}
await browser.close(); server.close();

const report = [...merged.values()].sort((a, b) => a.family.localeCompare(b.family));
const bad = report.filter((r) => r.verdict !== 'OK');

const name = path.basename(dataUrl).replace(/\.json$/, '');
fs.mkdirSync(path.join(repoRoot, 'out'), { recursive: true });
const sidecar = path.join(repoRoot, 'out', `${name}.fonts.json`);
fs.writeFileSync(sidecar, JSON.stringify({ scene: name, families: report }, null, 1) + '\n');

const ICON = { OK: '✓', FALLBACK: '✗', 'SYSTEM-LUCK': '⚠', BROKEN: '✗' };
for (const r of report) console.log(`  ${ICON[r.verdict]} ${r.family.padEnd(22)} ${r.verdict.padEnd(12)} registered=${r.registered} loaded=${r.loaded}`);
console.log(`  → ${path.relative(repoRoot, sidecar)}`);

const FIX = {
  FALLBACK: 'no @font-face. The browser silently substituted a generic. Vendor it to assets/fonts/ and add an @font-face to core/tokens.css.',
  'SYSTEM-LUCK': 'painting from a SYSTEM install with no @font-face. It looks right on this machine and will fall back everywhere else. Vendor it.',
  BROKEN: '@font-face exists but the file failed to load (bad path or 404). Check the src url in core/tokens.css.',
};
for (const r of bad) f.fail(`font-${r.verdict.toLowerCase()}`, `${r.family}: ${FIX[r.verdict]}`, { at: r.family });

if (!bad.length) console.log(`\n✓ font audit OK: ${report.length} family(ies), all vendored, loaded and painting (${name})`);
f.emit();
process.exit(bad.length ? 1 : 0);
