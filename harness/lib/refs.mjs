// The reference films the fresh judge compares a film with. They are other people's films: they live
// on one machine in a folder outside the repo ($VAWE_REFS_DIR, default ~/.vawe/refs), never in git.
// Pure helpers and the registry file (refs.json). harness/dev/refs.mjs is the `vawe refs` verb;
// harness/media/judge-fresh.mjs picks the references for a film with pickRefs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const REGISTRY = 'refs.json';
export const VERIFIED = 'reference_films_verified.md';
export const SHEETS = 'judge-sheets';
export const TYPES = ['product', 'brand'];
export const REFS_PER_FILM = 2;

// Films in the verified list that no page film can match: live action, 3D CG, or a reel of many works.
const OUT_OF_SCOPE = {
  vO9YGI5Gf4s: 'live action',
  YVOw0TAO9ok: 'live action',
  UZYp5XFm1Mk: '3D CG',
  'UGlBlkB4b-U': '3D CG',
  SxYzrzRjfsI: 'studio reel, not one film',
};

// The template a brief names (prompts/<file>) and the kind of film it makes.
const TEMPLATE_TYPE = {
  'brand-launch-from-url.md': 'product',
  'ui-morph-loop.md': 'product',
  'interactive-lab-capture.md': 'product',
  'story-explainer.md': 'product',
  'beat-sheet.md': 'brand',
  'showreel-one-liner.md': 'brand',
  'music-video-beat-synced.md': 'brand',
  'directors-brief-long-form.md': 'brand',
};

export const refsDir = (env = process.env, home = os.homedir()) => env.VAWE_REFS_DIR || path.join(home, '.vawe', 'refs');

const cleanStudio = (s) => s.replace(/\(.*?\)/g, '').split(';')[0].trim();
const fileId = (text) => /`(?:[^`]*\/)?([^/`]+)\.(?:mp4|webm)`/.exec(text)?.[1] ?? null;

function entry({ id, title, studio, seconds, type }) {
  const why = OUT_OF_SCOPE[id] ?? (type ? null : 'weak fit');
  return { id, title, studio, type: why ? null : type, seconds, inScope: !why, why };
}

/** The films of reference_films_verified.md: [{ id, title, studio, type, seconds, inScope, why }]. Section A is product, B and C are brand, the "weak fit" list is out of scope. */
export function parseVerified(markdown) {
  const out = [];
  let section = null;
  for (const line of String(markdown).split('\n')) {
    const head = /^\*\*([A-C])\. /.exec(line);
    if (head) { section = head[1]; continue; }
    if (/^\*\*Verified but weak fit/.test(line)) { section = 'weak'; continue; }
    if (section === 'weak') {
      const m = /^- (.+?), (\d+) s, /.exec(line);
      const id = m && fileId(line);
      if (id) out.push(entry({ id, title: m[1], studio: null, seconds: Number(m[2]), type: null }));
      continue;
    }
    const m = /^\d+\. \*\*(.+?)\*\* \| (.+?) \| .*? \| (\d+) s \|/.exec(line);
    const id = m && section && fileId(line);
    if (id) out.push(entry({ id, title: m[1], studio: cleanStudio(m[2]), seconds: Number(m[3]), type: section === 'A' ? 'product' : 'brand' }));
  }
  return out;
}

/** The kind of film a brief makes ('product' or 'brand'), from its "Template:" line, else from its request through `routeRequest(request, length)`; null when neither names one. */
export function filmType(briefText, routeRequest = () => null) {
  const template = /^Template: (\S+?)\.?(?:\s|$)/m.exec(briefText)?.[1];
  const byTemplate = template && TEMPLATE_TYPE[path.basename(template)];
  if (byTemplate) return byTemplate;
  if (template) return null;
  const request = /^- request: (.+)$/m.exec(briefText)?.[1];
  const length = Number(/^- length: (\d+(?:\.\d+)?)/m.exec(briefText)?.[1]) || undefined;
  const routed = request ? routeRequest(request, length) : null;
  return routed ? TEMPLATE_TYPE[path.basename(routed)] ?? null : null;
}

/** The references to compare a film with: in-scope entries of its type that have a sheet, the closest length first, then id order. The same film always gets the same ones. */
export function pickRefs(registry, { type, seconds }, count = REFS_PER_FILM) {
  return registry
    .filter((r) => r.inScope && r.type === type && r.sheet)
    .map((r) => ({ r, gap: Math.abs(r.seconds - seconds) }))
    .sort((a, b) => a.gap - b.gap || a.r.id.localeCompare(b.r.id))
    .slice(0, count)
    .map((x) => x.r);
}

/** The registry in `dir`, or null when the folder has none. */
export function readRegistry(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, REGISTRY), 'utf8')); } catch { return null; }
}

export function writeRegistry(dir, registry) {
  fs.writeFileSync(path.join(dir, REGISTRY), `${JSON.stringify(registry, null, 1)}\n`);
}

const ID = /^[A-Za-z0-9_-]{3,}$/;
const mentions = (text, re, group = 1) => [...text.matchAll(re)].map((m) => m[group]).filter((id) => ID.test(id));

/** The reference ids a brief names, most mentioned first: frame paths (`frames/<id>/`), the ref id column of the "move taken" table, `--ref <id>` and the backticked id on a "Reference:" line. */
export function briefRefIds(briefText) {
  const text = String(briefText ?? '');
  const at = text.indexOf('| move taken');
  const rows = at < 0 ? [] : text.slice(at).split('\n').slice(2);
  const moves = [];
  for (const row of rows) {
    if (!row.startsWith('|')) break;
    const id = row.split('|')[2]?.trim();
    if (ID.test(id ?? '')) moves.push(id);
  }
  const referenceLines = text.split('\n').filter((l) => /Reference:/i.test(l)).join('\n');
  const all = [
    ...mentions(text, /\/frames\/([^/\s|`]+)\//g),
    ...moves,
    ...mentions(text, /--ref ([^\s|`/]+)(?![^\s|`]*\.)/g),
    ...mentions(referenceLines, /`([A-Za-z0-9_-]+)`/g),
    ...mentions(referenceLines, /refs\/([A-Za-z0-9_-]+)\.(?:mp4|webm)/g),
  ];
  const counts = new Map();
  for (const id of all) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** The reference film a brief names that exists under `dir`: { id, file } with the sharpest video, or null. */
export function namedRef({ dir, briefText }) {
  for (const id of briefRefIds(briefText)) {
    const file = refSharpVideo(dir, id);
    if (file) return { id, file };
  }
  return null;
}

/** The references for a film: { refs: [{ id, title, studio, file }], skipped: null, named }, or { refs: [], skipped: <one line why> }. `file` is the absolute path of the sheet. A reference the brief names comes first; `named` is its id. */
export function chooseRefs({ dir, briefText, seconds, routeRequest }) {
  const registry = readRegistry(dir);
  if (!registry) return { refs: [], skipped: `no reference films in ${dir} (bin/vawe refs index)` };
  const named = briefText ? namedRef({ dir, briefText }) : null;
  const own = named && registry.find((r) => r.id === named.id && r.sheet);
  const first = own ? [{ id: own.id, title: own.title, studio: own.studio, file: path.join(dir, own.sheet) }] : [];
  const type = briefText ? filmType(briefText, routeRequest) : null;
  if (!type) {
    if (first.length) return { refs: first, skipped: null, named: own.id };
    return { refs: [], skipped: 'the film type is unknown: add a line `Template: prompts/<type>.md` to brief.md (bin/vawe new --from prompts/<type>.md writes it), or a `- request:` line the router can read' };
  }
  const picked = pickRefs(registry, { type, seconds }).filter((r) => r.id !== own?.id).slice(0, REFS_PER_FILM - first.length);
  if (!picked.length && !first.length) return { refs: [], skipped: `no ${type} reference film has a sheet` };
  const refs = [...first, ...picked.map((r) => ({ id: r.id, title: r.title, studio: r.studio, file: path.join(dir, r.sheet) }))];
  return { refs, skipped: null, ...(own ? { named: own.id } : {}) };
}

export const FRAMES = 'frames';
export const FRAMES_MANIFEST = 'frames.json';

/** The manifest of one film's key frames: { id, frames: [{ n, t, file }] }, `file` absolute. `got` is [{ t, file }] in order. Pure. */
export function frameManifest(id, got) {
  return { id, frames: got.map((k, i) => ({ n: i + 1, t: +k.t.toFixed(1), file: path.resolve(k.file) })) };
}

/** The 360p video of film `id` in `dir`, or undefined. */
export function ytDlpArgs(url, dir) {
  return ['-f', 'bv*[height<=360]/b[height<=360]/worst', '--merge-output-format', 'mp4', '--no-playlist', '-o', path.join(dir, '%(id)s.%(ext)s'),
    '--print', 'after_move:%(filepath)s\t%(id)s\t%(title)s\t%(channel)s', url];
}

export const refVideo =(dir, id) => ['mp4', 'webm'].map((e) => path.join(dir, `${id}.${e}`)).find(fs.existsSync);

/** The video to look at for film `id`: the 1080p copy in hd/ when there is one, else the 360p video; undefined when neither exists. */
export const refSharpVideo = (dir, id) => [path.join(dir, 'hd', `${id}.mp4`)].find(fs.existsSync) ?? refVideo(dir, id);

/** The measured shots of film `id` as [{ start, end }] from spec/<id>/spec.json; empty before `vawe spec` ran. */
export function refShots(dir, id) {
  const file = path.join(dir, 'spec', id, 'spec.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')).shots ?? []).map((s) => ({ start: s.t0, end: s.t1 })) : [];
}

/** The manifest of film `id` under `dir`, or null when `vawe refs frames` has not written it. */
export function readFrameManifest(dir, id) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, FRAMES, id, FRAMES_MANIFEST), 'utf8')); } catch { return null; }
}

/** One line per frame: `  n  t s  <absolute path>`. Pure. */
export function frameLines(manifest) {
  return manifest.frames.map((f) => `  ${f.n}  ${f.t.toFixed(1)} s  ${f.file}`);
}

/** One line per film for `vawe refs list`. */
export function listLines(registry) {
  const rows = registry.map((r) => [r.id, r.inScope ? r.type : `out (${r.why})`, `${Math.round(r.seconds)} s`, r.studio ?? '-', r.title]);
  const wide = [0, 1, 2, 3].map((c) => Math.max(...rows.map((r) => r[c].length)));
  return rows.map((r) => `${r.slice(0, 4).map((cell, c) => cell.padEnd(wide[c])).join('  ')}  ${r[4]}`);
}
