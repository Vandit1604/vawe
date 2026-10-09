// harness/lib/sound-picture.mjs: the waveform of a track with its onsets, beat grid and cuts drawn on it, as one SVG. Pure.
// One panel per PANEL_S seconds, so a three minute track stays readable at full size.
const PANEL_S = 12;
const W = 1600;
const LEFT = 50;
const RIGHT = 20;
const WAVE_H = 90;
const STEM_H = 40;
const PANEL_H = WAVE_H + STEM_H + 36;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function peaks(samples, rate, offset, from, to, columns) {
  const out = [];
  for (let c = 0; c < columns; c++) {
    const a = Math.max(0, Math.floor((from + ((to - from) * c) / columns - offset) * rate));
    const b = Math.min(samples.length, Math.max(a + 1, Math.floor((from + ((to - from) * (c + 1)) / columns - offset) * rate)));
    let lo = 0, hi = 0;
    for (let i = a; i < b; i++) { if (samples[i] < lo) lo = samples[i]; if (samples[i] > hi) hi = samples[i]; }
    out.push([lo, hi]);
  }
  return out;
}

/** `placed` is placeSound(...); `cuts` is [{ n, t, verdict }] or []; `samples` are the file's mono samples at `rate`. */
export function soundSvg({ samples, rate, placed, cuts = [], title }) {
  const end = placed.window.to ?? placed.duration + placed.offset, start = Math.max(0, placed.window.from);
  const plotW = W - LEFT - RIGHT;
  const panels = Math.max(1, Math.ceil((end - start) / PANEL_S));
  const body = [];
  for (let p = 0; p < panels; p++) {
    const from = start + p * PANEL_S, to = Math.min(end, from + PANEL_S), top = 34 + p * PANEL_H;
    const x = (t) => LEFT + ((t - from) / (to - from)) * plotW, mid = top + WAVE_H / 2, base = top + WAVE_H + STEM_H;
    const inside = (t) => t >= from && t <= to;
    const wave = peaks(samples, rate, placed.offset, from, to, plotW).map(([lo, hi], i) => `<line x1="${LEFT + i + 0.5}" x2="${LEFT + i + 0.5}" y1="${mid - hi * WAVE_H / 2}" y2="${mid - lo * WAVE_H / 2}"/>`).join('');
    const grid = placed.grid.filter((l) => inside(l.t)).map((l) => `<line x1="${x(l.t)}" x2="${x(l.t)}" y1="${top}" y2="${base}" class="${l.kind === 'beat' && l.beat === 1 ? 'bar' : l.kind}"/>`).join('');
    const bars = placed.bars.filter((b) => inside(b.t)).map((b) => `<text x="${x(b.t) + 3}" y="${top - 3}" class="tag">bar ${b.bar}</text>`).join('');
    const stems = placed.onsets.filter((o) => inside(o.attack)).map((o) => `<line x1="${x(o.attack)}" x2="${x(o.attack)}" y1="${base}" y2="${base - o.strength * STEM_H}" class="${o.kind}"/>`).join('');
    const cutLines = cuts.filter((c) => inside(c.t)).map((c) => `<line x1="${x(c.t)}" x2="${x(c.t)}" y1="${top - 8}" y2="${base + 6}" class="cut ${c.verdict.replace(' ', '-')}"/><text x="${x(c.t) + 3}" y="${base + 16}" class="cut-tag">cut ${c.n}</text>`).join('');
    const ticks = Array.from({ length: Math.floor(to - from) + 1 }, (_, i) => Math.ceil(from) + i).filter((t) => t <= to && t % 2 === 0)
      .map((t) => `<text x="${x(t)}" y="${base + 30}" text-anchor="middle" class="axis">${t} s</text>`).join('');
    body.push(`<rect x="${LEFT}" y="${top}" width="${plotW}" height="${WAVE_H + STEM_H}" fill="#f6f7fb"/><g class="wave">${wave}</g>${grid}${stems}${bars}${cutLines}${ticks}`);
  }
  const height = 34 + panels * PANEL_H;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
<style>text{font:12px ui-monospace,Menlo,monospace;fill:#222}.axis{fill:#666}.tag{font-weight:700;fill:#444}.wave line{stroke:#3b5bdb}
.beat{stroke:#888;stroke-width:1}.half{stroke:#bbb;stroke-dasharray:4 3}.quarter{stroke:#ddd;stroke-dasharray:2 4}.bar{stroke:#222;stroke-width:2}
.hit{stroke:#e8590c;stroke-width:3}.sustained{stroke:#7048e8;stroke-width:3}.soft{stroke:#f4a261;stroke-width:2}
.cut{stroke-width:2.5}.on-beat{stroke:#2b8a3e}.near{stroke:#e0a100}.off{stroke:#c92a2a}.cut-tag{font-weight:700}</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="${LEFT}" y="20" style="font-size:15px;font-weight:700">${esc(title)}</text>
${body.join('\n')}
</svg>`;
}
