// probe-ancestor-kills.mjs: MEASURE the cross-product behind core/ancestor-kills.js.
//
// The class: an ANCESTOR's style silently disables a DESCENDANT's capability. CSS has no error for
// this. The element keeps its declaration, the browser keeps rendering, and the capability just stops.
//
// The method, and it is the whole reason this file exists rather than a reading of the spec. Whatever
// the capability must REACH is placed OUTSIDE the ancestor, below it in paint order. The frame is then
// shot with the capability declared and with it removed, and the mean pixel difference between those
// two shots is how much the declaration actually did. Compared against the same measurement with NO
// ancestor style, that number says whether the ancestor took the capability away.
//
// Byte equality was the first metric here and it was too generous: a backdrop-filter over an EMPTY
// backdrop root still darkens its own edge a little, so "the bytes differ" reported a dead glass layer
// as alive. The strength ratio is what separates "did something" from "did its job".
//
// A control row with no ancestor style proves the probe can see the capability at all; if a control
// ever reports KILLED the probe is broken, not the browser.
//
//   node scripts/dev/probe-ancestor-kills.mjs
import zlib from 'node:zlib';
import puppeteer from 'puppeteer';

// ---- the smallest PNG reader that serves the metric: 8-bit RGBA, non-interlaced, which is what
// puppeteer emits. Anything else throws rather than being guessed at.
function decodePng(buf) {
  let p = 8, w = 0, h = 0, bpp = 4; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || (data[9] !== 6 && data[9] !== 2) || data[12] !== 0) throw new Error(`probe: unexpected PNG format (depth ${data[8]}, colour ${data[9]}, interlace ${data[12]})`);
      bpp = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}
// mean absolute RGB difference over the whole frame, 0..255
const meanDiff = (A, B) => {
  let s = 0;
  for (let i = 0; i < A.data.length; i += A.bpp) s += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
  return s / (A.data.length / A.bpp) / 3;
};

// Every ancestor style the engine writes, plus the near neighbours worth ruling out.
const ANCESTORS = {
  'none (control)':           '',
  'filter: blur(2px)':        'filter:blur(2px)',
  'filter: opacity(0.99)':    'filter:opacity(.99)',
  'opacity: 0.99':            'opacity:.99',
  'transform: translateX':    'transform:translateX(1px)',
  'perspective: 1000px':      'perspective:1000px',
  'will-change: transform':   'will-change:transform',
  'contain: paint':           'contain:paint',
  'isolation: isolate':       'isolation:isolate',
  'overflow: hidden':         'overflow:hidden',
  'clip-path: inset(0)':      'clip-path:inset(0)',
  'mask-image':               '-webkit-mask-image:linear-gradient(#000,#000);mask-image:linear-gradient(#000,#000)',
  'backdrop-filter: blur':    'backdrop-filter:blur(1px)',
  'mix-blend-mode: multiply': 'mix-blend-mode:multiply',
};

// BACKDROP probes: the field the capability must sample sits OUTSIDE #anc, painted before it.
const backdropDoc = (anc, cap) => `<!doctype html><html><body style="margin:0">
<svg width="0" height="0"><filter id="rf" x="-30%" y="-30%" width="160%" height="160%">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="40" xChannelSelector="R" yChannelSelector="G"/>
</filter></svg>
<div style="width:400px;height:300px;position:relative;background:#fff">
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,#00f 0 12px,#ff0 12px 24px)"></div>
  <div id="anc" style="position:absolute;inset:0;${anc}">
    <div id="cap" style="position:absolute;left:80px;top:60px;width:180px;height:140px;background:rgba(255,255,255,.20);${cap}"></div>
  </div>
</div></body></html>`;

// DEPTH probe: the eye is outside #anc, so a grouping property on #anc flattens the rig and the
// layer's translateZ stops projecting. This is core/fx/plane.js and the camera rig.
const depthDoc = (anc, cap) => `<!doctype html><html><body style="margin:0">
<div style="width:400px;height:300px;position:relative;background:#fff;perspective:600px">
  <div id="anc" style="position:absolute;inset:0;transform-style:preserve-3d;${anc}">
    <div id="cap" style="position:absolute;left:150px;top:110px;width:100px;height:80px;background:#000;${cap}"></div>
  </div>
</div></body></html>`;

const CAPS = {
  'backdrop-filter: blur (glass: true|N)':  { doc: backdropDoc, on: 'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)', off: '' },
  'backdrop-filter: url (glass: refract)':  { doc: backdropDoc, on: 'backdrop-filter:url(#rf);-webkit-backdrop-filter:url(#rf)', off: '' },
  'mix-blend-mode: difference (mixBlend)':  { doc: backdropDoc, on: 'mix-blend-mode:difference', off: '' },
  'translateZ under perspective (plane)':   { doc: depthDoc,    on: 'transform:translateZ(-300px)', off: 'transform:none' },
};

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 400, height: 300, deviceScaleFactor: 1 });

const shot = async (doc, anc, cap) => {
  await page.setContent(doc(anc, cap), { waitUntil: 'load' });
  return decodePng(Buffer.from(await page.screenshot({ type: 'png' })));
};
const strength = async (c, anc) => meanDiff(await shot(c.doc, anc, c.on), await shot(c.doc, anc, c.off));

let bad = 0;
for (const [capName, c] of Object.entries(CAPS)) {
  console.log('\n== ' + capName);
  const base = await strength(c, ANCESTORS['none (control)']);
  if (base < 1) { bad++; console.log(`  PROBE BROKEN: the control row sees nothing (${base.toFixed(2)})`); }
  for (const [ancName, anc] of Object.entries(ANCESTORS)) {
    const s = await strength(c, anc), r = s / base;
    console.log(`  ${r >= 0.25 ? 'ok    ' : 'KILLED'}  ${(r * 100).toFixed(0).padStart(4)}%  ${ancName}`);
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
