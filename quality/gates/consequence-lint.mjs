// quality/gates/consequence-lint.mjs · does a finding message state what happens if it is ignored?
//
//   node quality/gates/consequence-lint.mjs           ·   make check GATE=consequence-lint
//   node quality/gates/consequence-lint.mjs --write   ·   accept the current count as the new ceiling
//   node quality/gates/consequence-lint.mjs --list    ·   every vague message found, file:line
//
// WHY THIS EXISTS. HyperFrames' example is the bar: "Found audio file(s) but no <audio> element...
// The rendered video will be silent." Not just what is wrong, but what a person or an agent reading it
// will get if they ship anyway. This repo's own author-facing messages were audited by hand against
// that bar (the 30 rewritten in this pass), and the same three gaps kept recurring: a message that
// names the field but never says what happens on screen or in the file, one that says what is wrong
// but never the one fix, and one where the consequence lives only in a console.log printed beside the
// finding rather than in the finding's own `summary`/`fix`, so a machine reading the JSON record never
// sees it. This gate is the advisory half of that fix: it cannot judge PROSE QUALITY, so it never
// blocks, but it can catch the raw absence of a consequence clue on a NEW message before another 30
// pile up unread.
//
// SAFEGUARDS ADVISE, NEVER BLOCK (AGENTS.md / CLAUDE.md): only schema validity and determinism may
// refuse a build, so this gate never exits non-zero. It is a RATCHET like word-action.mjs and
// code-quality.mjs: a per-file count of vague messages, and the gate fails ONLY the count rising above
// what quality/baselines/consequence-lint-baseline.json already records, which is how "a new vague
// message" is decided without diffing git history (the same file can gain one new message and lose an
// old one in the same commit; counting is what makes that legible, not a diff line).
//
// THE HEURISTIC, and it is one, same disclosure as word-action.mjs's blurb check: this cannot read
// meaning. It flags a message with none of a small set of consequence words (renders, screen, silent,
// blocks, fails, crash, breaks, refuses, freeze, stalls, "so the", reads as, dropped, ignored, discarded)
// ANYWHERE in the call's own arguments (summary + fix + doc together, since some gates print them
// concatenated and some split them). A message that states its consequence in different words than
// this list is a FALSE POSITIVE this gate cannot avoid; one that repeats "must be" with no stated
// effect is exactly what it exists to catch. Only messages at least 40 characters long are graded: a
// one-word code literal or a bare `${e.message}` passthrough is not this gate's question.
//
// SCAN SURFACE: the four domains AGENTS.md and the audit that produced this gate named: core/validate,
// quality/gates (incl. quality/audit.mjs, one level up), and harness/live. Discovered by walking the
// directories, never a hardcoded file list (core/props.js: a hardcoded surface is a map of where the
// code lived the day the gate was written).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = path.join(ROOT, 'quality/baselines/consequence-lint-baseline.json');
const write = process.argv.includes('--write');
const list = process.argv.includes('--list');
const json = process.argv.includes('--json');

export const CONSEQUENCE_RE = /\b(will|would|renders?|render will|so the |, so\b|screen|silent(?:ly)?|blocks?\b|fails?\b|crash|break|refus|stall|freeze|reads? as|dropped|discarded|ignored|nothing (?:else )?(?:will )?(?:shows|says|checks)|the (?:render|film|video|frame)\b)/i;
// Calls whose message is author-facing prose, not a code literal or a variable passthrough: the shared
// emitter's three severities, and the raw `out.push` shape core/validate/*.mjs uses for the same job
// without the emitter (validateData/validateTheme predate harness/lib/findings.mjs).
const CALL_NAMES = ['f.fail', 'f.warn', 'f.note', 'F.fail', 'F.warn', 'F.note', 'out.push', 'errors.push'];

// Extract the full argument list of a call starting at `openParenIdx` (the index of its `(`), by
// counting parens/brackets/braces and skipping over string/template contents so a `)` inside a
// message never ends the scan early. Returns the raw text between the parens, or null if unbalanced
// (a scan started somewhere a human wouldn't call code, e.g. inside a comment matching the same name).
export function extractArgs(src, openParenIdx) {
  let depth = 0, i = openParenIdx;
  let inStr = null; // the quote char currently open, or null
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return src.slice(openParenIdx + 1, i); }
  }
  return null;
}

export function findCalls(src, file) {
  const hits = [];
  for (const name of CALL_NAMES) {
    let idx = 0;
    while (true) {
      const at = src.indexOf(`${name}(`, idx);
      if (at === -1) break;
      idx = at + name.length;
      const openParen = at + name.length;
      const args = extractArgs(src, openParen);
      if (args == null) continue;
      // A literal only: skip a call whose argument is entirely a bare identifier or `${expr}` with no
      // surrounding prose, e.g. `out.push(sourceConflict)`. Requires at least 20 literal (non-`${…}`)
      // characters, which a bare passthrough never has.
      const literalChars = args.replace(/\$\{[^}]*\}/g, '').replace(/[`'",]/g, '').trim();
      if (literalChars.length < 40) continue;
      const line = src.slice(0, at).split('\n').length;
      hits.push({ file, line, text: args });
    }
  }
  return hits;
}

const DIRS = ['core/validate', 'quality/gates', 'harness/live'];

// Walk the scan surface and return every vague message found: { file, line, snippet }[]. Exported so a
// test can call it directly rather than shelling out, the same shape darkVocabularySummary() gives
// tests/gates/coverage.test.mjs.
export function scan() {
  const files = [];
  for (const dir of DIRS) {
    const abs = path.join(ROOT, dir);
    let entries; try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isFile() && (e.name.endsWith('.mjs') || e.name.endsWith('.js')) && !/\.test\.m?js$/.test(e.name))
        files.push(path.join(dir, e.name));
    }
  }
  files.push('quality/audit.mjs'); // named explicitly in the audit this gate follows from, one level up

  const vague = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (rel.endsWith('consequence-lint.mjs')) continue; // this file's own heuristic text is not a finding
    let src; try { src = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    for (const hit of findCalls(src, rel)) {
      if (!CONSEQUENCE_RE.test(hit.text)) vague.push({ file: hit.file, line: hit.line, snippet: hit.text.replace(/\s+/g, ' ').trim().slice(0, 140) });
    }
  }
  return { files, vague };
}

const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { files, vague } = scan();

  if (list) {
    for (const v of vague) console.log(`${v.file}:${v.line}\t${v.snippet}`);
    process.exit(0);
  }

  const byFile = {};
  for (const v of vague) byFile[v.file] = (byFile[v.file] || 0) + 1;

  if (write) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, `${JSON.stringify(byFile, null, 1)}\n`);
    console.log(`✓ consequence-lint baseline stamped: ${vague.length} vague message(s) across ${Object.keys(byFile).length} file(s)`);
    process.exit(0);
  }

  const prior = (() => { try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { return {}; } })();
  const risen = Object.entries(byFile).filter(([f, n]) => n > (prior[f] || 0));

  if (json) {
    console.log(JSON.stringify({ total: vague.length, byFile, risen: Object.fromEntries(risen) }, null, 2));
    process.exit(0);
  }

  console.log(`\n  consequence-lint · ${files.length} file(s) scanned across ${DIRS.join(', ')} + quality/audit.mjs`);
  console.log(`  ${vague.length} message(s) with no consequence clue, ${Object.keys(byFile).length} file(s)`);
  if (risen.length) {
    console.log(`\n  ~ ${risen.length} file(s) gained a new vague message since the ratchet was last stamped:`);
    for (const [f, n] of risen) console.log(`      ${f}: ${n} now, was ${prior[f] || 0}`);
    console.log(`\n  This is advice, not a block (safeguards advise, never block: AGENTS.md). Name the`);
    console.log(`  consequence in the new message ("...the render will X" / "...silently drops Y"), or if`);
    console.log(`  the count is right as it stands: node quality/gates/consequence-lint.mjs --write`);
  } else {
    console.log(`\n  ✓ no file rose above its recorded ceiling.`);
  }
  // ADVISORY ONLY, ALWAYS. Never non-zero: the rule this file's own header states.
  process.exit(0);
}
