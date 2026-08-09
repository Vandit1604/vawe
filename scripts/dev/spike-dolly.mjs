// scripts/dev/spike-dolly.mjs — PHASE 0 SPIKE: can the CAMERA travel past a tilted layer?
//
// scripts/dev/spike-3d.mjs settled where the lens goes (`perspective` as a PROPERTY, on the tilted
// layer's DIRECT parent) and shipped `tilt`. It left the other half open: with the lens on #cam and the
// camera's own s/x/y written as a 2D transform ON #cam, the projection has already happened by the time
// the camera moves. Panning #cam slides a finished picture, so a tilted card's vanishing point travels
// WITH the card and the perspective never changes. That is a zoom into a photograph, not a dolly.
//
// The construction under test moves the lens ONE LEVEL UP and turns #cam into a RIG:
//   #root { perspective: P; perspective-origin: O }        <- the eye, fixed to the frame
//   #cam  { transform-style: preserve-3d;                   <- the rig, INSIDE the eye's space
//           transform: translate3d(x, y, z) rotateZ/X/Y }
//   .hs-layer { rotate: <axis> <deg> }                      <- tilt, unchanged
// Every layer rotation now composes with the rig's transform in ONE 3D space, projected once. So
// translateZ IS a dolly (the lens is untouched, near things grow faster than far ones), rotateZ IS a
// roll, and a plain x pan becomes a TRUCK: the eye stays on the frame's axis while the card crosses it,
// which is precisely the reprojection the flat path cannot produce.
//
// Four questions, each answered by a number rather than a look:
//   1. does the engine's real CSS survive preserve-3d on #cam? (`will-change: transform` is on it, and
//      overflow/filter/opacity are the documented flatteners — will-change is not, but assert it.)
//   2. under a TRUCK, does a tilted card's vanishing point move relative to the card? (the flat path
//      keeps it nailed on: that difference is the whole finding.)
//   3. does translateZ dolly (scale up) without changing the foreshortening? (a dolly is not a zoom.)
//   4. does the rig leave an UNTILTED, unmoved camera exactly where the flat path put it? (byte-identity)
//
//   node scripts/dev/spike-dolly.mjs
import puppeteer from 'puppeteer';

const W = 1080, H = 1920;
const OX = W / 2, OY = H / 2;
const CARD = { x: 390, y: 860, w: 300, h: 200 };
const RY = 26;            // the card's own lean, as `tilt: { y: 26 }` would write it
const PERSP = 1600;

const marker = (cx, cy) => `<i data-m style="position:absolute;left:${cx};top:${cy};width:1px;height:1px"></i>`;
const card = (rot = `rotate:0 1 0 ${RY}deg;`) => `
  <div class="hs-layer" id="card" style="position:absolute;left:${CARD.x}px;top:${CARD.y}px;
       width:${CARD.w}px;height:${CARD.h}px;background:#39f;will-change:transform,opacity,filter;${rot}">
    <div style="position:absolute;inset:0">
      ${marker(0, 0)}${marker('100%', 0)}${marker(0, '100%')}${marker('100%', '100%')}
    </div>
  </div>`;

// FLAT — exactly what formats/scene/scene.js writes today: lens on #cam (tilt), camera as a 2D
// transform on that same #cam.
const flat = (camTf) => `
  <div id="root" style="position:absolute;inset:0;overflow:hidden">
    <div id="cam" style="position:absolute;inset:0;will-change:transform;transform-origin:50% 50%;
         perspective:${PERSP}px;perspective-origin:${OX}px ${OY}px;transform:${camTf}">${card()}</div>
  </div>`;

// RIG — the construction under test.
const rig = (camTf) => `
  <div id="root" style="position:absolute;inset:0;overflow:hidden;
       perspective:${PERSP}px;perspective-origin:${OX}px ${OY}px">
    <div id="cam" style="position:absolute;inset:0;will-change:transform;transform-origin:50% 50%;
         transform-style:preserve-3d;transform:${camTf}">${card()}</div>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

async function corners(html) {
  await page.setContent(`<body style="margin:0;width:${W}px;height:${H}px;background:#111;position:relative">${html}</body>`);
  return page.evaluate(() => [...document.querySelectorAll('#card [data-m]')].map((m) => {
    const r = m.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }));
}

// Intersection of the top-edge line with the bottom-edge line: the card's own vanishing point.
function vpOf(c) {
  const [tl, tr, bl, br] = c;
  const d1x = tr.x - tl.x, d1y = tr.y - tl.y, d2x = br.x - bl.x, d2y = br.y - bl.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((bl.x - tl.x) * d2y - (bl.y - tl.y) * d2x) / den;
  return { x: tl.x + t * d1x, y: tl.y + t * d1y };
}
const cx = (c) => c.reduce((a, p) => a + p.x, 0) / 4;
// foreshortening: the ratio of the two vertical edges. 1.0 is face-on; the further from 1, the harder
// the lean reads. Right for a DOLLY and for detecting a flattened context.
const fore = (c) => Math.abs(c[2].y - c[0].y) / Math.abs(c[3].y - c[1].y);
// projected width — the measurement a horizontal TRUCK actually moves, and the first draft of this
// spike used `fore` here and reported a working construction as broken. The projection factor
// L/(L-z) depends on z ALONE, so an x translation cannot touch the vertical edges: it scales the two
// corners by their own unequal factors and the card's WIDTH changes. Measure what the move can move.
const wide = (c) => Math.abs(c[1].x - c[0].x);

const PAN = 300;
const out = [];
let fail = 0;
const ok = (name, pass, detail) => { if (!pass) fail++; out.push([name, pass, detail]); };

// 1 · identity — the rig must not move an untouched camera by a single pixel.
{
  const f = await corners(flat('scale(1) translate(0px, 0px)'));
  const r = await corners(rig('translate3d(0px, 0px, 0px) scale(1)'));
  const d = Math.max(...f.map((p, i) => Math.hypot(p.x - r[i].x, p.y - r[i].y)));
  ok('identity', d < 0.01, `max corner delta ${d.toFixed(4)}px`);
}

// 2 · TRUCK — pan the camera and ask where the card's vanishing point went RELATIVE TO THE CARD.
// Flat: the projection is already baked, so the VP rides along and the offset is unchanged.
// Rig: the eye stays on the frame axis, so the offset must change by a large, visible amount.
{
  const f0 = await corners(flat('scale(1) translate(0px, 0px)'));
  const f1 = await corners(flat(`scale(1) translate(${-PAN}px, 0px)`));
  const r0 = await corners(rig('translate3d(0px, 0px, 0px) scale(1)'));
  const r1 = await corners(rig(`translate3d(${-PAN}px, 0px, 0px) scale(1)`));
  const rel = (c) => vpOf(c).x - cx(c);
  const dFlat = Math.abs(rel(f1) - rel(f0));
  const dRig = Math.abs(rel(r1) - rel(r0));
  ok('truck · flat keeps the vanishing point nailed to the card', dFlat < 1, `moved ${dFlat.toFixed(2)}px`);
  ok('truck · rig reprojects as the camera travels', dRig > 200, `moved ${dRig.toFixed(1)}px`);
  const pct = (a, b) => (100 * Math.abs(wide(b) - wide(a))) / wide(a);
  ok('truck · flat cannot change the card\'s shape', pct(f0, f1) < 0.2, `projected width moved ${pct(f0, f1).toFixed(2)}%`);
  ok('truck · rig re-foreshortens the card', pct(r0, r1) > 5, `projected width moved ${pct(r0, r1).toFixed(2)}%`);
}

// 3 · DOLLY — translateZ must magnify by the projective law P/(P-z) and must NOT be a scale():
// a scale leaves the lean untouched, a dolly does not.
{
  const z = 500;
  const r0 = await corners(rig('translate3d(0px, 0px, 0px) scale(1)'));
  const rz = await corners(rig(`translate3d(0px, 0px, ${z}px) scale(1)`));
  const width = (c) => Math.abs(c[1].x - c[0].x);
  const got = width(rz) / width(r0), want = PERSP / (PERSP - z);
  ok('dolly · magnifies by P/(P-z)', Math.abs(got - want) < 0.02, `got ${got.toFixed(3)}, want ${want.toFixed(3)}`);
  const rs = await corners(rig(`translate3d(0px, 0px, 0px) scale(${want.toFixed(4)})`));
  const dLean = Math.abs(fore(rz) - fore(rs));
  ok('dolly · is not the same shot as a scale of equal size', dLean > 0.01, `lean differs by ${dLean.toFixed(4)}`);
}

// 4 · ROLL — rotateZ on the rig must rotate the frame without flattening the card's lean.
{
  const r0 = await corners(rig('translate3d(0px, 0px, 0px) scale(1)'));
  const rr = await corners(rig('translate3d(0px, 0px, 0px) rotateZ(8deg) scale(1)'));
  const ang = (c) => (Math.atan2(c[1].y - c[0].y, c[1].x - c[0].x) * 180) / Math.PI;
  const d = ang(rr) - ang(r0);
  ok('roll · rotates the frame by the angle asked for', Math.abs(d - 8) < 1.5, `top edge turned ${d.toFixed(2)}deg`);
  ok('roll · the card is still leaning', Math.abs(fore(rr) - 1) > 0.05, `foreshortening ${fore(rr).toFixed(3)}`);
}

// 5 · preserve-3d survives the engine's own CSS on #cam (will-change: transform is the one in doubt).
{
  const r = await corners(rig('translate3d(0px, 0px, 0px) scale(1)'));
  ok('preserve-3d survives `will-change: transform` on #cam', Math.abs(fore(r) - 1) > 0.05,
    `foreshortening ${fore(r).toFixed(3)} (1.000 would mean FLATTENED)`);
}

await browser.close();

console.log('\n  SPIKE · a camera that travels past a tilted card\n');
for (const [name, pass, detail] of out)
  console.log(`  ${pass ? '✓' : '✗'} ${name.padEnd(58)} ${detail}`);
console.log(fail === 0
  ? '\n  ✓ GO — the rig dollies, rolls and reprojects, and an untouched camera is pixel-identical\n'
    + '    to the flat path. The flat path provably CANNOT move a vanishing point.\n'
  : `\n  ✗ NO-GO — ${fail} check(s) failed.\n`);
process.exit(fail === 0 ? 0 : 1);
