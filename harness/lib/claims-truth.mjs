// harness/lib/claims-truth.mjs: what a doc is allowed to CLAIM about the engine, derived from the
// code that owns each fact, never hardcoded here. doc-refs.mjs already proves a cited PATH exists;
// this proves a cited NUMBER or NAME is still true. Used by quality/gates/docs-drift.mjs (the wiring
// and the file-scan live there) and asserted directly in quality/gates/lib-test.mjs, so this file
// stays pure: no process.exit, no console output, no reading the whole repo.
//
// WHY THIS SHAPE. AGENTS.md said 30fps while cmd/render renders 60 (measured this week); a skill told
// an agent to run `make blueprints`, a deleted target. Both are the same defect: a sentence that was
// true once and never re-checked. `deriveEngineTruth` reads the number FROM the code that owns it, so
// a doc is compared against today's engine, not against whatever the last author remembered.
import fs from 'node:fs';
import path from 'node:path';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { ASPECT_REGISTRY } from '../../core/layout/safe.js';

/**
 * fps (final and `--draft`), the canvas count, and the layer-type count: read from the modules that
 * declare each one. Throws loudly if cmd/render/main.go's comment shape changes, rather than silently
 * falling back to a guessed number: a truth function that guesses is the exact drift it exists to catch.
 */
export function deriveEngineTruth(repoRoot) {
  const mainGo = fs.readFileSync(path.join(repoRoot, 'cmd/render/main.go'), 'utf8');
  const m = /else (\d+) final \/ (\d+) --draft/.exec(mainGo);
  if (!m) throw new Error('cmd/render/main.go no longer says "else N final / N --draft"; update the regex in harness/lib/claims-truth.mjs');
  return {
    finalFps: Number(m[1]),
    draftFps: Number(m[2]),
    canvasCount: ASPECT_REGISTRY.names.length,
    layerCount: LAYER_TYPES.length,
  };
}

/**
 * A doc's headline fps sentence ("one rendered Short/video ... NNfps") must name BOTH the final and
 * the draft rate, because naming only one is exactly the shape of the measured mistake: a single
 * number read once and quoted as if it were the whole fact. `engine-doctrine/CRAFT/*` sentences that use "30fps"
 * as a MEASURING convention (a reference studied at 10fps, a duration table at 30fps) do not match
 * this pattern and are correctly left alone; only the "one rendered Short/video" idiom is a headline
 * claim about the engine's own frame rate.
 *
 * The canvas count ("N canvases" / "N aspect ratios") and the layer-type count ("N layer types") are
 * checked the same way: a bare number claim against the registry that owns it.
 */
export function findNumberClaims(text, truth) {
  const out = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/\bone rendered (short|video)\b/i.test(line) && /fps/i.test(line)) {
      const hasFinal = line.includes(`${truth.finalFps}fps`);
      const hasDraft = line.includes(`${truth.draftFps}fps`);
      if (!hasFinal || !hasDraft) {
        out.push({
          kind: 'fps', line: i + 1, text: line.trim(),
          message: `names the render fps without both ${truth.finalFps}fps (final) and ${truth.draftFps}fps (--draft)`,
        });
      }
    }
    let m;
    const canvasRe = /\b(\d+) (canvases|aspect ratios)\b/gi;
    while ((m = canvasRe.exec(line))) {
      const claimed = Number(m[1]);
      if (claimed !== truth.canvasCount) {
        out.push({
          kind: 'canvas', line: i + 1, text: line.trim(),
          message: `says ${claimed} ${m[2]}, but core/layout/safe.js ASPECT_REGISTRY holds ${truth.canvasCount}`,
        });
      }
    }
    const layerRe = /\b(\d+) (?:composable )?layer types?\b/gi;
    while ((m = layerRe.exec(line))) {
      const claimed = Number(m[1]);
      if (claimed !== truth.layerCount) {
        out.push({
          kind: 'layer', line: i + 1, text: line.trim(),
          message: `says ${claimed} layer types, but core/layers/index.js LAYER_TYPES holds ${truth.layerCount}`,
        });
      }
    }
  });
  return out;
}

// RETIRED: a mechanism this repo deleted. Naming one as something to REACH FOR is a live instruction
// an agent will follow into a dead end (engine-doctrine/MISTAKES.md: a storyboard warning told authors to run
// `make blueprints` after it was removed). Naming one as HISTORY ("blueprints were retired when...")
// is not a mistake, so a sentence that also says retired/deleted/removed in the same breath is left
// alone: see the RETIRED_OK guard in findRetiredNames.
export const RETIRED_NAMES = [
  { label: 'blueprints/', re: /\bblueprints\// },
  { label: '`make blueprints`', re: /`make blueprints`/ },
  { label: '`make previews`', re: /`make previews`/ },
  { label: '{type:"beat"}', re: /\{\s*["']?type["']?\s*:\s*["']beat["']\s*\}/ },
  { label: 'engine-doctrine/MOTION-RECIPES.md', re: /\bMOTION-RECIPES\.md\b/ },
  { label: 'engine-doctrine/AFTER-EFFECTS-RECIPES.md', re: /\bAFTER-EFFECTS-RECIPES\.md\b/ },
];

const RETIRED_OK = /\b(retired|deleted|removed)\b/i;

// A comment can say anything about the past without misleading anyone; a PRINTED line reaches an
// agent mid-task the way a doc does. So code-file scanning (harness/, quality/gates/) is restricted to
// lines that actually emit a string an agent reads, never a comment or a path-existence guard.
const PRINT_CALL = /\b(?:console\.(?:log|error|warn)|f\.fail|lines\.push|out\.push)\s*\(/;

/**
 * Every RETIRED_NAMES hit in `text`, skipping a hit whose SENTENCE says the name is gone. Prose wraps
 * across lines, so "the word is gone" is judged over the hit line plus one neighbour on each side
 * (NEXT.md:115-116 splits "moot now" from "retired" across exactly one line break), not the single
 * line the regex matched on. Pass `{ printOnly: true }` for a source file, so a comment or an `existsSync` guard
 * naming the old path is not reported as if it were an instruction: only a line that PRINTS is.
 */
export function findRetiredNames(text, { printOnly = false } = {}) {
  const out = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (printOnly && !PRINT_CALL.test(line)) return;
    const context = lines.slice(Math.max(0, i - 1), i + 2).join(' ');
    for (const { label, re } of RETIRED_NAMES) {
      if (re.test(line) && !RETIRED_OK.test(context)) {
        out.push({ label, line: i + 1, text: line.trim() });
      }
    }
  });
  return out;
}
