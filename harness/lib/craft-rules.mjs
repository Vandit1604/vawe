import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE_ORDER } from '../../quality/gates/stage.mjs';
import { computeFeatures } from '../../quality/gates/craft-checklist.mjs';
import { codesEmitted } from './finding-codes.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

/**
 * checkDoc({doc, brief}, root): doc path shape, file existence, anchor existence, and the freshness
 * quote. Exported so anything else that carries a `{ doc, brief }` pointer (a registry entry's
 * doctrine route, `core/registry/registry.js`'s `docs` option) reuses this exact check rather than a
 * second one: one owner for "is this doc pointer still true", whatever record it hangs off.
 */
export function checkDoc(rec, root) {
  const errs = [];
  if (typeof rec.doc !== 'string' || !/^engine-doctrine\/[^\s]+\.md(#[a-z0-9-]+)?$/.test(rec.doc)) {
    errs.push(`doc "${rec.doc}" must be "engine-doctrine/....md" or "engine-doctrine/....md#anchor"`);
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
 * loadCraftRules({root}) -> record[]. Reads every engine-doctrine/CRAFT/rules/<category>.json (an array of
 * records), validates each, and fails loudly (one Error, every problem listed) rather than returning a
 * partial list a caller might not notice is short. A duplicate id, even across two files, fails too:
 * one id is one rule, and a collision means two authors reached for the same name for two different
 * things.
 */
export function loadCraftRules({ root = ROOT } = {}) {
  const dir = path.join(root, 'engine-doctrine/CRAFT/rules');
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

export const STAGE_CATEGORY_ORDER = {
  direct: ['motion', 'transitions', 'sound'],
  design: ['layout', 'imagery', 'typography', 'colour', 'content'],
  plan: ['direction', 'content'],
};

/**
 * rulesFor({stage, features, categories, cap, maxChars, capPerCategory, maxCharsPerCategory, root})
 * -> record[]. Matches a record when its stage is this one, its category is in `categories` (when
 * given), and its `applies` is "always" or a truthy feature. Sorted stable with `check: null`
 * (prose-only, the kind nothing else surfaces) first, then capped BOTH by count (default 5) and by a
 * character budget (default 1200: a decider brief should pass 800, see critics.mjs) so a long run of
 * matches cannot flood a hook's output or a teammate's context the way an uncapped list would.
 *
 * GROUPED MODE: passing `categories` as an ORDERED array together with `capPerCategory` switches to a
 * per-category cap/budget instead of one global cap/budget, walking `categories` in the order given so
 * one busy category (motion) can never crowd out the next (transitions, sound) the way a flat global
 * cap would. `categories` alone (no `capPerCategory`) still just scopes the flat filter, unchanged.
 *
 * `pin`: an array of rule ids that must sort first (in the order given) among the matched records,
 * before the default check-then-authored-order ranking, so an owner's must-show rules survive the cap
 * and char budget whatever their position in the source JSON. Pinning an id that does not match
 * (wrong stage/category/features) is simply a no-op, never an error.
 *
 * `withReceipt: true` changes the return to `{ rules, dropped }`, where `dropped` is every candidate
 * that matched this stage/category but was not shown, each tagged with why: `feature-not-matched` (the
 * record's `applies` feature was false for this film), `over-cap` (matched, but its category/global cap
 * was already full) or `over-char-budget` (matched, under the cap, but the character budget was already
 * spent). This is the answer to "from all things available, why did it reach for THIS one": the shown
 * list alone cannot say what else existed. See harness/lib/runlog.mjs's `knowledge` field, the one place
 * a caller records this.
 */
function byCheckThenOrder(pin) {
  const pinIndex = new Map((pin || []).map((id, i) => [id, i]));
  return (a, b) => {
    const pa = pinIndex.has(a.r.id) ? -1 : (a.r.check == null ? 0 : 1);
    const pb = pinIndex.has(b.r.id) ? -1 : (b.r.check == null ? 0 : 1);
    if (pa !== pb) return pa - pb;
    if (pa === -1) return pinIndex.get(a.r.id) - pinIndex.get(b.r.id);
    return a.i - b.i;
  };
}

/**
 * capListReceipt(indexed, cap, maxChars, pin) -> { kept: record[], dropped: {id,category,reason}[] }.
 * Stable-sorted then walked once, capped both ways, exactly as the old capList did; the only change is
 * that the walk now names, for everything it does NOT keep, which of the two caps stopped it. Once a
 * cap is hit the ORIGINAL code `break`s rather than skipping ahead (a later, shorter rule might have
 * fit under the char budget, but determinism outranks a fuller list), so every remaining candidate is
 * tagged with the same reason that ended the walk.
 */
function capListReceipt(indexed, cap, maxChars, pin) {
  const sorted = [...indexed].sort(byCheckThenOrder(pin));
  const kept = [];
  const dropped = [];
  let chars = 0;
  for (let idx = 0; idx < sorted.length; idx++) {
    const { r } = sorted[idx];
    if (kept.length >= cap) {
      for (let j = idx; j < sorted.length; j++) {
        dropped.push({ id: sorted[j].r.id, category: sorted[j].r.category, reason: 'over-cap' });
      }
      break;
    }
    const len = briefLine(r).length;
    if (kept.length > 0 && maxChars != null && chars + len > maxChars) {
      for (let j = idx; j < sorted.length; j++) {
        dropped.push({ id: sorted[j].r.id, category: sorted[j].r.category, reason: 'over-char-budget' });
      }
      break;
    }
    kept.push(r);
    chars += len;
  }
  return { kept, dropped };
}

export function rulesFor({
  stage, features = {}, categories = null, cap = 5, maxChars = 1200,
  capPerCategory = null, maxCharsPerCategory = null, pin = null, root = ROOT,
  withReceipt = false,
} = {}) {
  const all = loadCraftRules({ root });
  const candidates = all.filter((r) => r.stage === stage && (!categories || categories.includes(r.category)));
  const dropped = [];
  const matched = [];
  candidates.forEach((r, i) => {
    if (r.applies === 'always' || !!features[r.applies]) matched.push({ r, i });
    else dropped.push({ id: r.id, category: r.category, reason: 'feature-not-matched' });
  });

  let shown;
  if (categories && capPerCategory != null) {
    shown = [];
    for (const cat of categories) {
      const group = matched.filter(({ r }) => r.category === cat);
      const { kept, dropped: d } = capListReceipt(group, capPerCategory, maxCharsPerCategory, pin);
      shown.push(...kept);
      dropped.push(...d);
    }
  } else {
    const { kept, dropped: d } = capListReceipt(matched, cap, maxChars, pin);
    shown = kept;
    dropped.push(...d);
  }
  return withReceipt ? { rules: shown, dropped } : shown;
}
