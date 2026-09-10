// screen-new.mjs: `make screen-new NAME=<film>-<screen> KIND=editor|grid|dashboard|chat|card [THEME=<name>]`
//
// Writes a STARTING fragment that is already video-ready, never a grey box. The owner's ruling this
// answers: "use a ui design harness to build beautiful mocks, not plain by default" (docs/CRAFT/SCREENS.md).
// A product screen in a film is designed FOR THE VIDEO: display-size type (a scale for 1920x1080 video,
// AGENTS.md stage 4), a layout that fills most of the frame, real image slots (never a placeholder
// colour box), theme tokens only, one accent.
//
// Kinds are grounded in what a screen that shows well on camera actually looks like (madera's grammar,
// docs/CRAFT/RECREATION.md): an agent chat/editor with a typed prompt, a product results grid of
// photos, a swipe card with one photo, a dashboard stat panel.
//
//   node harness/author/screen-new.mjs <name> <kind> [--theme name] [--invent]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { buildKit } from '../lib/stagekit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const [name, kind] = pos;
const KINDS = ['editor', 'grid', 'dashboard', 'chat', 'card'];
if (!name || !KINDS.includes(kind)) {
  console.error(`usage: node harness/author/screen-new.mjs <name> <${KINDS.join('|')}> [--theme name] [--invent]`);
  process.exit(1);
}
const themeName = flag('--theme', 'default');
const invent = argv.includes('--invent');
let themeFile = path.join(ROOT, 'themes', `${themeName}.json`);
if (!fs.existsSync(themeFile)) {
  if (!invent) {
    console.error(`screen-new: no theme "${themeName}", themes/${themeName}.json does not exist. Pass --theme <real name>, or --invent to seed a new one.`);
    process.exit(1);
  }
  // Owner ruling (content-richness.plan.md, Update 1): a prompt with no brand and no reference means
  // INVENT a beautiful theme, through impeccable's own palette seed, never a default grey.
  //
  // palette.mjs prints a seed colour + mood in prose, deliberately: composing the other five roles is
  // a judgment call against the brief, not a mechanical fill (see its own header comment). So this
  // prints the seed and stops here, rather than fabricating a full theme from a hue nobody chose. The
  // caller (an agent, or a person) composes themes/<name>-invented.json by hand from the printed
  // guidance, then re-runs this command with --theme <name>-invented once it exists.
  const { spawnSync } = await import('node:child_process');
  const invented = path.join(ROOT, 'themes', `${name}-invented.json`);
  const r = spawnSync('node', [path.join(ROOT, 'skills/impeccable/scripts/palette.mjs'), '--from', name], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout) { console.error(`screen-new: --invent palette seed failed: ${r.stderr || 'no output'}`); process.exit(1); }
  console.log(r.stdout);
  console.log(`screen-new: compose ${path.relative(ROOT, invented)} from the seed above, in the theme contract shape`
    + ` (validate: node core/registry/theme-contract.test.mjs), then re-run with --theme ${name}-invented.`);
  process.exit(0);
}
const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
const { css, block } = buildKit(theme, resolveLook, isLightBg);

const outHtml = path.join(ROOT, 'formats/scene', `${name}.html`);
const outCss = path.join(ROOT, 'formats/scene', `${name}.kit.css`);
if (fs.existsSync(outHtml)) { console.error(`screen-new: ${outHtml} already exists, not overwriting.`); process.exit(1); }
fs.writeFileSync(outCss, css + '\n');

// One shared shell: full-bleed 1920x1080, the kit's own ground and stage margins so a screen never
// touches a raw edge. Each kind fills it with a DIFFERENT signature layout, never the same card grid
// dressed in new copy (interface-design: "a signature element that could only exist for THIS product").
const BODIES = {
  // an agent chat/editor: the typed prompt IS the product, so it is the one focal element, large,
  // vertically centred, with a quiet chrome dock below it (never a full toolbar mock, that is decoration).
  editor: () => `<div class="kit-root kit-ground-ink" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:flex;flex-direction:column;justify-content:center;gap:var(--kit-space-5)">
    <p class="kit-eyebrow" style="color:var(--dim)">PROMPT</p>
    <p class="kit-hook" style="max-width:88%">Make a 12 second launch film</p>
    <div class="kit-row" style="display:flex;align-items:center;gap:var(--kit-space-3);margin-top:var(--kit-space-4)">
      <div class="kit-chip" style="background:var(--accent);color:#fff">Render</div>
      <p class="kit-caption">draft &middot; 12s &middot; 16:9</p>
    </div>
  </div>
</div>`,
  // a product results grid: photos, not swatches. One tile leads, five follow, asymmetric per
  // AGENTS.md's "asymmetry and scale contrast are defaults".
  grid: () => `<div class="kit-root" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:grid;grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:var(--kit-space-3);padding:var(--kit-space-4) 0">
    <div class="kit-card" style="grid-row:span 2;overflow:hidden;position:relative"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:cover;display:block"></div>
    <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:cover;display:block"></div>
    <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:cover;display:block"></div>
    <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:cover;display:block"></div>
    <div class="kit-card" style="overflow:hidden"><img src="<fill: image path>" style="width:100%;height:100%;object-fit:cover;display:block"></div>
  </div>
</div>`,
  dashboard: () => `<div class="kit-root" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:grid;grid-template-columns:2fr 1fr;gap:var(--kit-space-4);padding:var(--kit-space-5) 0">
    <div class="kit-card" style="padding:var(--kit-space-5);display:flex;flex-direction:column;justify-content:center">
      <p class="kit-eyebrow">THIS WEEK</p>
      <p class="kit-stat">1,204</p>
      <p class="kit-body">renders shipped</p>
    </div>
    <div class="kit-panel" style="padding:var(--kit-space-4);display:flex;flex-direction:column;gap:var(--kit-space-3);justify-content:center">
      <p class="kit-caption">queue</p>
      <p class="kit-headline">6</p>
    </div>
  </div>
</div>`,
  chat: () => `<div class="kit-root kit-ground-ink" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:flex;flex-direction:column;justify-content:flex-end;gap:var(--kit-space-3);padding-bottom:var(--kit-space-5)">
    <div class="kit-card" style="align-self:flex-end;max-width:70%;padding:var(--kit-space-3) var(--kit-space-4)"><p class="kit-body" style="color:var(--text)">Ship it.</p></div>
    <div class="kit-panel" style="max-width:80%;padding:var(--kit-space-4)"><p class="kit-body">Done. Your film is rendering now.</p></div>
  </div>
</div>`,
  card: () => `<div class="kit-root" style="position:absolute;inset:0">
  <div class="kit-stage" style="display:flex;align-items:center;justify-content:center">
    <div class="kit-card kit-elev-3" style="width:60%;aspect-ratio:4/5;overflow:hidden;position:relative">
      <img src="<fill: image path>" style="width:100%;height:100%;object-fit:cover;display:block">
    </div>
  </div>
</div>`,
};

const html = `${block}\n${BODIES[kind]()}\n`;
fs.writeFileSync(outHtml, html);
console.log(`✓ ${path.relative(ROOT, outHtml)} (${kind}, theme ${themeName})`);
console.log(`  fill the <fill: image path> markers with a real served path, then:  make screen F=${path.relative(ROOT, outHtml)} THEME=${themeName}`);
