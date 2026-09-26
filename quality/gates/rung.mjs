// quality/gates/rung.mjs · which rules are only PROSE, and which ones something actually enforces?
//
//   node quality/gates/rung.mjs            ·   make check GATE=rung
//   node quality/gates/rung.mjs --list     ·   the [eye] worklist, the rules nothing but the sentence holds
//   node quality/gates/rung.mjs --stamp    ·   record today's [eye] count as the new ceiling
//
// WHY THIS EXISTS. CLAUDE.md states, in capital letters, with its own measurement inside the sentence,
// that a film's background must move. 82% of films paint one window. A recorded ablation
// (engine-doctrine/RESEARCH/PROMPT-EVAL.md) deleted that rule and the window count did not move by one. So prose
// is the most expensive way this repo changes behaviour and the least reliable, and until now nothing
// anywhere recorded WHICH rules are only prose. A reader of CLAUDE.md could not tell a rule the engine
// makes true from a rule that is a wish, and both are written in the same voice at the same volume.
//
// THE FIVE RUNGS, weakest last. engine-doctrine/CRAFT/DIRECTION.md already ran a two-value version of this in its
// twelve-principles table ([eye] and [gated]); this is that idea generalised, and the grammar and the
// voice are borrowed from there rather than imported from anywhere else.
//
//   [built]  the engine makes it true: a default, a scaffold, or the wrong thing is unrepresentable
//   [gated]  a gate refuses it
//   [live]   something says it at the moment of writing (a hook, or an error at the write site)
//   [ref]    a command answers it on demand
//   [eye]    nothing but the sentence
//
// THE LOAD-BEARING RULE, and the whole thing is decoration without it: A TAG THAT CLAIMS A MECHANISM
// MUST NAME IT, AND THE NAMED THING MUST EXIST. This repo's most-logged failure shape is a declaration
// that claims an owner and gets none: a field written and never read, a gate named in a doc and deleted
// a year ago, a waiver keyword that makes a gate stop talking. A rung tag is exactly that shape of
// claim, so it is checked the same way, and an unverifiable tag is a build failure rather than a nice
// idea somebody had once.
//
//   ## Waivers, legacy, and the difference  `[gated: quality/gates/author-check.mjs]`
//   ## REACH FOR HTML FIRST                 `[ref: make arsenal]`
//   ## THE BACKGROUND MUST MOVE             `[eye]`
//
// WHAT "EXISTS" MEANS, per rung, and the strength is deliberately uneven because the evidence is:
//   [ref: make <t>]        the Makefile defines <t>. Read off the Makefile, never a list.
//   [ref: make check GATE=<g>]  <g> is a key in harness/lib/check-gate.mjs's GATES table.
//   [gated: <script>]      the script exists AND emits at least one finding code. A gate that emits
//                          nothing cannot refuse anything, so naming it is a false tag.
//   [gated: <script>#code] stronger, and preferred: that script emits THAT code.
//   [live: <path>]         the hook or write-site file exists.
//   [built: <path>:<line>] the file exists and is that long. This is the hardest rung to verify and the
//                          most valuable to get right, and a line number is as far as a machine can go:
//                          nothing here can read the line and agree it makes the rule true. So the check
//                          is a floor, the file:line is printed for a person to read, and that limit is
//                          stated rather than dressed up.
//
// [eye] IS THE HONEST DEFAULT. An optimistic tag is worse than no tag, because it retires a problem on
// paper: a rule marked [gated] is a rule nobody goes looking for a mechanism for. When the mechanism you
// would name does not settle the question the rule asks, the tag is [eye] and the mismatch is the
// finding. The worked example, from the pass that wrote this file: "BLACK MEANS #000000" says a
// pitch-black ground has to be hand-written, because every dark preset carries a tint. `make arsenal
// "pure black background"` confidently answers `liquid`, a moving fold pattern, which is not a
// pitch-black ground. A reference that answers the neighbouring question wrongly is more dangerous than
// one that says nothing, so that section is [eye].
//
// THE RATCHET. The [eye] count MAY FALL and MAY NEVER RISE. Zero is not the goal and never will be:
// most of what makes a film good is not decidable from the JSON, and a rule that demanded a mechanism
// for taste would be a rule people turn off. What a ratchet says is the only true rule here, which is
// the DIRECTION: prose is the fallback, and the number of rules held up by prose alone goes down. Lower
// it deliberately with --stamp, the same argument as quality/baselines/arsenal-ratchet.json and `make legacy STAMP=1`.
//
// Pure: reads markdown, the Makefile and the gate sources. No render, no network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { codesEmitted } from '../../harness/lib/finding-codes.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { GATES as CHECK_GATES } from '../../harness/lib/check-gate.mjs';

const GATES = new Set(Object.keys(CHECK_GATES));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RATCHET = path.join(ROOT, 'quality/baselines/rung-ratchet.json');

export const RUNGS = ['built', 'gated', 'live', 'ref', 'eye'];

// The files whose SECTIONS carry a rung. AGENTS.md is the canonical doctrine every session loads in full
// (CLAUDE.md is a shim that imports it), so it is the file where an unenforced rule costs the most and the
// only one whose sections MUST all be tagged. The CRAFT guides are checked when they carry a tag and never
// required to, because a rung is a property of an INSTRUCTION and half of CRAFT is reference: engine-doctrine/EFFECTS.md
// and the codemaps describe what exists rather than telling anyone to do anything, and tagging those would
// be tagging a table.
const REQUIRED = 'AGENTS.md';
const SCANNED = () => [REQUIRED, ...fs.readdirSync(path.join(ROOT, 'engine-doctrine/CRAFT'))
  .filter((f) => f.endsWith('.md')).sort().map((f) => `engine-doctrine/CRAFT/${f}`)];

/** Every target the Makefile defines. Read off the Makefile, the same way doc-refs does it. */
function makeTargets() {
  const mk = fs.readFileSync(path.join(ROOT, 'Makefile'), 'utf8');
  const out = new Set();
  for (const line of mk.split('\n')) {
    const m = /^([A-Za-z0-9_][A-Za-z0-9_.-]*)\s*:(?!=)/.exec(line);
    if (m) out.add(m[1]);
    const phony = /^\.PHONY\s*:(.*)$/.exec(line);
    if (phony) for (const t of phony[1].trim().split(/\s+/)) if (t) out.add(t);
  }
  out.delete('.PHONY');
  return out;
}

/**
 * Does `script` emit `code`?
 *
 * harness/lib/finding-codes.mjs is the owner of that fact and is used first, because it is DERIVED and
 * a hand-kept map would rot the first time a rule moved file. But it is deliberately precision-first:
 * it matches four emission shapes, and `critique.mjs` uses a fifth (a local `F('warn', 'code', …)`
 * helper), so `scattered-beat`, `unbacked-claim` and `false-claim` are real codes it does not see. A
 * gate that read only that map would call three of DIRECTION.md's honest tags false, which is a gate
 * arguing with correct prose, and that is the fastest way to teach a reader to skip it.
 *
 * So the fallback is the literal: the code, quoted, in that file's own source. Weaker than the derived
 * map and stated as such, but it still cannot be satisfied by a code nobody wrote.
 */
function emits(script, code) {
  const files = codesEmitted().get(code);
  if (files && files.has(script)) return 'derived';
  const abs = path.join(ROOT, script);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8').includes(`'${code}'`) ? 'quoted' : null;
}

/** Every finding code a script emits, by the derived map alone. */
function anyCodeFrom(script) {
  for (const [code, files] of codesEmitted()) if (files.has(script)) return code;
  return null;
}

// A tag is the LAST thing on a heading line, in a code span, so it reads as a label on the section and
// never as part of the sentence. `[rung]` or `[rung: what it names]`.
//
// THE RUNG WORDS ARE IN THE PATTERN, and that is not tidiness. A looser `[a-z]+` read
// engine-doctrine/CRAFT/VOCABULARY.md's `## Feel `[ease]`` as a tag with a rung called `ease` and reported it: a
// heading may legitimately END in a code span that is part of its own subject. Matching the five words
// means a heading is tagged or it is not, and a misspelt rung reads as UNTAGGED, which is the safe
// direction: CLAUDE.md still fails on it, and no other doc is accused of a tag it never wrote.
const TAG = new RegExp('`\\[(' + RUNGS.join('|') + ')(?::\\s*([^\\]`]+?))?\\]`\\s*$');

/** Parse one markdown file into its tagged and untagged sections. */
function sectionsOf(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const out = [];
  let fenced = false;
  src.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const h = /^(#{2,3})\s+(.*\S)\s*$/.exec(line);
    if (!h) return;
    const m = TAG.exec(h[2]);
    out.push({
      file: rel, line: i + 1, depth: h[1].length,
      title: (m ? h[2].slice(0, m.index) : h[2]).trim(),
      rung: m ? m[1] : null, names: m && m[2] ? m[2].trim() : null,
    });
  });
  return out;
}

/** Verify one tag. Returns null when it holds, or the reason it does not. */
function verify(s, targets) {
  const { rung, names } = s;
  if (!RUNGS.includes(rung)) return `\`${rung}\` is not a rung. The five are: ${RUNGS.join(' · ')}`;
  if (rung === 'eye') {
    if (names) return '[eye] names a mechanism. [eye] means there is none; name it and use its rung';
    return null;
  }
  if (!names) return `[${rung}] names nothing. A tag that claims a mechanism must NAME it, or it is decoration`;

  if (rung === 'ref') {
    const gate = /^make\s+check\s+GATE=([a-z][a-z0-9-]*)$/.exec(names);
    if (gate) return GATES.has(gate[1]) ? null : `no such gate \`GATE=${gate[1]}\` (harness/lib/check-gate.mjs)`;
    const t = /^make\s+([a-z][a-z0-9-]*)$/.exec(names);
    if (!t) return `[ref] takes a make target ("make arsenal") or a gate ("make check GATE=rung"), not "${names}"`;
    return targets.has(t[1]) ? null : `no Makefile target \`${t[1]}\``;
  }
  if (rung === 'gated') {
    const [script, code] = names.split('#');
    if (!fs.existsSync(path.join(ROOT, script))) return `no such gate: ${script}`;
    if (code) {
      return emits(script, code) ? null
        : `${script} does not emit \`${code}\`. A gate named for a rule it never fires on is a false tag`;
    }
    return anyCodeFrom(script) ? null
      : `${script} emits no finding code at all, so it cannot refuse anything. That is a false tag`;
  }
  if (rung === 'live') {
    return fs.existsSync(path.join(ROOT, names)) ? null : `no such write site or hook: ${names}`;
  }
  // built
  const m = /^(.+?):(\d+)$/.exec(names);
  if (!m) return `[built] needs a file:line naming where the engine makes it true, not "${names}"`;
  const abs = path.join(ROOT, m[1]);
  if (!fs.existsSync(abs)) return `no such file: ${m[1]}`;
  const lines = fs.readFileSync(abs, 'utf8').split('\n').length;
  return +m[2] <= lines ? null : `${m[1]} has ${lines} lines, so :${m[2]} names nothing`;
}

export function run() {
  const targets = makeTargets();
  const sections = SCANNED().flatMap(sectionsOf);
  const tagged = sections.filter((s) => s.rung);
  const bad = [];
  for (const s of tagged) {
    const why = verify(s, targets);
    if (why) bad.push({ ...s, why });
  }
  const untagged = sections.filter((s) => !s.rung && s.file === REQUIRED && s.depth === 2);
  const dist = Object.fromEntries(RUNGS.map((r) => [r, tagged.filter((s) => s.rung === r).length]));
  return { sections, tagged, untagged, bad, dist, eye: dist.eye };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = run();
  const list = process.argv.includes('--list');
  // The printed line is rendered FROM the record (engine-doctrine/MISTAKES.md #401): each record's `summary`
  // already carries the multi-line advice a human reads, so the custom renderer prints it verbatim.
  const f = gateFindings({ line: (rec) => rec.summary });

  if (list) {
    console.log(`── the [eye] worklist · ${r.eye} rule(s) held up by nothing but the sentence\n`);
    for (const s of r.tagged.filter((s) => s.rung === 'eye')) console.log(`   ${s.file}:${s.line}  ${s.title}`);
    console.log('\n  Each of these is a rule an author can read, agree with, and not follow, with nothing');
    console.log('  anywhere noticing. Moving one up a rung is worth more than writing another paragraph.\n');
    process.exit(0);
  }

  console.log(`── rungs · ${r.tagged.length} tagged section(s) across ${SCANNED().length} doc(s)\n`);
  const width = Math.max(...RUNGS.map((x) => r.dist[x])).toString().length;
  const BLURB = {
    built: 'the engine makes it true',
    gated: 'a gate refuses it',
    live: 'something says it while you write',
    ref: 'a command answers it on demand',
    eye: 'nothing but the sentence',
  };
  for (const g of RUNGS) console.log(`   [${g}]`.padEnd(10) + `${String(r.dist[g]).padStart(width)}  ${BLURB[g]}`);
  console.log(`\n   the [eye] list: node quality/gates/rung.mjs --list`);

  for (const s of r.bad) {
    f.fail('bad-rung-tag',
      `${s.file}:${s.line}  \`[${s.rung}${s.names ? `: ${s.names}` : ''}]\`  ${s.title}\n      ${s.why}`,
      { at: `${s.file}:${s.line}` });
  }
  for (const s of r.untagged) {
    f.fail('untagged-section',
      `${s.file}:${s.line}  untagged: ${s.title}\n` +
      '      Every section of CLAUDE.md carries a rung. If nothing enforces it, that is `[eye]`, ' +
      'and saying so is the point.',
      { at: `${s.file}:${s.line}` });
  }
  if (r.bad.length || r.untagged.length) {
    console.error();
    f.emit();
    console.error(`\n  ${r.bad.length + r.untagged.length} tag(s) claim an owner and do not have one.`);
    console.error('  A tag nobody can verify is decoration, and decoration retires a problem on paper.\n');
    process.exit(1);
  }
  console.log('\n  ✓ every tag that claims a mechanism names one that exists');

  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  if (process.argv.includes('--stamp')) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    fs.writeFileSync(RATCHET, `${JSON.stringify({ eye: r.eye }, null, 1)}\n`);
    console.log(`  ✓ ratchet stamped at ${r.eye} [eye] rule(s)${prior ? `, ${r.eye <= prior.eye ? 'down' : 'UP'} from ${prior.eye}` : ''}\n`);
    f.emit();
  } else if (prior && r.eye > prior.eye) {
    f.fail('rung-ratchet',
      `${r.eye} rule(s) are held up by prose alone, up from ${prior.eye}. ` +
      'A new rule with no mechanism is a new rule nobody will follow, and the ablation in ' +
      'engine-doctrine/RESEARCH/PROMPT-EVAL.md is what that costs: deleting the loudest prose rule in ' +
      'this repo changed the behaviour it governs by zero. ' +
      'Give it a default, a gate, a hook or a command. If it genuinely cannot have one, ' +
      'raise the bar on purpose: node quality/gates/rung.mjs --stamp');
    console.error();
    f.emit();
    process.exit(1);
  } else if (prior && r.eye < prior.eye) {
    console.log(`  ~ ${prior.eye - r.eye} fewer [eye] rule(s) than the ratchet allows. Lower it:`
      + ' node quality/gates/rung.mjs --stamp');
  }
  console.log('');
}
