// scripts/site/films-json.mjs: what each showcase film IS, read from the film and from its source.
//
//   node scripts/site/films-json.mjs            # check, and name every film that disagrees with its source
//   node scripts/site/films-json.mjs --write    # rewrite site/lib/films.json
//
// WHY THIS EXISTS. `site/app/showcase/page.tsx` hand-typed a `dur` string per film. `creed-launch` was
// rewritten from 53s to 35.6s and the page still said `0:53`: the same hand-kept-number class that has
// already cost this repo eight stale counts across five files (#site-counts) and a poster nobody was
// watching (#471). A duration is a fact about the mp4, so ask the mp4.
//
// WHY IT ALSO ASKS THE SOURCE NOW. Reading the duration caught a drift and hid a worse one. Three
// shipped films disagreed with the scene that was supposed to have produced them, and each failed in a
// way a duration cannot see:
//   creed-launch  · source 53s, film 35.6s. The film was rendered from a scene edit that was then lost
//                   in a merge, so the shipped film had NO source anyone could re-render.
//   argus-launch  · source and film both 23.0s, and the film measured -91 dB. The scene named a real
//                   bed that resolves; the film had simply been committed before the sound existed. A
//                   fresh render measured -2.8 dB, so nothing was broken except what shipped.
//   plinth-ad     · source 15s and 9:16, film 27s and 16:9.
// Every one of those passed the duration check or was invisible to it. A film is stale the moment its
// scene moves on, and the only fact that sees that is the scene's own bytes.
//
// The mechanism is the repo's existing one, not a new one: harness/lib/receipt.mjs hashes a subject
// plus the html fragments it names, and `make beats` already uses it to prove somebody LOOKED at a
// sheet. Here the same hash proves a film was rendered from the scene that is on disk today.
//
// WHAT THIS CANNOT DO, said plainly. It proves a film matches its source and carries a track that is
// not digital silence. It cannot tell you the film is GOOD, that the bed suits it, or that the mix is
// balanced. That is `make judge` and your ears.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hashOf } from '../../harness/lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILMS = path.join(ROOT, 'site/public/assets/films');
const SCENES = path.join(ROOT, 'films/scene');
const OUT = path.join(ROOT, 'site/lib/films.json');
const write = process.argv.includes('--write');

for (const bin of ['ffprobe', 'ffmpeg']) {
  if (spawnSync(bin, ['-version'], { stdio: 'ignore' }).status !== 0) {
    console.error(`✗ ${bin} is not on PATH. A film is measured from the file, so there is nothing to read without it.`);
    process.exit(2);
  }
}

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Digital silence measures -91 dB. A real bed sits far above it, so the floor only has to separate
// "a track carrying something" from "a track carrying nothing"; it is not a loudness target.
const SILENT_DB = -60;
const peakDb = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' });
  const m = /max_volume:\s*(-?[\d.]+) dB/.exec(String(r.stderr));
  return m ? parseFloat(m[1]) : null;   // null = no audio stream at all
};

// A scene that names a bed, a VO or a cue is promising sound. `silent: true` is promising the opposite,
// and both are honoured; the failure is only ever a promise the film does not keep.
const promisesSound = (a) => !!a && typeof a === 'object' && a.silent !== true
  && ((typeof a.music === 'string' && a.music !== '') || (typeof a.vo === 'string' && a.vo !== '')
      || (Array.isArray(a.cues) && a.cues.length > 0) || a.auto === true);

const rows = {};
const findings = [];
const blind = [];
const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

for (const f of fs.readdirSync(FILMS).filter((n) => n.endsWith('.mp4')).sort()) {
  const slug = f.replace(/\.mp4$/, '');
  const film = path.join(FILMS, f);
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', film],
    { encoding: 'utf8' });
  const secs = parseFloat(String(r.stdout).trim());
  if (!(secs > 0)) { console.error(`✗ ${f}: ffprobe read no duration`); process.exit(1); }

  const row = { seconds: +secs.toFixed(2), label: clock(secs) };
  const db = peakDb(film);
  if (db !== null) row.peakDb = +db.toFixed(1);

  // The scene is the authority on what the film was meant to be. Four of the six film sources are
  // gitignored as content, so on a fresh clone it is simply absent: that is a fact about the checkout,
  // not about the film, and a check which cannot check says so rather than passing or failing. Same
  // `blind` shape scripts/site/scenes-json.mjs uses.
  const scene = path.join(SCENES, `${slug}.json`);
  if (!fs.existsSync(scene)) {
    blind.push(slug);
    if (prior[slug] && prior[slug].sourceHash) row.sourceHash = prior[slug].sourceHash;
  } else {
    const hash = hashOf(scene);
    row.sourceHash = hash;
    const data = JSON.parse(fs.readFileSync(scene, 'utf8'));

    const want = Number(data.duration);
    if (want > 0 && Math.abs(want - secs) > 1.5) findings.push([slug, 'film-orphan',
      `the scene is ${want}s and the film runs ${secs.toFixed(1)}s. The film was not rendered from this scene, so it cannot be reproduced. Re-render it: make video D=films/scene/${slug}.json`]);
    else if (prior[slug] && prior[slug].sourceHash && prior[slug].sourceHash !== hash) findings.push([slug, 'film-stale',
      `the scene has changed since this film was rendered. Re-render it: make video D=films/scene/${slug}.json`]);

    if (promisesSound(data.audio) && (db === null || db <= SILENT_DB)) findings.push([slug, 'film-silent',
      `the scene names sound and the film measures ${db === null ? 'no audio stream' : db.toFixed(1) + ' dB'}, which is silence. Re-render it: make video D=films/scene/${slug}.json`]);
  }
  rows[slug] = row;
}

const next = JSON.stringify(rows, null, 1) + '\n';
const changed = next !== (fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null);

if (blind.length) {
  console.log(`  ⚠ ${blind.length} film(s) could not be checked against a source: ${blind.join(', ')}`);
  console.log(`    Their scene is gitignored as content and is not on this disk, so staleness and silence are unverified here.`);
}
for (const [slug, code, msg] of findings) console.error(`  ✗ [${code}] ${slug}: ${msg}`);

if (write) {
  fs.writeFileSync(OUT, next);
  console.log(`✓ wrote ${Object.keys(rows).length} film(s) → ${path.relative(ROOT, OUT)}`);
  for (const [k, v] of Object.entries(rows)) console.log(`    ${k.padEnd(22)} ${v.label}  ${v.peakDb == null ? 'no audio' : v.peakDb + ' dB'}`);
} else if (changed) {
  console.error(`✗ site/lib/films.json disagrees with the rendered films.`);
  for (const [k, v] of Object.entries(rows)) {
    const was = prior[k];
    if (!was || was.label !== v.label) console.error(`    ${k}  says ${was ? was.label : 'nothing'}, the mp4 runs ${v.label}`);
  }
  console.error(`  Fix: make films-json WRITE=1`);
} else if (!findings.length) {
  console.log(`✓ ${Object.keys(rows).length} film(s) match their source, and every promised track carries sound`);
}
process.exit(findings.length || (!write && changed) ? 1 : 0);
