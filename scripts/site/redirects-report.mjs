// Check every old vawe.dev URL against site/lib/redirects.mjs and print the mapping table.
//
//   node scripts/site/redirects-report.mjs [out.md]     (default: print to stdout)
//
// Exits 1 when an old URL matches no rule, or a rule lands on a page that does not exist: a move in
// moves.json, a doc in site-pages.json, an /easing slug in EASING_SLUGS, or one of the plain routes.
// The old URLs are scripts/site/legacy-urls.json: every effect, family, block and category page the
// JSON engine served, plus the old URLs Search Console listed on 2026-10-03.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = path.join(root, 'site');
const { match } = createRequire(path.join(site, 'package.json'))('next/dist/compiled/path-to-regexp');
const { LEGACY_REDIRECTS, EASING_SLUGS } = await import(pathToFileURL(path.join(site, 'lib', 'redirects.mjs')));
const json = (...p) => JSON.parse(fs.readFileSync(path.join(root, ...p), 'utf8'));
const legacy = json('scripts', 'site', 'legacy-urls.json');
const moves = new Set(json('site', 'lib', 'moves.json').moves.map((m) => m.name));
const pages = json('site', 'lib', 'site-pages.json');
const live = new Set(['/', '/moves', ...pages.routes.map((r) => r.path), ...pages.docs.map((d) => d.path)]);

const rules = LEGACY_REDIRECTS.map((r) => ({ ...r, test: match(r.source) }));
const resolve = (url) => rules.find((r) => r.test(url));

function exists(dest) {
  if (dest.startsWith('/moves/')) return moves.has(dest.slice('/moves/'.length));
  if (dest.startsWith('/easing/')) return EASING_SLUGS.includes(dest.slice('/easing/'.length));
  return live.has(dest);
}

const urls = [
  ...legacy.search.filter((u) => !live.has(u.split('?')[0])).map((u) => [u, 'search console']),
  ...Object.entries(legacy.families).flatMap(([id, stems]) => [
    [`/arsenal/effects/family/${id}`, 'family page'],
    ...stems.map((s) => [`/arsenal/effects/${s}`, 'effect']),
  ]),
  ...legacy.blocks.map((b) => [`/arsenal/${b}`, 'block']),
  ...legacy.categories.map((c) => [`/arsenal/category/${c}`, 'block category']),
  ['/arsenal', 'index'],
  ['/arsenal/type', 'index'],
  ['/arsenal/effects', 'index'],
];

const rows = [];
const problems = [];
for (const [url, kind] of urls) {
  const pathname = url.split('?')[0];
  const rule = resolve(pathname);
  if (!rule) {
    problems.push(`no rule: ${url}`);
    continue;
  }
  if (!exists(rule.destination)) problems.push(`${url} -> ${rule.destination} does not exist`);
  rows.push({ url, kind, to: rule.destination, generic: rule.source === '/arsenal/:path*' });
}

const generic = rows.filter((r) => r.generic);
const byDestination = new Map();
for (const r of rows) byDestination.set(r.to, (byDestination.get(r.to) ?? 0) + 1);
const table = (list) => list.map((r) => `| \`${r.url}\` | ${r.kind} | \`${r.to}\` |`).join('\n');

const out = `# Redirect map: old /arsenal URLs to the new pages

${LEGACY_REDIRECTS.length} permanent (308) rules in site/lib/redirects.mjs cover ${rows.length} known old URLs.
${generic.length} of them reach the generic /arsenal -> /moves fallback; the rest land on a nearer page.
${problems.length ? `PROBLEMS: ${problems.length}\n${problems.map((p) => `- ${p}`).join('\n')}` : 'Every destination exists.'}

## Search Console URLs (the ones Google lists today)

| old URL | kind | lands on |
|---|---|---|
${table(rows.filter((r) => r.kind === 'search console'))}

## Destinations by number of old URLs

| lands on | old URLs |
|---|---|
${[...byDestination].sort((a, b) => b[1] - a[1]).map(([to, n]) => `| \`${to}\` | ${n} |`).join('\n')}

## Every other old URL

| old URL | kind | lands on |
|---|---|---|
${table(rows.filter((r) => r.kind !== 'search console'))}
`;

if (process.argv[2]) fs.writeFileSync(process.argv[2], out);
else process.stdout.write(out);
console.error(`${rows.length} URLs mapped, ${generic.length} generic, ${problems.length} problems`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
