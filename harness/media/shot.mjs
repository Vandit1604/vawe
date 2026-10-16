#!/usr/bin/env node
// `vawe shot <route|url|page.html>[,more] [--w 1440,390] [--full] [--base url] [--out dir]`: a PNG of a site page, a url or a static html page at each width.
//   node harness/media/shot.mjs /blog,/moves --w 1440,390 --full
// A route needs a site server: a running one at --base is reused; a localhost one that is down is started here (site/ `npm run dev`) and stopped when the shots are done.
// Lazy images are loaded before the shot. Each line also reports page errors, failed requests and sideways overflow, the three things a screenshot hides.
import fs from 'node:fs';
import path from 'node:path';
import { launchPage, serveRepo, REPO_ROOT } from '../lib/render-harness.mjs';
import { withSite } from '../lib/site-server.mjs';
import { DEFAULT_BASE, DEFAULT_WIDTHS, parseTargets, parseWidths, resolveTarget, shotName, shotProblem, viewportHeight } from './shot-math.mjs';

const die = (m) => { console.error(`error: ${m}`); process.exit(2); };
const NAV_TIMEOUT_MS = 120000;

async function loadLazy(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
    const step = Math.max(200, innerHeight - 100);
    for (let y = 0, n = 0; y < document.documentElement.scrollHeight && n < 80; y += step, n++) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    await Promise.race([
      Promise.all([document.fonts.ready, ...[...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))]),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
    scrollTo(0, 0);
  });
}

async function shoot({ url, name, width, full, outDir }) {
  const { page, close } = await launchPage({ width, height: viewportHeight(width) });
  const problems = { errors: 0, failed: 0 };
  page.on('pageerror', () => { problems.errors++; });
  page.on('console', (m) => { if (m.type() === 'error') problems.errors++; });
  page.on('response', (r) => { if (r.status() >= 400) problems.failed++; });
  page.on('requestfailed', () => { problems.failed++; });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    await loadLazy(page);
    const { height, overflow } = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth }));
    const file = path.join(outDir, name);
    await page.screenshot({ path: file, fullPage: full });
    const notes = [full ? `full page ${height}px tall` : 'first screen'];
    if (problems.errors) notes.push(`${problems.errors} console error(s)`);
    if (problems.failed) notes.push(`${problems.failed} failed request(s)`);
    if (overflow > 0) notes.push(`sideways overflow ${overflow}px`);
    console.log(`✓ ${file}: ${width}px wide, ${notes.join(', ')}`);
  } finally {
    await close();
  }
}

async function main(argv) {
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const valued = new Set(['--w', '--base', '--out']);
  const targets = parseTargets(argv.find((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1])));
  const base = flag('--base') || process.env.VAWE_SITE_URL || DEFAULT_BASE;
  const problem = shotProblem({ targets, w: flag('--w'), base });
  if (problem) die(problem);
  const widths = flag('--w') ? parseWidths(flag('--w')) : DEFAULT_WIDTHS;
  const outDir = path.resolve(flag('--out') || 'out/shot');
  fs.mkdirSync(outDir, { recursive: true });
  const full = argv.includes('--full');

  const resolved = targets.map((t) => ({ t, ...resolveTarget(t, base) }));
  const needsSite = resolved.some((r) => r.kind === 'url' && r.url.startsWith(base));
  const files = resolved.some((r) => r.kind === 'file') ? await serveRepo({ root: REPO_ROOT }) : null;
  const shootAll = async () => {
    for (const r of resolved) {
      const url = r.kind === 'file' ? `http://127.0.0.1:${files.port}/${path.relative(REPO_ROOT, path.resolve(r.file))}` : r.url;
      for (const width of widths) await shoot({ url, name: shotName(r.t, width), width, full, outDir });
    }
  };
  try {
    await (needsSite ? withSite(base, shootAll) : shootAll());
  } finally {
    files?.close();
  }
}

main(process.argv.slice(2)).catch((e) => die(e.stack || String(e)));
