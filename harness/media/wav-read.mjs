// calls every other file "unreadable" (engine-doctrine/MISTAKES.md #56).
import fs from 'node:fs';

/** readWav(path) → { sampleRate, channels, bits, frames, mono: Float64Array } (mono = channel mean) */
export function readWav(p) {
  const b = fs.readFileSync(p);
  if (b.length < 12 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WAVE')
    throw new Error(`not a RIFF/WAVE file: ${p}`);
  let fmtTag = 1, channels = 0, sampleRate = 0, bits = 0, dataOff = 0, dataLen = 0, off = 12;
  while (off + 8 <= b.length) {
    const id = b.toString('latin1', off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') { fmtTag = b.readUInt16LE(off + 8); channels = b.readUInt16LE(off + 10); sampleRate = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
    if (id === 'data') { dataOff = off + 8; dataLen = Math.min(size, b.length - dataOff); break; }
    off += 8 + size + (size % 2);
  }
  if (!sampleRate || !channels || ![16, 24, 32].includes(bits)) throw new Error(`unsupported WAV (${bits}-bit, ${channels}ch): ${p}`);
  const isFloat = fmtTag === 3, bytes = bits / 8, stride = bytes * channels;
  const frames = Math.floor(dataLen / stride);
  const at = (o) => {
    if (bits === 16) return b.readInt16LE(o) / 32768;
    if (bits === 24) return ((b[o] | (b[o + 1] << 8) | ((b[o + 2] << 24) >> 8))) / 8388608;
    return isFloat ? b.readFloatLE(o) : b.readInt32LE(o) / 2147483648;
  };
  const mono = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += at(dataOff + i * stride + c * bytes);
    mono[i] = s / channels;
  }
  return { sampleRate, channels, bits, frames, mono };
}

/** peakEnvelope(mono) → the last index whose |sample| is at or above `floor` (for duration checks). */
export function lastAudible(mono, floor = 10 ** (-45 / 20)) {
  let last = 0;
  for (let i = 0; i < mono.length; i++) if (Math.abs(mono[i]) >= floor) last = i;
  return last;
}
