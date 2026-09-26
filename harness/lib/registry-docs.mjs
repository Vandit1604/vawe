import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDoc, ROOT as CRAFT_ROOT } from './craft-rules.mjs';
import { registries } from '../../core/registry/registry.js';

export const ROOT = CRAFT_ROOT;

/**
 * loadRegistryModules(): import every module that might call defineRegistry with a `docs` option, so
 * `registries()` below actually holds them. Layer types are the only vocabulary this covers today
 * (see AGENTS.md's scope call: most registry entries are a catalogue row, not a craft decision), so
 * importing core/layers/index.js is enough; a second vocabulary that grows a `docs` option adds its
 * import here, same as arsenal.mjs's own module discovery would need to.
 */
async function loadRegistryModules() {
  await import('../../core/layers/index.js');
}

/**
 * validateRegistryDocs({root}) -> string[] of problems, empty when every `docs` pointer on every
 * loaded registry is sound. Each problem names the registry kind, the entry, and what failed, the same
 * shape loadCraftRules uses for its own aggregate error.
 */
export async function validateRegistryDocs({ root = ROOT } = {}) {
  await loadRegistryModules();
  const problems = [];
  for (const reg of registries()) {
    if (!reg.docs) continue;
    for (const [name, d] of Object.entries(reg.docs)) {
      for (const e of checkDoc(d, root)) problems.push(`${reg.kind} "${name}": ${e}`);
    }
  }
  return problems;
}

/** loadAndCheckRegistryDocs({root}): same contract as loadCraftRules, throws one Error naming every problem. */
export async function loadAndCheckRegistryDocs(opts = {}) {
  const problems = await validateRegistryDocs(opts);
  if (problems.length) {
    throw new Error(`registry-docs: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadAndCheckRegistryDocs().then(
    () => console.log('registry-docs: every doc pointer checked out'),
    (err) => { console.error(err.message); process.exit(1); },
  );
}
