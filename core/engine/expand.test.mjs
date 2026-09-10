// core/engine/expand.test.mjs: expandScene(data, aspectKey) resolves a cameraMove bake and a flow-seam's
// travel against the CANVAS THE RENDER ACTUALLY TARGETS, not always the scene's own declared aspect.
// Before this test could pass, both baked at the scene's own aspect regardless of aspectKey, because
// frameOf(data) and sceneDims(scene) were called with no key (docs/CRAFT/ENGINE-CHANGES.md "one fact, one
// owner": the aspect a render targets has one owner, internal/render/render.go's o.Aspect, and this test
// pins that expandScene actually receives it rather than re-deriving the scene's own aspect).
import assert from 'node:assert/strict';
import { expandScene } from './expand.js';

// A window-dolly-shaped cameraMove: diveIn centres (tx,ty) at scale `to`. Its baked x/y is
// canvasW/2 - tx, canvasH/2 - ty (core/camera-moves/dive-in.js), so a wider or taller canvas moves the
// landed position, and that is exactly the property a mis-resolved aspect breaks.
function sceneWithCamera(aspect) {
  return {
    module: 'scene', aspect, duration: 3,
    cameraMove: { move: 'diveIn', start: 0, dur: 1.5, tx: 1200, ty: 700, to: 1.6 },
    layers: [{ type: 'html', id: 'window', x: 1000, y: 600, w: 400, h: 300, start: 0, duration: 3 }],
  };
}

{
  const at16x9 = expandScene(sceneWithCamera('16:9'), '16:9');
  const at9x16 = expandScene(sceneWithCamera('16:9'), '9:16'); // scene DECLARES 16:9, render targets 9:16
  const land16 = at16x9.camera.find((k) => k.s === 1.6);
  const land9 = at9x16.camera.find((k) => k.s === 1.6);
  assert.ok(land16 && land9, 'both bakes must produce the landing keyframe');
  // 16:9 canvas is 1920x1080 -> x = 960-1200=-240, y = 540-700=-160
  assert.equal(land16.x, 960 - 1200);
  assert.equal(land16.y, 540 - 700);
  // 9:16 canvas is 1080x1920 -> x = 540-1200=-660, y = 960-700=260
  assert.equal(land9.x, 540 - 1200);
  assert.equal(land9.y, 960 - 700);
  assert.notEqual(land16.x, land9.x, 'a camera baked at the render aspect must not match the scene-aspect bake');
  assert.notEqual(land16.y, land9.y);
}

// No aspectKey (every existing Node caller: loadScene, `make expand`) keeps today's default, the scene's
// own declared aspect, so nothing that omits the key changes behaviour.
{
  const baked = expandScene(sceneWithCamera('9:16'));
  const land = baked.camera.find((k) => k.s === 1.6);
  assert.equal(land.x, 540 - 1200); // 9:16 canvas: 1080x1920
  assert.equal(land.y, 960 - 700);
}

// A flow-seam's exit/enter travel (recipes/expand.mjs expandSeamLine) is measured off sceneDims too, so
// it must move with the same aspectKey rather than always the scene's own.
function sceneWithSeam(aspect) {
  return {
    module: 'scene', aspect, duration: 4,
    recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'window', in: 'tagline' }],
    layers: [
      { type: 'html', id: 'window', x: 150, y: 90, w: 1500, h: 900, start: 0, duration: 1.95 },
      { type: 'text', id: 'tagline', x: 90, y: 480, size: 92, start: 1.8, duration: 2.18 },
    ],
  };
}

{
  const at16x9 = expandScene(sceneWithSeam('16:9'), '16:9');
  const at9x16 = expandScene(sceneWithSeam('16:9'), '9:16');
  // The FIRST x key is the anticipation drift (a fixed param, not canvas-dependent); the LAST is the
  // actual exit travel (-exitPx, which sceneDims/aspectKey drives) - take the last.
  const exitX = (s) => [...(s.layers.find((l) => l.id === 'window').motion || [])].reverse().find((k) => k.x != null)?.x;
  const x16 = exitX(at16x9), x9 = exitX(at9x16);
  assert.ok(Number.isFinite(x16) && Number.isFinite(x9), 'both bakes must key an exit x');
  assert.notEqual(x16, x9, 'a seam baked at the render aspect must travel a different distance than the scene-aspect bake (1920 vs 1080 wide canvas)');
}

console.log('ok - expand.test.mjs');
