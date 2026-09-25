// quality/gates/audio-render-check.mjs: does the RENDERED mp4 actually sound its declared cues, AT
// THE TIME it declared them?
//
// quality/gates/audio-check.mjs reads the scene JSON: which cues are declared, chosen silence versus
// forgotten silence, where the bed came from. Nothing anywhere opens the rendered mp4's audio. So a
// cue sitting a second early passed every gate on `vawe-flow-2.json`: on paper it was present and
// declared, `audio.cues[].t` said `3.8935` meaning "when the install line lands", the line moved
// during direction, the number did not, and the film shipped 1118ms and 765ms off. This is the audio
// twin of plan-vs-render.mjs: the plan declared an event at time T, does the render have one there?
//
// ONE DECODE, NOT ONE PER CUE. `harness/lib/frame-forensics.mjs` `gridStatsSweep` is the video
// precedent: one ffmpeg pass over the whole film, not one seek per sample point. This does the same
// for sound: one ffmpeg pass decodes the mixed track to mono PCM, one pass over the samples computes a
// short-window loudness envelope and finds onsets (a sudden rise over the trailing floor). No library,
// no ML, the same arithmetic seams.mjs and gridStatsSweep already use for pixels, applied to audio.
//
// THE TRAP THIS EXISTS TO NOT FALL INTO. Cue times are AUTHORED times; `core/engine/tempo.js` scales
// every one of them by 1/tempo at expand, so `vawe-flow-2.json`'s own `tempo: 0.85` would make a naive
// checker compare `3.8935` straight against the mp4 clock and report every cue wrong on every tempo
// film. `loadScene()` (`core/engine/expand.js`) is the LOWERED timeline the renderer actually used
// (relative-time resolved, tempo-scaled, transitions lowered into cuts/stings/seams): read that, never
// the raw file on disk.
//
// TOLERANCE IS LOOSE ON PURPOSE. The real bug measured 1118ms and 765ms off. A 150ms window catches
// both with 5-7x room to spare, so ordinary onset-detection jitter (the ~10ms window hop below) never
// trips it and this gate never becomes the kind of twitchy check that gets waived into silence.
//
//   node quality/gates/audio-render-check.mjs films/scene/<file>.json [--strict]
//   make audio-render-check D=<file>
// FAIL (under --strict only): cue-not-heard.  WARN always: onset-not-declared.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { CUT_CUE, SEAM_CUE } from '../../core/audio/cues.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { gradeable } from './tile.mjs';
import { requireTool } from '../../harness/lib/frame-forensics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const dataArg = argv.find((a) => !a.startsWith('--'));
if (!dataArg || !fs.existsSync(dataArg)) {
  console.error('usage: node quality/gates/audio-render-check.mjs <scene.json> [--strict]');
  process.exit(2);
}

const f = gateFindings({ scene: dataArg });
const raw = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
const data = loadScene(structuredClone(raw));
const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');

const ready = gradeable(dataArg, path.join(ROOT, 'out', `${name}.mp4`));
if (!ready.ok) { console.error(`✗ ${ready.why}.\n  fix: ${ready.fix}`); process.exit(1); }
const mp4 = ready.mp4;

if (data.audio && data.audio.silent === true) {
  console.log(`✓ audio-render-check · audio.silent:true, no track to check`);
  f.emit();
  process.exit(0);
}

// ---- declared cues, in VIEWER time --------------------------------------------------------------
// The same derivation films/scene/scene.js `buildSfx` runs on the render path, minus the two things
// this gate cannot see off the JSON alone: `audio.tactile` (reads the built DOM's `parts[].count`)
// and keystroke clicks (one per revealed character; both are dense-by-design and would swamp onset
// matching with expected near-misses, not the bug this gate exists to catch). Cuts/seams/stings and
// author-placed `audio.cues[]` are exactly the entries with a single, checkable instant.
function declaredCues(d) {
  const cutCue = (style) => { const v = CUT_CUE[style]; return v === null ? null : (v || 'whoosh'); };
  const audioCfg = d.audio || {};
  const auto = audioCfg.auto !== false || !!audioCfg.tactile;
  const eachLayer = (ls, fn) => { for (const L of ls || []) { if (!L || typeof L !== 'object') continue; fn(L); eachLayer(L.children, fn); eachLayer(L.layers, fn); } };
  const cues = [];
  if (auto) eachLayer(d.layers, (L) => { if (L.cut && L.cut !== 'none') cues.push({ t: +(L.start ?? 0), name: cutCue(L.cut), kind: 'cut' }); });
  if (auto) for (const c of (d.cuts || [])) if (c && c.style !== 'none') cues.push({ t: +(+c.t), name: cutCue(c.style), kind: 'cut' });
  if (auto) for (const s of (d.stings || [])) cues.push({ t: +(+s.t), name: 'reveal', kind: 'sting' });
  if (auto) for (const s of (d.seams || [])) if (s && s.fx && s.fx !== 'none') cues.push({ t: +(+(s.t ?? s.at ?? 0)), name: SEAM_CUE[s.fx] || 'whoosh', kind: 'seam' });
  for (const c of ((d.audio && d.audio.cues) || [])) cues.push({ t: +(+c.t), name: c._bakedName || c.name || c.voice || '?', kind: 'authored' });
  cues.sort((a, b) => a.t - b.t);
  const merged = [];
  for (const c of cues) if (!merged.length || c.t - merged[merged.length - 1].t > 0.09) merged.push(c); // same simultaneous-merge floor as buildSfx
  return merged;
}
const cues = declaredCues(data);

// ---- one decode: mono PCM, low rate, plenty for a 150ms tolerance --------------------------------
requireTool('ffmpeg');
const SR = 8000;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'],
  { maxBuffer: 1 << 29 });
if (r.status !== 0 || !r.stdout || r.stdout.length < SR * 4) {
  if (!cues.length) { console.log(`✓ audio-render-check · no declared cues, and ${mp4} carries no readable audio track (nothing to check)`); f.emit(); process.exit(0); }
  f.fail('render-audio-unreadable', `${mp4} carries no readable audio track (ffmpeg: ${(r.stderr || '').trim().split('\n')[0] || 'no output'}), but the scene declares ${cues.length} cue(s)`,
    { at: mp4, fix: 're-render (`make video D=' + dataArg + '`) and confirm the mux step is not silently dropping the audio stream.' });
  f.emit();
  console.error(`✗ audio-render-check: ${f.count} finding(s).`);
  process.exit(strict ? 1 : 0);
}
const samples = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));

// ---- loudness envelope + onsets, ONE pass over the samples ---------------------------------------
// 20ms window, 10ms hop: fine enough to place an onset inside the 150ms tolerance with room to spare,
// coarse enough that a single pass over an 8kHz stream costs nothing (a 22s film is ~2200 windows).
const WIN = Math.round(SR * 0.02), HOP = Math.round(SR * 0.01);
const dbFloor = -60;
const rmsDb = (start) => {
  let sum = 0;
  for (let i = start; i < start + WIN && i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / WIN);
  return rms > 0 ? 20 * Math.log10(rms) : dbFloor;
};
const envelope = [];
for (let s = 0; s + WIN <= samples.length; s += HOP) envelope.push({ t: s / SR, db: rmsDb(s) });

// Onset: this window's loudness jumps ONSET_DB over the trailing 300ms floor (the quietest window in
// that span), and clears an absolute noise floor so silence-to-silence jitter never counts. Merge
// onsets inside MERGE_S into the first one, the same "one event, one timestamp" merge buildSfx itself
// does for simultaneous cues.
const TRAIL_WIN = Math.round(0.3 / (HOP / SR));
const ONSET_DB = 8, NOISE_FLOOR_DB = -45, MERGE_S = 0.1;
const onsets = [];
for (let i = 0; i < envelope.length; i++) {
  if (envelope[i].db < NOISE_FLOOR_DB) continue;
  let floor = envelope[i].db;
  for (let k = Math.max(0, i - TRAIL_WIN); k < i; k++) floor = Math.min(floor, envelope[k].db);
  if (envelope[i].db - floor >= ONSET_DB) {
    if (!onsets.length || envelope[i].t - onsets[onsets.length - 1].t > MERGE_S) onsets.push({ t: envelope[i].t, db: envelope[i].db });
  }
}

// ---- match, both directions -----------------------------------------------------------------------
const TOL_S = 0.15;
const usedOnsets = new Set();
for (const c of cues) {
  let best = null;
  for (const o of onsets) { const d = Math.abs(o.t - c.t); if (!best || d < best.d) best = { ...o, d }; }
  if (best && best.d <= TOL_S) { usedOnsets.add(best.t); continue; }
  const near = best ? `; the nearest sound in the render is at ${best.t.toFixed(2)}s (${(best.d).toFixed(2)}s away)`
    : '; the render has no onset anywhere near it';
  f.fail('cue-not-heard',
    `"${c.name}" cue declared at ${c.t.toFixed(2)}s (${c.kind}) is not heard within ${TOL_S}s${near}`,
    { at: `${c.t.toFixed(2)}s`, fix: c.kind === 'authored'
      ? 'the cue is a plain number: if it marks a layer\'s arrival, name that layer instead of the timestamp (core/timeline/relative-time.js), so it cannot go stale when the layer moves again.'
      : 're-render (`make video D=' + dataArg + '`); a derived cue drifting from its own junction means the render and the JSON disagree about where the cut/seam/sting actually lands.' });
}
// The reverse direction is inherently noisier (a bed, VO or keystrokes are real, undeclared sound by
// design), so it is capped and always a WARN, never blocking even under --strict.
const unmatched = onsets.filter((o) => !usedOnsets.has(o.t)
  && !cues.some((c) => Math.abs(c.t - o.t) <= TOL_S)).sort((a, b) => b.db - a.db).slice(0, 5);
for (const o of unmatched) {
  const nearestCue = cues.reduce((best, c) => (!best || Math.abs(c.t - o.t) < Math.abs(best.t - o.t) ? c : best), null);
  const near = nearestCue ? `; the nearest declared cue is "${nearestCue.name}" at ${nearestCue.t.toFixed(2)}s (${Math.abs(nearestCue.t - o.t).toFixed(2)}s away)` : '; the scene declares no cues at all';
  f.warn('onset-not-declared',
    `a sound onset at ${o.t.toFixed(2)}s has no declared cue within ${TOL_S}s${near}`,
    { at: `${o.t.toFixed(2)}s`, fix: 'name it: an author-placed cue if it is meant, or a bed/VO/keystroke source if it is expected.' });
}

if (!f.count) {
  console.log(`✓ audio-render-check · ${cues.length} declared cue(s), all heard within ${TOL_S}s`);
  f.emit();
  process.exit(0);
}
const failCount = f.records.filter((rec) => rec.severity === 'error').length;
console.error(`✗ audio-render-check: ${f.count} finding(s), ${failCount} cue(s) off by more than ${TOL_S}s.`);
f.emit();
process.exit(strict && failCount ? 1 : 0);
