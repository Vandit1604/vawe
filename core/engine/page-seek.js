// core/engine/page-seek.js: the one in-page seek a bare HTML page runs under, and the frame facts it
// lays out against. harness/media/render-page.mjs injects both with evaluateOnNewDocument (their source,
// via toString(), so neither may reference anything outside its own body); the studio imports them and
// calls seekTo(t, iframe.contentWindow), so a scrub and a render can never disagree about what time t means.

// Seek film time `t` (seconds): set the virtual clock, call window.seek(t) when the page paints as a
// function of time, seek every CSS/WAAPI/SMIL animation, then call every vawe.onFrame hook (awaited, so a
// hook that decodes a texture or builds three.js geometry settles before a screenshot).
export async function seekTo(t, win = window) {
  if (win.__pageFonts) await win.__pageFonts();
  if (win.__pageClock) win.__pageClock.set(t);
  if (typeof win.seek === 'function') await win.seek(t);
  if (win.__pageFonts) await win.__pageFonts();
  for (const a of win.document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
  win.document.querySelectorAll('svg').forEach((svg) => {
    if (typeof svg.pauseAnimations === 'function') { try { svg.pauseAnimations(); svg.setCurrentTime(t); } catch { /* best-effort */ } }
  });
  for (const fn of win.__vaweFrameHooks || []) await fn(t);
}

// Resolve when every FontFace in document.fonts has finished loading, including faces whose load starts
// while waiting. A face still loading after `timeoutMs` rejects naming its family. The real timer is used
// because the virtual clock owns setTimeout. Injected via toString(), so it references nothing outside its body.
export async function awaitFonts(timeoutMs = 10000) {
  const fonts = document.fonts;
  const setReal = window.__pageClock ? window.__pageClock.real.setTimeout : setTimeout.bind(window);
  const clearReal = window.__pageClock ? window.__pageClock.real.clearTimeout : clearTimeout.bind(window);
  const deadline = Date.now() + timeoutMs;
  const loadingNow = () => [...fonts].filter((f) => f.status === 'loading');
  for (;;) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setReal(() => reject(new Error(`font still loading after ${timeoutMs} ms: ${loadingNow().map((f) => f.family).join(', ')}`)), Math.max(0, deadline - Date.now()));
    });
    // fonts.ready itself never resolves while a face's file never arrives, so it races the deadline too.
    const loaded = (async () => {
      await fonts.ready;
      const loading = loadingNow();
      await Promise.all(loading.map((f) => f.loaded.catch(() => { throw new Error(`font failed to load: ${f.family}`); })));
      return loading.length === 0;
    })();
    loaded.catch(() => {});
    let done;
    try { done = await Promise.race([loaded, timeout]); } finally { clearReal(timer); }
    if (done) return;
  }
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
