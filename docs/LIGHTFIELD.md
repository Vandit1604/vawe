---
when: "you need a light-field backdrop, or want to recolour or re-pattern one"
answers: "the lightfield generator: the four dials (colour · shadow · pattern · motion), the seed, and how close the reference reproduction gets"
group: look
title: Lightfield
what: A generator for light-field backdrops. Four dials, one seed, one HTML string.
---

# Lightfield

`formats/scene/_lightfall.html` is a good backdrop and a dead end. Every colour in it is typed by
hand, so a second one in another palette means editing 58 lines of baked CSS. This is the same
backdrop as a function.

```js
import { lightfield } from './core/lightfield/index.js';

const html = lightfield({
  seed: 1950907,
  colour: { bloom: '#ee7c56', mid: '#c22d45', deep: '#851b08', ground: '#000202' },
  shadow: { depth: 0, softness: 0.5, direction: 'right', seam: 0.5, sheen: 0.35 },
  pattern: { kind: 'slats', count: 88, jitter: 0.55 },
  motion: { kind: 'shimmer', speed: 1, amount: 1 },
});
```

It returns a self-contained fragment: one `<style>`, one `<div>`. It knows nothing about scenes,
layers or the renderer, so the caller decides what it is. Drop it in a `bg` window or an `html`
layer:

```json
{ "bg": { "html": "<style>…</style><div class=\"lf…\">…</div>" } }
```

Every option has a default, and the defaults reproduce the reference image.

## The four dials

### colour

Four stops, six-digit hex, nothing else. Read them from the light outwards.

| key | what it is |
|---|---|
| `bloom` | the hot core. It appears as three lobes of falling size, not one blob, because one blob is a spotlight and three are light that came from somewhere. |
| `mid` | the second colour, set away from the bloom. This is what stops the field being one hue. |
| `deep` | the saturated body the light sits in. |
| `ground` | what the light falls away into. Usually near black. |
| `extra` | an optional ordered list of up to four more colours, laid over the roles in the order given. Empty by default. The four roles are the whole API for a simple field; this is for a colour none of them can name. |

The reference needs `extra`. It carries a dark magenta lane between two orange lobes and a cold blue
corner, and neither of those is a bloom, a mid, a deep or a ground. Naming them as roles would have
meant inventing two roles that mean nothing on any other palette, so they go in a list.

### shadow

How the light falls off. This is the mood dial: one palette and one pattern read as dawn or as a
cellar depending on it.

| key | range | what it does |
|---|---|---|
| `depth` | 0 to 1 | how dark the far side goes. `0` emits no shadow layer at all, and that is what the reference wants: its colour field already drains to the ground, and a second fall on top measured worse. |
| `softness` | 0 to 1 | how long it takes to get there. `0` is an edge you can point at, `1` crosses the whole frame. |
| `direction` | `left` `right` `top` `bottom` `center` and the four corners | which way "away" is. The corners are there because light rarely leaves along an axis: a frame that darkens down and right at once is ordinary, and no edge keyword can say it. |
| `seam` | 0 to 1 | the dark line BETWEEN elements. It multiplies, so a seam gets darker without getting greyer. |
| `sheen` | 0 to 1 | the light ON an element's face. It dodges, so a face gets brighter without going white, and black stays black. |

`seam` and `sheen` are two dials because they are two jobs. There used to be one, `relief`, and it
could not raise the seams without dimming the whole picture, which is how the first pass came out
brown and soft at the same time. `relief` is gone: passing it throws, which is the contract working.

### pattern

The structure of the field. Three of them, and they are three shapes rather than one shape recoloured.

| kind | what it is | the eye |
|---|---|---|
| `slats` | a backlit blind: vertical bars of unequal width, each with a lit leading edge falling to a dark trailing edge | travels across |
| `rings` | concentric bands round a point, like light on water | travels outwards |
| `shards` | a fan of rays from a pivot below the frame | travels up and out |

`count` is how many elements, `jitter` how unequal they are. `jitter: 0` is a ruler, `1` is a thicket.

A pattern never touches colour. It never sees a hex. It asks for `dark` or `lit` and the generator
decides what those mean, which is why any pattern works on any palette.

Both are neutral grey and both blend multiplicatively, and that is the whole reason the field keeps
its colour. `multiply` scales every channel DOWN by one factor; `color-dodge` scales every channel
UP by one factor. One factor per pixel leaves the ratios between R, G and B untouched, so chroma
survives and rises on the lit faces. One `overlay` layer doing both jobs is what turned a crimson
field brown: overlay pulls a mid-tone towards white on one side and towards grey on the other, and
it cannot be asked to stop. `plus-lighter` was tried too and is worse in a different way: it ADDS,
so it lit up the reference's black right-hand side with bars that should not be there. Dodge leaves
black alone, because zero divided by anything is still zero.

### motion

How the field lives against `var(--t)`, the frame clock in seconds.

| kind | what moves |
|---|---|
| `still` | nothing. The output reads no clock at all. |
| `drift` | the field travels as one body. Cells hold station against each other. |
| `breathe` | cells brighten and dim in place. Nothing moves, so it never reads as a scroll. |
| `shimmer` | cells slide against each other. Seams open and close. |

`speed` is roughly cycles against the clock, `amount` scales the size of the move. Either at `0` is
as still as `still`.

**No CSS `@keyframes`, ever.** `core/tokens.css` kills `animation` with `!important` because the
renderer seeks frames instead of playing them. A keyframe here would render one frozen frame and warn
nobody. Every moving value is a `calc()` over `var(--t)` instead.

### seed

An integer. The same seed and the same options give byte-identical output, on any machine, forever.
The seed is not decoration, it is the search space: it places the bloom cluster, the widths, the
phases. Changing it is how you get another field in the same taste.

## Fail early

An unknown key, an out-of-range number or a malformed colour throws, and the message names the key,
what it got, and what it would have accepted.

```
lightfield: unknown option pattern.knd. Valid keys here: "kind", "count", "jitter".
lightfield: colour.bloom must be a 6-digit hex colour like "#ee7c56". Got "orange".
lightfield: shadow.depth must be between 0 and 1. Got 1.4.
```

Nothing is ever silently dropped or silently replaced. A generator that quietly ignores `patern:`
hands you a field you did not ask for and no way to find out why, and silent substitution is the
most-logged bug class in this repo.

## The commands

```bash
make lightfield                                  # build the three committed fields + shoot each
make lightfield PRESET=tide                      # one preset
make lightfield ARGS='--seed 91 --pattern.kind shards --bloom "#ffd166" --out /tmp/f.html --shot'

node scripts/author/lightfield-test.mjs                  # determinism + fail-early, as assertions
node scripts/author/lightfield-compare.mjs A.jpg B.png   # measured fidelity, not an opinion
node scripts/author/lightfield-seeds.mjs ref.jpg 4000000  # rank millions of layouts, arithmetically
SEEDLIST=<its output> node scripts/author/lightfield-fit.mjs ref.jpg   # confirm the shortlist for real
```

Every flag is derived from the option table, so the CLI cannot drift from the generator. Group keys
are dotted (`--pattern.kind`, `--motion.speed`); a leaf name on its own works when it is unambiguous
(`--bloom`, `--seam`, `--count`), and `--kind` is rejected because two groups have one.

`lightfield-shot.mjs` exists because `make preview` centres a fragment in a 1400px box, which is the
wrong page for a full-bleed field: the field is `position:absolute;inset:0` and needs a sized parent.

## The committed fields

| file | palette | pattern | shadow |
|---|---|---|---|
| `formats/scene/_lightfield-ref.html` | orange, magenta, red, black | slats | none: the field carries its own fall |
| `formats/scene/_lightfield-tide.html` | ice blue, steel, navy, black | rings | soft, from below |
| `formats/scene/_lightfield-fern.html` | acid green, jade, forest, black | shards | hard, centred |

Their option sets are in `core/lightfield/presets.js`, and each one is a worked example of
the API. Nothing about them is special-cased inside the generator: a preset is only an argument.

## Files

| file | what it holds |
|---|---|
| `core/lightfield/index.js` | the generator, the colour field, the shadow, the motion |
| `core/lightfield/options.js` | the option table. The only place that decides what is valid |
| `core/lightfield/patterns.js` | the three structures. Knows nothing about colour |
| `core/lightfield/colour.js` | hex parsing and mixing |
| `core/lightfield/rng.js` | the seeded generator. Never swap this for `Math.random` |

## How close it gets, and where it stops

Measured against `refs/lightfield-ref.jpg`, at 735x420, `node scripts/author/lightfield-compare.mjs`:

| metric | first pass | after fitting |
|---|---|---|
| block grid, mean absolute difference per channel | 34.24 (13.4%) | **18.19 (7.1%)** |
| mean luma, reference 48.6 | 31.5 (-17.1) | **51.6 (+3.0)** |
| four sampled colours, mean distance | 31.6 | **25.4** |

Three things it does not reach, and why:

1. **Chroma in the mid-tones.** The reference holds a crimson through the fall from orange to dark
   red. Compositing four fixed hex stops walks that ramp towards brown, so mean green comes out 7.9
   high. Interpolating `in oklab` recovered a little. Reaching the rest needs more stops than four,
   which would cost the thing the four stops are for.
2. **Slat contrast.** The reference's bars cut harder than an `overlay` pattern reproduces. Raising
   `relief` to match darkens the bloom faster than it sharpens the seams, so the measured error goes
   up. The dial is right; the ceiling is the blend.
3. **The exact lobe arrangement.** The layout is five ellipses placed by one seed. Four million
   layouts were ranked and the best modelled error plateaued near 18, so the gap is the vocabulary,
   not the search. A sixth blob would close some of it and make the seed harder to reason about.

## Turning the dials without a render

The generator is on the site at **`/playground`**. Every control there is built from `SCHEMA` in
`core/lightfield/options.js`, so what you can turn is exactly what the generator accepts, and an
option it refuses says so on the page instead of quietly doing nothing.

It opens on `ref` rather than on the schema's raw defaults. A `def` is the neutral value of one
field, which is not the same as a considered result: the fitted `ref` differs from the defaults on
three colour stops.

Copy the options straight into a scene, copy the HTML, or copy a link that carries only what you
changed. To add another generator to that page, export a `SCHEMA` and a render function and add a
row to `core/generators.js`. The page reads the registry; there is no list to keep on the site.
