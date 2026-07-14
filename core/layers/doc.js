// core/layers/doc.js — a markdown / source FILE card from pure data: optional filename + diff-chip
// header, then blocks (heading with accent bar · mono body · code · bullets). Theme-styled, auto-height.
export function build(kit, el, L) {
  const mono = 'var(--font-mono)', sans = 'var(--font-sans)';
  const nS = L.nameSize ?? 30, hS = L.hSize ?? 40, bS = L.bodySize ?? 30;
  const header = (L.filename || L.diff) ? `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${L.gap ?? 28}px">
      <span style="font:500 ${nS}px ${mono};color:var(--dim)">${L.filename || ''}</span>
      ${L.diff ? `<span style="font:600 ${nS}px ${mono};color:#1a9e57;background:#e8f7ee;border-radius:10px;padding:8px 16px">${L.diff}</span>` : ''}
    </div>` : '';
  const blocks = (L.blocks || []).map((b) => {
    if (b.h != null) { const ac = b.accent || 'var(--accent)';
      return `<div style="display:flex;align-items:center;gap:16px;margin:${L.blockGap ?? 22}px 0 14px">
        <span style="width:5px;height:${hS}px;background:${ac};border-radius:2px"></span>
        <span style="font:700 ${hS}px ${sans};color:${ac}">${b.h}</span></div>`; }
    if (b.code != null) return `<pre style="font:400 ${bS}px ${mono};color:var(--text);background:rgba(128,128,128,0.12);border-radius:10px;padding:18px 20px;margin:12px 0;white-space:pre-wrap">${b.code}</pre>`;
    if (b.bullets) return `<ul style="margin:8px 0;padding-left:26px">${b.bullets.map((li) => `<li style="font:400 ${bS}px ${mono};color:var(--text-2);margin:6px 0">${li}</li>`).join('')}</ul>`;
    return `<div style="font:400 ${bS}px ${mono};color:var(--text-2);line-height:1.5;white-space:pre-wrap">${b.body ?? ''}</div>`;
  }).join('');
  el.style.width = L.w + 'px';
  el.innerHTML = `<div style="background:${L.bg || 'var(--surface)'};border:1px solid var(--line);border-radius:${L.radius ?? 18}px;padding:${L.pad ?? 36}px;box-shadow:0 24px 60px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.05)">${header}${blocks}</div>`;
}
