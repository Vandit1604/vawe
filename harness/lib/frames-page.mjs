// `vawe frames`: the pure parts. films/<film>/frames.html holds the key frame of each world side by side, the world id under
// each, like directions.html; harness/media/frames.mjs renders the stills it points at.

import { PLACEHOLDER, STARTER_LINE } from './measured-brief.mjs';

const escape =(text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const FRAMES_TEMPLATE = `<!doctype html>
<html data-aspect="{{aspect}}">
<head>
<meta charset="utf-8">
<meta name="duration" content="1">
<title>{{title}}: key frames</title>
<style>
  :root { --sheet: #e4e1da; --label: #14161a; }
  html, body { margin: 0; min-height: 100%; background: var(--sheet); }
  body { box-sizing: border-box; display: grid; grid-template-columns: repeat({{cols}}, minmax(0, 1fr)); gap: 2vw; padding: 5vh 3vw;
         font: 400 1.9vh/1.35 ui-monospace, Menlo, monospace; color: var(--label); }
  figure { margin: 0; display: grid; gap: 1vh; min-width: 0; }
  img { width: 100%; display: block; }
</style>
</head>
<body>
{{figures}}
</body>
</html>
`;

/** The frames.html text: one figure per world, in page order. `worlds` is [{ id, src }] with src relative to the page. Pure. */
export function framesPage({ title, aspect = '16:9', worlds }) {
  const figures = worlds.map((w) => `<figure><img src="${escape(w.src)}" alt="${escape(w.id)}"><figcaption>${escape(w.id)}</figcaption></figure>`).join('\n');
  return FRAMES_TEMPLATE.replaceAll('{{aspect}}', escape(aspect)).replaceAll('{{title}}', escape(title))
    .replaceAll('{{cols}}', String(Math.min(worlds.length, 3) || 1)).replaceAll('{{figures}}', figures);
}

/** { page, full, worlds } from the argv after the script name; --world takes ids, comma-separated or repeated. Throws an Error naming the flag. Pure. */
export function parseFramesArgs(argv) {
  const out = { page: null, full: false, worlds: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') out.full = true;
    else if (a === '--world') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error('--world needs a world id, for example --world s3 or --world s1,s3');
      out.worlds.push(...v.split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a.startsWith('--')) throw new Error(`unknown flag ${a}; valid: --full --world <id>`);
    else if (out.page === null) out.page = a;
    else throw new Error(`unexpected argument ${a}; one page only`);
  }
  return out;
}

/** The spans of the wanted ids, in page order; every span when `ids` is empty. Throws an Error that lists the page's worlds when an id is unknown. Pure. */
export function selectWorlds(spans, ids) {
  const unknown = ids.filter((id) => !spans.some((s) => s.id === id));
  if (unknown.length) throw new Error(`--world ${unknown.join(',')}: no such world; this page has ${spans.map((s) => s.id).join(' ')}`);
  return ids.length ? spans.filter((s) => ids.includes(s.id)) : spans;
}

/**
 * The printed lines for all worlds: each fired rule once, led by every world it fired in, and one line for the
 * clean worlds. `shots` are [{ id, fired }] with fired from firedRules; `format` is firedLines. Pure.
 */
export function worldLines(shots, format, { starter = false } = {}) {
  const byRule = new Map();
  for (const s of shots) for (const f of s.fired) {
    if (!byRule.has(f.id)) byRule.set(f.id, { first: f, worlds: [] });
    byRule.get(f.id).worlds.push(s.id);
  }
  const lines = [...byRule.values()].map(({ first, worlds }) => `  ${worlds.join(', ')}: ${format([first], 1)[0].trim()}`);
  const clean = shots.filter((s) => !s.fired.length).map((s) => s.id);
  if (!clean.length) return lines;
  return [...lines, starter ? `  starter page: ${clean.join(', ')} hold the starter's grey and words, so no rule has a film to read; the film is not written yet` : `  clean: ${clean.join(', ')}`];
}

/** True while the page is still the one `vawe new` wrote: its grey ground placeholder and its line under the headline are both unchanged. Pure. */
export const isStarterPage = (html) => html.includes(`--ground: ${PLACEHOLDER.ground}`) && html.includes(`>${STARTER_LINE}<`);
