// scripts/gates/snap-signature.mjs — the ONE definition of a snap signature, shared by both snap gates.
//
// snap-scenes.mjs (whole library) and scene-snap.mjs (one format) both prove "this refactor changed no
// pixels" by diffing a per-frame signature. They used to carry two hand-kept copies of the capture and
// the diff, which is the exact shape of MISTAKES #159: a duplicated definition drifts, one copy goes
// blind, and the gate keeps reporting green. There is now one capture and one diff; both gates import
// them, so a field added here is seen by both.
//
// WHAT THE SIGNATURE RECORDS, and why each field is here:
//   x/y/w/h/tf/op/fs/c/t — layout, motion, fade, type, colour, copy. The original set.
//   cp (clip-path)       — a wipe / iris / clock reveal is ONLY a clip-path animation. Without this the
//                          signature could not see a reveal at all: `wipe-right` pointed the wrong way
//                          for months and snap said "identical" every single run.
//   cv (canvas hash)     — the background is painted into <canvas id="cv">, and a DOM signature cannot
//                          see canvas pixels. Without this, any change of bg preset, colour, speed or
//                          direction was invisible.
//   ft (filter)          — a GRADE is invisible to every field above it. Rebuilding the anamorphic
//                          streak and the chromatic split changed how 8 composite looks render across
//                          3 scenes, and the whole-library net reported "identical: 102, changed: 0"
//                          both before and after. Same shape as `cp` and `cv`, third time: a property
//                          that carries a whole class of visual change sat outside the signature, so
//                          the gate was green about something it was not looking at. MISTAKES #351.

/** Field key → human name, used for both the diff labels and the field list itself. */
export const SIG_FIELDS = {
  x: 'x', y: 'y', w: 'w', h: 'h', tf: 'transform', op: 'opacity', fs: 'font', c: 'color', t: 'text',
  cp: 'clip-path', cv: 'canvas', ft: 'filter',
};

// The browser-side capture. Passed whole to page.evaluate, so it may not reference anything outside
// itself — everything it needs is defined inline.
function capture(frames) {
  const round = (v) => Math.round(v * 10) / 10;
  // WHICH elements are captured. `[data-layer="critical"]` is only ever set on big TEXT layers — every
  // rect, image, group, component and glow was outside the signature entirely, which is the other half
  // of why a mis-pointed wipe went unseen: the wipe lived on a rect. `[data-start]` is exactly the set
  // driveClips animates, so the signature now covers every timed layer rather than the text ones.
  const SEL = '[id], [data-layer="critical"], [data-start]';

  // Deterministic fingerprint of the background canvas.
  //
  // The full bitmap is 1080x1920; hashing it raw would trip on antialiasing and GPU dither noise every
  // run. So downsample to 32x18 first (drawImage averages whole tiles of source pixels, which drowns
  // per-pixel noise) and quantise each channel to 64 levels before hashing. That is coarse enough to be
  // stable run to run and still fine enough to move when a preset, colour, speed or direction changes.
  //
  // Baselines live in verify/snap/, which is GITIGNORED and therefore local-only, so the fingerprint
  // never has to survive a different machine's GPU — cross-machine variance is acceptable here.
  const bgFingerprint = () => {
    const cv = document.querySelector('canvas#cv') || document.querySelector('canvas');
    if (!cv || !cv.width || !cv.height) return 'no-canvas';
    let data;
    try {
      const off = document.createElement('canvas');
      off.width = 32; off.height = 18;
      const o = off.getContext('2d', { willReadFrequently: true });
      o.clearRect(0, 0, 32, 18);
      o.drawImage(cv, 0, 0, 32, 18);
      data = o.getImageData(0, 0, 32, 18).data;
    } catch { return 'unreadable'; }
    let h = 0x811c9dc5, blank = true;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) blank = false;
      h = Math.imul(h ^ (data[i] >> 2), 0x01000193) >>> 0;   // FNV-1a over the quantised bytes
    }
    // A blank canvas gets a stable sentinel rather than a hash of zeros, so "the scene paints no
    // background" reads as a fact instead of a magic number, and never fails the capture.
    return blank ? 'blank' : h.toString(16).padStart(8, '0');
  };

  // Every scene layer carries the SAME class (`hs-layer`), so keying on the first class name collapsed
  // all of them onto one entry and the signature only ever recorded whichever layer happened to be last
  // in document order. Fall back to the element's position in the tree, which is unique and stable
  // (layers are built once at load, not per frame), keeping the class as a readable prefix.
  const keyOf = (el) => {
    if (el.id) return el.id;
    const cls = typeof el.className === 'string' && el.className ? el.className.split(' ')[0] : el.tagName.toLowerCase();
    const parts = [];
    for (let n = el; n && n.parentElement && n !== document.body; n = n.parentElement) {
      parts.unshift(Array.prototype.indexOf.call(n.parentElement.children, n));
    }
    return `${cls}@${parts.join('.')}`;
  };

  const snap = {};
  for (const f of frames) {
    window.__engine.renderFrame(f);
    const els = {};
    for (const el of document.querySelectorAll(SEL)) {
      const b = el.getBoundingClientRect(); if (b.width < 1 && b.height < 1) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity === 0) continue;
      const key = keyOf(el);
      // Record text ONLY for LEAF content. A scaffold wrapper (root/cam/stage, a group) concatenates all
      // descendant text, so a typing/decode layer mid-reveal makes the wrapper's aggregate text look
      // order-dependent even when every leaf is pure — a false non-determinism signal. Skip it for any
      // element that contains another captured element; leaf text layers keep their text.
      const isWrapper = !!el.querySelector('[id], [data-layer="critical"]');
      els[key] = {
        x: round(b.left), y: round(b.top), w: round(b.width), h: round(b.height),
        tf: s.transform === 'none' ? '' : s.transform,
        op: Math.round(+s.opacity * 1000) / 1000, fs: s.fontSize, c: s.color,
        cp: !s.clipPath || s.clipPath === 'none' ? '' : s.clipPath,
        // A composite look resolves to a `filter` string, and on an IMAGE layer it is set on the inner
        // <img> rather than the wrap (core/looks.js applyComposite), so read that when it is there.
        ft: (() => {
          const target = el.classList && el.classList.contains('hs-img-wrap') ? el.querySelector('img') : null;
          const v = target ? getComputedStyle(target).filter : s.filter;
          return !v || v === 'none' ? '' : v;
        })(),
        t: isWrapper ? '' : (el.textContent || '').trim().slice(0, 24),
      };
    }
    // The canvas rides as its own pseudo-element so it survives even when #cv itself is skipped above
    // (a scene whose backdrop is a CSS gradient leaves the canvas transparent, hence zero-opacity).
    els.__bg = { cv: bgFingerprint() };
    snap[f] = els;
  }
  return snap;
}

/** Capture the signature for `frames`, rendered in the given order (a pure render is order-blind). */
export const captureSig = (page, frames) => page.evaluate(capture, frames);

/** Diff two signatures. Returns a list of human-readable change lines (empty === identical). */
export function diffSig(base, sig) {
  const diffs = [];
  for (const f of Object.keys(sig)) {
    const a = base[f] || {}, b = sig[f];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!a[k]) { diffs.push(`f${f} +${k} (new)`); continue; }
      if (!b[k]) { diffs.push(`f${f} -${k} (gone)`); continue; }
      for (const fld of Object.keys(SIG_FIELDS)) {
        const av = a[k][fld], bv = b[k][fld];
        // Tolerance is PER FIELD. A shared 0.6 threshold is sane for a pixel box and meaningless for
        // opacity, which lives on 0..1 — it took a >60% opacity change to register, which is why
        // re-easing every fade in the engine diffed as nothing at all.
        const tol = fld === 'op' ? 0.02 : 0.6;
        if ((typeof av === 'number' ? Math.abs(av - bv) > tol : av !== bv)) {
          diffs.push(`f${f} ${k}.${SIG_FIELDS[fld]}: ${JSON.stringify(av)} → ${JSON.stringify(bv)}`);
        }
      }
    }
  }
  return diffs;
}
