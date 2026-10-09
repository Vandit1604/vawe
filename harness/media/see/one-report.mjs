// The see.md of `vawe see`: one film's measures and images as Readable text. Pure: the measure object and the image object in, lines out.
const r2 = (n) => +Number(n).toFixed(2);
const f2 = (n) => (n == null ? '-' : Number(n).toFixed(2));
const s2 = (n) => (n == null ? '-' : `${Number(n).toFixed(2)} s`);
const table = (head, rows) => {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)));
  const line = (r) => `| ${r.map((c, i) => String(c ?? '').padEnd(w[i])).join(' | ')} |`;
  return [line(head), `|${w.map((x) => '-'.repeat(x + 2)).join('|')}|`, ...rows.map(line)];
};

const patternText = (t) => {
  if (!t) return 'no dark block to test';
  if (t.kind === 'none') return `none (peak ${Math.round(t.ratio)}x the band median)`;
  const per = t.kind === 'grid' ? `${r2(t.periodX)} x ${r2(t.periodY)} px` : `${r2(t.period)} px`;
  return `${t.kind}, period ${per}, ${t.striped ? `RGB-striped (channels ${t.spreadDeg} deg apart)` : 'monochrome'}`;
};

const openingLine = (s) => {
  const kind = s.cutIn.type === 'other' ? 'change no known kind fits (not a cut, blend, wipe or slide)' : `${s.cutIn.type}${s.cutIn.dir ? ` ${s.cutIn.dir}` : ''}`;
  const cut = s.cutIn.type === 'start' ? 'opens the film' : `enters by a ${kind} over ${s.cutIn.frames} f`;
  return `${s.start.toFixed(2)} to ${s.end.toFixed(2)} s (${s.length.toFixed(2)} s, ${s.frames} f), ${cut}${s.flashes.length ? `; a flash at ${s.flashes.map((t) => t.toFixed(2)).join(', ')} s lies inside it` : ''}.`;
};

const groundLine = (g) => {
  if (!g) return null;
  const drift = g.lightDrift != null && g.lightDrift >= 3 ? `; the light drifts ${g.lightDrift} L over the shot (deltaE ${g.driftDE})` : g.driftDE != null ? '; the ground holds' : '';
  return `Ground ${g.hex} (L ${g.L}, chroma ${g.chroma}, hue ${g.hue} deg)${drift}.`;
};

const layoutLine = (layout) => {
  const boxes = layout.slice(0, 5).map((b) => `${b.color ?? '?'} ${Math.round(b.w * 100)}x${Math.round(b.h * 100)}% at ${Math.round((b.x + b.w / 2) * 100)},${Math.round((b.y + b.h / 2) * 100)}%`);
  return boxes.length ? `Layout at the end of the shot (${layout.length} regions; x,y are centres, % of the frame): ${boxes.join('; ')}.` : null;
};

const moveLine = (m) => {
  const dir = m.axis === 'x' ? (m.to[0] >= m.from[0] ? 'right' : 'left') : (m.to[1] >= m.from[1] ? 'down' : 'up');
  const over = m.overshootPct == null ? '' : m.overshootPct >= 1 ? `, overshoots ${m.overshootPct}%` : ', no overshoot';
  const css = m.css && m.css !== m.ease ? ` ${m.css.length > 60 ? `${m.css.slice(0, 60)}...` : m.css}` : '';
  return `- ${m.id}: ${m.size[0]}x${m.size[1]} px ${m.color ?? ''} from (${m.from}) to (${m.to}) px, ${dir} ${m.travelPx} px, starts ${s2(m.start)}, lands ${s2(m.settle)}, peak ${m.peakPxPerS} px/s (${m.peakHeightsPerS} frame heights/s)${over}, ${m.ease ?? 'too short to fit'}${css}${m.blur ? `, motion blur ${m.blur.dir}` : ''}${m.confidence === 'low' ? ' (low confidence: a short or crowded track)' : ''}.`;
};

const energyLine = (e) => {
  if (!e) return null;
  if (!e.moving) return `Frame energy: nothing moves (peak ${e.peak}).`;
  return `Frame energy: ${e.bursts.length} burst${e.bursts.length === 1 ? '' : 's'} (${e.bursts.map((b) => `${b.t0.toFixed(2)}-${b.t1.toFixed(2)} s peak ${b.peak}`).join(', ')}), settles ${s2(e.settle)}.`;
};

const eyeLine = (e) => (e ? `Eye: from ${Math.round(e.start.x * 100)},${Math.round(e.start.y * 100)}% to ${Math.round(e.end.x * 100)},${Math.round(e.end.y * 100)}% (${e.start.src}), travel ${e.travel ?? '-'} frame heights.` : null);

const textLine = (text) => (text.length ? `Text: ${text.map((t) => `"${t.text}" frames ${t.f0}-${t.f1}, ${t.boxHeightPx} px high (font about ${t.fontPxApprox} px)`).join('; ')}.` : null);

const tiltWords = (t) => {
  if (!t) return '';
  const lean = t.deg ? ` The picture is tilted ${Math.abs(t.deg)} deg ${t.deg > 0 ? 'clockwise' : 'anticlockwise'}: its straight edges lean that far from the horizontal and the vertical (${Math.round(t.share * 100)}% of edge strength).` : '';
  return `${lean} Edge directions from the horizontal (clockwise is positive): ${t.peaks.map((p) => `${p.deg} deg ${Math.round(p.share * 100)}%`).join(', ') || 'none'}.`;
};

/** One shot as plain sentences: what appears, what moves, where the eye goes, how the camera moves. */
export function shotAccount(s) {
  const moves = s.moves.length ? [`Moving parts (${s.moves.length}):`, ...s.moves.map(moveLine)] : ['No part is tracked as moving.'];
  const hits = s.hits.length ? `Sound hits inside: ${s.hits.map((h) => `f${h.frame} (${h.strength})`).join(', ')}.` : null;
  return [openingLine(s), groundLine(s.ground), `Palette ${s.palette.map((p) => `${p.hex} ${Math.round(p.share * 100)}%`).join(', ')}.`, layoutLine(s.layout), ...moves,
    energyLine(s.energy), `Camera: ${s.camera.words}.${tiltWords(s.camera.tilt)}`, eyeLine(s.eye), textLine(s.text), hits].filter(Boolean);
}

function structureSection(m) {
  const st = m.structure;
  const L = ['## STRUCTURE', ''];
  L.push(...table(['#', 'id', 'start s', 'end s', 'length s', 'frames', 'enters by', 'flash inside'],
    st.shots.map((s) => [s.index, s.id, f2(s.start), f2(s.end), f2(s.length), s.frames, `${s.cutIn.type}${s.cutIn.dir ? ` ${s.cutIn.dir}` : ''} ${s.cutIn.frames} f`, s.flashes.map((t) => t.toFixed(2)).join(' ')])));
  const r = st.rhythm;
  L.push('', `Rhythm: ${st.shots.length} shots, lengths ${r.lengths.map((x) => x.toFixed(2)).join(' ')} s; shortest ${s2(r.min)}, median ${s2(r.median)}, longest ${s2(r.max)}.`);
  for (const a of r.advice) L.push(`- ${a}`);
  if (st.cuts.length) {
    const kinds = {};
    for (const c of st.cuts) kinds[c.type] = (kinds[c.type] ?? 0) + 1;
    L.push(`Cuts (${st.cuts.length}): ${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(', ')}.`);
  }
  if (st.flashEdges.length) L.push(`${st.flashEdges.length} spec cut(s) at ${st.flashEdges.map((c) => c.at.toFixed(2)).join(', ')} s are the edges of flashes (below), not shot changes.`);
  if (st.tempo) L.push(`Tempo: ${st.tempo.bpm} BPM (confidence ${st.tempo.confidence}; under 1.6 is weak), ${st.tempo.framesPerBeat} frames per beat.`);
  if (st.worlds) {
    L.push('', 'Worlds read from the page (exact; a world that is under another or lasts under a frame has no shot above):', '',
      ...table(['id', 'start s', 'end s', 'cut to next s', 'read hold s'], st.worlds.map((w) => [w.id, f2(w.start), f2(w.end), f2(w.cut), f2(w.hold)])));
    if (st.spectacle) L.push('', `Spectacle: ${st.spectacle.at} s, in world ${st.spectacle.world ?? 'none'}.`);
  }
  return L;
}

function motionSection(m) {
  const L = ['## MOTION', '', `Noise floor of the frame energy: median ${m.motion.noise.mu}, spread ${m.motion.noise.sigma}; a burst opens at median + 6 spreads and closes at median + 2.5.`, ''];
  for (const s of m.shots) L.push(`### Shot ${s.index} (${s.id})`, '', ...shotAccount(s), '');
  if (m.motion.velocity?.length) {
    L.push('Element speeds read from the page (exact):', '');
    for (const v of m.motion.velocity) for (const x of v.moves) L.push(`- shot ${v.shot} ${x.label}: starts ${s2(x.start)}, peak ${x.px} px/s at ${s2(x.peakAt)}, settles ${s2(x.settle)}, ${x.overshootPct == null ? 'overshoot not judged' : `overshoot ${x.overshootPct}%`}, ${x.shape ?? 'too short to classify'}.`);
    L.push('');
  }
  return L;
}

function lookSection(m) {
  const l = m.look, f = l.film;
  const L = ['## LOOK', '', 'Whole film:', ''];
  L.push(...table(['measure', 'value'], [
    ['mean luma median, max', `${f.luma.median}, ${f.luma.max}`],
    ['clipped >= 250, median, peak', `${f.clip.median}%, ${f.clip.peak}%`],
    ['bloom 90 to 10%', f.bloom ? `${f.bloom.px} px over ${f.bloom.n} edges (gaussian sigma about ${f.bloom.sigma} px)` : 'too few edges'],
    ['chromatic offset blue minus red', f.chroma ? `dx ${f.chroma.dx} px, dy ${f.chroma.dy} px; ${f.chroma.share}% of ${f.chroma.n} edges off by 1 px or more` : 'too few edges'],
    ['screen texture', patternText(f.texture)],
    ['glow colour', f.glow ? f.glow.name : 'none'],
    ['chroma median, p90', `${l.colour.chromaMedian}, ${l.colour.chromaP90}`],
    ['share dark (L<20), light (L>85)', `${l.colour.shareDark}, ${l.colour.shareLight}`],
    ['distinct colours, per shot median', `${l.colour.coloursDistinct}, ${l.colour.coloursPerShotMedian}`],
  ]));
  L.push('', `Flashes as exposure events (${l.flashes.length}): a flash is one event of mean luma, not two cuts.`);
  if (l.flashes.length) {
    L.push('', ...table(['#', 'start s', 'frames', 'seconds', 'luma base to peak', 'rise f', 'decay f', 'clipped at peak', 'tint', 'shot', 'around it'],
      l.flashes.map((x, i) => [i + 1, f2(x.at), x.frames, f2(x.seconds), `${x.baseLuma} to ${x.peakLuma}`, x.rise, x.decay, x.clippedAtPeak == null ? '-' : `${x.clippedAtPeak}%`, x.tint ?? '-', x.shot ?? '-', x.sameShot === true ? 'same shot' : x.sameShot === false ? 'cut under it' : '-'])));
  }
  L.push('', 'Per shot (grain is the temporal noise sigma in levels of 255 on flat tiles; focus ratio is the sharpest third of a 4x3 grid over the softest third, near 1 is even focus):', '');
  L.push(...table(['#', 'luma', 'clipped %', 'bloom px (sigma)', 'fringe dx,dy px', 'texture', 'glow', 'grain', 'focus ratio', 'ground'],
    m.shots.map((s) => { const k = s.look ?? {}; return [s.index, k.luma ?? '-', k.clipped ?? '-', k.bloom ? `${k.bloom.px} (${k.bloom.sigma})` : '-', k.chroma ? `${k.chroma.dx},${k.chroma.dy}` : '-', k.texture && k.texture.kind !== 'none' ? patternText(k.texture) : '-', k.glow?.name ?? '-', k.grain ? k.grain.sigma : '-', k.sharp ? k.sharp.ratio : '-', s.ground ? s.ground.hex : '-']; })));
  return L;
}

function typeSection(m) {
  const t = m.type;
  const L = ['## TYPE', ''];
  if (!t.words.length) { L.push(t.ocr ? 'No words read.' : 'Text was not read (--no-ocr).'); } else {
    L.push(...table(['word', 'in s', 'out s', 'hold s', 'cap box % of frame', 'font px about', 'centre px'], t.words.map((w) => [w.text, f2(w.in), f2(w.out), f2(w.hold), w.capHeightPct, w.fontPx, `${w.cx},${w.cy}`])));
    if (t.lines.length) L.push('', 'Lines:', ...t.lines.map((l) => `- "${l.text}" ${l.in}-${l.out} s, stagger ${l.stagger}${l.stepS ? `, ${Math.round(l.stepS * 1000)} ms between words` : ''}`));
  }
  if (t.holds) L.push('', 'Read holds of the worlds (page):', ...t.holds.map((h) => `- ${h.id}: shows ${h.length} s, needs ${h.readNeed} s${h.short ? ' (SHORT: the text is gone before it can be read)' : ''}`));
  return L;
}

function soundSection(m) {
  const so = m.sound;
  const L = ['## SOUND', ''];
  if (so.mp4) L.push(`Loudness of the film's own audio: ${so.mp4.lufs} LUFS, true peak ${so.mp4.truePeakDb} dBFS.`);
  if (so.page?.mix) L.push(`Mix of the page's audio tags as written: ${so.page.mix.lufs} LUFS, true peak ${so.page.mix.truePeakDb} dBFS.`);
  if (!so.hasAudio && !so.page) L.push('No audio stream.');
  if (so.bpm) L.push(`Tempo ${so.bpm} BPM (confidence ${so.bpmConfidence}).`);
  if (so.page) {
    L.push(`Bed: ${so.page.bed.length ? so.page.bed.map((b) => `${b.voice} from ${b.at} s, ${b.gain} dB`).join('; ') : 'none'}.`, '', 'Cues from the page:');
    for (const c of so.page.cues) L.push(`- ${c.at} s ${c.voice} ${c.gain} dB, world ${c.world ?? 'none'}${c.on ? ` (${c.on})` : ''}`);
  }
  if (so.hits.length) {
    L.push('', `Onsets heard in the film (${so.hits.length}; onset is where the sound starts, peak is its loudest change, later):`, '',
      ...table(['onset s', 'peak s', 'strength', 'shot', 'nearest cut s', 'lead ms (+ = sound first)'], so.hits.map((h) => [f2(h.onset), f2(h.peak), h.strength, h.shot ?? '-', h.nearestCut == null ? '-' : f2(h.nearestCut), h.leadMs ?? '-'])));
  }
  return L;
}

/** The numbers of one second `t` of a film: its shot, the moves under way, the flash, the words on screen and the sounds close to it. Pure. */
export function momentLines(m, t) {
  const shot = m.shots.find((s) => t >= s.start - 1e-6 && t < s.end + 1e-6);
  if (!shot) return [`second ${t.toFixed(2)}: between shots (inside a flash or a change)`];
  const L = [`second ${t.toFixed(2)}: in shot ${shot.index} (${shot.id}), ${(t - shot.start).toFixed(2)} s after its start and ${(shot.end - t).toFixed(2)} s before its end`];
  const live = shot.moves.filter((x) => x.start != null && t >= x.start && t <= x.settle);
  L.push(live.length ? `moving now: ${live.map((x) => `${x.id} ${x.axis} at up to ${x.peakPxPerS} px/s (${x.ease ?? 'no fit'}, ${((100 * (t - x.start)) / Math.max(x.settle - x.start, 1e-6)).toFixed(0)}% of its time)`).join('; ')}` : 'no tracked part is moving now');
  L.push(`camera: ${shot.camera.words}`);
  const flash = m.look.flashes.find((f) => t >= f.at - 1e-6 && t <= f.at + f.seconds + 1e-6);
  if (flash) L.push(`a flash is on: mean luma ${flash.baseLuma} to ${flash.peakLuma}, ${flash.frames} f`);
  const words = m.type.words.filter((w) => t >= w.in && t < w.out);
  if (words.length) L.push(`words on screen: ${words.map((w) => `"${w.text}" ${w.boxHeightPx} px high`).join(', ')}`);
  const hits = m.sound.hits.filter((h) => Math.abs(h.onset - t) <= 0.15);
  if (hits.length) L.push(`sound within 0.15 s: ${hits.map((h) => `onset ${h.onset.toFixed(2)} s strength ${h.strength}`).join(', ')}`);
  return L;
}

function imagesSection(m, images, momentImgs) {
  const L = ['## IMAGES', '', 'Read each image together with the numbers under its path. Frames are native size; zooms are nearest-neighbour, every pixel a square.', ''];
  for (const s of images.shots) {
    L.push(`### Shot ${s.index} (${s.id})`, '');
    const put = (img, title) => { L.push(`${title}: ${img.file}`, ...img.lines.map((x) => `  ${x}`), ''); };
    put(s.frame, 'key frame');
    if (s.cut) put(s.cut, `strip through the cut (${s.cut.from.toFixed(2)} to ${s.cut.to.toFixed(2)} s, ${s.cut.fps} fps, left to right, top to bottom)`);
    if (s.onion) put(s.onion, 'onion of the biggest move');
    for (const z of s.zooms) put(z, `zoom, ${z.what}`);
    for (const fl of s.flashes) {
      put(fl, `flash strip (${fl.from.toFixed(2)} to ${fl.to.toFixed(2)} s, ${fl.fps} fps)`);
      if (fl.zoom) L.push(`flash peak zoom: ${fl.zoom.file}`, `  box ${fl.zoom.box.x},${fl.zoom.box.y},${fl.zoom.box.w},${fl.zoom.box.h} at 8x, second ${fl.zoom.t}`, '');
    }
  }
  if (momentImgs) {
    const x = momentImgs;
    L.push(`### Moment ${x.at} s`, '', ...momentLines(m, x.at).map((l) => `  ${l}`), '', `frame: ${x.frame}`, `strip: ${x.strip.file} (${x.strip.from} to ${x.strip.to} s, ${x.strip.fps} fps)`, `onion: ${x.onion}`);
    if (x.zoom) L.push(`edge zoom: ${x.zoom.file} (box ${x.zoom.box.x},${x.zoom.box.y},${x.zoom.box.w},${x.zoom.box.h})`);
    L.push('');
  }
  return L;
}

/** What the code does not decide: the reader looks at the named images. Pure. */
export function notMeasured(m) {
  const L = [];
  if (!m.type.ocr) L.push('Text: not read (run without --no-ocr).');
  if (!m.type.words.length && m.type.ocr) L.push('Text: no words found; if the film has type, look at the key frames.');
  L.push('Which glyphs or shapes a region is: layout gives boxes and colours, not what they depict (look at the key frames).');
  L.push('Whether a move reads as elegant or abrupt: the numbers give timing and shape; look at each onion and strip.');
  if (m.look.film.texture && m.look.film.texture.kind === 'none') L.push('Screen texture: none found in dark blocks; a texture over bright areas is not tested (look at the edge zooms).');
  L.push('3D perspective of a plane (a plane turned in depth reads as a shear): the tilt reads straight edges leaning in the picture, not a vanishing point; look at the key frame.');
  return L;
}

/** The see.md of one film as an array of lines. `images` and `momentImgs` come from one-images. Pure. */
export function seeReport(m, images, momentImgs) {
  const M = m.media;
  const L = [`# vawe see: ${m.source.name}`, '', `${m.source.note}: ${m.source.video}`, `${M.width}x${M.height}, ${M.fps} fps, ${M.duration} s, ${M.frames} frames analysed at ${M.specFps} fps, audio ${M.audio ? 'yes' : 'no'}. Content hash ${m.source.hash.slice(0, 12)}.`, '',
    'Sections: STRUCTURE (shots, cuts, rhythm), MOTION (per shot), LOOK, TYPE, SOUND, IMAGES (every shot, each image with its numbers), NOT MEASURED.', ''];
  L.push(...structureSection(m), '', ...motionSection(m), ...lookSection(m), '', ...typeSection(m), '', ...soundSection(m), '', ...imagesSection(m, images, momentImgs), '## NOT MEASURED', '', ...notMeasured(m).map((x) => `- ${x}`), '');
  return L;
}

/** The short summary printed after a run. */
export function seeSummary(m) {
  const st = m.structure, r = st.rhythm, fl = m.look.flashes;
  return [`${m.source.name}: ${m.media.duration} s, ${st.shots.length} shots (shortest ${s2(r.min)}, median ${s2(r.median)}, longest ${s2(r.max)}), ${st.cuts.length} cuts, ${fl.length} flash${fl.length === 1 ? '' : 'es'}`,
    `moves tracked ${m.shots.reduce((n, s) => n + s.moves.length, 0)}; bloom ${m.look.film.bloom ? `${m.look.film.bloom.px} px` : 'none'}; fringe ${m.look.film.chroma ? `${Math.hypot(m.look.film.chroma.dx, m.look.film.chroma.dy).toFixed(1)} px` : 'none'}; texture ${m.look.film.texture && m.look.film.texture.kind !== 'none' ? m.look.film.texture.kind : 'none'}; words ${m.type.words.length}; ${m.sound.mp4 ? `${m.sound.mp4.lufs} LUFS` : 'no audio'}`];
}
