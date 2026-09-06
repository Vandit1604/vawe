// scripts/site/scenes-json.mjs: the site's playable scenes, DERIVED from the real ones.
//
//   node scripts/site/scenes-json.mjs          # check, and say what drifted
//   node scripts/site/scenes-json.mjs --write   # rewrite site/public/scenes/
//
// WHY THIS EXISTS. `site/public/scenes/*.json` is what /editor fetches, and it was hand-curated: a
// tracked copy of a scene, edited by whoever last thought about it. That is one fact with two owners
// and it drifted exactly the way this repo keeps logging.
//
// The failure that found it: /editor refused `argus-launch` on `anim` + `cut`, a pair the engine
// rejects. The scene had been FIXED in July by dropping `anim` from the three layers carrying a
// `cut`, and the site's copy never heard. So the editor faithfully showed a user a bug that had not
// existed for forty days, and the CLI rendered the same film clean in 23 seconds.
//
// Worse than stale: the copies were missing `bg` on NINE scenes and `sceneUnits` on three. `bg` is a
// required field, so those films were playing on the site without the backdrop the author wrote.
//
// WHAT THE CURATION ACTUALLY IS, now that it is written down rather than done by hand. A scene
// carries two kinds of key: what the engine renders, and what an AUTHOR needs and a viewer does not.
// Only the second kind is dropped, and the list is short and closed. Anything else is content, and
// content is copied byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'formats/scene');
const OUT = path.join(ROOT, 'site/public/scenes');
const write = process.argv.includes('--write');

// AUTHOR-ONLY, and this list is the whole curation. `authoring` holds gate waivers, `authoringNote`
// and `note` hold messages to the next author. None of them reaches renderFrame(n), and shipping a
// waiver list to a browser tells a visitor which rules a film was excused from, which is a
// conversation between the author and the gates.
const AUTHOR_ONLY = ['authoring', 'authoringNote', 'note'];

const strip = (scene) => {
  const out = {};
  for (const [k, v] of Object.entries(scene)) if (!AUTHOR_ONLY.includes(k)) out[k] = v;
  return out;
};

const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).sort();
if (!files.length) { console.error(`✗ no scenes under ${path.relative(ROOT, OUT)}. This script derives the existing set, it does not choose one`); process.exit(2); }

// SUGAR CANNOT BE PUBLISHED, because a browser cannot expand it. `block`, `beat` and `comp` become
// layer TYPES, and `core/layers/index.js` refuses one at boot with "run `make expand`", advice a
// visitor to /editor cannot take. `make expand` needs `blocks/index.mjs`, which discovers its factories
// with readdirSync plus a dynamic import; no bundler can follow that, so there is no client-side or
// server-side route to expanding one here.
//
// This directory shipped `saas-hero-launch` carrying three `block` layers. It is in the editor's own
// picker and is linked from `/` and `/showcase`, so the site offered a scene that could not boot.
// Deriving the copies faithfully was not enough: the curation asked whether the bytes matched and never
// asked whether the result RUNS in the one place it is served to.
//
// Publish the expanded scene instead (`make expand D=<scene.json>` writes `<name>.expanded.json`), or
// take it out of `site/public/scenes/`. `cameraMove` is deliberately absent from this list: it bakes at
// boot in `core/engine/produce.js`, so it works in a browser.
const SUGAR = ['block', 'beat', 'comp'];
const sugarIn = (scene) => {
  const hits = [];
  for (const [i, L] of (scene.layers || []).entries()) if (SUGAR.includes(L?.type)) hits.push(`layers[${i}] type "${L.type}"`);
  for (const [k, c] of Object.entries(scene.comps || {})) for (const [i, L] of (c?.layers || []).entries())
    if (SUGAR.includes(L?.type)) hits.push(`comps.${k}.layers[${i}] type "${L.type}"`);
  return hits;
};

const drifted = [];
const orphans = [];
const unbootable = [];
const blind = [];
for (const f of files) {
  // PREFER THE EXPANDED SOURCE. A film whose author reached for a block is not a film the site cannot
  // serve; it is one whose sugar has to be resolved before it is published, which is what
  // `make expand` is for. Deriving from `<name>.expanded.json` when it exists means the site publishes
  // what a browser can actually boot, and the author keeps writing sugar. The expanded file is
  // generated, so it is regenerated with `make expand` rather than edited.
  const expanded = path.join(SRC, f.replace(/\.json$/, '.expanded.json'));
  const src = fs.existsSync(expanded) ? expanded : path.join(SRC, f);
  // An orphan is a site scene whose source is gone. It cannot be derived, so it is reported rather
  // than deleted: the film may have been renamed, and silently dropping a page's content is worse
  // than saying it is unbacked.
  if (!fs.existsSync(src)) { orphans.push(f); continue; }
  const scene = strip(JSON.parse(fs.readFileSync(src, 'utf8')));
  const sugar = sugarIn(scene);
  // THE EXPANDED SIBLING IS GENERATED AND DOES NOT SHIP (.gitignore says so, deliberately: it is build
  // output). So a fresh clone has the sugar source and no expansion, and comparing the published
  // EXPANDED copy against it would report drift that is not drift. That is a fact about this checkout,
  // not about the file, and the convention here is that a check which cannot check says so: the same
  // `blind` shape scripts/lib/census.mjs uses. It still exits non-zero, because an unverified published
  // scene is not a verified one, and `make expand` is one command.
  if (sugar.length && src !== expanded) { blind.push([f, sugar.length]); continue; }
  if (sugar.length) unbootable.push([f, sugar]);
  const want = JSON.stringify(scene, null, 1) + '\n';
  const have = fs.readFileSync(path.join(OUT, f), 'utf8');
  if (want === have) continue;
  drifted.push(f);
  if (write) fs.writeFileSync(path.join(OUT, f), want);
}

const rel = path.relative(ROOT, OUT);
if (blind.length) {
  console.error(`✗ ${blind.length} published scene(s) could not be checked: their source carries build-time sugar and no expansion is on this disk.`);
  for (const [f, n] of blind) console.error(`    ${f}  (${n} sugar layer(s) in formats/scene/${f})`);
  console.error(`  Run: make expand D=formats/scene/<name>.json`);
}
if (orphans.length) {
  console.log(`  ⚠ ${orphans.length} site scene(s) have no source in formats/scene/: ${orphans.join(', ')}`);
  console.log(`    They cannot be derived. Restore the source, or delete the copy and the link to it.`);
}
if (unbootable.length) {
  console.error(`✗ ${unbootable.length} published scene(s) carry build-time sugar and CANNOT BOOT in a browser:`);
  for (const [f, hits] of unbootable) console.error(`    ${f}\n      ${hits.join('\n      ')}`);
  console.error(`\n  /editor serves these and a visitor cannot run \`make expand\`.`);
  console.error(`  Publish the expanded scene (\`make expand D=formats/scene/<name>.json\`), or remove the copy.`);
}
if (!drifted.length) {
  console.log(`✓ ${files.length} site scene(s) match their source (author-only keys dropped: ${AUTHOR_ONLY.join(', ')})`);
  process.exit(orphans.length || unbootable.length || blind.length ? 1 : 0);
}

if (write) {
  console.log(`✓ rewrote ${drifted.length} of ${files.length} → ${rel}/`);
  for (const f of drifted) console.log(`    ${f}`);
  process.exit(orphans.length || unbootable.length || blind.length ? 1 : 0);
}
console.error(`✗ ${drifted.length} of ${files.length} site scene(s) have drifted from formats/scene/:`);
for (const f of drifted) console.error(`    ${f}`);
console.error(`\n  /editor serves these, so a visitor sees whichever version this directory happens to hold.`);
console.error(`  Fix: make scenes-json WRITE=1`);
process.exit(1);
