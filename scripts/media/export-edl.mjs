// scripts/media/export-edl.mjs: A RENDERED SCENE IS CURRENTLY A DEAD END. An editor can only get at
// the cuts, the on-screen text, and the audio events by re-reading the JSON, and most editors do not
// read JSON. This reads the same LOWERED timeline the engine itself renders from (loadScene +
// core/junctions.js, no second copy of the cut math) and writes two sidecars beside the scene: a
// self-describing `.shots.json` for a human or another script, and a minimal CMX3600 `.edl` an NLE
// (Premiere, Resolve, FCP7) can import as a straight assembly.
//
// Pure and read-only: the input JSON is cloned before lowering, nothing here renders or mutates.
//
//   node scripts/media/export-edl.mjs <scene.json> [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/expand.js';
import { marksOf, junctionTable, shotWindows } from '../../core/junctions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;

const argv = process.argv.slice(2);
const dataArg = argv[0];
const outIdx = argv.indexOf('--out');
if (!dataArg || dataArg.startsWith('--') || !fs.existsSync(dataArg)) {
  console.error('usage: node scripts/media/export-edl.mjs <scene.json> [--out <dir>]');
  process.exit(2);
}
const OUT_DIR = outIdx >= 0 && argv[outIdx + 1] ? argv[outIdx + 1] : path.dirname(path.resolve(dataArg));

const raw = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
// clone before lowering: loadScene mutates and deletes what it is handed, and this must never touch
// the caller's file on disk.
const data = loadScene(structuredClone(raw));
const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');
const duration = Number(data.duration) || 0;

const marks = marksOf(data);
const table = junctionTable(marks);
const shots = shotWindows(table, duration);

// the cut/seam marks: the boundary events the editor wants listed, and the same joints shotWindows
// cuts the film on (stings are punctuation, not boundaries). Each is looked up for its style below.
const boundaryMarks = marks.filter((m) => m.kind === 'cut' || m.kind === 'seam');
const styleOf = (mark) => {
  const list = mark.kind === 'cut' ? data.cuts : data.seams;
  const hit = (list || []).find((e) => Math.abs(+e.t - mark.t) < 1e-6);
  return hit?.style ?? hit?.fx ?? null;
};

// a shot's label is the dominant on-screen text at its start: the first top-level text layer live at
// t0, trimmed short so it reads as a slate name, not a caption.
function textAt(t) {
  for (const l of data.layers || []) {
    if (!l || typeof l !== 'object' || l.type !== 'text' || typeof l.text !== 'string') continue;
    const start = Number(l.start) || 0;
    const end = l.duration != null ? start + Number(l.duration) : Infinity;
    if (t >= start && t < end) return l.text;
  }
  return null;
}
const trim = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

const shotList = shots.map((s, i) => {
  const label = textAt(s.start);
  return { i, t0: +s.start.toFixed(2), t1: +s.end.toFixed(2), label: label ? trim(label.replace(/<\/?[bi]>/g, ''), 40) : `shot ${i + 1}` };
});

const cuts = boundaryMarks.map((m) => ({ t: +m.t.toFixed(2), kind: m.kind, style: styleOf(m) }));
// stings punctuate but are not shot boundaries (core/junctions.js), still worth listing as events.
for (const s of data.stings || []) if (Number.isFinite(+s.t)) cuts.push({ t: +(+s.t).toFixed(2), kind: 'sting', style: s.fx ?? null });
cuts.sort((a, b) => a.t - b.t);

// LAYERS: a shallow walk of top-level `layers` only. Nested layers under a group's `children` or a
// composition's own `layers` are not walked, noted below and in the report.
const layers = (data.layers || [])
  .filter((l) => l && typeof l === 'object')
  .map((l) => ({
    id: l.id ?? null,
    type: l.type ?? null,
    t0: +(Number(l.start) || 0).toFixed(2),
    t1: l.duration != null ? +((Number(l.start) || 0) + Number(l.duration)).toFixed(2) : null,
    text: typeof l.text === 'string' ? l.text : null,
  }));

const audioIn = data.audio || {};
const audio = {
  silent: !!audioIn.silent,
  music: audioIn.music ?? null,
  bridges: Array.isArray(audioIn.bridges) ? audioIn.bridges : [],
  // cues: named audio events this scene actually declares (sfx hits), not derived or guessed.
  cues: Array.isArray(audioIn.sfx) ? audioIn.sfx.map((s) => ({ t: s.at ?? s.t, name: s.name ?? s.id ?? 'sfx' })).filter((c) => c.t != null) : [],
};

const sidecar = { scene: name, fps: FPS, duration, shots: shotList, cuts, layers, audio };

// CMX3600, one event per SHOT, straight assembly (src == rec).
function secToTc(sec, fps = FPS) {
  const total = Math.max(0, Math.round(sec * fps));
  const ff = total % fps;
  const totalSec = Math.floor(total / fps);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

function buildEdl() {
  const lines = [`TITLE: ${name}`, 'FCM: NON-DROP FRAME', ''];
  shotList.forEach((s, i) => {
    const inTc = secToTc(s.t0);
    const outTc = secToTc(s.t1);
    const evt = String(i + 1).padStart(3, '0');
    lines.push(`${evt}  AX       V     C        ${inTc} ${outTc} ${inTc} ${outTc}`);
    lines.push(`* FROM CLIP NAME: ${s.label}`);
    lines.push('');
  });
  return lines.join('\n');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const shotsPath = path.join(OUT_DIR, `${name}.shots.json`);
const edlPath = path.join(OUT_DIR, `${name}.edl`);
fs.writeFileSync(shotsPath, JSON.stringify(sidecar, null, 2) + '\n');
fs.writeFileSync(edlPath, buildEdl());

console.log(`export-edl · ${dataArg}`);
console.log(`  ${shots.length} shot(s), ${cuts.length} boundary event(s), ${layers.length} top-level layer(s)`);
console.log(`  wrote ${path.relative(ROOT, shotsPath)}`);
console.log(`  wrote ${path.relative(ROOT, edlPath)}`);
