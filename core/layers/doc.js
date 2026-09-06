// core/layers/doc.js. A markdown / source FILE card from pure data: optional filename + diff-chip
// header, then blocks (heading with accent bar · mono body · code · bullets). Theme-styled, auto-height.
// `blocks` carries the document body; its keys (h · code · bullets · body) are the block's vocabulary.
import { propsOf } from '../registry/props.js';

// The props are read off this signature (propsOf, core/props.js). No second list to drift from it.
export function build(kit, el, L,
  { blocks: blockData, filename, diff, w, bg, radius, pad, gap, blockGap, nameSize, hSize, bodySize } = L) {
  const mono = 'var(--font-mono)', sans = 'var(--font-sans)';
  const nS = nameSize ?? 30, hS = hSize ?? 40, bS = bodySize ?? 30;
  const header = (filename || diff) ? `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${gap ?? 28}px">
      <span style="font:500 ${nS}px ${mono};color:var(--dim)">${filename || ''}</span>
      ${diff ? `<span style="font:600 ${nS}px ${mono};color:#1a9e57;background:#e8f7ee;border-radius:10px;padding:8px 16px">${diff}</span>` : ''}
    </div>` : '';
  const blocks = (blockData || []).map((b) => {
    if (b.h != null) { const ac = b.accent || 'var(--accent)';
      return `<div style="display:flex;align-items:center;gap:16px;margin:${blockGap ?? 22}px 0 14px">
        <span style="width:5px;height:${hS}px;background:${ac};border-radius:2px"></span>
        <span style="font:700 ${hS}px ${sans};color:${ac}">${b.h}</span></div>`; }
    if (b.code != null) return `<pre style="font:400 ${bS}px ${mono};color:var(--text);background:rgba(128,128,128,0.12);border-radius:10px;padding:18px 20px;margin:12px 0;white-space:pre-wrap">${b.code}</pre>`;
    if (b.bullets) return `<ul style="margin:8px 0;padding-left:26px">${b.bullets.map((li) => `<li style="font:400 ${bS}px ${mono};color:var(--text-2);margin:6px 0">${li}</li>`).join('')}</ul>`;
    return `<div style="font:400 ${bS}px ${mono};color:var(--text-2);line-height:1.5;white-space:pre-wrap">${b.body ?? ''}</div>`;
  }).join('');
  el.style.width = w + 'px';
  el.innerHTML = `<div style="background:${bg || 'var(--surface)'};border:1px solid var(--line);border-radius:${radius ?? 18}px;padding:${pad ?? 36}px;box-shadow:0 24px 60px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.05)">${header}${blocks}</div>`;
}

export const PROPS = propsOf(build);

// The catalogue row for this type (docs/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a file card from pure data: an optional filename + diff chip, then heading / body / code / bullet blocks, theme-styled and auto-height";
