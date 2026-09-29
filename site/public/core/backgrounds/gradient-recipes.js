// core/gradient-recipes.js: curated colour + kind (+ angle) combos for the `gradient` background
// preset (core/backgrounds.js, gradientFill). Named, not raster: `{"preset":"gradient","opts":
// {"recipe":"warm-dusk"}}` resolves to the entry below. Author-supplied colors/kind/angle/stops in
// `opts` win field by field over whatever a recipe names (see gradientFill). This is the whole
// replacement for the 43MB baked JPG pack the old external gradient asset directory held: text instead
// of pixels, and it renders deterministically at whatever resolution the frame asks for rather than
// one fixed size (generators/media/gradients.mjs is the deprecated baker for that pack).
import { defineRegistry } from '../registry/registry.js';

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

// One line per recipe, in the words a person would search with (make arsenal ranks on this), naming
// the real angle (linear) or centre point (radial/conic) the entry renders at, read off RECIPES above.
const BLURBS = {
  'warm-dusk': 'orange into coral, a sunset ramp on a 40deg diagonal',
  'cool-mint': 'green into teal, a fresh spa ramp on a 135deg diagonal',
  'deep-ocean': 'near-black into slate blue, a moody nautical field on a 160deg diagonal',
  'lavender-fog': 'pale periwinkle into indigo, a dreamy purple wash on a 200deg diagonal',
  'citrus-pop': 'orange into bright yellow, a loud fruit-stand ramp on a 60deg diagonal',
  'berry-crush': 'crimson into tomato red, a hot fruit-punch ramp on a 70deg diagonal',
  'midnight-violet': 'three-stop indigo to plum, a night-sky ramp on a 180deg diagonal',
  'peach-cream': 'pale peach into blush, a soft dessert ramp on a 45deg diagonal',
  'arctic-blue': 'pale ice blue radial, a cold spotlit pool centred at 50% across, 40% down',
  'rose-glow': 'blush pink radial, a warm skin-tone pool centred dead middle at 50%, 50%',
  'emerald-pool': 'teal into jade radial, a jungle-pool glow centred at 40% across, 60% down',
  'solar-flare': 'red-orange-magenta conic ring, a sunburst wheel spinning from a 0deg start angle',
  'spectrum-ring': 'cyan-violet-pink conic wheel, a full-hue rainbow ring spinning from a 0deg start angle',
  'slate-storm': 'charcoal into graphite, a neutral overcast ramp on a 120deg diagonal',
  'neon-dusk': 'hot pink into electric violet, a synthwave ramp on a 50deg diagonal',
  'golden-hour': 'amber into warm yellow, a late-afternoon ramp on a 30deg diagonal',
  'forest-mist': 'teal, jade and pale sky drifting, a MOVING woodland mesh',
  'cosmic-drift': 'indigo, plum and hot pink drifting, a MOVING galaxy mesh',
  'coral-reef': 'salmon into pale pink, a beachy diagonal ramp on a 25deg diagonal',
  'steel-blue': 'slate into charcoal-blue, a cool industrial ramp on a 100deg diagonal',
  'sunset-strip': 'red, magenta and amber drifting slowly, a MOVING three-color sunset mesh',
  'glacier': 'sky blue into pale cyan radial, an icy pool centred at 60% across, 30% down',
  'plum-wine': 'violet into dusty rose, a wine-toned diagonal ramp on an 80deg diagonal',
  'ember': 'crimson, tomato and amber drifting slowly, a MOVING three-color fire mesh',
};

// The plain words a person would search with, folded into retrieval only (core/registry/registry.js
// `aka`, never printed): the recipe NAME already carries the palette, so this carries the colour words
// a person types instead ("sunset", "ocean blue") and the kind a hand-typed gradient would ask for.
const AKA = {
  'warm-dusk': ['sunset gradient', 'orange gradient'],
  'cool-mint': ['mint gradient', 'green teal gradient'],
  'deep-ocean': ['dark blue gradient', 'nautical gradient'],
  'lavender-fog': ['purple wash', 'periwinkle gradient'],
  'citrus-pop': ['yellow orange gradient', 'fruit stand gradient'],
  'berry-crush': ['red gradient', 'punch gradient'],
  'midnight-violet': ['night sky gradient', 'indigo plum gradient'],
  'peach-cream': ['dessert gradient', 'blush gradient'],
  'arctic-blue': ['ice blue radial', 'cold spotlight'],
  'rose-glow': ['pink radial', 'skin tone glow'],
  'emerald-pool': ['jungle green radial', 'teal jade radial'],
  'solar-flare': ['sunburst gradient', 'fire conic ring'],
  'spectrum-ring': ['rainbow ring', 'hue wheel'],
  'slate-storm': ['grey gradient', 'overcast gradient'],
  'neon-dusk': ['synthwave gradient', 'pink violet gradient'],
  'golden-hour': ['amber gradient', 'late afternoon gradient'],
  'forest-mist': ['moving woodland gradient', 'green mesh gradient'],
  'cosmic-drift': ['moving galaxy gradient', 'space mesh gradient'],
  'coral-reef': ['beachy gradient', 'salmon pink gradient'],
  'steel-blue': ['industrial gradient', 'charcoal blue gradient'],
  'sunset-strip': ['moving sunset gradient', 'red amber mesh'],
  glacier: ['icy radial', 'cold blue radial'],
  'plum-wine': ['wine gradient', 'violet rose gradient'],
  ember: ['moving fire gradient', 'crimson amber mesh'],
};

export const GRADIENT_RECIPE_REGISTRY = defineRegistry('gradient recipe', RECIPES, {
  slot: 'bg[].opts.recipe',
  blurbs: BLURBS,
  aka: AKA,
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
