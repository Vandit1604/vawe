// harness/dev/preset-sheets.mjs: a rendered showcase per REFERENCE PROFILE (docs/CRAFT/SELECTION.md
// Part 2), so a film with no site to study picks a rendered look, not an adjective (another engine' 14
// frame presets each ship a rendered sheet; the profiles here had none). Companion to `make previews`
// (W3), same reasoning applied to the taste anchor instead of the beat library.
//
// harness/author/profiles.mjs (PROFILES) is the machine-readable source of truth for what each profile
// MEANS (face/pace/easing/cuts/stings/bounce); this script does not duplicate it, it reads it. Two of
// the eight already have a real theme (`themes/linear.json`, `themes/stripe.json`); the other six get a
// minimal palette+type+motion file at themes/presets/<name>.json, written from the same SELECTION.md
// prose PROFILES.<name> already carries as `blurb`/`dominance`/`accent`.
//
//   node harness/dev/preset-sheets.mjs [--only=<name>]   ·   make preset-sheets [ONLY=<name>]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PROFILES, PROFILE_NAMES } from '../author/profiles.mjs';
import { frameTile, tileGrid, tileBox, renderOf } from '../../quality/gates/tile.mjs';
// Generators write authored scenes, and an authored scene carries transitions[] only (the validator
// refuses cuts/stings/seams); the same converter the migration uses runs at the write site.
import { migrateOne } from '../author/migrate-junctions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH = path.join(ROOT, 'formats/scene/_batch/preset-sheets');
const OUT_DIR = path.join(ROOT, 'site/public/blocklib/presets');

// The theme each profile shows itself in. `linear`/`stripe` already have a real, committed theme; the
// rest live under themes/presets/ (this pass), matching SELECTION.md's dominance/face/accent for that
// profile. Named here rather than assumed as `themes/presets/<name>.json` for every profile, so the two
// with a real theme are not silently duplicated (the plan's own instruction).
const THEME = { linear: 'linear', stripe: 'stripe' };
for (const n of PROFILE_NAMES) if (!THEME[n]) THEME[n] = `presets/${n}`;

// One bg preset per profile's `dominance`/`look` (core/backgrounds/presets.js names), and the cut
// TIMING (core/cuts/timings.js) that matches its `pace`. `cuts[0]` (the profile's own family) supplies
// the STYLE; these two are the parts SELECTION.md states in prose and a scene has to pick concretely.
const SHOWCASE = {
  linear: { bg: 'ink', timing: 'snappy', headline: 'Ship with technical restraint.', support: 'Dark, mono-first, dev tools.', to: 99, unit: '%', label: 'uptime this quarter' },
  apple: { bg: 'paper', timing: 'smooth', headline: 'Considered, down to the frame.', support: 'Light, generous, one hero at a time.', to: 10, unit: 'x', label: 'fewer moving parts' },
  stripe: { bg: 'aurora', timing: 'smooth', headline: 'Built for the next decade of payments.', support: 'Clean-tech, warm-serious, developer-first.', to: 195, unit: '', label: 'countries supported' },
  nike: { bg: 'accent', timing: 'rush', headline: 'NOTHING SITS STILL.', support: 'Bold, full-bleed, kinetic type is the star.', to: 42, unit: 'K', label: 'reps this season' },
  a24: { bg: 'ink', timing: 'smooth', headline: 'A silence worth sitting in.', support: 'Dark, letterboxed, editorial tension.', to: 7, unit: '', label: 'festivals in official selection' },
  bloomberg: { bg: 'dotmatrix', timing: 'linear', headline: 'The data, moving in real time.', support: 'Dense, mechanical, information-first.', to: 4.2, unit: 'B', decimals: 1, label: 'trades processed daily' },
  duolingo: { bg: 'soft', timing: 'pop', headline: 'Learning that feels like winning.', support: 'Bright, rounded, joyfully overshot.', to: 500, unit: 'M', label: 'lessons completed' },
  vercel: { bg: 'black', timing: 'snappy', headline: 'Ship. Instantly.', support: 'Pure black, maximum restraint.', to: 60, unit: 'ms', label: 'median cold start' },
};

const missing = PROFILE_NAMES.filter((n) => !SHOWCASE[n]);
if (missing.length) { console.error(`! preset-sheets.mjs has no showcase content for: ${missing.join(', ')}`); process.exit(2); }

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length) : (process.env.ONLY || '');
const names = only ? only.split(',').map((s) => s.trim()).filter(Boolean) : PROFILE_NAMES;

fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// A COUNT MUST NEVER OVERSHOOT (core/validate.mjs countEaseErrors): a spring/back/bounce/elastic ease
// flies the number past its true value for a few frames. Duolingo is "the one profile where bounce is
// correct" and its own easing (`easeOutBack`) is exactly that overshoot, so the count borrows the
// nearest non-overshooting ease and the bounce personality shows up on the accent chip's `pop` instead.
const OVERSHOOT_EASE = /spring|bounce|back|elastic/i;
const countEase = (e) => (OVERSHOOT_EASE.test(e) ? 'easeOutQuart' : e);

function sceneFor(name) {
  const P = PROFILES[name], S = SHOWCASE[name];
  const cutAt = 2.6, dur = 6.0, tail = 0.3;
  const cutStyle = P.cuts[0] === 'none' ? 'none' : P.cuts[0];
  return {
    module: 'scene',
    theme: THEME[name],
    profile: name,
    aspect: '16:9',
    duration: +(dur + tail).toFixed(2),
    bg: [{ t: 0, preset: S.bg }],
    cuts: [{ t: cutAt, style: cutStyle, timing: S.timing }],
    audio: { silent: true, _why: 'preset showcase' },
    layers: [
      // beat A: headline + support line
      { type: 'text', text: S.headline, x: 160, y: 380, w: 1600, align: 'center', size: 92, weight: 800,
        split: 'word', preset: 'up', each: 0.4, stagger: 0.05, start: 0.2, duration: cutAt - 0.2, out: 'fade', exitDur: 0.3 },
      { type: 'text', text: S.support, x: 160, y: 560, w: 1600, align: 'center', size: 38, weight: 500,
        font: 'mono', color: 'var(--dim)', anim: 'fade', enterDur: 0.5, start: 0.7, duration: cutAt - 0.7, out: 'fade', exitDur: 0.3 },
      // beat B: one count, run on the profile's OWN easing (SELECTION.md: "the count easing IS the
      // story" for bloomberg, and every profile names one), plus one accent element naming its accent.
      { type: 'count', from: 0, to: S.to, unit: S.unit, ...(S.decimals != null ? { decimals: S.decimals } : {}),
        x: 160, y: 380, w: 1600, align: 'center', size: 320, weight: 800, color: 'var(--text)', ls: '-0.03em',
        countStart: 0.1, countDur: 1.4, ease: countEase(P.easing), anim: 'pop', enterDur: 0.5,
        start: cutAt + 0.2, duration: dur - cutAt, out: 'defocus', exitDur: 0.4 },
      { type: 'text', text: S.label, x: 160, y: 720, w: 1600, align: 'center', size: 40, weight: 600,
        color: 'var(--dim)', font: 'mono', anim: 'fade', enterDur: 0.5, start: cutAt + 0.5, duration: dur - cutAt - 0.3, out: 'fade', exitDur: 0.3 },
      { type: 'text', text: `accent: ${P.accent}`, font: 'mono', size: 30, weight: 600, color: 'var(--ink)',
        bg: 'var(--surface-2)', pad: '16px 26px', radius: 12, border: '1.5px solid var(--line)',
        x: 1560, y: 940, w: 320, align: 'center', anim: P.bounceOk ? 'pop' : 'fade', enterDur: 0.45,
        start: cutAt + 0.9, duration: dur - cutAt - 0.7, out: 'fade', exitDur: 0.3 },
    ],
  };
}

const results = [];
for (const name of names) {
  const scenePath = path.join(SCRATCH, `${name}.json`);
  const destDir = path.join(OUT_DIR, name);
  try {
    fs.writeFileSync(scenePath, JSON.stringify(migrateOne(sceneFor(name)).next, null, 1));
    execFileSync('node', ['core/validate/validate.mjs', scenePath], { cwd: ROOT, stdio: 'pipe' });
    execFileSync('./bin/vawe', [scenePath, '--draft', '--workers', '2'], { cwd: ROOT, stdio: 'pipe' });

    const mp4 = path.join(ROOT, renderOf(scenePath));
    if (!fs.existsSync(mp4)) throw new Error(`renderer reported success but ${mp4} is missing`);

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(mp4, path.join(destDir, 'showcase.mp4'));

    const box = tileBox(true);
    const d = sceneFor(name).duration;
    const tiles = [0.1, 2.5, d - 0.2].map((t, i) =>
      frameTile(mp4, Math.max(0, t), path.join(SCRATCH, `${name}.tile${i}.png`), box));
    tileGrid(tiles, { ...box, cols: 3, out: path.join(destDir, 'sheet.png') });

    results.push({ name, ok: true, theme: THEME[name], duration: d, dims: { w: 1920, h: 1080 },
      pickWhen: `${PROFILES[name].blurb}`,
      files: { showcase: `presets/${name}/showcase.mp4`, sheet: `presets/${name}/sheet.png` } });
    console.log(`✓ ${name}`);
  } catch (e) {
    const msg = (e.stderr ? e.stderr.toString() : e.message || String(e)).trim().split('\n').slice(-6).join('\n');
    results.push({ name, ok: false, error: msg });
    console.error(`✗ ${name}\n${msg}`);
  }
}

const indexPath = path.join(OUT_DIR, 'index.json');
const prior = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')).presets || [] : [];
const byName = new Map(prior.map((p) => [p.name, p]));
for (const r of results) if (r.ok) { const { ok, ...entry } = r; byName.set(r.name, entry); }
fs.writeFileSync(indexPath, JSON.stringify({ presets: [...byName.values()] }, null, 1) + '\n');

const ok = results.filter((r) => r.ok).length;
console.log(`\npreset-sheets: ${ok}/${results.length} rendered → ${path.relative(ROOT, indexPath)}`);
for (const r of results) if (!r.ok) console.log(`  ✗ ${r.name}: ${r.error.split('\n')[0]}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
