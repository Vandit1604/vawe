// setup-assets.mjs — one-time asset bootstrap.
//   - generates SILENT placeholder music.mp3 / sting.mp3 via ffmpeg (if missing)
//   - downloads Inter woff2 (400/700/800/900) for deterministic text metrics
// Both steps are best-effort: rendering still works if they fail (system font
// fallback, no audio), it just won't be byte-identical across machines.

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'engine', 'assets');
const fonts = path.join(assets, 'fonts');
fs.mkdirSync(fonts, { recursive: true });
fs.mkdirSync(path.join(root, 'engine', 'out'), { recursive: true });

// ---- silent placeholder audio ----
function ensureSilent(file, secs) {
  if (fs.existsSync(file)) {
    console.log('• exists   ', path.basename(file));
    return;
  }
  const isWav = file.endsWith('.wav');
  const codec = isWav ? ['-acodec', 'pcm_s16le'] : ['-acodec', 'libmp3lame', '-q:a', '9'];
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(secs), ...codec, file],
    { stdio: 'ignore' }
  );
  if (r.status === 0) console.log('• generated', path.basename(file));
  else console.warn('! could not generate', path.basename(file), '(is ffmpeg installed?)');
}

// WAV placeholders (the code PCM mixer reads WAV, not mp3)
ensureSilent(path.join(assets, 'music.wav'), 90);
ensureSilent(path.join(assets, 'sting.wav'), 0.6);

// ---- fonts: Inter (body) + Space Grotesk (headline) ----
const INTER = 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-';
const SPACE = 'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk/files/space-grotesk-latin-';
const FONTS = {
  'inter-400.woff2': `${INTER}400-normal.woff2`,
  'inter-700.woff2': `${INTER}700-normal.woff2`,
  'inter-800.woff2': `${INTER}800-normal.woff2`,
  'inter-900.woff2': `${INTER}900-normal.woff2`,
  'space-500.woff2': `${SPACE}500-normal.woff2`,
  'space-700.woff2': `${SPACE}700-normal.woff2`,
};

function download(url, dest) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.rmSync(dest, { force: true });
          console.warn(`! font fetch ${res.statusCode}: ${path.basename(dest)}`);
          return resolve(false);
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(true)));
      })
      .on('error', (e) => {
        fs.rmSync(dest, { force: true });
        console.warn('! font fetch error:', e.message);
        resolve(false);
      });
  });
}

let ok = 0;
for (const [name, url] of Object.entries(FONTS)) {
  const dest = path.join(fonts, name);
  if (fs.existsSync(dest)) {
    console.log('• exists   ', name);
    ok++;
    continue;
  }
  if (await download(url, dest)) {
    console.log('• downloaded', name);
    ok++;
  }
}
if (ok < 4) {
  console.warn(
    '! Some Inter weights missing — renders will use the system sans fallback.'
  );
}

console.log('\nsetup complete.');
