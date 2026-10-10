// Render the clip on each vawe /easing page: a 2 s film of the ease against linear, drawn with the vawe
// renderer and encoded to 640 px. One render at a time, so the laptop stays cool.
//
//   node scripts/site/easing-clips.mjs [slug ...]     needs ffmpeg; writes site/public/easing/<slug>.{mp4,webm,webp}
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'site', 'public', 'easing');
const DATA = JSON.parse(fs.readFileSync(path.join(root, 'site', 'lib', 'easing.json'), 'utf8'));
const camel = (slug) => slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const side = (h) => `${h.influence}% / ${h.speed}x`;

function filmPage(e) {
  const name = camel(e.slug);
  return `<!doctype html>
<html data-aspect="16:9">
<head>
<meta charset="utf-8">
<meta name="duration" content="2">
<meta name="message" content="${e.slug} against linear">
<title>${e.slug}</title>
<script type="application/json" id="authoring">{"allow": ["static-window@1.5-2", "no-brief", "one-band"], "_why": {"static-window@1.5-2": "the held end 1.5-2 s of a 2 s clip is the point: both boxes rest, 0.5 s, so the ease shows where it settles", "no-brief": "a 2 s diagram clip for the /easing page at world s1, not a film", "one-band": "one move of 1.2 s in world s1, shown twice for contrast"}}</script>
<style>
  html, body { margin: 0; height: 100%; overflow: clip; background: #16151a; color: #fff; font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; }
  .head { position: absolute; left: 8vw; top: 9vh; }
  .name { font-size: 9vh; font-weight: 700; letter-spacing: -0.02em; }
  .handles { margin-top: 2.2vh; font-size: 4.4vh; color: #97969b; }
  .lane { position: absolute; left: 8vw; right: 8vw; height: 18vh; background: #212025; border-radius: 2vh; }
  .lane.a { top: 40vh; }
  .lane.b { top: 62vh; }
  .tag { position: absolute; left: 1.6vw; top: 1.2vh; font-size: 4.2vh; color: #97969b; }
  .box { position: absolute; top: 10vh; left: 12vw; width: 5vh; height: 5vh; border-radius: 1vh; }
  .a .box { background: #0a87ff; }
  .b .box { background: #4a4950; }
</style>
</head>
<body>
<div class="head"><div class="name">${e.slug}</div><div class="handles">out ${side(e.handles.out)}  in ${side(e.handles.in)}</div></div>
<div class="lane a"><span class="tag">${e.slug}</span><div class="box" id="a"></div></div>
<div class="lane b"><span class="tag">linear</span><div class="box" id="b"></div></div>
<script type="module">
import '/core/engine/page-api.js';
import { EASE } from '/core/motion/presets.js';

const run = (id, easing) => document.getElementById(id).animate(
  [{ translate: '0 0' }, { translate: '56vw 0' }],
  { duration: 1200, delay: 350, easing, fill: 'both' },
);
run('a', EASE.${name});
run('b', 'linear');
</script>
</body>
</html>
`;
}

const wanted = process.argv.slice(2);
const eases = DATA.eases.filter((e) => e.kind === 'vawe' && (!wanted.length || wanted.includes(e.slug)));
fs.mkdirSync(OUT, { recursive: true });
const env = { ...process.env, VAWE_AGENT: 'seo-easing', VAWE_MODEL: 'sonnet' };

for (const e of eases) {
  const dir = path.join(root, 'films', `easing-${e.slug}`);
  const draft = path.join(root, 'out', `easing-${e.slug}-draft.mp4`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.html'), filmPage(e));
  try {
    execFileSync(path.join(root, 'bin', 'vawe'), ['dev', `films/easing-${e.slug}/page.html`, '--fast', '--no-judge', '--out', draft], { cwd: root, env, stdio: 'inherit' });
    const base = path.join(OUT, e.slug);
    const scale = ['-vf', 'scale=640:-2'];
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', draft, ...scale, '-an', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', draft, ...scale, '-an', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', `${base}.webm`]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.6', '-i', draft, '-frames:v', '1', ...scale, '-c:v', 'libwebp', '-quality', '75', `${base}.webp`]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
