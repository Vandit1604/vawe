// storyboard-parse is the one reader for the storyboard contract (engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md); its regexes are lifted verbatim from storyboard-check.mjs so gate and animatic never drift apart.
// ARCHETYPES/WEIGHTS are exported so storyboard-check, frame-check and the template read ONE list, not three copies that drift.
export const ARCHETYPES = ['centred', 'split', 'hero-object', 'asymmetric-baseline', 'full-bleed-row',
  'symmetric-pair', 'lockup'];
export const WEIGHTS = ['peak', 'strong', 'quiet'];
/** `other (a reason)` is legal, the same waiver shape every rule here has. */
export const isArchetype = (v) => !v || ARCHETYPES.includes(String(v).trim().split(/\s+\(/)[0])
  || /^other\s*\(.+\)/.test(String(v).trim());

export const RANGE = /\(([\d.]+)\s*s\s*[–: -]\s*([\d.]+)\s*s\)/;

// referenceDevices exists because an early pass caught only 3 of a reference's 12 moves with the catalogue living in a chat message (engine-doctrine/MISTAKES.md #599).
export function referenceDevices(src) {
  const m = /^###\s+Reference devices\s*$([\s\S]*?)(?=^##\s|\Z)/m.exec(src || '');
  if (!m) return [];
  return [...m[1].matchAll(/^\|\s*(D\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm)]
    .map(([, id, device, use]) => ({ id, device, use,
      dropped: /\bdropped\b/i.test(use) }));
}

export function frontmatter(src) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(src);
  const head = fm ? fm[1] : '';
  const field = (k) => {
    const m = new RegExp(`^${k}\\s*:\\s*(.+)$`, 'mi').exec(head);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  };
  return { present: !!fm, head, field };
}

export const fieldIn = (block, k) => {
  const m = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${k}\\s*:\\s*(.+)`, 'i').exec(block);
  return m ? m[1].trim() : null;
};

// fieldAllIn: `use:` is the one field a beat may write more than once (harness/lib/contract.mjs parseUseLine); every other field stays single-valued via fieldIn's first match.
export const fieldAllIn = (block, k) => {
  const re = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${k}\\s*:\\s*(.+)`, 'gi');
  const out = [];
  let m; while ((m = re.exec(block))) out.push(m[1].trim());
  return out;
};

export const blocksOf = (src) => src.split(/^##\s+/m).slice(1);

// TABLE BEATS: a `## Beat N: ...` heading per beat is the documented shape, but a beat table
// (`| beat | start | end | ... |`) is the same information laid out as rows, and a storyboard written
// that way used to parse to ZERO beats: `blocksOf` only ever split on headings, so every consumer here
// (match.mjs, choreo, coverage, storyboard-check, …) silently fell back to whatever it does with none,
// which for `harness/media/match.mjs` was detecting cuts in the REFERENCE and saying nothing about why.
// Recognised header names, matched case-insensitively so `| Beat | Start | End |` and `| beat | start
// (s) | end (s) |` both work; a header this does not recognise is dropped, never guessed at.
const TABLE_HEADER = /^\|\s*beat\s*\|.*\bstart\b.*\bend\b/im;
const KNOWN_FIELDS = ['type', 'object', 'blueprint', 'onscreen', 'mechanism', 'becomes', 'why', 'motion',
  'move', 'style', 'layout', 'rest', 'narration', 'archetype', 'weight', 'ground', 'kinetic', 'elements',
  'fragment', 'recipe', 'camera', 'shot', 'picture', 'placement', 'eye', 'borrows', 'trigger'];

function tableBeats(src) {
  const lines = src.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  const headerIdx = lines.findIndex((l) => /\bbeat\b/i.test(l) && /\bstart\b/i.test(l) && /\bend\b/i.test(l));
  if (headerIdx < 0) return [];
  const cells = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = cells(lines[headerIdx]).map((h) => h.toLowerCase());
  const col = (name) => headers.findIndex((h) => h === name || h.startsWith(name));
  const iBeat = col('beat'), iStart = col('start'), iEnd = col('end');
  if (iBeat < 0 || iStart < 0 || iEnd < 0) return [];
  const known = Object.fromEntries(KNOWN_FIELDS.map((k) => [k, col(k)]).filter(([, i]) => i >= 0));
  const rows = lines.slice(headerIdx + 1).filter((l) => !/^\|\s*[-: |]+\|?\s*$/.test(l));
  return rows.map((l, i) => {
    const c = cells(l);
    const start = parseFloat(c[iStart]), end = parseFloat(c[iEnd]);
    const raw = Object.fromEntries(Object.entries(known).map(([k, idx]) => [k, c[idx] || null]));
    return {
      i, title: c[iBeat] || `Beat ${i + 1}`, name: c[iBeat] || `Beat ${i + 1}`,
      start: Number.isFinite(start) ? start : null, end: Number.isFinite(end) ? end : null,
      duration: Number.isFinite(start) && Number.isFinite(end) ? end - start : null,
      type: null, object: null, blueprint: null, mechanism: null, becomes: null, why: null,
      transition_in: null, transition_why: null, transition_value: null,
      shot: null, camera: null, picture: null, placement: null,
      object_in: null, object_out: null, motion: null, move: null,
      style: null, layout: null, rest: null, narration: null, trigger: null, eye: null,
      archetype: null, weight: null, borrows: null, ground: null, kinetic: null, elements: null,
      fragment: null, recipe: null, uses: [], feedback: [],
      ...raw,
      onscreen: onscreenLines(raw.onscreen),
    };
  });
}

// parseObjectLine: `object:` may carry a source after an arrow ("name -> films/scene/_together.bar.html"), the real layer to draw instead of assemble.mjs's placeholder rect.
export function parseObjectLine(raw) {
  if (!raw) return { name: raw, src: null };
  const m = /^(.*?)\s*->\s*(\S+)\s*$/.exec(raw);
  return m ? { name: m[1].trim(), src: m[2] } : { name: raw, src: null };
}

// seconds from a `duration:` value that may say "29s", "1.5 min", or a bare number.
export function durSec(raw) {
  if (!raw) return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds|m|min|mins|minutes)?\s*$/i.exec(raw);
  if (!m) return null;
  return /^m/i.test(m[2] || 's') ? parseFloat(m[1]) * 60 : parseFloat(m[1]);
}

// onscreenLines: `onscreen: "a" / "b"` -> ['a','b']; quoted segments win, a bare value splits on ` / `, and empty strings are dropped since an empty text layer reads as dead air in the animatic.
export function onscreenLines(v) {
  if (!v) return [];
  const quoted = [...v.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1].trim());
  const parts = quoted.length ? quoted : v.split(/\s+[/|]\s+/).map((s) => s.trim().replace(/^["']|["']$/g, ''));
  return parts.filter(Boolean);
}

export function parseStoryboard(src) {
  const { present, field } = frontmatter(src);
  const total = durSec(field('duration'));
  const headingBlocks = blocksOf(src);
  // A beat TABLE only when there is no heading beat to prefer: a storyboard authored the documented
  // way never touches this branch, so the table shape adds recall without changing a single existing
  // parse. TABLE_HEADER guards tableBeats() with a cheap match first, so a storyboard with an unrelated
  // table elsewhere (frontmatter, notes) never gets misread as a beat table.
  const beats = headingBlocks.length ? headingBlocks.map((b, i) => {
    const title = b.split('\n')[0].trim();
    const r = RANGE.exec(title);
    const f = (k) => fieldIn(b, k);
    const declared = f('duration');
    return {
      i, title,
      name: title.replace(RANGE, '').replace(/^(?:Beat\s+)?\d+\s*[, :-]\s*/i, '').trim() || `Beat ${i + 1}`,
      start: r ? parseFloat(r[1]) : null,
      end: r ? parseFloat(r[2]) : null,
      duration: durSec(declared),
      type: f('type'), object: f('object'), blueprint: f('blueprint'),
      onscreen: onscreenLines(f('onscreen')), mechanism: f('mechanism'),
      becomes: f('becomes'), why: f('why'),
      transition_in: f('transition_in'),
      transition_why: f('transition_why'),
      transition_value: f('transition_value'),
      shot: f('shot'), camera: f('camera'), picture: f('picture'),
      placement: f('placement'),
      object_in: f('object_in'), object_out: f('object_out'),
      motion: f('motion'),
      move: f('move'),
      style: f('style'), layout: f('layout'), rest: f('rest'),
      narration: f('narration'),
      trigger: f('trigger'),
      eye: f('eye'),
      // wrong object in fluent English and pass every check (engine-doctrine/MISTAKES.md #596). These three cannot
      archetype: f('archetype'), weight: f('weight'), borrows: f('borrows'),
      ground: f('ground'), kinetic: f('kinetic'), elements: f('elements'),
      fragment: f('fragment'),
      recipe: f('recipe'),
      uses: fieldAllIn(b, 'use'),
      feedback: fieldAllIn(b, 'feedback'),
    };
  }) : (TABLE_HEADER.test(src) ? tableBeats(src) : []);
  const { name: objectName, src: objectSrc } = parseObjectLine(field('object'));
  return {
    hasFrontmatter: present, field, duration: total,
    message: field('message'), audience: field('audience'), arc: field('arc'),
    framework: field('framework'), theme: field('theme'), format: field('format'),
    object: objectName, objectSrc, beats,
    pace: field('pace'), spectacle: field('spectacle'), not: field('not'),
    threads: field('threads'),
    attention: field('attention'),
  };
}

// timeline fills missing beat spans by dividing whatever time is left equally, and tells the caller which ones were guessed.
export function timeline(sb) {
  const out = [], guessed = [];
  let cursor = 0;
  const total = sb.duration || null;
  const known = sb.beats.filter((b) => b.start != null && b.end != null).length;
  for (const b of sb.beats) {
    let start = b.start, end = b.end;
    if (start == null || end == null) {
      start = cursor;
      end = b.duration != null ? start + b.duration : null;
      guessed.push(b.name);
    }
    out.push({ ...b, start, end });
    if (end != null) cursor = end;
  }
  const open = out.filter((b) => b.end == null);
  if (open.length) {
    const last = out.filter((b) => b.end != null).reduce((m, b) => Math.max(m, b.end), 0);
    const room = Math.max(1, (total || last + open.length * 3) - last);
    const each = room / open.length;
    let t = last;
    for (const b of out) if (b.end == null) { b.start = t; b.end = t + each; t += each; }
  }
  return { beats: out, guessed, known };
}
