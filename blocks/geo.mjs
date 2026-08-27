// blocks/geo.mjs. The MAP family: a hex-tile cartogram, a world choropleth, a US choropleth, a
// proportional-bubble map and an origin→destination flow map.
//
// WHY THIS FAMILY EXISTS. Half the scene library carries no pictorial layer at all, and a claim about
// places set in type is the purest form of telling-not-showing. A map is the cheapest large picture
// that also EXPLAINS: the shape of the frame IS the data.
//
// PROJECTION HAPPENS HERE, ONCE, AT FACTORY TIME. d3-geo runs in Node while the scene is being
// authored and what reaches the page is a finished `d` string. This is the same trade
// scripts/media/globe-dots.mjs already made and for the same reason: nothing that owns a clock, and no
// library, goes near the render loop. `renderFrame(n)` stays a pure function of n.
//
// THE GEOMETRY IS BAKED, NOT FETCHED. assets/geo/us-states.js and assets/geo/world.js are generated
// files holding outer rings only, Douglas-Peucker simplified and quantised to 3 decimal degrees, 32 KB
// and 61 KB against 112 KB and 819 KB of source. A build that reaches the network is a build that fails
// on the day the network does.
//   us-states.js ← assets/geo/us-states.json   (us-atlas@3 states-10m, US Census TIGER, public domain)
//   world.js     ← assets/globe/countries.geojson (Natural Earth 110m admin-0, public domain)
//
// MOTION COMES FROM THE ENGINE. CSS transition/animation are dead engine-wide, so every arrival here is
// either `parts` (a selector into this markup that the engine seeks and staggers, core/parts.js) or a
// `--p` sweep the markup reads in a calc(). Nothing animates itself.
//
// PURE BY CONTRACT, like every other file in blocks/: props → an array of scene-layer JSON. No Date, no
// Math.random, no I/O at call time.
import { geoAlbersUsa, geoNaturalEarth1, geoPath } from 'd3-geo';
import { TOKENS as T, HAIR, R, TYPE, SPACE, r2 } from './kit.mjs';
// EVERY LABEL IS TYPE.body, NOT TYPE.fine. `verify/audit.mjs` floors readable text at 1.3% of frame
// height (14.04px at 1080) and TYPE.fine is 14, so a map labelled at the small step fails the floor
// by four hundredths of a pixel on every single label. The next step up is the only one that passes.
import { US_STATES } from '../assets/geo/us-states.js';
import { WORLD_COUNTRIES } from '../assets/geo/world.js';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Maps';


// ── shared ───────────────────────────────────────────────────────────────────────────────────────
// LAND, and it is the no-data fill too. `var(--surface-2)` alone was invisible: on a light theme the
// surface and the page background are within a percent of each other, so the base map read as a few
// grey hairlines and the bubble/flow maps had no country under them at all. A faint accent wash keeps
// the landmass present while staying clearly below the ramp's lightest bucket (16%).
const EMPTY = 'color-mix(in srgb, var(--accent) 5%, var(--surface-2))';

// A ring list → the GeoJSON d3-geo wants. Built on demand rather than baked so the asset stays half
// the size: the wrapper objects are pure repetition.
const featureOf = (s) => ({ type: 'Feature', id: s.c, properties: { name: s.n },
  geometry: { type: 'MultiPolygon', coordinates: s.r.map((ring) => [ring]) } });
const collection = (items) => ({ type: 'FeatureCollection', features: items.map(featureOf) });

// geoPath emits full float precision, which triples the JSON for detail nothing can see at 1080p.
const trim = (d) => String(d || '').replace(/-?\d+\.\d+/g, (m) => (+m).toFixed(1));

// The choropleth ramp. One expression, so every map in the family reads the same and every one
// repaints with the theme. `min` keeps the lightest bucket visible against the empty fill.
const rampAt = (f, min = 16, max = 92) =>
  `color-mix(in srgb, var(--accent) ${r2(min + Math.max(0, Math.min(1, f)) * (max - min))}%, ${EMPTY})`;

// values → {frac(code), max, min}. ONE SHAPE: `[{code, value}]`. A `{CA: 12}` object map is nicer to
// type from JS and would be a second accepted shape for the same field, which the block schema then
// cannot describe and the catalog cannot demonstrate. A list of rows is what a scene JSON writes.
function scale(data) {
  const rows = (Array.isArray(data) ? data : []).map((d) => [d && d.code, d && d.value]);
  const map = new Map(rows.filter(([, v]) => Number.isFinite(+v)).map(([k, v]) => [k, +v]));
  const vals = [...map.values()];
  const max = vals.length ? Math.max(...vals) : 1;
  const min = vals.length ? Math.min(...vals) : 0;
  const span = (max - min) || 1;
  return { map, max, min, frac: (c) => map.has(c) ? (map.get(c) - min) / span : null };
}

// The gradient key. Returned as markup, not a layer, so it sits inside the map's own SVG box and
// cannot drift away from it when the caller moves the block.
function legendEl({ w, min, max, label = '', unit = '' }) {
  const bar = `linear-gradient(90deg, ${rampAt(0)}, ${rampAt(0.5)}, ${rampAt(1)})`;
  return `<div style="display:flex;align-items:center;gap:${SPACE.sm}px;width:${w}px;margin-top:${SPACE.md}px">`
    + (label ? `<span style="font:600 ${TYPE.body}px var(--font-mono);color:${T.sub};letter-spacing:0.08em">${label}</span>` : '')
    + `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">${min}${unit}</span>`
    + `<span style="flex:1;height:8px;border-radius:${R.pill}px;background:${bar};border:${HAIR}"></span>`
    + `<span style="font:500 ${TYPE.body}px var(--font-mono);color:${T.sub}">${max}${unit}</span></div>`;
}

const titleEl = (title, sub, w) => (title || sub)
  ? `<div style="width:${w}px;margin-bottom:${SPACE.md}px">`
    + (title ? `<div style="font:700 ${TYPE.head}px var(--font-sans);color:${T.ink};letter-spacing:-0.02em">${title}</div>` : '')
    + (sub ? `<div style="font:500 ${TYPE.body}px var(--font-sans);color:${T.sub};margin-top:${SPACE.tight}px">${sub}</div>` : '')
    + '</div>'
  : '';

// THE MAP OWNS ITS OWN GROUND, and that is not decoration.
//
// Every other data family here paints a card under itself (`cardChrome`, blocks/charts.mjs:132). This
// one did not, so its legend and callout labels, `T.sub`, a mid-grey chosen for a light surface, were
// painted straight onto whatever the scene put behind them. Over the theme's own pale ground that reads;
// over a living dark backdrop, which is exactly what CLAUDE.md tells authors to use, the same grey
// measured 1.9:1 and the audit refused it.
//
// The defect is not the grey. It is a colour decision made against an ASSUMED background, the same
// class as docs/MISTAKES.md #373, where a preset's lightness was read off a hand-kept name list instead
// of being measured. A block cannot know what a scene will put behind it, so it must not depend on it.
// Painting the card removes the question rather than answering it.
const wrap = ({ x, y, w, html, start, dur, parts }) =>
  [{ type: 'html', x, y, w, html, start, duration: dur, anim: 'fade', enterDur: 0.3, exitDur: 0.35,
    // NO `pad` HERE. The block computes its whole geometry from `w` BEFORE this wrapper sees it, and a
    // layer that declares a box plus padding is laid out border-box (core/layers/html.js), so padding
    // shrinks the painted card while the content keeps its full width, the map then overflows its own
    // card to the right and lands back on the raw backdrop, which is the exact bug this card fixes.
    // The inner markup already carries its own margins.
    out: 'defocus', bg: T.card, radius: R.card, border: HAIR, elevation: 1,
    ...(parts ? { parts } : {}) }];

// ── 1 · usMapHex ─────────────────────────────────────────────────────────────────────────────────
// THE LAYOUT IS AN ASCII MAP ON PURPOSE. A hex cartogram is 51 (col, row) pairs, and a table of 51
// numbers is unreadable and unreviewable. A transposed pair looks exactly like a correct one. Written
// as the picture it describes, a misplaced state is visible in the source.
const HEX_GRID = `
AK .  .  .  .  .  .  .  .  .  ME
.  .  .  .  .  .  .  .  VT NH .
.  WA ID MT ND MN WI MI NY MA RI
.  OR NV WY SD IA IL IN PA NJ CT
.  CA UT CO NE MO KY OH VA MD DE
.  .  AZ NM KS AR TN WV NC DC .
.  .  .  .  OK LA MS AL SC .  .
HI .  .  .  TX .  .  .  GA FL .
`;
const HEX_CELLS = HEX_GRID.trim().split('\n').flatMap((line, row) =>
  line.trim().split(/\s+/).map((code, col) => ({ code, col, row })).filter((c) => c.code !== '.'));
const HEX_COLS = 11;
const HEX_ROWS = HEX_GRID.trim().split('\n').length;

// usMapHex: every state the SAME SIZE, so the reading is the value and not the acreage. The honest
// shape for a per-state rate: a true choropleth makes Montana shout and Rhode Island vanish.
export function usMapHex({ x, y, w = 1180, data = [], title = '', sub = '', legend = '',
  showLegend = true, unit = '', showValues = true, start = 0, dur = 5 } = {}) {
  const s = scale(data);
  // pointy-top hexes. Odd rows are offset half a tile, so the grid needs 11.5 tiles of width.
  const rad = w / ((HEX_COLS + 0.5) * Math.sqrt(3));
  const hw = (Math.sqrt(3) / 2) * rad;
  const h = (HEX_ROWS - 1) * 1.5 * rad + 2 * rad;
  const tile = ({ code, col, row }) => {
    const cx = hw + (col + (row % 2) * 0.5) * 2 * hw;
    const cy = rad + row * 1.5 * rad;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 90);
      return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    const f = s.frac(code);
    const fill = f === null ? EMPTY : rampAt(f);
    // Ink over a heavy accent wash stops being readable; the light end keeps the theme's own text.
    // `--accent-ink` is the WRONG TOKEN with the right intent: it is the accent used as text, and on
    // brew it is #b83a0f, dark orange placed on an orange fill. `--on-accent` is ink FOR an accent
    // ground. Graded against the full-strength accent, so on a heavy wash it is directionally right
    // rather than exactly measured.
    const ink = f !== null && f > 0.55 ? T.onAccent : T.ink;   // see the halo note in choropleth()
    const val = s.map.get(code);
    return `<g class="tile">`
      + `<polygon points="${pts}" fill="${fill}" stroke="${T.hair}" stroke-width="1.5"/>`
      + `<text x="${cx.toFixed(1)}" y="${(cy - (showValues && val != null ? rad * 0.16 : 0)).toFixed(1)}"`
      + ` text-anchor="middle" dominant-baseline="central" font-family="var(--font-mono)" font-weight="700"`
      + ` font-size="${(rad * 0.42).toFixed(1)}" fill="${ink}">${code}</text>`
      + (showValues && val != null
        ? `<text x="${cx.toFixed(1)}" y="${(cy + rad * 0.45).toFixed(1)}" text-anchor="middle" dominant-baseline="central"`
          + ` font-family="var(--font-mono)" font-weight="500" font-size="${(rad * 0.34).toFixed(1)}" fill="${ink}"`
          + ` opacity="0.82">${val}${unit}</text>`
        : '')
      + '</g>';
  };
  const svg = `<svg viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" width="${w}" height="${h.toFixed(0)}" style="display:block;overflow:visible">`
    + HEX_CELLS.map(tile).join('') + '</svg>';
  const html = `<div style="width:${w}px">${titleEl(title, sub, w)}${svg}`
    + (showLegend ? legendEl({ w, min: s.min, max: s.max, label: legend, unit }) : '') + '</div>';
  // The tiles POP IN across the grid rather than the card sliding: the arrival IS the reading order.
  return wrap({ x, y, w, html, start, dur,
    parts: [{ select: '.tile', anim: 'popIn', each: 0.42, stagger: 0.014, delay: 0.2, ease: 'back.out(1.6)', out: true }] });
}

// ── shared choropleth body ───────────────────────────────────────────────────────────────────────
// usMap and worldMap differ in exactly two things: which ring table and which projection. One body,
// because a second copy of "project, fill, stagger, label" is a second copy that drifts.
function choropleth({ items, projection, x, y, w, h, data, title, sub, legend, showLegend, unit,
  labels, labelMin, start, dur }) {
  const s = scale(data);
  const fc = collection(items);
  const proj = projection().fitSize([w, h], fc);
  const path = geoPath(proj);
  const shapes = [];
  const marks = [];
  for (const f of fc.features) {
    const d = trim(path(f));
    if (!d) continue;                                 // AlbersUsa drops anything outside the US
    const frac = s.frac(f.id);
    const cls = frac === null ? 'base' : 'hit';
    shapes.push(`<path class="${cls}" d="${d}" fill="${frac === null ? EMPTY : rampAt(frac)}"`
      + ` stroke="${T.hair}" stroke-width="0.8" stroke-linejoin="round"/>`);
    if (labels && frac !== null && frac >= labelMin) {
      const c = path.centroid(f);
      // THE HALO MUST BE THE OPPOSITE OF THE INK. A page-coloured halo behind page-coloured ink erases
      // the label, which is exactly what happened to CA's "39" over its own dark fill: white on white,
      // invisible, and every gate green. A dark fill already gives the light ink its contrast, so the
      // halo is only there for the light buckets.
      const hot = frac > 0.55;
      if (Number.isFinite(c[0])) marks.push(`<text class="hit" x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}"`
        + ` text-anchor="middle" dominant-baseline="central" font-family="var(--font-mono)" font-weight="700"`
        + ` font-size="${TYPE.body}" fill="${hot ? T.onAccent : T.ink}"`
        + (hot ? '' : ` paint-order="stroke" stroke="${T.paper}" stroke-width="3"`)
        + `>${s.map.get(f.id)}${unit}</text>`);
    }
  }
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;overflow:visible">`
    + shapes.join('') + marks.join('') + '</svg>';
  const html = `<div style="width:${w}px">${titleEl(title, sub, w)}${svg}`
    + (showLegend ? legendEl({ w, min: s.min, max: s.max, label: legend, unit }) : '') + '</div>';
  // Only the DATA regions arrive; the rest of the world is already there as context. Staggering 177
  // countries one at a time reads as noise, so the sweep is fast and overlapping.
  return wrap({ x, y, w, html, start, dur,
    parts: [{ select: '.hit', anim: 'popIn', each: 0.5, stagger: 0.02, delay: 0.25, ease: 'power2.out', out: true }] });
}

// ── 2 · worldMap ─────────────────────────────────────────────────────────────────────────────────
// worldMap. A world choropleth keyed by ISO 3166-1 alpha-3. Natural Earth I projection: the compromise
// that keeps the tropics the right shape without Mercator's polar lie.
export function worldMap({ x, y, w = 1360, h = 700, data = [], title = '', sub = '', legend = '',
  showLegend = true, unit = '', labels = false, labelMin = 0.6, start = 0, dur = 5 } = {}) {
  return choropleth({ items: WORLD_COUNTRIES, projection: geoNaturalEarth1,
    x, y, w, h, data, title, sub, legend, showLegend, unit, labels, labelMin, start, dur });
}

// ── 3 · usMap ────────────────────────────────────────────────────────────────────────────────────
// usMap. The true-geography US choropleth, keyed by two-letter postal code. Albers USA, so Alaska and
// Hawaii are inset instead of missing.
export function usMap({ x, y, w = 1200, h = 720, data = [], title = '', sub = '', legend = '',
  showLegend = true, unit = '', labels = true, labelMin = 0, start = 0, dur = 5 } = {}) {
  return choropleth({ items: US_STATES, projection: geoAlbersUsa,
    x, y, w, h, data, title, sub, legend, showLegend, unit, labels, labelMin, start, dur });
}

// A handful of US cities so the two point maps have something honest to draw in the catalog. Real
// coordinates; a caller passes its own `points` for anything real.
export const US_CITIES = {
  'New York': [-74.006, 40.713], 'Los Angeles': [-118.244, 34.052], Chicago: [-87.630, 41.878],
  Houston: [-95.369, 29.760], Phoenix: [-112.074, 33.448], Philadelphia: [-75.165, 39.953],
  'San Antonio': [-98.494, 29.424], 'San Diego': [-117.161, 32.716], Dallas: [-96.797, 32.777],
  'San Francisco': [-122.419, 37.775], Seattle: [-122.332, 47.606], Denver: [-104.991, 39.740],
  Boston: [-71.059, 42.360], Atlanta: [-84.388, 33.749], Miami: [-80.192, 25.762],
  Minneapolis: [-93.265, 44.978], Detroit: [-83.046, 42.331], 'Salt Lake City': [-111.891, 40.761],
  Nashville: [-86.781, 36.163], Portland: [-122.676, 45.512],
};
// A point's coordinates come from the prop if given, else from the table by name. A name with neither
// is DROPPED LOUDLY rather than drawn at 0,0 in the Gulf of Guinea, which is the silent-substitution
// failure this repo keeps paying for.
function lonlatOf(p, where) {
  if (Number.isFinite(p.lon) && Number.isFinite(p.lat)) return [p.lon, p.lat];
  const hit = US_CITIES[p.name] || US_CITIES[p.city];
  if (hit) return hit;
  throw new Error(`blocks/geo.mjs ${where}: point "${p.name ?? p.city ?? '(unnamed)'}" has no lon/lat and is `
    + `not in US_CITIES. Pass {lon, lat} explicitly. Known: ${Object.keys(US_CITIES).join(', ')}`);
}

// ── 4 · usMapBubble ──────────────────────────────────────────────────────────────────────────────
// usMapBubble, proportional circles over the outline. AREA is proportional to the value, not radius:
// scaling the radius linearly overstates the big ones by the square, which is the oldest lie in
// thematic cartography.
export function usMapBubble({ x, y, w = 1200, h = 720, points = [], title = '', sub = '',
  maxR = 46, minR = 7, unit = '', callouts = true, color = T.accent,
  start = 0, dur = 5 } = {}) {
  const fc = collection(US_STATES);
  const proj = geoAlbersUsa().fitSize([w, h], fc);
  const path = geoPath(proj);
  const outline = fc.features.map((f) => { const d = trim(path(f)); return d
    ? `<path d="${d}" fill="${EMPTY}" stroke="${T.hair}" stroke-width="0.8" stroke-linejoin="round"/>` : ''; }).join('');
  const vals = points.map((p) => +p.value || 0);
  const max = Math.max(...vals, 1);
  const dots = points.map((p, i) => {
    const xy = proj(lonlatOf(p, 'usMapBubble'));
    if (!xy) return '';                                   // outside the Albers USA clip
    const r = minR + (maxR - minR) * Math.sqrt(Math.max(0, +p.value || 0) / max);
    const name = p.name ?? p.city ?? '';
    // The label sits to the right of the circle unless that would run off the plot, then to the left.
    const right = xy[0] + r + 90 < w;
    const lx = right ? xy[0] + r + SPACE.xs : xy[0] - r - SPACE.xs;
    return `<g class="dot">`
      + `<circle cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="0.28"`
      + ` stroke="${color}" stroke-width="2"/>`
      + `<circle cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="3.5" fill="${color}"/>`
      + (callouts && name
        ? `<text x="${lx.toFixed(1)}" y="${(xy[1] - 8).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}"`
          + ` font-family="var(--font-sans)" font-weight="700" font-size="${TYPE.body}" fill="${T.ink}"`
          + ` paint-order="stroke" stroke="${T.paper}" stroke-width="4">${name}</text>`
          + `<text x="${lx.toFixed(1)}" y="${(xy[1] + 12).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}"`
          + ` font-family="var(--font-mono)" font-weight="500" font-size="${TYPE.body}" fill="${T.sub}"`
          + ` paint-order="stroke" stroke="${T.paper}" stroke-width="4">${p.value}${unit}</text>`
        : '')
      + '</g>';
  }).join('');
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;overflow:visible">`
    + outline + dots + '</svg>';
  const html = `<div style="width:${w}px">${titleEl(title, sub, w)}${svg}</div>`;
  // Biggest first would give the reading away; they land in the order the caller listed them.
  return wrap({ x, y, w, html, start, dur,
    parts: [{ select: '.dot', anim: 'popIn', each: 0.45, stagger: 0.09, delay: 0.3, ease: 'back.out(1.8)', out: true }] });
}

// ── 5 · usMapFlow ────────────────────────────────────────────────────────────────────────────────
// usMapFlow, origin→destination arcs that DRAW ON. The curve is a quadratic bowed perpendicular to the
// chord: not a real great circle, but at continental scale the difference is under a pixel and a
// projected great circle costs a geoInterpolate sample loop for nothing.
export function usMapFlow({ x, y, w = 1200, h = 720, flows = [], title = '', sub = '',
  bow = 0.22, color = T.accent, hub = '', labels = true, start = 0, dur = 5 } = {}) {
  const fc = collection(US_STATES);
  const proj = geoAlbersUsa().fitSize([w, h], fc);
  const path = geoPath(proj);
  const outline = fc.features.map((f) => { const d = trim(path(f)); return d
    ? `<path d="${d}" fill="${EMPTY}" stroke="${T.hair}" stroke-width="0.8" stroke-linejoin="round"/>` : ''; }).join('');
  const widths = flows.map((f) => +f.value || 1);
  const maxV = Math.max(...widths, 1);
  const nodes = new Map();
  const addNode = (name, xy, isHub) => { if (name && !nodes.has(name)) nodes.set(name, { xy, isHub }); };
  const arcs = flows.map((f) => {
    const a = proj(lonlatOf({ name: f.from, lon: f.fromLon, lat: f.fromLat }, 'usMapFlow'));
    const b = proj(lonlatOf({ name: f.to, lon: f.toLon, lat: f.toLat }, 'usMapFlow'));
    if (!a || !b) return '';
    addNode(f.from, a, f.from === hub); addNode(f.to, b, f.to === hub);
    // Control point: the chord's midpoint pushed along the chord's normal. Always bowed the same way
    // round, so parallel routes fan instead of crossing.
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / len) * len * bow, cy = my + (dx / len) * len * bow;
    const sw = 1.6 + 5.4 * ((+f.value || 1) / maxV);
    return `<path class="arc" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}"`
      + ` fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="0.85"/>`;
  }).join('');
  const dots = [...nodes.entries()].map(([name, n]) => {
    const r = n.isHub ? 9 : 5.5;
    return `<g class="node">`
      + `<circle cx="${n.xy[0].toFixed(1)}" cy="${n.xy[1].toFixed(1)}" r="${r}" fill="${n.isHub ? color : T.paper}"`
      + ` stroke="${color}" stroke-width="2.5"/>`
      + (labels ? `<text x="${n.xy[0].toFixed(1)}" y="${(n.xy[1] - r - 10).toFixed(1)}" text-anchor="middle"`
        + ` font-family="var(--font-mono)" font-weight="${n.isHub ? 700 : 500}" font-size="${TYPE.body}"`
        + ` fill="${n.isHub ? T.ink : T.sub}" paint-order="stroke" stroke="${T.paper}" stroke-width="4">${name}</text>` : '')
      + '</g>';
  }).join('');
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;overflow:visible">`
    + outline + arcs + dots + '</svg>';
  const html = `<div style="width:${w}px">${titleEl(title, sub, w)}${svg}</div>`;
  // The routes draw along their own paths, then the endpoints land on top of them.
  return wrap({ x, y, w, html, start, dur, parts: [
    { select: '.arc', anim: 'drawOn', each: 0.9, stagger: 0.11, delay: 0.25, ease: 'power2.inOut', out: true },
    { select: '.node', anim: 'popIn', each: 0.35, stagger: 0.06, delay: 0.75, ease: 'back.out(1.8)', out: true },
  ] });
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this family. Vocabulary and checker: blocks/schema.mjs; the doctrine is
// core/lightfield/options.js, mirrored key for key. x · y · start · dur appear in no table: they are
// placement and timing the scene supplies, never content an author dials.
export const GEO_SCHEMAS = {
  usMapHex: {
    w: { kind: 'int', min: 320, max: 1920, def: 1180 },
    // [{code, value}] keyed by two-letter USPS postal code. A code the grid does not name is ignored.
    data: { kind: 'list', of: { kind: 'row', fields: {
      code: { kind: 'str', max: 2 },
      value: { kind: 'num', min: -1e12, max: 1e12 },
    } }, def: [] },
    title: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 160, def: '' },
    legend: { kind: 'str', max: 24, def: '' },
    showLegend: { kind: 'bool', def: true },
    unit: { kind: 'str', max: 8, def: '' },
    showValues: { kind: 'bool', def: true },
  },

  usMap: {
    w: { kind: 'int', min: 320, max: 1920, def: 1200 },
    h: { kind: 'int', min: 200, max: 1080, def: 720 },
    data: { kind: 'list', of: { kind: 'row', fields: {
      code: { kind: 'str', max: 2 },
      value: { kind: 'num', min: -1e12, max: 1e12 },
    } }, def: [] },
    title: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 160, def: '' },
    legend: { kind: 'str', max: 24, def: '' },
    showLegend: { kind: 'bool', def: true },
    unit: { kind: 'str', max: 8, def: '' },
    labels: { kind: 'bool', def: true },
    // Label only the regions at or above this fraction of the range. 0 labels every region with data;
    // on a crowded map the small ones are the ones worth dropping.
    labelMin: { kind: 'unit', def: 0 },
  },

  worldMap: {
    w: { kind: 'int', min: 320, max: 1920, def: 1360 },
    h: { kind: 'int', min: 200, max: 1080, def: 700 },
    // Keyed by ISO 3166-1 alpha-3 ("USA", "DEU"), which is what the baked table carries.
    data: { kind: 'list', of: { kind: 'row', fields: {
      code: { kind: 'str', max: 3 },
      value: { kind: 'num', min: -1e12, max: 1e12 },
    } }, def: [] },
    title: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 160, def: '' },
    legend: { kind: 'str', max: 24, def: '' },
    showLegend: { kind: 'bool', def: true },
    unit: { kind: 'str', max: 8, def: '' },
    // Off by default: 176 countries is too many small shapes to letter, unlike the 51 US states.
    labels: { kind: 'bool', def: false },
    labelMin: { kind: 'unit', def: 0.6 },
  },

  usMapBubble: {
    w: { kind: 'int', min: 320, max: 1920, def: 1200 },
    h: { kind: 'int', min: 200, max: 1080, def: 720 },
    // A point gives lon/lat, or a `name` the built-in US city table knows. Neither one throws.
    points: { kind: 'list', of: { kind: 'row', fields: {
      name: { kind: 'str', max: 40 },
      lon: { kind: 'num', min: -180, max: 180 },
      lat: { kind: 'num', min: -90, max: 90 },
      value: { kind: 'num', min: 0, max: 1e12 },
    } }, def: [] },
    title: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 160, def: '' },
    // The radius of the LARGEST circle. Area is proportional to the value, so this is the only end of
    // the scale an author sets; `minR` keeps the smallest one from vanishing.
    maxR: { kind: 'int', min: 8, max: 200, def: 46 },
    minR: { kind: 'int', min: 1, max: 100, def: 7 },
    unit: { kind: 'str', max: 8, def: '' },
    callouts: { kind: 'bool', def: true },
    color: { kind: 'color', def: 'var(--accent)' },
  },

  usMapFlow: {
    w: { kind: 'int', min: 320, max: 1920, def: 1200 },
    h: { kind: 'int', min: 200, max: 1080, def: 720 },
    flows: { kind: 'list', of: { kind: 'row', fields: {
      from: { kind: 'str', max: 40 },
      to: { kind: 'str', max: 40 },
      fromLon: { kind: 'num', min: -180, max: 180 },
      fromLat: { kind: 'num', min: -90, max: 90 },
      toLon: { kind: 'num', min: -180, max: 180 },
      toLat: { kind: 'num', min: -90, max: 90 },
      // Sets the stroke weight, relative to the heaviest route.
      value: { kind: 'num', min: 0, max: 1e12 },
    } }, def: [] },
    title: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 160, def: '' },
    // How far the arc bows off its chord, as a fraction of the chord's own length. 0 is a straight
    // line; past about 0.35 the curve stops reading as a route and starts reading as a loop.
    bow: { kind: 'num', min: 0, max: 0.6, def: 0.22 },
    color: { kind: 'color', def: 'var(--accent)' },
    // The one node drawn filled and bold: the origin every route shares, if there is one.
    hub: { kind: 'str', max: 40, def: '' },
    labels: { kind: 'bool', def: true },
  },
};
