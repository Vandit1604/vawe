// assets/sfx/click.wav ended up being 19.6 SECONDS of audio and stacking into a drone (MISTAKES #51).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEST = path.join(repoRoot, 'assets/sfx');
const CREDITS = path.join(DEST, 'credits.json');
const FORCE = process.argv.includes('--force');
const UA = { 'User-Agent': 'Mozilla/5.0 (vawe sfx fetcher)' };

const SFX = [
  ['whoosh',  'whoosh',     0],   // cuts (auto sound-design)
  ['reveal',  'transition', 0],   // stings (auto sound-design)
  ['swoosh',  'swoosh',     0],
  ['pop',     'pop',        0],
  ['tick',    'click',      0],
  ['click',   'click',      3],
  ['impact',  'impact',     0],
  ['riser',   'cinematic',  0],
  ['beep',    'beep',       0],
  ['beep3',   'beep',       2],
  ['correct', 'bell',       0],
  ['wrong',   'game',       0],
];

const isWav = (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE';

async function idsFor(cat) {
  const res = await fetch(`https://mixkit.co/free-sound-effects/${cat}/`, { headers: UA });
  if (!res.ok) return [];
  const html = await res.text();
  const ids = [...html.matchAll(/\/download\/(\d+)\//g)].map((m) => +m[1]);
  return [...new Set(ids)]; // preserve page (popularity) order
}

async function grab(name, cat, idx, pinned) {
  const dest = path.join(DEST, `${name}.wav`);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) return { name, status: 'skip', id: pinned };
  try {
    const ranked = await idsFor(cat);
    const cands = [pinned, ...ranked.slice(idx)].filter(Boolean);
    for (const id of cands) {
      const res = await fetch(`https://assets.mixkit.co/active_storage/sfx/${id}/${id}.wav`, { headers: UA });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isWav(buf)) continue;
      fs.writeFileSync(dest, buf);
      return { name, status: 'ok', id, kb: Math.round(buf.length / 1024), cat };
    }
    return { name, status: 'fail', why: `no fetchable WAV in ${cat}` };
  } catch (e) {
    return { name, status: 'fail', why: e.message };
  }
}

fs.mkdirSync(DEST, { recursive: true });
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : { license: 'Mixkit Free License. Https://mixkit.co/license/#sfxFree', sounds: {} };
const results = [];
for (const [name, cat, idx] of SFX) results.push(await grab(name, cat, idx, credits.sounds[name]?.id));

let ok = 0, skip = 0, fail = 0;
for (const r of results) {
  if (r.status === 'ok')   { ok++;   credits.sounds[r.name] = { id: r.id, category: r.cat, source: `https://mixkit.co/free-sound-effects/${r.cat}/` }; console.log(`  ✓ ${r.name}.wav  (${r.kb} KB · mixkit #${r.id})`); }
  if (r.status === 'skip') { skip++; }
  if (r.status === 'fail') { fail++; console.error(`  ✗ ${r.name}, ${r.why}`); }
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
console.log(`sfx: ${ok} downloaded, ${skip} present, ${fail} failed${fail ? '' : '. Library ready'} (Mixkit Free License)`);
console.log('cues: cuts→whoosh, stings→reveal are auto-placed by the mixer; add {sfx:[{t,name}]} for more.');
if (fail) process.exit(1);
