// quality/gates/doc-map.mjs. The doc map: one source of truth, every index generated from it.
//
//   node quality/gates/doc-map.mjs            verify (used by craft-coverage / make craft-coverage)
//   node quality/gates/doc-map.mjs --write    regenerate every index view (make doc-index)
//
// WHY THIS EXISTS. This repo carries ~120 markdown files and ~1.5 MB of written knowledge. An agent
// could only reach it through CLAUDE.md, which is loaded in full on every session, so CLAUDE.md kept
// growing and the things in it kept getting skimmed. Meanwhile docs written and never linked were
// unreachable from anything: FILM-STRUCTURE, APPROVAL-STOPS and SUBAGENT-BUDGET were all orphaned from
// their own index on the day they were written.
//
// THE MECHANISM. Every indexed doc carries frontmatter, `when` (reach for this when…) and `answers`
// (what it settles). The same shape a SKILL.md carries, for the same reason: one line per doc is
// enough to choose, and the body only loads if chosen. That frontmatter is the ONLY place a
// description is written by hand. Two views are GENERATED from it and never edited:
//
//   engine-doctrine/INDEX.md                        the repo-wide map, for humans and for any agent
//   engine-doctrine/CRAFT/README.md                 the craft index table, between the docmap markers
//
// A THIRD VIEW WAS RETIRED: the same map as `skills/vawe-docs/SKILL.md`. See renderSkill's grave below.
// The one-question door onto this data is `make docs Q="..."` (harness/author/docs.mjs).
//
// A generated view cannot drift from its source. What CAN go missing is frontmatter on a new doc, and
// that is what this gate fails on. Reachability is checked too: every indexed doc must be linked from
// the map, and every markdown link in every indexed doc must resolve.
//
// Pure: reads files, no render, no network.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { codesEmitted } from '../../harness/lib/finding-codes.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── what counts as an indexed doc ────────────────────────────────────────────────────────────────
// The roots are entry points and maps. The things that point AT the index, not entries in it.
// CLAUDE.md and AGENTS.md are loaded up front by the agent; INDEX.md and CRAFT/README.md are the
// generated maps themselves. Their links are still checked; they just do not describe themselves.
const ROOTS = new Set(['CLAUDE.md', 'AGENTS.md', 'engine-doctrine/INDEX.md', 'engine-doctrine/CRAFT/README.md']);

// Excluded, each with the reason. A path is excluded if any prefix/suffix rule matches.
const EXCLUDE = [
  // Its frontmatter is the EXAMPLE an author copies into a real storyboard, so doc-map keys added
  // there would land in every storyboard written from it and `storyboard-check` would see props it
  // does not know. Reached instead from DIRECTION.md and TASTE.md, which are both indexed.
  ['engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md', 'its frontmatter is a fill-in example, not metadata about the file'],
  ['docs-site/', 'a vendored Next app; its own MDX is not repo doctrine'],
  ['skills/impeccable/reference/', 'a vendored third-party skill; its SKILL.md is indexed, its 27 reference pages are not'],
  ['.claude/plans/', 'historical plan records, superseded by what shipped'],
  ['assets/', 'licence and attribution notes that travel with the asset'],
  // The marketing site is a Next app with its own design system, the same shape as docs-site/ above.
  // This map indexes FILM doctrine, and a token table for a web app answers none of its questions.
  // A UI contributor is routed by site/CLAUDE.md, which is directory-scoped and therefore found
  // without an index; site/public/ additionally holds published copies of docs indexed at source.
  ['site/', 'a Next app with its own design system, entered through site/CLAUDE.md, not through film doctrine'],
  ['node_modules/', 'dependencies'],
  ['.venv-tools/', 'dependencies'],
];
const EXCLUDE_SUFFIX = [
  ['.storyboard.md', 'a per-video artifact, not guidance'],
  ['.design.md', 'a per-film design declaration read by design-drift, not guidance'],
  ['.treatment.md', 'a per-video artifact, not guidance'],
  ['.lock.md', 'a per-video artifact, not guidance: the frozen spec one film was authored from'],
  ['.brief.md', 'a per-video artifact, not guidance: the five-line brief one film was authored from'],
  ['.prompt.md', 'a per-video artifact, not guidance: the film prompt make ideate wrote for one film or reference'],
  ['LICENSES.md', 'a provenance/attribution table (author + license per vendored asset), not guidance'],
];

// Generated docs. Frontmatter here would be destroyed by the next regenerate, so the one line lives
// with the gate instead. Keep this list at two; anything else should carry its own frontmatter.
const GENERATED = {
  'engine-doctrine/EFFECTS.md': {
    group: 'reference',
    when: 'choosing an effect and you want to see the whole arsenal before defaulting to rise+fade',
    answers: 'every registered effect in the engine, generated from the engine registries so it cannot drift',
    by: 'make effects',
  },
  'engine-doctrine/vawe-rules.md': {
    group: 'reference',
    when: 'you need the authoritative, engine-generated rules for writing a scene.json',
    answers: 'the generated rulebook: if it is in this file, the engine really reads it',
    by: 'scripts/site/rules-build.mjs',
  },
};

// Docs another agent is editing right now, so the frontmatter could not be applied without a
// collision. The map still carries their line, and the gate NAMES them on every run, so an
// incomplete index announces itself rather than looking finished. Delete an entry once the doc
// carries its own frontmatter. The gate fails if a PENDING doc turns out to already have it.
const PENDING = {
  // empty. Every doc that was held here has since had its frontmatter applied directly.
  // Keep the mechanism: the next time an agent cannot take a file it does not own, its line
  // lands here and the gate says the index is incomplete THERE, by name, instead of quietly
  // omitting it. A partially-applied index that looks complete is the failure this replaced.
};

// A skill that belongs in the CRAFT index. Skills carry `description`, not `when`/`answers`, and this
// one's file is owned elsewhere, so its two columns are declared here.
const CRAFT_ALSO = [{
  file: 'skills/vawe-continuous-action/SKILL.md',
  label: '[`vawe-continuous-action`](../../skills/vawe-continuous-action/SKILL.md) (skill)',
  group: 'crosscutting',
  when: 'planning a short product film (≤ ~15s) whose subject really is one thing changing, pick it from FILM-STRUCTURE.md first, it is one device of about eighteen',
  answers: 'the continuous-object spine (one object transforms across every cut) · diegetic vs decorative motion · the measured 5-second budget · the storyboard shape `storyboard-check` + `make intent` already eat. Worked from `higgsfield.mp4` + `films/scene/higgsfield-recreation.json`.',
}];

const GROUPS = [
  ['project', 'The project', 'what this is, before any authoring'],
  ['reference', 'Vocabulary & reference', 'what a scene may contain. Look the answer up, do not guess it'],
  ['crosscutting', 'Craft · front-to-back & cross-cutting', 'the whole arc of a video, and the spines that run through all of it'],
  ['story', 'Craft · what & why (the story layer)', 'the beats, their order, and which effect serves which feeling'],
  ['look', 'Craft · how it looks (the house-style layer)', 'type · colour · layout · imagery · the surface copy sits on'],
  ['density', 'Craft · how full · how it sounds', 'whether a beat carries its frame, and what it sounds like'],
  ['process', 'Process & QA', 'the loop after the JSON is written'],
  ['engine', 'The engine & its history', 'for changing the engine, not a video'],
  ['skill', 'Skills', 'loaded on demand by name; each carries its own trigger description'],
];
const CRAFT_GROUPS = ['crosscutting', 'story', 'look', 'density', 'reference'];
const CRAFT_HEADINGS = {
  crosscutting: 'Front-to-back & cross-cutting:',
  story: 'What & why (the story layer):',
  look: 'How it looks (the house-style layer):',
  density: 'How full · how it sounds:',
  reference: 'Reference (look it up):',
};

// ── reading ──────────────────────────────────────────────────────────────────────────────────────
const tracked = () =>
  cp.execSync("git ls-files '*.md'", { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);

function excluded(f) {
  for (const [p] of EXCLUDE) if (f.startsWith(p)) return true;
  for (const [s] of EXCLUDE_SUFFIX) if (f.endsWith(s)) return true;
  return false;
}

// A deliberately small YAML reader: only the scalar keys this map uses, only at the top of the file.
function frontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return null;
  const out = {};
  for (const line of text.slice(4, end).split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (!v) continue;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      try { v = v.startsWith('"') ? JSON.parse(v) : v.slice(1, -1); } catch { v = v.slice(1, -1); }
    }
    out[m[1]] = v;
  }
  return out;
}

const isSkill = (f) => f.startsWith('skills/') && f.endsWith('/SKILL.md');

/** Every indexed doc, with the one line that describes it and where that line came from. */
export function docMap() {
  const entries = [];
  const problems = [];
  const files = tracked().filter((f) => !ROOTS.has(f) && !excluded(f)).sort();

  for (const f of files) {
    // `git ls-files` lists a file that is still TRACKED, which includes one deleted from the working
    // tree but not yet from the index. Reading it threw a raw ENOENT stack, and the generator that
    // rebuilds the index is the one thing that cannot ask the author to fix the index first.
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) {
      problems.push({ kind: 'fail', msg: `${f} is tracked by git and missing from disk, run \`git rm --cached ${f}\` if you meant to delete it, or restore it` });
      continue;
    }
    const text = fs.readFileSync(abs, 'utf8');
    const fm = frontmatter(text) || {};

    if (GENERATED[f]) {
      if (fm.when) problems.push({ kind: 'fail', msg: `${f} is listed as GENERATED but carries \`when\` frontmatter. Move the line into the doc and drop it from GENERATED in quality/gates/doc-map.mjs` });
      entries.push({ file: f, source: 'generated', ...GENERATED[f] });
      continue;
    }
    if (PENDING[f]) {
      if (fm.when) problems.push({ kind: 'fail', msg: `${f} is listed as PENDING but now carries its own frontmatter. Delete its PENDING entry in quality/gates/doc-map.mjs` });
      else problems.push({ kind: 'pending', msg: `${f}. Frontmatter NOT applied (another agent owns the file). Its line is held in PENDING; the index is incomplete here on purpose.` });
      entries.push({ file: f, source: 'pending', ...PENDING[f] });
      continue;
    }
    if (isSkill(f)) {
      if (!fm.description) { problems.push({ kind: 'fail', msg: `${f}: a SKILL.md with no \`description\`. Nothing can surface it` }); continue; }
      entries.push({ file: f, source: 'skill', group: 'skill', when: fm.description, answers: '',
        name: fm.name || path.basename(path.dirname(f)), codes: parseCodes(fm.codes) });
      continue;
    }
    if (!fm.when || !fm.answers || !fm.group) {
      problems.push({ kind: 'fail', msg: `${f}: missing doc-map frontmatter. Add \`when:\` (reach for this when…), \`answers:\` (what it settles) and \`group:\` (one of ${GROUPS.map((g) => g[0]).join(' · ')}), or add the path to EXCLUDE in quality/gates/doc-map.mjs with a reason.` });
      continue;
    }
    if (!GROUPS.some((g) => g[0] === fm.group)) { problems.push({ kind: 'fail', msg: `${f}: group "${fm.group}" is not one of ${GROUPS.map((g) => g[0]).join(' · ')}` }); continue; }
    // A relative link resolves differently in each generated view, so it breaks in at least one of
    // them. Name the file in backticks instead; the map already links the doc itself.
    for (const k of ['when', 'answers']) {
      if (/\]\([^)\s]+\.md/.test(fm[k])) problems.push({ kind: 'fail', msg: `${f}: \`${k}\` contains a markdown link to a .md file. Relative links break in the generated views. Write the name in backticks instead.` });
    }
    entries.push({ file: f, source: 'frontmatter', group: fm.group, when: fm.when, answers: fm.answers,
      codes: parseCodes(fm.codes) });
  }
  return { entries, problems };
}

// ── which finding routes to which doc ────────────────────────────────────────────────────────────
// A gate that says what is wrong and not where the answer lives is half a gate. Measured before this
// existed: 10 of 64 gates cited a doc, and 12 of the 33 CRAFT docs were named by nothing except the
// generated index. So the knowledge was written, indexed, and unreachable at the only moment it was
// needed, which is the moment a finding fires.
//
// `codes:` on a doc's frontmatter names the findings that doc settles. The mapping is enforced ONE WAY
// as an error and the other way as a report, and the asymmetry is deliberate. A doc claiming a code no
// gate emits is a DEAD POINTER: it sends an author to a page about a rule that no longer runs, which is
// the exact rot `waiver-drift`'s hand-kept RETIRED map exists to catch and keeps having to be told
// about. That fails. A code with no doc is merely UNROUTED, and since harness/lib/finding-codes.mjs
// chooses precision over recall, a recall gap there would otherwise block every build over a pointer
// nobody had written yet. That reports.
const parseCodes = (v) => (v == null ? [] : String(v).replace(/^\[|\]$/g, '')
  .split(',').map((c) => c.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean));

/** Map<code, docFile>, for any gate runner that wants to print the pointer beside the finding. */
export function codeDocMap(entries) {
  const map = new Map();
  for (const e of entries) for (const c of e.codes || []) if (!map.has(c)) map.set(c, e.file);
  return map;
}

// A finding code that reports on MACHINERY, not on the FILM: a broken tool, a crashed process, a
// climbing ratchet on the engine's own JS, or a stale build artifact. No CRAFT doc can settle "the
// audit crashed" or "the docker context grew", and routing one there anyway would send an author
// looking for craft guidance on a page that has none, which is worse than leaving it unrouted (see
// the asymmetry note above `parseCodes`). Excluded BY CLASS, with the reason, same shape as EXCLUDE
// above: a code lands here because the GATE that emits it is machinery end to end, never one at a
// time to make a number smaller.
const CODE_EXCLUDE = new Map([
  // docs-drift.mjs + site-counts.mjs + doc-refs.mjs: is a doc's own PROSE (a quoted count, a "still
  // absent" claim, a `make <target>` citation, a cited path) still true of the registry/Makefile/tree
  // it describes. A rot in the doc's arithmetic, not a rule about a film.
  ['absent-but-shipped', 'docs-drift: a roadmap prose claim vs the real registry, not craft'],
  ['bg-count-mismatch', 'docs-drift: docs-site prose count vs BG_NAMES, not craft'],
  ['bg-heading-gone', 'docs-drift: a doc heading the count-checker reads went missing, not craft'],
  ['bg-missing-name', 'docs-drift: docs-site prose vs BG_NAMES, not craft'],
  ['claim-mismatch', 'docs-drift: AGENTS.md quoted count vs the real generator, not craft'],
  ['claim-unreachable', 'docs-drift: could not even run the generator to check a count, not craft'],
  ['count-mismatch', 'docs-drift: a roadmap quoted registry count vs the real registry, not craft'],
  ['grammar-stale', 'docs-drift: GRAMMAR.md generator --check disagrees with what is committed, not craft'],
  ['heading-count-mismatch', 'docs-drift: PRIMITIVES.md heading count vs the real registry, not craft'],
  ['heading-gone', 'docs-drift: a heading the count-checker reads went missing, not craft'],
  ['layer-missing-name', 'docs-drift: docs-site prose vs LAYER_TYPES, not craft'],
  ['stale-count', 'site-counts: a doc-quoted count vs the real registry, not craft'],
  ['starter-refused', 'site-counts: the STARTER example scene fails engine validation, an engine bug not craft'],
  ['doc-refs-path', 'doc-refs: a cited repo path does not exist, not craft'],
  ['doc-refs-recipe', 'doc-refs: a Makefile recipe runs a script that does not exist, not craft'],
  ['doc-refs-self-ref', 'doc-refs: a source file prints a `node <script>` that does not exist, not craft'],
  ['doc-refs-target', 'doc-refs: a doc cites `make <target>` and no such target exists, not craft'],
  ['doc-map', 'doc-map.mjs failing on itself: the map is broken, not a film'],
  ['mistakes-dupe', 'MISTAKES.md heading-duplicate detector: log hygiene, not craft, and that file is owned elsewhere right now'],
  ['craft-unvisited', "craft-checklist.mjs: whichever relevant doc's `confirm:` went unanswered in the storyboard; it already names that doc dynamically via its own `doc:` field, so no single doc owns this code"],

  // arsenal-check.mjs + discovery.mjs: does the engine's OWN search/catalogue tooling (engine-doctrine/EFFECTS.md,
  // `make arsenal`, the website's index) stay complete and in sync with the registries. Fixed by
  // giving a registry a `catalog`/`blurbs` block, never by a craft decision in a film.
  ['arsenal-missing', 'arsenal-check: a registry has no catalog section in engine-doctrine/EFFECTS.md, fixed with a `catalog` block'],
  ['arsenal-ratchet', 'arsenal-check: hand-catalogued (non-registry) capability count climbed, an engine-authoring debt'],
  ['blurb-ratchet', 'arsenal-check: registry entries with no blurb climbed, fixed by writing blurbs at the registry'],
  ['block-unsearchable', 'discovery: a block family dropped out of `make arsenal`\'s search corpus, an engine-tooling break'],
  ['corpus-bare', 'discovery: search-corpus entries with no blurb climbed, fixed at the registry'],
  ['family-uncovered', 'discovery: no author-phrased eval query resolves to a searchable family, a test-fixture gap'],
  ['index-parity', 'discovery: the website index and the CLI index disagree, an engine-tooling sync bug'],
  ['registry-bare', 'discovery: a registry entry has no blurb; `checkCovered` refuses this at load, so seeing it means that guard broke'],

  // Regression/snapshot machinery: snap-blocks.mjs, snap-scenes.mjs, scene-snap.mjs, render-verify.mjs,
  // canvas-purity's sibling gates. Compares a render/DOM/pixel signature against a saved baseline or a
  // scrambled render order; every finding is "the tool could not confirm sameness", never a rule about
  // what a film should look like.
  ['block-changed', 'snap-blocks: a block\'s rendered signature diverged from its saved baseline, re-baseline if intended'],
  ['block-error', 'snap-blocks: a block failed to render at all while snapshotting, a tooling crash'],
  ['non-deterministic', 'snap-blocks: two renders of the same props produced different output, an engine determinism bug'],
  ['nothing-compared', 'snap-blocks/snap-scenes: every entry lacked a baseline, so the gate checked nothing, a fresh-checkout state'],
  ['quarantined', 'snap-scenes: a scene is order-dependent and was pulled out of the baseline set, an engine determinism bug'],
  ['render-error', 'snap-scenes: a scene failed to render while snapshotting, a tooling crash'],
  ['scene-changed', 'snap-scenes: a scene\'s rendered signature diverged from its saved baseline, re-baseline if intended'],
  ['scene-snap-diff', 'scene-snap: a scene\'s DOM signature diverged from its saved baseline, re-baseline if intended'],
  ['render-truncated', 'render-verify: the rendered mp4 is shorter than the scene declares, a render-pipeline bug'],
  ['render-unreadable', 'render-verify: ffprobe could not read the rendered mp4 at all, a render-pipeline bug'],

  // Pure engine-source linting/consistency: dead-branch.mjs, knobs-audit.mjs, prop-probe.mjs,
  // silent-fallback.mjs, schema-drift.mjs, code-quality.mjs, conformance.mjs, docker-context.mjs,
  // rung.mjs, waiver-drift.mjs. All read the ENGINE's own JS/JSON, never a film, and each names its
  // own fix inline (a registry block, a schema edit, `--stamp`, restore a load-time guard).
  ['dead-branch', 'dead-branch.mjs: a computed value is discarded or a condition is decided at author time, an engine-JS linter'],
  ['identical-arms', 'dead-branch.mjs: a ternary whose two arms are the same value, an engine-JS linter'],
  ['dead-knob', 'knobs-audit: core/knobs.js advertises a dial the code ignores, an engine manifest bug'],
  ['dead-prop', 'prop-probe: an ENGINE-declared prop is set on its probe scene and nothing reads it, an engine schema bug'],
  ['probe-boot-error', 'prop-probe: a probe scene failed to boot, so its type was not checked, a tooling failure'],
  ['blind-check', 'layer-props.mjs\'s own self-check that its shared-prop declarations have not been gutted; failing this is a bug in the gate\'s inputs'],
  ['silent-fallback', 'silent-fallback.mjs: a hand-indexed object with a default in engine JS, bypassing defineRegistry, an engine-JS linter'],
  ['stale-waiver', 'silent-fallback.mjs: a waiver in the gate itself matches no code any more, gate-file hygiene'],
  ['schema-doc-mismatch', 'schema-drift: films/scene/schema.json prop docs vs what the engine actually reads, engine bookkeeping'],
  ['schema-engine-prop-missing', 'schema-drift: the engine reads a prop schema.json never declared, engine bookkeeping'],
  ['schema-enum-drift', 'schema-drift: a schema enum vs the engine\'s real implemented values, engine bookkeeping'],
  ['schema-layerprops-stale', 'schema-drift: the generated per-type prop table is stale, run its own --write'],
  ['schema-modifier-drift', 'schema-drift: the modifier schema vs the engine\'s real modifier keys, engine bookkeeping'],
  ['schema-motion-drift', 'schema-drift: the motion-track schema vs the engine\'s real motion fields, engine bookkeeping'],
  ['code-quality-worse', 'code-quality.mjs: the oxlint complexity ratchet on engine JS climbed, not a film concern'],
  ['conformance', 'conformance.mjs: a declared enum/prop does not actually change the render, an engine correctness bug'],
  ['docker-unavailable', 'docker-context.mjs: the docker daemon was not reachable to measure the build context, infra'],
  ['over-budget', 'docker-context.mjs: the docker build context exceeds its MiB budget, a .dockerignore/infra fix'],
  ['unreadable-output', 'docker-context.mjs: could not parse docker\'s own build output, a tooling break'],
  ['bad-rung-tag', 'rung.mjs: an AGENTS.md/CLAUDE.md `[rung]` tag names a mechanism that does not match its enforcement, doctrine bookkeeping'],
  ['rung-ratchet', 'rung.mjs: the count of prose-only `[eye]` rules climbed, doctrine bookkeeping'],
  ['untagged-section', 'rung.mjs: an AGENTS.md/CLAUDE.md section carries no `[rung]` tag at all, doctrine bookkeeping'],
  ['dead-waiver', 'waiver-drift: a scene still waives a code no gate emits any more, waiver-file hygiene'],
  ['legacy-waiver-ratchet', 'waiver-drift: a folded legacy-waiver code\'s live-fire count rose, waiver-mechanism bookkeeping'],
  ['waiver-drift', 'waiver-drift: SOME code is waived across too much of the library; the offending code varies per run, so no single doc can own it, and the gate already names its own next step'],

  // Baked-asset / build-artifact freshness: glyphs-audit.mjs (3D typeface JSON vs its source woff2),
  // generated-check.mjs (any generated file vs its generator), asset-check.mjs's video-seek check is
  // the one exception routed to bucket 3 below (it is a real authoring gotcha, just undocumented).
  ['gaps', 'glyphs-audit: a baked 3D-typeface JSON is missing glyphs its charset claims, a build-artifact bug'],
  ['no-provenance', 'glyphs-audit: a baked 3D-typeface JSON carries no source hash, a build-artifact bug'],
  ['source-gone', 'glyphs-audit: a baked 3D-typeface JSON\'s source woff2 no longer exists, a build-artifact bug'],
  ['stale', 'glyphs-audit: a baked 3D-typeface JSON no longer matches its source woff2\'s bytes, a build-artifact bug'],
  ['unreadable', 'glyphs-audit: a baked 3D-typeface JSON is not valid JSON, a build-artifact bug'],
  ['generated-stale', 'generated-check: a generated file differs from what its generator produces now, run it and commit'],

  // Coverage/adoption tooling framed as a REGRESSION SAFETY NET ("nothing would notice"), distinct
  // from feature-audit.mjs's craft-framed sibling (never-adopted, preset-monotony), which IS routed.
  ['unexercised', 'coverage.mjs: no scene in the library exercises this vocabulary, so a regression there goes unnoticed; a test-corpus gap'],
  ['unexercised-prop', 'coverage.mjs: no scene sets a schema-declared prop, same test-corpus-gap framing'],
  ['audit-errored', 'audit-scenes.mjs: `make audit` crashed on a scene, a tooling failure'],
  ['audit-hard', 'audit-scenes.mjs: a rollup of a scene\'s underlying `make audit` findings, which carry their own codes'],
  ['judge-usage', 'judge.mjs: CLI called with no argument, a usage error'],
]);

/** A doc that claims a code nothing emits. Fails: the pointer is already rotten. */
export function codeErrors(entries) {
  const emitted = codesEmitted();
  const errs = [];
  for (const e of entries) for (const c of e.codes || []) {
    if (!emitted.has(c)) errs.push(`${e.file}: \`codes:\` names "${c}", which no gate emits. `
      + `Remove it, or fix the code's spelling. A pointer to a retired rule reads as a live argument.`);
  }
  const claimed = new Set(entries.flatMap((e) => e.codes || []));
  const unrouted = [...emitted.keys()].filter((c) => !claimed.has(c) && !CODE_EXCLUDE.has(c)).sort();
  return { errs, unrouted };
}

// ── link integrity, repo-wide ────────────────────────────────────────────────────────────────────
export function linkErrors(entries) {
  const errs = [];
  const seen = new Set(entries.map((e) => e.file));
  for (const f of [...seen, ...ROOTS].sort()) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const m of text.matchAll(/\]\(([^)\s]+?\.md)(?:#[^)]*)?\)/g)) {
      const target = m[1].replace(/^[`<]|[`>]$/g, '');
      if (/^https?:/.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(abs), target))) errs.push(`${f}: broken link → ${target}`);
    }
  }
  return errs;
}

// ── the generated views ──────────────────────────────────────────────────────────────────────────
const cell = (s) => String(s).replace(/\|/g, '\\|');

function indexBody(entries) {
  const out = [];
  out.push('_GENERATED by `make doc-index` from the `when:` / `answers:` frontmatter on each doc. Do not edit._');
  out.push('');
  out.push('Every written thing in this repo, one line each: reach for it **when**, and it **answers**.');
  out.push('Read the line, then open only the doc you need. Nothing here loads a body you did not ask for.');
  out.push('');
  // The label is the bare filename, never a relative path. This body used to be emitted twice, at two
  // depths (engine-doctrine/INDEX.md and the retired skills/vawe-docs/SKILL.md), with only the TARGET
  // rewritten per copy, so a label of `../CLAUDE.md` was wrong in one of the two files every time it
  // was generated. One depth now, and the rule stays because the reason to prefer a bare label does.
  out.push('Start at [`CLAUDE.md`](../CLAUDE.md) for the standing rules and the render loop. This map is');
  out.push('for the question CLAUDE.md cannot answer without growing: *which document settles this?*');
  out.push('');
  for (const [key, title, blurb] of GROUPS) {
    const rows = entries.filter((e) => e.group === key);
    if (!rows.length) continue;
    out.push(`## ${title}`);
    out.push('');
    out.push(`*${blurb}*`);
    out.push('');
    if (key === 'skill') {
      out.push('| Skill | Trigger |');
      out.push('|---|---|');
      for (const e of rows) out.push(`| [\`${e.name}\`](../${e.file}) | ${cell(e.when)} |`);
    } else {
      out.push('| Doc | Reach for it when… | It answers |');
      out.push('|---|---|---|');
      for (const e of rows) {
        const rel = e.file.startsWith('engine-doctrine/') ? e.file.slice('engine-doctrine/'.length) : `../${e.file}`;
        const mark = e.source === 'pending' ? ' ⚠' : '';
        out.push(`| [${e.file}](${rel})${mark} | ${cell(e.when)} | ${cell(e.answers)} |`);
      }
    }
    out.push('');
  }
  const pend = entries.filter((e) => e.source === 'pending');
  if (pend.length) {
    out.push('---');
    out.push('');
    out.push(`⚠ ${pend.length} doc${pend.length > 1 ? 's' : ''} above carr${pend.length > 1 ? 'y' : 'ies'} no frontmatter of its own; the line shown is held in`);
    out.push('`quality/gates/doc-map.mjs` PENDING because another agent owned the file when the map was built.');
    out.push('`make craft-coverage` names them on every run.');
    out.push('');
  }
  return out.join('\n');
}

export function renderIndex(entries) {
  return `# The doc map, which document settles this?\n\n${indexBody(entries)}`;
}

// renderSkill is GONE. The same map used to be emitted as `skills/vawe-docs/SKILL.md` so Claude Code
// would surface it by description match. It was 157 rows, about 9,500 tokens and 158 links: a table of
// contents wearing a skill's clothes, at nearly double the body budget Anthropic's published contract
// sets, and a generator cannot trim what only grows. `make docs Q="<question>"`
// (harness/author/docs.mjs) answers ONE question off this same data instead, and engine-doctrine/
// INDEX.md still carries the whole table for a reader who wants to browse.
export function renderCraftBlock(entries) {
  const out = ['## The full index', ''];
  const inCraft = (e) => e.file.startsWith('engine-doctrine/CRAFT/');
  for (const key of CRAFT_GROUPS) {
    const rows = [
      // relative to engine-doctrine/CRAFT/, not basename: a doc under a subdirectory (engine-doctrine/CRAFT/routes/*) needs
      // its subpath in the link, or the generated table points at a file that does not exist there.
      ...entries.filter((e) => e.group === key && inCraft(e)).map((e) => {
        const rel = path.relative('engine-doctrine/CRAFT', e.file);
        return { label: `[${rel}](${rel})`, ...e };
      }),
      ...CRAFT_ALSO.filter((e) => e.group === key),
    ];
    if (!rows.length) continue;
    out.push(`**${CRAFT_HEADINGS[key]}**`);
    out.push('');
    out.push('| Guide | Load it when you are… | Answers |');
    out.push('|---|---|---|');
    for (const r of rows) out.push(`| ${r.label}${r.source === 'pending' ? ' ⚠' : ''} | ${cell(r.when)} | ${cell(r.answers)} |`);
    out.push('');
  }
  out.push('_GENERATED by `make doc-index` from each guide\'s `when:` / `answers:` frontmatter, the rows cannot');
  out.push('drift from the docs. Change a description in the doc, then run `make doc-index`. The whole-repo map,');
  out.push('including everything outside CRAFT, is [`../INDEX.md`](../INDEX.md)._');
  return out.join('\n');
}

// ── verify / write ───────────────────────────────────────────────────────────────────────────────
const START = '<!-- docmap:start -->';
const END = '<!-- docmap:end -->';

function craftReadmeWith(block) {
  const p = path.join(ROOT, 'engine-doctrine/CRAFT/README.md');
  const cur = fs.readFileSync(p, 'utf8');
  const a = cur.indexOf(START);
  const b = cur.indexOf(END);
  if (a < 0 || b < 0) return null;
  return cur.slice(0, a) + START + '\n' + block + '\n' + cur.slice(b);
}

export function views(entries) {
  return [
    ['engine-doctrine/INDEX.md', renderIndex(entries) + '\n'],
    ['engine-doctrine/CRAFT/README.md', craftReadmeWith(renderCraftBlock(entries))],
  ];
}

export function staleViews(entries) {
  const errs = [];
  for (const [f, want] of views(entries)) {
    if (want === null) { errs.push(`engine-doctrine/CRAFT/README.md: the ${START} / ${END} markers are missing. The generated index has nowhere to go`); continue; }
    const p = path.join(ROOT, f);
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    if (cur !== want) errs.push(`${f} is stale, run \`make doc-index\``);
  }
  return errs;
}

/** Every indexed doc must be linked from the map, so nothing is written and left unreachable. */
export function orphanErrors(entries) {
  const map = renderIndex(entries);
  return entries.filter((e) => !map.includes(`(${e.file.startsWith('engine-doctrine/') ? e.file.slice('engine-doctrine/'.length) : '../' + e.file})`) && !map.includes(`(../${e.file})`))
    .map((e) => `${e.file} is not linked from engine-doctrine/INDEX.md: orphaned from the map`);
}

export function run({ write = false } = {}) {
  const { entries, problems } = docMap();
  const fails = problems.filter((p) => p.kind === 'fail').map((p) => p.msg);
  const pending = problems.filter((p) => p.kind === 'pending').map((p) => p.msg);

  if (write) {
    if (fails.length) return { ok: false, fails, pending, wrote: [], entries };
    const wrote = [];
    for (const [f, content] of views(entries)) {
      if (content === null) { fails.push(`engine-doctrine/CRAFT/README.md: missing ${START} / ${END} markers`); continue; }
      const p = path.join(ROOT, f);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      if (cur !== content) { fs.writeFileSync(p, content); wrote.push(f); }
    }
    return { ok: !fails.length, fails, pending, wrote, entries };
  }

  const codeCheck = codeErrors(entries);
  const errs = [...fails, ...linkErrors(entries), ...staleViews(entries), ...orphanErrors(entries), ...codeCheck.errs];
  if (codeCheck.unrouted.length) pending.push(`${codeCheck.unrouted.length} finding code(s) route to no doc: `
    + `${codeCheck.unrouted.slice(0, 8).join(', ')}${codeCheck.unrouted.length > 8 ? ', …' : ''}. `
    + `Add each to the \`codes:\` frontmatter of the CRAFT doc that settles it.`);
  return { ok: !errs.length, fails: errs, pending, wrote: [], entries };
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const write = process.argv.includes('--write');
  const r = run({ write });
  const f = gateFindings();
  for (const msg of r.pending) { console.warn(`  ⚠ ${msg}`); f.note('doc-map-pending', msg); }
  if (!r.ok) {
    console.error('\n✗ doc-map:');
    for (const msg of r.fails) { console.error(`    - ${msg}`); f.fail('doc-map', msg); }
    process.exit(1);
  }
  if (write) console.log(r.wrote.length ? `✓ doc-index: wrote ${r.wrote.join(', ')}` : '✓ doc-index: already current');
  else console.log(`✓ doc-map: ${r.entries.length} docs indexed · every link resolves · every view current`);
}
