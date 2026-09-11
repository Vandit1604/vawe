// harness/lib/craft-rules.mjs: ONE schema for a craft rule, loaded from docs/CRAFT/rules/<category>.json,
// so the harness can print the right rule at the right stage instead of an author re-reading AGENTS.md.
//
// Four mechanisms said this before with no shared shape (docs/RULES per-rule records, doc frontmatter
// codes/confirm, safeguards.mjs adapts, critics.mjs hand-typed prose). This is the fifth, and the last:
// everything above either migrates into a record here or stays prose a record here points at.
//
// A record never carries prose. It carries an id, where it fires, what checks it (or null, meaning
// nothing but an eye catches it), and a `brief` that QUOTES the doc rather than restating it, so the
// quote goes stale the moment the doc's own wording moves and the loader can catch that (see
// `sectionText`/`validateRule`'s freshness check below). JUST-IN-TIME: a printed line names the doc,
// never inlines its paragraph, so an agent opens the real page only when the one-liner is not enough.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE_ORDER } from '../../quality/gates/stage.mjs';
import { computeFeatures } from '../../quality/gates/craft-checklist.mjs';
import { codesEmitted } from './finding-codes.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The feature-key vocabulary IS whatever computeFeatures actually produces, never a copy of it: a
// second list drifts the day a feature is renamed. Called with no scene/storyboard, computeFeatures is
// pure enough to hand back its full key set with every value false/NaN-derived.
export const FEATURE_KEYS = Object.keys(computeFeatures({}, null));

const EM_DASH = String.fromCharCode(0x2014);

/** normalize(s): strip markdown emphasis/heading marks and collapse whitespace, for a quote match. */
function normalize(s) {
  return String(s).replace(/[`*_#]/g, '').replace(/\s+/g, ' ').trim();
}

function githubSlug(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function checkId(rec) {
  const errs = [];
  if (typeof rec.id !== 'string' || !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(rec.id)) {
    errs.push(`id "${rec.id}" must look like <category>.<kebab-case>`);
  }
  if (typeof rec.category !== 'string' || !rec.category) errs.push('category is required');
  else if (typeof rec.id === 'string' && !rec.id.startsWith(`${rec.category}.`)) {
    errs.push(`id "${rec.id}" does not start with its own category "${rec.category}."`);
  }
  return errs;
}

function checkStageAndApplies(rec) {
  const errs = [];
  if (!STAGE_ORDER.includes(rec.stage)) {
    errs.push(`stage "${rec.stage}" is not one of ${STAGE_ORDER.join(', ')}`);
  }
  if (rec.applies !== 'always' && !FEATURE_KEYS.includes(rec.applies)) {
    errs.push(`applies "${rec.applies}" is neither "always" nor a real craft-checklist feature key (${FEATURE_KEYS.join(', ')})`);
  }
  return errs;
}

function checkCheckAndAdapt(rec) {
  const errs = [];
  if (rec.check != null) {
    if (typeof rec.check !== 'string' || !rec.check) errs.push('check must be null or a non-empty finding-code string');
    else if (!codesEmitted().has(rec.check)) errs.push(`check "${rec.check}" names a finding code no gate emits`);
  }
  if (rec.adapt != null && (typeof rec.adapt !== 'string' || !rec.adapt)) errs.push('adapt must be null or a non-empty string');
  return errs;
}

function checkBrief(rec) {
  const errs = [];
  if (typeof rec.brief !== 'string' || !rec.brief.trim()) { errs.push('brief is required'); return errs; }
  if (rec.brief.length > 160) errs.push(`brief is ${rec.brief.length} chars, over the 160 cap`);
  if (rec.brief.includes(EM_DASH)) errs.push('brief contains an em dash');
  return errs;
}

/** checkDoc(rec, root): doc path shape, file existence, anchor existence, and the freshness quote. */
function checkDoc(rec, root) {
  const errs = [];
  if (typeof rec.doc !== 'string' || !/^docs\/[^\s]+\.md(#[a-z0-9-]+)?$/.test(rec.doc)) {
    errs.push(`doc "${rec.doc}" must be "docs/....md" or "docs/....md#anchor"`);
    return errs;
  }
  const [file, anchor] = rec.doc.split('#');
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { errs.push(`doc file ${file} does not exist`); return errs; }
  const text = fs.readFileSync(full, 'utf8');
  const section = sectionText(text, anchor);
  if (anchor && section == null) { errs.push(`doc "${rec.doc}" names an anchor no heading in ${file} slugs to`); return errs; }
  if (typeof rec.brief === 'string' && rec.brief.trim()) {
    const hay = normalize(section ?? text);
    if (!hay.includes(normalize(rec.brief))) errs.push(`brief is not found in ${rec.doc} (stale quote: the doc moved and the record did not)`);
  }
  return errs;
}

/**
 * sectionText(fullText, anchor) -> string | null. No anchor: the whole file. An anchor: the text from
 * that heading up to (not including) the next heading at the same or a shallower level. Returns null
 * when an anchor is given but no heading slugs to it, so the caller can tell "not found" from "empty".
 */
export function sectionText(fullText, anchor) {
  if (!anchor) return fullText;
  const lines = fullText.split('\n');
  let start = -1, level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (m && githubSlug(m[2]) === anchor) { start = i; level = m[1].length; break; }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

/**
 * validateRule(rec, {root}) -> string[] of problems, empty when the record is sound. Each concern
 * (id shape, stage/applies, check/adapt, brief, doc+freshness) lives in its own small checker above,
 * so this is only the list of which checks run, never the logic of any one of them.
 */
export function validateRule(rec, { root = ROOT } = {}) {
  return [
    ...checkId(rec),
    ...checkStageAndApplies(rec),
    ...checkCheckAndAdapt(rec),
    ...checkBrief(rec),
    ...checkDoc(rec, root),
  ];
}

/**
 * loadCraftRules({root}) -> record[]. Reads every docs/CRAFT/rules/<category>.json (an array of
 * records), validates each, and fails loudly (one Error, every problem listed) rather than returning a
 * partial list a caller might not notice is short. A duplicate id, even across two files, fails too:
 * one id is one rule, and a collision means two authors reached for the same name for two different
 * things.
 */
export function loadCraftRules({ root = ROOT } = {}) {
  const dir = path.join(root, 'docs/CRAFT/rules');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  const records = [];
  const seen = new Map();
  const problems = [];
  for (const file of files) {
    const category = file.replace(/\.json$/, '');
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
    catch (err) { problems.push(`${file}: invalid JSON (${err.message})`); continue; }
    if (!Array.isArray(arr)) { problems.push(`${file}: must be a JSON array of records`); continue; }
    for (const rec of arr) {
      if (rec && rec.category !== category) {
        problems.push(`${file}: record "${rec.id}" has category "${rec.category}", the file name says "${category}"`);
      }
      for (const e of validateRule(rec || {}, { root })) problems.push(`${file} ${rec?.id ?? '(no id)'}: ${e}`);
      if (rec && rec.id) {
        if (seen.has(rec.id)) problems.push(`duplicate id "${rec.id}" in ${file} and ${seen.get(rec.id)}`);
        seen.set(rec.id, file);
      }
      records.push(rec);
    }
  }
  if (problems.length) {
    throw new Error(`craft-rules: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  }
  return records;
}

/** briefLine(rec) -> the one line a hook/brief prints. The doc path is the pull handle, never inlined. */
export function briefLine(rec) {
  return `rule ${rec.id}: ${rec.brief} (${rec.doc})`;
}

/**
 * rulesFor({stage, features, categories, cap, maxChars, root}) -> record[]. Matches a record when its
 * stage is this one, its category is in `categories` (when given), and its `applies` is "always" or a
 * truthy feature. Sorted stable with `check: null` (prose-only, the kind nothing else surfaces) first,
 * then capped BOTH by count (default 5) and by a character budget (default 1200: a decider brief
 * should pass 800, see critics.mjs) so a long run of matches cannot flood a hook's output or a
 * teammate's context the way an uncapped list would.
 */
export function rulesFor({ stage, features = {}, categories = null, cap = 5, maxChars = 1200, root = ROOT } = {}) {
  const all = loadCraftRules({ root });
  const matched = all
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.stage === stage
      && (!categories || categories.includes(r.category))
      && (r.applies === 'always' || !!features[r.applies]));
  matched.sort((a, b) => {
    const pa = a.r.check == null ? 0 : 1;
    const pb = b.r.check == null ? 0 : 1;
    return pa !== pb ? pa - pb : a.i - b.i;
  });
  const out = [];
  let chars = 0;
  for (const { r } of matched) {
    if (out.length >= cap) break;
    const len = briefLine(r).length;
    if (out.length > 0 && chars + len > maxChars) break;
    out.push(r);
    chars += len;
  }
  return out;
}
