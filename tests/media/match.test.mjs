// tests/media/match.test.mjs: house-rule self-check, no framework.
//   node tests/media/match.test.mjs
//
// Proves harness/media/match.mjs end to end on synthetic clips (generated here, not committed
// binaries, same convention as tests/media/ingest.test.mjs): a film matched against ITS OWN render
// scores SSIM near 1, and against a genuinely different render scores clearly lower. Also covers both
// ways a beat list is found: the film's own storyboard, and (with none) scene cuts detected in the
// reference.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/match.mjs');
const SLUG = 'match-fixture';
const FILM = path.join(ROOT, 'tests/fixtures/films', `${SLUG}.json`);
const RENDER_MP4 = path.join(ROOT, 'out', `${SLUG}.mp4`);
const SB = path.join(ROOT, 'tests/fixtures/films', `${SLUG}.storyboard.md`);

assert(fs.existsSync(FILM), `fixture missing: ${FILM}`);
assert(!fs.existsSync(RENDER_MP4), `fixture collision: out/${SLUG}.mp4 already exists, remove it first`);
assert(!fs.existsSync(SB), `fixture collision: ${SB} already exists`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'match-test-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

// Four hard-cut colour segments, 0.5s each: real per-segment content (not a subtle gradient), and a
// real scene cut at every boundary for detectCuts to find. `colors` in a DIFFERENT order is a
// genuinely different clip, segment for segment.
function buildClip(colors, out) {
  const segs = colors.map((c, i) => {
    const p = path.join(tmp, `${path.basename(out)}-${i}.mp4`);
    ff(['-f', 'lavfi', '-i', `color=c=${c}:s=100x60:d=0.5:r=10`, '-pix_fmt', 'yuv420p', p]);
    return p;
  });
  const listFile = path.join(tmp, `${path.basename(out)}.list.txt`);
  fs.writeFileSync(listFile, segs.map((p) => `file '${p}'\n`).join(''));
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', out]);
  return out;
}

const refClip = buildClip(['red', 'green', 'blue', 'yellow'], path.join(tmp, 'ref.mp4'));
const differentClip = buildClip(['yellow', 'blue', 'green', 'red'], path.join(tmp, 'different.mp4'));

function runMatch(ref, outDir, extraArgs = []) {
  const stdout = execFileSync('node', [SCRIPT, ref, FILM, '--out', outDir, '--step', '0.2', ...extraArgs],
    { cwd: ROOT, encoding: 'utf8' });
  const md = fs.readFileSync(path.join(outDir, 'match.md'), 'utf8');
  const rows = md.split('\n').filter((l) => /^\|\s*\d+\s*\(/.test(l));
  const ssims = rows.map((l) => Number(l.split('|').map((c) => c.trim())[4])).filter((v) => Number.isFinite(v));
  return { stdout, md, ssims };
}

try {
  // (a) self-match, no storyboard: beats come from cuts detected in the reference.
  fs.copyFileSync(refClip, RENDER_MP4);
  const selfDir = path.join(tmp, 'self');
  const self = runMatch(refClip, selfDir);
  assert(/scene cut\(s\) detected in the reference/.test(self.stdout), `expected the detectCuts fallback: ${self.stdout}`);
  assert(self.ssims.length >= 3, `expected several beats from the 3 colour cuts, got ${self.ssims.length}: ${self.md}`);
  for (const s of self.ssims) assert(s > 0.98, `a film matched against its own render must score SSIM near 1, got ${s}`);
  assert(fs.existsSync(path.join(selfDir, 'beat1.strip.png')), 'beat1.strip.png must be written');
  assert(fs.existsSync(path.join(selfDir, 'beat1.diff.png')), 'beat1.diff.png must be written');
  console.log(`✓ match.test.mjs: self-match scores SSIM near 1 (${self.ssims.join(', ')})`);

  // (b) a genuinely different render (same cut points, swapped colours per segment): still runs and
  // reports a match.md, but scores clearly lower.
  fs.copyFileSync(differentClip, RENDER_MP4);
  const offDir = path.join(tmp, 'off');
  const off = runMatch(refClip, offDir);
  const worstSelf = Math.min(...self.ssims);
  const worstOff = Math.min(...off.ssims);
  assert(worstOff < worstSelf - 0.1, `a different render must score clearly lower than the self-match, got ${worstOff} vs ${worstSelf}`);
  console.log(`✓ match.test.mjs: a different render scores lower (${off.ssims.join(', ')} vs self-match ${self.ssims.join(', ')})`);

  // (c) with a storyboard sidecar present, beats come from it instead of detectCuts.
  fs.writeFileSync(SB, '## Beat 1: whole clip (0.0s-2.0s)\n');
  const sbDir = path.join(tmp, 'storyboard');
  fs.copyFileSync(refClip, RENDER_MP4);
  const withSb = runMatch(refClip, sbDir);
  assert(/storyboard beats/.test(withSb.stdout), `expected the storyboard path once a sidecar exists: ${withSb.stdout}`);
  assert(withSb.ssims.length === 1, `one storyboard beat must produce one row, got ${withSb.ssims.length}`);

  // (d) the documented `make study REF=<x> D=<y> MATCH=1` invocation, copied verbatim as argv (KEY=value
  // tokens, not `--flags`), must work when the script is run directly and not only through `make`.
  fs.copyFileSync(refClip, RENDER_MP4);
  const kvDir = path.join(tmp, 'kv');
  fs.mkdirSync(kvDir, { recursive: true });
  const kvOut = execFileSync('node', [SCRIPT, `REF=${refClip}`, `D=${FILM}`, '--out', kvDir, '--step', '0.2'],
    { cwd: ROOT, encoding: 'utf8' });
  assert(fs.existsSync(path.join(kvDir, 'match.md')), `REF=/D= argv style must still write match.md: ${kvOut}`);

  // (e) a DRAFT render (30fps, `make dev --draft`) is scored, not refused, and the report says which
  // render (draft or final) it scored.
  const draftClip = path.join(tmp, 'draft.mp4');
  ff(['-f', 'lavfi', '-i', 'color=c=red:s=100x60:d=2.0:r=30', '-pix_fmt', 'yuv420p', draftClip]);
  fs.copyFileSync(draftClip, RENDER_MP4);
  const draftDir = path.join(tmp, 'draft');
  const draft = runMatch(refClip, draftDir);
  assert(/draft/.test(draft.stdout), `a 30fps render must be reported as a draft: ${draft.stdout}`);

  // (f) a storyboard sidecar that EXISTS but names no usable beat must say so and name the fallback,
  // instead of silently behaving as if no storyboard had been written.
  fs.writeFileSync(SB, 'notes about this film, no `## Beat N:` heading and no beat table\n');
  fs.copyFileSync(refClip, RENDER_MP4);
  const unreadableDir = path.join(tmp, 'unreadable-sb');
  const unreadable = runMatch(refClip, unreadableDir);
  assert(/exists but named no usable beat/.test(unreadable.stdout), `expected the fallback to be announced: ${unreadable.stdout}`);
  assert(/scene cut\(s\) detected in the reference/.test(unreadable.stdout), `must still fall back to detected cuts: ${unreadable.stdout}`);
} finally {
  fs.rmSync(RENDER_MP4, { force: true });
  fs.rmSync(SB, { force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('match.test.mjs: ok');
