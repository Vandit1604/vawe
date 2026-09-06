// rules-build.mjs: emits vawe-rules.md, the single file you paste into Claude (or any model) to
// get a valid scene.json back.
//
//   node scripts/site/rules-build.mjs      → docs/vawe-rules.md + site/public/vawe-rules.md
//
// GENERATED, never hand-written. A hand-maintained rules file drifts from the engine the moment a
// preset is added, and a rules file that lies is worse than none: the model authors a scene that
// fails validate, and the user blames the product. Everything below is read out of the real source
// of truth, schema.json, PRESETS, EASINGS, PRESENTATIONS, SHADER_FX, themes/, so it cannot drift.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS } from '../../core/type/type.js';
import { EASINGS } from '../../core/motion/motion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const schema = JSON.parse(read('formats/scene/schema.json'));

const F = schema.fields || {};
const layerItem = (F.layers && F.layers.item) || {};
const enumOf = (o) => (o && o.enum) || [];
const LAYER_TYPES = enumOf(layerItem.type);
const CUTS = enumOf((F.cuts && F.cuts.item && F.cuts.item.style) || {});
const STINGS = enumOf((F.stings && F.stings.item && F.stings.item.fx) || {});
const BGS = enumOf((F.bg && F.bg.item && F.bg.item.preset) || {});
const SPLITS = enumOf(layerItem.split);
const PRESET_NAMES = Object.keys(PRESETS);
const EASE_NAMES = Object.keys(EASINGS);
// THEMES THAT SHIP, not themes on this disk. readdirSync counts local working files too: 38 here, 35
// tracked. This file is pasted into a model as the engine's contract, so it must name what a READER of
// the repo can actually use - a theme that exists only on my machine is a promise their clone cannot
// keep. scripts/gates/site-counts.mjs counts the tracked set and was already flagging the mismatch.
const THEMES = execFileSync('git', ['ls-files', 'themes/*.json'], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(Boolean).map((f) => path.basename(f, '.json')).sort();

// the props an author actually reaches for, in the order they think about them
const KEY = ['type', 'text', 'x', 'y', 'w', 'h', 'size', 'weight', 'color', 'align', 'font',
  'split', 'preset', 'presetOpts', 'stagger', 'each', 'start', 'duration', 'anim', 'out',
  'enterDur', 'exitDur', 'pin', 'critical', 'track', 'to', 'unit', 'ease', 'src', 'radius', 'bg', 'border'];
const propRow = (k) => {
  const p = layerItem[k];
  if (!p) return null;
  const t = p.type || (p.enum ? 'string' : '?');
  const lab = (p.label || '').replace(/\|/g, '/').slice(0, 78);
  const en = p.enum ? `. One of: \`${p.enum.join('` `')}\`` : '';
  return `| \`${k}\` | ${t} | ${lab}${en} |`;
};

const md = `# vawe-rules.md: how to write a scene.json

Paste this whole file into Claude (or any model) and ask for a scene. Paste the JSON it returns into
the editor at **/editor** and watch it render live in your browser. Nothing is uploaded; the engine
runs client-side.

> GENERATED from the engine (\`node scripts/site/rules-build.mjs\`). If it is in this file, it is real.

## The one idea

**One self-describing JSON → one video.** \`renderFrame(n)\` is a pure function of the frame number,
so the same JSON always produces byte-identical output. There is no timeline and no editor UI: the
JSON *is* the video.

## Skeleton

\`\`\`json
{
  "module": "scene",
  "aspect": "16:9",
  "theme": "vawe",
  "duration": 6,
  "audio": { "silent": true },
  "layers": [
    {
      "type": "text",
      "text": "Motion graphics <b>from data</b>.",
      "x": 210, "y": 440, "w": 1500, "align": "center",
      "size": 104, "weight": 700, "color": "var(--text)",
      "split": "word", "preset": "up", "stagger": 0.08, "each": 0.5,
      "start": 0.3, "duration": 5.4
    }
  ]
}
\`\`\`

- \`module\` is always \`"scene"\`. \`aspect\` **must be in the JSON** (\`16:9\` · \`9:16\` · \`1:1\` · \`4:5\`).
  A scene that needs a CLI flag to come out right is not reproducible.
- The frame is **1920×1080** at \`16:9\` (1080×1920 at \`9:16\`). All \`x\`/\`y\`/\`size\` are real frame pixels.
- \`start\`/\`duration\` are **seconds**. 30fps.

## Layer types

\`${LAYER_TYPES.join('` · `')}\`

## The props you will actually use

| prop | type | notes |
|---|---|---|
${KEY.map(propRow).filter(Boolean).join('\n')}

## Kinetic presets (${PRESET_NAMES.length})

Set \`split\` (\`${SPLITS.join('` / `')}\`) to break text into units, then \`preset\` to animate them.

\`${PRESET_NAMES.join('` · `')}\`

- \`split:"path"\` + \`preset:"draw"\` makes an **inline SVG stroke draw itself** (logos, icons, chart
  lines). The SVG must be inline in \`text\`, an \`<img>\` has no reachable paths.
- \`presetOpts\` passes per-preset knobs, e.g. \`{"px":30}\` for \`blur\`, \`{"ease":"easeOutQuint"}\` for \`draw\`.

## Easings (${EASE_NAMES.length})

\`${EASE_NAMES.join('` · `')}\`

Entrances decelerate (\`easeOut*\`), exits accelerate (\`rush\`), ambient loops are sinusoidal
(\`easeInOutSine\`). Never \`linear\` on a visible move.

## Cuts (${CUTS.length})

\`"cuts": [{ "t": 3.2, "style": "punch" }]\`, \`${CUTS.join('` · `')}\`

## Shader stings (${STINGS.length})

\`"stings": [{ "t": 3.2, "fx": "flash", "colors": ["#2563eb"], "intensity": 0.5 }]\`

\`${STINGS.join('` · `')}\`

A sting is punctuation: put it **on** a reveal or a cut, never as decoration.

## Backgrounds (${BGS.length})

\`"bg": [{ "t": 0, "preset": "plain" }]\`, \`${BGS.join('` · `')}\`

Use the texture the brand actually has. A flat brand gets \`plain\`. A pattern is a seasoning for one
beat, never the wallpaper.

## Themes (${THEMES.length})

\`${THEMES.join('` · `')}\`

Colours come from the theme, never hardcoded: \`var(--text)\` \`var(--text-2)\` \`var(--dim)\`
\`var(--accent)\` \`var(--surface)\` \`var(--line)\`. \`<b>\` inside \`text\` renders in the accent.

## Hard rules

1. **No em-dashes in on-screen text.** The validator rejects them. Use a comma, a period, or \`·\`.
2. **\`aspect\` goes in the JSON.**
3. **A text layer with \`w\` must set \`align\`**, or it left-aligns inside its box and reads off-centre.
4. **Every colour must clear 4.5:1** against what is behind it. \`make audit\` hard-fails below 3:1.
5. **Text under ~26px is unreadable** at 1080p. Headlines are 90px+.
6. Keep layers inside the safe box: \`x\` 90→1830, \`y\` 60→1020 at 16:9.

## Taste (this is what separates good from generic)

- **Hook → build → payoff.** Never spoil the payoff. Order beats so the most surprising one is last.
- **Every frame fights for its value.** If cutting a beat loses nothing, it was slop.
- **Show, never say.** A word in a box proves nothing. Do not label your effects ("fade", "flash"),
  let them land. Do not open with an eyebrow naming the topic.
- **Never claim on screen what the video does not show.** An unbacked number invites the viewer to
  notice its absence.
- **One hero motion per beat.** Vary the pace: ambient drifts (0.8–1.2s), payoffs snap (0.25–0.35s).
- **Be honest.** Real numbers only.

## Test it

1. Copy the JSON.
2. Open **/editor**, paste, watch it render live.
3. For a real file with sound and grain: \`make video D=scene.json\` (clone the repo).
`;

fs.writeFileSync(path.join(root, 'docs', 'vawe-rules.md'), md);
fs.writeFileSync(path.join(root, 'site', 'public', 'vawe-rules.md'), md);
const kb = (Buffer.byteLength(md) / 1024).toFixed(1);
console.log(`✓ vawe-rules.md  ${kb}KB  ·  ${LAYER_TYPES.length} layer types · ${PRESET_NAMES.length} presets · ${EASE_NAMES.length} easings · ${CUTS.length} cuts · ${STINGS.length} stings · ${THEMES.length} themes`);
console.log('  → docs/vawe-rules.md + site/public/vawe-rules.md');
