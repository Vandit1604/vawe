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
import { expandScene } from '../../core/engine/expand.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'films/scene');
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

// `block`/`beat`/`comp` sugar is expanded HERE, at publish time (core/engine/expand.js `expandScene`, pure
// Node, same function `./bin/vawe` resolves it with server-side), so the picker's scenes always boot:
// the render page (`films/scene/scene.js`) deliberately never imports core/engine/expand.js itself (its own
// banner says why: its block/beat factory dependency is outside what the render page's file server, or
// this site in production, can safely or reliably serve to a browser). Publishing the expanded form is
// cheaper than solving that in the browser and correct for the same reason a Go pre-expand is: the
// picker's scenes are a known, curated set, not live-typed text, so expanding once here is exactly the
// SAME "expand before the browser sees it" rule internal/render/expand.go applies to `./bin/vawe`.
const drifted = [];
const orphans = [];
for (const f of files) {
  const src = path.join(SRC, f);
  // An orphan is a site scene whose source is gone. It cannot be derived, so it is reported rather
  // than deleted: the film may have been renamed, and silently dropping a page's content is worse
  // than saying it is unbacked.
  if (!fs.existsSync(src)) { orphans.push(f); continue; }
  const scene = strip(expandScene(JSON.parse(fs.readFileSync(src, 'utf8'))));
  const want = JSON.stringify(scene, null, 1) + '\n';
  const have = fs.readFileSync(path.join(OUT, f), 'utf8');
  if (want === have) continue;
  drifted.push(f);
  if (write) fs.writeFileSync(path.join(OUT, f), want);
}

const rel = path.relative(ROOT, OUT);
if (orphans.length) {
  console.log(`  ⚠ ${orphans.length} site scene(s) have no source in films/scene/: ${orphans.join(', ')}`);
  console.log(`    They cannot be derived. Restore the source, or delete the copy and the link to it.`);
}
if (!drifted.length) {
  console.log(`✓ ${files.length} site scene(s) match their source (author-only keys dropped: ${AUTHOR_ONLY.join(', ')})`);
  process.exit(orphans.length ? 1 : 0);
}

if (write) {
  console.log(`✓ rewrote ${drifted.length} of ${files.length} → ${rel}/`);
  for (const f of drifted) console.log(`    ${f}`);
  process.exit(orphans.length ? 1 : 0);
}
console.error(`✗ ${drifted.length} of ${files.length} site scene(s) have drifted from films/scene/:`);
for (const f of drifted) console.error(`    ${f}`);
console.error(`\n  /editor serves these, so a visitor sees whichever version this directory happens to hold.`);
console.error(`  Fix: make scenes-json WRITE=1`);
process.exit(1);
