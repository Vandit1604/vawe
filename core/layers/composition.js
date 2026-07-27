// core/layers/composition.js — the `composition` layer: a bespoke, hand-authored per-beat GSAP timeline,
// named from JSON. This is the safe form of another engine' "one worker writes a timeline per frame" model:
// the JSON carries only `comp` (a registry name) + `props` (DATA), never code, so untrusted input can name
// a comp and fill labels but cannot inject script. The code lives in first-party `compositions/*.js`.
//
// build() looks up the comp and hands it { el, gsap, start, W, H, kit, ...props }. The comp builds its
// static DOM and authors PAUSED tweens on gsap.globalTimeline (delays offset by start); seekAll(t) drives
// them per frame → pure in n, exactly like every other GSAP hook (formats/scene/scene.js applyGsapHooks).
// No frame() hook: the timeline is global and seeked centrally.
import { COMPOSITIONS } from '../compositions/index.js';

export function build(kit, el, L) {
  el.style.pointerEvents = 'none';
  const comp = COMPOSITIONS[L.comp];
  if (!comp) { console.warn(`composition: unknown comp "${L.comp}" — known: ${Object.keys(COMPOSITIONS).join(', ')}`); return; }
  if (!window.gsap) { console.warn('composition: window.gsap missing — cannot author the timeline'); return; }
  // props is DATA the comp treats as textContent/attr, never innerHTML (same boundary as the html layer).
  comp({ el, gsap: window.gsap, start: L.start ?? 0, W: kit.W, H: kit.H, kit, ...(L.props && typeof L.props === 'object' ? L.props : {}) });
}
