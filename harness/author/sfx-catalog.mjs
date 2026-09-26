#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES } from '../../core/audio/kit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'engine-doctrine/CRAFT/SFX-CATALOG.md');

const FAMILIES = ['accent', 'confirm', 'transition', 'riser', 'impact', 'weight'];

const META = {
  pluck: {
    family: 'accent',
    purpose: 'punctuate something small landing: a counter digit, a minor element arriving',
    energy: 'low',
    placement: 'hand-placed cue, or auto via CUT_CUE for jitter/clock/blinds/barn cuts',
    pitfall: 'loud and repeated reads as a machine gun (the file\'s own words)',
  },
  chime: {
    family: 'accent',
    purpose: 'a light confirmation tone for a small positive event',
    energy: 'low',
    placement: 'hand-placed cue',
    pitfall: 'none noted',
  },
  sparkle: {
    family: 'accent',
    purpose: 'a bright four-note flourish for a decorative reveal',
    energy: 'low',
    placement: 'hand-placed cue, or auto via SEAM_CUE for dispersion/shatterGlitch/pixelDissolve seams',
    pitfall: 'none noted',
  },
  droplet: {
    family: 'accent',
    purpose: 'a two-tone accent for a single discrete arrival',
    energy: 'low',
    placement: 'hand-placed cue, or auto via CUT_CUE for drop/zoom/blur cuts, SEAM_CUE for lens/rippleWave seams',
    pitfall: 'none noted',
  },
  bloom: {
    family: 'confirm',
    purpose: 'a soft two-tone open for something gently arriving or expanding into view',
    energy: 'low',
    placement: 'hand-placed cue, or auto via CUT_CUE for softiris/iris/rise/riseBlur/fade/matchCut cuts, SEAM_CUE for fade/dissolve/sdfIris/portal/irisRound/lumaWipe seams',
    pitfall: 'none noted',
  },
  success: {
    family: 'confirm',
    purpose: 'a three-note ascending confirmation for a completed, positive event',
    energy: 'medium',
    placement: 'hand-placed cue',
    pitfall: 'none noted',
  },
  ready: {
    family: 'confirm',
    purpose: 'a two-tone signal that something is now available or armed',
    energy: 'low',
    placement: 'hand-placed cue',
    pitfall: 'none noted',
  },
  whoosh: {
    family: 'transition',
    purpose: 'an object or camera passing by: the frame carries something across itself',
    energy: 'medium',
    placement: 'auto on a moving cut via CUT_CUE (whip/skewWhip/softwipe/wipe/slide/push/flip/spin/cube/roll), auto on a moving seam via SEAM_CUE (slide/uncover/wipe/crossWarp/whipPan/barnDoor/clockWipe/zoomBlur/swirlWarp/blindsWipe/spinZoom), or a bridge at a cut/seam',
    pitfall: 'a one-directional sweep with no fall after the peak sounds like a jet that never arrives; this voicing sweeps up then down so the pass has an inflection',
  },
  riser: {
    family: 'riser',
    purpose: 'a build INTO a moment, tension climbing toward a beat',
    energy: 'high',
    placement: 'hand-placed, must be timed to END on the beat it feeds, never auto-mapped',
    pitfall: 'without the counter-moving sub layer the build thins out exactly where it should get heavier; the engine also cannot cut the level at the peak the way a real riser recipe wants, so leave the frame after it quiet',
  },
  drop: {
    family: 'impact',
    purpose: 'a sub-bass downlifter that lands ON a cut rather than before it',
    energy: 'high',
    placement: 'hand-placed cue, or auto via CUT_CUE for the drop cut style, SEAM_CUE for cinematicZoom',
    pitfall: 'landing above 60Hz reads as a bass note rather than a room-sized drop; this voicing is the half-second cinematic sub-down, not the fast 808 knock',
  },
  impact: {
    family: 'impact',
    purpose: 'a hit: something collides, lands, or slams into place',
    energy: 'high',
    placement: 'hand-placed cue, or auto via CUT_CUE for punch/squeeze/collapse/letterbox cuts, SEAM_CUE for push/flashWhite/burnThrough seams',
    pitfall: 'building only the body reads as a thump behind a curtain; only the transient reads as a click. This voicing layers both plus a 1-3kHz mid so the three read as one event',
  },
  swell: {
    family: 'weight',
    purpose: 'the reverse-cymbal move: a sound accelerating into a cut and stopping dead on it',
    energy: 'high',
    placement: 'hand-placed cue, timed to end exactly on the cut it introduces',
    pitfall: 'a fade at the end reads as a fade-out rather than an arrival; this voicing carries no tail so the collapse lands within about 90ms of the cut',
  },
  braam: {
    family: 'weight',
    purpose: 'low sustained weight for a serious, dramatic moment (a scaled-down version of the trailer horn)',
    energy: 'high',
    placement: 'hand-placed cue',
    pitfall: 'this engine has no distortion, stereo field or resonator, so treat it as low sustained weight, not the full trailer braam',
  },
};

function assertCoverage() {
  const missing = Object.keys(CUES).filter((name) => !META[name]);
  if (missing.length) {
    throw new Error(
      `sfx-catalog: CUES defines ${missing.length} cue(s) with no catalog entry: ${missing.join(', ')}. ` +
      `Add each to META in harness/author/sfx-catalog.mjs before regenerating the doc.`
    );
  }
  const extra = Object.keys(META).filter((name) => !CUES[name]);
  if (extra.length) {
    throw new Error(
      `sfx-catalog: META names cue(s) that no longer exist in CUES: ${extra.join(', ')}. Remove them.`
    );
  }
}

function row(name) {
  const m = META[name];
  return `| \`${name}\` | ${m.family} | ${m.energy} | ${m.purpose} | ${m.placement} | ${m.pitfall} |`;
}

function build() {
  const byFamily = FAMILIES.map((fam) => ({
    fam,
    names: Object.keys(CUES).filter((name) => META[name].family === fam),
  })).filter((g) => g.names.length);

  const tableRows = byFamily.flatMap((g) => g.names.map(row));

  return `---
when: a film is about to ship mute, or you need a real sound for a beat instead of silence
answers: "which of the 13 synthesized cues to reach for, its family, energy, how it attaches to a scene, and its known failure mode"
group: crosscutting
---

# SFX CATALOG: the 13 synthesized cues, and when to reach for each

## AGENT SUMMARY

- Reach for a real cue instead of shipping mute. All 13 cues below are synthesized on the fly by
  \`core/audio/kit.mjs\`: no files, no license, nothing that 404s on a fresh clone.
- Pick by family and placement, not by name alone: an accent is not a transition, and a riser must be
  hand-timed to end on its beat, never auto-mapped to a cut.
- Enforced by \`make check GATE=audio-check\` (code \`silence-without-a-reason\`): a film that ships \`audio.silent:true\`
  must say why. Regenerate this doc with \`node harness/author/sfx-catalog.mjs\`; do not hand-edit it.

| Cue | Family | Energy | Purpose | Placement | Pitfall |
|---|---|---|---|---|---|
${tableRows.join('\n')}

## Provenance

Every cue's synthesis spec lives in \`core/audio/kit.mjs\` (\`CUES\`), voicings ported from Cuelume
(MIT, Daniel Belyi, https://github.com/Danilaa1/cuelume). This document is generated by
\`harness/author/sfx-catalog.mjs\` from that same registry. Do not hand-edit it: edit the \`META\` map in
the script, then run \`node harness/author/sfx-catalog.mjs\` to regenerate.
`;
}

// cueCorpus() is a function, not an exported map, so arsenal-check doesn't read it as a second, uncatalogued vocabulary of the same cues (META stays the one owner).
export function cueCorpus() {
  assertCoverage();
  return Object.entries(META).map(([name, m]) => ({
    name, kind: 'sfx cue', slot: 'audio.cues[].name',
    blurb: m.purpose, aka: [m.family, m.energy, 'sound', 'sfx', 'audio'], pitfall: m.pitfall,
  }));
}

function main() {
  assertCoverage();
  const md = build();
  fs.writeFileSync(OUT, md);
  console.log(`sfx-catalog: wrote ${path.relative(ROOT, OUT)} (${Object.keys(CUES).length} cues)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
