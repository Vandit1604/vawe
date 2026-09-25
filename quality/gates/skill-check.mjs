// quality/gates/skill-check.mjs: does every skills/*/SKILL.md match Anthropic's published
// skill-authoring contract, the one an agent's own discovery pass depends on?
//
//   node quality/gates/skill-check.mjs      ·   make skill-check
//
// WHY THIS EXISTS. `skill-reach.mjs` checks that something POINTS at a skill; `skill-stages.mjs`
// (via `stage.mjs`) checks that a `stage:` line is readable at all. Neither checked whether the
// frontmatter a skill ships is the shape Claude Code's own retrieval reads. `description` is the
// RETRIEVAL field: it is injected into the system prompt for every skill at startup, and Anthropic's
// own best-practices doc says it must be third person ("can cause discovery problems" otherwise) and
// under 1,024 characters, `name` under 64 and `^[a-z0-9-]+$`, the body under ~500 lines and ~5,000
// tokens, and frontmatter opening at byte 0 (`skill-stages.mjs:23` parses it with a regex anchored
// there; a file that does not open with `---` on line 1 is silently invisible to `make stage`, not an
// error, which is the worse failure). Six skills shipped `description`s in second person before this
// gate existed (`vawe-continuous-action`, `vawe-docs`, `vawe-effects`, `vawe-launch`,
// `vawe-name-the-effect`, `vawe-review-loop`), found by hand because nothing checked for it.
//
// SOURCE: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
//
// A `stage:` value is checked against `STAGE_ORDER` from `quality/gates/stage.mjs`, never a second
// copy of that list: the same discipline `skill-stages.mjs` already keeps for the same reason
// (`harness/lib/skill-stages.mjs`'s own header explains why a hand-kept second table drifts).
//
// EXEMPTIONS, by name, with a reason each, same shape as `blocks/index.mjs`'s `NOT_A_BLOCK`: a skill
// reaches this list by being read, not by looking hard to fix.
//
// HARD, NOT A RATCHET. Every rule here is a rule this repo's own corpus passes clean once the six
// descriptions above are fixed. A gate that starts as a ratchet on a fixable defect just delays the
// fix; this one is a wall from day one, and a future violation is refused, not counted.
//
// Pure: reads skill files. No render, no network.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { STAGE_ORDER } from './stage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// NAME_MAX/DESC_MAX/BODY_LINES_MAX/BODY_TOKENS_MAX: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
// (see the header). TOKENS_PER_WORD is a documented rule of thumb from the same page ("estimate words
// x 1.33"), a unit conversion for this gate's own estimate, not a second quality bar.
const NAME_MAX = 64;
const NAME_RE = /^[a-z0-9-]+$/;
const BANNED_NAME_WORDS = /claude|anthropic/i;
const DESC_MAX = 1024;
const BODY_LINES_MAX = 500;
const BODY_TOKENS_MAX = 5000;
const TOKENS_PER_WORD = 1.33;

// A trigger phrase. Every passing description in this repo states its trigger as a temporal or
// conditional clause ("Use when…", "Load while…", "Use after…", "Load once…"); this is loose on
// purpose, to catch a description with NO stated trigger at all, not to police its exact wording.
const TRIGGER_RE = /\b(when|whenever|while|before|after|once)\b/i;

// First/second person: a description written to an agent in "you"/"your" or a first-person voice.
// Word-bounded so it does not fire on "UI", "guide", or a brand name that happens to contain "i".
const PERSON_RE = /\b(you|your|yours|i|we|our|ours|us|my|mine)\b/i;

// A real XML/HTML tag pair, not this repo's own `<placeholder>` convention (`<topic>`, `<file>`,
// `<n>`), which is single-word, never closed and never carries an attribute. Only a closing tag or an
// attributed opening tag is unambiguous.
const XML_TAG_RE = /<\/[a-zA-Z][^>]*>|<[a-zA-Z][a-zA-Z0-9_-]*\s+[a-zA-Z-][^>]*=/;

// impeccable: reasoned in the same shape `blocks/index.mjs`'s `NOT_A_BLOCK` uses. A vendored
// third-party skill; a fix here is reverted by the next upstream sync, and `doc-map.mjs`'s own
// EXCLUDE list already carries the same reason for its reference pages.
const EXEMPT = {
  impeccable: 'vendored third-party skill (npm package); an edit here is reverted by the next upstream sync, same grounds doc-map.mjs:49 excludes its reference pages on',
};

function frontmatterBlock(text) {
  if (!text.startsWith('---\n')) return null; // not at byte 0: invisible to skill-stages.mjs too
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  return text.slice(4, end);
}

function field(fm, key) {
  const m = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm').exec(fm);
  if (!m) return null;
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

/** Every skills/<dir>/SKILL.md, discovered from the tree, same as skill-reach.mjs. */
function skills(root) {
  if (fs.existsSync(path.join(root, '.git'))) {
    const ls = cp.execSync("git ls-files 'skills/*/SKILL.md'", { cwd: root }).toString().trim();
    return (ls ? ls.split('\n') : []).map((file) => ({ dir: file.split('/')[1], file }));
  }
  const dirs = fs.existsSync(path.join(root, 'skills')) ? fs.readdirSync(path.join(root, 'skills')) : [];
  return dirs
    .filter((dir) => fs.existsSync(path.join(root, 'skills', dir, 'SKILL.md')))
    .map((dir) => ({ dir, file: `skills/${dir}/SKILL.md` }));
}

/** run({root}) -> {total, exempt, checked: [{dir, file, problems}]}. */
export function run({ root = ROOT } = {}) {
  const all = skills(root);
  const checked = [];
  for (const { dir, file } of all) {
    if (EXEMPT[dir]) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const problems = [];

    const fm = frontmatterBlock(text);
    if (!fm) {
      problems.push('frontmatter does not open at byte 0 (must start with "---" on line 1): make stage cannot see this skill\'s stage line');
      checked.push({ dir, file, problems });
      continue;
    }

    const name = field(fm, 'name');
    if (!name) problems.push('no `name:` in frontmatter');
    else {
      if (name.length > NAME_MAX) problems.push(`name is ${name.length} chars, over the ${NAME_MAX} limit`);
      if (!NAME_RE.test(name)) problems.push(`name "${name}" does not match ^[a-z0-9-]+$`);
      if (BANNED_NAME_WORDS.test(name)) problems.push(`name "${name}" names claude/anthropic`);
      if (name !== dir) problems.push(`name "${name}" does not match its directory "${dir}"`);
    }

    const description = field(fm, 'description');
    if (!description) problems.push('no `description:` in frontmatter, or it is empty');
    else {
      if (description.length > DESC_MAX) problems.push(`description is ${description.length} chars, over the ${DESC_MAX} limit`);
      if (XML_TAG_RE.test(description)) problems.push('description carries an XML/HTML tag');
      if (!TRIGGER_RE.test(description)) problems.push('description carries no explicit trigger ("Use when…" / "Load when…" or a sibling)');
      if (PERSON_RE.test(description)) problems.push('description is first/second person ("you"/"your"/"I"/"we"): retrieval text must be third person');
    }

    // NO GENERATED-BODY CARVE-OUT. There was one, for `vawe-docs`, whose body a generator wrote from a
    // corpus that only grows: an author could not trim it, so the size contract could not apply. That
    // skill is retired (`make docs` answers the same question), and every remaining body is
    // hand-authored, so every body is held to the contract. A future generated skill is the wrong shape
    // for a skill, and should be a lookup for the same reason that one was.
    const body = text.slice(text.indexOf('---', 3) + 3).replace(/^\n/, '');
    const lines = body.split('\n').length;
    if (lines > BODY_LINES_MAX) problems.push(`body is ${lines} lines, over the ${BODY_LINES_MAX} limit`);
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    const estTokens = Math.round(words * TOKENS_PER_WORD);
    if (estTokens > BODY_TOKENS_MAX) problems.push(`body is an estimated ${estTokens} tokens (${words} words), over the ${BODY_TOKENS_MAX} limit`);

    const stage = field(fm, 'stage');
    if (stage && !STAGE_ORDER.includes(stage)) problems.push(`stage: "${stage}" is not one of STAGE_ORDER (${STAGE_ORDER.join(', ')})`);

    checked.push({ dir, file, problems });
  }
  const failing = checked.filter((c) => c.problems.length);
  return { total: all.length, exempt: Object.keys(EXEMPT).length, checked, failing };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { total, exempt, failing } = run();
  const f = gateFindings();
  console.log(`── skill check · ${total} skill(s), ${exempt} exempt`);
  if (!failing.length) {
    console.log('\n✓ every non-exempt skill matches the frontmatter and size contract');
  }
  for (const c of failing) {
    for (const p of c.problems) {
      console.log(`   ✗ ${c.file}  ${p}`);
      f.fail('skill-contract', p, { at: c.file });
    }
  }
  if (failing.length) {
    console.log(`\n✗ ${failing.length} skill(s) fail the frontmatter/size contract engine-doctrine/CRAFT/WRITING-FOR-AGENTS.md sets.`);
  }
  f.emit();
  process.exit(failing.length ? 1 : 0);
}
