// scripts/author/critics.mjs: THE CRITIC PANEL, as an invokable, recorded step.
//
// docs/CRAFT/SUBAGENTS.md defines six standing critics (beat · bg-motion · reveal · fidelity · copy ·
// seam), each with one job, one input path, one verdict shape, and says to run them in parallel and
// record what they find. That doc was an argument nobody could invoke: launching the panel meant
// re-deriving six prompts by hand from a table, and "record it" meant a bare instruction with nowhere
// to write to. This is the tool half: it prints the six prompts, concrete for THIS scene, for the main
// thread to copy into six parallel Agent calls, and it writes the receipt SUBAGENTS.md asks for once
// the main thread reports back what each critic found.
//
// This file does NOT launch agents. Launching is the harness's job (Agent tool calls in one message);
// this only composes what to hand each one and records what came back. Pure fs + JSON, no side effects
// on import.
//
//   node scripts/author/critics.mjs formats/scene/x.json                 # emit the six prompts
//   node scripts/author/critics.mjs formats/scene/x.json --record p.json # write the panel receipt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReceipt } from '../lib/receipt.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The roster, kept in lockstep with docs/CRAFT/SUBAGENTS.md's table. `ab` is listed there as built-then-
// cut (nothing runs today), so it is not in this roster. Each `input` is a function of the scene's
// paths, matching the table's "input it is handed" column exactly.
export const ROSTER = [
  {
    name: 'beat',
    job: 'does each beat read at a glance',
    input: (name, vs) => `/tmp/beats/${name}.png` + (vs ? ` (produced with VS=${vs}, source-section shot beside each beat)` : ''),
    produce: (D, vs) => `make beats D=${D}${vs ? ` VS=${vs}` : ''}`,
    verdict: '{ findings: [ { beat, reads: "yes"|"no", flaw, fix } ] }',
  },
  {
    name: 'bg-motion',
    job: 'speed, scale and direction of anything that moves continuously',
    input: () => 'a 4+ frame strip, reference and render at matched timestamps (pull frames with `make frame D=<file> N=<n>`)',
    produce: (D) => `make frame D=${D} N=<n>  (repeat for 4+ timestamps; pair with the reference at the same n)`,
    verdict: '{ findings: [ { axis: "speed"|"scale"|"direction", ours, reference, delta, fix } ] }',
  },
  {
    name: 'reveal',
    job: 'how each beat enters and exits, never the settled frame',
    input: (name) => `/tmp/reveal/${name}.png`,
    produce: (D) => `make reveal D=${D}`,
    verdict: '{ findings: [ { beat, enter, exit, paired: "yes"|"no", flaw, fix } ] }',
  },
  {
    name: 'fidelity',
    job: 'recreations only: how close each beat is to its source',
    input: (name) => `/tmp/beats/${name}.png (render frames) beside the source section shots`,
    produce: (D, vs) => `make beats D=${D}${vs ? ` VS=${vs}` : ' VS=<brand>'}`,
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
    produce: (D, vs, name) => `make seam-check D=${D}  (requires out/${name}.mp4, render first)`,
    verdict: '{ findings: [ { seam, flash: "yes"|"no", evidence, fix } ] }',
  },
];

function flatLayers(ls) {
  return (ls || []).flatMap((L) => [L, ...flatLayers(L.layers), ...flatLayers(L.children)]);
}

// Every on-screen string in beat order, for the `copy` critic. "Beat order" here means layer order in
// the JSON, the only order the tool can see without rendering.
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

// ---- CLI --------------------------------------------------------------------------------------------
function main() {
  const file = process.argv.find((a) => a.endsWith('.json') && !a.includes('--record'));
  const recordIdx = process.argv.indexOf('--record');
  const recordFile = recordIdx >= 0 ? process.argv[recordIdx + 1] : null;
  if (!file) {
    console.error('usage: node scripts/author/critics.mjs <scene.json> [--record <panels.json>]');
    process.exit(2);
  }
  const abs = path.resolve(repoRoot, file);
  if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

  const vsIdx = process.argv.indexOf('--vs');
  const vs = vsIdx >= 0 ? process.argv[vsIdx + 1] : undefined;

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
    console.log(`    node scripts/author/critics.mjs ${file} --record <panels.json>\n`);
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
  console.log(`  ✓ ${passCount} of ${ran} critics pass · verify/approved/panels/${path.basename(file, '.json')}.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
