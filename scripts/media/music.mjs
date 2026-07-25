// music.mjs — fetch a real soundtrack for a launch video, and record where it came from.
//
//   node scripts/media/music.mjs ambient 0 calm      genre, rank, local name
//   node scripts/media/music.mjs --id 738 calm       a specific Mixkit track id
//   make music GENRE=ambient N=0 NAME=calm
//
// LICENSING — read this before shipping a video publicly. Tracks come from Mixkit's free stock music
// under the "Mixkit Stock Music Free License", which is a DIFFERENT licence from the Sound Effects
// Free License this repo already uses for assets/sfx. That music licence is rendered client-side on
// mixkit.co/license and could not be read programmatically here, so it has NOT been verified by this
// tool. What this script does instead is make the provenance impossible to lose:
//   • every download is recorded in assets/music/credits.json with its source and licence page
//   • assets/music/ is gitignored, so the repo never REDISTRIBUTES a track — the main licence risk
//   • the track is fetched on demand, exactly like fonts and sfx
// Confirm the licence yourself before publishing commercially, or drop in your own file at the same
// path — nothing downstream cares where the wav came from.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEST = path.join(repoRoot, 'assets/music');
const CREDITS = path.join(DEST, 'credits.json');
fs.mkdirSync(DEST, { recursive: true });
const UA = { 'User-Agent': 'Mozilla/5.0 (vawe music fetcher)' };
const LICENCE = 'https://mixkit.co/license/#musicFree';

// The curated pack: the real beat-driven loops the engine ships as the DEFAULT sound (replacing the
// synthesized drone the `warm`/`calm`/`tense` beds used to auto-select). `make music-pack` fetches
// all of them; core/audio-select.js maps the music profiles onto these files. Each row is a fixed
// (genre-slug, rank) so the same track downloads every time — page order is Mixkit's own ranking.
const PACK = [
  { name: 'lofi',  genre: 'lo-fi-beats', rank: 0 }, // calm, jazzy — the premium mid-energy bed
  { name: 'chill', genre: 'chillout',    rank: 0 }, // brighter, bouncier — sunny/major-key moods
  { name: 'beat',  genre: 'hip-hop',     rank: 0 }, // real drums with a pulse — energetic drops
];

const argv = process.argv.slice(2);
const idAt = argv.indexOf('--id');
const explicitId = idAt >= 0 ? argv[idAt + 1] : null;
const rest = argv.filter((a, i) => a !== '--id' && argv[i - 1] !== '--id');

async function idsForGenre(g) {
  const res = await fetch(`https://mixkit.co/free-stock-music/${g}/`, { headers: UA });
  if (!res.ok) throw new Error(`genre "${g}" -> HTTP ${res.status}`);
  const html = await res.text();
  const ids = [...html.matchAll(/assets\.mixkit\.co\/music\/(\d+)\/\1\.mp3/g)].map((m) => m[1]);
  return [...new Set(ids)]; // page order = Mixkit's own ranking
}

// fetchTrack: download one track (by genre+rank or explicit id) → 44.1k mono WAV + a credits row.
async function fetchTrack({ genre, rank = 0, id = null, name }) {
  let trackId = id;
  if (!trackId) {
    const ids = await idsForGenre(genre);
    if (!ids.length) throw new Error(`no tracks found for genre "${genre}"`);
    trackId = ids[Math.min(rank, ids.length - 1)];
  }
  const mp3 = path.join(DEST, `${name}.mp3`);
  const wav = path.join(DEST, `${name}.wav`);
  const res = await fetch(`https://assets.mixkit.co/music/${trackId}/${trackId}.mp3`, { headers: UA });
  if (!res.ok) throw new Error(`track ${trackId} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) throw new Error(`track ${trackId} came back too small (${buf.length}b) — not audio`);
  fs.writeFileSync(mp3, buf);

  // The Go mixer reads WAV. Decode to 44.1k mono so beat detection and mixing share one representation.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '44100', wav]);
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString().trim();

  const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};
  credits[name] = { id: trackId, genre: genre || 'direct', source: `https://assets.mixkit.co/music/${trackId}/${trackId}.mp3`,
    page: 'https://mixkit.co/free-stock-music/', licence: LICENCE,
    licenceVerified: false, note: 'Mixkit Stock Music Free License — confirm terms before commercial release',
    seconds: +dur.toFixed(2) };
  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + '\n');
  console.log(`✓ ${name}.wav  (mixkit #${trackId}${genre ? ` · ${genre} #${rank}` : ''} · ${dur.toFixed(1)}s · ${(buf.length / 1024 / 1024).toFixed(1)}MB mp3)`);
  return dur;
}

if (argv.includes('--pack')) {
  for (const t of PACK) {
    try { await fetchTrack(t); }
    catch (e) { console.error(`  ✗ ${t.name}: ${e.message}`); process.exitCode = 1; }
  }
  console.log(`  → assets/music/{${PACK.map((t) => t.name).join(',')}}.wav   credits → assets/music/credits.json`);
  console.log(`  ⚠ licence NOT verified programmatically (${LICENCE}) — confirm before publishing commercially.`);
} else {
  const genre = explicitId ? null : (rest[0] || 'ambient');
  const rank = explicitId ? 0 : parseInt(rest[1] || '0', 10);
  const name = (explicitId ? rest[0] : rest[2]) || 'track';
  await fetchTrack({ genre, rank, id: explicitId, name });
  console.log(`  → assets/music/${name}.wav   credits → assets/music/credits.json`);
  console.log(`  ⚠ licence NOT verified programmatically (${LICENCE}) — confirm before publishing commercially.`);
}
