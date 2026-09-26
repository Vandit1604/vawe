import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [src, name] = process.argv.slice(2);
if (!src || !name) { console.error('usage: cutout <src-image> <name>'); process.exit(2); }
if (!fs.existsSync(src)) { console.error(`✗ no such image: ${src}`); process.exit(2); }

const PY = path.join(ROOT, '.venv-tools', 'bin', 'python');
if (!fs.existsSync(PY)) {
  console.error('✗ .venv-tools is missing. Create it once:\n'
    + '    python3 -m venv .venv-tools && .venv-tools/bin/pip install "rembg[cpu]"\n'
    + '  (a venv, not --break-system-packages: Homebrew python refuses system-wide installs, PEP 668)');
  process.exit(1);
}

const out = path.join(ROOT, 'assets', 'cutouts', `${name}.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });

const script = `
from rembg import remove
from PIL import Image
im = remove(Image.open(${JSON.stringify(path.resolve(src))})).convert('RGBA')
im.save(${JSON.stringify(out)})
a = im.split()[3]; w, h = im.size
edge = [a.getpixel((2,2)), a.getpixel((w-3,2)), a.getpixel((2,h-3)), a.getpixel((w-3,h-3))]
bb = im.getbbox()
print(f"{w}x{h}|{max(edge)}|{bb[2]-bb[0]}x{bb[3]-bb[1]}")
`;
let res;
try { res = execFileSync(PY, ['-c', script], { encoding: 'utf8' }).trim().split('\n').pop(); }
catch (e) { console.error(`✗ rembg failed: ${e.message}`); process.exit(1); }

const [dims, maxEdge, bbox] = res.split('|');
console.log(`\n  CUTOUT · ${path.basename(src)} → assets/cutouts/${name}.png`);
console.log(`  ${dims} · opaque subject ${bbox}`);
if (+maxEdge > 8) {
  console.log(`\n  ✗ the corners are still opaque (alpha ${maxEdge}/255). rembg ran but removed nothing,`);
  console.log(`    so this is a rectangle wearing a .png extension. Try a source with a clearer subject.\n`);
  process.exit(1);
}
console.log(`  ✓ corners transparent (alpha ${maxEdge}/255). This is a prop, not a picture of one.\n`);
console.log(`  use: { "type": "image", "src": "/assets/cutouts/${name}.png", "w": …, "h": … }\n`);
