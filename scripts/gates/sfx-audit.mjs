// sfx-audit.mjs — is a sound effect the SHAPE its role claims?
//
//   node scripts/gates/sfx-audit.mjs        check assets/sfx
//   make sfx-check
//
// assets/sfx/click.wav was 19.6 SECONDS. The Mixkit fetcher asked for "the 4th ranked result in the
// click category" and saved whatever came back; nothing ever asked whether a file called `click` was
// actually a click. The typing sound design then stacked 38 of them 0.09s apart and the result was a
// continuous drone — a passing train, in the words of the person who had to listen to it (#51).
//
// A cue's role implies a duration class. A transient that outlasts the gap between two of its own
// triggers is not a transient any more, and that is checkable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SFX = path.join(repoRoot, 'assets/sfx');

// role prefix → the longest it may be, in seconds, and why that number.
const CLASSES = [
  [/^key/,                         0.30, 'a keystroke fires every ~0.09s; longer and the train arrives'],
  [/^(tick|click|press|release|pop|toggle)$/, 0.60, 'a UI transient is an event, not a sound bed'],
  [/^(whoosh|swoosh|whisper|droplet|bloom|chime|sparkle)$/, 3.0, 'a transition cue rides one cut'],
  [/^(reveal|impact|success|error|ready|correct|wrong)$/,   5.0, 'a sting lands once'],
  [/^(riser|beep|beep3)$/,        10.0, 'risers and tones are allowed to sustain'],
];

const durationOf = (file) => {
  const b = fs.readFileSync(file);
  if (b.length < 44 || b.toString('latin1', 0, 4) !== 'RIFF') return null;
  // walk the RIFF chunks rather than assuming a 44-byte header (fmt/LIST sizes vary)
  let byteRate = 0, dataLen = 0, off = 12;
  while (off + 8 <= b.length) {
    const id = b.toString('latin1', off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(off + 16);
    if (id === 'data') { dataLen = size; break; }
    off += 8 + size + (size % 2);
  }
  return byteRate ? dataLen / byteRate : null;
};

if (!fs.existsSync(SFX)) { console.log('~ assets/sfx is absent (gitignored, self-heals via `make sfx` / `make audio`) — nothing to check'); process.exit(0); }
const files = fs.readdirSync(SFX).filter((f) => f.endsWith('.wav')).sort();
const bad = [];
console.log(`── sfx shape check (${files.length} files)\n`);
for (const f of files) {
  const name = f.replace(/\.wav$/, '');
  const d = durationOf(path.join(SFX, f));
  const cls = CLASSES.find(([re]) => re.test(name));
  if (d == null) { bad.push({ name, why: 'unreadable WAV header' }); continue; }
  if (!cls) { console.log(`   ~ ${name.padEnd(10)} ${d.toFixed(2)}s  (no duration class declared)`); continue; }
  const [, cap, why] = cls;
  const ok = d <= cap;
  console.log(`   ${ok ? '✓' : '✗'} ${name.padEnd(10)} ${d.toFixed(2)}s  (cap ${cap}s — ${why})`);
  if (!ok) bad.push({ name, why: `${d.toFixed(2)}s exceeds the ${cap}s cap for its role — ${why}` });
}
console.log('');
if (!bad.length) { console.log('✓ every sound effect is the shape its role claims'); process.exit(0); }
for (const b of bad) console.log(`  ✗ ${b.name}: ${b.why}`);
console.log('\nRe-fetch it (`make sfx --force`) or bake the synthesized voicing (`node scripts/media/audio-bake.mjs --force`).');
process.exit(1);
