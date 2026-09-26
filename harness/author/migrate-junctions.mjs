#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lowerScene, RAMP_BY_DEFAULT } from '../../core/transitions/lower.js';
import { okEnergy } from '../../core/transitions/energy.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENE_DIR = path.join(repoRoot, 'films', 'scene');

function indentOf(raw) {
  const m = raw.match(/^\{\r?\n(\s+)\S/);
  return m ? m[1] : '  ';
}

const MECH_OF_KEY = { cuts: 'cut', stings: 'sting', seams: 'seam' };

// One cuts/stings/seams entry -> its transitions[] equivalent, field-for-field. PINNING: going through
// transitions[] fills a bare motion fx's `timing` with `ramp` (RAMP_BY_DEFAULT) when the film names no
// `energy`, so this pins the render-time default it already had (`smooth`, core/cuts/index.js) explicitly
// to keep the round trip honest without ever silently re-timing a cut.
export function raise(entry, key, film) {
  const T = { at: entry.t, mech: MECH_OF_KEY[key] };
  if (key === 'cuts' || key === 'seams') {
    const fx = key === 'cuts' ? entry.style : entry.fx;
    let timing = entry.timing;
    if (timing == null && !okEnergy(film.energy) && RAMP_BY_DEFAULT.has(fx)) timing = 'smooth';
    Object.assign(T, key === 'cuts'
      ? { fx, dur: entry.dur, dir: entry.dir, timing, snap: entry.snap, cx: entry.cx, cy: entry.cy, dist: entry.dist }
      : { fx, dur: entry.dur, dir: entry.dir, timing, snap: entry.snap, seed: entry.seed, intensity: entry.intensity, feather: entry.feather });
  } else { // stings
    Object.assign(T, {
      fx: entry.fx, dur: entry.dur, seed: entry.seed, intensity: entry.intensity,
      color: entry.color, colors: entry.colors,
    });
  }
  for (const k of Object.keys(entry)) if (k === 'note' || k.startsWith('_')) T[k] = entry[k];
  for (const k of Object.keys(T)) if (T[k] === undefined) delete T[k];
  return T;
}

// Order-independent: `raise` rebuilds each object with its own key order (mech first), and there is
// no reason that should match the order an author happened to type keys in.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (typeof a === 'object') {
    const ak = Object.keys(a).filter((k) => a[k] !== undefined).sort();
    const bk = Object.keys(b).filter((k) => b[k] !== undefined).sort();
    return ak.length === bk.length && ak.every((k, i) => k === bk[i] && deepEqual(a[k], b[k]));
  }
  return false;
}

const pick = (d) => ({
  cuts: (d.cuts || []).map((c) => ({ ...c, timing: c.timing ?? 'smooth' })),
  stings: d.stings || [],
  seams: (d.seams || []).map((s) => ({ ...s, timing: s.timing ?? 'smooth' })),
});

// -> { next, ok, err }: `next` is `data` with cuts/stings/seams rewritten to transitions[] (or `data`
// itself if it authors none); `ok` is the round-trip proof, `err` names why it failed.
export function migrateOne(data) {
  const keys = ['cuts', 'stings', 'seams'].filter((k) => Array.isArray(data[k]) && data[k].length);
  if (!keys.length) return { next: data, ok: true, clean: true };

  const raised = keys.flatMap((k) => data[k].map((e) => raise(e, k, data)));
  const next = { ...data, transitions: [...raised, ...(data.transitions || [])] };
  for (const k of keys) delete next[k];

  let oldLowered, newLowered, err;
  try { oldLowered = lowerScene(structuredClone(data)); } catch (e) { err = `old scene: ${e.message}`; }
  if (!err) { try { newLowered = lowerScene(structuredClone(next)); } catch (e) { err = `migrated scene: ${e.message}`; } }
  const ok = !err && deepEqual(pick(oldLowered), pick(newLowered));
  return { next, ok, err };
}

const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targets = named.length
    ? named.map((f) => path.resolve(repoRoot, f))
    : fs.readdirSync(SCENE_DIR).filter((n) => n.endsWith('.json')).sort().map((n) => path.join(SCENE_DIR, n));

  let migrated = 0, skippedClean = 0, skippedMismatch = 0, matched = 0;
  const mismatches = [];

  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    const { next, ok, err, clean } = migrateOne(data);
    if (clean) { skippedClean++; continue; }
    if (!ok) {
      skippedMismatch++;
      mismatches.push(`${path.relative(repoRoot, file)}${err ? ` (${err})` : ''}`);
      continue;
    }
    matched++;
    if (!dryRun) {
      const hadTrailingNewline = raw.endsWith('\n');
      fs.writeFileSync(file, JSON.stringify(next, null, indentOf(raw)) + (hadTrailingNewline ? '\n' : ''));
    }
    migrated++;
  }

  console.log(`migrate-junctions: ${migrated} scene(s) migrated${dryRun ? ' (dry run)' : ''}, `
    + `${matched} round-trip proof(s) matched.`);
  console.log(`  ${skippedClean} already clean (no cuts/stings/seams to migrate).`);
  if (skippedMismatch) {
    console.log(`  ${skippedMismatch} SKIPPED, round trip would change the lowered output: `
      + `${mismatches.join(', ')}`);
    console.log('    (a motion fx with no explicit timing and no film-wide energy would gain a ramp '
      + 'speed curve through transitions[], which cuts/seams never got: fix by hand, or add an explicit '
      + '`timing` to the entries named above before re-running.)');
  }
  if (skippedMismatch) process.exitCode = 1;
}
