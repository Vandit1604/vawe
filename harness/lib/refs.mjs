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

/** One line per film for `vawe refs list`. */
export function listLines(registry) {
  const rows = registry.map((r) => [r.id, r.inScope ? r.type : `out (${r.why})`, `${Math.round(r.seconds)} s`, r.studio ?? '-', r.title]);
  const wide = [0, 1, 2, 3].map((c) => Math.max(...rows.map((r) => r[c].length)));
  return rows.map((r) => `${r.slice(0, 4).map((cell, c) => cell.padEnd(wide[c])).join('  ')}  ${r[4]}`);
}
