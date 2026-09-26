// The one place that decides what an EVENT is (a layer arriving or leaving, or a cut) and the longest gap between events; quality/gates/pace.mjs (the retired pace-check.mjs used to too) reads this rather than walking it itself.
export function measureEvents(d) {
  if (!d.layers || !d.duration) return null;
  const ev = new Set();
  const walk = (a) => a.forEach((l) => {
    if (l.start != null) ev.add(+Number(l.start).toFixed(2));
    if (l.start != null && l.duration != null) ev.add(+Number(l.start + l.duration).toFixed(2));
    if (l.children) walk(l.children);
  });
  walk(d.layers);
  for (const c of d.cuts || []) ev.add(c.t);
  for (const s of d.stings || []) ev.add(s.t);
  const t = [...ev].filter((x) => x >= 0 && x <= d.duration).sort((a, b) => a - b);
  let hold = t.length ? t[0] : d.duration, at = 0;
  for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] > hold) { hold = t[i] - t[i - 1]; at = t[i - 1]; }
  if (t.length && d.duration - t[t.length - 1] > hold) { hold = d.duration - t[t.length - 1]; at = t[t.length - 1]; }
  const copy = JSON.stringify(d.layers).match(/"text"\s*:/g)?.length ?? 0;
  return { dur: d.duration, eps: t.length / d.duration, events: t.length, hold, at, copy, allow: d.authoring?.allow || [] };
}
