// harness/lib/craft-route.mjs: which 1-3 CRAFT docs to read RIGHT NOW, for this film.
//
// WHY THIS EXISTS. engine-doctrine/CRAFT/ carries ~60 docs. `make stage`/`make next` already print the
// one skill the open stage wants (harness/lib/skill-stages.mjs). What they did not print was which of
// those ~60 docs actually bears on the film in front of the author: a launch film with a camera move
// and a finish pass needs different reading than a vertical explainer with captions. Reading all of
// CRAFT is not reading any of it.
//
// THE TABLE LIVES IN THE DOCS, NOT HERE. A doc that wants to be routed for a scene feature declares
// `routes:` in its own frontmatter, a comma list of feature keys (see FEATURE below). Adding a new doc
// to the routing table is writing that one line, never editing this file. The film-TYPE half of the
// table already exists, unduplicated: harness/author/route.mjs's ROUTES array, each row naming the one
// doc for that deliverable (a launch video, an explainer, a recreation, ...).
//
// RANKING. A feature actually present in the scene beats a guess about the film's type (concrete over
// inferred), and a type match beats nothing. Ties keep source order. Capped at 3: MISTAKES.md already
// has an entry for "the agent read six docs and synthesised none of them".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatterField } from './skill-stages.mjs';
import { route as routeByText, docForType } from '../author/route.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CRAFT_DIR = path.join(ROOT, 'engine-doctrine/CRAFT');

function walkLayers(layers, fn) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    fn(L);
    if (Array.isArray(L.children)) walkLayers(L.children, fn);
  }
}

/**
 * sceneFeatures(scene) -> {camera, three, captions, transitions, musicBed, finish}. The feature
 * vocabulary a CRAFT doc's `routes:` line can name, computed the same way for every caller: a camera
 * key or `cameraMove` sugar, a `type: "three"` layer, a non-empty `captions` array, any boundary
 * (`transitions`/`cuts`/`seams`/`stings`), a music bed (`audio.music`), and a `finish` block.
 */
export function sceneFeatures(scene) {
  let three = false;
  walkLayers(scene?.layers, (L) => { if (L.type === 'three') three = true; });
  const camera = !!(scene?.cameraMove || (Array.isArray(scene?.camera) && scene.camera.length > 0));
  const captions = Array.isArray(scene?.captions) && scene.captions.length > 0;
  const transitions = ['transitions', 'cuts', 'seams', 'stings']
    .some((k) => Array.isArray(scene?.[k]) && scene[k].length > 0);
  const a = scene && typeof scene.audio === 'object' && scene.audio;
  const musicBed = !!(a && typeof a.music === 'string' && a.music);
  const finish = !!(scene && typeof scene.finish === 'object' && scene.finish);
  return { camera, three, captions, transitions, musicBed, finish };
}

/** filmType(text) -> 'launch' | 'explainer' | 'recreation' | 'sting' | 'demo' | null (no row matched). */
export function filmType(text) {
  if (!text || !text.trim()) return null;
  const r = routeByText(text);
  return r.type || null;
}

/** Every engine-doctrine/CRAFT/*.md that declares `routes:`, as {rel, keys[]}. */
function routeTable() {
  const files = fs.existsSync(CRAFT_DIR) ? fs.readdirSync(CRAFT_DIR).filter((f) => f.endsWith('.md')) : [];
  const rows = [];
  for (const f of files) {
    const abs = path.join(CRAFT_DIR, f);
    const raw = frontmatterField(fs.readFileSync(abs, 'utf8'), 'routes');
    if (!raw) continue;
    const keys = raw.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length) rows.push({ rel: `engine-doctrine/CRAFT/${f}`, keys });
  }
  return rows;
}

/**
 * craftDocsFor({type, features}) -> ['engine-doctrine/CRAFT/....md', ...], 1-3 entries, most relevant
 * first. `type` is a film type from filmType() (or null); `features` is sceneFeatures()'s output (or
 * {} if there is no scene yet). A feature actually present in the scene (score 2) outranks a doc that
 * only matches the film's inferred type (score 1): concrete over guessed. The type's own doc
 * (harness/author/route.mjs's docForType, one shared table, never a second copy here) is added at the
 * type score too, so a type with no CRAFT doc naming it in `routes:` still surfaces its intake doc.
 */
export function craftDocsFor({ type = null, features = {} } = {}) {
  const scored = new Map();
  const bump = (rel, score) => scored.set(rel, Math.max(scored.get(rel) || 0, score));

  for (const { rel, keys } of routeTable()) {
    if (keys.some((k) => features[k] === true)) bump(rel, 2);
    else if (type && keys.includes(type)) bump(rel, 1);
  }
  if (type) {
    const typeDoc = docForType(type);
    if (typeDoc) bump(typeDoc, 1);
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([rel]) => rel);
}
