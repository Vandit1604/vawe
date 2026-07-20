// mcp/uploads.mjs — a caller's own images and fonts, so a launch video can carry their logo.
//
// This was the real ceiling on the product. Every effect in the engine was reachable, but a person
// making a video for THEIR product could not put THEIR mark in it, which is most of what a launch
// video is.
//
// THREE RULES, each learned somewhere in this repo:
//   1. Type comes from the MAGIC BYTES, never the filename. `make photos` named every WebP it
//      downloaded .jpg and nothing noticed for months (MISTAKES #109). A caller-supplied name is a
//      worse source of truth than a URL was.
//   2. The stored name is ours, derived from the content hash. A filename that reaches the filesystem
//      is a path traversal waiting to happen, and hashing also means uploading the same logo twice
//      costs nothing.
//   3. It lands INSIDE the repo, under the owner. The renderer serves scenes from a file server
//      rooted at the repo, so anything outside it is a 404 to the browser — the exact bug that made
//      every real session fail before.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { paths } from './store.mjs';

const MAX_BYTES = 12 << 20;   // 12MB. A logo is tens of KB; a full-bleed screenshot a few hundred.

// Sniffed, in the order a real file answers. Fonts are here because a brand face is as much a part
// of a brand as its colours, and the engine loads @font-face from a served path like anything else.
const KINDS = [
  { ext: 'png', mime: 'image/png', is: (b) => b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
  { ext: 'jpg', mime: 'image/jpeg', is: (b) => b[0] === 0xff && b[1] === 0xd8 },
  { ext: 'webp', mime: 'image/webp', is: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { ext: 'gif', mime: 'image/gif', is: (b) => b.toString('ascii', 0, 3) === 'GIF' },
  { ext: 'svg', mime: 'image/svg+xml', is: (b) => /^\s*(<\?xml|<svg)/i.test(b.toString('utf8', 0, 200)) },
  { ext: 'woff2', mime: 'font/woff2', is: (b) => b.toString('ascii', 0, 4) === 'wOF2' },
  { ext: 'ttf', mime: 'font/ttf', is: (b) => b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00 },
  { ext: 'otf', mime: 'font/otf', is: (b) => b.toString('ascii', 0, 4) === 'OTTO' },
];

const safeOwner = (o) => String(o || 'anon').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64) || 'anon';

/**
 * Store one upload. Returns the path to write into a scene's `src`.
 * @returns {{ src: string, ext: string, bytes: number, reused: boolean }}
 */
export function save(owner, base64) {
  let buf;
  try {
    buf = Buffer.from(String(base64 || '').replace(/^data:[^;]+;base64,/, ''), 'base64');
  } catch {
    throw new Error('could not decode base64');
  }
  if (!buf.length) throw new Error('empty upload');
  if (buf.length > MAX_BYTES) throw new Error(`too large: ${(buf.length / 1e6).toFixed(1)}MB, limit ${MAX_BYTES / 1e6}MB`);

  const kind = KINDS.find((k) => k.is(buf));
  if (!kind) {
    throw new Error('unrecognised file. Accepted: png, jpg, webp, gif, svg, woff2, ttf, otf. '
      + 'The type is read from the file itself, so renaming will not help.');
  }
  // SVG is markup, and markup that reaches a browser is the hole the html layer already had. Strip
  // the same things here rather than trust that nobody points an <image> layer at a hostile SVG.
  if (kind.ext === 'svg') {
    const s = buf.toString('utf8');
    if (/<\s*(script|iframe|object|embed|foreignObject)\b/i.test(s) || /\son[a-z]+\s*=/i.test(s)) {
      throw new Error('this SVG contains script, embedding or event handlers and was refused. '
        + 'Export a flat SVG, or send a PNG.');
    }
  }

  const dir = path.join(paths.uploads(), safeOwner(owner));
  fs.mkdirSync(dir, { recursive: true });
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const file = path.join(dir, `${hash}.${kind.ext}`);
  const reused = fs.existsSync(file);
  if (!reused) fs.writeFileSync(file, buf);

  // Repo-relative, because that is what the render's file server resolves and therefore what a scene
  // must contain. Absolute host paths would break the moment this runs anywhere else.
  const src = '/' + path.relative(path.resolve(paths.uploads(), '../..'), file).split(path.sep).join('/');
  return { src, ext: kind.ext, bytes: buf.length, reused };
}

export function list(owner) {
  const dir = path.join(paths.uploads(), safeOwner(owner));
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => ({
    src: '/' + path.relative(path.resolve(paths.uploads(), '../..'), path.join(dir, f)).split(path.sep).join('/'),
    bytes: fs.statSync(path.join(dir, f)).size,
  }));
}
