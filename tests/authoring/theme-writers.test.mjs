// harness/author/theme-writers.test.mjs: every theme WRITER's output survives the token-file adapter.
// The engine refuses a theme in the retired palette/type/gradient shape (core/theme/roles.js
// expandTheme), so every write site into themes/ now converts through migrate-themes.mjs's own
// migrateOne, and this proves it, both live (theme-remix.mjs, deterministic and network-free) and by
// shape (invent-look.mjs's buildTheme, which needs a storyboard file and live font vendoring to run for
// real, so its exact output shape is reproduced here instead, cited to its source lines).
//   node harness/author/theme-writers.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { migrateOne } from '../../harness/author/migrate-themes.mjs';
import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { parseColor, colorAlpha } from '../../core/color/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- scripts/brand/theme-remix.mjs: run it for real (pure, deterministic, no network) ----
{
  const brand = '_test-theme-writers-remix';
  const dest = path.join(ROOT, 'themes', `${brand}.json`);
  try {
    execFileSync('node', ['scripts/brand/theme-remix.mjs', '--preset', 'editorial', '--brand', brand, '--bg', '#0d0f13', '--accent', '#e0922f'],
      { cwd: ROOT, stdio: 'pipe' });
    assert.ok(fs.existsSync(dest), 'theme-remix must write themes/<brand>.json');
    const raw = JSON.parse(fs.readFileSync(dest, 'utf8'));
    assert.ok(isTokenFile(raw), 'theme-remix must write a token file (tokens + roles), the retired shape is refused');
    const expanded = expandTheme(raw, { parseColor, colorAlpha });
    assert.equal(expanded.palette.bg, '#0d0f13');
    assert.equal(expanded.palette.accent, '#e0922f');
  } finally {
    fs.rmSync(dest, { force: true });
  }
}

// ---- harness/author/invent-look.mjs: buildTheme()'s exact output shape (invent-look.mjs:479-524) ----
// Reproduced rather than invoked live: buildTheme() itself is pure (no fs/network), but importing the
// module to reach it runs the whole CLI top-level (argv parsing, a storyboard read, live font-catalogue
// vendoring), none of which belongs in a fast unit test. Both write sites in that file
// (harness/author/invent-look.mjs:636, :667) now run their theme through the same asTokenFile() helper
// this test exercises directly via migrateOne.
{
  const invented = {
    name: 'invented-fixture',
    note: 'INVENTED (not selected) by harness/author/invent-look.mjs, seed 1.',
    palette: {
      bg: '#0b0d12', bg2: '#12151c', surface: '#161a22', surface2: '#1d222b',
      line: 'rgba(120,130,150,0.10)', lineStrong: 'rgba(120,130,150,0.22)',
      text: '#eef0f4', text2: '#a9aebb', dim: '#767c8a', ink: '#eef0f4',
      accent: '#e0922f', accentDim: 'rgba(224,146,47,0.16)', accentGlow: 'rgba(224,146,47,0.45)',
      up: '#e0922f', down: '#d94f4f',
    },
    gradient: ['#0b0d12', '#11141b', '#171b24'],
    type: { sans: 'Hanken Grotesk', serif: 'Fraunces', mono: 'JetBrains Mono', num: 'JetBrains Mono' },
    motion: { easing: 'easeOutQuint', bounce: 0.05, settle: 0.6, enter: 40, durationScale: 1, stagger: 0.04 },
    bg: { accent: '224,146,47', tint: '90,95,105', dark: ['#0b0d12', '#05060a'] },
    bgDefault: { preset: 'deep' },
    vars: { '--ink': '#eef0f4', '--paper': '#0b0d12', '--muted': '#a9aebb', '--em': '#e0922f' },
    invented: { tool: 'harness/author/invent-look.mjs', seed: 1, resolvedSeed: 7, subjectFingerprint: 123 },
  };
  const { next, ok, err } = migrateOne(invented);
  assert.ok(ok, `migrateOne must convert buildTheme()'s shape cleanly: ${err}`);
  assert.ok(isTokenFile(next));
  const expanded = expandTheme(next, { parseColor, colorAlpha });
  assert.equal(expanded.palette.bg, invented.palette.bg);
  assert.equal(expanded.palette.accentDim, invented.palette.accentDim);
  assert.deepEqual(expanded.motion, invented.motion);
  assert.deepEqual(expanded.invented, invented.invented);
}

console.log('theme-writers.test.mjs: ok');
