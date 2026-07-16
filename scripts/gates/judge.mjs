// scripts/judge.mjs — the VISION JUDGE (prep half). Static gates (validate/critique/slop/audit) can't SEE
// composition or asset fidelity; this preps exactly what a vision model must look at + the criteria, and the
// agent-in-the-loop scores it. It renders the KEY frames (each beat's mid + hook + CTA) into one labeled
// sheet and writes the rubric (the brand house-style + the 7 craft dimensions + a verdict template). The
// AGENT then reads /tmp/judge/sheet.png against /tmp/judge/rubric.md and returns a PASS/FIX verdict.
//
// Usage: node scripts/judge.mjs <scene.json|mp4> [--vs <brand>]   ·   make judge D=<file> [VS=<brand>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const inp = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
if (!inp) { console.error('usage: node scripts/judge.mjs <scene.json|mp4> [--vs <brand>]'); process.exit(2); }

// resolve the rendered mp4 (from a scene JSON → out/<name>.mp4, or a direct mp4) + the scene for beats.
let mp4 = inp, scene = null;
if (inp.endsWith('.json')) {
  scene = JSON.parse(fs.readFileSync(inp, 'utf8'));
  mp4 = path.join('out', path.basename(inp).replace(/\.json$/, '.mp4'));
}
if (!fs.existsSync(mp4)) { console.error(`✗ no rendered video at ${mp4} — render first (\`make video D=${inp}\`), then judge.`); process.exit(1); }
const brand = arg('--vs', scene?.theme && typeof scene.theme === 'string' ? scene.theme : '');

const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', mp4]).toString().trim());
const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4]).toString().trim().split(',').map(Number);
const landscape = dims[0] >= dims[1];
const TW = landscape ? 600 : 340, TH = landscape ? 338 : 604; // tile box (scrutiny-sized, not thumbnails)

// KEY frames: each beat's MID (beats = layer-start clusters, like critique) + always the hook and the CTA.
let mids;
if (scene) {
  // CONTENT layers only: skip backgrounds (track 0), persistent labels (track 1), and near-full-duration
  // layers — otherwise a persistent chrome label spawns a phantom "beat" on a blank pre-hook frame.
  const content = (scene.layers || []).filter((l) => (l.track ?? 9) > 1 && (l.duration ?? 2) < dur * 0.7);
  const starts = [...new Set(content.map((l) => l.start ?? 0))].sort((a, b) => a - b);
  const beats = [];
  for (const t of starts) { const last = beats[beats.length - 1]; if (last == null || t - last > 1.6) beats.push(t); }
  mids = beats.map((b, i) => { const next = beats[i + 1] ?? dur; return { t: Math.min(dur - 0.1, b + Math.min(1.6, (next - b) * 0.55)), label: `beat ${i + 1} @${b.toFixed(1)}s` }; });
} else {
  const n = 6; mids = Array.from({ length: n }, (_, i) => ({ t: (dur * (i + 0.5)) / n, label: `@${((dur * (i + 0.5)) / n).toFixed(1)}s` }));
}

const dir = '/tmp/judge'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const ff = (a) => execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });
const tiles = mids.map((m, i) => {
  const tile = path.join(dir, `f${String(i).padStart(2, '0')}.png`);
  const label = m.label.replace(/[:']/g, '');
  ff(['-y', '-ss', m.t.toFixed(2), '-i', mp4, '-frames:v', '1',
    '-vf', `scale=${TW}:${TH}:force_original_aspect_ratio=decrease,pad=${TW}:${TH}:(ow-iw)/2:(oh-ih)/2:white,drawtext=text='${label}':x=10:y=10:fontsize=22:fontcolor=black:box=1:boxcolor=white@0.85:boxborderw=6`, tile]);
  return tile;
});
const cols = landscape ? 2 : 3, rows = Math.ceil(tiles.length / cols);
const lay = tiles.map((_, i) => `${(i % cols) * (TW + 4)}_${Math.floor(i / cols) * (TH + 4)}`).join('|');
const filter = tiles.map((_, i) => `[${i}:v]pad=${TW + 4}:${TH + 4}:2:2:white[p${i}]`).join(';') + ';' +
  tiles.map((_, i) => `[p${i}]`).join('') + `xstack=inputs=${tiles.length}:layout=${lay}:fill=white`;
ff(['-y', ...tiles.flatMap((t) => ['-i', t]), '-filter_complex', filter, `${dir}/sheet.png`]);

// the rubric = the brand's house-style (the scoring KEY) + the 7 craft dimensions + a verdict template.
const hsPath = brand && path.join('assets', 'brands', brand, 'house-style.md');
const houseStyle = hsPath && fs.existsSync(hsPath) ? fs.readFileSync(hsPath, 'utf8') : `(no house-style for "${brand || '?'}" — judge on the craft rubric + general brand-fidelity only)`;
const rubric = `# Judge sheet — ${path.basename(mp4)} (${tiles.length} key frames, ${landscape ? 'landscape' : 'portrait'})

READ \`/tmp/judge/sheet.png\` and score EACH labeled frame against the rubric below. Be adversarial:
your job is to catch what the static gates can't SEE. Do NOT rationalize a flaw you notice — flag it.

## The brand's house style (the scoring key)
${houseStyle}

## Craft rubric — score each frame 1-5 per dimension, name the issue + the fix
1. **Readability** — text legible at size, contrast sufficient (no muddy/low-contrast copy).
2. **Hierarchy** — ONE clear focal point; the eye knows where to land first.
3. **Composition** — centered/aligned/on-thirds ON PURPOSE. Off-center-by-accident, mis-anchored
   annotations (an underline not under its word), floating elements = FAIL. (This is the argus-pass class.)
4. **Brand fidelity** — matches the house style: dominance, ONLY brand colours, the real face, the
   SIGNATURE DETAILS present, the NEVERs absent.
5. **Asset fidelity** — real captured assets (logos/mascots/UI), never a recreated-from-memory lookalike.
6. **Produced-not-generated** — crafted density; not a word-on-empty-space slide.
7. **Value** — this frame teaches/proves/delights something no other frame does.

## Return this verdict (structured)
- **Per frame:** \`beat N — <worst dimension>: <the issue> → <the fix>\` (only frames with a real problem).
- **Worst frame overall** + why.
- **Verdict:** \`PASS\` only if every frame clears every dimension. Otherwise \`FIX\` + the prioritized list.
Rule: if your eye catches it, it's a FIX. "Renders fine" is not PASS.
`;
fs.writeFileSync(`${dir}/rubric.md`, rubric);

console.log(`\n  judge · ${path.basename(mp4)} · ${tiles.length} key frames · brand: ${brand || '(none)'}`);
console.log(`  → sheet:  /tmp/judge/sheet.png`);
console.log(`  → rubric: /tmp/judge/rubric.md  (house-style + 7 craft dimensions + verdict template)`);
console.log(`\n  AGENT: Read the sheet AGAINST the rubric, score each frame per dimension, return PASS/FIX + fixes.`);
console.log(`  Be adversarial — this is the gate that SEES what validate/critique/slop/audit cannot.\n`);
