// core/engine/page-seek.js: the one in-page seek a bare HTML page runs under, and the frame facts it
// lays out against. harness/media/render-page.mjs injects both with evaluateOnNewDocument (their source,
// via toString(), so neither may reference anything outside its own body); the studio imports them and
// calls seekTo(t, iframe.contentWindow), so a scrub and a render can never disagree about what time t means.

// Seek film time `t` (seconds): set the virtual clock, call window.seek(t) when the page paints as a
// function of time, seek every CSS/WAAPI/SMIL animation, then call every vawe.onFrame hook (awaited, so a
// hook that decodes a texture or builds three.js geometry settles before a screenshot).
export async function seekTo(t, win = window) {
  if (win.__pageClock) win.__pageClock.set(t);
  if (typeof win.seek === 'function') await win.seek(t);
  for (const a of win.document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
  win.document.querySelectorAll('svg').forEach((svg) => {
    if (typeof svg.pauseAnimations === 'function') { try { svg.pauseAnimations(); svg.setCurrentTime(t); } catch { /* best-effort */ } }
  });
  for (const fn of win.__vaweFrameHooks || []) await fn(t);
}

// Runs in the page before any page script: the frame facts a page lays out against. documentElement does not exist yet at this point, so its attributes wait for the parser.
export function installPageFrame({ aspect, width, height }) {
  const vawe = window.vawe || (window.vawe = {});
  Object.assign(vawe, { aspect, width, height });
  Object.defineProperty(vawe, 'fps', {
    configurable: true,
    get() { const m = document.querySelector('meta[name="fps"]'); return m ? Number(m.content) : undefined; },
  });
  const apply = () => {
    const root = document.documentElement;
    root.dataset.aspect = aspect;
    root.style.setProperty('--vw', `${width}px`);
    root.style.setProperty('--vh', `${height}px`);
  };
  if (document.documentElement) { apply(); return; }
  new MutationObserver((_, obs) => { if (document.documentElement) { obs.disconnect(); apply(); } })
    .observe(document, { childList: true });
}
