// site-engine.mjs: vendor the RENDER ENGINE into the marketing site so scenes play in the browser.
//
// The engine is already a web page: the Go renderer just serves the repo over HTTP and navigates to
// `films/scene/scene.html?data=<url>&fps=30` (internal/scene/scene.go). Nothing in core/ imports
// node. So the site can serve the exact same files and run the exact same renderFrame(n) live.
//
//   node scripts/site/site-engine.mjs            # copy engine → site/public
//   node scripts/site/site-engine.mjs --check    # report drift, write nothing
//
// Paths are preserved EXACTLY (scene.html imports root-absolute '/core/boot.js', themes resolve at
// '/themes/<name>.json'), so the copy must land at the site root. Rewriting them would fork the
// engine; copying keeps one source of truth.
//
// Render-only assets are NOT shipped: music/ (58M), brands/ (55M), sfx/ (10M) are mixed in by the Go
// audio stage and never touched by the browser. The web bundle is ~1.3MB.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(root, 'site', 'public');

// TWO PLACES A DEPENDENCY CAN LIVE, and the Docker build only has the second. Locally d3 sits in the
// repo-root node_modules, because it is a devDependency of the renderer. Inside the image nothing runs
// `npm ci` at the root: the builder installs site/node_modules and nothing else. Resolving only the
// root path therefore worked on every machine and failed in production, which is the exact shape this
// file's own .dockerignore banner warns about. d3-geo is a dependency of site/package.json now, so the
// second path is the one that exists in the image; the first is kept so a local run does not need the
// site's node_modules to be installed.
const d3 = (pkg) => {
  for (const base of ['node_modules', 'site/node_modules']) {
    const rel = `${base}/${pkg}/src`;
    if (fs.existsSync(path.join(root, rel))) return rel;
  }
  // Named, not silent. Without it /blocklib/index.mjs throws at module scope in the browser and every
  // block family disappears from /playground with a 404 nobody looks at.
  throw new Error(`site-engine: cannot find ${pkg}. blocks/geo.mjs imports it by bare name and the `
    + `browser needs it vendored. It is a dependency of site/package.json; run npm ci there.`);
};

// [from, to]: relative to repo root / site/public
const COPY = [
  ['core', 'core'],                                   // the engine itself (216K, zero node imports)
  // BLOCKS TRAVEL NOW, and until blocks/index.mjs stopped calling fs.readdirSync on itself they could
  // not. They carry 100 typed option tables (blocks/schema.mjs) written expressly so a control panel
  // could be built for a block, and the page built to turn dials could not reach a single one.
  // NOT `blocks` → `blocks`. site/next.config.mjs 308s `/blocks/:name` to `/arsenal/:name`, because
  // the old /blocks page moved there and outside links still point at it. A file vendored to
  // /blocks/schema.mjs is therefore redirected to /arsenal/schema.mjs and 404s: the redirect cannot
  // tell a page path from a static file. `blocklib` is a directory no route claims. Nothing in core/
  // references /blocks/ (checked), and blocks import each other relatively, so the name is free.
  ['blocks', 'blocklib'],
  // d3, BECAUSE ONE BLOCK FAMILY IMPORTS IT BY BARE NAME. blocks/geo.mjs says `from 'd3-geo'`, which a
  // browser cannot resolve: bare specifiers need an import map, and site/app/layout.tsx now carries
  // one pointing at these three. Without them /blocklib/index.mjs throws at module scope and every
  // block family disappears from the playground, not just the maps. `internmap` is d3-array's own
  // dependency and is here for the same reason: the chain has to resolve to the end.
  [d3('d3-geo'), 'vendor/d3-geo'],
  [d3('d3-array'), 'vendor/d3-array'],
  [d3('internmap'), 'vendor/internmap'],
  // blocks/geo.mjs also imports `../assets/geo/*.js`. Vendored blocks live at /blocklib, so that
  // resolves to /assets/geo, and without it the same module-scope throw takes every family down.
  // 204K of coastline, and the alternative is a hundred playable families minus the two map ones.
  ['assets/geo', 'assets/geo'],
  ['themes', 'themes'],                               // boot.js fetches /themes/<name>.json
  // these land inside the site's OWN public/assets/, which is why .gitignore names them
  ['assets/fonts', 'assets/fonts'],     // boot() blocks on document.fonts for every face
  ['assets/icons', 'assets/icons'],     // svgIcon() + lucide UI marks
  ['assets/vendor', 'assets/vendor'],   // lottie runtime (lazy-loaded by boot)
];
// The scene page and EVERYTHING IT LOADS. scene.html pulls in /films/scene/scene.js and scene.css by
// absolute path, and for a long time this list shipped only the html: in production both 404'd, so the
// iframe on /editor and /blocks loaded a page whose engine never started. It worked locally because the
// files were already sitting in public/ from some earlier copy, which is the whole reason a publish
// step must be derived rather than enumerated. Anything a browser can load in that directory now goes;
// scene JSON is content and the site curates its own under public/scenes/.
const SCENE_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json']);
const FILES = fs.readdirSync(path.join(root, 'films', 'scene'), { withFileTypes: true })
  .filter((e) => e.isFile() && SCENE_EXT.has(path.extname(e.name)) && !e.name.endsWith('.intent.json'))
  // schema.json is loaded by boot to validate; every other .json in here is a scene, which is content.
  .filter((e) => path.extname(e.name) !== '.json' || e.name === 'schema.json')
  .map((e) => [`films/scene/${e.name}`, `films/scene/${e.name}`]);

const DRY = process.argv.includes('--check');
let copied = 0, drift = 0, bytes = 0;

// CONTENT, not size-and-mtime. The old test called two files the same when their sizes matched and
// the published one was newer, which is true of an edit that keeps a file the same length, and of any
// published file touched after the fact. `--check` is the gate that has to be trustworthy here, and a
// gate that answers from a timestamp reports what happened to the filesystem rather than what is in
// the file (engine-doctrine/MISTAKES.md #271).
const same = (a, b) => fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const put = (from, to) => {
  if (!fs.existsSync(from)) { console.error(`✗ missing ${path.relative(root, from)}`); process.exit(1); }
  if (same(from, to)) return;
  if (DRY) { drift++; console.log(`~ drift  ${path.relative(PUB, to)}`); return; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied++; bytes += fs.statSync(to).size;
};

for (const [src, dst] of COPY) {
  const from = path.join(root, src);
  if (!fs.existsSync(from)) { console.error(`✗ missing ${src}`); process.exit(1); }
  for (const f of walk(from)) put(f, path.join(PUB, dst, path.relative(from, f)));
}
for (const [src, dst] of FILES) put(path.join(root, src), path.join(PUB, dst));

// ── whatever the playable scenes actually reference ──────────────────────────────────────────
// assets/brands is 59M of section shots and lookbooks and stays out, but the scenes the editor can
// load reach into it for a handful of real marks: preface's agent logos, argus's mascot, linear's
// icon. 144K of the 59M. They were not shipped, so every one 404'd in production the moment the
// editor could load a film, invisible locally, where the whole 59M is on disk.
//
// Derived, never listed: this reads the scenes and ships exactly what they name, so adding a scene
// that reaches for a new asset cannot silently 404 again. A missing one FAILS THE BUILD, because
// the alternative is what already happened, finding out from the browser console in production.
const sceneDir = path.join(PUB, 'scenes');
const wanted = new Set();
if (fs.existsSync(sceneDir)) {
  for (const f of fs.readdirSync(sceneDir).filter((n) => n.endsWith('.json'))) {
    const text = fs.readFileSync(path.join(sceneDir, f), 'utf8');
    // any /assets/... path in any string value, however nested
    for (const m of text.matchAll(/\/assets\/[A-Za-z0-9._\-/]+\.[A-Za-z0-9]+/g)) wanted.add(m[0]);
  }
}
// EXISTS ON DISK IS NOT SHIPS. This check said "absent from the repo" and tested `fs.existsSync`,
// which is a fact about the machine running it. An asset that is present locally and gitignored
// therefore passed on every developer machine and failed only inside the build container, where the
// repo is a fresh clone. Six consecutive production deploys failed that way and nobody saw it,
// because the only place the message appeared was a Coolify build log
// (`assets/brands/creed/components/filepane.json`, referenced by the film that became preface-launch, ignored by
// `.gitignore:46 assets/brands/**`).
//
// So ask git, not the filesystem. `git check-ignore` answers the question the message actually
// makes: will this file be in the clone the build sees. One call for the whole set, because
// spawning per asset over a few hundred references is slow enough to notice.
const ignoredByGit = (rels) => {
  if (!rels.length) return new Set();
  const r = spawnSync('git', ['check-ignore', '--stdin'], { cwd: root, input: rels.join('\n'), encoding: 'utf8' });
  // Exit 128 is git failing (not a repo, no git on PATH). A tarball build has no .git, and refusing
  // there would trade a real check for a broken one, so fall through to the disk check and say so.
  if (r.status === 128 || r.error) { console.warn('  ⚠ git unavailable, so ship-ability is unchecked; falling back to disk presence'); return new Set(); }
  return new Set(String(r.stdout || '').split('\n').filter(Boolean));
};

const candidates = [];
for (const ref of wanted) {
  const rel = ref.replace(/^\//, '');
  // already covered by a COPY rule (icons, fonts, vendor) → skip
  if (COPY.some(([, dst]) => rel.startsWith(dst + '/'))) continue;
  candidates.push({ ref, rel });
}
// .dockerignore is the SECOND list that decides what the build sees, and it is hand-kept too. Its own
// comment already points at engine-doctrine/MISTAKES.md #289 for this exact failure, and the fix recorded there
// was a sentence asking the next author to remember. They did not. So read the file rather than trust
// the sentence: for a path under a `dir/**` exclusion, a bare `!path` negation must exist.
const dockerNegations = (() => {
  const f = path.join(root, '.dockerignore');
  if (!fs.existsSync(f)) return null;
  return new Set(fs.readFileSync(f, 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l.startsWith('!')).map((l) => l.slice(1).replace(/\/$/, '')));
})();
const excludedByDocker = (rel) => {
  if (!dockerNegations) return false;
  // Only paths under an excluded tree need a negation; everything else is in the context already.
  if (!/^assets\/brands\//.test(rel)) return false;
  let p = rel;
  while (p && p !== '.') { if (dockerNegations.has(p)) return false; p = path.dirname(p); }
  return true;
};

const ignored = ignoredByGit(candidates.map((c) => c.rel));
const missing = [], unshippable = [], uncopied = [];
for (const { ref, rel } of candidates) {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) { missing.push(ref); continue; }
  if (ignored.has(rel)) { unshippable.push(ref); continue; }
  if (excludedByDocker(rel)) { uncopied.push(ref); continue; }
  put(from, path.join(PUB, rel));
}
if (missing.length || unshippable.length || uncopied.length) {
  for (const m of missing) console.error(`✗ referenced by a scene and not on disk: ${m}`);
  for (const m of unshippable) console.error(`✗ referenced by a scene and GITIGNORED, so it is absent from the build's clone: ${m}`);
  console.error('  A scene may only reference assets that ship, or the editor 404s them in production.');
  for (const m of uncopied) console.error(`✗ referenced by a scene and excluded by .dockerignore, so it is absent from the image: ${m}`);
  if (unshippable.length) console.error('  Track it (`git add -f <path>` plus a .gitignore negation), or stop the scene referencing it.');
  if (uncopied.length) console.error('  Add a `!<path>` line to .dockerignore beside the other brand marks.');
  process.exit(1);
}

// ── the URLs the site fetches at RUNTIME, which no static check can see ──────────────────────────
// /playground loads the generator registry with a dynamic import of a STRING at run time. When that
// file moved to core/generators/generators.js in the formats/->films/ rename (a8617ac0, 2026-09-16)
// the string did not move with it, so the page served a dead engine for three days behind an HTTP
// 200: every visitor read "The engine did not load" while the route itself looked healthy.
//
// Nothing could have caught it. A bundler never resolves a runtime string, docker-context-check's
// import scan reads static specifiers and says so, and doc-refs reads docs. The only thing that can
// is asking whether the vendored file is actually there under the path the site will ask for. That
// is this file's own business, because this file is what puts it there.
//
// One entry per URL the site hard-codes. Adding a route that fetches a vendored path adds a line.
const RUNTIME_URLS = [
  ['/core/generators/generators.js', 'site/app/playground/PlaygroundClient.tsx ENGINE_URL'],
];
const deadUrls = RUNTIME_URLS.filter(([u]) => !fs.existsSync(path.join(root, 'site/public', u.replace(/^\//, ''))));
if (deadUrls.length) {
  for (const [u, who] of deadUrls) {
    console.error(`✗ ${who} fetches ${u} at runtime and site/public${u} does not exist.`);
  }
  console.error('  The page will return 200 and then fail in the browser, which is how this last went');
  console.error('  unnoticed for three days. Fix the path, or vendor the file it names.');
  process.exit(1);
}

if (DRY) console.log(drift ? `\n~ ${drift} file(s) drifted, run without --check` : '\n✓ site engine in sync');
else console.log(`✓ engine → site/public  (${copied} file(s), ${(bytes / 1024) | 0}KB)`);
