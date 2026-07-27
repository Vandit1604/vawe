// scripts/dev/studio.mjs — a LIVE SCRUBBABLE preview of a scene, for fast iteration without rendering an
// mp4. Starts a local static server and serves a wrapper page: the real scene.html in an iframe, plus a
// scrubber + play/pause + frame/time readout that drive `__engine.renderFrame(n)` directly (the same pure
// function the Go renderer seeks). Edit the JSON, hit reload, scrub — no 30-60s render round-trip.
//
//   make studio D=formats/scene/<file>.json [PORT=8799]   → open the printed URL, leave it running (Ctrl-C to stop)
//
// DEV TOOLING ONLY — it does not touch the renderer or the determinism contract; it just calls the engine's
// own renderFrame(n) from the parent frame (same-origin), exactly as the Go capture loop does per frame.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.env.D || process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: make studio D=formats/scene/<file>.json [PORT=8799]'); process.exit(2); }
const dataUrl = '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/');
const PORT = Number(process.env.PORT) || 8799;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

const studioPage = (fmt) => `<!doctype html><html><head><meta charset=utf8><title>vawe studio · ${path.basename(dataArg)}</title>
<style>
 :root{color-scheme:dark} body{margin:0;background:#0b0d12;color:#e6e9ef;font:14px/1.4 ui-monospace,Menlo,monospace;display:flex;flex-direction:column;height:100vh}
 #stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#05060a}
 iframe{border:0;background:#000;box-shadow:0 8px 40px #000a}
 #bar{display:flex;align-items:center;gap:14px;padding:12px 16px;background:#11141b;border-top:1px solid #222}
 #scrub{flex:1;accent-color:#5ee0c8} button{background:#1b2130;color:#e6e9ef;border:1px solid #333;border-radius:8px;padding:7px 14px;cursor:pointer;font:inherit}
 button:hover{background:#232b3d} #read{min-width:150px;font-variant-numeric:tabular-nums;color:#9aa4b2} b{color:#5ee0c8}
</style></head><body>
 <div id=stage><iframe id=sc src="/formats/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30"></iframe></div>
 <div id=bar>
  <button id=play>▶ play</button>
  <input id=scrub type=range min=0 max=100 value=0 step=1>
  <span id=read>frame 0 / 0 · 0.00s</span>
 </div>
<script>
 const sc=document.getElementById('sc'),scrub=document.getElementById('scrub'),read=document.getElementById('read'),play=document.getElementById('play');
 let fps=30,total=0,n=0,playing=false,W=1920,H=1080;
 function fit(){ // scale the iframe to fit the stage, preserving the canvas aspect
   const st=document.getElementById('stage'),pad=32; const s=Math.min((st.clientWidth-pad)/W,(st.clientHeight-pad)/H);
   sc.style.width=W+'px';sc.style.height=H+'px';sc.style.transform='scale('+s+')';sc.style.transformOrigin='center';
 }
 function draw(){ const e=sc.contentWindow.__engine; if(!e)return; e.renderFrame(n); read.innerHTML='frame <b>'+n+'</b> / '+total+' · '+(n/fps).toFixed(2)+'s'; scrub.value=n; }
 function ready(){ const w=sc.contentWindow; if(!w.__engineReady||!w.__engine){return setTimeout(ready,80);} const m=w.__engine.meta||{}; fps=m.fps||30; total=Math.max(1,Math.round((m.duration||5)*fps)); W=m.width||1920;H=m.height||1080; scrub.max=total; fit(); n=0; draw(); }
 sc.addEventListener('load',ready); window.addEventListener('resize',fit);
 scrub.addEventListener('input',()=>{ n=+scrub.value; draw(); });
 function loop(){ if(!playing)return; n=(n+1)%(total+1); draw(); setTimeout(()=>requestAnimationFrame(loop),1000/fps); }
 play.addEventListener('click',()=>{ playing=!playing; play.textContent=playing?'⏸ pause':'▶ play'; if(playing)loop(); });
 addEventListener('keydown',e=>{ if(e.key==='ArrowRight'){n=Math.min(total,n+1);draw();} if(e.key==='ArrowLeft'){n=Math.max(0,n-1);draw();} if(e.key===' '){e.preventDefault();play.click();} });
</script></body></html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/studio') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(studioPage('scene')); }
  const p = path.join(repoRoot, decodeURIComponent(url).replace(/^\/+/, ''));
  if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `✗ port ${PORT} is busy — set a free one: make studio D=${dataArg} PORT=8800` : e.message); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ▶ vawe studio — ${path.basename(dataArg)}`);
  console.log(`    open  http://127.0.0.1:${PORT}/studio`);
  console.log(`    scrub the slider · ← → step a frame · space plays · edit the JSON + reload to see changes`);
  console.log(`    Ctrl-C to stop.\n`);
});
