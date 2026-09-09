// frag-page: ONE definition of the standalone page a hand-written fragment is previewed on.
//
// Two tools show a fragment outside a render now: `make preview` (the PNG + craft detector) and the
// storyboard studio, which embeds every beat's real fragment beside its plan. A second copy of this
// wrapper would drift, and the drift is invisible in the worst way: a fragment that previews clean in
// one tool and wrong in the other, with nothing saying which page is lying. See the comments below,
// every one of them records a bug this markup already caused.
export const FULLBLEED_RE = /position\s*:\s*(?:absolute|fixed)/i;
export const INSET_RE = /inset\s*:\s*0|(?:top|left|right|bottom)\s*:\s*0\s*(?:;|})/i;

export function fragPage({ raw, theme, bg, boxW = 1400, tSec = 0, fullBleed = false }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/core/tokens.css">
<style>*{box-sizing:border-box}
/* tokens.css is linked for its fonts, but it also sets html,body{width:var(--vw);overflow:hidden} and
   its default --vw is PORTRAIT 1080px. This page never boots, so nothing ever rewrites that default.
   Every fragment wider than 1080px was silently cut at x=1080 while the tool printed "box 1900px
   centred" (docs/MISTAKES.md #351). Undo both: the vars carry the landscape canvas this harness really
   photographs, and html/body grow rather than clip, so --serve still scrolls and the PNG path clips
   through the screenshot rect as the comment below says. */
:root{--vw:1920px;--vh:1080px}
/* color was hard-coded #f7f8f8, which is exactly what made the missing palette invisible: text kept
   looking right while every var(--…) colour resolved to nothing. It follows the theme now. */
html,body{margin:0;background:${bg};color:var(--text);width:auto;height:auto;overflow:visible}
/* min-height (not fixed) + no overflow:hidden → the page SCROLLS when served; the PNG path clips to
   1920x1080 via the screenshot clip, so it's unaffected. */
#stage{min-width:1920px;min-height:1080px;display:flex;align-items:center;justify-content:center}
#frag{--t:${tSec};--p:0;${fullBleed ? 'width:1920px;height:1080px' : `width:${boxW}px`};position:relative;font-family:'Inter',system-ui,sans-serif}</style></head>
<body><div id="stage"><div id="frag">${raw}</div></div>
<script type="module">
  // ONE definition of what a theme means. Importing the engine's own applyTheme is the point: a second
  // copy of the palette-to-token mapping here is how it drifted the first time (#159, #368).
  import { applyTheme } from '/core/engine/boot.js';
  try { applyTheme(${JSON.stringify(theme)}); window.__themed = true; }
  catch (e) { window.__themed = 'error: ' + e.message; }
</script></body></html>`;
}
