#!/usr/bin/env node
// Git merge driver for prompts/moves/clips.lock.json (registered in .gitattributes, configured by harness/lib/git-hooks.mjs).
//   node harness/dev/merge-lock.mjs %O %A %B   writes the merge to %A and exits 0
// A key changed on one side takes that side. A key changed on both takes B, the branch being merged in, which holds the newer render.
import fs from 'node:fs';

const read = (file) => {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : '';
  return text ? JSON.parse(text) : {};
};

/** The merge of two lock objects against their common ancestor, keys sorted. */
export function mergeLock(base, ours, theirs) {
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const merged = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
    const value = same(ours[key], base[key]) || !same(theirs[key], base[key]) ? theirs[key] : ours[key];
    if (value !== undefined) merged[key] = value;
  }
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [base, ours, theirs] = process.argv.slice(2);
  fs.writeFileSync(ours, `${JSON.stringify(mergeLock(read(base), read(ours), read(theirs)), null, 2)}\n`);
}
