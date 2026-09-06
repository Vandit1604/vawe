// core/gradient-recipes.js: curated colour + kind (+ angle) combos for the `gradient` background
// preset (core/backgrounds.js, gradientFill). Named, not raster: `{"preset":"gradient","opts":
// {"recipe":"warm-dusk"}}` resolves to the entry below. Author-supplied colors/kind/angle/stops in
// `opts` win field by field over whatever a recipe names (see gradientFill). This is the whole
// replacement for the 43MB baked JPG pack the old external gradient asset directory held: text instead
// of pixels, and it renders deterministically at whatever resolution the frame asks for rather than
// one fixed size (scripts/media/gradients.mjs is the deprecated baker for that pack).
import { defineRegistry } from '../registry.js';

const RECIPES = {
  'warm-dusk': { kind: 'linear', colors: ['#ff9966', '#ff5e62'], angle: 40 },
  'cool-mint': { kind: 'linear', colors: ['#0ba360', '#3cba92'], angle: 135 },
  'deep-ocean': { kind: 'linear', colors: ['#0f2027', '#2c5364'], angle: 160 },
  'lavender-fog': { kind: 'linear', colors: ['#a8c0ff', '#3f2b96'], angle: 200 },
  'citrus-pop': { kind: 'linear', colors: ['#f7971e', '#ffd200'], angle: 60 },
  'berry-crush': { kind: 'linear', colors: ['#eb3349', '#f45c43'], angle: 70 },
  'midnight-violet': { kind: 'linear', colors: ['#0f0c29', '#302b63', '#24243e'], angle: 180 },
  'peach-cream': { kind: 'linear', colors: ['#ffecd2', '#fcb69f'], angle: 45 },
  'arctic-blue': { kind: 'radial', colors: ['#e0eafc', '#cfdef3'], cx: 0.5, cy: 0.4 },
  'rose-glow': { kind: 'radial', colors: ['#ffdde1', '#ee9ca7'], cx: 0.5, cy: 0.5 },
  'emerald-pool': { kind: 'radial', colors: ['#134e5e', '#71b280'], cx: 0.4, cy: 0.6 },
  'solar-flare': { kind: 'conic', colors: ['#ff512f', '#dd2476', '#ff512f'], angle: 0, cx: 0.5, cy: 0.5 },
  'spectrum-ring': { kind: 'conic', colors: ['#12c2e9', '#c471ed', '#f64f59', '#12c2e9'], angle: 0 },
  'slate-storm': { kind: 'linear', colors: ['#232526', '#414345'], angle: 120 },
  'neon-dusk': { kind: 'linear', colors: ['#ff6ec4', '#7873f5'], angle: 50 },
  'golden-hour': { kind: 'linear', colors: ['#f2994a', '#f2c94c'], angle: 30 },
  'forest-mist': { kind: 'mesh', colors: ['#134e5e', '#71b280', '#e0eafc'] },
  'cosmic-drift': { kind: 'mesh', colors: ['#0f0c29', '#302b63', '#24243e', '#ff6ec4'] },
  'coral-reef': { kind: 'linear', colors: ['#ff9a9e', '#fecfef'], angle: 25 },
  'steel-blue': { kind: 'linear', colors: ['#485563', '#29323c'], angle: 100 },
  'sunset-strip': { kind: 'mesh', colors: ['#ff512f', '#dd2476', '#f7971e'] },
  'glacier': { kind: 'radial', colors: ['#83a4d4', '#b6fbff'], cx: 0.6, cy: 0.3 },
  'plum-wine': { kind: 'linear', colors: ['#654ea3', '#eaafc8'], angle: 80 },
  'ember': { kind: 'mesh', colors: ['#eb3349', '#f45c43', '#f7971e'] },
};

// One line per recipe, in the words a person would search with (make arsenal ranks on this).
const BLURBS = {
  'warm-dusk': 'orange into coral, a sunset ramp on a 40deg diagonal',
  'cool-mint': 'green into teal, a fresh spa ramp',
  'deep-ocean': 'near-black into slate blue, a moody nautical field',
  'lavender-fog': 'pale periwinkle into indigo, a dreamy purple wash',
  'citrus-pop': 'orange into bright yellow, a loud fruit-stand ramp',
  'berry-crush': 'crimson into tomato red, a hot fruit-punch ramp',
  'midnight-violet': 'three-stop indigo to plum, a night-sky ramp',
  'peach-cream': 'pale peach into blush, a soft dessert ramp',
  'arctic-blue': 'pale ice blue radial, a cold spotlit pool',
  'rose-glow': 'blush pink radial, a warm skin-tone pool',
  'emerald-pool': 'teal into jade radial, a jungle-pool glow',
  'solar-flare': 'red-orange-magenta conic ring, a sunburst wheel',
  'spectrum-ring': 'cyan-violet-pink conic wheel, a full-hue rainbow ring',
  'slate-storm': 'charcoal into graphite, a neutral overcast ramp',
  'neon-dusk': 'hot pink into electric violet, a synthwave ramp',
  'golden-hour': 'amber into warm yellow, a late-afternoon ramp',
  'forest-mist': 'teal, jade and pale sky drifting, a MOVING woodland mesh',
  'cosmic-drift': 'indigo, plum and hot pink drifting, a MOVING galaxy mesh',
  'coral-reef': 'salmon into pale pink, a beachy diagonal ramp',
  'steel-blue': 'slate into charcoal-blue, a cool industrial ramp',
  'sunset-strip': 'red, magenta and amber drifting, a MOVING sunset mesh',
  'glacier': 'sky blue into pale cyan radial, an icy pool',
  'plum-wine': 'violet into dusty rose, a wine-toned diagonal ramp',
  'ember': 'crimson, tomato and amber drifting, a MOVING fire mesh',
};

export const GRADIENT_RECIPE_REGISTRY = defineRegistry('gradient recipe', RECIPES, {
  slot: 'bg[].opts.recipe',
  blurbs: BLURBS,
  catalog: {
    title: 'Gradient recipes',
    tag: 'background',
    intro: 'named colour+kind(+angle) combos for the `gradient` background preset: '
      + '`{"preset":"gradient","opts":{"recipe":"NAME"}}`. Author colors/kind/angle in `opts` override a recipe field by field.',
    usage: (n, { j }) => j({ bg: [{ preset: 'gradient', opts: { recipe: n } }] }),
    preview: (n, { base, HERO }) => base({ bg: [{ preset: 'gradient', opts: { recipe: n } }], layers: [{ ...HERO, text: n, size: 90 }] }),
  },
});

export const GRADIENT_RECIPES = RECIPES;
