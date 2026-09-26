import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 48) || 'card';

const hueOf = (s) => { let h = 2166136261 >>> 0; const t = String(s); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h % 360; };
function hsl(h, s, l) {
  s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return '#' + hex(f(0)) + hex(f(8)) + hex(f(4));
}
export function palette(title) {
  const h = hueOf(title);
  return { c1: hsl(h, 58, 11), c2: hsl((h + 22) % 360, 62, 30), accent: hsl((h + 44) % 360, 88, 68) };
}

function wrap(title, maxWidth, size) {
  const words = String(title).trim().split(/\s+/), lines = []; let line = '';
  const fits = (s) => s.length * size * 0.56 <= maxWidth;
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (fits(next) || !line) line = next; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function card({ title = '', subtitle = '', accent, c1, c2, w = 600, h = 600 } = {}) {
  const pal = palette(title);
  c1 = c1 || pal.c1; c2 = c2 || pal.c2; accent = accent || pal.accent;
  const PAD = 56, maxW = w - PAD * 2;
  let size = title.length <= 10 ? 96 : title.length <= 22 ? 72 : 54;
  let lines = wrap(title, maxW, size);
  while (lines.length > 3 && size > 36) { size -= 8; lines = wrap(title, maxW, size); }
  const lineH = size * 1.06, blockH = lines.length * lineH;
  const subH = subtitle ? 40 : 0;
  let startY = h / 2 - (blockH + subH) / 2 + size * 0.78;
  const titleSvg = lines.map((ln, i) =>
    `<text x="${w / 2}" y="${(startY + i * lineH).toFixed(1)}" text-anchor="middle" font-family='"Arial Black","Helvetica Neue",Arial,sans-serif' font-weight="900" font-size="${size}" letter-spacing="-1" fill="#fff">${esc(ln)}</text>`).join('\n  ');
  const subSvg = subtitle
    ? `<text x="${w / 2}" y="${(startY + lines.length * lineH + 14).toFixed(1)}" text-anchor="middle" font-family='Arial,sans-serif' font-weight="600" font-size="30" letter-spacing="2" fill="${accent}">${esc(subtitle)}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.4" r="0.8"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer><feComposite operator="over" in2="SourceGraphic"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.5"/>
  <rect width="${w}" height="${h}" fill="url(#v)"/>
  <rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="22" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="3"/>
  ${titleSvg}
  ${subSvg}
</svg>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const title = args.find((a) => !a.startsWith('--')) || 'Untitled';
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const out = get('--out') || `assets/cards/${slugify(title)}.svg`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, card({ title, subtitle: get('--sub') || '' }));
  console.log(`✓ card → ${out}`);
}
