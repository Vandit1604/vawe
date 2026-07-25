// core/morph.js — TextMorph: letters MIGRATE from word A -> word B. Shared characters glide to their
// new position; letters only in A leave (fade/lift), letters only in B enter (fade). Built on GSAP
// (deterministic, seeked by seekAll), which owns the per-char tweens. The two layouts are measured once
// at build. The layer must set `w` + `align:"center"` so the char row centres (same rule as `circle`).
//
//   { "type":"text", "text":"IDEAS", "w":900, "align":"center", "anim":"none",
//     "morph": { "to":"INBOX", "dur":1.1, "ease":"power3.inOut" } }

// measure(word, styleSrc): each char's CENTRE offset from the word centre, in px, at styleSrc's font.
function measure(word, styleSrc) {
  const cs = getComputedStyle(styleSrc);
  const wrap = document.createElement('span');
  wrap.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden';
  wrap.style.font = cs.font;
  wrap.style.fontFamily = cs.fontFamily;
  wrap.style.fontSize = cs.fontSize;
  wrap.style.fontWeight = cs.fontWeight;
  wrap.style.letterSpacing = cs.letterSpacing;
  const chars = [...word];
  const spans = chars.map((ch) => { const s = document.createElement('span'); s.textContent = ch; wrap.appendChild(s); return s; });
  document.body.appendChild(wrap);
  const wr = wrap.getBoundingClientRect();
  const total = wr.width;
  const slots = spans.map((s, i) => { const r = s.getBoundingClientRect(); return { ch: chars[i], cx: r.left - wr.left + r.width / 2 - total / 2, w: r.width }; });
  document.body.removeChild(wrap);
  return { slots, total };
}

export function buildMorph(el, L, gsap) {
  const A = String(L.text ?? ''), B = String(L.morph.to ?? '');
  const dur = L.morph.dur ?? 1.0, ease = L.morph.ease || 'power3.inOut', start = L.start ?? 0;
  const a = measure(A, el), b = measure(B, el);

  // greedy match: each B char takes the first unused A char of the same value → those letters MIGRATE.
  const usedA = new Array(a.slots.length).fill(false);
  const matchOf = b.slots.map((bs) => {
    for (let i = 0; i < a.slots.length; i++) if (!usedA[i] && a.slots[i].ch === bs.ch) { usedA[i] = true; return i; }
    return -1;
  });

  el.textContent = '';
  // a char span centred at offset cx from the layer centre. `left:50%`+`marginLeft` does the centring so
  // the element's `transform` stays free for GSAP (x/y/opacity).
  const mk = (ch, cx, w) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.cssText = 'position:absolute;top:0;white-space:pre;left:50%;will-change:transform,opacity';
    s.style.marginLeft = (cx - w / 2).toFixed(1) + 'px';
    el.appendChild(s);
    return s;
  };

  b.slots.forEach((bs, j) => {
    const ai = matchOf[j];
    if (ai >= 0) {
      const s = mk(bs.ch, a.slots[ai].cx, a.slots[ai].w);          // start at the A slot, glide to the B slot
      gsap.fromTo(s, { x: 0, opacity: 1 }, { x: +(bs.cx - a.slots[ai].cx).toFixed(1), opacity: 1, duration: dur, ease, delay: start });
    } else {
      const s = mk(bs.ch, bs.cx, bs.w);                            // only in B → fade in on the back half
      gsap.fromTo(s, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: dur * 0.5, ease: 'power2.out', delay: start + dur * 0.5 });
    }
  });
  a.slots.forEach((as, i) => {
    if (usedA[i]) return;                                          // only in A → lift + fade on the front half
    const s = mk(as.ch, as.cx, as.w);
    gsap.fromTo(s, { opacity: 1, y: 0 }, { opacity: 0, y: -18, duration: dur * 0.5, ease: 'power2.in', delay: start });
  });
}
