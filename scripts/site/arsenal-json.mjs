// scripts/site/arsenal-json.mjs: derive site/lib/arsenal.json, the one index behind /arsenal.
//
// WHY THIS EXISTS: the site used to answer "what can this engine do" on three pages that never
// agreed on a shape, /blocks (a category rail over blocks.json), /showcase/effects (a family rail
// over effects.json) and /type (specimens). A visitor looking for one thing had to already know
// which of the three held it. This merges the two REGISTRIES into one flat item list so a single
// search box reaches everything, and /arsenal renders that list.
//
// It derives, never restates. Both inputs are themselves generated (blocks-json.mjs,
// effects-json.mjs), so a newly registered block or effect lands here with no edit. Every count in
// the file is computed from the items beside it, which is what keeps site-counts.mjs quiet.
//
// Preview state is read off DISK, not off a flag. An effect can declare a scene and still have no
// still yet (the poster job is separate and can lag), and the page has to draw that case
// deliberately rather than paint a broken image. So `s` is a path that exists or null.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = path.join(root, 'site');
const read = (p) => JSON.parse(fs.readFileSync(path.join(site, p), 'utf8'));
const has = (rel) => fs.existsSync(path.join(site, 'public', rel));

const blocks = read('lib/blocks.json');
const effects = read('lib/effects.json');

// Same sanitiser the block posters were written with (scripts/site/blocks-scenes.mjs).
const safe = (name) => name.replace(/[^a-z0-9.]/gi, '_');

const items = [];

for (const b of blocks) {
  const cat = b.category ?? 'Core';
  const still = `/assets/blocks/${safe(b.name)}.png`;
  items.push({
    n: b.name,
    k: 'block',
    a: `block:${cat}`,
    g: cat,
    d: b.blurb ?? '',
    h: `/arsenal/${b.name}`,
    s: has(still) ? still : null,
    // Every block has a one-block scene generated beside its poster, so it plays on its own page.
    l: has(`/assets/blocks/${safe(b.name)}.json`),
  });
}

for (const f of effects.list) {
  for (const e of f.entries) {
    const still = `/assets/effects/${e.stem}.jpg`;
    items.push({
      n: e.name,
      k: 'effect',
      a: `effect:${f.tag}`,
      g: f.title,
      d: e.desc ?? '',
      h: `/arsenal/effects/${e.stem}`,
      s: has(still) ? still : null,
      l: !!(e.scene && !e.noPreview && !f.noPreview),
      // The family's own stated reason, shown where a still is missing so the gap reads as a fact
      // about the effect rather than as a hole in the page.
      w: e.noPreview || f.noPreview || null,
    });
  }
}

const tally = (key) => {
  const n = new Map();
  for (const it of items) n.set(it[key], (n.get(it[key]) ?? 0) + 1);
  return n;
};

const byKind = tally('k');
const byAxis = tally('a');

const KIND_LABEL = { block: 'Blocks', effect: 'Effects' };

const out = {
  total: items.length,
  stills: items.filter((i) => i.s).length,
  live: items.filter((i) => i.l).length,
  kinds: [...byKind].map(([id, n]) => ({ id, label: KIND_LABEL[id] ?? id, n })),
  // Sorted by size inside each kind: the rail is a place to start scanning, and the biggest bucket
  // is the likeliest first stop.
  axes: [...byAxis]
    .map(([id, n]) => ({ id, kind: id.split(':')[0], label: id.slice(id.indexOf(':') + 1), n }))
    .sort((x, y) => x.kind.localeCompare(y.kind) || y.n - x.n || x.label.localeCompare(y.label)),
  items,
};

const dest = path.join(site, 'lib/arsenal.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 0) + '\n');
console.log(
  `✓ site/lib/arsenal.json · ${out.total} items (${byKind.get('block')} blocks + ${byKind.get('effect')} effects)` +
  ` · ${out.stills} with a still · ${out.live} that play · ${out.axes.length} axes`,
);
