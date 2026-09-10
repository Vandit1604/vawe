// recipes/expand.mjs: expandRecipes(scene) -> scene, the one recipe expander. Turns a scene's
// top-level `recipes: [{recipe, at, out, in, ground, params}]` into plain `motion` keys and layer
// windows (start/duration) on the layers the author already named, then removes `recipes`. Pure:
// returns a new scene, never mutates the one it was handed, so a scene with no `recipes` passes
// through unchanged (same idempotence contract as core/engine/expand.js `expandScene`).
//
// Called from expandScene itself (core/engine/expand.js), the one place `{type:"beat"}` sugar already
// expands, so a scene carrying `recipes[]` renders through every existing path (`./bin/vawe`, `make
// dev`, the Node gates, the Go server's expand-blocks.mjs shell-out) with no second expansion site.
import { pickRecipe } from './index.mjs';

const AXIS_PROP = { x: 'x', y: 'y' };

function findLayer(scene, id) {
  return (scene.layers || []).find((l) => l.id === id);
}

// paramOf: the author's override if given, else the recipe's measured default. An enum'd param
// (`axis`) is checked so a typo or an invented value is refused, never silently accepted.
function paramOf(recipeName, recipe, key, overrides) {
  const spec = recipe.params[key];
  if (!spec) throw new Error(`recipe "${recipeName}": no param "${key}"`);
  const v = (overrides && key in overrides) ? overrides[key] : spec.default;
  if (spec.enum && !spec.enum.includes(v))
    throw new Error(`recipe "${recipeName}": param "${key}" must be one of ${spec.enum.join(', ')}, got ${JSON.stringify(v)}`);
  return v;
}

const SEAM_PROPS = ['x', 'y', 'z', 'rotX', 'rotY'];

function expandSeamLine(scene, line) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };

  const recipe = pickRecipe(name);
  if (recipe.kind !== 'seam') bad(`expand.mjs only expands kind "seam" today, got "${recipe.kind}"`);
  for (const slot of ['at', 'out', 'in']) if (line[slot] == null) bad(`missing slot "${slot}"`);

  const outLayer = findLayer(scene, line.out);
  if (!outLayer) bad(`no layer id "${line.out}" (the "out" slot)`);
  const inLayer = findLayer(scene, line.in);
  if (!inLayer) bad(`no layer id "${line.in}" (the "in" slot)`);

  const axis = paramOf(name, recipe, 'axis', line.params);
  const gap = paramOf(name, recipe, 'gap', line.params);
  const exitDur = paramOf(name, recipe, 'exitDur', line.params);
  const enterDur = paramOf(name, recipe, 'enterDur', line.params);
  const groundFade = paramOf(name, recipe, 'groundFade', line.params);
  const exitPx = paramOf(name, recipe, 'exitPx', line.params)[axis];
  const enterPx = paramOf(name, recipe, 'enterPx', line.params)[axis];
  const driftPx = paramOf(name, recipe, 'driftPx', line.params)[axis];
  const prop = AXIS_PROP[axis];
  const at = line.at;
  const outStart = outLayer.start ?? 0;

  if (at - exitDur < outStart) bad(`"at" (${at}) minus exitDur (${exitDur}) lands before "${line.out}" even starts (${outStart})`);

  // Depth collision: every layer shares ONE CSS preserve-3d space once any layer keys z/rotX/rotY
  // (formats/scene/scene.js ~1131), so a tilted seam layer cuts through a flat full-bleed ground at
  // z=0. Refuse and name the fix rather than move the ground into depth silently.
  const outKeysDepth = (outLayer.motion || []).some((k) => k.z != null || k.rotX != null || k.rotY != null);
  if (outKeysDepth && line.ground) {
    for (const gid of line.ground) {
      const g = findLayer(scene, gid);
      if (!g) continue;
      const plane = (g.modifiers || []).find((m) => 'plane' in m)?.plane;
      if (plane == null)
        bad(`ground layer "${gid}" sits at z=0 but "${line.out}" keys z/rotX/rotY; every layer shares one ` +
          `preserve-3d space once any layer tilts, so the flat ground gets cut through. Give "${gid}" a ` +
          `modifiers:[{plane:-2000}] (drawn oversize) to pull it behind`);
    }
  }

  // Collision: refuse rather than silently overwrite motion the author already keyed for this
  // property inside the seam window (from the anticipation drift onward).
  const collideFrom = at - exitDur;
  const already = new Set((outLayer.motion || [])
    .filter((k) => outStart + k.t >= collideFrom - 1e-6 && k[prop] != null)
    .map(() => prop));
  if (already.size) bad(`"${line.out}" already has "${prop}" keys inside the seam window (from ${collideFrom.toFixed(2)}s); the recipe would collide with them`);

  // OUT: an anticipation drift the wrong way, then an easeInCubic rush ending exactly at `at`.
  outLayer.motion = [...(outLayer.motion || []),
    { t: collideFrom - outStart, [prop]: driftPx, ease: 'easeInOutSine' },
    { t: at - outStart, [prop]: -exitPx, ease: 'easeInCubic' }];
  outLayer.duration = Math.max(outLayer.duration ?? 0, at - outStart);

  // IN: starts at + gap (the measured empty-ground window), arrives decelerating over enterDur.
  // Any motion the author already keyed on the "in" layer describes what happens AFTER arrival
  // (madera's tagline keeps drifting once it lands) and rides along unshifted, still relative to start.
  inLayer.start = at + gap;
  inLayer.motion = [
    { t: 0, [prop]: enterPx },
    { t: enterDur, [prop]: 0, ease: 'easeOutCubic' },
    ...(inLayer.motion || [])];

  // GROUND: outgoing fades to 0, incoming fades in, both centred on `at` over groundFade.
  if (line.ground) {
    const [outGid, inGid] = line.ground;
    const half = groundFade / 2;
    const og = outGid && findLayer(scene, outGid);
    if (og) {
      const base = og.opacity ?? 1;
      const gStart = og.start ?? 0;
      og.motion = [...(og.motion || []),
        { t: (at - half) - gStart, opacity: base },
        { t: (at + half) - gStart, opacity: 0, ease: 'easeInOutCubic' }];
    }
    const ig = inGid && findLayer(scene, inGid);
    if (ig) {
      const base = ig.opacity ?? 1;
      const gStart = ig.start ?? 0;
      ig.motion = [...(ig.motion || []),
        { t: (at - half) - gStart, opacity: 0 },
        { t: (at + half) - gStart, opacity: base, ease: 'easeInOutCubic' }];
    }
  }
}

export function expandRecipes(scene) {
  if (!scene || typeof scene !== 'object' || !('recipes' in scene)) return scene;
  const { recipes, ...rest } = scene;
  const out = { ...rest, layers: (scene.layers || []).map((l) => ({ ...l })) };
  for (const line of recipes || []) expandSeamLine(out, line);
  return out;
}
