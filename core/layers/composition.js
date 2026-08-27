// core/layers/composition.js. The `composition` layer: a bespoke, hand-authored per-beat GSAP timeline,
// named from JSON. This is the safe form of another engine' "one worker writes a timeline per frame" model:
// the JSON carries only `comp` (a registry name) + `props` (DATA), never code, so untrusted input can name
// a comp and fill labels but cannot inject script. The code lives in first-party `compositions/*.js`.
//
// build() looks up the comp and hands it { el, gsap, start, W, H, kit, ...props }. The comp builds its
// static DOM and authors PAUSED tweens on gsap.globalTimeline (delays offset by start); seekAll(t) drives
// them per frame → pure in n, exactly like every other GSAP hook (formats/scene/scene.js applyGsapHooks).
// No frame() hook: the timeline is global and seeked centrally.
import { COMPOSITIONS } from '../compositions/index.js';

// `props` is DATA handed to the named comp; what is inside it is the comp's own vocabulary.
export const PROPS = { comp: {}, props: {} };

// Which of those props needs the tween engine on disk before build. `props` is inert data; `comp` names a
// timeline, and a comp built with no GSAP is a still frame with no error (docs/MISTAKES.md #148).
export const GSAP_TRIGGER = 'comp';

export function build(kit, el, L) {
  el.style.pointerEvents = 'none';
  const comp = COMPOSITIONS[L.comp];
  // was console.warn + return, so the beat's whole hand-authored timeline silently did not run. A
  // warning in a headless render nobody reads is silence with extra steps. #361.
  if (!comp) throw new Error(`unknown composition "${L.comp}". One of: ${Object.keys(COMPOSITIONS).join(', ')}`);
  if (!window.gsap) { console.warn('composition: window.gsap missing, cannot author the timeline'); return; }
  // props is DATA the comp treats as textContent/attr, never innerHTML (same boundary as the html layer).
  comp({ el, gsap: window.gsap, start: L.start ?? 0, W: kit.W, H: kit.H, kit, ...(L.props && typeof L.props === 'object' ? L.props : {}) });
}

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "names a first-party hand-authored GSAP timeline in core/compositions/ and passes it DATA; for choreography `parts` and blueprints cannot express";
