const minutes = (ms) => Number((ms / 60000).toFixed(1));

function nextCacheWrite(fold, afterMs) {
  const next = [...fold.usageAt.values()].filter((u) => u.ms >= afterMs).sort((a, b) => a.ms - b.ms)[0];
  return next?.cacheWrite ?? 0;
}

/** Every gap over 5 minutes: when, how long, its kind (model, tool, wait, cutoff, other) from the row that ends it, and the cache write of the next model turn. Pure. */
export function stallsOf(fold) {
  const { startMs } = fold.meta;
  const list = fold.gaps.map((g) => ({
    kind: g.kind, startMin: minutes(g.startMs - startMs), endMin: minutes(g.endMs - startMs), min: minutes(g.endMs - g.startMs),
    nextCacheWrite: nextCacheWrite(fold, g.endMs),
  }));
  const total = (kind) => Number(list.filter((s) => s.kind === kind).reduce((t, s) => t + s.min, 0).toFixed(1));
  return { list, modelMin: total('model'), toolMin: total('tool'), waitMin: total('wait') + total('cutoff') + total('other') };
}
