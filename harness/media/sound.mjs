#!/usr/bin/env node
// `vawe sound <audio | mp4 | page.html> [--cuts <page | mp4>] [--from s --to s]`: reads the sound of a track, a film or a page completely,
// for cutting to the music. Writes out/see/<name>/sound.md, sound.json and sound.png. The measures are harness/lib/sound-read.mjs.
//   node harness/media/sound.mjs <input> [--cuts <page|mp4>] [--from s] [--to s] [--out dir] [--no-cache]
import fs from 'node:fs';
import path from 'node:path';
import { cutTimesOf, cutsVsSound, placeSound, readSound } from '../lib/sound-read.mjs';
import { cueLines, cutLines, soundLines } from '../lib/sound-report.mjs';
import { soundSvg } from '../lib/sound-picture.mjs';
import { decodeMono } from '../lib/audio-onsets.mjs';
import { launchPage } from '../lib/render-harness.mjs';
import { readTimeline } from './timeline.mjs';
import { probeVideo } from './see/core.mjs';

const die = (m) => { console.error(`error: ${m}`); process.exit(2); };
const PRINT_ROWS = 24;
const DEFAULT_FPS = 30;

function parse(argv) {
  const o = { input: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-cache') o.noCache = true;
    else if (['--cuts', '--from', '--to', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) die(`unknown flag ${a}; valid: --cuts --from --to --out --no-cache`);
    else o.input = a;
  }
  for (const k of ['from', 'to']) if (o[k] != null && !Number.isFinite(Number(o[k]))) die(`--${k} needs a number of seconds, got "${o[k]}"`);
  return o;
}

const pageCuts = (read) => cutTimesOf(read.spans, DEFAULT_FPS);

async function cutsOf(spec) {
  if (spec.endsWith('.html')) { const read = await readTimeline(spec); return { cuts: pageCuts(read), fps: DEFAULT_FPS, source: spec }; }
  const { refSpec } = await import('./ref-spec.mjs');
  const dir = path.resolve('out', 'sound-cuts', path.basename(spec, path.extname(spec)));
  const found = await refSpec({ video: spec, outDir: dir, maxElements: 1, ocr: false, audio: false, fast: true });
  return { cuts: found.cuts.map((c) => c.t), fps: probeVideo(spec).fps || DEFAULT_FPS, source: spec };
}

async function pngOf(file, { samples, placed, rows, title }) {
  const svg = soundSvg({ samples, rate: 22050, placed, cuts: rows, title });
  const { page, close } = await launchPage({ width: 1600, height: 400 });
  try {
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    await (await page.$('svg')).screenshot({ path: file });
  } finally { await close(); }
}

async function main(argv) {
  const o = parse(argv);
  if (!o.input) die('missing <input>; usage: vawe sound <audio | mp4 | page.html> [--cuts <page | mp4>] [--from s --to s]');
  if (!fs.existsSync(o.input)) die(`no such file: ${o.input}`);
  const isPage = o.input.endsWith('.html');
  const name = path.basename(isPage ? path.dirname(path.resolve(o.input)) : o.input, path.extname(o.input));
  let file = o.input, offset = 0, cues = [], read = null;
  if (isPage) {
    read = await readTimeline(o.input).catch((e) => die(e.message));
    const bed = read.specs.find((s) => s.role === 'music' && s.src);
    if (!bed) die(`${o.input} has no music bed (an <audio loop src="..."> tag): nothing to read for cutting; pass an audio file instead`);
    file = bed.src; offset = bed.at - (bed.trim || 0);
    cues = read.specs.filter((s) => s.role !== 'music').map((s) => ({ at: s.at, voice: s.synth || path.basename(s.src ?? '?'), gain: s.gain, world: read.spans.find((w) => w.start != null && s.at >= w.start && s.at < w.end)?.id ?? null })).sort((a, b) => a.at - b.at);
  }
  let sound;
  try { sound = readSound(file, { cache: !o.noCache }); } catch (e) { die(e.message); }
  const placed = placeSound(sound, { offset, from: o.from == null ? 0 : Number(o.from), to: o.to == null ? Infinity : Number(o.to) });
  const cutSpec = o.cuts ?? (isPage ? o.input : null);
  let cutInfo = null, result = null;
  if (cutSpec) {
    if (!fs.existsSync(cutSpec)) die(`no such --cuts file: ${cutSpec}`);
    cutInfo = cutSpec === o.input && read ? { cuts: pageCuts(read), fps: DEFAULT_FPS, source: o.input } : await cutsOf(cutSpec);
    const cuts = cutInfo.cuts.filter((t) => t >= placed.window.from && t <= (placed.window.to ?? Infinity));
    result = cutsVsSound(cuts, placed, cutInfo.fps);
  }
  const dir = path.resolve(o.out ?? path.join('out', 'see', name));
  fs.mkdirSync(dir, { recursive: true });
  const png = path.join(dir, 'sound.png');
  const samples = decodeMono(file, 22050).samples;
  await pngOf(png, { samples, placed, rows: result?.rows ?? [], title: `${name}: ${placed.tempo.bpm} BPM (${placed.tempo.usable ? 'usable' : 'weak'}); orange: hits, grey: beats, dashed: half beats, black: bars${result ? '; green, amber, red: cuts on beat, near, off' : ''}` });
  const full = (limit) => [...soundLines({ name, source: isPage ? `${o.input} (bed ${path.basename(file)})` : o.input, placed, limit }), ...cueLines(cues, placed), ...(result ? cutLines({ result, fps: cutInfo.fps, source: path.basename(cutInfo.source) }) : [])];
  fs.writeFileSync(path.join(dir, 'sound.md'), [...full(Infinity), `Picture: ${png}`, ''].join('\n'));
  fs.writeFileSync(path.join(dir, 'sound.json'), `${JSON.stringify({ input: o.input, bed: file, ...placed, cues, cuts: result && { source: cutInfo.source, fps: cutInfo.fps, ...result } })}\n`);
  console.log([...full(PRINT_ROWS), `Picture: ${png}`, `Written: ${path.join(dir, 'sound.md')} and sound.json (every grid line and onset)`].join('\n'));
}

main(process.argv.slice(2)).catch((e) => die(e.stack || String(e)));
