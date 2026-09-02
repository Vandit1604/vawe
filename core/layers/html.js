// core/layers/html.js: RAW hand-authored HTML/CSS as ONE layer (full design freedom for a beat, still
// positioned/animated by the engine). MUST be static: any <script> is stripped so renderFrame(n) stays
// pure. The sanitiser and the reasoning behind it live in core/sanitize-html.js, shared with the `html`
// background so the layer and the backdrop cannot drift to different rules.
import { sanitizeHtml, scopeStyles, htmlSource, droppedDecls } from '../sanitize-html.js';
import { propsOf } from '../props.js';

// `h` used to be accepted and then ignored: build() set width and not height, and the `.hs-html` wrapper
// had no height of its own, so hand-authored CSS saying `height:100%` resolved against an auto-height
// parent and collapsed to its own content height. A layer declaring a 580px box rendered 310px of card
// and no gate said anything. The silent-substitution class again (docs/MISTAKES.md #210).
//
// `height:100%` on the wrapper is deliberately a no-op when the layer declares no height: 100% against
// an auto-height parent computes to auto, which is exactly today's behaviour. It changes the render only
// for layers that DID state a box, which is the broken case.
// `html` is the layer. `--t` is written every frame with nothing read off the layer to decide it, so
// there is no per-frame prop here.
//
// `src` is the SAME markup, in a file instead of escaped into the JSON, the alternative to `html`, never
// its replacement (the block generators build their fragments in memory and have no file to point at).
// Exactly one of the two, enforced in core/validate.mjs; a `src` that never loaded throws in htmlSource.
// The props are read off this signature (propsOf, core/props.js). No second list to drift from it.
export function build(kit, el, L, { html, src, w, h } = L) {
  if (w != null) el.style.width = w + 'px';
  if (h != null) el.style.height = h + 'px';
  // THE FRAGMENT'S OWN BOX. `bg`, `border`, `radius`, `shadow`, `elevation` and `pad` are shared layer
  // props the schema advertises and this layer accepted and then ignored: nothing here called chipBox,
  // so an html panel asking for a frosted surface painted no surface, no edge and square corners while
  // `glass` (which decorate() applies to every layer) blurred the backdrop behind nothing. Documented
  // input, silently dropped. The same class as `h` above, found the same way. One call, and the
  // fragment gets the identical box treatment text/rect/group already get.
  kit.chipBox(el, L);
  // The layer states its box in `w`/`h`; padding must eat into it rather than grow it, or a panel
  // declaring 760px renders wider than the author asked for. Nothing sets box-sizing globally, so this
  // is scoped to the layers that DID declare a box.
  if ((w != null || h != null) && L.pad != null) el.style.boxSizing = 'border-box';
  const where = `layer${L.id ? ` "${L.id}"` : ''} (html)`;
  const markup = htmlSource({ html, src }, kit.html, where);
  // REFUSE A DECLARATION THE BROWSER WOULD DROP, at the moment this fragment becomes DOM. The parser
  // rejects the one declaration, keeps the rest of the rule and renders on, so a hand-authored style
  // that is subtly malformed produces no error anywhere. The element just never does the thing. That
  // is the same failure the transition/animation refusal above exists for (CSS that reads correctly and
  // silently no-ops), so it is refused in the same breath rather than found later by looking at a frame.
  const bad = droppedDecls(markup);
  if (bad.length)
    throw new Error(`${where}: the browser drops ${bad.length === 1 ? 'this style declaration' : 'these style declarations'} `
      + `: ${bad.join(' · ')}. It keeps the rest of the rule and renders on, so nothing fails and the `
      + `element simply never does it. A leading minus outside calc() is the usual cause: write `
      + `\`calc(-1 * …)\`, not \`-calc(…)\`.`);
  // scopeStyles hoists the fragment's <style> blocks to the front and scopes each one to this wrapper,
  // so one layer's class names cannot reach another layer's DOM (docs/MISTAKES.md #425).
  el.innerHTML = `<div class="hs-html" style="height:100%">${scopeStyles(sanitizeHtml(markup))}</div>`;
}

export const PROPS = propsOf(build);

// `--t` is the scene clock in seconds, the one thing hand-authored CSS can be a function of. It was
// written only on the html BACKGROUND, so an html LAYER using `var(--t)` fell back to its default and
// rendered a permanently dead still, while core/sanitize-html.js, shared by both, told the author that
// `var(--t)` was what worked. Documented input, silently ignored: the worst failure mode in this
// codebase, and 12 layers across the library were already sitting on it. Pure in t, so purity holds.
export function frame(kit, el, L, t) {
  el.style.setProperty('--t', t.toFixed(4));
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "raw hand-authored HTML/CSS as ONE layer, still positioned and animated by the engine; <script> is stripped and CSS transition/animation refused, use `parts` to give its pieces the clock";
