// vawe refs list | index | add <mp4-or-url> --type product|brand [--title t] | frames [id]: the reference films an agent
// studies and the fresh judge compares a film with (harness/lib/refs.mjs). They live in $VAWE_REFS_DIR (default ~/.vawe/refs),
// never in the repo. `frames` writes the settled full-size frames of each shot, from the 1080p copy in hd/ when there is one.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { refsDir, parseVerified, readRegistry, writeRegistry, listLines, SHEETS, VERIFIED, TYPES } from '../lib/refs.mjs';
import { contactSheet, durationOf, keyFrameFiles } from '../lib/contact-sheet.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const dir = refsDir();
const [action, source] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
const flag = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const die = (m) => { console.error(`vawe refs: ${m}`); process.exit(1); };

const videoOf = (id) => ['mp4', 'webm'].map((e) => path.join(dir, `${id}.${e}`)).find(fs.existsSync);
const specOf = (id) => (fs.existsSync(path.join(dir, 'spec', id, 'spec.json')) ? path.join('spec', id, 'spec.json') : null);

function sheetOf(id, video) {
  const rel = path.join(SHEETS, `${id}.png`);
  const out = path.join(dir, rel);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(video).mtimeMs) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    contactSheet(video, durationOf(video), path.dirname(out), `${id}.png`);
  }
  return rel;
}

function recorded(meta, video) {
  return { ...meta, seconds: Number(durationOf(video).toFixed(1)), sheet: sheetOf(meta.id, video), spec: specOf(meta.id) };
}

function index() {
  const verified = path.join(dir, VERIFIED);
  if (!fs.existsSync(verified)) die(`no ${verified}: it names each film's title, studio, type and scope`);
  const known = parseVerified(fs.readFileSync(verified, 'utf8'));
  const kept = (readRegistry(dir) ?? []).filter((r) => !known.some((k) => k.id === r.id));
  const films = known.filter((k) => videoOf(k.id));
  for (const k of known.filter((x) => !videoOf(x.id))) console.error(`vawe refs: ${k.id} is listed but has no video in ${dir}`);
  const registry = [...films.map((k) => recorded(k, videoOf(k.id))), ...kept].sort((a, b) => a.id.localeCompare(b.id));
  writeRegistry(dir, registry);
  console.log(`indexed ${registry.length} films into ${path.join(dir, 'refs.json')}`);
}

function download(url) {
  const r = spawnSync('yt-dlp', ['-f', 'bv*[height<=360]/b[height<=360]/worst', '--merge-output-format', 'mp4', '--no-playlist', '-o', path.join(dir, '%(id)s.%(ext)s'),
    '--print', 'after_move:filepath', '--print', '%(id)s\t%(title)s\t%(channel)s'], { encoding: 'utf8' });
  if (r.error?.code === 'ENOENT') die('yt-dlp is not installed: brew install yt-dlp');
  if (r.status !== 0) die(`yt-dlp failed: ${String(r.stderr).split('\n').filter(Boolean).slice(-2).join(' ')}`);
  const [file, info] = r.stdout.trim().split('\n');
  const [id, title, studio] = info.split('\t');
  return { file, id, title, studio };
}

function fromFile(file) {
  const dest = path.join(dir, path.basename(file));
  if (path.resolve(file) !== dest) fs.copyFileSync(file, dest);
  return { file: dest, id: path.basename(file).replace(/\.[^.]+$/, ''), title: null, studio: null };
}

function add() {
  const type = flag('--type');
  if (!TYPES.includes(type)) die(`--type is ${TYPES.join(' or ')}`);
  if (!source) die('usage: vawe refs add <mp4-or-url> --type product|brand [--title t]');
  fs.mkdirSync(dir, { recursive: true });
  const got = /^https?:\/\//.test(source) ? download(source) : fromFile(source);
  const spec = spawnSync(process.execPath, [path.join(root, 'harness/media/ref-spec.mjs'), got.file, '--out', path.join(dir, 'spec', got.id), '--ocr'], { stdio: 'inherit' });
  if (spec.status !== 0) console.error('vawe refs: the measure failed; the film is registered without a spec');
  const meta = { id: got.id, title: flag('--title') ?? got.title ?? got.id, studio: got.studio, type, inScope: true, why: null };
  const registry = (readRegistry(dir) ?? []).filter((r) => r.id !== got.id);
  writeRegistry(dir, [...registry, recorded(meta, got.file)].sort((a, b) => a.id.localeCompare(b.id)));
  console.log(`added ${got.id} (${type}) to ${path.join(dir, 'refs.json')}`);
}

const FRAMES_PER_FILM = 8;
const hdOf = (id) => [path.join(dir, 'hd', `${id}.mp4`)].find(fs.existsSync);
const shotsOf = (id) => {
  const file = path.join(dir, 'spec', id, 'spec.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')).shots ?? []).map((s) => ({ start: s.t0, end: s.t1 })) : [];
};

function frames() {
  const registry = readRegistry(dir);
  if (!registry) die(`no registry in ${dir}; run: bin/vawe refs index`);
  const films = registry.filter((r) => r.inScope && (!source || r.id === source));
  if (!films.length) die(source ? `no film ${source} in scope` : 'no film in scope');
  for (const r of films) {
    const video = hdOf(r.id) ?? videoOf(r.id);
    const out = path.join(dir, 'frames', r.id);
    fs.rmSync(out, { recursive: true, force: true });
    const got = keyFrameFiles(video, durationOf(video), out, { shots: shotsOf(r.id), count: FRAMES_PER_FILM });
    console.log(`${r.id}: ${got.length} frames (${got.map((k) => `${k.t.toFixed(1)}s`).join(' ')}) from ${path.relative(dir, video)} -> ${path.relative(dir, out)}/`);
  }
}

function list() {
  const registry = readRegistry(dir);
  if (!registry) die(`no registry in ${dir}; run: bin/vawe refs index`);
  console.log(listLines(registry).join('\n'));
  console.log(`${registry.filter((r) => r.inScope).length} in scope of ${registry.length}, in ${dir}`);
}

const actions = { list, index, add, frames };
if (!actions[action]) die('usage: vawe refs list | index | add <mp4-or-url> --type product|brand [--title t] | frames [id]');
actions[action]();
