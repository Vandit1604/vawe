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
    el.style.letterSpacing = L.tracking ?? (serif ? '0' : (theme?.type?.optical ? trackingFor(L.size ?? 96) : '-0.03em'));
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

  function layoutGroup(el, L) { // layout-by-containment: a flex OR grid box
    if (L.layout === 'grid') {
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
    if (C.type === 'group') {
      c.className = 'hs-group';
      layoutGroup(c, C); chipBox(c, C); sizeChild(c, C, false);
      parentEl.appendChild(c);
      for (const gc of C.children || []) addGroupChild(c, gc, rootL);
      return;
    }
    c.className = C.type === 'image' ? 'hs-img-wrap' : 'hs-text';
    if (C.type === 'image') {
      c.innerHTML = icon(C.src, '');
      const im = c.querySelector('img'); if (im) { im.className = 'hs-img'; if (C.h) im.style.height = C.h + 'px'; if (C.w) im.style.width = C.w + 'px'; }
    } else {
      styleText(c, C, (rootL.start ?? 0) + (rootL.duration ?? 2) / 2);
      chipBox(c, C);
    }
    sizeChild(c, C, C.type === 'image');
    if (C.critical) c.setAttribute('data-layer', 'critical');
    parentEl.appendChild(c);
    extra.push({ L: { ...C, start: rootL.start, duration: rootL.duration }, el: c, units: C.split ? splitText(c, C.split) : null });
  }

  return { ...ctx, hexA, styleText, chipBox, applyFade, layoutGroup, sizeChild, addGroupChild };
}
