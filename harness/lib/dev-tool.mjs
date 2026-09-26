import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const json = () => (env.JSON ? ['--json'] : []);
const stamp = () => (env.STAMP ? ['--stamp'] : []);

// One-off dev/maintenance tools nobody calls through `make <name>` directly (each had its own
// Makefile target with no caller anywhere in the repo). Folded here so the capability stays
// reachable without adding to the target list every agent reads. Keep alphabetical.
const write1 = () => (env.WRITE === '1' ? ['--write'] : []);
const strict1 = () => (env.STRICT === '1' ? ['--strict'] : []);

export const TOOLS = {
  'author-check': () => ['quality/gates/author-check.mjs', env.D, ...strict1(), ...(env.TASTE === '1' ? ['--taste'] : []), ...(env.VS ? ['--vs', env.VS] : [])],
  'batch': () => ['harness/author/batch.mjs', env.TPL, env.DATA],
  'beats': () => ['harness/author/beats.mjs', env.D, ...(env.VS ? ['--vs', env.VS] : []), ...(env.STRIDE ? ['--stride', env.STRIDE] : [])],
  'blocking-findings-check': () => ['harness/dev/blocking-findings-check.mjs', ...json(), ...stamp()],
  'blurbs': () => ['harness/dev/blurb-retrieval.mjs', ...(env.ALL ? ['--all'] : [])],
  'capture-motion': () => ['harness/author/capture-motion.mjs', env.URL, env.SEL, ...(env.ONLOAD ? ['--onload'] : []), ...(env.DUR ? ['--dur', env.DUR] : [])],
  'cinematic': () => ['harness/author/cinematic.mjs', env.D, ...write1()],
  'compare': () => ['quality/gates/compare.mjs', ...(env.ARGS ? env.ARGS.trim().split(/\s+/) : [])],
  'concept': () => ['harness/author/concept.mjs', env.SB, ...(env.N ? ['--n', env.N] : []), ...(env.SEED ? ['--seed', env.SEED] : []), ...strict1()],
  'concept-pick': () => ['harness/author/concept.mjs', env.SB, '--pick', env.OPTION],
  'contract': () => ['harness/author/contract.mjs', env.D],
  'core-node-boundary': () => ['harness/dev/core-node-boundary.mjs'],
  'critics': () => ['harness/author/critics.mjs', env.D, ...(env.VS ? ['--vs', env.VS] : []), ...(env.DECIDERS ? ['--deciders'] : []), ...(env.RECORD ? ['--record', env.RECORD] : [])],
  'design-spec': () => ['harness/author/design-spec.mjs', env.D],
  'direct': () => ['harness/author/motion-director.mjs', env.D, ...write1()],
  'draft': () => ['quality/gates/draft-check.mjs', env.D, '--stage', env.STAGE || '85', ...json()],
  'effect-posters': () => ['scripts/site/effect-posters.mjs', ...(env.ONLY ? ['--only', env.ONLY] : [])],
  'engine-sync': () => ['scripts/site/site-engine.mjs', ...(env.CHECK ? ['--check'] : [])],
  'expand': () => ['harness/author/expand-blocks.mjs', env.D],
  'export-edl': () => ['harness/media/export-edl.mjs', env.D, ...(env.OUT ? ['--out', env.OUT] : [])],
  'frame': () => ['harness/author/preview.mjs', 'scene', env.N, ...(env.D ? ['--data', env.D] : [])],
  'gate-classification': () => ['quality/gates/gate-classification.mjs'],
  'gate-test': () => ['quality/gates/gate-mutation.mjs'],
  'house-style': () => ['scripts/brand/house-style.mjs', env.NAME, env.THEME],
  'ingest': () => ['harness/media/ingest.mjs', env.SRC, env.NAME, ...(env.THRESHOLD ? ['--threshold', env.THRESHOLD] : [])],
  'intent': () => ['scripts/brand/intent-from-storyboard.mjs'],
  'invent-look': () => ['harness/author/invent-look.mjs', env.SB, ...(env.SEED ? ['--seed', env.SEED] : []), ...(env.COUNT ? ['--count', env.COUNT] : []), ...(env.PICK ? ['--pick', env.PICK] : []), ...(env.NAME ? ['--name', env.NAME] : []), ...(env.FORCE ? ['--force'] : []), ...(env.JSON === '1' ? ['--json'] : [])],
  'knowledge-audit': () => ['harness/lib/knowledge-audit.mjs'],
  'ledger': () => ['quality/gates/ledger.mjs', 'check', env.D, ...json()],
  'ledger-add': () => ['quality/gates/ledger.mjs', 'add', env.D, ...json()],
  'mcp-smoke': () => ['mcp/smoke.mjs', '--no-render'],
  'no-judge': () => ['quality/gates/ledger.mjs', 'unjudged', ...stamp(), ...json()],
  'og': () => ['scripts/site/og-image.mjs'],
  'panels': () => ['harness/author/panels.mjs', env.SB, ...(env.OUT ? ['--out', env.OUT] : [])],
  'pitch': () => ['harness/author/pitch.mjs', env.NAME, ...(env.CHOSE ? ['--chose', env.CHOSE] : []), ...(env.LEFT ? ['--left', env.LEFT] : [])],
  'preflight': () => ['quality/gates/preflight.mjs', env.D, '--record'],
  'quiz-apply': () => ['harness/author/quiz.mjs', '--apply', '--answers', env.ANSWERS, '--name', env.NAME, ...(env.OUT ? ['--out', env.OUT] : []), ...(env.SLUG ? ['--slug', env.SLUG] : [])],
  'quiz-look': () => ['harness/author/quiz.mjs', '--look', '--sb', env.SB, ...(env.N ? ['--n', env.N] : [])],
  'quiz-round2': () => ['harness/author/quiz.mjs', '--round', '2', '--placement', env.PLACEMENT, '--job', env.JOB],
  'recreate': () => ['harness/author/recreate.mjs', env.NAME, ...(env.THEME ? ['--theme', env.THEME] : []), ...(env.OUT ? ['--out', env.OUT] : [])],
  'reveal': () => ['harness/author/reveal.mjs', env.D, ...(env.ENTER ? ['--enter', env.ENTER] : []), ...(env.N ? ['--n', env.N] : []), ...(env.LAYERS === '1' ? ['--layers'] : [])],
  'route': () => ['harness/author/route.mjs', env.Q],
  'scenes': () => ['harness/author/scenes.mjs', env.D],
  'screen': () => ['harness/author/screen.mjs', env.F, ...(env.KIND ? ['--kind', env.KIND] : []), ...(env.THEME ? ['--theme', env.THEME] : []), ...(env.INVENT ? ['--invent'] : []), ...(env.REF ? ['--ref', env.REF] : []), ...(env.ACT ? ['--act', env.ACT] : []), ...(env.W ? ['--w', env.W] : []), ...(env.H ? ['--h', env.H] : []), ...(env.D ? ['--film', env.D] : [])],
  'script': () => ['harness/author/script.mjs', env.SB, ...strict1()],
  'sfx-catalog': () => ['harness/author/sfx-catalog.mjs'],
  'sheets': () => ['harness/author/sheets.mjs', env.D, ...(env.VS ? ['--vs', env.VS] : [])],
  'stagekit': () => ['harness/author/stagekit.mjs', env.D, ...(env.CHECK ? ['--check'] : [])],
  'storyboard-decide-ratchet': () => ['quality/gates/storyboard-check.mjs', '--ratchet', ...stamp()],
  'storyboard-draft': () => ['scripts/brand/storyboard-draft.mjs'],
  'style-drop-check': () => ['harness/dev/style-drop-check.mjs'],
  'styleframes': () => ['harness/author/styleframes.mjs', env.D, ...(env.N ? ['--n', env.N] : [])],
  'timings': () => ['harness/lib/timings.mjs', env.D, env.N],
  'token-cost': () => ['harness/dev/token-cost.mjs', ...(env.SINCE ? ['--since', env.SINCE] : []), ...(env.SESSION ? ['--session', env.SESSION] : []), ...(env.LIMIT ? ['--limit', env.LIMIT] : []), ...json(), ...(env.SELFTEST ? ['--self-test'] : [])],
  'treatment': () => ['harness/author/treatment.mjs', env.SB, ...(env.THEME ? ['--theme', env.THEME] : [])],
  'waivers': () => ['quality/gates/waiver-drift.mjs', env.D, ...json()],
  'waiver-ratchet': () => ['quality/gates/waiver-drift.mjs', '--ratchet', ...stamp()],
  'worktree-status': () => ['harness/dev/worktree-status.mjs'],
};

// Entries that shell out to another make target/binary instead of one script.
export const CUSTOM = {
  // eject BLOCK=<name> in D=<film> into its own literal layers, tagged ejectedFrom (the source block
  // name and the commit this ran at): the film owns the layers from then on, no factory left in the
  // way. ID=<layer id> disambiguates when the film carries more than one instance of the same block.
  'add': () => {
    if (!env.BLOCK || !env.D) {
      console.error('usage: make dev-tool X=add BLOCK=<name> D=<film.json> [ID=<layer id>]');
      return 1;
    }
    return spawnJs('harness/author/eject-block.mjs', []);
  },
  'animatic': () => {
    const r1 = spawnJs('harness/author/animatic.mjs', [env.SB, ...(env.VOICE ? ['--voice', env.VOICE] : []), ...(env.OUT ? ['--out', env.OUT] : [])]);
    if (r1) return r1;
    const p = spawnSync(process.execPath, [path.join(ROOT, 'harness/author/animatic.mjs'), env.SB, ...(env.OUT ? ['--out', env.OUT] : []), '--path'], { cwd: ROOT, encoding: 'utf8' });
    const f = (p.stdout || '').trim();
    return spawnSync(path.join(ROOT, 'bin/vawe'), [f, '--draft', '--workers', '2'], { stdio: 'inherit', cwd: ROOT }).status || 0;
  },
  'audit-test': () => spawnJs('quality/gates/contrast-regression.mjs', []) || spawnJs('quality/gates/measure-regression.mjs', []),
  'bench': () => runMake(['build']) || spawnJs('harness/dev/bench.mjs', ['all', ...(env.STAMP ? ['--stamp'] : []), ...json()]),
  'bench-session': () => spawnJs('harness/dev/bench.mjs', ['session', env.T, ...json()]),
  'clean': () => spawnSync('sh', ['-c', 'rm -rf bin out/*.mp4'], { cwd: ROOT, stdio: 'inherit' }).status || 0,
  'coverage-reel': () => spawnJs('harness/author/coverage-reel.mjs', []) || runMake(['video', 'D=films/scene/_coverage-reel.json']),
  'demo': () => {
    const p = spawnSync(process.execPath, [path.join(ROOT, 'harness/dev/demo.mjs'), '--print-path', '--q', env.Q || '', ...(env.NAME ? ['--name', env.NAME] : []), ...(env.FX ? ['--fx', env.FX] : []), ...(env.SUBJECT ? ['--subject', env.SUBJECT] : [])], { cwd: ROOT, encoding: 'utf8' });
    const f = (p.stdout || '').trim();
    if (!f) return p.status || 1;
    return runMake(['dev', `D=${f}`]);
  },
  'edge-check': () => spawnJs('quality/gates/edge-check.mjs', [env.D, ...json()]),
  'formats': () => runMake(['build']) || (spawnSync(path.join(ROOT, 'bin/vawe'), ['--list'], { stdio: 'inherit', cwd: ROOT }).status || 0),
  'plan-judge': () => spawnJs('harness/author/critics.mjs', [env.D, ...(env.RECORD ? ['--record-plan', env.RECORD] : (env.SHOW ? ['--show-plan-verdict'] : ['--plan-judge']))]),
  'worktrees': () => spawnJs('harness/dev/worktree-prune.mjs', [...(env.PRUNE ? ['--prune'] : [])]),
};

function spawnJs(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args.filter((a) => a !== undefined)], { stdio: 'inherit', cwd: ROOT });
  return r.status || 0;
}

function runMake(args) {
  const r = spawnSync('make', args, { stdio: 'inherit', cwd: ROOT });
  return r.status || 0;
}

export function run(name) {
  if (CUSTOM[name]) return CUSTOM[name]();
  const build = TOOLS[name];
  if (!build) {
    console.error(`✗ make dev-tool X=${name}: no such tool. Known tools:\n  ${[...Object.keys(TOOLS), ...Object.keys(CUSTOM)].sort().join(' ')}`);
    return 2;
  }
  return spawnJs(build()[0], build().slice(1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/dev-tool.mjs <name>   ·   make dev-tool X=<name>'); process.exit(2); }
  process.exit(run(name));
}
