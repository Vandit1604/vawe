// What a film's DESIGN.md declares as the owner's decisions: font, type-scale, ui-scale, camera. One line each under "## Declared":
//   - font: Tahoma (system, local())      - type-scale: 4%      - ui-scale: 2.5%      - camera: still | free
// The acceptance rows, the draft size check and the judge follow a declaration over the house default and print the line they followed.
import fs from 'node:fs';
import path from 'node:path';

const KEYS = ['font', 'type-scale', 'ui-scale', 'camera'];
const CAMERAS = new Set(['still', 'free']);
const PCT_MIN = 0.5;
const PCT_MAX = 20;

const section = (text) => /^##[ \t]+Declared[^\n]*\n([\s\S]*?)(?=^##[ \t]|(?![\s\S]))/im.exec(text)?.[1] ?? '';

/** { font, typeScale, uiScale, camera, lines, problems } of a DESIGN.md text. A scale is a percent of the frame height; a bad value is a problem, never a guess. */
export function parseDecls(text) {
  const out = { font: null, typeScale: null, uiScale: null, camera: null, lines: [], problems: [] };
  for (const raw of section(String(text ?? '')).split('\n')) {
    const m = /^\s*[-*]\s*([a-z-]+)\s*:\s*(.+?)\s*$/i.exec(raw);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2];
    if (!KEYS.includes(key)) { out.problems.push(`"${key}" is not a declaration (${KEYS.join(', ')})`); continue; }
    if (key === 'font') out.font = value.replace(/\s*\(.*$/, '').trim();
    else if (key === 'camera') {
      const word = value.split(/\s/)[0].toLowerCase();
      if (!CAMERAS.has(word)) { out.problems.push(`camera: "${value}" is not still or free`); continue; }
      out.camera = word;
    } else {
      const n = parseFloat(value);
      if (!(n >= PCT_MIN && n <= PCT_MAX)) { out.problems.push(`${key}: "${value}" is not a percent of the frame height between ${PCT_MIN} and ${PCT_MAX}`); continue; }
      out[key === 'type-scale' ? 'typeScale' : 'uiScale'] = n;
    }
    out.lines.push(`${key}: ${value}`);
  }
  return out;
}

/** The declarations of the DESIGN.md beside a page or brief, or the empty set when there is none. */
export function readDecls(pagePath) {
  const file = path.join(path.dirname(path.resolve(pagePath)), 'DESIGN.md');
  return parseDecls(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
}

/** The size floors (fractions of the frame height) a film follows: the house `rules` with each declared scale put over its floor. */
export function rulesWith(decls, rules) {
  return { ...rules, ...(decls.typeScale != null ? { capFrac: decls.typeScale / 100 } : {}), ...(decls.uiScale != null ? { uiCapFrac: decls.uiScale / 100 } : {}) };
}

/** The lines the judge reads: what the film declared and what that means for its verdict. [] without a declaration. */
export function judgeLines(decls) {
  if (!decls.lines.length) return [];
  const asks = [
    decls.font && `the face is ${decls.font}: do not ask for the house face or another font`,
    decls.typeScale != null && `read text is sized to ${decls.typeScale}% cap height by decision: do not ask for bigger text`,
    decls.uiScale != null && `UI that is the subject is sized to ${decls.uiScale}% cap height by decision: do not ask for bigger UI`,
    decls.camera === 'still' && 'the camera is declared still: never ask for a push or a drift',
    decls.camera === 'free' && 'the camera is declared free: a camera move is not a defect',
  ].filter(Boolean);
  return [`Declared in this film's DESIGN.md (owner decisions, they win over the house defaults): ${decls.lines.join('; ')}.`, ...asks.map((a) => `- ${a}`)];
}
