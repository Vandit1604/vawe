// sfx-audit.mjs: is a sound effect the SHAPE its role claims?
//
//   node scripts/gates/sfx-audit.mjs        check assets/sfx
//   make sfx-check
//
// assets/sfx/click.wav was 19.6 SECONDS. The Mixkit fetcher asked for "the 4th ranked result in the
// click category" and saved whatever came back; nothing ever asked whether a file called `click` was
// actually a click. The typing sound design then stacked 38 of them 0.09s apart and the result was a
// continuous drone. A passing train, in the words of the person who had to listen to it (#51).
//
// A cue's role implies a duration class. A transient that outlasts the gap between two of its own
// triggers is not a transient any more, and that is checkable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
import { population } from '../lib/census.mjs';
import { gateFindings } from '../lib/findings.mjs';
const f = gateFindings();
const SFX = path.join(repoRoot, 'assets/sfx');

// role prefix → the longest it may be, in seconds, and why that number.
const CLASSES = [
  // Cuelume's cues, grouped by what the cue is FOR. `press` is the tightest cap because the typing
  // sound design fires it every ~0.09s; a tail longer than that gap is how a typed line became a drone.
  [/^(press|click)$/,                 0.15, 'a keystroke fires every ~0.09s; longer and the train arrives'],
  // `key` is the soft typing tap: it carries a low body that rings a touch longer than a sharp click on
  // purpose (that body is what makes it pleasant, not buzzy). Still an event, not a bed, capped so it
  // cannot drone even when the default 24cps typing fires it every 0.042s.
  [/^key$/,                           0.24, 'a soft keystroke tap rings slightly for a legato train'],
  [/^(tick|release|toggle)$/,         0.60, 'a UI transient is an event, not a sound bed'],
  [/^(whoosh|whisper|droplet|pop|bloom|sparkle|page|loading)$/, 3.0, 'a transition cue rides one cut'],
  [/^(reveal|chime|success|error|ready)$/,                      5.0, 'a sting lands once'],
];

// How long is this sound? NOT how long the FILE is, writeWav pads a decay tail, so a 46ms key click
// lands in a 0.31s file. Gating on file length flagged correct clicks and would happily pass a file
// that is 19s of silence after a 20ms tick. The honest measure is the last moment the signal is still
// audible, so decode the PCM and find where the energy falls below -45dBFS for good.
const AUDIBLE = 10 ** (-45 / 20);   // -45 dBFS: below this a transient's tail is inaudible under a mix

function measure(file) {
  const b = fs.readFileSync(file);
  if (b.length < 44 || b.toString('latin1', 0, 4) !== 'RIFF') return null;
  let ch = 0, rate = 0, bits = 0, fmtTag = 1, dataOff = 0, dataLen = 0, off = 12;
  while (off + 8 <= b.length) {
    const id = b.toString('latin1', off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') { fmtTag = b.readUInt16LE(off + 8); ch = b.readUInt16LE(off + 10); rate = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
    if (id === 'data') { dataOff = off + 8; dataLen = Math.min(size, b.length - dataOff); break; }
    off += 8 + size + (size % 2);
  }
  // 16/24/32-bit PCM and 32-bit float all appear here: the synthesized cues are 16-bit and the
  // recorded Mixkit ones are 24-bit. A gate that only decodes its author's own format reports
  // "unreadable" on half the library, which reads as broken files rather than a narrow reader.
  if (!rate || !ch || ![16, 24, 32].includes(bits)) return null;
  const isFloat = fmtTag === 3;
  const bytes = bits / 8, stride = bytes * ch;
  const frames = Math.floor(dataLen / stride);
  const sampleAt = (o) => {
    if (bits === 16) return b.readInt16LE(o) / 32768;
    if (bits === 24) return ((b[o] | (b[o + 1] << 8) | (b[o + 2] << 24 >> 8))) / 8388608;
    return isFloat ? b.readFloatLE(o) : b.readInt32LE(o) / 2147483648;
  };
  let last = 0;
  for (let i = 0; i < frames; i++) {
    let peak = 0;
    for (let c = 0; c < ch; c++) peak = Math.max(peak, Math.abs(sampleAt(dataOff + i * stride + c * bytes)));
    if (peak >= AUDIBLE) last = i;
  }
  return { file: frames / rate, audible: (last + 1) / rate };
}

if (!fs.existsSync(SFX)) { console.log('~ assets/sfx is absent (gitignored, self-heals via `make audio`). Nothing to check'); f.emit(); process.exit(0); }
// assets/sfx is entirely gitignored, so a checkout without it swept zero cues and said nothing was
// wrong with them. population() states N and refuses a checkout that should hold more.
const files = population('sfx audit', { dir: 'assets/sfx', ext: '.wav', quiet: true }).names;
const bad = [];
console.log(`── sfx shape check (${files.length} files)\n`);
for (const f of files) {
  const name = f.replace(/\.wav$/, '');
  const m = measure(path.join(SFX, f));
  const cls = CLASSES.find(([re]) => re.test(name));
  if (m == null) { bad.push({ name, why: 'unreadable or non-16-bit WAV' }); continue; }
  const shown = `${m.audible.toFixed(3)}s audible / ${m.file.toFixed(2)}s file`;
  if (!cls) { console.log(`   ~ ${name.padEnd(10)} ${shown}  (no duration class declared)`); continue; }
  const [, cap, why] = cls;
  const ok = m.audible <= cap;
  console.log(`   ${ok ? '✓' : '✗'} ${name.padEnd(10)} ${shown}  (cap ${cap}s, ${why})`);
  if (!ok) bad.push({ name, why: `${m.audible.toFixed(2)}s of audible signal exceeds the ${cap}s cap, ${why}` });
}
console.log('');
if (!bad.length) { console.log('✓ every sound effect is the shape its role claims'); f.emit(); process.exit(0); }
for (const b of bad) {
  console.log(`  ✗ ${b.name}: ${b.why}`);
  f.fail('sfx-shape', `${b.name}: ${b.why}`, { at: `assets/sfx/${b.name}.wav`,
    fix: 're-fetch it (`make audio` with `--force`) or bake the synthesized voicing (`node scripts/media/audio-bake.mjs --force`)' });
}
console.log('\nRe-fetch it (`make audio` with `--force`) or bake the synthesized voicing (`node scripts/media/audio-bake.mjs --force`).');
f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
