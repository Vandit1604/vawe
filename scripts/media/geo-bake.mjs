// scripts/media/geo-bake.mjs — regenerate assets/geo/us-states.js and assets/geo/world.js.
//
//   node assets/geo/bake.mjs
//
// LIVES BESIDE ITS OUTPUT because the agent that wrote it was scoped to blocks/geo.mjs and assets/geo/.
// It belongs in scripts/media/ with the other bakers (globe-dots.mjs is the same shape and the same
// argument); moving it needs the two relative paths below changed and nothing else.
//
// WHY BAKE AT ALL: see the header of blocks/geo.mjs. d3-geo runs at authoring time and ships nothing to
// the page; this script drops the part of the source geometry no 1080p frame can resolve.
//   us-atlas@3 states-10m.json  112 KB  →  us-states.js  32 KB
//   Natural Earth 110m admin-0  819 KB  →  world.js      59 KB
//
// The sources are COMMITTED, never fetched here: a build that reaches the network is a build that fails
// on the day the network does. To refresh assets/geo/us-states.json (public domain, US Census TIGER):
//   curl -fsS https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json -o assets/geo/us-states.json \
//     || rm -f assets/geo/us-states.json
// The `-f` and the `|| rm -f` are not optional: `curl -o` writes the body whatever the status is, and a
// zero-byte asset passes every path check in this repo and renders as an invisible hole.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- Douglas-Peucker on lon/lat degrees ----
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  // A CLOSED ring has pts[0] === pts[n-1], so the seed baseline is a zero-length segment and every
  // perpendicular distance is 0 — the whole ring collapses to two points. Split at the point farthest
  // from pts[0] first, which gives both halves a real baseline.
  const last = pts.length - 1;
  let m = 0, md = -1;
  for (let i = 1; i < last; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > md) { md = d; m = i; } }
  keep[m] = 1;
  const stack = [[0, m], [m, last]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1, fd = tol;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, den = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / den;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const ringArea = (r) => { let s = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; s += x1 * y2 - x2 * y1; } return Math.abs(s / 2); };
const q = (r) => r.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]);

// ---- topojson decode ----
function topoRings(topo, obj) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  const arc = (i) => {
    const rev = i < 0; const raw = topo.arcs[rev ? ~i : i];
    let x = 0, y = 0; const out = raw.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
    return rev ? out.reverse() : out;
  };
  const ring = (idxs) => { const pts = []; for (const i of idxs) { const a = arc(i); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
  const polys = obj.type === 'Polygon' ? [obj.arcs] : obj.arcs;
  return polys.map((p) => ring(p[0]));   // outer ring only; holes are not worth the bytes on a map this size
}

const FIPS_TO_USPS = { '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY' };

// ===== US =====
const topo = JSON.parse(fs.readFileSync(`${ROOT}/assets/geo/us-states.json`, 'utf8'));
const us = [];
for (const g of topo.objects.states.geometries) {
  const code = FIPS_TO_USPS[g.id]; if (!code) continue;
  let rings = topoRings(topo, g).map((r) => dp(r, 0.09)).filter((r) => r.length > 3);
  rings.sort((a, b) => ringArea(b) - ringArea(a));
  if (!rings.length) { console.error('EMPTY', code, g.properties.name); continue; }
  const big = ringArea(rings[0]);
  rings = rings.filter((r) => ringArea(r) > big * 0.012).slice(0, 6).map(q);
  us.push({ c: code, n: g.properties.name, r: rings });
}
us.sort((a, b) => a.c < b.c ? -1 : 1);
const HDR = (src, cmd) => `// GENERATED — DO NOT EDIT BY HAND.\n// source: ${src}\n// bake: ${cmd}\n`;
fs.writeFileSync(`${ROOT}/assets/geo/us-states.js`,
  HDR('us-atlas@3 states-10m.json (US Census TIGER, public domain)', 'node assets/geo/bake.mjs')
  + `// 51 states + DC. Outer rings only, Douglas-Peucker at 0.09 deg, lon/lat to 3dp.\n`
  + `export const US_STATES = ${JSON.stringify(us)};\n`);

// ===== WORLD =====
const world = JSON.parse(fs.readFileSync(`${ROOT}/assets/globe/countries.geojson`, 'utf8'));
const wc = [];
for (const f of world.features) {
  const p = f.properties;
  const code = p.ISO_A3 && p.ISO_A3 !== '-99' ? p.ISO_A3 : (p.ADM0_A3 || p.SOV_A3 || '');
  const name = p.NAME || p.ADMIN || p.name || code;
  // Antarctica is never a choropleth subject and its Natural Earth ring runs off the bottom of every
  // projection, so its simplified outline reads as torn paper under the map. Dropped at bake time.
  if (code === 'ATA') continue;
  const geom = f.geometry; if (!geom) continue;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let rings = polys.map((pp) => dp(pp[0], 0.4)).filter((r) => r.length > 3);
  rings.sort((a, b) => ringArea(b) - ringArea(a));
  if (!rings.length) continue;
  const big = ringArea(rings[0]);
  rings = rings.filter((r) => ringArea(r) > big * 0.05).slice(0, 8).map(q);
  wc.push({ c: code, n: name, r: rings });
}
wc.sort((a, b) => a.c < b.c ? -1 : 1);
fs.writeFileSync(`${ROOT}/assets/geo/world.js`,
  HDR('assets/globe/countries.geojson — Natural Earth 110m admin-0 (public domain)', 'node assets/geo/bake.mjs')
  + `// ${wc.length} countries. Outer rings only, Douglas-Peucker at 0.4 deg, lon/lat to 3dp.\n`
  + `export const WORLD_COUNTRIES = ${JSON.stringify(wc)};\n`);

for (const f of ['us-states.js', 'world.js']) console.log(f, (fs.statSync(`${ROOT}/assets/geo/${f}`).size / 1024).toFixed(0) + 'K');
console.log('us', us.length, 'world', wc.length);
