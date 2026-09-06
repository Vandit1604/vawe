// core/audio-bridges.js: the J-cut / L-cut resolver, as a PURE function (no side effects, no IO).
//
// A sound bridge is audio that crosses a picture change: a J-cut starts the next shot's sound BEFORE
// its picture, an L-cut lets the last shot's sound run UNDER the new one. Both are the same object
// seen from two sides. A span of sound hung off a junction, longer on one side than the picture is.
//
// The junction is NAMED, never timed. The film already knows where it turns (core marks: cuts, seams,
// stings) and those times move whenever a beat is retimed; an author writing `t: 4.37` by hand is
// writing a number that goes wrong silently on the next edit. `at: "cut@2"` cannot.
//
// Everything here throws rather than coerces. A bridge that resolves to the wrong span does not look
// wrong, it SOUNDS slightly off, which is the failure nobody catches in review.

// The grammar moved to core/junctions.js when BACKGROUNDS needed it too, one copy, because two
// hand-kept copies of a definition is MISTAKES #159 exactly.
import { JUNCTION_KINDS as KINDS, junctionTable, describeJunctions as describe } from '../timeline/junctions.js';

// resolveBridges turns `audio.bridges` into concrete spans the Go mixer can lay down.
//   marks:    [{t, kind}], the film's joints (scene.js MARKS)
//   duration: film length in seconds
// Returns [{ sound, start, end, fade, gain, duck, at, kind }], sorted by start.
export function resolveBridges(audio, marks, duration) {
  const list = (audio && audio.bridges) || [];
  if (!Array.isArray(list) || !list.length) return [];
  const table = junctionTable(marks);
  const out = [];

  for (let i = 0; i < list.length; i++) {
    const b = list[i] || {};
    const where = `audio.bridges[${i}]`;
    const bad = (msg) => { throw new Error(`${where}: ${msg}`); };

    const kind = b.bridge;
    if (kind !== 'j' && kind !== 'l')
      bad(`"bridge" must be "j" (the audio leads the picture) or "l" (the picture leads the audio), got ${JSON.stringify(b.bridge)}`);
    if (typeof b.sound !== 'string' || !b.sound.trim())
      bad(`"sound" must name a bed or cue (a bed name like "tense", a cue name like "loading", or a path to a .wav)`);

    // The junction reference. Nothing is guessed: an unknown kind or an index past the end names
    // every junction the film actually has, because "cut@3" on a two-cut film is a typo, not a hint.
    const ref = String(b.at ?? '');
    const m = /^([a-z]+)@(\d+)$/.exec(ref);
    if (!m) bad(`"at" must be "<kind>@<index>" (e.g. "cut@1", "seam@0", "sting@2", "junction@3"), got ${JSON.stringify(b.at)}. This film has: ${describe(table)}`);
    const [, refKind, refIdx] = m;
    if (!table[refKind]) bad(`unknown junction kind "${refKind}" in "${ref}", known: junction, ${KINDS.join(', ')}. This film has: ${describe(table)}`);
    const times = table[refKind];
    const idx = +refIdx;
    if (idx >= times.length)
      bad(`"${ref}" does not exist. This film has ${times.length} ${refKind}${times.length === 1 ? '' : 's'}. Available: ${describe(table)}`);
    const at = times[idx];

    // Neighbours bound the span. A bridge may lean past its junction, never past the junction on the
    // far side of the beat it came from: that would put one shot's sound over a shot two away.
    const all = table.junction;
    const prev = all.filter((t) => t < at - 1e-6).pop() ?? 0;
    const next = all.find((t) => t > at + 1e-6) ?? duration;

    const lead = +(b.lead ?? 0);
    const lag = +(b.lag ?? 0);
    let start, end;
    if (kind === 'j') {
      if (!(lead > 0)) bad(`a J-cut is defined by its lead, set "lead" to the seconds of sound that arrive BEFORE the picture at ${ref} (t=${at.toFixed(2)})`);
      if (at - lead < prev - 1e-6)
        bad(`"lead" ${lead}s reaches back past the previous junction at t=${prev.toFixed(2)}. The beat before ${ref} is only ${(at - prev).toFixed(2)}s long. Shorten the lead or move the junction.`);
      const span = b.span != null ? +b.span : next - at;
      if (!(span > 0)) bad(`"span" must be positive: it is how long the sound holds AFTER ${ref}`);
      if (at + span > duration + 1e-6) bad(`the bridge would run to t=${(at + span).toFixed(2)}, past the film's ${duration.toFixed(2)}s`);
      start = at - lead;
      end = at + span;
    } else {
      if (!(lag > 0)) bad(`an L-cut is defined by its lag, set "lag" to the seconds of sound that continue AFTER the picture at ${ref} (t=${at.toFixed(2)})`);
      if (at + lag > next + 1e-6)
        bad(`"lag" ${lag}s runs past the next junction at t=${next.toFixed(2)}. The beat after ${ref} is only ${(next - at).toFixed(2)}s long. Shorten the lag or move the junction.`);
      const span = b.span != null ? +b.span : at - prev;
      if (!(span > 0)) bad(`"span" must be positive: it is how long the sound has been running BEFORE ${ref}`);
      if (at - span < -1e-6) bad(`the bridge would start at t=${(at - span).toFixed(2)}, before the film begins`);
      start = at - span;
      end = at + lag;
    }

    // A hard butt is the one shape a bridge must never have: the point of the device is that the ear
    // crosses over, not that a second file switches on. So a fade is a default, not an option, and it
    // has to fit inside the span twice, once at each end.
    const fade = b.fade != null ? +b.fade : 0.35;
    if (!(fade >= 0)) bad(`"fade" must be >= 0 seconds`);
    if (fade * 2 > end - start + 1e-6)
      bad(`"fade" ${fade}s twice over does not fit the ${(end - start).toFixed(2)}s the bridge spans. The sound would never reach full level`);
    const gain = b.gain != null ? +b.gain : 0.5;
    if (!(gain >= 0)) bad(`"gain" must be >= 0`);
    const duck = b.duck != null ? +b.duck : 1;
    if (!(duck >= 0 && duck <= 1)) bad(`"duck" is the floor the MUSIC bed drops to under this bridge, 0..1 (1 = no duck)`);

    out.push({
      sound: b.sound.trim(), kind, at: +at.toFixed(4),
      start: +start.toFixed(4), end: +end.toFixed(4),
      fade: +fade.toFixed(4), gain: +gain.toFixed(4), duck: +duck.toFixed(4),
    });
  }
  out.sort((a, b) => a.start - b.start || a.end - b.end);
  return out;
}
