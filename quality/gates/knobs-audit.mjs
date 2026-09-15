// quality/gates/knobs-audit.mjs, ONE job: the manifest DRIFT GUARD.
//   make knobs-audit  → every knob core/knobs.js advertises must actually change the render, or the
//                       manifest is lying to authors.
//
// WHAT MOVED OUT, AND WHY. This file also carried a DEAD-KNOB CHECK: a knob set on a preset that
// ignores it (pointSize on extrudeText) reported as a warning, per scene, if you remembered to run it.
// That is the same bug class as an unknown layer PROP. A value accepted and then read by nobody,
// which core/layers/vocabulary.js has refused at boot for a long time, so grading the two differently
// was an accident of where the code happened to live. It is now `knobErrors()` in core/validate.mjs,
// which runs at `make validate` AND inside boot() before a frame renders. A scene path handed to this
// script is accepted and says so rather than being silently ignored.
//
// The half that stays cannot move: it proves a claim about the CODE, not about one scene, by probing
// every advertised dial for an output change. There is no write site for "the manifest is honest".
import { pathToFileURL } from 'node:url';
import { KNOBS } from '../../core/registry/knobs.js';
import { PRESETS } from '../../core/type/type.js';
import { decodeText } from '../../core/kinetic/presets.js';
import { resolveComposite, LOOK_NAMES } from '../../core/looks/index.js';
import { gateFindings } from '../../harness/lib/findings.mjs';

// COVERAGE, stated so nobody reads a pass as more than it is. core/knobs.js has SIX families and this
// guard can only prove the ones whose resolution is a pure function: `kinetic` (u, opts → keyframes)
// and `look` (name, opts → filter + overlays). `three`, `raymarch`, `ambient` and `sting` resolve
// inside a live scene, so a knob of theirs that does nothing still passes here.
// `look` was added in engine-doctrine/MISTAKES.md #365, after four of its six advertised knobs turned out to
// change NOTHING on any of the 31 looks. The manifest had been lying to authors for a year, in the
// same file this guard reads, one family across, and the guard was scoped to `kinetic` alone.

// ---- drift guard: kinetic knobs are pure functions, so we can prove each one moves the output ----
function driftGuard() {
  const us = [0.15, 0.35, 0.55, 0.75, 0.95];
  const sig = (fn, opts) => us.map((u) => JSON.stringify(fn(u, opts))).join('|');
  const dead = [];
  for (const [preset, knobs] of Object.entries(KNOBS.kinetic)) {
    if (preset === '_shared') continue;
    // `decode` is special-cased in animateUnits (core/type/type.js): its scramble comes from
    // decodeText(el, u, i, opts), a side-effecting DOM write, NOT from PRESETS.decode(u, opts), which
    // only ever returns the settle opacity/transform and ignores every decode-only knob by design (see
    // the "POPTS REACHED EVERY PRESET BUT THIS ONE" comment there). Probing PRESETS.decode reported
    // `rate`/`revealDelay` as dead when the real render path honours both; probe decodeText instead.
    if (preset === 'decode') { dead.push(...decodeDrift(knobs)); continue; }
    const fn = PRESETS[preset];
    if (!fn) { dead.push(`${preset}: no such preset in core/type.js`); continue; }
    const base = sig(fn, {});
    for (const k of knobs) {
      // A probe value clearly different from the default, typed per knob.
      // A named-value knob (an easing, a font) needs a KNOWN-valid alternative to probe with; a random
      // string just falls back to the default and looks dead. Skip those without an explicit `probe`.
      if (k.type === 'string' && k.probe == null) continue;
      const probe = k.probe != null ? k.probe
        : k.type === 'enum' ? k.values[k.values.length - 1]
          : k.type === 'bool' ? true
            : k.type === 'color' ? '#123456'
              : (Number(k.default) || 1) * 2 + 3;
      if (sig(fn, { [k.name]: probe }) === base) dead.push(`${preset}.${k.name} does not change the output`);
    }
  }
  return dead.concat(lookDrift());
}

// decodeText mutates `el.textContent` rather than returning a style object, so it needs its own probe
// harness: a fake element, a few `u` samples, the resulting text strings joined as the signature.
function decodeDrift(knobs) {
  const dead = [];
  const us = [0.15, 0.35, 0.55, 0.75];
  const sig = (opts) => {
    const el = { textContent: 'DECODE TEXT', __final: undefined };
    return us.map((u) => { decodeText(el, u, 3, opts); return el.textContent; }).join('|');
  };
  const base = sig({});
  for (const k of knobs) {
    if (k.type === 'string' && k.probe == null) continue; // same rule as driftGuard: no known-valid alternative to try
    const probe = k.probe != null ? k.probe
      : k.type === 'enum' ? k.values[k.values.length - 1]
        : k.type === 'bool' ? true
          : k.type === 'color' ? '#123456'
            : (Number(k.default) || 1) * 2 + 3;
    if (sig({ [k.name]: probe }) === base) dead.push(`decode.${k.name} does not change the output`);
  }
  return dead;
}

// `look` is a UNIFORM family: one dial set advertised for all 31 looks, and no look uses every dial
// (a look with no grain pass cannot take `grain`). So the claim a knob has to earn is weaker than
// kinetic's (at least ONE look must respond to it) and that is exactly the claim that failed.
function lookDrift() {
  const dead = [];
  const sig = (name, opts) => { const r = resolveComposite(name, opts); return r.filter + '||' + JSON.stringify(r.overlays); };
  for (const k of KNOBS.look._shared || []) {
    if (k.name === 'strength') continue; // proved by the positional-arg tests in lib-test
    const probe = k.name === 'colors' ? ['#111111', '#eeeeee'] : k.type === 'color' ? '#123456' : 0.9;
    const users = LOOK_NAMES.filter((n) => {
      try { return sig(n, {}) !== sig(n, { [k.name]: probe }); } catch { return false; } // refused = not a user
    });
    if (!users.length) dead.push(`look.${k.name} changes NO look, core/knobs.js advertises a dial that does not exist`);
  }
  return dead;
}

// ---- CLI ----
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const f = gateFindings();
  const drift = driftGuard();
  for (const d of drift) f.fail('dead-knob', d);
  if (f.count) {
    console.error('✗ manifest drift: core/knobs.js advertises dials the code ignores:');
    f.emit();
    process.exit(1);
  }
  console.log('✓ every advertised kinetic and look knob changes the output'
    + '  (three/raymarch/ambient/sting resolve inside a live scene and are NOT proved here)');

  // A scene path used to select the dead-knob check. That check is core/validate.mjs's now, so say so
  // rather than accept an argument and do nothing with it.
  if (process.argv[2]) console.log(`\n(the per-scene dead-knob check moved to core/validate.mjs, \`make validate D=${process.argv[2]}\`)`);
  f.emit();
  process.exit(0);
}
