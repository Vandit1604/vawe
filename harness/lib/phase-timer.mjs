// Times the phases of one render by name: `await phases.time('load', fn)` adds the seconds fn took to 'load'.
export function createPhaseTimer() {
  const spent = new Map();
  return {
    async time(name, fn) {
      const t0 = performance.now();
      try { return await fn(); } finally { spent.set(name, (spent.get(name) ?? 0) + performance.now() - t0); }
    },
    seconds: (name) => (spent.get(name) ?? 0) / 1000,
  };
}
