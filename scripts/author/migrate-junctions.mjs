#!/usr/bin/env node
// scripts/author/migrate-junctions.mjs: ONE-TIME (but re-runnable) migration. `transitions[]` is now
// the ONLY authored junction form; `cuts[]`/`stings[]`/`seams[]` are the INTERNAL shape it lowers to
// (core/transitions/lower.js `lowerScene`). This rewrites every scene that still authors one of the
// three raw keys into the equivalent `transitions[]` entries, and proves the rewrite changes nothing:
// `lowerScene` on the OLD file and on the NEW file must produce byte-identical cuts/stings/seams.
//
// A scene where that proof fails is SKIPPED, not written. The one real case: a raw cut/seam using a
// motion fx (whip/zoom/slide/push/uncover/squeeze/whipPan/cinematicZoom) with no explicit `timing` and
// no film-wide `energy` silently gets a ramp speed curve when authored through `transitions[]` (see
// RAMP_BY_DEFAULT in core/transitions/lower.js), a benefit hand-authored `cuts`/`seams` never got. Re-
// timing a legacy film's cuts as a side effect of a key rename is exactly the silent behaviour change
// this whole engine refuses elsewhere, so this script refuses it too and leaves that file for a human
// to look at (it will still validate-refuse, naming this script, until it is migrated by hand).
//
//   node scripts/author/migrate-junctions.mjs [--dry-run] [file.json ...]
// No files named -> every formats/scene/*.json (site-tracked and gitignored alike).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lowerScene, RAMP_BY_DEFAULT } from '../../core/transitions/lower.js';
import { okEnergy } from '../../core/transitions/energy.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENE_DIR = path.join(repoRoot, 'formats', 'scene');

// PRESERVE THE FILE'S OWN INDENT (scripts/gates/legacy-fold.mjs already established why: a chunk of
// these scenes are git-tracked, and re-serializing with a fixed indent turns a one-key rewrite into a
// full-file diff that buries the real change).
function indentOf(raw) {
  const m = raw.match(/^\{\r?\n(\s+)\S/);
  return m ? m[1] : '  ';
}

// origin array key -> the mechanism its entries always were. Written EXPLICITLY on every raised entry
// rather than left to auto-routing: a name like "wipe" or "fade" exists in more than one mechanism, and
// auto-routing's precedence (cut first) does not always match which array the author actually used.
const MECH_OF_KEY = { cuts: 'cut', stings: 'sting', seams: 'seam' };

// One cuts/stings/seams entry -> its transitions[] equivalent. Field-for-field, dropping anything the
// entry didn't set (a `transitions[]` entry with an `undefined` field is the same as one that omits it,
// core/transitions/lower.js `clean`).
//
// PINNING. Going through `transitions[]` fills a bare motion fx's `timing` with `ramp`
// (RAMP_BY_DEFAULT) when the film names no `energy`, a benefit raw `cuts`/`seams` never had. Left
// alone, converting the KEY would silently re-time every such cut, which is exactly the failure this
// script exists to refuse. So when a raw entry would fall into that default, this pins the render-time
// default it already had (`smooth`, core/cuts/index.js / formats/scene/scene.js) explicitly, which
// renders identically and keeps the round trip honest without ever needing a mismatch.
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
  // author notes (`_why`, `note`, any `_`-prefixed key) ride along, same convention core/engine/
  // expand.js `isNote` names and core/transitions/lower.js now preserves on the way back down.
  for (const k of Object.keys(entry)) if (k === 'note' || k.startsWith('_')) T[k] = entry[k];
  for (const k of Object.keys(T)) if (T[k] === undefined) delete T[k];
  return T;
}

// Order-independent deep equal: `raise` rebuilds each object with its own key order (mech first), and
// there is no reason that should match the order an author happened to type keys in.
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

// `timing` absent and `timing: "smooth"` render identically (core/cuts/index.js, formats/scene/
// scene.js both default a missing one to smooth), and `raise` above may have pinned it explicitly to
// hold a legacy cut/seam still. Normalise both sides the same way before comparing, so pinning a true
// no-op doesn't itself read as a mismatch.
const pick = (d) => ({
  cuts: (d.cuts || []).map((c) => ({ ...c, timing: c.timing ?? 'smooth' })),
  stings: d.stings || [],
  seams: (d.seams || []).map((s) => ({ ...s, timing: s.timing ?? 'smooth' })),
});

// migrateOne(data) -> { next, ok, err } for one already-parsed scene. `next` is `data` with its raw
// cuts/stings/seams rewritten to transitions[] (or `data` itself, untouched, if it authors none); `ok`
// is the round-trip proof; `err` names why it failed when `ok` is false. Exported so lib-test can
// assert the proof and the pinning directly, without going through a file on disk.
export function migrateOne(data) {
  const keys = ['cuts', 'stings', 'seams'].filter((k) => Array.isArray(data[k]) && data[k].length);
  if (!keys.length) return { next: data, ok: true, clean: true };

  // ORDER MATTERS when a file already carries BOTH a raw key and `transitions[]` (rare, but
  // ab-skill-shotcode.json does): `lowerScene` seeds cuts/stings/seams from the raw arrays FIRST, then
  // appends whatever `transitions[]` produces, so the raised entries must sort before the file's
  // existing `transitions[]` to land in the same per-kind order the old file rendered.
  const raised = keys.flatMap((k) => data[k].map((e) => raise(e, k, data)));
  const next = { ...data, transitions: [...raised, ...(data.transitions || [])] };
  for (const k of keys) delete next[k];

  let oldLowered, newLowered, err;
  try { oldLowered = lowerScene(structuredClone(data)); } catch (e) { err = `old scene: ${e.message}`; }
  if (!err) { try { newLowered = lowerScene(structuredClone(next)); } catch (e) { err = `migrated scene: ${e.message}`; } }
  const ok = !err && deepEqual(pick(oldLowered), pick(newLowered));
  return { next, ok, err };
}

// ---- CLI: `node scripts/author/migrate-junctions.mjs [--dry-run] [file.json ...]` ----
// No files named -> every formats/scene/*.json (site-tracked and gitignored alike).
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
