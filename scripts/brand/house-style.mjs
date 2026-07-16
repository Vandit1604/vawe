// scripts/house-style.mjs — scaffold a brand's persisted DESIGN READ as declarative markdown, so the
// planning skill reads taste instead of re-deriving it every video (the another engine "house style" pattern).
// Measured facts (faces, palette, motion, dominance) are auto-filled from themes/<name>.json; the
// judgment lines (<…>) are yours to sharpen from the site study. Writes assets/brands/<name>/house-style.md.
//
// Usage: node scripts/house-style.mjs <brand>            (theme = themes/<brand>.json)
//        node scripts/house-style.mjs <brand> <theme>    (explicit theme name)
//        make house-style NAME=<brand> [THEME=<theme>]
import fs from 'node:fs';
import path from 'node:path';

const brand = process.argv[2];
if (!brand) { console.error('usage: node scripts/house-style.mjs <brand> [theme]'); process.exit(2); }
const themeName = process.argv[3] || brand;
const themePath = path.join('themes', themeName + '.json');
if (!fs.existsSync(themePath)) { console.error(`theme not found: ${themePath} (pass a theme name as arg 2)`); process.exit(1); }
const t = JSON.parse(fs.readFileSync(themePath, 'utf8'));
const P = t.type || {}, C = t.palette || {}, M = t.motion || {};

// dominance by the hero background's luminance (the "decide by looking" rule, approximated).
const luma = (h) => { try { let s = String(h).replace('#', ''); if (s.length === 3) s = s.split('').map((c) => c + c).join(''); const n = parseInt(s, 16); return (((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722) / 255; } catch { return 1; } };
const dominance = luma(C.bg) > 0.5 ? 'light-first' : 'dark-first';
const motionFeel = (M.bounce ?? 0) > 0.1 ? 'playful (has bounce)' : (M.settle ?? 0.5) < 0.35 ? 'punchy (snaps, no bounce)' : 'calm (long settle)';

const dir = path.join('assets', 'brands', brand);
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'house-style.md');
const keep = fs.existsSync(out); // don't clobber hand-sharpened judgment on re-run — only refresh a fenced block

const measured = `<!-- MEASURED:START (auto-filled from themes/${themeName}.json — safe to regenerate) -->
- **Dominance:** ${dominance} (bg \`${C.bg}\`, luma ${luma(C.bg).toFixed(2)})
- **Faces:** sans \`${P.sans || '?'}\` · serif \`${P.serif || '?'}\` · mono \`${P.mono || '?'}\`
- **Palette (use ONLY these):** bg \`${C.bg}\` · text \`${C.text}\` · accent \`${C.accent}\` · up \`${C.up}\` · down \`${C.down}\`
- **Motion:** easing \`${M.easing || 'default'}\` · settle ${M.settle ?? '?'} · stagger ${M.stagger ?? '?'} · bounce ${M.bounce ?? '?'} · enter ${M.enter ?? '?'} → ${motionFeel}
<!-- MEASURED:END -->`;

if (keep) {
  const src = fs.readFileSync(out, 'utf8');
  const s = src.indexOf('<!-- MEASURED:START'); const e = src.indexOf('<!-- MEASURED:END -->');
  if (s >= 0 && e >= 0) {
    fs.writeFileSync(out, src.slice(0, s) + measured + src.slice(e + '<!-- MEASURED:END -->'.length));
    console.log(`refreshed measured block in ${out} (kept your judgment lines)`);
    process.exit(0);
  }
}

const body = `# House style — ${brand}

> The persisted **Design Read** for ${brand}. The planning skill reads this FIRST so taste isn't
> re-derived each video and every render stays on-brand. The measured block is auto-filled from
> \`themes/${themeName}.json\` (regenerate with \`make house-style NAME=${brand}\`); the judgment
> lines below are yours to sharpen from the site study (\`make sections\`/\`make lookbook\`).

## Measured facts
${measured}

## Identity
- **References it borrows from:** <2-3 refs, e.g. "Vercel keynote restraint", "Stripe polish">
- **What it refuses to be:** <the anti-references, e.g. "not playful, not gradient-y">
- **The extremes** (2-3 details WRONG for any other brand): <e.g. logos inline in headlines · gray-ink fear section>

## Type
- **Headline:** \`${P.sans || '?'}\` at its measured weight, <tracking> — <personality in a phrase>
- **Rule:** <e.g. one huge hero + a tiny mono caption; scale contrast over decoration>

## Colour
- **Accent usage:** <e.g. ≤10% of the surface, one accent moment per beat>
- **Dominance:** ${dominance} — <confirm by LOOKING at the hero, not just the number>

## Shape & surface
- <e.g. hairline cards (1px), radius 14, NO shadows/elevation — the site is flat and technical>

## Motion
- ${motionFeel} — <e.g. payoffs snap 0.25-0.35s, thesis lines luxurious, whip cuts only same-bg>

## Signature details (what this brand does that nothing else does)
- <detail 1> · <detail 2> · <detail 3>

## Background
- <e.g. plain paper only — the real site is flat, so NO invented dots/shapes/aurora>

## NEVER
- <e.g. gradients · centered heroes · Inter · stock imagery · em-dashes on screen>

## Assets
- logo/marks + \`sections/\` + \`photos/\` under \`assets/brands/${brand}/\`
`;

fs.writeFileSync(out, body);
console.log(`wrote ${out} — fill the <…> judgment lines from the site study.`);
