// core/layers/board.js — a believable populated workspace from pure data: columns of mini issue-cards
// with the elevation-1 treatment. Hard caps (4 cols × 5 cards); enters as ONE clip.
export function build(kit, el, L) {
  const cols = (L.cols || []).slice(0, 4);
  const colW = ((L.w ?? 1200) - (cols.length - 1) * (L.gap ?? 28)) / Math.max(1, cols.length);
  const ring = 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 1px rgba(0,0,0,0.07), 0 2px 2px rgba(0,0,0,0.05)';
  el.style.display = 'flex'; el.style.gap = (L.gap ?? 28) + 'px';
  el.innerHTML = cols.map((c) => `
    <div style="width:${colW.toFixed(1)}px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;gap:12px;align-items:baseline;font:600 ${L.headSize ?? 24}px var(--font-sans);color:var(--text)">${c.title || ''}<span style="font:500 ${(L.headSize ?? 24) - 4}px var(--font-mono);color:var(--dim)">${c.count ?? ''}</span></div>
      ${(c.cards || []).slice(0, 5).map((k) => `
        <div style="background:var(--surface);border-radius:10px;padding:18px 20px;box-shadow:${ring}">
          <div style="font:500 ${L.cardSize ?? 19}px var(--font-mono);color:var(--dim)">${k.id || ''}</div>
          <div style="font:510 ${(L.cardSize ?? 19) + 3}px var(--font-sans);color:var(--text-2);margin-top:6px">${k.title || ''}</div>
          ${(k.labels || []).length ? `<div style="display:flex;gap:10px;margin-top:12px">${k.labels.map((lb) => `<span style="font:500 ${(L.cardSize ?? 19) - 3}px var(--font-sans);color:var(--text-2);background:rgba(255,255,255,0.04);border-radius:5px;padding:3px 10px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06)"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${lb.c || '#8a8f98'};margin-right:7px;vertical-align:1px"></span>${lb.t}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
    </div>`).join('');
}
