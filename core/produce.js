// core/produce.js — PRODUCE THE BASELINE. The engine's "go all-in" default: inject the universal produced
// motion into a scene that didn't specify it, so EVERY video is rich by default (a moving camera · scene-unit
// transitions · a living-or-brand-appropriate background) — the another engine posture, forced at BUILD time.
// ADDITIVE ONLY: it adds bg/camera/sceneUnits fields; it NEVER rewrites a layer the author wrote (auto-
// splitting text for kinetic reveals mutated structure and broke motion-track layers + the contrast audit,
// so kinetic type is nudged by the direction floor instead — MISTAKES).
//
// Determinism: it only mutates the scene DATA once, before the first frame — renderFrame(n) stays pure.
// ABSENT-ONLY: an explicitly set field is the author's opt-out (set `bg`/`cameraMove` yourself to override,
// or `bg:[{preset:"plain"}]` for a deliberately flat field). `"produced": false` disables the whole pass.
// THEME-AWARE: a light/white-first brand gets a subtle light texture, not a jarring dark aurora (restraint
// where the brand wants it). Applies to the `scene` module only. Pure JS → runs in the browser AND in node
// gates, so the gates evaluate the SAME produced scene the renderer does.

// relative luminance of a #rrggbb bg → is the brand light (white-first) or dark?
function bgIsLight(bg) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(bg || '').trim());
  if (!m) return true; // unknown → assume light (white-first is the common case)
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 140;
}

export function produceBaseline(data, theme) {
  if (!data || typeof data !== 'object') return data;
  if (data.module && data.module !== 'scene') return data;   // scene module only
  if (data.produced === false) return data;                  // explicit opt-out of the whole pass
  const palette = (theme && theme.palette) || {};
  const light = bgIsLight(palette.bg);

  // 1. LIVING BACKGROUND — only if none declared. Light brand → a subtle tech DOT-GRID with a drifting
  //    wave (dotmatrix): it actually moves and reads modern, unlike the near-static soft circles of
  //    paperShapes (a weak default — real-video feedback). Dark brand → an aurora field. An explicit `bg`
  //    (incl. `plain`) opts out.
  if (!Array.isArray(data.bg) || data.bg.length === 0) {
    data.bg = [{ t: 0, preset: light ? 'dotmatrix' : 'aurora' }];
  }

  // A scene that already choreographs layers with `motion` tracks is ALREADY directed — and its tracks often
  // span beats and use absolute times, which fight the injected camera and the beat-wrapper model. So the
  // DIRECTED injections (camera + sceneUnits) SKIP such a scene (a camera×motion / sceneUnits×motion
  // interaction produced non-deterministic garbage on motion-reel-v2 — MISTAKES). The author can still opt in.
  const choreographed = (data.layers || []).some(function has(L) { return L && typeof L === 'object' && (Array.isArray(L.motion) && L.motion.length > 1 || (L.children || []).some(has)); });

  // 2. CAMERA — a gentle slow push if the scene declares no camera move at all (the frame stays alive).
  const hasCam = (Array.isArray(data.cameraMove) && data.cameraMove.length) || (Array.isArray(data.camera) && data.camera.length);
  if (!hasCam && !choreographed) {
    data.cameraMove = [{ move: 'slowPush', start: 0, dur: data.duration || 12, from: 1, to: 1.04 }];
  }

  // 3. SCENE-UNIT TRANSITIONS — a film WITH cuts that hasn't opted into unit transitions gets them, so the
  //    beats swap as whole units (the produced default over a flat cam-bump). Skip choreographed scenes.
  if (Array.isArray(data.cuts) && data.cuts.length && data.sceneUnits == null && !choreographed) {
    data.sceneUnits = true;
  }

  // NOTE — kinetic headlines are NOT injected here. Auto-splitting an existing text layer MUTATES its
  // structure, which broke a layer carrying a `motion` track (non-determinism) and masked the audit's
  // weak-headline contrast check (it measures the whole layer, not per-word units). Structure-changing
  // baselines are unsafe to inject blindly; kinetic type is nudged by the direction floor (no-kinetic-type)
  // and authored per-headline instead. The baseline stays ADDITIVE (bg · camera · sceneUnits) — it never
  // rewrites a layer the author already wrote.
  return data;
}
