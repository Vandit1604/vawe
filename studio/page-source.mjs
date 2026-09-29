// studio/page-source.mjs: reads a page film's tunable literals out of its own source, each with the
// character range it occupies, and applies text patches at those ranges. There is no private format:
// a literal is whatever the agent wrote, and an edit replaces exactly that text.
//
// What it finds (AGENTS.md page contract, "Tunable numbers are literals in the page"):
//   tables    [[t, v], ...] array literals in a <script>, keys ascending (frame or second tables)
//   keyframes @keyframes stops (percent tokens and their declarations) in <style>
//   animRules `animation` / `animation-duration|delay|timing-function` declarations that name a @keyframes
//   animates  element.animate([...keyframes], {duration, delay, easing}) calls in a <script>
//   vars      :root custom properties
//   audio     <audio data-at> cues, and <meta name="spectacle">
//   texts     text nodes of body elements
// Every value is {text, start, end} in offsets of the whole file.
import { parse } from 'acorn';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const NO_TEXT = new Set(['script', 'style', 'title', 'head', 'noscript']);
const TAG_RE = /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>=`]+))?)*)\s*(\/?)>/y;
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>=`]+)))?/dg;
const COLOR_RE = /^\s*(#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\))\s*$/i;
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

export const decodeText = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m]);
export const encodeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (src, start, end) => ({ text: src.slice(start, end), start, end });

function scanHtml(src) {
  const out = { tags: [], scripts: [], styles: [], texts: [] };
  const stack = [];
  const addText = (a, b) => {
    const owner = stack[stack.length - 1];
    if (!owner || stack.some((t) => NO_TEXT.has(t.tag))) return;
    const raw = src.slice(a, b);
    const lead = raw.length - raw.trimStart().length;
    const tail = raw.length - raw.trimEnd().length;
    if (lead === raw.length) return;
    out.texts.push({ owner, ...span(src, a + lead, b - tail) });
  };
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const stop = lt < 0 ? src.length : lt;
    if (stop > i) addText(i, stop);
    if (lt < 0) break;
    i = lt;
    if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); i = e < 0 ? src.length : e + 3; continue; }
    if (src[i + 1] === '!' || src[i + 1] === '?') { const e = src.indexOf('>', i); i = e < 0 ? src.length : e + 1; continue; }
    if (src[i + 1] === '/') {
      const e = src.indexOf('>', i);
      const name = src.slice(i + 2, e < 0 ? src.length : e).trim().toLowerCase();
      for (let k = stack.length - 1; k >= 0; k--) if (stack[k].tag === name) { stack.length = k; break; }
      i = e < 0 ? src.length : e + 1;
      continue;
    }
    TAG_RE.lastIndex = i;
    const m = TAG_RE.exec(src);
    if (!m) { i++; continue; }
    const tag = m[1].toLowerCase();
    const attrs = {};
    const base = i + 1 + m[1].length;
    for (const a of m[2].matchAll(ATTR_RE)) {
      const g = [2, 3, 4].find((n) => a[n] !== undefined);
      const name = a[1].toLowerCase();
      if (g) attrs[name] = span(src, base + a.indices[g][0], base + a.indices[g][1]);
      else attrs[name] = { text: '', start: base + a.indices[1][1], end: base + a.indices[1][1], bare: true };
    }
    const el = { tag, attrs, id: attrs.id?.text || null, open: i, parent: stack[stack.length - 1] || null };
    out.tags.push(el);
    i += m[0].length;
    if (tag === 'script' || tag === 'style') {
      const close = src.toLowerCase().indexOf(`</${tag}`, i);
      const end = close < 0 ? src.length : close;
      (tag === 'script' ? out.scripts : out.styles).push({ el, ...span(src, i, end) });
      i = end;
      continue;
    }
    if (!VOID.has(tag) && !m[3]) stack.push(el);
  }
  return out;
}

const skipStr = (s, p) => { const q = s[p]; p++; while (p < s.length && s[p] !== q) p += s[p] === '\\' ? 2 : 1; return p; };
function matchBrace(s, open) {
  let depth = 0;
  for (let p = open; p < s.length; p++) {
    const c = s[p];
    if (c === '"' || c === "'") p = skipStr(s, p);
    else if (c === '/' && s[p + 1] === '*') { const e = s.indexOf('*/', p + 2); p = e < 0 ? s.length : e + 1; }
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return p;
  }
  return s.length;
}

function scanDecls(css, from, to, base) {
  const decls = [];
  let chunkStart = from, paren = 0;
  const flush = (end) => {
    const chunk = css.slice(chunkStart, end);
    const colon = chunk.indexOf(':');
    if (colon > 0 && !chunk.includes('{')) {
      const name = chunk.slice(0, colon).trim();
      const raw = chunk.slice(colon + 1);
      const lead = raw.length - raw.trimStart().length;
      const value = raw.trim();
      const start = base + chunkStart + colon + 1 + lead;
      if (value) decls.push({ name, text: value, start, end: start + value.length });
    }
    chunkStart = end + 1;
  };
  for (let p = from; p < to; p++) {
    const c = css[p];
    if (c === '"' || c === "'") p = skipStr(css, p);
    else if (c === '/' && css[p + 1] === '*') { const e = css.indexOf('*/', p + 2); p = e < 0 ? to : e + 1; }
    else if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === ';' && paren === 0) flush(p);
  }
  flush(to);
  return decls;
}

function scanCss(css, base, out) {
  scanBlock(css, 0, css.length, base, out);
}

function scanBlock(css, from, to, base, out) {
  let p = from;
  while (p < to) {
    while (p < to && /\s/.test(css[p])) p++;
    if (css.startsWith('/*', p)) { const e = css.indexOf('*/', p + 2); p = e < 0 ? to : e + 2; continue; }
    if (p >= to) break;
    let q = p, paren = 0;
    while (q < to && !((css[q] === '{' || css[q] === ';') && paren === 0)) {
      if (css[q] === '(') paren++;
      else if (css[q] === ')') paren--;
      q++;
    }
    if (css[q] !== '{') { p = q + 1; continue; }
    const close = matchBrace(css, q);
    const prelude = css.slice(p, q).trim();
    if (/^@(-\w+-)?keyframes\b/i.test(prelude)) {
      const name = prelude.replace(/^@\S+\s+/, '').trim();
      const kf = { name, stops: [] };
      let s = q + 1;
      while (s < close) {
        while (s < close && /\s/.test(css[s])) s++;
        const ob = css.indexOf('{', s);
        if (ob < 0 || ob >= close) break;
        const cb = matchBrace(css, ob);
        const tokens = [...css.slice(s, ob).matchAll(/(-?[\d.]+%|from|to)/gi)].map((t) => {
          const a = base + s + t.index;
          const v = /^from$/i.test(t[1]) ? 0 : /^to$/i.test(t[1]) ? 1 : parseFloat(t[1]) / 100;
          return { text: t[1], start: a, end: a + t[1].length, offset: v };
        });
        kf.stops.push({ tokens, decls: scanDecls(css, ob + 1, cb, base) });
        s = cb + 1;
      }
      out.keyframes.push(kf);
    } else if (prelude.startsWith('@')) {
      scanBlock(css, q + 1, close, base, out);
    } else {
      out.rules.push({ selector: prelude, decls: scanDecls(css, q + 1, close, base) });
    }
    p = close + 1;
  }
}

const TIME_RE = /^-?[\d.]+m?s$/;
const EASE_RE = /^(ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end|(cubic-bezier|steps|linear)\(.*\))$/;

function splitTop(text, start) {
  const toks = [];
  let paren = 0, from = -1;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    const boundary = i === text.length || (/\s/.test(c) && paren === 0);
    if (!boundary && from < 0) from = i;
    if (c === '(') paren++;
    else if (c === ')') paren--;
    if (boundary && from >= 0) { toks.push({ text: text.slice(from, i), start: start + from, end: start + i }); from = -1; }
  }
  return toks;
}

// One editable animation per rule that names a @keyframes: where its duration, delay and easing sit, or
// the offset to insert them at when the author left them out.
function animRulesOf(rules, keyframes) {
  const names = new Set(keyframes.map((k) => k.name));
  const out = [];
  for (const rule of rules) {
    const decl = (n) => rule.decls.find((d) => d.name === n);
    const short = decl('animation');
    const longName = decl('animation-name');
    const res = { selector: rule.selector, name: null, duration: null, delay: null, easing: null, insertAt: null, multi: false };
    if (short) {
      if (splitTop(short.text, short.start).some((t) => t.text.endsWith(','))) res.multi = true;
      const toks = splitTop(short.text, short.start);
      const times = toks.filter((t) => TIME_RE.test(t.text));
      res.name = toks.find((t) => names.has(t.text))?.text || null;
      res.duration = times[0] || null;
      res.delay = times[1] || null;
      res.easing = toks.find((t) => EASE_RE.test(t.text) && t.text !== res.name) || null;
      res.insertAt = { afterDuration: times[0]?.end ?? null, end: short.end };
    }
    if (longName && names.has(longName.text)) res.name = longName.text;
    for (const [key, prop] of [['duration', 'animation-duration'], ['delay', 'animation-delay'], ['easing', 'animation-timing-function']]) {
      const d = decl(prop);
      if (d) res[key] = { text: d.text, start: d.start, end: d.end };
    }
    if (res.name) out.push(res);
  }
  return out;
}

const numLit = (n) => {
  if (n?.type === 'Literal' && typeof n.value === 'number') return { num: n.value, start: n.start, end: n.end };
  if (n?.type === 'UnaryExpression' && n.operator === '-' && n.argument.type === 'Literal' && typeof n.argument.value === 'number') {
    return { num: -n.argument.value, start: n.start, end: n.end };
  }
  return null;
};
const strLit = (n) => (n?.type === 'Literal' && typeof n.value === 'string' ? { str: n.value, start: n.start, end: n.end } : null);

function walk(node, visit, parent = null) {
  visit(node, parent);
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, visit, node); }
    else if (v && typeof v.type === 'string') walk(v, visit, node);
  }
}

const nameOf = (parent) => {
  if (!parent) return null;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
  if (parent.type === 'Property' && parent.key.type === 'Identifier') return parent.key.name;
  if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') return parent.left.name;
  return null;
};

function tableOf(node, parent, src, offset, code) {
  const rows = node.elements;
  if (rows.length < 2 || rows.some((r) => r?.type !== 'ArrayExpression' || r.elements.length < 2)) return null;
  const entries = [];
  let last = -Infinity;
  for (const r of rows) {
    const k = numLit(r.elements[0]);
    const v = r.elements[1];
    const value = numLit(v) || strLit(v) || (v.type === 'ArrayExpression' && v.elements.every((e) => numLit(e)) ? v : null);
    if (!k || !value || k.num < last) return null;
    last = k.num;
    const vs = offset + v.start, ve = offset + v.end;
    const kind = numLit(v) ? 'number' : strLit(v) ? (COLOR_RE.test(value.str) ? 'color' : 'string') : 'array';
    entries.push({
      key: { text: code.slice(k.start, k.end), num: k.num, start: offset + k.start, end: offset + k.end },
      value: { kind, text: src.slice(vs, ve), start: vs, end: ve, str: value.str, num: value.num },
    });
  }
  const line = src.slice(0, offset + node.start).split('\n').length;
  return { name: nameOf(parent), line, entries };
}

function animateOf(node, src, offset) {
  const [kfs, opts] = node.arguments;
  if (kfs?.type !== 'ArrayExpression' || !kfs.elements.length || kfs.elements.some((e) => e?.type !== 'ObjectExpression')) return null;
  const lit = (n) => (n ? { text: src.slice(offset + n.start, offset + n.end), start: offset + n.start, end: offset + n.end, num: numLit(n)?.num ?? null } : null);
  const prop = (obj, name) => obj.properties.find((p) => p.type === 'Property' && (p.key.name === name || p.key.value === name))?.value;
  const keyframes = kfs.elements.map((o) => ({
    offset: lit(prop(o, 'offset')),
    insertAt: offset + o.start + 1,
    props: o.properties.filter((p) => p.type === 'Property' && p.key.name !== 'offset' && p.key.name !== 'easing')
      .map((p) => ({ name: p.key.name || p.key.value, ...lit(p.value) })),
    easing: lit(prop(o, 'easing')),
  }));
  const options = opts?.type === 'ObjectExpression'
    ? { duration: lit(prop(opts, 'duration')), delay: lit(prop(opts, 'delay')), easing: lit(prop(opts, 'easing')), insertAt: offset + opts.start + 1 }
    : { duration: opts ? lit(opts) : null, delay: null, easing: null, insertAt: null };
  return { line: src.slice(0, offset + node.start).split('\n').length, keyframes, options };
}

function scanScript(script, src, out) {
  const code = script.text;
  let ast;
  for (const sourceType of ['module', 'script']) {
    try { ast = parse(code, { ecmaVersion: 'latest', sourceType, allowAwaitOutsideFunction: true }); break; } catch (e) { out.errors.push(`script at ${script.start}: ${e.message}`); }
  }
  if (!ast) return;
  out.errors = out.errors.filter((e) => !e.startsWith(`script at ${script.start}:`));
  walk(ast, (node, parent) => {
    if (node.type === 'ArrayExpression') {
      const t = tableOf(node, parent, src, script.start, code);
      if (t) out.tables.push(t);
    } else if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'animate') {
      const a = animateOf(node, src, script.start);
      if (a) out.animates.push(a);
    }
  });
}

const metaOf = (tags, name) => tags.find((t) => t.tag === 'meta' && t.attrs.name?.text === name);

export function parsePage(src) {
  const html = scanHtml(src);
  const out = { tables: [], keyframes: [], animRules: [], animates: [], vars: [], audio: [], texts: [], meta: {}, errors: [] };
  const rules = { rules: [], keyframes: out.keyframes };
  for (const st of html.styles) scanCss(st.text, st.start, rules);
  out.animRules = animRulesOf(rules.rules, out.keyframes);
  for (const r of rules.rules) {
    if (!r.selector.split(',').some((part) => [':root', 'html'].includes(part.trim()))) continue;
    for (const d of r.decls) if (d.name.startsWith('--')) out.vars.push({ name: d.name, color: COLOR_RE.test(d.text), ...d });
  }
  for (const sc of html.scripts) {
    const type = sc.el.attrs.type?.text || '';
    if (sc.el.attrs.src || (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type))) continue;
    scanScript(sc, src, out);
  }
  for (const t of html.tags) {
    if (t.tag === 'audio') {
      const at = t.attrs['data-at'];
      const gain = t.attrs['data-gain'];
      const label = t.attrs['data-synth']?.text || (t.attrs.src?.text || '').split('/').pop() || 'audio';
      out.audio.push({ label, at: at ? { ...at, num: parseFloat(at.text) } : null, gain: gain?.text ?? null, line: src.slice(0, t.open).split('\n').length });
    }
  }
  for (const n of ['duration', 'fps', 'aspect', 'message', 'loudness']) out.meta[n] = metaOf(html.tags, n)?.attrs.content?.text ?? null;
  const spec = metaOf(html.tags, 'spectacle')?.attrs.content;
  out.meta.spectacle = spec ? { ...spec, num: parseFloat(spec.text) } : null;
  out.texts = html.texts.map((t) => ({ owner: t.owner.id ? `#${t.owner.id}` : t.owner.tag, text: decodeText(t.text), raw: t.text, start: t.start, end: t.end }));
  return out;
}

// edits: [{start, end, expect, text}]. Each `expect` is the text the client believed sat at [start, end):
// a stale range (the file changed underneath) throws instead of corrupting the page.
export function applyEdits(src, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  let floor = Infinity;
  for (const e of sorted) {
    if (!(e.start <= e.end && e.end <= floor)) throw new Error('edits overlap or run out of range');
    if (src.slice(e.start, e.end) !== e.expect) throw new Error(`stale edit at ${e.start}: the file changed, reload the studio`);
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    floor = e.start;
  }
  return out;
}
