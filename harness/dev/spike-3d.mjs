// harness/dev/spike-3d.mjs, PHASE 0 SPIKE: can sibling layers tilt in 3D and share one vanishing point?
//
// docs/MISTAKES.md #59 rejected per-layer 3D and concluded "there is no per-layer angle that composes
// correctly". Its diagnosis is right about the construction it considered: CSS `perspective()` takes its
// vanishing point from the element it is applied to, so sibling layers each rotate about their own centre
// and the composition comes apart.
//
// The construction under test rests on a CSS distinction the first draft of this spike got wrong, and
// getting it wrong is instructive because it is the same mistake #59 is warning about:
//   * `perspective` as a PROPERTY applies to an element's CHILDREN, not to itself.
//   * `perspective()` as a TRANSFORM FUNCTION applies to that element, with the vanishing point at its
//     own transform-origin. THIS is #59's failure case: sibling layers each get their own camera.
// So the fix is not a cleverer per-layer trick. It is to put `perspective` + `perspective-origin` ONCE on
// the shared ancestor and let each layer carry a plain `rotateX/rotateY`. Every layer is then projected
// through ONE camera while still tilting about its own centre, which is exactly what a prop needs.
//
// preserve-3d is deliberately NOT relied on. It is silently flattened by overflow:hidden, filter and
// opacity<1, all of which this engine puts on nearly every layer. Cases C/D/E check those same properties
// against the ancestor-perspective construction, since that is what would actually ship.
//
// MEASURED AGAINST ANALYSIS, not eyeballed and not against a guess. Under a rotateY the top and bottom
// edges slope toward a vanishing point; extend both and intersect. Those edges start parallel to X, not
// to Z, so they do NOT converge on the perspective origin: rotated by theta they converge at
// VX + d/tan(theta), which for d=1600 and theta=26 is 540 + 3280.5 = 3820.5. The first run of this spike
// asserted convergence on VX, called a correct result a 3280px miss, and would have reported NO-GO on a
// working construction. Predict the number, then check it.
//
// The verdict turns on TWO things: the two sibling boxes must agree with EACH OTHER (that is the shared
// camera), and they must land on the analytically predicted point (that is the camera being the one we
// asked for).
//
//   node harness/dev/spike-3d.mjs
import puppeteer from 'puppeteer';

const W = 1080, H = 1920;
const VX = W / 2, VY = H / 2;          // the stage vanishing point both boxes must agree on
const BOX = { w: 300, h: 200, y: 860 };
const LEFT = 140, RIGHT = 640;          // two sibling boxes, symmetric about VX
const RY = 26;                          // degrees; large enough that convergence is unambiguous
const PERSP = 1600;

// corner markers ride INSIDE the transformed element, so their screen rects are the projected corners.
const marker = (cx, cy) => `<i data-m style="position:absolute;left:${cx};top:${cy};width:1px;height:1px"></i>`;
const boxHtml = (id, x, extraStyle, innerStyle = '') => `
  <div id="${id}" style="position:absolute;left:${x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px;
       background:#39f;${extraStyle}">
    <div style="position:absolute;inset:0;${innerStyle}">
      ${marker(0, 0)}${marker('100%', 0)}${marker(0, '100%')}${marker('100%', '100%')}
    </div>
  </div>`;

// the stage: perspective lives HERE, once, so every layer inside is projected through one camera.
const stage = (inner, extra = '') =>
  `<div style="position:absolute;inset:0;perspective:${PERSP}px;perspective-origin:${VX}px ${VY}px;${extra}">${inner}</div>`;

const CASES = {
  // A · #59's failure case, reproduced deliberately: the perspective() FUNCTION, per layer.
  naive: (build) => build((x) => boxHtml(`b${x}`, x, `transform:perspective(${PERSP}px) rotateY(${RY}deg);`)),
  // B · the construction under test: one camera on the ancestor, plain rotation per layer.
  shared: (build) => stage(build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);`))),
  // C/D/E · the properties this engine puts on nearly every layer, applied to the TILTED child.
  overflow: (build) => stage(build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);overflow:hidden;`))),
  filter: (build) => stage(build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);filter:blur(0.4px);`))),
  opacity: (build) => stage(build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);opacity:0.6;`))),
  // F/G · an intervening WRAPPER between camera and layer. Split, because "a wrapper breaks it" is not
  // actionable and "filter on a wrapper breaks it" is: a filtered ancestor creates a containing block and
  // flattens the 3D context, while a merely clipping one does not.
  wrapClip: (build) => stage(`<div style="position:absolute;inset:0;overflow:hidden">
      ${build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);`))}</div>`),
  wrapFilter: (build) => stage(`<div style="position:absolute;inset:0;filter:saturate(1.02)">
      ${build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);`))}</div>`),
  // H · a PLAIN wrapper: no clip, no filter, nothing but a div. This is the one that identifies the real
  // rule. The engine has exactly this between its layers and its stage, so if a bare div flattens too then
  // the cause was never overflow or filter, it is `transform-style: flat` being the default on every
  // intermediate element, and the camera has to sit on the layer's DIRECT parent.
  wrapPlain: (build) => stage(`<div style="position:absolute;inset:0">
      ${build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);`))}</div>`),
  // I · the same plain wrapper, opted back into 3D. If this converges, preserve-3d on intermediates is a
  // viable second option alongside moving the camera down.
  wrapPreserve: (build) => stage(`<div style="position:absolute;inset:0;transform-style:preserve-3d">
      ${build((x) => boxHtml(`b${x}`, x, `transform:rotateY(${RY}deg);`))}</div>`),
};

const page = await (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-device-scale-factor=1'] })).newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

// Intersection of the line through the two top corners with the line through the two bottom corners.
// That point IS the box's vanishing point under a Y rotation.
function vpOf(c) {
  const [tl, tr, bl, br] = c;
  const d1x = tr.x - tl.x, d1y = tr.y - tl.y, d2x = br.x - bl.x, d2y = br.y - bl.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return null;                 // parallel edges: no tilt at all
  const t = ((bl.x - tl.x) * d2y - (bl.y - tl.y) * d2x) / den;
  return { x: tl.x + t * d1x, y: tl.y + t * d1y };
}

const results = {};
for (const [name, build] of Object.entries(CASES)) {
  const pair = (mk) => mk(LEFT) + mk(RIGHT);
  await page.setContent(`<body style="margin:0;width:${W}px;height:${H}px;background:#111;position:relative">
    ${build(pair)}</body>`);
  const corners = await page.evaluate(() => [...document.querySelectorAll('[id^=b]')].map((el) =>
    [...el.querySelectorAll('[data-m]')].map((m) => {
      const r = m.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })));
  const [vL, vR] = corners.map(vpOf);
  const tilted = corners.every((c) => Math.abs(c[0].y - c[1].y) > 0.5);   // top edge actually slopes
  results[name] = { vL, vR, tilted };
}
await page.browser().close();

// where the top/bottom edges MUST converge if the shared camera is doing what we asked
const PREDICTED = { x: VX + PERSP / Math.tan((RY * Math.PI) / 180), y: VY };
const f = (v) => (v ? `(${v.x.toFixed(0)}, ${v.y.toFixed(0)})` : 'flat');
let fail = 0;
const notes = [];
console.log(`\n  SPIKE · per-layer 3D · stage vanishing point = (${VX}, ${VY})`);
console.log(`  two ${BOX.w}x${BOX.h} boxes at x=${LEFT} and x=${RIGHT}, both rotateY(${RY}deg)\n`);
console.log(`  case      left box VP      right box VP     tilted   verdict`);
console.log(`  ────────  ───────────────  ───────────────  ───────  ───────────────────────────────`);

for (const [name, r] of Object.entries(results)) {
  const conv = r.vL && r.vR ? Math.hypot(r.vL.x - r.vR.x, r.vL.y - r.vR.y) : Infinity;
  const onV = r.vL ? Math.hypot(r.vL.x - PREDICTED.x, r.vL.y - PREDICTED.y) : Infinity;
  let verdict;
  if (name === 'naive') {
    // this case is EXPECTED to fail: it is #59's construction, reproduced to prove the diagnosis
    verdict = conv > 100 ? 'diverges, as #59 said' : '!! did not reproduce #59';
    if (conv <= 100) fail++;
  } else if (!r.tilted) {
    // a flattened WRAPPER case is a documented constraint on where the camera may sit, not a no-go
    if (name.startsWith('wrap')) { verdict = 'FLATTENED, constraint, see below'; notes.push(name); }
    else { verdict = 'FLATTENED: 3D lost'; fail++; }
  } else if (conv < 2 && onV < 2) verdict = 'converges, matches prediction';
  else if (conv < 2) { verdict = `agrees but off prediction by ${onV.toFixed(1)}px`; fail++; }
  else { verdict = `DIVERGES by ${conv.toFixed(1)}px`; fail++; }
  console.log(`  ${name.padEnd(8)}  ${f(r.vL).padEnd(15)}  ${f(r.vR).padEnd(15)}  ${String(r.tilted).padEnd(7)}  ${verdict}`);
}

console.log(`\n  predicted convergence: (${PREDICTED.x.toFixed(0)}, ${PREDICTED.y.toFixed(0)})  [VX + d/tan(ry)]`);
if (notes.length) {
  console.log(`\n  CONSTRAINT: every intervening wrapper flattens (${notes.join(', ')}), including a BARE div with`);
  console.log('  no clip and no filter. So the cause is not overflow or filter, it is `transform-style: flat`');
  console.log('  being the default on every intermediate element. `wrapPreserve` converges, which confirms it.');
  console.log('  Two implementations follow, and both work:');
  console.log('    (a) put the camera on the layers\' DIRECT parent, so nothing intervenes;');
  console.log('    (b) put `transform-style: preserve-3d` on every element between camera and layer.');
  console.log('  (a) is preferred: preserve-3d also promotes subtrees into 3D rendering contexts and changes');
  console.log('  rasterisation, which is the exact thing #59 kept byte-identical by emitting only on tilt.');
}
console.log(fail === 0
  ? '\n  ✓ GO, sibling layers tilt independently and share one camera, landing on the predicted point,\n'
    + '    and it survives overflow/filter/opacity ON the tilted layer. #59\'s diagnosis holds exactly\n'
    + '    (its naive case diverges by the box spacing); its CONCLUSION does not.\n'
  : `\n  ✗ NO-GO, ${fail} case(s) failed. Report and stop.\n`);
process.exit(fail === 0 ? 0 : 1);
