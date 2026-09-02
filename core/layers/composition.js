// core/layers/composition.js. The `composition` layer: a bespoke, hand-authored per-beat GSAP timeline,
// named from JSON. This is the safe form of another engine' "one worker writes a timeline per frame" model:
// the JSON carries only `comp` (a registry name) + `props` (DATA), never code, so untrusted input can name
// a comp and fill labels but cannot inject script. The code lives in first-party `compositions/*.js`.
//
// build() looks up the comp and hands it { el, gsap, start, W, H, kit, ...props }. The comp builds its
// static DOM and authors PAUSED tweens on gsap.globalTimeline (delays offset by start); seekAll(t) drives
// them per frame → pure in n, exactly like every other GSAP hook (formats/scene/scene.js applyGsapHooks).
// No frame() hook: the timeline is global and seeked centrally.
import { COMPOSITION_REGISTRY } from '../compositions/index.js';
import { propsOf } from '../props.js';

// Which of those props needs the tween engine on disk before build. `props` is inert data; `comp` names a
// timeline, and a comp built with no GSAP is a still frame with no error (docs/MISTAKES.md #148).
export const GSAP_TRIGGER = 'comp';

// `props` is DATA handed to the named comp; what is inside it is the comp's own vocabulary. The props
// are read off this signature (propsOf, core/props.js); `comp` is renamed in the pattern because the
// local binding for the looked-up composition function already uses that name.
export function build(kit, el, L, { comp: compName, props } = L) {
  el.style.pointerEvents = 'none';
  // was console.warn + return, so the beat's whole hand-authored timeline silently did not run. A
  // warning in a headless render nobody reads is silence with extra steps. #361. pick() carries the
  // same refusal and also names the vocabulary a mistaken word really belongs to.
  const comp = COMPOSITION_REGISTRY.pick(compName);
  if (!window.gsap) { console.warn('composition: window.gsap missing, cannot author the timeline'); return; }
  // props is DATA the comp treats as textContent/attr, never innerHTML (same boundary as the html layer).
  comp({ el, gsap: window.gsap, start: L.start ?? 0, W: kit.W, H: kit.H, kit, ...(props && typeof props === 'object' ? props : {}) });
}

export const PROPS = propsOf(build);

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "names a first-party hand-authored GSAP timeline in core/compositions/ and passes it DATA; for choreography `parts` and blueprints cannot express";
