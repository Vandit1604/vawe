// Fetch the FREE, openly-licensed faces the engine registers in core/tokens.css into the
// gitignored engine/assets/fonts/. No font binary is committed to the repo (redistribution) — a
// fresh clone runs `make fonts` (or `make build`) to self-heal. Söhne is paid and stays manual in
// engine/assets/fonts/local/ (see tokens.css). Idempotent: skips files already present (--force redownloads).
//
//   node scripts/fonts.mjs            download any missing free faces
//   node scripts/fonts.mjs --force    redownload everything
//
// Sources: Fontsource (npm, via jsDelivr) — the canonical open mirror for OFL/Apache webfonts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(repoRoot, 'engine/assets/fonts');
const FORCE = process.argv.includes('--force');
const CDN = 'https://cdn.jsdelivr.net/npm';

// dest filename (as referenced in core/tokens.css) → { url, license }
const FONTS = [
  ['InterVariable.woff2',            `${CDN}/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`,                 'OFL 1.1'],
  ['Geist.woff2',                    `${CDN}/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2`,                 'OFL 1.1'],
  ['GeistMono.woff2',                `${CDN}/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2`,       'OFL 1.1'],
  ['JetBrainsMono.woff2',            `${CDN}/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2`,'OFL 1.1'],
  ['PlusJakartaSans.woff2',          `${CDN}/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2`, 'OFL 1.1'],
  ['HankenGrotesk.woff2',            `${CDN}/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2`,'OFL 1.1'],
  ['Archivo.woff2',                  `${CDN}/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2`,             'OFL 1.1'],
  ['Caveat.woff2',                   `${CDN}/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2`,               'OFL 1.1'],
  ['space-500.woff2',                `${CDN}/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2`,           'OFL 1.1'],
  ['space-700.woff2',                `${CDN}/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2`,           'OFL 1.1'],
  ['InstrumentSerif-Regular.woff2',  `${CDN}/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2`,     'OFL 1.1'],
  ['InstrumentSerif-Italic.woff2',   `${CDN}/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2`,     'OFL 1.1'],
];

// woff2 files start with the ASCII magic "wOF2"
const isWoff2 = (buf) => buf.length > 4 && buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x32;

async function grab(name, url) {
  const dest = path.join(DEST, name);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) return { name, status: 'skip' };
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return { name, status: 'fail', why: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isWoff2(buf)) return { name, status: 'fail', why: 'not a woff2 file' };
    fs.writeFileSync(dest, buf);
    return { name, status: 'ok', kb: Math.round(buf.length / 1024) };
  } catch (e) {
    return { name, status: 'fail', why: e.message };
  }
}

fs.mkdirSync(DEST, { recursive: true });
const results = await Promise.all(FONTS.map(([name, url]) => grab(name, url)));

let ok = 0, skip = 0, fail = 0;
for (const r of results) {
  if (r.status === 'ok')   { ok++;   console.log(`  ✓ ${r.name}  (${r.kb} KB)`); }
  if (r.status === 'skip') { skip++; }
  if (r.status === 'fail') { fail++; console.error(`  ✗ ${r.name}  — ${r.why}`); }
}
console.log(`fonts: ${ok} downloaded, ${skip} present, ${fail} failed${fail ? '' : ' — all free faces ready'}`);
console.log('note: Sohne is paid (Klim) — drop your own copy in engine/assets/fonts/local/Sohne.woff2 (gitignored).');
if (fail) process.exit(1);
