#!/usr/bin/env node
// quality/gates/edge-check.mjs: report-only. Does a full-bleed layer stop covering the frame while it
// is on screen, so the ground or the page behind it shows at the border. Real causes seen: a camera
// `travel` overshooting below scale 1 (fixed in core/timeline/sequence.js tangentAt, engine-doctrine/MISTAKES.md
// #626), a full-frame layer scaled below 1 with nothing else full-bleed under it, a tilted plane under
// perspective that core/tracks/overscan.js did not overscan (or opted out with `overscan: false`), and
// a full-frame rect with a corner radius. Never fires on a layer that is deliberately NOT full-bleed at
// that instant (a floating panel over a full ground): see quality/gates/edge-reveal.mjs's header for
// why the check is a DOM hit-test, not a size rule.
//
//   node quality/gates/edge-check.mjs formats/scene/<film>.json   ·   part of `make author-check`
//
// Waive a deliberate reveal with {"authoring":{"allow":["edge-reveal"]}} (or scoped to one instance,
// "edge-reveal@<t0>s-<t1>s"), the same one excuse mechanism every other gate here uses. No new field.
import fs from 'node:fs';
import path from 'node:path';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { isWaivedBy } from '../../harness/lib/waivers.mjs';
import { sampleEdgeReveal, toRanges } from './edge-reveal.mjs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('usage: node quality/gates/edge-check.mjs formats/scene/<film>.json');
  process.exit(2);
}

const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
const allow = (scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : [];

const F = gateFindings({ scene: file, indent: '  ',
  line: (r, g) => `  ${g} [${r.code}] ${r.waived ? 'waived via authoring.allow: ' : ''}${r.summary}` });

console.log(`\n  edge-check · ${path.basename(file)}`);

const hits = await sampleEdgeReveal(file);
const ranges = toRanges(hits);

for (const r of ranges) {
  const who = r.id ? `"${r.id}"` : `layer#${r.idx}`;
  const at = `${r.t0.toFixed(2)}s-${r.t1.toFixed(2)}s`;
  const summary = `${who} stops covering the ${r.border} border from ${at} (${r.cause}). `
    + `Fix: keep it at scale >= 1 and flat while it must read as full-bleed, add \`"overscan": false\` `
    + `only if the reveal is deliberate, or waive with {"authoring":{"allow":["edge-reveal@${at}"]}}.`;
  if (isWaivedBy(allow, 'edge-reveal', at)) F.finding({ code: 'edge-reveal', severity: 'warn', summary, at, waived: true });
  else F.warn('edge-reveal', summary, { at });
}

F.emit();
console.log(ranges.length ? `\n  → ${ranges.length} edge-reveal range(s).\n` : '\n  → nothing found.\n');
process.exitCode = 0; // report, never block
