export const RULE_LENGTH_LIMIT = 500;

export const RULE_LENGTH_DOC = 'engine-doctrine/CRAFT/WRITING-FOR-AGENTS.md';

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
