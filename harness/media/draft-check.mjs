// The draft check's I/O: text sampled from the live page and the ship final check run on the draft mp4.
// The decisions are in harness/lib/draft-check.mjs; the mix level is measureMixLevel in page-audio.mjs.
import { readFeatures, summarize } from './scene-stats.mjs';
import { blankRuns, isFlat, problemsOf } from '../lib/ship-status.mjs';
import { sampleTimes } from '../lib/draft-check.mjs';

/** Static windows, held worlds and blank runs of one video, worst first. Throws when ffmpeg fails. */
export function videoProblems(mp4, authoring = {}) {
  const feats = readFeatures(mp4);
  return problemsOf(summarize(feats), blankRuns(feats, isFlat), undefined, authoring);
}

// Runs inside the page: one { text, fontPx } per visible text node. fontPx includes ancestor transform scale.
function visibleLines() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.replace(/\s+/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || /^rgba\(.*, 0\)$/.test(cs.color)) continue;
    let opacity = 1;
    let scale = 1;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none') { opacity = 0; break; }
      opacity *= Number(s.opacity);
      if (s.transform !== 'none') {
        const m = new DOMMatrix(s.transform);
        scale *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
      }
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    const inside = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    if (opacity > 0.5 && inside) out.push({ text, fontPx: parseFloat(cs.fontSize) * scale, box: [r.x, r.y, r.width, r.height], color: cs.color, opacity });
  }
  return out;
}

/** Seek to each sample time and list the visible text. `seek(ms)` is the renderer's seek; `shots(page)` adds pixels. */
export async function sampleText(page, dur, seek, shots = null) {
  const { step, times } = sampleTimes(dur);
  const samples = [];
  for (const t of times) {
    await seek(t * 1000);
    samples.push({ t, lines: await page.evaluate(visibleLines), ...(shots ? { shots: await shots(page) } : {}) });
  }
  return { samples, step, frameH: await page.evaluate(() => innerHeight) };
}
