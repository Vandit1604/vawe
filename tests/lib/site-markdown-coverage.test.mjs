import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RENDERED, SKIPPED, isRendered, matchPattern, skipReason } from '../../site/lib/md/routes.mjs';

const SITE = path.resolve(import.meta.dirname, '../../site');
const pages = JSON.parse(fs.readFileSync(path.join(SITE, 'lib/site-pages.json'), 'utf8'));

function appRoutes(dir = path.join(SITE, 'app'), prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      if (entry.name === 'page.tsx') out.push(prefix || '/');
      continue;
    }
    if (entry.name.startsWith('(') || entry.name === 'api') continue;
    out.push(...appRoutes(path.join(dir, entry.name), `${prefix}/${entry.name}`));
  }
  return out;
}

const covered = (route) => isRendered(route) || skipReason(route) !== undefined;
const asPattern = (route) => route.replace(/\[[^\]]+\]/g, 'x');

test('every site-pages.json route has a markdown renderer or a reasoned skip', () => {
  const missing = [...pages.routes, ...pages.docs].map((r) => r.path).filter((p) => !covered(p));
  assert.deepEqual(missing, [], 'add a renderer to site/lib/md/registry.ts and list the pattern in RENDERED, or add it to SKIPPED with a reason');
});

test('every app page.tsx route has a markdown renderer or a reasoned skip', () => {
  const missing = appRoutes().filter((r) => !covered(asPattern(r)));
  assert.deepEqual(missing, [], 'add a renderer to site/lib/md/registry.ts and list the pattern in RENDERED, or add it to SKIPPED with a reason');
});

test('every skip has a reason and no pattern is both rendered and skipped', () => {
  for (const s of SKIPPED) assert.ok(s.reason && s.reason.length > 8, `${s.pattern} needs a reason`);
  for (const s of SKIPPED) assert.ok(!RENDERED.some((p) => matchPattern(p, asPattern(s.pattern))), `${s.pattern} is both rendered and skipped`);
});

test('every rendered pattern names a page that exists', () => {
  const routes = new Set(appRoutes());
  for (const p of RENDERED) assert.ok(routes.has(p), `${p} has no app page.tsx`);
});
