// Build the /moves gallery's data from prompts/moves: one JSON file the site imports at build time,
// the raw move markdown served as text, the moves section of llms.txt, and (with --clips) the web
// copies of each clip, and public/moves/index.json (the same data, filterable by an agent).
//
//   node scripts/site/moves.mjs            data, raw .md and llms.txt (pure node, runs in prebuild)
//   node scripts/site/moves.mjs --clips    also encode any clip whose source changed (needs ffmpeg)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(root, 'prompts', 'moves');
const OUT_DIR = path.join(root, 'site', 'public', 'moves');
const DATA = path.join(root, 'site', 'lib', 'moves.json');
const LLMS = path.join(root, 'site', 'public', 'llms.txt');
const INDEX = path.join(OUT_DIR, 'index.json');
const REPO_BLOB = 'https://github.com/Vandit1604/vawe/blob/main/prompts/moves/';
const SITE = 'https://vawe.dev';
const NOT_MOVES = new Set(['README.md', 'GROUPS.md', 'LIBRARY.md', 'RECIPES.md', 'LOOKS.md']);
const DEFAULT_LOOK = 'vawe';

const read = (p) => fs.readFileSync(p, 'utf8');
const hashFile = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (md) => md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();

// ---- README (pick by job) and GROUPS (the group tables) and the pick-by-job rows -------------------------------------------
function readIndex() {
  const groups = [];
  const groupOf = new Map();
  const shortUse = new Map();
  const jobs = new Map();
  let section = null;
  for (const line of ['README.md', 'GROUPS.md'].flatMap((f) => read(path.join(SRC, f)).split('\n'))) {
    const h = line.match(/^## (.+)/);
    if (h) { section = h[1].trim(); continue; }
    if (!line.startsWith('|') || /^\|\s*-/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (section === 'Pick by job') {
      const names = [...cells[1].matchAll(/\]\(([a-z0-9-]+)\.md\)/g)].map((m) => m[1]);
      if (!names.length) continue;
      const row = jobs.get(cells[0]) ?? [];
      for (const n of names) if (!row.includes(n)) row.push(n);
      jobs.set(cells[0], row);
      continue;
    }
    const name = cells[2]?.match(/\(([a-z0-9-]+)\.md\)/)?.[1];
    if (!name || section === 'Looks') continue;
    if (!groups.some((g) => g.label === section)) groups.push({ id: slug(section), label: section });
    groupOf.set(name, slug(section));
    shortUse.set(name, plain(cells[1]));
  }
  return { groups, groupOf, shortUse, jobs: [...jobs].map(([label, moves]) => ({ id: slug(label), label, moves })) };
}

// ---- markdown: the small subset the move files use ------------------------------------------------
function href(target) {
  if (/^(https?:|#|\/)/.test(target)) return target;
  const md = target.match(/^([a-z0-9-]+)\.md$/);
  if (md) return `/moves/${md[1]}`;
  const clip = target.match(/^([a-z0-9-]+)\.mp4$/);
  if (clip) return `/moves/${clip[1]}.mp4`;
  return REPO_BLOB + target;
}

function inline(text) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p) => {
    if (p.startsWith('`') && p.endsWith('`') && p.length > 1) return `<code>${esc(p.slice(1, -1))}</code>`;
    return esc(p)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${esc(href(u))}">${t}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }).join('');
}

const JS_KW = new Set('import export from const let var function return if else for of in while new await async class extends this true false null undefined typeof default break continue'.split(' '));

function wrap(cls, s) { return `<span class="tk-${cls}">${esc(s)}</span>`; }

function highlightJs(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_$][\w$]*)/g;
  let out = '';
  let last = 0;
  for (const m of src.matchAll(re)) {
    out += esc(src.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) out += wrap('c', m[0]);
    else if (m[2]) out += wrap('s', m[0]);
    else if (m[3]) out += wrap('n', m[0]);
    else if (JS_KW.has(m[4])) out += wrap('k', m[0]);
    else if (src[last] === '(') out += wrap('f', m[0]);
    else out += esc(m[0]);
  }
  return out + esc(src.slice(last));
}

function highlightCss(src) {
  const re = /(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(@[\w-]+)|(--[\w-]+|[a-z-]+(?=\s*:[^:{;]*;|\s*:[^{]*?\}))|(-?\b\d*\.?\d+(?:px|em|rem|s|ms|%|deg|vh|vw|fr)?\b)/g;
  let out = '';
  let last = 0;
  for (const m of src.matchAll(re)) {
    out += esc(src.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) out += wrap('c', m[0]);
    else if (m[2]) out += wrap('s', m[0]);
    else if (m[3]) out += wrap('k', m[0]);
    else if (m[4]) out += wrap('p', m[0]);
    else out += wrap('n', m[0]);
  }
  return out + esc(src.slice(last));
}

function highlightHtml(src) {
  const blocks = /(<script[^>]*>)([\s\S]*?)(<\/script>)|(<style[^>]*>)([\s\S]*?)(<\/style>)/g;
  const tags = (s) => s.replace(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g, (t) => {
    if (t.startsWith('<!--')) return wrap('c', t);
    const m = t.match(/^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)$/);
    if (!m) return esc(t);
    const attrs = esc(m[3]).replace(/([\w:-]+)(=)(&quot;[^&]*?&quot;|'[^']*')?/g, (_, a, eq, v = '') =>
      `<span class="tk-p">${a}</span>${eq}${v ? `<span class="tk-s">${v}</span>` : ''}`);
    return `${esc(m[1])}<span class="tk-k">${m[2]}</span>${attrs}${esc(m[4])}`;
  });
  let out = '';
  let last = 0;
  for (const m of src.matchAll(blocks)) {
    out += tags(src.slice(last, m.index));
    last = m.index + m[0].length;
    out += m[1] ? tags(m[1]) + highlightJs(m[2]) + tags(m[3]) : tags(m[4]) + highlightCss(m[5]) + tags(m[6]);
  }
  return out + tags(src.slice(last));
}

function guessLang(lang, code) {
  if (lang) return lang;
  if (/^\s*</.test(code)) return 'html';
  if (/^\s*[.#@:\w-][^\n]*\{/.test(code) && !/\b(const|let|function|import)\b/.test(code)) return 'css';
  return 'js';
}

function codeBlock(lang, code) {
  const l = guessLang(lang, code);
  const body = l === 'css' ? highlightCss(code) : l === 'html' ? highlightHtml(code) : highlightJs(code);
  return `<div class="mv-code"><div class="mv-code-bar"><span>${l}</span><button type="button" class="mv-copy" data-copy>Copy</button></div><pre><code>${body}</code></pre></div>`;
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const code = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      i++;
      html.push(codeBlock(fence[1], code.join('\n')));
      continue;
    }
    const h = line.match(/^(#{1,3}) (.+)/);
    if (h) {
      if (h[1].length > 1) html.push(`<h${h[1].length} id="${slug(h[2])}">${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }
    const list = line.match(/^(- |\d+\. )/);
    if (list) {
      const ordered = list[1] !== '- ';
      const items = [];
      while (i < lines.length && (/^(- |\d+\. )/.test(lines[i]) || (/^\s+\S/.test(lines[i]) && items.length))) {
        if (/^(- |\d+\. )/.test(lines[i])) items.push(lines[i].replace(/^(- |\d+\. )/, ''));
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,3} |- |\d+\. )/.test(lines[i])) para.push(lines[i++].trim());
    const text = para.join(' ');
    const sound = text.startsWith('Sound:');
    html.push(sound ? `<p class="mv-sound">${inline(text)}</p>` : `<p>${inline(text)}</p>`);
  }
  return html.join('\n');
}

// Seconds, from the mvhd box of an mp4 (the move clips are plain H.264, so no ffprobe in prebuild).
function mp4Seconds(file) {
  const b = fs.readFileSync(file);
  const at = b.indexOf('mvhd');
  if (at === -1) return null;
  const v1 = b[at + 4] === 1;
  const scale = b.readUInt32BE(at + (v1 ? 24 : 16));
  const units = v1 ? Number(b.readBigUInt64BE(at + 28)) : b.readUInt32BE(at + 20);
  return scale ? Math.round((units / scale) * 100) / 100 : null;
}

// ---- one move -------------------------------------------------------------------------------------
function readMove(file, index) {
  const name = file.replace(/\.md$/, '');
  const md = read(path.join(SRC, file));
  const title = md.match(/^# (.+)/m)?.[1].trim() ?? name;
  const usePara = md.match(/\*\*Use when\*\*([\s\S]*?)(?:\n\n|$)/)?.[1] ?? '';
  const useWhen = plain(usePara.replace(/\s*Clip:[\s\S]*$/, ''));
  const demo = path.join(SRC, 'demo', `${name}.html`);
  const look = fs.existsSync(demo) ? (read(demo).match(/data-look="([a-z-]+)"/)?.[1] ?? DEFAULT_LOOK) : DEFAULT_LOOK;
  const clip = path.join(SRC, `${name}.mp4`);
  const sound = md.match(/^Sound:\s*(.+)/m)?.[1].trim() ?? null;
  return {
    name,
    title,
    group: index.groupOf.get(name) ?? null,
    look,
    use: index.shortUse.get(name) ?? useWhen,
    useWhen,
    jobs: index.jobs.filter((j) => j.moves.includes(name)).map((j) => j.id),
    sound: sound ? plain(sound) : null,
    snippet: md.match(/^```\w*\n([\s\S]*?)^```/m)?.[1].trimEnd() ?? '',
    clipHash: fs.existsSync(clip) ? hashFile(clip) : null,
    duration: fs.existsSync(clip) ? mp4Seconds(clip) : null,
    html: renderMarkdown(md),
  };
}

// ---- clips ------------------------------------------------------------------------------------------
// One source per move, rendered by `bin/vawe moves` at 1280x720 60 fps. The move page plays the H.264
// copy at full size; the gallery grid plays a 640 px VP9 copy over a 640 px poster.
const CLIP_FILES = ['mp4', 'webm', 'webp', 'hd.webp'];

function encodeClip(name) {
  const src = path.join(SRC, `${name}.mp4`);
  const out = (ext) => path.join(OUT_DIR, `${name}.${ext}`);
  const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
  const small = ['-vf', 'scale=640:-2:flags=lanczos'];
  ff(['-i', src, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out('mp4')]);
  ff(['-i', src, '-an', ...small, '-c:v', 'libvpx-vp9', '-crf', '44', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', out('webm')]);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
  const last = ['-ss', String(Math.max(0, dur - 0.25)), '-i', src, '-frames:v', '1', '-c:v', 'libwebp'];
  ff([...last, ...small, '-quality', '62', out('webp')]);
  ff([...last, '-quality', '72', out('hd.webp')]);
}

// ---- llms.txt: the moves section is regenerated, the rest is hand-written ---------------------------
function llmsSection(moves) {
  const lines = moves.map((m) => `- [${m.title}](${SITE}/moves/${m.name}.md): ${m.use}`);
  return `## Moves
Each move is one markdown file an agent copies: when to use it, the CSS and WAAPI snippet, the notes and the sound cue. The gallery with clips is ${SITE}/moves.
To filter: fetch ${SITE}/moves/index.json. Top-level groups, looks and jobs list the ids. Each move has group, look, jobs, use (the when line), clip, md and duration.
A human link filters the same way: ${SITE}/moves?group=end-a-film&look=paper&q=wipe (group, look and job take comma lists: OR within one, AND across).

${lines.join('\n')}
`;
}

function writeIndex(moves, data) {
  const out = moves.map((m) => ({
    name: m.name,
    title: m.title,
    group: m.group,
    look: m.look,
    jobs: m.jobs,
    use: m.use,
    clip: `${SITE}/moves/${m.name}.mp4`,
    md: `${SITE}/moves/${m.name}.md`,
    page: `${SITE}/moves/${m.name}`,
    duration: m.duration,
  }));
  fs.writeFileSync(INDEX, `${JSON.stringify({ site: SITE, groups: data.groups, looks: data.looks, jobs: data.jobs.map(({ id, label }) => ({ id, label })), moves: out }, null, 1)}\n`);
}

function writeLlms(moves, data) {
  const text = read(LLMS);
  const section = llmsSection(moves);
  const start = text.indexOf('## Moves\n');
  if (start === -1) return fs.writeFileSync(LLMS, `${text.trimEnd()}\n\n${section}`);
  const next = text.indexOf('\n## ', start + 1);
  fs.writeFileSync(LLMS, text.slice(0, start) + section + (next === -1 ? '' : text.slice(next)));
}

// ---- main -------------------------------------------------------------------------------------------
// The Docker build context carries site/ but not prompts/ (.dockerignore is an allowlist), so the
// image builds from the committed moves.json and site/public/moves.
if (!fs.existsSync(SRC)) {
  console.log('~ prompts/moves is not here; using the committed site/lib/moves.json');
  process.exit(0);
}

const withClips = process.argv.includes('--clips');
const index = readIndex();
const previous = fs.existsSync(DATA) ? JSON.parse(read(DATA)) : { moves: [] };
const encodedHash = new Map(previous.moves.map((m) => [m.name, m.clipHash]));
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.md') && !NOT_MOVES.has(f)).sort();
const readmeOrder = [...index.groupOf.keys()];
const rank = (m) => (readmeOrder.includes(m.name) ? readmeOrder.indexOf(m.name) : readmeOrder.length);
const moves = files.map((f) => readMove(f, index)).sort((a, b) => rank(a) - rank(b));

const missing = moves.filter((m) => !m.group).map((m) => m.name);
if (missing.length) console.warn(`~ not in a README group table: ${missing.join(', ')}`);

fs.mkdirSync(OUT_DIR, { recursive: true });
let encoded = 0;
for (const m of moves) {
  fs.copyFileSync(path.join(SRC, `${m.name}.md`), path.join(OUT_DIR, `${m.name}.md`));
  if (!m.clipHash) continue;
  const have = CLIP_FILES.every((e) => fs.existsSync(path.join(OUT_DIR, `${m.name}.${e}`)));
  const fresh = have && encodedHash.get(m.name) === m.clipHash;
  if (fresh) continue;
  if (!withClips) {
    console.warn(`~ ${m.name}: clip changed or missing, run with --clips`);
    m.clipHash = encodedHash.get(m.name) ?? null;
    continue;
  }
  encodeClip(m.name);
  encoded++;
}

const looks = [...new Set(moves.map((m) => m.look))].sort((a, b) => (a === DEFAULT_LOOK ? -1 : b === DEFAULT_LOOK ? 1 : a.localeCompare(b)));
const data = { groups: index.groups, looks, jobs: index.jobs, moves };
fs.writeFileSync(DATA, `${JSON.stringify(data, null, 1)}\n`);
writeIndex(moves, data);
writeLlms(moves, data);
console.log(`✓ ${moves.length} moves -> site/lib/moves.json, site/public/moves${withClips ? ` (${encoded} clip(s) encoded)` : ''}`);
