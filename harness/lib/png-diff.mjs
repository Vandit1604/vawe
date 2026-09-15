// harness/lib/png-diff.mjs: are two PNGs the same picture, allowing for rasteriser noise.
//
// WHY THIS EXISTS AND WHY IT IS NOT A BROWSER. `renderFrame(n)` is pure in the DOM, and the block
// posters' crop rects are stable, but a GPU-backed block does not rasterise byte-identically run to
// run. Measured on `borderBeamCard` (a `beam` layer) and `glassCard` (an `aurora` paint): 196 and 96
// of about 700k channels moved, MAX DELTA 1. That is invisible, it is not information, and writing it
// as a change dirtied the tree on every regenerate (engine-doctrine/MISTAKES.md #491).
//
// The comparison was first attempted inside the puppeteer page that was already open. It failed three
// different ways on exactly the two largest posters: `new Image()` rejected with a bare `Event`,
// `fetch` on a data: URI answered "Failed to fetch", and `atob` refused the payload as "not correctly
// encoded". Three symptoms, one cause: an argument too large to survive `page.evaluate`'s round trip.
// Decoding here needs none of that, and a comparison should not depend on the thing it is comparing.
//
// Scope on purpose: 8-bit RGB and RGBA, no interlace. That is what `page.screenshot` emits. Anything
// else throws rather than guessing, because a wrong "same" here means a stale poster nobody notices.
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** decode(buf) -> { w, h, ch, data } with `data` as un-filtered 8-bit samples. */
export function decode(input) {
  // puppeteer's screenshot returns a Uint8Array, not a Buffer, and Buffer's own methods are what the
  // chunk walk uses. Normalise once here rather than at every call site.
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let p = 8, ihdr = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: body.readUInt32BE(0), h: body.readUInt32BE(4), depth: body[8], color: body[9], interlace: body[12] };
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.depth !== 8) throw new Error(`bit depth ${ihdr.depth} unsupported`);
  if (ihdr.interlace) throw new Error('interlaced PNG unsupported');
  const ch = ihdr.color === 6 ? 4 : ihdr.color === 2 ? 3 : 0;
  if (!ch) throw new Error(`colour type ${ihdr.color} unsupported`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.w * ch;
  const out = Buffer.alloc(ihdr.h * stride);
  // Un-filter, per the PNG spec's five types. `a` is the sample ch bytes to the left, `b` the one
  // directly above, `c` the one above-left; all read as 0 outside the image.
  for (let y = 0, ri = 0, oi = 0; y < ihdr.h; y++) {
    const filter = raw[ri++];
    for (let x = 0; x < stride; x++, ri++, oi++) {
      const cur = raw[ri];
      const a = x >= ch ? out[oi - ch] : 0;
      const b = y > 0 ? out[oi - stride] : 0;
      const c = x >= ch && y > 0 ? out[oi - stride - ch] : 0;
      let v;
      if (filter === 0) v = cur;
      else if (filter === 1) v = cur + a;
      else if (filter === 2) v = cur + b;
      else if (filter === 3) v = cur + ((a + b) >> 1);
      else if (filter === 4) {
        const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else throw new Error(`filter ${filter} at row ${y}`);
      out[oi] = v & 0xff;
    }
  }
  return { w: ihdr.w, h: ihdr.h, ch, data: out };
}

/** The worst single-channel move between two PNGs, or null when they are not comparable. */
export function maxChannelDelta(a, b) {
  const A = decode(a), B = decode(b);
  if (A.w !== B.w || A.h !== B.h || A.ch !== B.ch) return null;
  let max = 0;
  for (let i = 0; i < A.data.length; i++) {
    const d = Math.abs(A.data[i] - B.data[i]);
    if (d > max) { max = d; if (max > 255) break; }
  }
  return max;
}

/** A channel that moved by 1 is the rasteriser; a design change moves one by more. */
export const NOISE = 1;
export function sameWithinNoise(a, b) {
  const A = Buffer.isBuffer(a) ? a : Buffer.from(a), B = Buffer.isBuffer(b) ? b : Buffer.from(b);
  if (A.length === B.length && A.equals(B)) return true;
  const d = maxChannelDelta(A, B);
  return d !== null && d <= NOISE;
}
