// blueprints/beats-html.mjs: HTML-FIRST beats. An author with hand-written markup (a stat block, a
// browser frame, a table, a chat log) wants the same choreography a rect/text beat gets for free: one
// `html` layer, `parts` for the inner reveal, a paired exit anchored to the beat's own end. These five
// give a fragment author that without re-deriving it (docs/CRAFT/HTML-FRAGMENTS.md, `parts`).
//
// Every factory returns ONE html layer (two for `htmlBrowser`'s optional title). The fragment supplies
// the LOOK, `parts` supplies what it DOES over time, per the engine's own split. Colours default to
// theme vars so a beat stays brand-agnostic; the author's own `body`/`rows`/`messages` is the content.
//
// Design Read (shared by all five): flat surfaces, hairline borders, one accent reserved for the thing
// that matters (a title, a sender name), never a gradient or a card-in-card. VARIANCE low (these are
// utility chrome, not the film's one loud moment), MOTION restrained (riseIn/popIn, never a bespoke
// track: an author reaching for these wants the choreography solved, not another decision to make).
import { INK, DIM, ACCENT, LINE, SURF2 } from './kit.mjs';

// Shared shape: wrap a fragment in one html layer with `parts` driving its own children. `select`
// defaults to `[data-part]` so every beat below can mark its reveal-worthy children the same way
// without inventing a class name per beat.
const wrap = ({ x, y, w, h, html, select = '[data-part]', anim = 'riseIn', each = 0.45, stagger = 0.08,
  start = 0, dur = 4 } = {}) => ([{
  type: 'html', x, y, w, ...(h != null ? { h } : {}), start, duration: dur, anim: 'none', enterDur: 0,
  html, parts: [{ select, anim, each, stagger, out: true, exitDur: 0.3 }],
}]);

// htmlCard: a single hairline-bordered surface (a stat block, a callout, a feature card) built from
// author markup. `body` is raw HTML dropped inside; mark each reveal-worthy child `data-part` (or pass
// your own `select`) and it gets a seeked, staggered entrance instead of arriving as one flat card.
export function htmlCard({ x = 560, y = 300, w = 800, h, title, body = '', accent = ACCENT,
  select, anim, each, stagger, start = 0, dur = 4 } = {}) {
  const html = `<div style="box-sizing:border-box;width:${w}px;padding:40px;background:var(--surface);`
    + `border:1.5px solid ${LINE};border-radius:20px;display:flex;flex-direction:column;gap:18px">`
    + (title ? `<div data-part style="font:700 40px var(--font-sans);color:${accent}">${title}</div>` : '')
    + `${body}</div>`;
  return wrap({ x, y, w, h, html, select, anim, each, stagger, start, dur });
}

// htmlPanel: a plainer, LOWER-CONTRAST surface than htmlCard, the general-purpose backdrop for content
// this file does not have an opinion about, a terminal's frame, a dialog's body, anything the caller
// wants to draw its own children into. No title slot; `body` is the whole content.
export function htmlPanel({ x = 360, y = 330, w = 1200, h = 470, body = '', radius = 18,
  select, anim, each, stagger, start = 0, dur = 4 } = {}) {
  const html = `<div style="box-sizing:border-box;width:${w}px;${h != null ? `height:${h}px;` : ''}`
    + `background:${SURF2};border:1.5px solid ${LINE};border-radius:${radius}px">${body}</div>`;
  return wrap({ x, y, w, h, html, select, anim, each, stagger, start, dur });
}

// htmlBrowser: a browser-chrome frame (traffic dots + URL bar) around author content, the shape a demo
// or a launch film reaches for to show a real page rather than a bare card. Traffic dots are decorative
// chrome (no `data-part`, they read as furniture, not a reveal); the URL and `body` are the content.
export function htmlBrowser({ x = 460, y = 220, w = 1000, h = 640, url = '', body = '',
  select, anim, each, stagger, start = 0, dur = 5 } = {}) {
  const dot = (c) => `<span style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block"></span>`;
  const html = `<div style="box-sizing:border-box;width:${w}px;height:${h}px;background:var(--surface);`
    + `border:1.5px solid ${LINE};border-radius:16px;overflow:hidden;display:flex;flex-direction:column">`
    + `<div style="display:flex;align-items:center;gap:16px;padding:14px 20px;border-bottom:1px solid ${LINE}">`
    + `<div style="display:flex;gap:8px">${dot('#ee4444')}${dot('#f5a623')}${dot('#0aa06a')}</div>`
    + (url ? `<div style="flex:1;display:flex;justify-content:center"><span style="font:500 20px var(--font-mono);`
      + `color:${DIM};background:${SURF2};border-radius:100px;padding:6px 18px">${url}</span></div>` : '')
    + `</div><div style="flex:1;min-height:0">${body}</div></div>`;
  return wrap({ x, y, w, h, html, select, anim, each, stagger, start, dur });
}

// htmlTable: a real data table (headers + rows), `parts` reveals it row by row (`tr`), never a whole
// grid popping in at once. `rows` is an array of arrays; `headers` is optional.
export function htmlTable({ x = 360, y = 300, w = 1200, headers = [], rows = [],
  each = 0.4, stagger = 0.12, start = 0, dur = 5 } = {}) {
  const cell = (v, tag) => `<${tag} style="text-align:left;padding:14px 20px;font:500 26px var(--font-mono);`
    + `color:${INK};border-bottom:1px solid ${LINE}">${v}</${tag}>`;
  const head = headers.length ? `<tr>${headers.map((h) => `<th style="text-align:left;padding:14px 20px;`
    + `font:700 24px var(--font-sans);color:${DIM};border-bottom:1.5px solid ${LINE}">${h}</th>`).join('')}</tr>` : '';
  const body = rows.map((r) => `<tr class="row">${r.map((v) => cell(v, 'td')).join('')}</tr>`).join('');
  const html = `<table style="box-sizing:border-box;width:${w}px;border-collapse:collapse;background:var(--surface);`
    + `border:1.5px solid ${LINE};border-radius:18px;overflow:hidden"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  return wrap({ x, y, w, html, select: '.row', anim: 'fadeUp', each, stagger, start, dur });
}

// htmlChat: a chat log (`messages: [{from, text, me}]`), bubbles arriving one after another the way a
// conversation actually lands, not all at once. `me` right-aligns a bubble in the accent.
export function htmlChat({ x = 560, y = 220, w = 800, messages = [],
  each = 0.4, stagger = 0.35, start = 0, dur = 6 } = {}) {
  const bubble = (m) => `<div class="bubble" style="align-self:${m.me ? 'flex-end' : 'flex-start'};max-width:80%;`
    + `padding:16px 22px;border-radius:18px;font:500 26px var(--font-sans);`
    + (m.me ? `background:${ACCENT};color:var(--on-accent)` : `background:${SURF2};color:${INK}`)
    + `">${m.text}</div>`;
  const html = `<div style="box-sizing:border-box;width:${w}px;display:flex;flex-direction:column;gap:16px">`
    + `${messages.map(bubble).join('')}</div>`;
  return wrap({ x, y, w, html, select: '.bubble', anim: 'fadeUp', each, stagger, start, dur });
}
