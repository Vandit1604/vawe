// ONE definition of the standalone page a hand-written fragment is previewed on, shared by `make preview` and the storyboard studio so a fragment can't preview clean in one and wrong in the other.
export const FULLBLEED_RE = /position\s*:\s*(?:absolute|fixed)/i;
export const INSET_RE = /inset\s*:\s*0|(?:top|left|right|bottom)\s*:\s*0\s*(?:;|})/i;

// `box` (optional): {x,y,w,h,W,H}, the assembled film's real layer box in canvas pixels; passing it swaps the centred/full-bleed preview layout for the same absolute placement core/layers/html.js gives the layer, so a fragment that clips its actual assembled box clips here too (build fix 7).
export function fragPage({ raw, theme, bg, boxW = 1400, tSec = 0, fullBleed = false, box = null }) {
  const W = box ? box.W : 1920, H = box ? box.H : 1080;
  const stageCss = box
    ? `position:relative;width:${W}px;height:${H}px;overflow:visible`
    : 'min-width:1920px;min-height:1080px;display:flex;align-items:center;justify-content:center';
  const fragCss = box
    ? `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`
    : `${fullBleed ? 'width:1920px;height:1080px' : `width:${boxW}px`};position:relative`;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/core/tokens.css">
<style>*{box-sizing:border-box}
/* tokens.css is linked for its fonts, but it also sets html,body{width:var(--vw);overflow:hidden} and
   its default --vw is PORTRAIT 1080px. This page never boots, so nothing ever rewrites that default.
   Every fragment wider than 1080px was silently cut at x=1080 while the tool printed "box 1900px
   centred" (engine-doctrine/MISTAKES.md #351). Undo both: the vars carry the landscape canvas this harness really
   photographs, and html/body grow rather than clip, so --serve still scrolls and the PNG path clips
   through the screenshot rect as the comment below says. */
:root{--vw:${W}px;--vh:${H}px}
/* color was hard-coded #f7f8f8, which is exactly what made the missing palette invisible: text kept
   looking right while every var(--…) colour resolved to nothing. It follows the theme now. */
html,body{margin:0;background:${bg};color:var(--text);width:auto;height:auto;overflow:visible}
/* min-height (not fixed) + no overflow:hidden → the page SCROLLS when served; the PNG path clips to
   the canvas via the screenshot clip, so it's unaffected. */
#stage{${stageCss}}
#frag{--t:${tSec};--p:0;${fragCss};font-family:'Inter',system-ui,sans-serif}</style></head>
<body><div id="stage"><div id="frag">${raw}</div></div>
<script type="module">
  import { applyTheme } from '/core/engine/boot.js';
  try { applyTheme(${JSON.stringify(theme)}); window.__themed = true; }
  catch (e) { window.__themed = 'error: ' + e.message; }
</script></body></html>`;
}
