// `vawe frames`: the pure parts. films/<film>/frames.html holds the key frame of each world side by side, the world id under
// each, like directions.html; harness/media/frames.mjs renders the stills it points at.

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

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

/** The lines printed for one world: each fired-rule line led by the world id, or one "clean" line. Pure. */
export const worldLines = (id, lines) => (lines.length ? lines.map((l) => `  ${id} ${l.trim()}`) : [`  ${id}: clean`]);
