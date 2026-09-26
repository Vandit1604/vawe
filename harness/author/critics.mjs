import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeReceipt, readReceipt, hashOf, receiptPath } from '../lib/receipt.mjs';
import { stageOf, filePaths } from '../../quality/gates/stage.mjs';
import { computeFeatures } from '../../quality/gates/craft-checklist.mjs';
import { rulesFor, briefLine } from '../lib/craft-rules.mjs';
import { frontmatter } from './storyboard-parse.mjs';
import { expandThemeFile } from '../lib/theme-load.mjs';
import { PLAN_JUDGE_CODES, isPlanJudgeCode, rankPlanJudgeFindings } from '../lib/plan-judge-codes.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// One decider writes one exclusive scope (engine-doctrine/CRAFT/SUBAGENTS.md), so its rule briefs must
// stay scoped the same way; this table is the ONE place that mapping lives.
const DECIDER_CATEGORIES = {
  storyboard: ['direction', 'content'],
  subject: ['direction', 'content'],
  scene: ['layout', 'imagery', 'typography', 'colour', 'content'],
  motion: ['motion', 'camera'],
  transition: ['transitions'],
  sound: ['sound', 'captions'],
};

// Pins the owner's top motion rules into the motion brief past the fixed char-budget cap:
// engine-doctrine/CRAFT/rules/motion.json has 12 records, the cap keeps only 5.
export const DECIDER_PIN = {
  motion: ['motion.readable-hold', 'motion.exit-faster', 'motion.no-jolt'],
};

export function worktreeContract() {
  const doc = fs.readFileSync(path.resolve(repoRoot, 'engine-doctrine/CRAFT/SUBAGENTS.md'), 'utf8');
  const start = doc.indexOf('<!-- worktree-contract:start -->');
  const end = doc.indexOf('<!-- worktree-contract:end -->');
  if (start < 0 || end < 0) return null;
  return doc.slice(start + '<!-- worktree-contract:start -->'.length, end).trim();
}

function currentSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim(); }
  catch { return '(unknown, git rev-parse failed)'; }
}

// Kept in lockstep with engine-doctrine/CRAFT/SUBAGENTS.md's table; `ab` is listed there as
// built-then-cut (nothing runs today) so it is not in this roster.
export const ROSTER = [
  {
    name: 'beat',
    job: 'does each beat read at a glance',
    input: (name, vs) => `/tmp/beats/${name}.png` + (vs ? ` (produced with VS=${vs}, source-section shot beside each beat)` : ''),
    produce: (D, vs) => `make dev-tool X=beats D=${D}${vs ? ` VS=${vs}` : ''}`,
    verdict: '{ findings: [ { beat, reads: "yes"|"no", flaw, fix } ] }',
  },
  {
    name: 'bg-motion',
    job: 'speed, scale and direction of anything that moves continuously',
    input: () => 'a 4+ frame strip, reference and render at matched timestamps (pull frames with `make dev-tool X=frame D=<file> N=<n>`)',
    produce: (D) => `make dev-tool X=frame D=${D} N=<n>  (repeat for 4+ timestamps; pair with the reference at the same n)`,
    verdict: '{ findings: [ { axis: "speed"|"scale"|"direction", ours, reference, delta, fix } ] }',
  },
  {
    name: 'reveal',
    job: 'how each beat enters and exits, never the settled frame',
    input: (name) => `/tmp/reveal/${name}.png`,
    produce: (D) => `make dev-tool X=reveal D=${D}`,
    verdict: '{ findings: [ { beat, enter, exit, paired: "yes"|"no", flaw, fix } ] }',
  },
  {
    name: 'fidelity',
    job: 'recreations only: how close each beat is to its source',
    input: (name) => `/tmp/beats/${name}.png (render frames) beside the source section shots`,
    produce: (D, vs) => `make dev-tool X=beats D=${D}${vs ? ` VS=${vs}` : ' VS=<brand>'}`,
    verdict: '{ findings: [ { beat, score: 0-10, gaps: [ "..." ] } ] }',
    skipUnless: (scene) => !!scene.recreation || !!scene.vs || !!scene._recreation,
  },
  {
    name: 'copy',
    job: 'on-screen writing only, admission test failed (sees only what the author already wrote, see SUBAGENTS.md)',
    input: (name, vs, D) => `the strings pulled from ${D}, in beat order (below)`,
    produce: () => null,
    verdict: '{ findings: [ { beat, line, tell, rewrite } ] }',
  },
  {
    name: 'seam',
    job: 'flash or collision at transitions',
    input: (name) => `/tmp/seams/${name}.png`,
    produce: (D, vs, name) => `make check GATE=seam-check D=${D}  (requires out/${name}.mp4, render first)`,
    verdict: '{ findings: [ { seam, flash: "yes"|"no", evidence, fix } ] }',
  },
];

function flatLayers(ls) {
  return (ls || []).flatMap((L) => [L, ...flatLayers(L.layers), ...flatLayers(L.children)]);
}

// Order is a dependency chain, not a preference: motion runs before transitions because the
// content-aware cut reads the velocity at a joint, so a cut chosen against a still frame is choosing blind.
export const DECIDERS = [
  {
    name: 'storyboard',
    scope: 'the storyboard file, and nothing in the scene JSON',
    job: 'decide the film as a whole: the beats, the through-line, the motion plan and the cut plan',
    why: 'it is the lock artefact. Every role below transcribes it, so a gap here becomes an invention further down',
  },
  {
    name: 'subject',
    scope: "each beat's subject slot",
    job: 'decide what each beat SHOWS, and capture or name the real asset that shows it',
    why: '36% of films carry no pictorial layer at all, and what a beat shows is the one thing the engine must never choose alone (engine-doctrine/MISTAKES.md #159)',
  },
  {
    name: 'scene',
    scope: 'exactly one fragment file, named in your brief',
    job: 'write the markup for one beat, and put addressable handles where the motion plan says something must move',
    why: 'HTML renders instantly, so you iterate against your own work with no render. That is the loop, not a critique',
    extra: [
      'Read this film\'s <film>.design.md before writing a size, radius, shadow or colour: reference its --kit-<group>-<name> token, never a literal. A value it does not have yet goes there first.',
    ],
    perScene: true,
  },
  {
    name: 'motion',
    scope: 'motion[] and idle, on layers the storyboard says move',
    job: 'key the motion the storyboard planned, and prove it moved by MEASURING across frames',
    why: 'nothing moves that nobody asked to move, so every keyed track is a decision somebody made',
    extra: [
      'Read this film\'s <film>.design.md before writing a size, radius, shadow or colour: reference its --kit-<group>-<name> token, never a literal. A value it does not have yet goes there first.',
      'You carry a budget. The register split (engine-doctrine/CRAFT/MOTION-REGISTERS.md) licenses sustained motion for kinetic work, and that licence is the door effect soup comes through. One named peak, and every other moving thing able to say what it is for.',
      'Measure the motion across frames; never describe it from the JSON.',
      'The fix for a hole is overlap, never ambient motion: idle, breathe and drift will not satisfy it.',
      'Search the arsenal first (`make arsenal Q="..."`) before hand-keying a new device.',
    ],
  },
  {
    name: 'transition',
    scope: 'transitions[] only',
    job: 'name the relationship across each join, then choose the transition that serves it',
    why: 'the engine narrows the cut by structure, but the rhetorical relationship between two beats is not in the data',
    extra: [
      'Read the RENDERED joins, not the JSON. That is the same admission test the critics are held to: what did you see that the author did not.',
      'Most joins are invisible. Earn two or three accents by meaning and make the outro the simplest one.',
      'Run `make study-tool X=transitions D=<film>` FIRST: it prints every boundary\'s current transition, stated why, '
        + 'and top candidates. Answer the procedure per boundary by writing `transition_why: <relationship> · '
        + '<feeling> · <invisible|expressive>` on the storyboard beat.',
    ],
  },
  {
    name: 'sound',
    scope: 'the audio block only',
    job: 'choose the bed, and place any cue the automatic punctuation cannot derive',
    why: 'cue punctuation is automatic now; choosing a bed is a register decision and the engine stays silent when it has no input',
  },
];

export function buildRoster(scenePath) {
  const abs = path.resolve(repoRoot, scenePath);
  const scene = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const name = path.basename(scenePath, '.json');
  const D = path.relative(repoRoot, abs);
  const dir = path.dirname(D);
  const storyboard = `${dir}/${name}.storyboard.md`;
  const flat = flatLayers(scene.layers);
  const fragments = flat
    .filter((L) => L.type === 'html' && typeof L.src === 'string')
    .map((L) => L.src);
  const beatBlocks = flat.filter((L) => L.type === 'beat').length;
  const beats = beatBlocks
    || ((scene.transitions || []).length ? scene.transitions.length + 1 : 0)
    || (scene.layers || []).length;
  const ctx = {
    scene: D,
    name,
    storyboard,
    hasStoryboard: fs.existsSync(path.resolve(repoRoot, storyboard)),
    fragments,
    beats,
    transitions: (scene.transitions || []).length,
    hasAudio: !!scene.audio,
    theme: scene.theme || '(none)',
    aspect: scene.aspect || '16:9',
    duration: scene.duration,
    baseSha: currentSha(),
    contract: worktreeContract(),
  };
  const stage = stageOf(scenePath).stage;
  const sbText = ctx.hasStoryboard ? fs.readFileSync(path.resolve(repoRoot, storyboard), 'utf8') : null;
  const features = computeFeatures(scene, sbText);
  const roster = DECIDERS.map((d) => {
    const lines = [
      `You are the "${d.name}" decider for ${ctx.scene}.`,
      `You WRITE: ${d.scope}. You touch nothing else, and you do not edit another role's field.`,
      `Your job: ${d.job}.`,
      `You exist because ${d.why}.`,
      '',
      `The film: ${ctx.beats} beat(s), ${ctx.fragments.length} html fragment(s), ${ctx.duration}s, ${ctx.aspect}, theme ${ctx.theme}, ${ctx.transitions} authored transition(s).`,
      ctx.fragments.length && ctx.fragments.length !== ctx.beats
        ? `Those two counts differ on purpose: ${ctx.fragments.length} hand-written surface(s) serve ${ctx.beats} beat(s). A fragment reused across beats is the continuity plan working, not a gap.`
        : null,
      ctx.hasStoryboard
        ? `Read the storyboard first: ${ctx.storyboard}. It is the source; you transcribe it, you do not re-decide it.`
        : `There is NO storyboard at ${ctx.storyboard}. Nothing below you can start until the storyboard decider writes one.`,
    ];
    if (d.perScene && ctx.fragments.length) {
      lines.push('', 'Launch ONE of these per fragment, each owning exactly one file:');
      for (const f of ctx.fragments) lines.push(`  · ${f}`);
    }
    if (d.extra) { lines.push(''); for (const e of d.extra) lines.push(e); }
    const categories = DECIDER_CATEGORIES[d.name] || null;
    const pin = DECIDER_PIN[d.name] || null;
    const rules = categories ? rulesFor({ stage, features, categories, maxChars: 800, pin }) : [];
    if (rules.length) {
      lines.push('', `Craft rules for this role (${categories.join(', ')}):`);
      for (const r of rules) lines.push(`  ${briefLine(r)}`);
    }
    lines.push(
      '',
      'Standing rules: no em-dashes anywhere. Stage explicit paths. Do not block on a background render.',
      'Do not delegate to sub-agents.',
      'Your handoff to the main thread is what you did, what you found, any concerns, and any deviations from this brief, in 300 words or fewer, and nothing else.',
      '',
      `Worktree agent contract (engine-doctrine/CRAFT/SUBAGENTS.md), base sha ${ctx.baseSha}:`,
      ctx.contract || '  ! engine-doctrine/CRAFT/SUBAGENTS.md has no worktree-contract block. Fix the doc before briefing further.',
    );
    return { name: d.name, scope: d.scope, prompt: lines.filter((l) => l !== null).join('\n') };
  });
  return { ...ctx, roster };
}

function findCitedStudy(sbText) {
  const m = sbText.match(/refs\/[\w.-]+\.(?:mp4|mov|webm)/);
  if (!m) return null;
  const cited = m[0];
  const refsDir = path.resolve(repoRoot, 'refs');
  if (!fs.existsSync(refsDir)) return null;
  for (const name of fs.readdirSync(refsDir)) {
    const studyJson = path.join(refsDir, name, 'study.json');
    if (!fs.existsSync(studyJson)) continue;
    let study;
    try { study = JSON.parse(fs.readFileSync(studyJson, 'utf8')); } catch { continue; }
    if (study.source !== cited) continue;
    const sheet = path.join(refsDir, name, 'sheet.png');
    const frames = path.join(refsDir, name, 'frames');
    if (!fs.existsSync(sheet) || !fs.existsSync(frames)) continue;
    return { source: cited, sheet: path.relative(repoRoot, sheet), frames: path.relative(repoRoot, frames) };
  }
  return null;
}

// Issara Willenskomer's 12 UX-in-Motion principles (medium.com/ux-in-motion, "Creating Usability
// with Motion"), asked as a naming exercise rather than scored directly: an unnamed principle a beat
// obviously needs folds into the existing motion-variety code, not a new one.
function uxMotionChecklistLines() {
  return [
    'UX-in-Motion checklist (Issara Willenskomer, 12 principles: easing, offset & delay, parenting, '
      + 'transformation, value change, masking, overlay, cloning, obscuration, parallax, dimensionality, '
      + 'dolly & zoom): name which ones this plan uses and where, beat by beat. A beat that obviously '
      + 'changes a value or masks a reveal but names no principle is a motion-variety gap (code: motion-variety).',
    '',
  ];
}

// Works from the storyboard alone: a plan-stage film may have no scene.json yet (scaffold not run)
// or one with no fragments (design not started), and this must judge it anyway.
export function buildPlanJudgeBrief(arg) {
  const p = filePaths(arg);
  if (!fs.existsSync(p.sb)) throw new Error(`no storyboard at ${path.relative(repoRoot, p.sb)}`);
  const sbText = fs.readFileSync(p.sb, 'utf8');
  const fm = frontmatter(sbText);
  const sceneExists = fs.existsSync(p.scene);
  const scene = sceneExists ? (() => { try { return JSON.parse(fs.readFileSync(p.scene, 'utf8')); } catch { return {}; } })() : {};
  const features = computeFeatures(scene, sbText);
  const fragments = sceneExists
    ? flatLayers(scene.layers).filter((L) => L.type === 'html' && typeof L.src === 'string').map((L) => L.src)
    : [];
  const themeRel = scene.theme ? `themes/${scene.theme}.json` : fm.field('theme');
  let themeTokens = null;
  if (themeRel) {
    try {
      const t = expandThemeFile(JSON.parse(fs.readFileSync(path.resolve(repoRoot, themeRel), 'utf8')));
      themeTokens = { palette: t.palette, vars: t.vars };
    } catch { /* not every plan-stage film has a resolvable theme yet, not fatal to this brief */ }
  }
  const decider = DECIDERS.find((d) => d.name === 'storyboard');
  const categories = DECIDER_CATEGORIES.storyboard;
  const rules = rulesFor({ stage: 'plan', features, categories, maxChars: 1200 });
  const digest = hashOf(p.sb);
  const study = findCitedStudy(sbText);

  const lines = [
    `You are the plan judge for ${path.relative(repoRoot, p.sb)}.`,
    `You REPORT findings only. You do not write into the storyboard or the scene, and you never `
      + `record PASS: the owner reads the draft render and redirects.`,
    `You exist because ${decider.why}.`,
    `This judges craft, not structure. quality/gates/storyboard-check.mjs already owns structure `
      + `(fields present, holds inside the genre band, no placeholder copy) and keeps it; the questions `
      + `below are the ones an exit code cannot answer.`,
    '',
    `Judge exactly these six questions. Return a finding ONLY where the plan actually falls short: a `
      + `brief that could describe any film is a failed brief, so do not pad the list.`,
    '  - through-line: is there ONE through-line, or several competing ones? (code: through-line)',
    '  - beat-pacing: does every beat earn its seconds, none padded or starved? (code: beat-pacing)',
    '  - spectacle: is the nominated SPECTACLE actually the loudest moment, or does something else upstage it? (code: spectacle)',
    '  - eye-path: does the eye path hold across beats, or does attention have nowhere to land? (code: eye-path)',
    '  - motion-variety: does the motion plan vary, or repeat one idea beat after beat? (code: motion-variety)',
    '  - field-craft: does the craft block describe an actual visible surface treatment (flat, textured, '
      + 'generative: light, particles, a shader), or only a colour, a number or an adjective that could '
      + 'be written without looking at the reference? (code: field-craft)',
    '',
    ...uxMotionChecklistLines(),
    ...(study ? [
      `Reference study for the clip this storyboard cites (${study.source}). OPEN THESE FIRST: `
        + `field-craft cannot be answered from the text below, only from what these show.`,
      `  · ${study.sheet} (contact sheet, one row per shot)`,
      `  · ${study.frames}/ (the individual frames behind it)`,
      '',
    ] : []),
    `The storyboard (${fragments.length} fragment(s) written so far, ${scene.duration || fm.field('duration') || '?'} target):`,
    '```',
    sbText,
    '```',
  ];
  if (fragments.length) {
    lines.push('', 'Fragments already written:');
    for (const f of fragments) lines.push(`  · ${f}`);
  }
  if (themeTokens) lines.push('', `Theme tokens (${themeRel}):`, '```json', JSON.stringify(themeTokens, null, 2), '```');
  if (rules.length) {
    lines.push('', `Craft rules for this role (${categories.join(', ')}):`);
    for (const r of rules) lines.push(`  ${briefLine(r)}`);
  }
  lines.push(
    '',
    'Standing rules: no em-dashes anywhere. Do not delegate to sub-agents. Report only, never fix.',
    `Return ONLY this JSON shape, no prose: { "findings": [ { "code": "<one of ${PLAN_JUDGE_CODES.join('|')}>", "note": "..." } ] }`,
    '(empty findings array if the plan holds on all six).',
    '',
    `Digest of the storyboard this brief was built from, so a recorded verdict can be checked for `
      + `staleness later: ${digest}`,
  );
  return { storyboard: path.relative(repoRoot, p.sb), scene: sceneExists ? path.relative(repoRoot, p.scene) : null,
    digest, prompt: lines.filter((l) => l !== null).join('\n') };
}

function copyLines(scene) {
  const out = [];
  for (const L of flatLayers(scene.layers)) {
    if (typeof L.text === 'string' && L.text.trim()) out.push({ layer: L.id || L.type, text: L.text });
  }
  return out;
}

export function buildPanel(scenePath, vs) {
  const abs = path.resolve(repoRoot, scenePath);
  const scene = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const name = path.basename(scenePath, '.json');
  const D = path.relative(repoRoot, abs);
  const mp4 = `out/${name}.mp4`;
  const lines = copyLines(scene);

  const critics = ROSTER.filter((c) => !c.skipUnless || c.skipUnless(scene)).map((c) => {
    const inputDesc = c.input(name, vs, D);
    const produce = c.produce(D, vs, name);
    let prompt = `You are the "${c.name}" critic. Your ONLY job: ${c.job}.\n`
      + `Read exactly this input, nothing else: ${inputDesc}.\n`;
    if (produce) prompt += `If it does not exist yet, produce it first: ${produce}\n`;
    if (c.name === 'copy') {
      prompt += `The strings (${lines.length}):\n` + lines.map((l, i) => `  ${i + 1}. [${l.layer}] ${l.text}`).join('\n') + '\n';
    }
    prompt += `Return ONLY this JSON shape, no prose: ${c.verdict}\n`
      + `Do not fix anything. Do not edit the scene. Report only.`;
    return { name: c.name, job: c.job, input: inputDesc, produce, verdict: c.verdict, prompt };
  });

  return { scene: D, name, mp4, critics };
}

function main() {
  const argv = process.argv;
  const flagPos = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
  const filmArg = () => argv.find((a, i) => i >= 2 && !a.startsWith('--')
    && argv[i - 1] !== '--record-plan' && argv[i - 1] !== '--record' && argv[i - 1] !== '--vs');

  if (argv.includes('--plan-judge')) {
    const arg = filmArg();
    if (!arg) { console.error('usage: node harness/author/critics.mjs <film|storyboard.md> --plan-judge'); process.exit(2); }
    let brief;
    try { brief = buildPlanJudgeBrief(arg); }
    catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
    console.log(`\n  PLAN JUDGE · ${brief.storyboard}\n`);
    console.log('  Launch ONE Agent call with this brief. It reports findings only, never a write, never a PASS.\n');
    console.log(brief.prompt);
    console.log(`\n  When it reports, record the findings:`);
    console.log(`    node harness/author/critics.mjs ${arg} --record-plan <verdict.json>\n`);
    return;
  }

  if (argv.includes('--record-plan')) {
    const arg = filmArg();
    const verdictFile = flagPos('--record-plan');
    if (!arg || !verdictFile) { console.error('usage: node harness/author/critics.mjs <film> --record-plan <verdict.json>'); process.exit(2); }
    const p = filePaths(arg);
    if (!fs.existsSync(p.sb)) { console.error(`✗ no storyboard at ${path.relative(repoRoot, p.sb)}`); process.exit(2); }
    let verdict;
    try { verdict = JSON.parse(fs.readFileSync(path.resolve(repoRoot, verdictFile), 'utf8')); }
    catch (e) { console.error(`✗ ${verdictFile} is not valid JSON: ${e.message}`); process.exit(2); }
    const rawFindings = Array.isArray(verdict.findings) ? verdict.findings : [];
    const bad = rawFindings.find((fd) => !isPlanJudgeCode(fd && fd.code));
    if (bad) {
      console.error(`✗ "${bad && bad.code}" is not a plan-judge finding code. Valid codes: ${PLAN_JUDGE_CODES.join(', ')}`);
      process.exit(2);
    }
    const findings = rankPlanJudgeFindings(rawFindings);
    const rec = writeReceipt('plan-judge', p.sb, { findings, ranAt: new Date().toISOString() });
    if (!rec) { console.error(`✗ could not write the plan-judge receipt (is ${p.sb} readable?)`); process.exit(1); }
    console.log(`  ✓ plan-judge verdict recorded: ${findings.length} finding(s), ordered by Murch's Rule of Six `
      + `(emotion > story > rhythm > eye-trace > plane/continuity) · `
      + `${path.relative(repoRoot, receiptPath('plan-judge', p.sb))}`);
    console.log(`  Findings only. This does not pass or fail the film; the owner reads the draft render `
      + `(make dev D=${p.base}.json) and redirects.`);
    return;
  }

  if (argv.includes('--show-plan-verdict')) {
    const arg = filmArg();
    if (!arg) { console.error('usage: node harness/author/critics.mjs <film> --show-plan-verdict'); process.exit(2); }
    const p = filePaths(arg);
    const r = readReceipt('plan-judge', p.sb);
    if (!r.exists) { console.log(`  no plan-judge verdict recorded for ${path.relative(repoRoot, p.sb)}`); return; }
    if (r.stale) {
      console.error(`\n  ✗ plan-judge verdict: STALE. ${path.relative(repoRoot, p.sb)} changed since this verdict `
        + `was recorded (recorded hash ${r.receipt.hash}, current ${r.hash}).\n`
        + `    Refusing rather than reporting a pass over a plan this verdict can no longer see.\n`
        + `    Re-run: node harness/author/critics.mjs ${arg} --plan-judge\n`);
      process.exit(3);
    }
    console.log(JSON.stringify(r.receipt, null, 2));
    return;
  }

  const file = process.argv.find((a) => a.endsWith('.json') && !a.includes('--record'));
  const recordIdx = process.argv.indexOf('--record');
  const recordFile = recordIdx >= 0 ? process.argv[recordIdx + 1] : null;
  if (!file) {
    console.error('usage: node harness/author/critics.mjs <scene.json> [--record <panels.json>]');
    process.exit(2);
  }
  const abs = path.resolve(repoRoot, file);
  if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

  const vsIdx = process.argv.indexOf('--vs');
  const vs = vsIdx >= 0 ? process.argv[vsIdx + 1] : undefined;

  if (process.argv.includes('--deciders')) {
    const r = buildRoster(file);
    console.log(`\n  DECIDER ROSTER · ${r.scene}\n`);
    console.log('  Deciders WRITE into the film; critics only report. Run these IN ORDER, not in parallel:');
    console.log('  each one reads what the one above it decided. The scene deciders are the exception,');
    console.log('  one per fragment, and those do run in parallel.\n');
    console.log('  Motion comes BEFORE transitions: the content-aware cut reads velocity at the joint,');
    console.log('  so a cut chosen before the motion exists is choosing against a still frame.\n');
    if (!r.hasStoryboard) console.log(`  ! no storyboard at ${r.storyboard}. Step 1 is not optional.\n`);
    r.roster.forEach((d, i) => {
      console.log(`  ── ${i + 1}. ${d.name} ${'─'.repeat(Math.max(1, 56 - d.name.length))}`);
      console.log(d.prompt.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('');
    });
    console.log('  Then the critic panel, in ONE parallel message:');
    console.log(`    node harness/author/critics.mjs ${file}\n`);
    return;
  }

  if (!recordFile) {
    const panel = buildPanel(file, vs);
    console.log(`\n  CRITIC PANEL · ${panel.scene}\n`);
    console.log(`  Launch these ${panel.critics.length} in ONE message, several Agent calls, so they run in parallel.`);
    console.log(`  Critics report, the main thread fixes. A critic is evidence, never a ruling.\n`);
    for (const c of panel.critics) {
      console.log(`  ── ${c.name} ${'─'.repeat(Math.max(1, 60 - c.name.length))}`);
      console.log(c.prompt.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('');
    }
    console.log(`  When all six report, collect their verdicts into one JSON file`);
    console.log(`  ({ "<critic>": <verdict> } per name) and record it:`);
    console.log(`    node harness/author/critics.mjs ${file} --record <panels.json>\n`);
    return;
  }

  const recAbs = path.resolve(repoRoot, recordFile);
  if (!fs.existsSync(recAbs)) { console.error(`✗ no such panels file: ${recordFile}`); process.exit(2); }
  let panels;
  try { panels = JSON.parse(fs.readFileSync(recAbs, 'utf8')); }
  catch (e) { console.error(`✗ ${recordFile} is not valid JSON: ${e.message}`); process.exit(2); }

  const names = ROSTER.map((c) => c.name);
  let passCount = 0;
  const critics = {};
  for (const n of names) {
    const v = panels[n];
    if (!v) continue; // critic wasn't run this panel (e.g. skipped, or fidelity on a non-recreation)
    const findings = Array.isArray(v.findings) ? v.findings : [];
    const pass = v.pass !== undefined ? !!v.pass : findings.length === 0;
    if (pass) passCount++;
    critics[n] = { pass, findings };
  }
  const ran = Object.keys(critics).length;

  const rec = writeReceipt('panels', abs, { critics, ranAt: new Date().toISOString() });
  if (!rec) { console.error(`✗ could not write the panel receipt (is ${file} readable?)`); process.exit(1); }
  console.log(`  ✓ ${passCount} of ${ran} critics pass · quality/baselines/approved/panels/${path.basename(file, '.json')}.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
