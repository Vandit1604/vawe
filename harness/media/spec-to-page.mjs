// harness/media/spec-to-page.mjs: a ref-spec (spec.json) -> a starter recreation, as text. Pure: no file,
// no browser. `vawe new <name> --ref <mp4>` writes the result (harness/dev/recreation-new.mjs).
//
//   specToFiles(spec, { name, refBase, fonts }) -> { 'page.html', 'GUIDE.md', 'TEXT.md', ['build.js', 'chapter-N.js'] }
//
// The starter holds what the pixels say and nothing else: one section per shot, shown between the cuts;
// each word a span with its measured reveal time; moving elements with the fitted CSS easing; boxes at
// the measured layout fractions; the palette as :root tokens; the reference sound and one synth cue per
// hit. Every literal ends with a comment: `measured ±N` (the calibrated error, spec.err) or `default`
// (a number the pixels do not give, so the author decides). A film over LONG_FILM_S seconds is split at
// the cuts into chapter files with the mount/seek contract of films/recreations/kinetic-promo.
import { deltaE } from '../lib/color-delta.mjs';

const LONG_FILM_S = 20;
const CHAPTER_S = 20;
const SAME_COLOUR_DE = 4;
const MAX_BOXES = 12;
const SOLID_FILL = 0.85;
const MAX_BOX_AREA = 0.7;
const MAX_TOKENS = 10;
const ASPECTS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3 };
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const pct = (v, total) => r((v / total) * 100, 2);

// ── error tags ────────────────────────────────────────────────────────────────────────────────
function tagsOf(spec) {
  const p90 = (k, d) => (spec.err && spec.err[k] ? spec.err[k].p90 : d);
  const frames = (ms) => Math.max(1, Math.ceil((ms / 1000) * spec.fps));
  const m = (text) => `measured ${text}`;
  return {
    time: m(`±${frames(p90('wordT0Ms', 1000 / spec.fps))}f`),
    land: m(`±${frames(p90('landMs', 1000 / spec.fps))}f`),
    cut: m(`±${frames(p90('cutMs', 1000 / spec.fps))}f`),
    pos: m(`±${r(p90('textPosFrac', 0.01) * 100, 1)}%`),
    box: m(`±${r(p90('layoutFrac', 0.003) * 100, 1)}%`),
    size: m(`±${Math.round(p90('textSizeFrac', 0.12) * 100)}%`),
    colour: m(`±dE ${Math.round(p90('paletteDE', 2))}`),
    text: m('OCR, spelling may be off'),
    def: 'default',
  };
}

const lit = (v, tag) => `${typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : v} /* ${tag} */`;

// ── palette: :root tokens, one per distinct colour ────────────────────────────────────────────
function paletteTokens(spec) {
  const found = [];
  const add = (hex, weight) => {
    if (!hex) return;
    const same = found.find((t) => deltaE(t.hex, hex) < SAME_COLOUR_DE);
    if (same) same.weight += weight; else found.push({ hex, weight });
  };
  for (const s of spec.shots) {
    for (const p of s.palette) add(p.hex, p.share * s.frames);
    for (const e of s.elements) add(e.color, 1);
    for (const b of s.layout ? s.layout.boxes : []) add(b.color, 1);
    for (const l of spec.textLines || []) for (const w of l.words) add(w.color, 0.5);
  }
  const top = found.sort((a, b) => b.weight - a.weight).slice(0, MAX_TOKENS);
  top.forEach((t, i) => { t.name = `--c${i + 1}`; });
  return top;
}

const tokenFor = (tokens, hex) => {
  if (!hex) return null;
  const best = tokens.map((t) => ({ t, d: deltaE(t.hex, hex) })).sort((a, b) => a.d - b.d)[0];
  return best ? `var(${best.t.name})` : hex;
};

// ── shots: when each is on screen, and what it holds ─────────────────────────────────────────
function shotWindows(spec) {
  return spec.shots.map((s, i) => {
    const cutIn = i > 0 ? spec.cuts[i - 1] : null, cutOut = spec.cuts[i] || null;
    const tr = cutIn ? cutIn.transition : null;
    const soft = tr && ['crossfade', 'dip', 'wipe'].includes(tr.type);
    const show0 = !cutIn ? 0 : soft ? tr.startT : cutIn.t;
    return { index: i + 1, show0: r(show0), show1: r(cutOut ? cutOut.t : spec.duration), t0: s.t0, t1: s.t1,
      transition: tr ? { type: soft ? (tr.type === 'dip' ? 'crossfade' : tr.type) : 'cut', dir: tr.dir || '', frames: tr.frames, at: r(show0), was: tr.type } : null };
  });
}

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

// One font size per line: the median of its words' own estimates, so a word with a descender does not read bigger.
function wordsIn(spec, win, tokens, dims) {
  const lines = spec.textLines || [];
  const size = new Map(lines.map((l) => [l.index, median(l.words.map((w) => w.fontPx || w.h / 0.8))]));
  return lines.flatMap((l) => l.words).filter((w) => w.t0 >= win.show0 - 0.02 && w.t0 < win.show1)
    .sort((a, b) => a.t0 - b.t0 || a.x - b.x)
    .map((w) => ({ text: w.word, at: r(w.t0), out: w.t1 < win.show1 - 0.06 ? r(w.t1) : null, x: pct(w.x, dims.W), y: pct(w.y, dims.H),
      size: pct(size.get(w.line), dims.H), w: pct(w.w, dims.W), color: tokenFor(tokens, w.color), cx: w.x, cy: w.y, bw: w.w, bh: w.h }));
}

const nearOf = (e, w) => Math.hypot(w.cx - e.to[0], w.cy - e.to[1]) < 0.6 * Math.max(e.size[0], e.size[1], w.bh);

// A tracked move that lands on a word is that word's own move: the word carries it, no box is drawn for it.
function withMoves(s, words, dims) {
  return words.map((w) => {
    const e = s.elements.find((x) => x.easing && nearOf(x, w) && Math.abs((x.land ? x.land.t : 0) - w.at) < 1.5);
    return e ? { ...w, move: { dx: pct(e.from[0] - e.to[0], dims.W), dy: pct(e.from[1] - e.to[1], dims.H), at: r(e.start.t), ms: e.easing.durMs, ease: e.easing.css } } : w;
  });
}

const nearWord = (e, words) => words.some((w) => nearOf(e, w) && e.size[1] < 3 * Math.max(w.bh, 1));

function movesIn(spec, s, words, tokens, dims) {
  return s.elements.filter((e) => e.easing && e.solid && !nearWord(e, words)).map((e) => ({
    x: pct(e.to[0] - e.size[0] / 2, dims.W), y: pct(e.to[1] - e.size[1] / 2, dims.H), w: pct(e.size[0], dims.W), h: pct(e.size[1], dims.H),
    color: tokenFor(tokens, e.color), dx: pct(e.from[0] - e.to[0], dims.W), dy: pct(e.from[1] - e.to[1], dims.H),
    at: r(e.start.t), ms: e.easing.durMs, ease: e.easing.css, blur: Boolean(e.blur), cx: e.to[0] / dims.W, cy: e.to[1] / dims.H }));
}

function insideWord(b, words, dims) {
  const bw = b.w * dims.W, bh = b.h * dims.H;
  return words.some((w) => Math.abs(w.cx - (b.x + b.w / 2) * dims.W) < bw / 2 && Math.abs(w.cy - (b.y + b.h / 2) * dims.H) < bh / 2 && bw * bh <= 3 * w.bw * w.bh);
}

function boxesIn(s, words, moves, tokens, dims) {
  if (!s.layout) return [];
  const bg = s.palette[0] ? s.palette[0].hex : null;
  return s.layout.boxes.filter((b) => b.color && b.fill >= SOLID_FILL && b.w * b.h < MAX_BOX_AREA && !(bg && deltaE(b.color, bg) < 6) && !insideWord(b, words, dims)
    && !moves.some((m) => Math.hypot(m.cx - (b.x + b.w / 2), m.cy - (b.y + b.h / 2)) < 0.03))
    .slice(0, MAX_BOXES).map((b) => ({ x: r(b.x * 100, 2), y: r(b.y * 100, 2), w: r(b.w * 100, 2), h: r(b.h * 100, 2), color: tokenFor(tokens, b.color) }));
}

function planShots(spec, tokens, dims) {
  return shotWindows(spec).map((win, i) => {
    const words = withMoves(spec.shots[i], wordsIn(spec, win, tokens, dims), dims);
    const moves = movesIn(spec, spec.shots[i], words, tokens, dims);
    return { ...win, bg: tokenFor(tokens, spec.shots[i].palette[0] && spec.shots[i].palette[0].hex), words, moves, boxes: boxesIn(spec.shots[i], words, moves, tokens, dims) };
  });
}

// ── source text for the data ──────────────────────────────────────────────────────────────────
function wordSrc(w, tg) {
  const parts = [`text: ${lit(w.text, tg.text)}`, `at: ${lit(w.at, tg.time)}`, `out: ${w.out == null ? `null /* ${tg.def} */` : lit(w.out, tg.time)}`,
    `x: ${lit(w.x, tg.pos)}`, `y: ${lit(w.y, tg.pos)}`, `size: ${lit(w.size, tg.size)}`, `w: ${lit(w.w, tg.size)}`, `color: ${lit(w.color || 'var(--c1)', w.color ? tg.colour : tg.def)}`,
    `move: ${w.move ? `{ dx: ${lit(w.move.dx, tg.pos)}, dy: ${lit(w.move.dy, tg.pos)}, at: ${lit(w.move.at, tg.land)}, ms: ${lit(w.move.ms, tg.land)}, ease: ${lit(w.move.ease, tg.land)} }` : `null /* ${tg.def} */`}`];
  return `      { ${parts.join(', ')} },`;
}

function moveSrc(m, tg) {
  const parts = [`x: ${lit(m.x, tg.box)}`, `y: ${lit(m.y, tg.box)}`, `w: ${lit(m.w, tg.box)}`, `h: ${lit(m.h, tg.box)}`, `color: ${lit(m.color || 'var(--c1)', tg.colour)}`,
    `dx: ${lit(m.dx, tg.box)}`, `dy: ${lit(m.dy, tg.box)}`, `at: ${lit(m.at, tg.land)}`, `ms: ${lit(m.ms, tg.land)}`, `ease: ${lit(m.ease, tg.land)}`, `blur: ${m.blur ? `8 /* ${tg.def} */` : `0 /* ${tg.def} */`}`];
  return `      { ${parts.join(', ')} },`;
}

const boxSrc = (b, tg) => `      { x: ${lit(b.x, tg.box)}, y: ${lit(b.y, tg.box)}, w: ${lit(b.w, tg.box)}, h: ${lit(b.h, tg.box)}, color: ${lit(b.color || 'var(--c1)', tg.colour)} },`;

function shotSrc(s, tg) {
  const tr = s.transition;
  const trSrc = tr ? `{ type: ${lit(tr.type, tg.cut)}, dir: ${lit(tr.dir, tg.cut)}, at: ${lit(tr.at, tg.cut)}, ms: ${lit(r((tr.frames / 60) * 1000, 0), tg.cut)} }` : `null /* the first shot */`;
  return [`  { id: ${lit(`s${s.index}`, tg.def)}, show: [${lit(s.show0, tg.cut)}, ${lit(s.show1, tg.cut)}], bg: ${lit(s.bg || 'var(--c1)', tg.colour)},`,
    `    transition: ${trSrc},`,
    '    boxes: [', ...s.boxes.map((b) => boxSrc(b, tg)), '    ],',
    '    moves: [', ...s.moves.map((m) => moveSrc(m, tg)), '    ],',
    '    words: [', ...s.words.map((w) => wordSrc(w, tg)), '    ],', '  },'].join('\n');
}

const dataSrc = (shots, tg, name = 'SHOTS') => `const ${name} = [\n${shots.map((s) => shotSrc(s, tg)).join('\n')}\n];`;

// ── the runtime: builds the DOM for a list of shots; the renderer seeks its animations ───────────
const BUILDER_SRC = `const REVEAL_MS = 200; /* default */
const REVEAL_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'; /* default */
const REVEAL_RISE_VH = 1.5; /* default */
const EXIT_MS = 100; /* default */
const FIT_WIDTH = false; /* default: true scales each word to its measured width, useful once the font matches */
const FONT = 'var(--font)'; /* default */
const WEIGHT = 700; /* default */
const TRACKING = '-0.02em'; /* default */

const el = (tag, parent, css, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.style.cssText = css;
  parent.appendChild(e);
  return e;
};
const at = (ms) => Math.max(0, ms);
const vw = (pct) => 'calc(var(--vw) * ' + pct / 100 + ')';
const vh = (pct) => 'calc(var(--vh) * ' + pct / 100 + ')';

function addWord(sec, w) {
  const span = el('span', sec, 'position:absolute;left:' + w.x + '%;top:' + w.y + '%;translate:-50% -50%;white-space:nowrap;opacity:0;color:' + w.color
    + ';font:' + WEIGHT + ' ' + vh(w.size) + ' ' + FONT + ';letter-spacing:' + TRACKING, 'w');
  span.textContent = w.text;
  if (FIT_WIDTH) {
    const now = span.getBoundingClientRect().width;
    if (now > 0) span.style.fontSize = vh((w.size * (w.w * window.innerWidth / 100)) / now);
  }
  const m = w.move;
  const rise = m ? 'none' : 'translateY(' + vh(REVEAL_RISE_VH) + ')';
  span.animate([{ opacity: 0, transform: rise }, { opacity: 1, transform: 'none' }],
    { delay: at(w.at * 1000), duration: REVEAL_MS, easing: REVEAL_EASE, fill: 'both' });
  if (m) span.animate([{ transform: 'translate(' + vw(m.dx) + ', ' + vh(m.dy) + ')' }, { transform: 'none' }],
    { delay: at(m.at * 1000), duration: m.ms, easing: m.ease, fill: 'both' });
  if (w.out != null) span.animate([{ opacity: 1 }, { opacity: 0 }], { delay: at(w.out * 1000), duration: EXIT_MS, easing: 'linear', fill: 'forwards' });
}

function addBox(sec, b) {
  el('div', sec, 'position:absolute;left:' + b.x + '%;top:' + b.y + '%;width:' + b.w + '%;height:' + b.h + '%;background:' + b.color);
}

function addMove(sec, m) {
  const box = el('div', sec, 'position:absolute;left:' + m.x + '%;top:' + m.y + '%;width:' + m.w + '%;height:' + m.h + '%;background:' + m.color);
  const from = 'translate(' + vw(m.dx) + ', ' + vh(m.dy) + ')';
  const blur = (px) => (m.blur ? 'blur(' + px + 'px)' : 'none');
  box.animate([{ transform: from, filter: blur(m.blur) }, { transform: 'none', filter: blur(0) }],
    { delay: at(m.at * 1000), duration: m.ms, easing: m.ease, fill: 'both' });
}

const WIPE = { right: 'inset(0 100% 0 0)', left: 'inset(0 0 0 100%)', down: 'inset(0 0 100% 0)', up: 'inset(100% 0 0 0)' };

function addTransition(sec, tr) {
  if (!tr || tr.type === 'cut') return;
  const from = tr.type === 'wipe' ? { clipPath: WIPE[tr.dir] || WIPE.right } : { opacity: 0 };
  const to = tr.type === 'wipe' ? { clipPath: 'inset(0 0 0 0)' } : { opacity: 1 };
  sec.animate([from, to], { delay: at(tr.at * 1000), duration: tr.ms, easing: 'linear', fill: 'both' });
}

function buildShots(root, shots) {
  const built = shots.map((s) => {
    const sec = el('section', root, 'position:absolute;inset:0;overflow:hidden;background:' + s.bg, 'shot');
    s.boxes.forEach((b) => addBox(sec, b));
    s.moves.forEach((m) => addMove(sec, m));
    s.words.forEach((w) => addWord(sec, w));
    addTransition(sec, s.transition);
    return { sec, s };
  });
  return { seek(t) { for (const b of built) b.sec.hidden = !(t >= b.s.show[0] && t < b.s.show[1]); } };
}`;

// ── files ───────────────────────────────────────────────────────────────────────────────────
const fontFace = (fonts, name) => `@font-face { font-family: "${name}"; src: url("../../../assets/fonts/${fonts[0]}.woff2") format("woff2"); font-weight: 100 900; font-display: swap; } /* default: a guess, GUIDE.md lists candidates */`;

function aspectOf(spec) {
  const ratio = spec.media.width / spec.media.height;
  const named = Object.entries(ASPECTS).find(([, v]) => Math.abs(v - ratio) < 0.02);
  if (named) return named[0];
  const g = (a, b) => (b ? g(b, a % b) : a);
  const d = g(spec.media.width, spec.media.height);
  return `${spec.media.width / d}:${spec.media.height / d}`;
}

function headHtml(spec, opts, tokens, tg) {
  const root = tokens.map((t) => `  ${t.name}: ${t.hex}; /* ${tg.colour}, ${Math.round((t.weight / Math.max(1, spec.frames)) * 100)}% of the film */`).join('\n');
  return `<!doctype html>
<html data-aspect="${aspectOf(spec)}">
<head>
<meta charset="utf-8">
<meta name="duration" content="${r(spec.duration)}"> <!-- measured -->
<meta name="fps" content="${spec.fps}"> <!-- measured -->
<meta name="aspect" content="${aspectOf(spec)}"> <!-- measured -->
<style>
${fontFace(opts.fonts, 'Starter')}
:root {
  --font: "Starter", sans-serif; /* default */
${root}
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: var(--c1); }
#stage { position: absolute; inset: 0; overflow: hidden; }
.chapter { position: absolute; inset: 0; overflow: hidden; }
.shot[hidden] { display: none; }
</style>
</head>`;
}

const audioTags = (spec, tg) => {
  if (!spec.audio) return ['<!-- the reference has no audio stream -->'];
  const cues = spec.audio.hits.filter((h) => h.strength >= 0.5).slice(0, 40);
  return ['<audio src="audio.m4a" data-at="0"></audio> <!-- the reference sound; delete it and keep the cues below, or the reverse -->',
    ...cues.map((h) => `<audio data-synth="${h.strength >= 0.8 ? 'impact' : 'pluck'}" data-at="${r(h.attack != null ? h.attack : h.t)}" data-gain="-14"></audio> <!-- ${tg.time}, strength ${h.strength} -->`)];
};

function singlePage(spec, opts, shots, tokens, tg) {
  return `${headHtml(spec, opts, tokens, tg)}
<body>
<!-- ${opts.name}: starter written by \`vawe new --ref ${opts.refBase}\`. Read GUIDE.md and SPEC.md next to this file. A literal ends with
     its error (measured ±N) or "default" (yours to decide). Keep the timing, change the brand. Loop: \`vawe critique page.html --ref ${opts.refBase}\`. -->
<div id="stage"></div>
${audioTags(spec, tg).join('\n')}
<script type="module">
await document.fonts.load('700 100px Starter').catch(() => {});
${dataSrc(shots, tg)}

${BUILDER_SRC}

const scene = buildShots(document.getElementById('stage'), SHOTS);
window.seek = (t) => scene.seek(t);
window.seek(0);
</script>
</body>
</html>
`;
}

// ── long films: one chapter per group of shots, split at the cuts ─────────────────────────────
function groupShots(shots) {
  const groups = [[]];
  for (const s of shots) {
    const cur = groups[groups.length - 1];
    const start = cur.length ? cur[0].show0 : s.show0;
    if (cur.length && s.show1 - start > CHAPTER_S) groups.push([s]); else cur.push(s);
  }
  return groups;
}

const chapterJs = (n, group, tg) => `// chapter ${n}: shots ${group[0].index} to ${group[group.length - 1].index}, ${group[0].show0} to ${group[group.length - 1].show1} s.
// Contract: mount(root) builds the DOM once; seek(t) takes GLOBAL seconds and is a pure function of t. Animations carry absolute delays.
import { buildShots } from './build.js';

${dataSrc(group, tg)}

let scene;
export function mount(root) { scene = buildShots(root, SHOTS); }
export function seek(t) { scene.seek(t); }
`;

function chapteredPage(spec, opts, groups, tokens, tg) {
  const win = (g) => [g[0].show0, g[g.length - 1].show1];
  const list = groups.map((g, i) => `  <div id="chapter-${i + 1}" class="chapter"></div>`).join('\n');
  const imports = groups.map((_, i) => `import * as C${i + 1} from './chapter-${i + 1}.js';`).join('\n');
  const table = groups.map((g, i) => `  [C${i + 1}, ${lit(win(g)[0], tg.cut)}, ${lit(win(g)[1], tg.cut)}, 'chapter-${i + 1}'],`).join('\n');
  return `${headHtml(spec, opts, tokens, tg)}
<body>
<!-- ${opts.name}: starter written by \`vawe new --ref ${opts.refBase}\`, split at the cuts into ${groups.length} chapters (GUIDE.md has the contract). -->
<div id="stage">
${list}
</div>
${audioTags(spec, tg).join('\n')}
<script type="module">
await document.fonts.load('700 100px Starter').catch(() => {});
${imports}

const CHAPTERS = [ /* [module, from s, to s, root id] */
${table}
];
const mounted = CHAPTERS.map(([mod, t0, t1, id]) => {
  const root = document.getElementById(id);
  mod.mount(root);
  return { mod, t0, t1, root };
});

window.seek = (t) => {
  for (const c of mounted) {
    const on = t >= c.t0 && t < c.t1;
    c.root.style.display = on ? 'block' : 'none';
    if (on) c.mod.seek(t);
  }
};
window.seek(0);
</script>
</body>
</html>
`;
}

// ── GUIDE.md and TEXT.md ─────────────────────────────────────────────────────────────────────
const row = (cells) => `| ${cells.join(' | ')} |`;

function guideMd(spec, opts, shots, tokens, groups) {
  const L = [`# ${opts.name}: recreation guide`, '',
    `Reference: ${opts.refBase} (${spec.media.width}x${spec.media.height}, ${spec.media.nativeFps} fps, ${r(spec.duration, 2)} s, ${spec.shots.length} shots). Numbers are in SPEC.md and spec.json next to this file.`,
    'Private if the reference is: keep the folder out of git.', '',
    '## Palette', '', row(['token', 'hex']), row(['---', '---']), ...tokens.map((t) => row([t.name, t.hex])), '',
    '## Font candidates', '', `The pixels do not name a font. The starter uses ${opts.fonts[0]}; try ${opts.fonts.slice(1, 5).join(', ')} (assets/fonts). Match the word widths first: the builder fits each word to its measured width.`, '',
    '## Cuts', '', row(['#', 'at s', 'type', 'dir', 'frames']), row(['---', '---', '---', '---', '---']),
    ...spec.cuts.map((c, i) => row([i + 1, c.t, c.transition.type, c.transition.dir || '-', c.transition.frames])), ''];
  L.push('## Words by line', '', ...(spec.textLines || []).slice(0, 60).map((l) => `- L${l.index} ${l.t0} s (${l.stagger}${l.stepS ? `, ${Math.round(l.stepS * 1000)} ms` : ''}): ${l.text}`), '');
  if (groups.length > 1) {
    L.push('## Chapters', '', 'A chapter module exports `mount(root)` (build once) and `seek(t)` (global seconds, a pure function of t). page.html shows a chapter root only inside its window.', '',
      row(['file', 'shots', 'from s', 'to s']), row(['---', '---', '---', '---']),
      ...groups.map((g, i) => row([`chapter-${i + 1}.js`, `${g[0].index}-${g[g.length - 1].index}`, g[0].show0, g[g.length - 1].show1])), '');
  }
  L.push('## The loop', '', '1. `vawe dev page.html --from <s> --to <s>` for a draft of your seconds.', '2. `vawe critique page.html --ref <ref.mp4>`: fix the worst delta first.', '3. Judge taste and the look; the numbers are already measured.', '');
  return L.join('\n');
}

function textMd(spec) {
  const runs = spec.textRuns || [];
  return ['# On-screen text (tesseract; spelling may be off, timing and positions are measured)', '', row(['from s', 'to s', 'text (lines separated by /)']), row(['---', '---', '---']),
    ...runs.map((x) => row([x.t0.toFixed(2), x.t1.toFixed(2), x.text || '(no text)'])), ''].join('\n');
}

/** spec.json object -> { fileName: text }. opts: name, refBase, fonts (family file names in assets/fonts, best guess first). */
export function specToFiles(spec, opts) {
  const tg = tagsOf(spec);
  const dims = { W: spec.media.width, H: spec.media.height };
  const tokens = paletteTokens(spec);
  const shots = planShots(spec, tokens, dims);
  const groups = spec.duration > LONG_FILM_S ? groupShots(shots) : [shots];
  const files = { 'GUIDE.md': guideMd(spec, opts, shots, tokens, groups), 'TEXT.md': textMd(spec) };
  if (groups.length < 2) return { ...files, 'page.html': singlePage(spec, opts, shots, tokens, tg) };
  files['page.html'] = chapteredPage(spec, opts, groups, tokens, tg);
  files['build.js'] = `// Shared runtime for the chapters: builds the DOM for a list of shots. Lead-owned: report a bug, do not fork it.\n${BUILDER_SRC}\nexport { buildShots };\n`;
  groups.forEach((g, i) => { files[`chapter-${i + 1}.js`] = chapterJs(i + 1, g, tg); });
  return files;
}
