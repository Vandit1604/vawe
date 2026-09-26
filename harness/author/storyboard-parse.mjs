export const ARCHETYPES = ['centred', 'split', 'hero-object', 'asymmetric-baseline', 'full-bleed-row',
  'symmetric-pair', 'lockup'];
export const WEIGHTS = ['peak', 'strong', 'quiet'];
/** `other (a reason)` is legal, the same waiver shape every rule here has. */
export const isArchetype = (v) => !v || ARCHETYPES.includes(String(v).trim().split(/\s+\(/)[0])
  || /^other\s*\(.+\)/.test(String(v).trim());

export const RANGE = /\(([\d.]+)\s*s\s*[–: -]\s*([\d.]+)\s*s\)/;

// and a decision that lives in a transcript cannot be checked tomorrow (engine-doctrine/MISTAKES.md #599).
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

export const fieldAllIn = (block, k) => {
  const re = new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${k}\\s*:\\s*(.+)`, 'gi');
  const out = [];
  let m; while ((m = re.exec(block))) out.push(m[1].trim());
  return out;
};

export const blocksOf = (src) => src.split(/^##\s+/m).slice(1);

export function parseObjectLine(raw) {
  if (!raw) return { name: raw, src: null };
  const m = /^(.*?)\s*->\s*(\S+)\s*$/.exec(raw);
  return m ? { name: m[1].trim(), src: m[2] } : { name: raw, src: null };
}

export function durSec(raw) {
  if (!raw) return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds|m|min|mins|minutes)?\s*$/i.exec(raw);
  if (!m) return null;
  return /^m/i.test(m[2] || 's') ? parseFloat(m[1]) * 60 : parseFloat(m[1]);
}

export function onscreenLines(v) {
  if (!v) return [];
  const quoted = [...v.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1].trim());
  const parts = quoted.length ? quoted : v.split(/\s+[/|]\s+/).map((s) => s.trim().replace(/^["']|["']$/g, ''));
  return parts.filter(Boolean);
}

export function parseStoryboard(src) {
  const { present, field } = frontmatter(src);
  const total = durSec(field('duration'));
  const beats = blocksOf(src).map((b, i) => {
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
  });
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
