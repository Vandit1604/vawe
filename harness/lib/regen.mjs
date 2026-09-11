// harness/lib/regen.mjs: `make regen` (FIX 8): write every generated file in one command.
//
// `make check` already runs generated-check READ-ONLY (schema enums, catalogue, doc counts, rules-build)
// and reports drift; this is its write half, so the fix for reported drift is one command, not a
// checklist of four. Runs, in order:
//   1. schema-write         (quality/gates/schema-drift.mjs --write)
//   2. generated-check       (quality/gates/generated-check.mjs --write; the catalogue/doc-count generators)
//   3. rules-build           (scripts/site/rules-build.mjs)
//   4. kit re-paste          (D=<film> only) re-paste the golden STAGEKIT block into every fragment this
//                            film uses, byte-identical, then run kitCheck to prove it landed.
//
// Step 4 does not edit harness/lib/stagekit.mjs or harness/author/stagekit.mjs (another agent's file);
// it only IMPORTS the golden-block builder and the verifier those files already export (buildKit,
// extractKitBlock, kitCheck) and does the one thing neither file does today: write the block back into
// a fragment that already carries one but has drifted. A fragment with NO block at all is not a drift,
// it never opted in, so this never inserts one; kitCheck still names it afterward.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { buildKit, extractKitBlock, kitCheck } from './stagekit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (label, cmd, args) => {
  console.log(`\n▶ ${label}`);
  const r = spawnSync('node', [cmd, ...args], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
};

// Same fragment-discovery a film's own layers name, mirroring harness/author/stagekit.mjs --check: the
// film's `src` values are authoritative, the numbered <base>.sceneN.html sweep is the fallback for a
// fan-out still in progress.
function fragmentsFor(film) {
  const base = path.basename(film, '.json');
  const dir = path.dirname(film);
  const seen = new Set(), fragments = [];
  const add = (p0) => {
    const abs = path.resolve(ROOT, p0);
    if (!fs.existsSync(abs) || seen.has(abs)) return;
    seen.add(abs);
    fragments.push({ path: path.relative(ROOT, abs), abs, src: fs.readFileSync(abs, 'utf8') });
  };
  const walk = (ls) => { for (const L of ls || []) {
    if (L && typeof L === 'object') {
      if (typeof L.src === 'string' && L.src.endsWith('.html')) add(L.src);
      walk(L.layers); walk(L.children);
    }
  } };
  try { walk(JSON.parse(fs.readFileSync(path.resolve(ROOT, film), 'utf8')).layers); } catch { /* fall back to numbered sweep */ }
  for (let n = 1; n <= 30; n++) add(path.join(dir, `${base}.scene${n}.html`));
  return fragments;
}

function kitRepaste(film) {
  console.log(`\n▶ kit re-paste (D=${film})`);
  let scene;
  try { scene = JSON.parse(fs.readFileSync(path.resolve(ROOT, film), 'utf8')); }
  catch (e) { console.log(`  · skipped: ${film} is not readable JSON (${e.message})`); return 0; }
  const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
  const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
  let theme;
  try { theme = themeFile ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : scene.theme; }
  catch { theme = null; }
  if (!theme) { console.log(`  · skipped: ${film} names no resolvable theme`); return 0; }
  const { block } = buildKit(theme, resolveLook, isLightBg);
  const fragments = fragmentsFor(film);
  if (!fragments.length) { console.log(`  · ${film} names no .html fragments; nothing to re-paste`); return 0; }
  let pasted = 0;
  for (const f of fragments) {
    const got = extractKitBlock(f.src);
    if (got == null) continue;              // never opted in: not a drift, kitCheck below still names it
    if (got === block) continue;             // already golden
    fs.writeFileSync(f.abs, f.src.replace(got, block));
    pasted++;
  }
  console.log(`  re-pasted ${pasted}/${fragments.length} fragment(s)`);
  const fresh = fragments.map((f) => ({ path: f.path, src: fs.readFileSync(f.abs, 'utf8') }));
  const { ok, findings } = kitCheck(block, fresh);
  for (const finding of findings) console.log(`  ~ [${finding.code}] ${finding.message}`);
  console.log(ok ? '  ✓ every fragment now carries a byte-identical kit block' : '  ✗ kitCheck still finds drift after re-paste');
  return ok ? 0 : 1;
}

const film = process.argv[2] || process.env.D || null;
let failed = 0;
failed |= run('schema-write', 'quality/gates/schema-drift.mjs', ['--write']);
failed |= run('generated-check --write', 'quality/gates/generated-check.mjs', ['--write']);
failed |= run('rules-build', 'scripts/site/rules-build.mjs', []);
if (film) failed |= kitRepaste(film);
console.log(`\n${failed ? '✗ regen finished with a step that could not fully resolve itself; see above.' : '✓ regen finished. Every generated file is current.'}`);
process.exit(failed ? 1 : 0);
