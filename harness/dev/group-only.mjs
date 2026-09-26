// harness/dev/group-only.mjs: `make dev D=<film> GROUP=<id>` isolates one group layer (by `id`,
// searched recursively through nested groups) into its own scene JSON, so a group with a `clock`
// (core/timeline/group-clock.js) can be scrubbed alone without rendering the rest of the film.
//
//   node harness/dev/group-only.mjs <film.json> <groupId>   -> prints the temp scene path on stdout
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function findGroup(layers, id) {
  for (const L of layers || []) {
    if (L.id === id) return L;
    if (L.type === 'group') { const hit = findGroup(L.children, id); if (hit) return hit; }
  }
  return null;
}

const [filmPath, id] = process.argv.slice(2);
if (!filmPath || !id) {
  console.error('usage: node harness/dev/group-only.mjs <film.json> <groupId>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
const group = findGroup(data.layers, id);
if (!group) {
  console.error(`no layer with id "${id}" in ${filmPath} (searched every group recursively)`);
  process.exit(1);
}
if (group.type !== 'group') {
  console.error(`layer "${id}" is a ${group.type}, not a group; GROUP= isolates group layers`);
  process.exit(1);
}

// Re-based to start at film time 0 so the isolated preview shows the group's own life in full,
// not the blank lead-in it had in the whole film.
const isolated = { ...group, start: 0 };
const duration = group.duration ?? data.duration ?? 3;
const out = { ...data, duration, layers: [isolated] };

const outPath = path.join(os.tmpdir(), `vawe-group-${id}.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(outPath);
