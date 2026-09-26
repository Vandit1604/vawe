import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const json = () => (env.JSON ? ['--json'] : []);
const stamp = () => (env.STAMP ? ['--stamp'] : []);
const write = () => (env.WRITE ? ['--write'] : []);
const list = () => (env.LIST ? ['--list'] : []);
// A make recipe expands $(D) etc. through the shell, which word-splits an unquoted, possibly
// multi-file value (`impeccable D=<file...>`). spawnSync here takes an argv array with no shell, so
// this does the same split by hand instead of passing one file list as a single mangled argument.
const words = (name) => (env[name] ? env[name].trim().split(/\s+/) : []);
const flag = (name, f) => (env[name] ? [f] : []);
const flag1 = (name, f) => (env[name] === '1' ? [f] : []);
const valFlag = (name, f) => (env[name] ? [f, env[name]] : []);

// name -> the script + args; keep alphabetical, this is the only place the list is kept.
export const GATES = {
  'arsenal-check': () => ['quality/gates/arsenal-check.mjs', ...json()],
  'asset-check': () => ['quality/gates/asset-check.mjs', ...words('D'), ...flag('STRICT', '--strict'), ...json()],
  'audio-check': () => ['quality/gates/audio-check.mjs', ...(env.D ? words('D') : ['--all']), ...flag1('STRICT', '--strict')],
  'audio-render-check': () => ['quality/gates/audio-render-check.mjs', ...words('D'), ...flag1('STRICT', '--strict')],
  'audit': () => ['quality/audit.mjs', ...(env.D ? words('D') : words('M')), ...valFlag('ASPECT', '--aspect')],
  'audit-all': () => ['quality/gates/audit-scenes.mjs', ...words('SCENE'), ...valFlag('ASPECT', '--aspect'), ...json()],
  'beat-check': () => ['quality/gates/beat-check.mjs', ...words('D'), ...flag1('STRICT', '--strict')],
  'canvas-purity': () => ['quality/gates/canvas-purity.mjs', ...(env.M ? words('M') : ['scene']), ...words('D'), ...json()],
  'blocks-audit': () => ['quality/gates/blocks-audit.mjs', ...json()],
  'code-quality': () => ['quality/gates/code-quality.mjs', ...(env.TOP ? ['--top'] : []), ...write(), ...json()],
  'consequence-lint': () => ['quality/gates/consequence-lint.mjs', ...write(), ...list(), ...json()],
  'coverage': () => ['quality/gates/coverage.mjs', ...json()],
  'craft-coverage': () => ['quality/gates/craft-coverage.mjs', ...json()],
  'dead-branch': () => ['quality/gates/dead-branch.mjs', ...json()],
  'discovery': () => ['quality/gates/discovery.mjs', ...json()],
  'doc-refs': () => ['quality/gates/doc-refs.mjs', ...json()],
  'docker-check': () => ['quality/gates/docker-context-check.mjs'],
  'docker-context': () => ['quality/gates/docker-context.mjs', ...json()],
  'docs-drift': () => ['quality/gates/docs-drift.mjs', ...json()],
  'feature-audit': () => ['quality/gates/feature-audit.mjs', ...json()],
  'generated-check': () => ['quality/gates/generated-check.mjs', ...write(), ...json()],
  'glyphs-audit': () => ['quality/gates/glyphs-audit.mjs', ...json()],
  'inert-check': () => ['quality/gates/inert-check.mjs', ...json()],
  'judge-census': () => ['quality/gates/ledger.mjs', 'census', ...json()],
  'lint-test': () => ['quality/gates/lint-test.mjs', ...json()],
  'mistakes-check': () => ['quality/gates/mistakes-dupes.mjs', ...json()],
  'no-emdash': () => ['harness/dev/no-emdash.mjs'],
  'output-contract': () => ['quality/gates/output-contract.mjs', ...json(), ...stamp()],
  'prop-probe': () => ['quality/gates/prop-probe.mjs', ...(env.PROP ? [env.PROP] : []), ...json()],
  'provenance': () => ['quality/gates/threshold-provenance.mjs', ...list(), ...stamp(), ...json()],
  'rule-length': () => ['quality/gates/rule-length.mjs', ...list(), ...stamp(), ...json()],
  'rung': () => ['quality/gates/rung.mjs', ...list(), ...stamp(), ...json()],
  'schema-check': () => ['quality/gates/schema-drift.mjs', ...write(), ...json()],
  'scenes-json': () => ['scripts/site/scenes-json.mjs', ...write()],
  'seo-surface': () => ['quality/gates/seo-surface.mjs', ...json()],
  'sfx-check': () => ['quality/gates/sfx-audit.mjs', ...json()],
  'silent-check': () => ['quality/gates/silent-fallback.mjs', ...json()],
  'site-check': () => ['quality/gates/site-check.mjs'],
  'sim-audit': () => ['quality/gates/sim-audit.mjs', ...json()],
  'site-counts': () => ['quality/gates/site-counts.mjs', ...json()],
  'skill-check': () => ['quality/gates/skill-check.mjs', ...json()],
  'skill-reach': () => ['quality/gates/skill-reach.mjs', ...json()],
  'unused': () => ['quality/gates/unused.mjs', ...json()],
  'word-action': () => ['quality/gates/word-action.mjs', ...stamp(), ...json()],
  'conformance': () => ['quality/gates/conformance.mjs', ...words('P'), ...json()],
  'content-check': () => ['quality/gates/content-check.mjs', ...words('D'), '--ref', env.REF || '', ...valFlag('PAIRS', '--pairs'), ...flag('STRICT', '--strict')],
  'copy-check': () => ['quality/gates/copy-check.mjs', ...words('D'), ...flag('STRICT', '--strict')],
  'covered-move': () => ['quality/gates/covered-move.mjs', ...words('D')],
  'craft-check': () => ['quality/gates/craft-checklist.mjs', ...words('D')],
  'critique': () => ['quality/gates/critique.mjs', ...words('D'), ...json()],
  'design-drift': () => ['quality/gates/design-drift.mjs', ...words('D'), ...json()],
  'designspec-check': () => ['quality/gates/designspec-check.mjs',
    ...(env.SELFTEST === '1' ? ['--self-test'] : env.CENSUS === '1' ? ['--census'] : words('D')),
    ...flag('STRICT', '--strict')],
  'font-audit': () => ['quality/gates/font-audit.mjs', ...(env.M ? words('M') : ['scene']), ...words('D'), ...json()],
  'frame-check': () => ['quality/gates/frame-check.mjs', ...words('D'), ...json()],
  'impeccable': () => ['skills/impeccable/scripts/detect.mjs', '--json', ...words('D')],
  'inspect': () => ['quality/gates/inspect.mjs', ...words('D'), ...json()],
  'knobs-audit': () => ['quality/gates/knobs-audit.mjs', ...words('D'), ...json()],
  'layer-props': () => ['quality/gates/layer-props.mjs', ...words('D'), ...json()],
  'motion': () => ['quality/gates/motion-audit.mjs', ...words('M'), ...valFlag('D', '--data'), ...valFlag('STRIDE', '--stride'), ...json()],
  'motion-sound-check': () => ['quality/gates/motion-sound-check.mjs', ...words('D')],
  'motion-split': () => ['quality/gates/motion-split.mjs', ...words('D'), ...json()],
  'motion-trace': () => ['quality/gates/motion-audit.mjs', ...words('M'), '--trace', ...valFlag('D', '--data'), ...valFlag('STRIDE', '--stride'), ...json()],
  'pace': () => ['quality/gates/pace.mjs', ...words('D'), ...words('TEMPO')],
  'pace-from-vo': () => ['harness/media/pace-from-vo.mjs'],
  'paints-nothing': () => ['quality/gates/paints-nothing.mjs', ...words('D'), ...flag1('STRICT', '--strict'), ...json()],
  'plan-check': () => ['quality/gates/plan-vs-render.mjs', ...words('D'), ...flag1('STRICT', '--strict')],
  'probe': () => (env.M ? ['quality/gates/probe-purity.mjs', ...words('M')] : ['harness/dev/probe-all.sh']),
  'render-verify': () => ['quality/gates/render-verify.mjs', ...words('D')],
  'seam-check': () => ['quality/gates/seams.mjs', ...words('D'), ...json()],
  'similar': () => ['quality/gates/similarity.mjs', ...words('D'), ...json()],
  'snap': () => ['quality/gates/scene-snap.mjs', ...words('M'), ...flag('SAVE', '--save'), ...json()],
  'snap-all': () => ['quality/gates/snap-scenes.mjs', ...words('SCENE'), ...flag('SAVE', '--save'), ...json()],
  'snap-blocks': () => ['quality/gates/snap-blocks.mjs', ...words('BLOCK'), ...flag('SAVE', '--save'), ...json()],
  'speed': () => ['quality/gates/speed.mjs', ...words('D')],
  'study-check': () => ['quality/gates/study-check.mjs', ...words('NAME')],
  'study-verify': () => ['quality/gates/study-verify.mjs', ...words('D'), ...flag('NORENDER', '--no-render'), ...json()],
  'sweep-static': () => ['quality/gates/sweep-static.mjs', ...words('D'), ...json()],
  'validate': () => ['core/validate/validate.mjs', ...words('D')],
  'verify': () => ['quality/gates/run.js'],
  'why': () => ['harness/lib/why.mjs', ...words('D'), ...words('N')],
};

export function run(name) {
  const build = GATES[name];
  if (!build) {
    console.error(`✗ make check GATE=${name}: no such gate. Known gates:\n  ${Object.keys(GATES).sort().join(' ')}`);
    return 2;
  }
  const [script, ...args] = build();
  const exe = script.endsWith('.sh') ? 'sh' : process.execPath;
  const r = spawnSync(exe, [path.join(ROOT, script), ...args], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/check-gate.mjs <gate-name>   ·   make check GATE=<name>'); process.exit(2); }
  process.exit(run(name));
}
