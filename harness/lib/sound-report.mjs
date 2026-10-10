// harness/lib/sound-report.mjs: the text of `vawe sound` (sound.md). Pure: placed sound (sound-read.mjs placeSound), cut rows (cutsVsSound), page cues in; lines out.
import { ON_BEAT_FRAMES, NEAR_FRAMES } from './sound-read.mjs';

const s2 = (n) => (n == null ? '-' : Number(n).toFixed(2));
const sign = (n) => (n == null ? '-' : `${n > 0 ? '+' : ''}${n}`);
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const more = (shown, total, file) => (total > shown ? [`... ${total - shown} more rows in ${file}`] : []);

function tempoLines(p) {
  const t = p.tempo;
  if (!t.bpm) return ['Tempo: none found.'];
  const verdict = t.confidence >= 2.5 ? 'strong' : t.usable ? 'usable' : 'WEAK: ambient or free time, cut to the hits, not to the grid';
  const first = p.grid.find((l) => l.kind === 'beat');
  return [`Tempo ${t.bpm} BPM, confidence ${t.confidence} (${verdict}); one beat is ${s2(t.periodS)} s = ${(t.periodS * 30).toFixed(1)} frames at 30 fps, ${(t.periodS * 60).toFixed(1)} at 60 fps.`,
    first ? `Beat phase: the first beat is at ${s2(first.t)} s (frame ${first.f30} at 30 fps, ${first.f60} at 60 fps); bars of 4 beats, bar 1 starts at ${s2(p.bars[0]?.t)} s.` : ''].filter(Boolean);
}

/** { head, cues } of the lines before the cut table: header, loudness, tempo, sections, top hits, grid, every onset. `limit` caps the long tables. */
export function soundLines({ name, source, placed, limit = Infinity, file = 'sound.md' }) {
  const L = [`# sound: ${name}`, '', `Source ${source}. Duration ${s2(placed.duration)} s${placed.offset ? `; the file starts at film second ${s2(placed.offset)} (data-at minus data-trim), all seconds below are film seconds` : ''}.`];
  if (placed.window.from > 0 || placed.window.to != null) L.push(`Window ${s2(placed.window.from)} to ${s2(placed.window.to ?? placed.duration + placed.offset)} s only.`);
  L.push(placed.loudness ? `Loudness ${placed.loudness.lufs} LUFS integrated, true peak ${placed.loudness.truePeakDb} dBFS.` : `${placed.loudnessNote ?? 'Loudness: not measured'}.`, ...tempoLines(placed), '');
  const top = placed.top.map((t) => placed.onsets.find((o) => o.attack === t)).filter(Boolean);
  L.push('## Strongest hits, ranked', '', 'Put a cue or a cut on `attack` (where the sound starts); `peak` is the loudest change, later.', '',
    ...table(['#', 'attack s', 'f30', 'f60', 'peak s', 'strength', 'kind', 'sounds like', ...(top.some((o) => o.moves) ? ['what moves'] : [])], top.map((o, i) => [i + 1, s2(o.attack), o.f30, o.f60, s2(o.peak), o.strength, o.kind, o.sound ?? '-', ...(top.some((x) => x.moves) ? [o.moves ?? '-'] : [])])), '');
  L.push('## Quiet and loud sections', '', ...(placed.sections.length ? table(['from s', 'to s', 'level', 'dB'], placed.sections.map((x) => [s2(x.from), s2(x.to), x.level, x.db])) : ['No section stands out from the median level by a clear margin.']), '');
  const beats = placed.grid.filter((l) => l.kind === 'beat');
  const sub = (b, share) => placed.grid.find((l) => l.bar === b.bar && l.beat === b.beat && l.kind === (share === 0.5 ? 'half' : 'quarter') && Math.abs(l.t - (b.t + placed.tempo.periodS * share)) < 0.002);
  const cell = (l) => (l ? `${s2(l.t)} (${l.f30})` : '-');
  L.push('## Beat grid', '', `${placed.tempo.usable ? '' : 'The tempo is weak: this grid is a guess. '}Each row is one beat; the +1/4, +1/2 and +3/4 columns give the quarter and half beat after it as seconds (frame at 30 fps).`, '',
    ...(beats.length ? table(['bar.beat', 'beat s', 'f30', 'f60', '+1/4', '+1/2', '+3/4'], beats.slice(0, limit).map((b) => [`${b.bar}.${b.beat}`, s2(b.t), b.f30, b.f60, cell(sub(b, 0.25)), cell(sub(b, 0.5)), cell(sub(b, 0.75))])) : ['No grid.']),
    ...more(limit, beats.length, file), '');
  L.push(`## Every onset (${placed.onsets.length})`, '', 'kind: hit is a clear strike, soft a weak one (strength under 0.25), sustained a slow rise (a swell or pad). Sounds like: click (bright, under 0.09 s), pop (short, mid), swish (bright, longer), impact (low, over 0.25 s), sustained (slow rise or over 0.6 s).', '',
    ...table(['attack s', 'f30', 'f60', 'peak s', 'strength', 'kind', 'sounds like', 'rise ms', ...(placed.onsets.some((o) => o.moves) ? ['what moves'] : [])], placed.onsets.slice(0, limit).map((o) => [s2(o.attack), o.f30, o.f60, s2(o.peak), o.strength, o.kind, o.sound ?? '-', o.errMs, ...(placed.onsets.some((x) => x.moves) ? [o.moves ?? '-'] : [])])), ...more(limit, placed.onsets.length, file), '');
  return L;
}

/** The page's synth and file cues as rows, each against the nearest beat line. */
export function cueLines(cues, placed) {
  if (!cues.length) return [];
  const lines = placed.tempo.usable ? placed.grid.filter((l) => l.kind !== 'quarter') : [];
  const rows = cues.map((c) => {
    const near = lines.reduce((b, l) => (b == null || Math.abs(l.t - c.at) < Math.abs(b.t - c.at) ? l : b), null);
    return [s2(c.at), c.voice, c.gain, c.world ?? '-', near ? `${near.kind === 'beat' ? `beat ${near.bar}.${near.beat}` : 'half beat'} ${s2(near.t)} s` : '-', near ? sign(Math.round((c.at - near.t) * 1000)) : '-'];
  });
  return ['## Cues of the page (separate from the bed)', '', ...table(['at s', 'voice', 'dB', 'world', 'nearest beat line', 'offset ms'], rows), ''];
}

/** The cut table, the strong hits that carry no cut, and one advice line per cut that is not on the beat. */
export function cutLines({ result, fps, source }) {
  const { rows, uncut, onBeat } = result;
  const L = [`## Cuts against the sound (${source})`, '', `Verdict at ${fps} fps: on beat is within ${ON_BEAT_FRAMES} frame of a hit or a beat or half-beat line, near within ${NEAR_FRAMES}, off beyond. Offset is the cut minus the target: + means the cut comes after the sound.`, '',
    `${onBeat} of ${rows.length} cuts are on the beat.`, ''];
  L.push(...table(['cut', 'at s', 'frame', 'nearest hit s', 'nearest line', 'offset ms', 'offset f', 'verdict'], rows.map((r) => [r.n, s2(r.t), Math.round(r.t * fps),
    r.hit ? `${s2(r.hit.t)} (${sign(r.hit.ms)} ms)` : '-', r.line ? `${r.line.what} ${s2(r.line.t)} (${sign(r.line.ms)} ms)` : '-', sign(r.ms), sign(r.frames), r.verdict])), '');
  const off = rows.filter((r) => r.move != null);
  L.push('## Strong hits that carry no cut', '', ...(uncut.length ? table(['attack s', 'frame', 'strength'], uncut.slice(0, 12).map((o) => [s2(o.t), o.f, o.strength])) : ['None: every strong hit has a cut within 3 frames.']), '');
  L.push('## Advice', '', ...(off.length ? off.map((r) => `- cut ${r.n} at ${s2(r.t)} s is ${Math.abs(r.frames)} f ${r.frames > 0 ? 'after' : 'before'} the ${r.best.what} at ${s2(r.best.t)} s (${r.verdict}): move it to ${s2(r.move)} s (frame ${Math.round(r.move * fps)} at ${fps} fps).`) : ['Every cut is on the beat.']), '');
  return L;
}
