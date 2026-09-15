// scripts/site/examples-gallery.mjs: build a hover-to-play showcase from the flagship example registry.
// Reads films/scene/examples.json, copies each rendered video into out/gallery/, and writes a single
// self-contained out/gallery/index.html: a "start from a use case" table + portrait/landscape grids of
// cards that play on hover and park on a poster frame on leave.
// Run via `make gallery`. Render the videos first (make video / beatsync), a missing video is warned, not fatal.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REG = path.join(repoRoot, 'films/scene/examples.json');
const OUT = path.join(repoRoot, 'out/gallery');
fs.mkdirSync(OUT, { recursive: true });

const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const items = reg.examples || [];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// copy each video into the gallery dir so index.html is self-contained + portable; drop the missing ones.
const ready = [];
for (const it of items) {
  const src = path.join(repoRoot, 'out', it.video);
  if (!fs.existsSync(src)) { console.warn(`  ⚠ ${it.title}: out/${it.video} not found, render it first (make video / beatsync). Skipped.`); continue; }
  fs.copyFileSync(src, path.join(OUT, it.video));
  ready.push(it);
}
if (!ready.length) { console.error('no rendered videos found. Nothing to build. Render the examples, then re-run.'); process.exit(1); }

const card = (it) => `
  <figure class="card ${it.orientation}" data-poster="${it.poster ?? 0}">
    <div class="frame">
      <video muted loop playsinline preload="metadata" src="./${esc(it.video)}"></video>
      <span class="cat">${esc(it.category)}</span>
      <span class="ratio">${esc(it.aspect)}</span>
    </div>
    <figcaption>
      <h3>${esc(it.title)}</h3>
      <p class="desc">${esc(it.description)}</p>
      <p class="tags">${(it.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</p>
      <a class="src" href="../../films/scene/${esc(it.source)}">view source &rarr;</a>
    </figcaption>
  </figure>`;

const landscape = ready.filter((it) => it.orientation !== 'portrait');
const portrait = ready.filter((it) => it.orientation === 'portrait');
const useCases = ready.filter((it) => it.bestFor);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>vawe · examples</title>
<style>
  :root { color-scheme: dark; --bg:#0a0a0c; --panel:#131417; --line:rgba(255,255,255,0.10); --text:#f4f5f2; --dim:#8a8f98; --accent:#5e6ad2; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif; }
  .wrap { max-width:1200px; margin:0 auto; padding:64px 24px 96px; }
  header h1 { font-size:56px; font-weight:800; letter-spacing:-0.02em; margin:0 0 8px; }
  header p { color:var(--dim); font-size:20px; margin:0 0 40px; max-width:620px; }
  h2 { font-size:14px; text-transform:uppercase; letter-spacing:0.08em; color:var(--dim); margin:48px 0 16px; font-weight:700; }
  table.usecase { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:15px; }
  table.usecase td { padding:12px 14px; border-bottom:1px solid var(--line); vertical-align:top; }
  table.usecase td:first-child { color:var(--text); font-weight:600; white-space:nowrap; }
  table.usecase td:last-child { color:var(--dim); }
  table.usecase a { color:var(--accent); text-decoration:none; }
  .grid { display:grid; gap:24px; }
  .grid.land { grid-template-columns:repeat(auto-fill,minmax(440px,1fr)); }
  .grid.port { grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); }
  .card { margin:0; background:var(--panel); border:1px solid var(--line); border-radius:16px; overflow:hidden; transition:border-color .2s, transform .2s; }
  .card:hover { border-color:var(--accent); transform:translateY(-2px); }
  .frame { position:relative; background:#000; overflow:hidden; }
  .card.landscape .frame { aspect-ratio:16/9; }
  .card.portrait .frame { aspect-ratio:9/16; }
  .frame video { width:100%; height:100%; object-fit:cover; display:block; }
  .cat, .ratio { position:absolute; top:10px; font:600 11px/1 ui-monospace,monospace; letter-spacing:0.04em; padding:5px 8px; border-radius:6px; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); }
  .cat { left:10px; color:var(--text); }
  .ratio { right:10px; color:var(--dim); }
  figcaption { padding:16px 18px 18px; }
  figcaption h3 { margin:0 0 6px; font-size:20px; font-weight:700; }
  .desc { margin:0 0 12px; color:var(--dim); font-size:14px; }
  .tags { margin:0 0 12px; display:flex; flex-wrap:wrap; gap:6px; }
  .tags span { font:500 11px/1 ui-monospace,monospace; color:var(--dim); border:1px solid var(--line); padding:4px 7px; border-radius:5px; }
  .src { color:var(--accent); text-decoration:none; font-size:13px; font-weight:600; }
  .src:hover { text-decoration:underline; }
  footer { margin-top:64px; color:var(--dim); font-size:13px; border-top:1px solid var(--line); padding-top:20px; }
  footer code { color:var(--text); }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>vawe examples</h1>
      <p>Flagship scenes, each one JSON &rarr; one rendered video. Hover a card to play. Start from the one closest to what you're making, then edit its JSON.</p>
    </header>

    <h2>Start from a use case</h2>
    <table class="usecase">
      ${useCases.map((it) => `<tr><td>${esc(it.bestFor)}</td><td><a href="../../films/scene/${esc(it.source)}">${esc(it.title)}</a> &middot; ${esc(it.description)}</td></tr>`).join('\n      ')}
    </table>

    ${landscape.length ? `<h2>Landscape &middot; 16:9</h2>\n    <div class="grid land">\n      ${landscape.map(card).join('\n      ')}\n    </div>` : ''}

    ${portrait.length ? `<h2>Portrait &middot; 9:16</h2>\n    <div class="grid port">\n      ${portrait.map(card).join('\n      ')}\n    </div>` : ''}

    <footer>
      Generated by <code>make gallery</code> from <code>films/scene/examples.json</code>. Each card links to its scene source. Snippets: <code>engine-doctrine/MOTION-SNIPPETS.md</code>.
    </footer>
  </div>
<script>
  // hover-to-play; park on the poster frame on leave (a representative still, not frame 0).
  for (const card of document.querySelectorAll('.card')) {
    const v = card.querySelector('video');
    const poster = parseFloat(card.dataset.poster) || 0;
    const park = () => { try { v.currentTime = poster; } catch (e) {} };
    v.addEventListener('loadedmetadata', park);
    card.addEventListener('mouseenter', () => { v.play().catch(() => {}); });
    card.addEventListener('mouseleave', () => { v.pause(); park(); });
  }
</script>
</body>
</html>`;

fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`✓ gallery → out/gallery/index.html  (${ready.length} example${ready.length === 1 ? '' : 's'}: ${ready.map((r) => r.title).join(', ')})`);
console.log(`  open out/gallery/index.html`);
