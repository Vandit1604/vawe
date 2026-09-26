
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

export function propSpan(src, obj, name) {
  const needle = `"${name}"`;
  let p = obj.start, inStr = false, depth = 0;
  for (; p < obj.end; p++) {
    const c = src[p];
    if (inStr) { if (c === '\\') { p++; continue; } if (c === '"') inStr = false; continue; }
    if (c === '{' || c === '[') { depth++; continue; }
    if (c === '}' || c === ']') { depth--; continue; }
    if (c === '"') {
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

const trimNum = (v) => String(+(+v).toFixed(3));

function indentAt(src, pos) {
  const lineStart = src.lastIndexOf('\n', pos - 1) + 1;
  const m = /^[ \t]*/.exec(src.slice(lineStart, pos));
  return m ? m[0] : '      ';
}

export function patchMotion(src, layerIndex, keys) {
  const obj = layerSpan(src, layerIndex);
  const existing = propSpan(src, obj, 'motion');
  const drop = !keys || !keys.length;

  if (existing) {
    const cur = src.slice(existing.valueStart, existing.valueEnd);
    if (!drop) {
      const spans = elementSpans(src, existing.valueStart);
      const olds = spans.map((sp) => src.slice(sp.start, sp.end));
      const same = (a, b) => { try { return JSON.stringify(sortedKV(JSON.parse(a))) === JSON.stringify(sortedKV(b)); } catch { return false; } };
      if (spans.length) {
        const style = keyStyle(src, spans, existing);
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

  const body = src.slice(obj.start, obj.end);
  const multi = body.includes('\n');
  let insertAt = obj.end - 1;                     // just before the layer's closing brace
  while (insertAt > obj.start && /\s/.test(src[insertAt - 1])) insertAt--;
  const ind = multi ? indentAt(src, src.lastIndexOf('\n', insertAt - 1) + 1) : '';
  const rendered = renderKeys(keys, { expanded: multi, indent: ind || '      ' });
  const text = multi ? `,\n${ind || '      '}"motion": ${rendered}` : `, "motion": ${rendered}`;
  return src.slice(0, insertAt) + text + src.slice(insertAt);
}

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
  const m = /\n([ \t]*)"/.exec(proto);
  const ind = m ? m[1] : '          ';
  const closeInd = ind.slice(0, Math.max(0, ind.length - 2));
  return `{\n${kv.map((x) => ind + x).join(',\n')}\n${closeInd}}`;
}

export function upsertKey(keys, k, eps = 1e-4) {
  const out = (keys || []).filter((x) => Math.abs((x.t ?? 0) - (k.t ?? 0)) > eps);
  const prev = (keys || []).find((x) => Math.abs((x.t ?? 0) - (k.t ?? 0)) <= eps);
  out.push(prev ? { ...prev, ...k } : k);          // a re-drag updates the key, it does not stack a new one
  return out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
}

function topArrayOpen(src, obj, key) {
  const needle = `"${key}"`;
  let p = obj.start, inStr = false, depth = 0;
  for (; p < obj.end; p++) {
    const c = src[p];
    if (inStr) { if (c === '\\') { p++; continue; } if (c === '"') inStr = false; continue; }
    if (c === '{' || c === '[') { depth++; continue; }
    if (c === '}' || c === ']') { depth--; continue; }
    if (c === '"') {
      if (depth === 1 && src.startsWith(needle, p)) {
        const after = src.indexOf(':', p + needle.length);
        let v = after + 1;
        while (v < obj.end && /\s/.test(src[v])) v++;
        if (src[v] === '[') return v;
      }
      inStr = true;
    }
  }
  return -1;
}

function topObjectOpen(src, obj, key) {
  const needle = `"${key}"`;
  let p = obj.start, inStr = false, depth = 0;
  for (; p < obj.end; p++) {
    const c = src[p];
    if (inStr) { if (c === '\\') { p++; continue; } if (c === '"') inStr = false; continue; }
    if (c === '{' || c === '[') { depth++; continue; }
    if (c === '}' || c === ']') { depth--; continue; }
    if (c === '"') {
      if (depth === 1 && src.startsWith(needle, p)) {
        const after = src.indexOf(':', p + needle.length);
        let v = after + 1;
        while (v < obj.end && /\s/.test(src[v])) v++;
        if (src[v] === '{') return { start: v, end: matchBracket(src, v) + 1 };
      }
      inStr = true;
    }
  }
  return null;
}

function walkPath(src, segs, opKind) {
  let region = { start: 0, end: src.length };
  let i = 0;
  while (i < segs.length - 1) {
    const key = segs[i];
    const arrOpen = topArrayOpen(src, region, key);
    if (arrOpen >= 0) {
      const idxSeg = segs[i + 1];
      if (!/^\d+$/.test(idxSeg)) throw new Error(`\`${key}\` is an array; expected an index after it, not "${JSON.stringify(idxSeg)}"`);
      const idx = +idxSeg;
      let spans = elementSpans(src, arrOpen);
      const isFinalArrayHop = i + 2 === segs.length - 1;
      if (!spans[idx]) {
        if (!(isFinalArrayHop && opKind === 'add' && idx === spans.length))
          throw new Error(`${key}[${idx}] does not exist in this scene`);
        const close = matchBracket(src, arrOpen);
        src = src.slice(0, close) + (spans.length ? ', {}' : '{}') + src.slice(close);
        spans = elementSpans(src, arrOpen);
      }
      region = spans[idx]; i += 2; continue;
    }
    const objSpan = topObjectOpen(src, region, key);
    if (!objSpan) throw new Error(`this scene has no \`${key}\` array or object to patch at /${segs.join('/')}`);
    region = objSpan; i += 1;
  }
  return { region, src };
}
export function applyOps(src, ops) {
  for (const op of ops || []) {
    const segs = String(op && op.path || '').split('/').filter(Boolean);
    if (segs.length < 2 || segs.some((s) => !/^[A-Za-z0-9_]+$/.test(s)))
      throw new Error(`this editor applies /<key>/<i>/.../<prop> ops only, not ${JSON.stringify(op && op.path)}`);
    const name = segs[segs.length - 1];
    const { region: el, src: src2 } = walkPath(src, segs, op.op);
    src = src2;
    const cur = propSpan(src, el, name);
    if (op.op === 'replace' || op.op === 'add') {
      const text = JSON.stringify(op.value);
      const bare = cur ? false : !src.slice(el.start + 1, el.end - 1).trim();
      src = cur
        ? src.slice(0, cur.valueStart) + text + src.slice(cur.valueEnd)
        : src.slice(0, el.start + 1) + ` "${name}": ${text}` + (bare ? ' ' : ',') + src.slice(el.start + 1);
    } else if (op.op === 'remove') {
      if (!cur) continue;
      let a = cur.keyStart, b = cur.valueEnd;
      while (b < el.end && /[\s,]/.test(src[b]) && src[b] !== '\n') b++;
      if (src[b] === '\n') b++;
      if (src.slice(b, el.end - 1).trim() === '') { a = src.lastIndexOf(',', cur.keyStart); b = cur.valueEnd; }
      src = src.slice(0, a) + src.slice(b);
    } else throw new Error(`unsupported op "${op.op}"`);
  }
  return src;
}
