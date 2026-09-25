// quality/gates/snap-signature.mjs: the ONE definition of a snap signature, shared by both snap gates.
//
// snap-scenes.mjs (whole library) and scene-snap.mjs (one format) both prove "this refactor changed no
// pixels" by diffing a per-frame signature. They used to carry two hand-kept copies of the capture and
// the diff, which is the exact shape of MISTAKES #159: a duplicated definition drifts, one copy goes
// blind, and the gate keeps reporting green. There is now one capture and one diff; both gates import
// them, so a field added here is seen by both.
//
// WHAT THE SIGNATURE RECORDS, and why each field is here:
//   x/y/w/h/tf/op/fs/c/t: layout, motion, fade, type, colour, copy. The original set.
//   cp (clip-path): a wipe / iris / clock reveal is ONLY a clip-path animation. Without this the
//                          signature could not see a reveal at all: `wipe-right` pointed the wrong way
//                          for months and snap said "identical" every single run.
//   cv (canvas hash): the background is painted into <canvas id="cv">, and a DOM signature cannot
//                          see canvas pixels. Without this, any change of bg preset, colour, speed or
//                          direction was invisible.
//   bgc (background): the FOURTH instance of the same gap, found the same way. A composite look's
//                          vignette, grain, scanlines and light leak are all overlay DIVS, so changing
//                          `lightLeak`'s default colour altered two shipped looks and the whole-library
//                          net reported "identical: 104, changed: 0". If a property can carry a visual
//                          change, it belongs here; that is the only rule this list has.
//   ku (split units), NOT a field but a class of ELEMENT, and the same gap one level down. A
//                          kinetic reveal moves `<span class="ku">` units, which carry no id, no
//                          data-layer and no data-start, so every split reveal in the library sat
//                          outside the capture. A real fix to `gradient` + `split` changed one scene's
//                          pixels and the whole-library net reported 103 of 103 identical, because the
//                          one scene whose frames provably moved is the one it could not see
//                          (MISTAKES #399, now #400).
//   ft (filter): a GRADE is invisible to every field above it. Rebuilding the anamorphic
//                          streak and the chromatic split changed how 8 composite looks render across
//                          3 scenes, and the whole-library net reported "identical: 102, changed: 0"
//                          both before and after. Same shape as `cp` and `cv`, third time: a property
//                          that carries a whole class of visual change sat outside the signature, so
//                          the gate was green about something it was not looking at. MISTAKES #351.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

// ---- digest: the small committed stand-in for the gitignored full baselines ----
// Shared by snap-scenes.mjs and snap-blocks.mjs so a fresh clone or CI, which never has the full
// per-scene/per-block baselines (quality/baselines/snap/{scenes,blocks}/ is gitignored, tens of MB),
// still gets a verdict from the one tracked file, quality/baselines/snap/digest.json
// (!quality/baselines/snap/digest.json in .gitignore). One sha256 per entry plus the font state it was
// captured under: it can say WHETHER something moved, never WHAT, which stays local where the full
// baseline lives.

// `assets/fonts/local/` holds PAID, per-developer faces (Sohne, a hand-captured Tiempos): never
// fetched by `make fonts`, never on a CI runner, never the same set from one laptop to the next. Counting
// it here made the font-state hash unreproducible across machines by construction: two checkouts running
// the exact same `make fonts` still disagreed, because the hash also depended on whichever paid fonts one
// of them happened to have dropped in by hand. Only `assets/fonts/` is pinned (generators/media/fonts.mjs
// + harness/media/fonts.lock.json, sha256 per face), so it is the only directory that can make two
// machines agree. A scene whose theme actually needs a `local/` face is not made portable by this, it is
// EXCLUDED instead: see quality/baselines/e2e-known-broken.json's `needsUnlockedFont` list.
const FONT_DIRS = ['assets/fonts'];

/** A BASELINE IS ONLY VALID WITHIN ONE FONT STATE. See snap-scenes.mjs's original banner for why:
 * `assets/fonts/` is gitignored, so a fresh clone, a worktree with a partial font set, or a mid-session
 * `make fonts` all silently rewrite every text width the signature records. */
export function fontState(repoRoot) {
  const names = [];
  for (const d of FONT_DIRS) {
    try { for (const name of fs.readdirSync(path.join(repoRoot, d))) {
      const st = fs.statSync(path.join(repoRoot, d, name));
      if (st.isFile()) names.push(`${d}/${name}:${st.size}`);
    } } catch { /* absent is a state too, and it hashes to a different one */ }
  }
  names.sort();
  return { n: names.length, hash: crypto.createHash('sha256').update(names.join('\n')).digest('hex').slice(0, 12) };
}

export const sha = (v) => crypto.createHash('sha256').update(v).digest('hex').slice(0, 16);

/** Read digest.json, or null when it does not exist yet (first save). */
export function loadDigest(digestPath) {
  try { return JSON.parse(fs.readFileSync(digestPath, 'utf8')); } catch { return null; }
}

/** One entry's {sig, font}, reading both the current {sig,font} shape and the old flat
 * name->hash-under-one-top-level-`font` shape a digest predating per-entry stamps used. */
export function digestEntry(digest, collectionKey, name) {
  const raw = digest && digest[collectionKey] && digest[collectionKey][name];
  if (raw == null) return null;
  if (typeof raw === 'string') return { sig: raw, font: digest.font && digest.font.hash };
  return raw;
}

/**
 * MERGE, never replace, and only the named collection. A checkout only ever sees PART of a gitignored
 * population (films/scene/*.json or a subset of blocks/), so writing `nowMap` alone would erase every
 * entry this checkout cannot see; other collections in the same digest file (e.g. `scenes` while saving
 * `blocks`) are carried through untouched. Each entry keeps its own font stamp, so an entry saved
 * earlier under a different font state stays a valid, self-labelled record.
 */
export function mergeDigest(digest, collectionKey, nowMap, fontHash) {
  const merged = {};
  if (digest && digest[collectionKey]) for (const name of Object.keys(digest[collectionKey])) merged[name] = digestEntry(digest, collectionKey, name);
  for (const name of Object.keys(nowMap)) merged[name] = { sig: nowMap[name], font: fontHash };
  // Sorted, because an unsorted map re-orders itself on every save and the tracked file would show a
  // diff on a run that changed nothing.
  const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
  return { ...(digest || {}), [collectionKey]: sorted };
}

export function writeDigest(digestPath, digest) {
  fs.writeFileSync(digestPath, JSON.stringify(digest, null, 1) + '\n');
}

/** Field key → human name, used for both the diff labels and the field list itself. */
export const SIG_FIELDS = {
  x: 'x', y: 'y', w: 'w', h: 'h', tf: 'transform', op: 'opacity', fs: 'font', c: 'color', t: 'text',
  cp: 'clip-path', cv: 'canvas', ft: 'filter', bgc: 'background',
};

// The browser-side capture. Passed whole to page.evaluate, so it may not reference anything outside
// itself, everything it needs is defined inline.
function capture(frames) {
  const round = (v) => Math.round(v * 10) / 10;
  // WHICH elements are captured. `[data-layer="critical"]` is only ever set on big TEXT layers, every
  // rect, image, group, component and glow was outside the signature entirely, which is the other half
  // of why a mis-pointed wipe went unseen: the wipe lived on a rect. `[data-start]` is exactly the set
  // driveClips animates, so the signature now covers every timed layer rather than the text ones.
  // `.ku` is a SPLIT UNIT (core/type.js splitText). It carries none of the three attributes above, so
  // until it was named here every kinetic type reveal in the library was outside the capture.
  const SEL = '[id], [data-layer="critical"], [data-start], .ku';

  // A split can in principle produce one unit per character, and each unit is one row per sampled
  // frame. Nothing in the library comes near this today (the biggest single layer splits into 77
  // units), so the cap does not bite; it exists so a 500-glyph char split cannot make the signature
  // unreadable without anyone deciding to. Sampling is a fixed stride, first and last always kept, so
  // the same units are picked every run.
  const UNIT_CAP = 120;
  const sampleUnits = (units) => {
    if (units.length <= UNIT_CAP) return units;
    const step = (units.length - 1) / (UNIT_CAP - 1);
    const out = [];
    for (let i = 0; i < UNIT_CAP; i++) out.push(units[Math.round(i * step)]);
    return out;
  };

  // Deterministic fingerprint of the background canvas.
  //
  // The full bitmap is 1080x1920; hashing it raw would trip on antialiasing and GPU dither noise every
  // run. So downsample to 32x18 first (drawImage averages whole tiles of source pixels, which drowns
  // per-pixel noise) and quantise each channel to 64 levels before hashing. That is coarse enough to be
  // stable run to run and still fine enough to move when a preset, colour, speed or direction changes.
  //
  // Baselines live in quality/baselines/snap/, which is GITIGNORED and therefore local-only, so the fingerprint
  // never has to survive a different machine's GPU, cross-machine variance is acceptable here.
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

  // Which units survive the cap. splitText runs once at build, so the unit set is fixed for the whole
  // capture and this is decided once rather than per frame.
  const keptUnits = (() => {
    const byHost = new Map();
    for (const u of document.querySelectorAll('.ku')) {
      const host = (u.parentElement && u.parentElement.closest('[id], [data-layer="critical"], [data-start]')) || document.body;
      if (!byHost.has(host)) byHost.set(host, []);
      byHost.get(host).push(u);
    }
    const keep = new Set();
    for (const list of byHost.values()) for (const u of sampleUnits(list)) keep.add(u);
    return keep;
  })();

  const snap = {};
  for (const f of frames) {
    window.__engine.renderFrame(f);
    const els = {};
    // VISIBILITY IS A PROPERTY OF THE CHAIN, NOT OF THE ELEMENT. The per-element test below was enough
    // while every captured element was a layer wrapper, because a layer carries its own opacity. A split
    // unit does not: its layer holds the fade, and `getComputedStyle(unit).opacity` reads 1 all through
    // a beat the unit is nowhere near. So the signature recorded units of layers that were off screen,
    // and an off-screen layer is not re-animated, so what it recorded was whichever frame last touched
    // them. That is a stale value masquerading as this frame's, and it read as order-dependence in 68
    // scenes. Cached per frame: the chain is walked once per element and the answers are reused.
    const hiddenCache = new Map();
    const hiddenChain = (el) => {
      if (!el || el === document.body) return false;
      if (hiddenCache.has(el)) return hiddenCache.get(el);
      const s = getComputedStyle(el);
      const v = s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || hiddenChain(el.parentElement);
      hiddenCache.set(el, v);
      return v;
    };
    for (const el of document.querySelectorAll(SEL)) {
      if (el.classList.contains('ku') && !keptUnits.has(el)) continue;
      const b = el.getBoundingClientRect(); if (b.width < 1 && b.height < 1) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity === 0) continue;
      if (hiddenChain(el.parentElement)) continue;
      const key = keyOf(el);
      // Record text ONLY for LEAF content. A scaffold wrapper (root/cam/stage, a group) concatenates all
      // descendant text, so a typing/decode layer mid-reveal makes the wrapper's aggregate text look
      // order-dependent even when every leaf is pure. A false non-determinism signal. Skip it for any
      // element that contains another captured element; leaf text layers keep their text.
      // `.ku` joins the wrapper test for the same reason: a split container's own text is now carried,
      // unit by unit, by its children, and the aggregate adds nothing the leaves do not already say.
      const isWrapper = !!el.querySelector('[id], [data-layer="critical"], .ku');
      els[key] = {
        x: round(b.left), y: round(b.top), w: round(b.width), h: round(b.height),
        tf: s.transform === 'none' ? '' : s.transform,
        op: Math.round(+s.opacity * 1000) / 1000, fs: s.fontSize, c: s.color,
        cp: !s.clipPath || s.clipPath === 'none' ? '' : s.clipPath,
        // A composite look resolves to a `filter` string, and on an IMAGE layer it is set on the inner
        // <img> rather than the wrap (core/looks.js applyComposite), so read that when it is there.
        // Overlay children carry the look's texture; the layer's own background carries a rect's fill.
        bgc: (() => {
          const own = s.backgroundImage && s.backgroundImage !== 'none' ? s.backgroundImage : (s.backgroundColor || '');
          const ovs = [...el.querySelectorAll(':scope > .hs-look-ov, :scope > .hs-vignette')]
            .map((o) => { const c = getComputedStyle(o); return (c.backgroundImage !== 'none' ? c.backgroundImage : c.backgroundColor) + '|' + c.opacity; });
          return (own + (ovs.length ? '::' + ovs.join('::') : '')).slice(0, 400);
        })(),
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

/**
 * Render `frames` once and measure nothing.
 *
 * THE FIRST PASS OVER A FRESH PAGE IS NOT LIKE ANY LATER PASS, and until the signature could see split
 * units nothing here depended on the difference. A kinetic preset writes `transform` (and, for `decode`,
 * text) onto a unit only while that unit's window is live, and never clears it afterwards. So a unit
 * carries three distinguishable states at the same frame: never written (`transform: none`), written
 * this frame, and holding what some other frame left. Only the first of those is unreachable once any
 * pass has run, which made the ascending pass privileged: it was the only one that ever saw a virgin
 * unit, and the descending pass then read `matrix(1, 0, 0, 1, 0, 0)` where the ascending pass read
 * `none`. Same pixels, different string, 68 scenes quarantined for it.
 *
 * Priming puts both passes on the same footing, and it deliberately does NOT paper over the leak it
 * compensates for: a scene whose frame f depends on which frames ran before it still diffs, because the
 * two passes still arrive at f from opposite directions. What priming removes is the one difference
 * that is an artefact of the harness rather than of the scene.
 */
export const primeFrames = (page, frames) => page.evaluate((fs) => { for (const f of fs) window.__engine.renderFrame(f); }, frames);

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
        // opacity, which lives on 0..1. It took a >60% opacity change to register, which is why
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
