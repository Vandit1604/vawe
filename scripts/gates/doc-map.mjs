// scripts/gates/doc-map.mjs — the doc map: one source of truth, every index generated from it.
//
//   node scripts/gates/doc-map.mjs            verify (used by craft-coverage / make craft-coverage)
//   node scripts/gates/doc-map.mjs --write    regenerate every index view (make doc-index)
//
// WHY THIS EXISTS. This repo carries ~120 markdown files and ~1.5 MB of written knowledge. An agent
// could only reach it through CLAUDE.md, which is loaded in full on every session, so CLAUDE.md kept
// growing and the things in it kept getting skimmed. Meanwhile docs written and never linked were
// unreachable from anything: FILM-STRUCTURE, APPROVAL-STOPS and SUBAGENT-BUDGET were all orphaned from
// their own index on the day they were written.
//
// THE MECHANISM. Every indexed doc carries frontmatter — `when` (reach for this when…) and `answers`
// (what it settles) — the same shape a SKILL.md carries, for the same reason: one line per doc is
// enough to choose, and the body only loads if chosen. That frontmatter is the ONLY place a
// description is written by hand. Three views are GENERATED from it and never edited:
//
//   docs/INDEX.md                        the repo-wide map, for humans and for any agent
//   .claude/skills/vawe-docs/SKILL.md    the same map as a skill, so Claude Code surfaces it for ~100
//                                        tokens and loads the body only when a doc is actually wanted
//   docs/CRAFT/README.md                 the craft index table, between the docmap markers
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── what counts as an indexed doc ────────────────────────────────────────────────────────────────
// The roots are entry points and maps — the things that point AT the index, not entries in it.
// CLAUDE.md and AGENTS.md are loaded up front by the agent; INDEX.md and CRAFT/README.md are the
// generated maps themselves. Their links are still checked; they just do not describe themselves.
const ROOTS = new Set(['CLAUDE.md', 'AGENTS.md', 'docs/INDEX.md', 'docs/CRAFT/README.md']);

// Excluded, each with the reason. A path is excluded if any prefix/suffix rule matches.
const EXCLUDE = [
  ['docs-site/', 'a vendored Next app; its own MDX is not repo doctrine'],
  ['.claude/skills/impeccable/reference/', 'a vendored third-party skill; its SKILL.md is indexed, its 27 reference pages are not'],
  ['.claude/plans/', 'historical plan records, superseded by what shipped'],
  ['assets/', 'licence and attribution notes that travel with the asset'],
  ['site/public/', 'published copies of docs that are already indexed at their source'],
  ['node_modules/', 'dependencies'],
  ['.venv-tools/', 'dependencies'],
];
const EXCLUDE_SUFFIX = [
  ['.storyboard.md', 'a per-video artifact, not guidance'],
  ['.treatment.md', 'a per-video artifact, not guidance'],
];

// Generated docs. Frontmatter here would be destroyed by the next regenerate, so the one line lives
// with the gate instead. Keep this list at two; anything else should carry its own frontmatter.
const GENERATED = {
  'docs/EFFECTS.md': {
    group: 'reference',
    when: 'choosing an effect and you want to see the whole arsenal before defaulting to rise+fade',
    answers: 'every registered effect across 15 families, generated from the engine registries so it cannot drift',
    by: 'make effects',
  },
  'docs/vawe-rules.md': {
    group: 'reference',
    when: 'you need the authoritative, engine-generated rules for writing a scene.json',
    answers: 'the generated rulebook: if it is in this file, the engine really reads it',
    by: 'scripts/site/rules-build.mjs',
  },
};

// Docs another agent is editing right now, so the frontmatter could not be applied without a
// collision. The map still carries their line, and the gate NAMES them on every run, so an
// incomplete index announces itself rather than looking finished. Delete an entry once the doc
// carries its own frontmatter — the gate fails if a PENDING doc turns out to already have it.
const PENDING = {
  'docs/TASTE.md': {
    group: 'crosscutting',
    when: 'you are about to make something and want the front door to the taste system',
    answers: 'the one law (every frame must fight for its value) · the spines · the block registry · the author→gate→render loop',
  },
  'docs/CRAFT/DIRECTION.md': {
    group: 'crosscutting',
    when: 'it "reads amateur" though every layer renders fine',
    answers: "the direction spine — Disney's 12 · Murch's Rule of Six · restraint · story placement, each sourced + tagged by which gate enforces it",
  },
  'docs/CRAFT/STORYBOARD-TEMPLATE.md': {
    group: 'look',
    when: 'filling in the storyboard `make storyboard-check` and `make intent` read',
    answers: 'the fill-in template: frontmatter (including the `object:` the film is held by) · one block per beat · what each field must name',
  },
  'docs/MISTAKES.md': {
    group: 'process',
    when: 'you hit something odd in the engine, or you just fixed one and must log it',
    answers: 'the numbered mistake→root-cause→fix→which-gate-catches-it log; the repo memory',
  },
};

// A skill that belongs in the CRAFT index. Skills carry `description`, not `when`/`answers`, and this
// one's file is owned elsewhere, so its two columns are declared here.
const CRAFT_ALSO = [{
  file: '.claude/skills/vawe-continuous-action/SKILL.md',
  label: '[`vawe-continuous-action`](../../.claude/skills/vawe-continuous-action/SKILL.md) (skill)',
  group: 'crosscutting',
  when: 'planning a short product film (≤ ~15s) whose subject really is one thing changing — pick it from FILM-STRUCTURE.md first, it is one device of about eighteen',
  answers: 'the continuous-object spine (one object transforms across every cut) · diegetic vs decorative motion · the measured 5-second budget · the storyboard shape `storyboard-check` + `make intent` already eat. Worked from `higgsfield.mp4` + `formats/scene/higgsfield-recreation.json`.',
}];

const GROUPS = [
  ['project', 'The project', 'what this is, before any authoring'],
  ['reference', 'Vocabulary & reference', 'what a scene may contain — look the answer up, do not guess it'],
  ['crosscutting', 'Craft · front-to-back & cross-cutting', 'the whole arc of a video, and the spines that run through all of it'],
  ['story', 'Craft · what & why (the story layer)', 'the beats, their order, and which effect serves which feeling'],
  ['look', 'Craft · how it looks (the house-style layer)', 'type · colour · layout · imagery · the surface copy sits on'],
  ['density', 'Craft · how full · how it sounds', 'whether a beat carries its frame, and what it sounds like'],
  ['process', 'Process & QA', 'the loop after the JSON is written'],
  ['engine', 'The engine & its history', 'for changing the engine, not a video'],
  ['skill', 'Skills', 'loaded on demand by name; each carries its own trigger description'],
];
const CRAFT_GROUPS = ['crosscutting', 'story', 'look', 'density'];
const CRAFT_HEADINGS = {
  crosscutting: 'Front-to-back & cross-cutting:',
  story: 'What & why (the story layer):',
  look: 'How it looks (the house-style layer):',
  density: 'How full · how it sounds:',
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

const isSkill = (f) => f.startsWith('.claude/skills/') && f.endsWith('/SKILL.md');

/** Every indexed doc, with the one line that describes it and where that line came from. */
export function docMap() {
  const entries = [];
  const problems = [];
  const files = tracked().filter((f) => !ROOTS.has(f) && !excluded(f)).sort();

  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const fm = frontmatter(text) || {};

    if (GENERATED[f]) {
      if (fm.when) problems.push({ kind: 'fail', msg: `${f} is listed as GENERATED but carries \`when\` frontmatter — move the line into the doc and drop it from GENERATED in scripts/gates/doc-map.mjs` });
      entries.push({ file: f, source: 'generated', ...GENERATED[f] });
      continue;
    }
    if (PENDING[f]) {
      if (fm.when) problems.push({ kind: 'fail', msg: `${f} is listed as PENDING but now carries its own frontmatter — delete its PENDING entry in scripts/gates/doc-map.mjs` });
      else problems.push({ kind: 'pending', msg: `${f} — frontmatter NOT applied (another agent owns the file). Its line is held in PENDING; the index is incomplete here on purpose.` });
      entries.push({ file: f, source: 'pending', ...PENDING[f] });
      continue;
    }
    if (isSkill(f)) {
      if (!fm.description) { problems.push({ kind: 'fail', msg: `${f}: a SKILL.md with no \`description\` — nothing can surface it` }); continue; }
      entries.push({ file: f, source: 'skill', group: 'skill', when: fm.description, answers: '', name: fm.name || path.basename(path.dirname(f)) });
      continue;
    }
    if (!fm.when || !fm.answers || !fm.group) {
      problems.push({ kind: 'fail', msg: `${f}: missing doc-map frontmatter. Add \`when:\` (reach for this when…), \`answers:\` (what it settles) and \`group:\` (one of ${GROUPS.map((g) => g[0]).join(' · ')}), or add the path to EXCLUDE in scripts/gates/doc-map.mjs with a reason.` });
      continue;
    }
    if (!GROUPS.some((g) => g[0] === fm.group)) { problems.push({ kind: 'fail', msg: `${f}: group "${fm.group}" is not one of ${GROUPS.map((g) => g[0]).join(' · ')}` }); continue; }
    // A relative link resolves differently in each generated view, so it breaks in at least one of
    // them. Name the file in backticks instead; the map already links the doc itself.
    for (const k of ['when', 'answers']) {
      if (/\]\([^)\s]+\.md/.test(fm[k])) problems.push({ kind: 'fail', msg: `${f}: \`${k}\` contains a markdown link to a .md file. Relative links break in the generated views — write the name in backticks instead.` });
    }
    entries.push({ file: f, source: 'frontmatter', group: fm.group, when: fm.when, answers: fm.answers });
  }
  return { entries, problems };
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
  out.push('Start at [`../CLAUDE.md`](../CLAUDE.md) for the standing rules and the render loop. This map is');
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
        const rel = e.file.startsWith('docs/') ? e.file.slice('docs/'.length) : `../${e.file}`;
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
    out.push('`scripts/gates/doc-map.mjs` PENDING because another agent owned the file when the map was built.');
    out.push('`make craft-coverage` names them on every run.');
    out.push('');
  }
  return out.join('\n');
}

export function renderIndex(entries) {
  return `# The doc map — which document settles this?\n\n${indexBody(entries)}`;
}

export function renderSkill(entries) {
  const fm = [
    '---',
    'name: vawe-docs',
    'description: "Find the one document in this repo that settles a question, without reading the others. Load whenever you are about to author, judge, or change a video and want to know which guide covers it: film structure, story beats, transitions, typography, colour, layout, imagery, density, sound, subagent cost, approval stops, recreation, the QA gates, the engine architecture, or the mistake log. Generated from the frontmatter on every doc, so it cannot drift from what is on disk."',
    '---',
    '',
  ].join('\n');
  const body = indexBody(entries)
    .replace('_GENERATED by `make doc-index` from the `when:` / `answers:` frontmatter on each doc. Do not edit._',
      '_GENERATED by `make doc-index`. The same map lives at `docs/INDEX.md`. Do not edit either by hand._')
    .replace(/\]\(\.\.\/([^)]+)\)/g, '](../../../$1)')
    .replace(/\]\((?!\.\.\/|https?:)([^)]+)\)/g, '](../../../docs/$1)');
  return `${fm}# vawe-docs — which document settles this?\n\n${body}`;
}

export function renderCraftBlock(entries) {
  const out = ['## The full index', ''];
  const inCraft = (e) => e.file.startsWith('docs/CRAFT/');
  for (const key of CRAFT_GROUPS) {
    const rows = [
      ...entries.filter((e) => e.group === key && inCraft(e)).map((e) => ({ label: `[${path.basename(e.file)}](${path.basename(e.file)})`, ...e })),
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
  out.push('_GENERATED by `make doc-index` from each guide\'s `when:` / `answers:` frontmatter — the rows cannot');
  out.push('drift from the docs. Change a description in the doc, then run `make doc-index`. The whole-repo map,');
  out.push('including everything outside CRAFT, is [`../INDEX.md`](../INDEX.md)._');
  return out.join('\n');
}

// ── verify / write ───────────────────────────────────────────────────────────────────────────────
const START = '<!-- docmap:start -->';
const END = '<!-- docmap:end -->';

function craftReadmeWith(block) {
  const p = path.join(ROOT, 'docs/CRAFT/README.md');
  const cur = fs.readFileSync(p, 'utf8');
  const a = cur.indexOf(START);
  const b = cur.indexOf(END);
  if (a < 0 || b < 0) return null;
  return cur.slice(0, a) + START + '\n' + block + '\n' + cur.slice(b);
}

export function views(entries) {
  return [
    ['docs/INDEX.md', renderIndex(entries) + '\n'],
    ['.claude/skills/vawe-docs/SKILL.md', renderSkill(entries) + '\n'],
    ['docs/CRAFT/README.md', craftReadmeWith(renderCraftBlock(entries))],
  ];
}

export function staleViews(entries) {
  const errs = [];
  for (const [f, want] of views(entries)) {
    if (want === null) { errs.push(`docs/CRAFT/README.md: the ${START} / ${END} markers are missing — the generated index has nowhere to go`); continue; }
    const p = path.join(ROOT, f);
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    if (cur !== want) errs.push(`${f} is stale — run \`make doc-index\``);
  }
  return errs;
}

/** Every indexed doc must be linked from the map, so nothing is written and left unreachable. */
export function orphanErrors(entries) {
  const map = renderIndex(entries);
  return entries.filter((e) => !map.includes(`(${e.file.startsWith('docs/') ? e.file.slice(5) : '../' + e.file})`) && !map.includes(`(../${e.file})`))
    .map((e) => `${e.file} is not linked from docs/INDEX.md — orphaned from the map`);
}

export function run({ write = false } = {}) {
  const { entries, problems } = docMap();
  const fails = problems.filter((p) => p.kind === 'fail').map((p) => p.msg);
  const pending = problems.filter((p) => p.kind === 'pending').map((p) => p.msg);

  if (write) {
    if (fails.length) return { ok: false, fails, pending, wrote: [], entries };
    const wrote = [];
    for (const [f, content] of views(entries)) {
      if (content === null) { fails.push(`docs/CRAFT/README.md: missing ${START} / ${END} markers`); continue; }
      const p = path.join(ROOT, f);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      if (cur !== content) { fs.writeFileSync(p, content); wrote.push(f); }
    }
    return { ok: !fails.length, fails, pending, wrote, entries };
  }

  const errs = [...fails, ...linkErrors(entries), ...staleViews(entries), ...orphanErrors(entries)];
  return { ok: !errs.length, fails: errs, pending, wrote: [], entries };
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const write = process.argv.includes('--write');
  const r = run({ write });
  for (const msg of r.pending) console.warn(`  ⚠ ${msg}`);
  if (!r.ok) {
    console.error('\n✗ doc-map:');
    for (const msg of r.fails) console.error(`    - ${msg}`);
    process.exit(1);
  }
  if (write) console.log(r.wrote.length ? `✓ doc-index: wrote ${r.wrote.join(', ')}` : '✓ doc-index: already current');
  else console.log(`✓ doc-map: ${r.entries.length} docs indexed · every link resolves · every view current`);
}
