// core/layers/util.js — shared helpers for the layer primitives (core/layers/*). `createKit(ctx)` binds
// them to the scene's services (theme, inkAt, cam, splitText, …) so every primitive builder is a small
// pure-ish file that takes the kit. Ported verbatim from scene.html's inline helpers (byte-identical).

import { applyLayerFilter } from '../filters.js';
import { isLook, applyComposite } from '../looks.js';

// hexA('#5e6ad2', .25) → rgba string (glow/beam colours come as brand hex)
export function hexA(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function createKit(ctx) {
  const { theme, inkAt, bgWinAt, ACCENT_BGS, trackingFor, splitText, icon } = ctx;
  const extra = ctx.extra;

  function styleText(el, L, midT) {
    const serif = L.font === 'serif', mono = L.font === 'mono';
    el.style.fontFamily = `var(--font-${serif ? 'serif' : mono ? 'mono' : 'sans'})`;
    // serif defaults to italic (elegant display default); `italic:false` opts a serif upright (or
    // `italic:true` slants any face). Non-breaking: omitted → current behaviour.
    el.style.fontStyle = (L.italic != null ? L.italic : serif) ? 'italic' : 'normal';
    el.style.fontWeight = String(L.weight ?? (serif ? 400 : 800));
    // `ls` and `tracking` are the same property under two names. `ls` was DECLARED in the schema,
    // documented as "Letter-spacing (e.g. -0.03em)", used in 18 places across shipped scenes — and
    // only ever read inside a guard in text.js that suppresses auto-tracking. Setting it removed the
    // optical default and applied nothing (docs/MISTAKES.md #79). Found by `make layer-props` on its
    // first run, which is the whole reason that gate exists.
    el.style.letterSpacing = L.tracking ?? L.ls ?? (serif ? '0' : (theme?.type?.optical ? trackingFor(L.size ?? 96) : '-0.03em'));
    el.style.fontSize = (L.size ?? 96) + 'px';
    if (L.w != null) el.style.width = L.w + 'px';
    if (L.align) el.style.textAlign = L.align;
    const auto = inkAt(midT);
    if (L.color) el.style.color = L.color; else if (auto) el.style.color = auto;
    // <b> emphasis colour: explicit emColor wins; else the brand accent for the POP — EXCEPT over an
    // accent-coloured field, where accent-on-accent vanishes, so emphasis falls back to the layer's OWN
    // colour (bold, always visible). Guard against blue-on-blue. (Must be a real colour, not `inherit`.)
    const w = bgWinAt(midT);
    const layerColor = L.color || auto || 'var(--text)';
    const emDefault = w && ACCENT_BGS.includes(w.preset) ? layerColor : 'var(--accent)';
    el.style.setProperty('--em', L.emColor || emDefault);
    el.innerHTML = L.type === 'count' ? '' : (L.text || '');
    if (L.type === 'count') { el.style.fontVariantNumeric = 'tabular-nums'; el.textContent = (L.prefix || '') + (L.from ?? 0).toFixed(L.decimals ?? 0) + (L.suffix || ''); }
  }

  function chipBox(el, L) { // shared box treatment: bg/pad/radius/border/shadow/elevation on ANY layer
    if (L.bg == null && !L.border && !L.shadow && !L.elevation) return;
    if (L.bg) el.style.background = L.bg; else if (L.elevation) el.style.background = 'var(--surface)';
    if (L.pad != null) el.style.padding = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
    el.style.borderRadius = (L.radius ?? 16) + 'px';
    if (L.border && !L.elevation) el.style.border = L.border === true ? '1px solid var(--line)' : L.border;
    if (L.elevation) {
      const light = L.on === 'light';
      const stack = [
        light ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        light ? 'inset 0 1px 0 rgba(255,255,255,0.7)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        '0 1px 1px rgba(0,0,0,0.07)', '0 2px 2px rgba(0,0,0,0.05)',
      ];
      const e = Math.min(4, Math.max(1, L.elevation | 0));
      if (e >= 2) stack.push('0 4px 8px rgba(0,0,0,0.2)');
      if (e >= 3) stack.push('0 12px 24px rgba(0,0,0,0.28)');
      if (e >= 4) stack.push('0 0 64px rgba(0,0,0,0.4)');
      if (L.glow) stack.push(`0 0 64px ${L.glow === true ? 'var(--accent-glow)' : hexA(L.glow, 0.25)}`);
      el.style.boxShadow = stack.join(', ');
    } else if (L.shadow) el.style.boxShadow = '0 24px 70px rgba(20,20,25,0.12)';
    if (el.classList.contains('hs-text')) el.style.display = 'inline-block';
  }

  function applyFade(el, L) { // static edge mask; MUTUALLY EXCLUSIVE with `cut`
    // filter routing rides here because scene.html calls applyFade for EVERY layer right after it
    // writes the raw L.filter string — resolving named grade presets (core/filters.js) at this hook
    // needs no consumption-point edit. Raw CSS filter strings resolve to themselves (no-op).
    if (L.filter) { if (isLook(L.filter)) applyComposite(el, L.filter, L.lookOpts); else applyLayerFilter(el, L.filter); }
    if (!L.fade) return;
    if (L.cut) throw new Error(`layer "${L.text || L.type}": fade and cut are mutually exclusive — put the fade on an inner layer`);
    const g = { right: 'linear-gradient(90deg, #000 55%, transparent 98%)',
                left: 'linear-gradient(270deg, #000 55%, transparent 98%)',
                bottom: 'linear-gradient(180deg, #000 55%, transparent 98%)',
                top: 'linear-gradient(0deg, #000 55%, transparent 98%)',
                edges: 'radial-gradient(120% 120% at 50% 50%, #000 60%, transparent 100%)' }[L.fade];
    if (g) { el.style.maskImage = g; el.style.webkitMaskImage = g; }
  }

  // The per-layer decoration that scene.html applied to top-level layers and to nothing else, so
  // `filter`, `mask`, `fade`, `lookOpts`, `reflect` and `logotype` were all silently dropped the moment
  // a layer moved inside a group. Extracted so there is ONE definition and both paths call it — the
  // same reason the safe box and the canvas size each had to be collapsed to one (MISTAKES #70).
  // GLASS. `backdrop-filter` reads the pixels BEHIND an element, which is the one thing the shader
  // path cannot do — core/stings.js and core/shaders-ambient.js are generative overlays with no
  // sampler2D, so frosted glass and everything in that family was blocked on a structural
  // layer-as-texture change. CSS has had the capability all along and the repo had zero occurrences
  // of it. This is the cheap half: blur/saturate what is behind. It does NOT give radial/zoom/spin
  // blur, which still need real sampling (docs/ROADMAP.md).
  //   glass: true            → a sensible frosted default
  //   glass: 18              → blur radius in px
  //   glass: 'blur(18px) saturate(1.4)'  → the raw filter, for full control
  function applyGlass(el, L) {
    if (L.glass == null || L.glass === false) return;
    const f = L.glass === true ? 'blur(14px) saturate(1.35)'
      : typeof L.glass === 'number' ? `blur(${L.glass}px) saturate(1.3)` : String(L.glass);
    el.style.backdropFilter = f;
    el.style.webkitBackdropFilter = f;
  }

  function decorate(el, L) {
    applyGlass(el, L);
    if (L.mask) { el.style.webkitMaskImage = L.mask; el.style.maskImage = L.mask; }
    applyFade(el, L);   // resolves L.filter / named looks / L.lookOpts too
    if (L.reflect) el.style.webkitBoxReflect = `below 0 linear-gradient(transparent 62%, rgba(0,0,0,${L.reflect === true ? 0.12 : L.reflect}))`;
    if (L.logotype) el.setAttribute('data-logotype', '1');
  }

  function layoutGroup(el, L) { // layout-by-containment: a flex OR grid box, or FREE placement
    // `free`: children carry their own x/y inside the group instead of flowing. Without it, any
    // composition whose positions are computed (a bubble map, a ring, a scatter) costs ONE TOP-LEVEL
    // LAYER PER ELEMENT — 46 for tpot's map — and slams into the 120-layer cap for a reason that has
    // nothing to do with complexity. Flow layouts cannot express "at this coordinate", so authors had
    // no way down. With `free` + per-child `delay` the same composition is a single layer.
    if (L.layout === 'free') {
      el.style.display = 'block';
      el.dataset.free = '1'; // read by addGroupChild — children must place themselves
    } else if (L.layout === 'grid') {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(${L.gridCols ?? 2}, ${L.colw ? L.colw + 'px' : '1fr'})`;
      el.style.columnGap = (L.colGap ?? L.gap ?? 24) + 'px';
      el.style.rowGap = (L.rowGap ?? L.gap ?? 24) + 'px';
      el.style.justifyItems = L.items || L.align2 || 'stretch';
    } else {
      el.style.display = 'flex';
      el.style.flexDirection = (L.layout || L.direction) === 'column' ? 'column' : 'row';
      el.style.gap = (L.gap ?? 24) + 'px';
      el.style.flexWrap = L.wrap ? 'wrap' : 'nowrap';
      el.style.alignItems = L.items || L.align2 || 'center';
      el.style.justifyContent = L.justify || 'flex-start';
    }
    if (L.pad != null) el.style.padding = typeof L.pad === 'number' ? L.pad + 'px' : L.pad;
    if (L.h != null) el.style.height = L.h + 'px';
  }

  function sizeChild(c, C, isImg) {
    if (C.grow != null) c.style.flexGrow = String(C.grow);
    if (C.basis != null) c.style.flexBasis = typeof C.basis === 'number' ? C.basis + 'px' : C.basis;
    if (!isImg) { if (C.w != null) c.style.width = C.w + 'px'; if (C.h != null) c.style.height = C.h + 'px'; }
  }

  function addGroupChild(parentEl, C, rootL) { // recursive: nested group OR a text/image/count leaf
    const c = document.createElement('div');
    // A nested GROUP used to return here — before decorate(), before the timing dataset, before the
    // extra[] push. So `delay`, `anim`, `out`, `enterDur`, `mask`, `filter` and `vars` were accepted on
    // a nested group and silently ignored, while the identical props worked one node down on a leaf.
    // MISTAKES #69 fixed exactly this and fixed it for LEAVES ONLY; the early return was two lines
    // above the code being written and got missed. A group is a timed element like any other.
    const isGroup = C.type === 'group';
    if (isGroup) {
      c.className = 'hs-group';
      layoutGroup(c, C); chipBox(c, C); sizeChild(c, C, false);
      parentEl.appendChild(c);
      for (const gc of C.children || []) addGroupChild(c, gc, rootL);
    }
    if (!isGroup) c.className = C.type === 'image' ? 'hs-img-wrap' : 'hs-text';
    // DELEGATE to the primitive. This file used to re-implement a SUBSET of each type's build inline,
    // which is why a child silently lost image `canvasFx` (baked at boot, then thrown away), `ken`'s
    // clip box, `edgeFade`, and text's `fit`/`fitH`/`maxLines`/`raw` and the whole microType pass.
    // Re-implementing a builder is how the subset drifts from the original; calling it cannot.
    if (!isGroup) {
      if (api.buildLeaf) api.buildLeaf(c, C);
      else if (C.type === 'image') { c.innerHTML = icon(C.src, ''); }
      else { styleText(c, C, (rootL.start ?? 0) + (rootL.duration ?? 2) / 2); chipBox(c, C); }
      sizeChild(c, C, C.type === 'image');
    }
    decorate(c, C);   // both paths: mask / filter / look / fade / reflect / logotype
    if (C.critical) c.setAttribute('data-layer', 'critical');
    if (parentEl.dataset.free) { c.style.position = 'absolute'; c.style.left = (C.x || 0) + 'px'; c.style.top = (C.y || 0) + 'px'; }
    if (!isGroup) parentEl.appendChild(c);   // a group appended itself above, before recursing
    // `delay` staggers a child WITHIN its group's window (it still ends with the group, so the exit
    // stays in formation). Group children previously all shared the root's exact window, which is why
    // a wall could only ever arrive as one block. Defaults to 0 → existing groups are unchanged.
    const d = Math.max(0, +C.delay || 0);
    const cStart = (rootL.start ?? 0) + d, cDur = Math.max(0, (rootL.duration ?? 0) - d);
    // driveClips owns every timed element and it finds them by `[data-start]` (core/clips.js). A group
    // child never had those attributes, so its ENTRANCE came from the group's window no matter what the
    // child declared: `delay` shifted a start that only the cut/motion/units paths read, and the child
    // still faded in with its siblings. 69 authored uses, every one inert — including the one this prop
    // was added for, which was signed off from a settled frame where the stagger was already over
    // (MISTAKES #69). Writing the dataset hands the child to the same driver as a top-level layer, so
    // delay/anim/out/enterDur/exitDur mean here exactly what they mean out there.
    c.dataset.start = String(cStart);
    c.dataset.duration = String(cDur);
    if (C.anim) c.dataset.anim = C.anim;
    if (C.out) c.dataset.out = C.out;
    if (C.enterDur != null) c.dataset.enter = String(C.enterDur);
    if (C.exitDur != null) c.dataset.exitDur = String(C.exitDur);
    extra.push({ L: { ...C, start: cStart, duration: cDur }, el: c, units: C.split ? splitText(c, C.split) : null });
  }

  const api = { ...ctx, hexA, styleText, chipBox, applyFade, decorate, layoutGroup, sizeChild, addGroupChild };
  return api;
}
