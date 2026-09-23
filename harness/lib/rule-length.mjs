// harness/lib/rule-length.mjs: ONE owner for "how long is this rule", read by both
// harness/live/craft-live.mjs (the keystroke nudge) and quality/gates/rule-length.mjs (the ratchet).
// Two callers, one measurement, so the number a hook shows at save time can never drift from the
// number the gate counts at commit time.
//
// THE LIMIT IS A FORMATTING CONVENTION, NOT A QUALITY THRESHOLD. It does not decide whether a rule is
// TRUE, only whether it is likely to survive a truncating filter unread past its first screen
// (engine-doctrine/CRAFT/WRITING-FOR-AGENTS.md, pattern 6). It is exempt from the sourceless-constant
// worklist `node quality/gates/threshold-provenance.mjs --list` walks: nothing here decides a film's
// pass or fail, so nothing here needs a perception or craft citation the way a film gate's threshold
// does.
//
// 500 characters is roughly three 30-word sentences at typical English word length (~5.5 chars +
// space), which is pattern 2's own "one to three sentences, then stop". Not a measured perception
// floor; a round number chosen to match the prose rule it enforces.
export const RULE_LENGTH_LIMIT = 500;

// The doc this repo points an author at when a rule runs long.
export const RULE_LENGTH_DOC = 'engine-doctrine/CRAFT/WRITING-FOR-AGENTS.md';

// Agent-facing prose surfaces: the doctrine an agent reads to decide what to do, not reference tables,
// generated indexes, or per-film artifacts. `engine-doctrine/CRAFT/*.md` (not its subfolders) covers
// the craft doctrine; `AGENTS.md` and `skills/*/SKILL.md` are named directly.
export function isAgentDoc(rel) {
  if (rel === 'AGENTS.md') return true;
  if (/^skills\/[^/]+\/SKILL\.md$/.test(rel)) return true;
  if (/^engine-doctrine\/CRAFT\/[^/]+\.md$/.test(rel)) return true;
  return false;
}

/**
 * Split a markdown body into the units this convention treats as one "rule": a prose paragraph, or one
 * top-level list item (its continuation lines included, its nested sub-bullets excluded, since a
 * sub-bullet is already a smaller unit inside the parent's rule). Code fences and table rows are
 * skipped: they are not prose a filter reads as a rule.
 */
export function ruleUnits(body) {
  const lines = body.split('\n');
  const units = [];
  let cur = null;
  let inFence = false;
  const flush = () => { if (cur && cur.trim()) units.push(cur.trim()); cur = null; };

  for (const line of lines) {
    if (/^\s*```/.test(line)) { inFence = !inFence; flush(); continue; }
    if (inFence) continue;
    if (/^\s*$/.test(line)) { flush(); continue; }
    if (/^\s*\|/.test(line) || /^#{1,6}\s/.test(line)) { flush(); continue; }

    const topBullet = /^(-|\d+\.)\s+/.test(line);
    const nestedBullet = /^\s+(-|\d+\.)\s+/.test(line);
    if (topBullet) { flush(); cur = line.replace(/^(-|\d+\.)\s+/, ''); continue; }
    if (nestedBullet) { flush(); continue; } // its own, smaller unit; not counted against the parent

    cur = cur ? `${cur} ${line.trim()}` : line.trim();
  }
  flush();
  return units;
}

/** The longest rule unit in a doc's body, and its length. `{ length, excerpt }`, or null if empty. */
export function longestRule(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const units = ruleUnits(body);
  let best = null;
  for (const u of units) {
    if (!best || u.length > best.length) best = { length: u.length, excerpt: u.slice(0, 100) };
  }
  return best;
}
