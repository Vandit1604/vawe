// harness/lib/finish-advice.mjs: ONE owner for "should this film be told about `finish` and `glass`",
// so `make stage`/`make next` (harness/live/stage-say.mjs) and the design-spec one-pager
// (harness/author/design-spec.mjs) print the same one line instead of two hand-kept copies.
//
// WHY THIS EXISTS: neither `finish` (core/engine/finish.js, the scene-level cinematic-grade dial) nor
// the layer `glass` prop is a layer type, a bg preset or a named `filter` look, so a film agent had no
// structural way to be told either exists (arsenal.mjs now indexes both, FINISH_REGISTRY/
// SURFACE_REGISTRY; this is the other half, unprompted advice at the two places a film's own stage is
// already being read). A launch or recreation is where a premium grade earns the most, and "no finish
// yet" is the film that has not decided either way.
import { referenceDevices } from '../author/storyboard-parse.mjs';

const ADVISED_STAGES = new Set(['design', 'assemble', 'direct', 'render']);

/**
 * finishAdvice({ stage, scene, sbText, slug }) -> a one-line string, or null when the tip does not
 * apply. `scene` is the parsed JSON (or null before assemble); `sbText` is the storyboard's raw text
 * (or null); `slug` is the film's own base name.
 *
 * RECREATION, measured rather than guessed: a storyboard with a `### Reference devices` table names a
 * real reference film it is matching shot for shot (storyboard-parse.mjs), the same signal `make study`
 * itself reads, so this asks the one place that fact already lives instead of pattern-matching prose.
 * LAUNCH has no structural signal (nothing in the schema says "this markets a product"), so the slug's
 * own naming convention is what's left (`*-launch.json`, the same convention `*-recreation.json` uses
 * for the recreation case above and that this repo's own library already follows).
 */
export function finishAdvice({ stage, scene, sbText, slug }) {
  if (!ADVISED_STAGES.has(stage)) return null;
  const isRecreation = /recreation/i.test(slug || '') || (sbText != null && referenceDevices(sbText).length > 0);
  const isLaunch = /launch/i.test(slug || '');
  const hasFinish = !!(scene && scene.finish && typeof scene.finish === 'object' && Object.keys(scene.finish).length);
  if (!hasFinish || isRecreation || isLaunch) {
    return '  tip: no `finish` (core/engine/finish.js: light, bloom, grade, aberration, vignette, grain, '
      + 'dof) yet, and a `glass` prop for frosted panels: `make arsenal Q="cinematic look"` / `Q="glass panels"`.';
  }
  return null;
}
