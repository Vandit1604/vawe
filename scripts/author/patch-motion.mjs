// patch-motion.mjs — SURGICAL edits to a scene's `motion` tracks, as TEXT.
//
// Every scene in this repo is hand-formatted, and a `JSON.parse` → `JSON.stringify` round-trip
// reformats the whole file: one keyframe moved, a 400-line diff, and every hand-placed comment on
// spacing gone. So the editor never re-serialises a scene. It finds the exact character span of one
// layer's `motion` value and replaces those bytes, leaving every other byte identical.
//
// The scanner is STRING-AWARE and it has to be: an `html` layer's value is CSS, full of `{`, `}`, `[`
// and `]`, and a brace counter that does not know it is inside a string will find the wrong layer and
// corrupt the file. Escapes are handled for the same reason.
//
// Pure and dependency-free so it can be tested without a browser — the editor in scripts/dev/studio.mjs
// calls it, and scripts/gates/lib-test.mjs proves it.

// scan forward from `i` (which must sit on the opening bracket) to the matching close, skipping strings.
export function matchBracket(src, i) {
  const open = src[i];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) throw new Error(`matchBracket: position ${i} is "${open}", not an opening bracket`);
  let depth = 0, inStr = false;
  for (let p = i; p < src.length; p++) {
    const c = src[p];
    if (inStr) {
      if (c === '\\') { p++; continue; }              // escape: skip the next char whatever it is
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return p; }
  }
  throw new Error(`matchBracket: unterminated ${open} from ${i}`);
}

// the character span [start, end) of the top-level "layers" array's Nth element.
export function layerSpan(src, index) {
  const key = /"layers"\s*:\s*\[/g;
  const m = key.exec(src);
  if (!m) throw new Error('no "layers" array in this scene');
  const arrOpen = m.index + m[0].length - 1;
  const arrClose = matchBracket(src, arrOpen);
  let p = arrOpen + 1, n = 0;
  while (p < arrClose) {
    const c = src[p];
    if (c === '{') {
      const end = matchBracket(src, p);
      if (n === index) return { start: p, end: end + 1 };
      n++; p = end + 1; continue;
    }
    p++;
  }
  throw new Error(`layer index ${index} is out of range (found ${n})`);
}

// the span of a property's VALUE inside an object span, plus where its key starts.
export function propSpan(src, obj, name) {
  const needle = `"${name}"`;
  let p = obj.start, inStr = false, depth = 0;
  for (; p < obj.end; p++) {
    const c = src[p];
    if (inStr) { if (c === '\\') { p++; continue; } if (c === '"') inStr = false; continue; }
    if (c === '{' || c === '[') { depth++; continue; }
    if (c === '}' || c === ']') { depth--; continue; }
    if (c === '"') {
      // only a key at depth 1 (directly on this layer) counts, never one nested in a child object
      if (depth === 1 && src.startsWith(needle, p)) {
        const after = src.indexOf(':', p + needle.length);
        let v = after + 1;
        while (v < obj.end && /\s/.test(src[v])) v++;
        const end = (src[v] === '{' || src[v] === '[') ? matchBracket(src, v) + 1 : valueEnd(src, v, obj.end);
        return { keyStart: p, valueStart: v, valueEnd: end };
      }
      inStr = true;
    }
  }
  return null;
}

// end of a scalar value: up to the next comma or closing brace at this level
function valueEnd(src, v, limit) {
  let p = v, inStr = false;
  for (; p < limit; p++) {
    const c = src[p];
    if (inStr) { if (c === '\\') { p++; continue; } if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === ',' || c === '}' || c === ']') return p;
  }
  return limit;
}

// Render a keyframe array in the style the file is already using. Two styles exist in this library
// (expanded and one-line) and BOTH are deliberate, so the patcher copies whichever it replaced rather
// than imposing one and reformatting somebody's file.
export function renderKeys(keys, { expanded, indent = '      ' }) {
  const one = (k) => {
    const parts = Object.entries(k)
      .filter(([, v]) => v !== undefined)
      .map(([p, v]) => `"${p}": ${typeof v === 'number' ? trimNum(v) : JSON.stringify(v)}`);
    return `{ ${parts.join(', ')} }`;
  };
  if (!expanded) return `[${keys.map(one).join(', ')}]`;
  const inner = indent + '  ';
  return `[\n${keys.map((k) => inner + one(k)).join(',\n')}\n${indent}]`;
}

// keyframe times and offsets are measured, not symbolic: 3 decimals is finer than one frame at any fps
// this engine renders, and it keeps 0.1 + 0.2 from writing 0.30000000000000004 into a tracked file.
const trimNum = (v) => String(+(+v).toFixed(3));

// leading whitespace of the line `pos` sits on — so an inserted property lines up with its siblings.
function indentAt(src, pos) {
  const lineStart = src.lastIndexOf('\n', pos - 1) + 1;
  const m = /^[ \t]*/.exec(src.slice(lineStart, pos));
  return m ? m[0] : '      ';
}

// patchMotion(src, layerIndex, keys) → new source text.
// `keys` of null/[] REMOVES the track. A layer with no `motion` gets one inserted after its last
// property, which keeps the author's key order intact (motion is machine-managed, so it goes last).
export function patchMotion(src, layerIndex, keys) {
  const obj = layerSpan(src, layerIndex);
  const existing = propSpan(src, obj, 'motion');
  const drop = !keys || !keys.length;

  if (existing) {
    const cur = src.slice(existing.valueStart, existing.valueEnd);
    if (!drop) {
      // KEY-LEVEL SPLICE. Matching the file's formatting style was the first attempt and it is the
      // wrong goal: this library uses at least three (one line, one key per line, one PROPERTY per
      // line) and `"t": 0.0` does not survive a re-render at all. An editor should touch only what the
      // author touched, so reuse each unchanged key's ORIGINAL TEXT and re-render only the ones that
      // moved. A save with nothing changed is then a zero-byte diff by construction, not by luck.
      const spans = elementSpans(src, existing.valueStart);
      const olds = spans.map((sp) => src.slice(sp.start, sp.end));
      const same = (a, b) => { try { return JSON.stringify(sortedKV(JSON.parse(a))) === JSON.stringify(sortedKV(b)); } catch { return false; } };
      if (spans.length) {
        const style = keyStyle(src, spans, existing);
        // ...and a re-rendered key copies the LAYOUT of the key it replaces. Collapsing a
        // property-per-line key onto one line changes the line count, so every line below it shifts and
        // moving one keyframe reads as a 401-line diff. Same principle as the array style: match what
        // is there. `proto` is the neighbouring key's text for a brand-new key, which has none of its own.
        const proto = olds[0];
        const parts = keys.map((k, i) => (olds[i] !== undefined && same(olds[i], k)
          ? olds[i] : renderKey(k, olds[i] ?? proto)));
        const untouched = keys.length === spans.length && parts.every((t, i) => t === olds[i]);
        if (untouched) return src;                       // nothing moved: return the file unchanged
        return src.slice(0, existing.valueStart) + style.open + parts.join(style.sep) + style.close
          + src.slice(existing.valueEnd);
      }
    }
    if (drop) {
      // take the trailing comma + whitespace with it, or the preceding one if it was the last property
      let a = existing.keyStart, b = existing.valueEnd;
      while (b < obj.end && /[\s,]/.test(src[b]) && src[b] !== '\n') b++;
      if (src[b] === '\n') b++;
      if (src.slice(b, obj.end - 1).trim() === '') { a = src.lastIndexOf(',', existing.keyStart); b = existing.valueEnd; }
      return src.slice(0, a) + src.slice(b);
    }
    const expanded = cur.includes('\n');
    return src.slice(0, existing.valueStart)
      + renderKeys(keys, { expanded, indent: indentAt(src, existing.keyStart) })
      + src.slice(existing.valueEnd);
  }
  if (drop) return src;

  // insert: after the last property, mirroring how this layer is laid out
  const body = src.slice(obj.start, obj.end);
  const multi = body.includes('\n');
  let insertAt = obj.end - 1;                     // just before the layer's closing brace
  while (insertAt > obj.start && /\s/.test(src[insertAt - 1])) insertAt--;
  const ind = multi ? indentAt(src, src.lastIndexOf('\n', insertAt - 1) + 1) : '';
  const rendered = renderKeys(keys, { expanded: multi, indent: ind || '      ' });
  const text = multi ? `,\n${ind || '      '}"motion": ${rendered}` : `, "motion": ${rendered}`;
  return src.slice(0, insertAt) + text + src.slice(insertAt);
}

// the [start,end) span of each object element inside the array that opens at `arrOpen`.
export function elementSpans(src, arrOpen) {
  const close = matchBracket(src, arrOpen);
  const out = [];
  let p = arrOpen + 1;
  while (p < close) {
    if (src[p] === '{') { const e = matchBracket(src, p); out.push({ start: p, end: e + 1 }); p = e + 1; continue; }
    p++;
  }
  return out;
}

// the separator and brackets the file already uses between keyframes, copied verbatim so a re-rendered
// key lands in the same layout as the ones around it.
function keyStyle(src, spans, existing) {
  const open = src.slice(existing.valueStart + 1, spans[0].start);
  const close = src.slice(spans[spans.length - 1].end, existing.valueEnd - 1);
  const sep = spans.length > 1 ? src.slice(spans[0].end, spans[1].start) : (open.includes('\n') ? ',' + open : ', ');
  return { open: '[' + open, sep, close: close + ']' };
}

const sortedKV = (o) => Object.keys(o).sort().reduce((a, k) => (a[k] = typeof o[k] === 'number' ? +(+o[k]).toFixed(3) : o[k], a), {});
function renderKey(k, proto) {
  const kv = Object.entries(k).filter(([, v]) => v !== undefined)
    .map(([p, v]) => `"${p}": ${typeof v === 'number' ? trimNum(v) : JSON.stringify(v)}`);
  if (!proto || !proto.includes('\n')) return `{ ${kv.join(', ')} }`;
  // property-per-line, indented like the prototype's own properties
  const m = /\n([ \t]*)"/.exec(proto);
  const ind = m ? m[1] : '          ';
  const closeInd = ind.slice(0, Math.max(0, ind.length - 2));
  return `{\n${kv.map((x) => ind + x).join(',\n')}\n${closeInd}}`;
}

// upsertKey(keys, k) — set a keyframe at time k.t, replacing any key already at that time (within one
// tick) and keeping the track sorted. This is what a drag in the editor produces: you scrub to a frame,
// move the layer, and that frame gets a key.
export function upsertKey(keys, k, eps = 1e-4) {
  const out = (keys || []).filter((x) => Math.abs((x.t ?? 0) - (k.t ?? 0)) > eps);
  const prev = (keys || []).find((x) => Math.abs((x.t ?? 0) - (k.t ?? 0)) <= eps);
  out.push(prev ? { ...prev, ...k } : k);          // a re-drag updates the key, it does not stack a new one
  return out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
}
