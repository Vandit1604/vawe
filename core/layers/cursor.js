// core/layers/cursor.js — a pointer that follows a `path` ([{t,x,y}] keyframes) and clicks at
// `clicks:[t…]` — the core of a product demo. macOS arrow + a ripple ring that fires on click.
export const PROPS = { size: {}, x: {}, y: {}, color: {}, rippleColor: {}, path: {}, clicks: {} };

export function build(kit, el, L) {
  const sz = L.size ?? 34;
  // `path` coords are ABSOLUTE screen px by default: with no authored x/y, anchor the base at (0,0)
  // so a keyframe {x,y} lands the pointer there (scene.html otherwise defaults every layer to 60,240,
  // which silently offset the click target). An explicit x/y still sets the base (path = relative to it).
  if (L.x == null && L.y == null) { el.style.left = '0px'; el.style.top = '0px'; }
  el.style.width = sz + 'px'; el.style.height = sz + 'px'; el.style.pointerEvents = 'none';
  el.innerHTML = `<div class="hs-cur-ripple" style="position:absolute;left:6px;top:5px;width:64px;height:64px;margin:-32px;border-radius:50%;border:3px solid ${L.rippleColor || 'rgba(37,99,235,0.7)'};transform:scale(0);opacity:0"></div>`
    + `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))"><path d="M5 2.5 L5 19.5 L9.4 15.4 L12.3 21.3 L14.9 20.1 L12 14.3 L18.2 13.8 Z" fill="${L.color || '#141414'}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}
export function frame(kit, el, L, t) {
  const start = L.start ?? 0, end = start + (L.duration ?? 2);
  if (!(t >= start && t < end)) return;
  const lt = t - start, pm = (L.path && L.path.length) ? kit.motionAt(L.path, lt) : { dx: 0, dy: 0 };
  let s = 1, rip = -1;
  for (const c of (L.clicks || [])) { const d = lt - c; if (d >= 0 && d < 0.45) { s = Math.min(s, 1 - 0.22 * Math.sin(kit.clamp01(d / 0.11) * 3.14159)); rip = d / 0.45; } }
  el.style.transform = `translate(${(pm.dx).toFixed(1)}px, ${(pm.dy).toFixed(1)}px) scale(${s.toFixed(3)})`;
  // The ripple ring is built once and never replaced; memoised on the element so a demo's pointer does
  // not walk its own subtree on every frame. On the element rather than in build() for the reason
  // core/layers/clip.js states at length: a group child can reach frame() without this build() running.
  if (el.__ripple === undefined) el.__ripple = el.querySelector('.hs-cur-ripple');
  const rp = el.__ripple;
  if (rp) { const on = rip >= 0 && rip < 1; rp.style.opacity = on ? (0.8 * (1 - rip)).toFixed(2) : '0'; rp.style.transform = `scale(${on ? (0.2 + rip * 1.7).toFixed(2) : 0})`; }
}
