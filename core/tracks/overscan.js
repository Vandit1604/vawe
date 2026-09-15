// core/tracks/overscan.js: the minimum extra scale a FULL-BLEED plane needs, under the camera rig, so
// its projected quad still covers the viewport once it tilts or stands off the picture plane.
//
// THE PROBLEM THIS CLOSES. A full-canvas plane (a background `group`, an `html` layer sized to the
// stage) is a flat rectangle. Under perspective, tilting it (rotX/rotY) or pushing it back (a `plane`
// depth, or a keyed `z`) foreshortens it, so its projected corners can land INSIDE the viewport and the
// stage behind it shows at the frame's edge. A 3D compositor's fix is OVERSCAN: draw the plane larger
// than its frame so the foreshortened edge still lands off-screen (Foundry Modo: a background plane
// "automatically scales to fit the camera frustum"). This is that scale, recomputed fresh every frame
// from the pose alone: nothing is carried from an earlier frame into this one.
//
// OUT OF SCOPE, BY NAME: a card or panel that is smaller than the stage, or full on one axis only, is
// not trying to be the background, its edge is content. `isFullBleedPlane` below is the line: only a
// box that already covers the canvas on both axes, before any tilt, is grown to hide its own edge.
//
// THE MATH is real projection, not an eyeballed fudge factor: the 4 corners of the plane (at a trial
// overscan multiplier) are carried through the same transform chain the browser applies -- the layer's
// own translate3d/scale/rotate/rotateX/rotateY, the camera rig's translate3d/rotateZ/rotateX/rotateY,
// and the perspective divide `perspective` puts on #root -- as plain 4x4 matrices (no DOMMatrix: this
// file is imported by the Node-side pure-math tests, core/tracks/motion.js is the only DOM-side
// caller). Two independent axes of rotation, plus a camera that can carry its own, do not reduce to one
// closed-form scale, so `coverScale` bisects instead: project the corners at a trial scale, ask whether
// the projected quad contains the 4 viewport corners, and binary-search the smallest scale that does.

const num = (v) => typeof v === 'number' && Number.isFinite(v);

// isFullBleedPlane(box, canvas): true when box already covers the stage on both axes, at rest (before
// any tilt is applied). Half a pixel of slack absorbs layout rounding, not a deliberate under-cover.
export function isFullBleedPlane(box, canvas) {
  if (!box || !canvas || !num(box.x) || !num(box.y) || !num(box.w) || !num(box.h)) return false;
  return box.x <= 0.5 && box.y <= 0.5
    && box.x + box.w >= canvas.w - 0.5 && box.y + box.h >= canvas.h - 0.5;
}

// ---- plain 4x4 matrices, row-major flat arrays of 16, exactly CSS's own semantics -----------------
function mMul(a, b) {
  const r = new Array(16);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[row * 4 + k] * b[k * 4 + col];
      r[row * 4 + col] = s;
    }
  return r;
}
const mIdentity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mTranslate = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
const mScale = (sx, sy, sz) => [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
function mRotateZ(deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function mRotateX(deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}
function mRotateY(deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
}
// CSS `perspective: d` on the ancestor is the standard projective row, m[3][2] = -1/d (index 14 here).
const mPerspective = (d) => { const m = mIdentity(); m[14] = -1 / d; return m; };
function apply(m, p) {
  const [x, y, z, w] = p;
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3] * w,
    m[4] * x + m[5] * y + m[6] * z + m[7] * w,
    m[8] * x + m[9] * y + m[10] * z + m[11] * w,
    m[12] * x + m[13] * y + m[14] * z + m[15] * w,
  ];
}
// Chain a list of matrices in APPLICATION order (first entry applied to the point first) into one
// matrix: p' = last(...first(p)) = (last * ... * first) * p, so the fold multiplies in reverse.
function chain(mats) { return mats.reduceRight((acc, m) => (acc ? mMul(m, acc) : m), null); }

// projectCorner(k, corner, pose): where one corner of the plane (in its own unscaled box units, corner
// = {u,v} each 0 or 1) lands on screen, relative to the canvas centre, at trial overscan factor k.
function projectCorner(k, corner, pose) {
  const { box, originPct, scale, rotZ, rotX, rotY, z, canvas, persp, cam } = pose;
  const ox = (originPct.ox / 100) * box.w, oy = (originPct.oy / 100) * box.h;
  // local, relative to the transform-origin, in the element's own (unscaled) box units
  const lx = corner.u * box.w - ox, ly = corner.v * box.h - oy;
  // COMPOSITION ORDER matched to core/tracks/motion.js's has3D transform string:
  // `translate3d(dx,dy,z) scale(s) rotate(rot) rotateX(rotX) rotateY(rotY)`. dx/dy are already folded
  // into `box` (scene.boxOf reports the CURRENT, translated position), so only z is applied here.
  const local = chain([
    mRotateY(rotY), mRotateX(rotX), mRotateZ(rotZ), mScale(k * scale, k * scale, 1), mTranslate(0, 0, z),
  ]);
  const afterLocal = apply(local, [lx, ly, 0, 1]);
  // back to canvas-centre-relative world space: add the origin and the box's own position, then
  // recentre. Assumes the rig's perspective-origin is the canvas centre, its default (films/scene/
  // scene.js sets it from an authored top-level `tilt.origin`, otherwise 50% 50%).
  const world = [
    ox + afterLocal[0] + box.x - canvas.w / 2,
    oy + afterLocal[1] + box.y - canvas.h / 2,
    afterLocal[2],
    1,
  ];
  // THE CAMERA RIG: `translate3d(x,y,dollyZ) rotateZ(roll) rotateX(rx) rotateY(ry)` on #cam, rotating
  // about its own centre, which is the canvas centre this function already recentred to.
  const camMat = chain([
    mRotateY(cam.ry), mRotateX(cam.rx), mRotateZ(cam.roll), mTranslate(cam.x, cam.y, cam.z),
  ]);
  const eye = apply(camMat, world);
  const proj = apply(mPerspective(persp), eye);
  return { x: proj[0] / proj[3], y: proj[1] / proj[3] };
}

const CORNERS = [{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 }]; // TL,TR,BR,BL, in order

// pointInConvexQuad: ray-cast-free convex test, the cross product of each edge with the point must keep
// one sign (or zero, on the edge). A projected plane under a tilt this engine can express (well under
// 90 degrees a side) stays a simple, convex quad; a self-intersecting projection is out of scope.
function pointInConvexQuad(p, quad) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i], b = quad[(i + 1) % 4];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

// covers(k, pose): does the plane's projected quad, at overscan factor k, contain all 4 viewport
// corners?
function covers(k, pose) {
  const quad = CORNERS.map((c) => projectCorner(k, c, pose));
  const { w, h } = pose.canvas;
  const viewport = [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];
  return viewport.every((v) => pointInConvexQuad(v, quad));
}

// coverScale(pose): the minimum k >= 1 such that the plane's projected quad covers the viewport.
// `pose`: { box:{x,y,w,h}, originPct:{ox,oy}, scale, rotZ, rotX, rotY, z, canvas:{w,h}, persp,
//           cam:{x,y,z,rx,ry,roll} }, all already resolved for THIS frame: a pure function of them.
export function coverScale(pose) {
  if (covers(1, pose)) return 1; // the common case: flat, or already covering. No bisection needed.
  let lo = 1, hi = 2;
  const MAX = 64; // a plane needing more than 64x is a pose this guard cannot help; stop rather than spin
  while (!covers(hi, pose) && hi < MAX) hi *= 2;
  if (!covers(hi, pose)) return hi; // named ceiling, not a silent wrong answer
  for (let i = 0; i < 40; i++) { // ~1e-11 relative precision, plenty for a px-level answer
    const mid = (lo + hi) / 2;
    if (covers(mid, pose)) hi = mid; else lo = mid;
  }
  return hi;
}
