import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { patchMotion, applyOps } from './patch-motion.mjs';
import { serveRepo, REPO_ROOT } from '../lib/render-harness.mjs';
import { scratch } from '../lib/scratch.mjs';
import { EASINGS } from '../../core/motion/motion.js';

const EASE_NAMES = Object.keys(EASINGS);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.env.D || process.argv[2];
const idArg = process.env.ID || process.argv[3];
if (!dataArg || !idArg || !fs.existsSync(dataArg)) {
  console.error('usage: make tune D=films/scene/<file>.json ID=<layer id>[,<id>...] [PORT=8801]');
  process.exit(2);
}
const ids = idArg.split(',').map((s) => s.trim()).filter(Boolean);
const dataUrl = '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/');
const fmt = (JSON.parse(fs.readFileSync(dataArg, 'utf8')).module) || 'scene';
const PORT = Number(process.env.PORT) || 8801;

function readLayers() {
  const src = fs.readFileSync(dataArg, 'utf8');
  const data = JSON.parse(src);
  const layers = Array.isArray(data.layers) ? data.layers : [];
  const found = ids.map((id) => {
    const index = layers.findIndex((l) => l && l.id === id);
    if (index < 0) return { id, index: -1 };
    const L = layers[index];
    return {
      id, index, type: L.type || 'text', start: +L.start || 0, duration: L.duration ?? null,
      motion: Array.isArray(L.motion) ? L.motion : [],
      vars: L.vars || null, varsDur: L.varsDur ?? null, varsDelay: L.varsDelay ?? null, varsEase: L.varsEase ?? null,
    };
  });
  const missing = found.filter((f) => f.index < 0).map((f) => f.id);
  if (missing.length) throw new Error(`no layer with id ${missing.map((m) => JSON.stringify(m)).join(', ')} in ${dataArg}`);
  return { file: path.relative(REPO_ROOT, dataArg), dataUrl, fmt, layers: found };
}
readLayers(); // fail fast, before a browser ever opens, on a bad ID

const page = () => fs.readFileSync(path.join(repoRoot, 'harness/author/tune.html'), 'utf8')
  .replace('{{IFRAME_SRC}}', `/films/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`)
  .replace('{{TITLE}}', `tune: ${ids.join(', ')}`);

const withBody = (req, res, run) => {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 5e5) req.destroy(); });
  req.on('end', () => run(body, (o, code = 200) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(o));
  }));
};

function patched({ layer, motion, vars, varsDur, varsDelay, varsEase }) {
  let src = fs.readFileSync(dataArg, 'utf8');
  if (motion !== undefined) src = patchMotion(src, layer, motion);
  const scalarOps = [];
  for (const [k, v] of [['vars', vars], ['varsDur', varsDur], ['varsDelay', varsDelay], ['varsEase', varsEase]])
    if (v !== undefined) scalarOps.push({ op: v == null ? 'remove' : 'replace', path: `layers/${layer}/${k}`, value: v });
  if (scalarOps.length) src = applyOps(src, scalarOps);
  return src;
}

const diffOf = (oldSrc, newSrc) => {
  if (oldSrc === newSrc) return '';
  const a = scratch('tune', 'before.json'), b = scratch('tune', 'after.json');
  fs.writeFileSync(a, oldSrc); fs.writeFileSync(b, newSrc);
  try { return execFileSync('diff', ['-u', '--label', 'before', '--label', 'after', a, b], { encoding: 'utf8' }); }
  catch (e) { return e.stdout || ''; } // diff exits 1 when it FOUND a difference, stdout still has it
};

const tuneRoutes = (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/tune') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(page()); return true;
  }
  if (url === '/tune/tune.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    fs.createReadStream(path.join(repoRoot, 'harness/author/tune.js')).pipe(res); return true;
  }
  if (url === '/api/layers') {
    const reply = (o, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
    try { reply({ ok: true, eases: EASE_NAMES, ...readLayers() }); } catch (e) { reply({ ok: false, error: String(e.message) }, 400); }
    return true;
  }
  if (req.method === 'POST' && url === '/api/apply') {
    withBody(req, res, (body, reply) => {
      let q;
      try { q = JSON.parse(body || '{}'); } catch (e) { return reply({ ok: false, error: 'bad JSON: ' + e.message }, 400); }
      if (!Number.isInteger(q.layer)) return reply({ ok: false, error: '"layer" must be the layer\'s index' }, 400);
      try {
        const oldSrc = fs.readFileSync(dataArg, 'utf8');
        const newSrc = patched(q);
        const diff = diffOf(oldSrc, newSrc);
        if (q.write && diff) fs.writeFileSync(dataArg, newSrc);
        reply({ ok: true, changed: !!diff, written: !!(q.write && diff), diff });
      } catch (e) { reply({ ok: false, error: String(e.message) }, 400); }
    });
    return true;
  }
  return false;
};

serveRepo({ root: REPO_ROOT, port: PORT, route: tuneRoutes }).then(({ port }) => {
  console.log(`tune: http://127.0.0.1:${port}/tune  (layers: ${ids.join(', ')})`);
}).catch((e) => {
  console.error(e.code === 'EADDRINUSE' ? `port ${PORT} is busy, try PORT=8802` : e.message);
  process.exit(1);
});
