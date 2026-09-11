#!/usr/bin/env node
// quality/gates/ground-arc.mjs: does the GROUND flip white/dark on purpose, and does it CARRY across
// a join, or does it flash.
//
//   make ground-arc D=formats/scene/<film>.json   ·   node quality/gates/ground-arc.mjs <film> [--json]
//
// WHY THIS AND NOT `make judge`. The judge rubric grades frames one at a time; a ground that whites
// out for one beat and blacks out for the next reads fine on EVERY still it is asked to score, because
// each still is internally consistent. The flip itself, whether it is a planned beat change carried
// deliberately or an accidental flash, only exists between frames, and nothing pre-render reads that
// axis. This is a PRE-RENDER gate: it samples renderFrame(n) through harness/lib/frame-sampler.mjs,
// never a rendered mp4, so it runs inside `make check`.
//
// Known truth this reproduces (the owner's own report on vawe-flow-2's rendered pixels, top-strip
// luma): white 0s, dark 1.5-4.5s, white 5-7s, dark 7.5-9s, white 9.5-11s. Four flips.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleScene, luminanceOf } from '../../harness/lib/frame-sampler.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Hysteresis band, not one threshold: a single cut point would call a mid-crossfade sample a flip on
// its own, one frame after being "light" and one frame before being "dark" again. A sample landing
// between the two bands is genuinely ambiguous (a crossfade in progress) and is skipped rather than
// forced into a side it is not yet on.
export const LIGHT = 150, DARK = 105;
// A flip counts as CARRIED across a join when a declared schedule point (a bg[] boundary, a recipe's
// `at`, or a transition's `t`) sits within this many seconds of it. Adjacent bg windows in this film
// sit 0.05-0.15s apart and its own recipe `at`s land 0.3-0.9s from the measured flip, so 0.75s is
// generous to the plan and still tight enough to catch a flip with nothing declared anywhere near it.
export const JOIN_TOLERANCE = 0.75;

export function classify(lum) { return lum >= LIGHT ? 'light' : lum <= DARK ? 'dark' : null; }

/** findFlips(samples: [{t, lum}]) -> [{t, from, to}]. Pure; no browser, no file, easy to fixture. */
export function findFlips(samples) {
  const flips = [];
  let state = null;
  for (const s of samples) {
    const c = classify(s.lum);
    if (c == null) continue;
    if (state && c !== state.c) flips.push({ t: +((state.t + s.t) / 2).toFixed(2), from: state.c, to: c });
    state = { c, t: s.t };
  }
  return flips;
}

/** The scene's OWN declared schedule points: bg windows, recipe joins, raw transitions. */
export function declaredPoints(cfg) {
  const pts = [];
  for (const b of cfg.bg || []) { if (Number.isFinite(b.from)) pts.push(b.from); if (Number.isFinite(b.to)) pts.push(b.to); }
  for (const r of cfg.recipes || []) if (Number.isFinite(r.at)) pts.push(r.at);
  for (const tr of cfg.transitions || []) if (Number.isFinite(tr.t)) pts.push(tr.t);
  return pts;
}

export function isDeclared(cfg, t, tolerance = JOIN_TOLERANCE) {
  return declaredPoints(cfg).some((p) => Math.abs(p - t) <= tolerance);
}

/** Beat windows from the storyboard sidecar's own `## Beat N: … (t0s-t1s)` headers. */
export function beatWindows(storyboardText) {
  const re = /^##\s*Beat\s+(\d+)[^\n(]*\(([\d.]+)s-([\d.]+)s\)/gm;
  const beats = []; let m;
  while ((m = re.exec(storyboardText))) beats.push({ n: +m[1], t0: +m[2], t1: +m[3] });
  return beats;
}

export function beatsAround(beats, t) {
  const before = beats.filter((b) => b.t1 <= t).sort((a, b) => b.t1 - a.t1)[0] || null;
  const after = beats.filter((b) => b.t0 >= t).sort((a, b) => a.t0 - b.t0)[0] || null;
  return { before, after };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) {
    // The known truth this gate exists to reproduce: vawe-flow-2's real render measures white 0s, dark
    // 1.5-4.5s, white 5-7s, dark 7.5-9s, white 9.5-11s on top-strip luma. Four flips, all real content.
    const knownTruth = [
      { t: 0, lum: 250 }, { t: 0.5, lum: 240 }, { t: 1, lum: 90 }, { t: 1.5, lum: 42 }, { t: 2, lum: 48 },
      { t: 4, lum: 44 }, { t: 4.5, lum: 43 }, { t: 5, lum: 250 }, { t: 6, lum: 250 }, { t: 7, lum: 245 },
      { t: 7.5, lum: 60 }, { t: 8, lum: 55 }, { t: 9, lum: 52 }, { t: 9.5, lum: 250 }, { t: 10.5, lum: 255 },
    ];
    const flips = findFlips(knownTruth);
    if (flips.length !== 4) { console.error(`known-truth fixture must find 4 flips, found ${flips.length}: ${JSON.stringify(flips)}`); process.exit(1); }

    // a fixture with NO flip at all must report none, not a false positive from noise near the band edges
    const steady = [{ t: 0, lum: 250 }, { t: 1, lum: 248 }, { t: 2, lum: 252 }];
    if (findFlips(steady).length !== 0) { console.error('a steady-luma fixture must report zero flips'); process.exit(1); }

    // isDeclared: a flip sitting on a bg[] boundary is declared; one far from every schedule point is not
    const cfg = { bg: [{ from: 0, to: 1.2 }, { from: 1.25, to: 2.75 }], recipes: [{ at: 4.7 }] };
    if (!isDeclared(cfg, 1.3)) { console.error('a flip at a bg boundary must read as declared'); process.exit(1); }
    if (!isDeclared(cfg, 4.9)) { console.error('a flip near a recipe join must read as declared'); process.exit(1); }
    if (isDeclared(cfg, 9.0)) { console.error('a flip with no schedule point nearby must NOT read as declared: this is the real defect this gate exists to catch'); process.exit(1); }

    // beatsAround: a flip between two beats names both
    const beats = [{ n: 1, t0: 0, t1: 1.2 }, { n: 2, t0: 1.25, t1: 2.5 }];
    const { before, after } = beatsAround(beats, 1.22);
    if (before?.n !== 1 || after?.n !== 2) { console.error(`beatsAround must name beat 1 -> beat 2, got ${JSON.stringify({ before, after })}`); process.exit(1); }

    console.log('  ✓ ground-arc self-test: the known-truth fixture finds all four flips, a steady fixture');
    console.log('    finds none, a flip on a schedule point reads declared, a flip with nothing nearby');
    console.log('    reads undeclared, and beatsAround names the beat on each side of a flip');
    process.exit(0);
  }

  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make ground-arc D=formats/scene/<film>.json'); process.exit(2); }
  const base = String(arg).replace(/\.json$/, '');
  const jsonPath = path.resolve(ROOT, base + '.json');
  const cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sbPath = path.resolve(ROOT, base + '.storyboard.md');
  const storyboard = fs.existsSync(sbPath) ? fs.readFileSync(sbPath, 'utf8') : '';
  const beats = beatWindows(storyboard);

  const gf = gateFindings();

  const rel = path.relative(ROOT, jsonPath);
  const { samples } = await sampleScene(rel, {
    rate: 0.25,
    measure: (img) => luminanceOf(img, { x: 0, y: 0, w: img.width, h: Math.round(img.height * 0.1) }),
  });
  const lumSamples = samples.map((s) => ({ t: s.t, lum: s.img }));
  const flips = findFlips(lumSamples);

  for (const f of flips) {
    const declared = isDeclared(cfg, f.t);
    const { before, after } = beatsAround(beats, f.t);
    const beatNote = before && after ? `beat ${before.n} -> beat ${after.n}` : 'beat unknown (no storyboard match)';
    const summary = `ground flips ${f.from}->${f.to} at ${f.t}s (${beatNote})`;
    if (declared) {
      gf.note('ground-flip-declared', summary, { at: f.t });
    } else {
      gf.warn('ground-flip-undeclared', `${summary}: no bg/recipe/transition schedule point within `
        + `${JOIN_TOLERANCE}s. Carry the ground across ${beatNote.includes('->') ? `the ${beatNote} join` : 'this join'} `
        + 'or crossfade it over a set duration instead of flipping cold.', { at: f.t });
    }
  }

  if (process.argv.includes('--json')) { gf.emit(); process.exit(gf.records.some((r) => r.severity === 'error') ? 1 : 0); }
  console.log(`\n  ground-arc · ${path.basename(base)} · ${lumSamples.length} samples · ${flips.length} flip(s)`);
  gf.emit();
  if (!flips.length) console.log('    (no ground flips measured)');
  console.log('');
  process.exit(0);
}
