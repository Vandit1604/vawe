---
when: "you need a light-field backdrop, or want to recolour or re-pattern one"
answers: "the lightfield generator: the five dials (colour · pattern · envelope · shadow · motion), polarity, the seed, and how close each reference reproduction gets"
group: look
title: Lightfield
what: A generator for light-field backdrops. Five dials, one seed, one HTML string.
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

## The five dials

### colour

Four stops, six-digit hex, nothing else. Read them from the light outwards.

| key | what it is |
|---|---|
| `bloom` | the hot core. It appears as a cluster of lobes of falling size, not one blob, because one blob is a spotlight and a cluster is light that came from somewhere. |
| `lobes` | 1 to 12: how many lobes that cluster has. The cluster keeps the same total area whatever you set, so this decides how the light is DIVIDED and never how much of it there is. |
| `evenness` | 0 to 1: how evenly those lobes are spread across the width. `0` draws each one anywhere, which clumps; `1` gives each its own band of the frame. |
| `mid` | the second colour, set away from the bloom. This is what stops the field being one hue. |
| `deep` | the saturated body the light sits in. |
| `ground` | what the light falls away into. Usually near black. |
| `shade` | AMBIENT FILL: the colour a shadow goes, screened under the pattern. `#000000` is the exact no-op and emits no layer. |
| `through` | the light that comes THROUGH the pattern rather than off it, screened on the lit faces only. It is what keeps a blind visible where the field behind it has gone black. `#000000` is the exact no-op. |
| `spread` | 0 to 1: how far a lobe of light reaches before it dies. `0` is the tight ramp fitted to the first reference; `1` melts the lobes into one mass. |
| `vivid` | how much the finished field is saturated. `1` leaves it alone. |
| `originX` / `originY` | WHERE THE LIGHT IS, as a percentage across and down the frame. It moves the bloom cluster and the mid with it, rigidly, and leaves `deep` alone. Off-frame values are legal and useful. |
| `extra` | an optional ordered list of up to four more colours, laid over the roles in the order given. Empty by default. The four roles are the whole API for a simple field; this is for a colour none of them can name. |

#### `shade`, and why `ground` could not do its job

Real photographs have warm light and cool shadows, because the key light is warm and a faint cold
skylight fills everything it does not reach. A field lit by one hue cannot do that: a shadow in it is
only less of the same hue, so it comes out warm.

That is not a theory, it is the bug the reference reproduction shipped with. It scored a mean sample
distance of 12.7 and a human looked at it and said no. All four sample points were in lit areas. The
reference's shadows are `rgb(0,2,11)` navy on the right and `rgb(23,12,35)` violet in the dark lower
left; the render's were `rgb(11,4,4)` and `rgb(83,5,12)`, both warm. No number the tool printed could
see it.

The obvious fix does not work, and the measurement is the argument. `ground` is not only the backdrop,
it is the far stop of the body gradient, mixed with `deep` at 35% and 70% across the frame:

| `ground` | shadow band, r-b error | shadow band dE | brightest mid cell, r-b |
|---|---|---|---|
| `#000202` (warm, as shipped) | **+14.8** | 28.0 | 133 → 133 |
| `#12082a` (violet) | -2.6 | **42.2** | 133 → **55** |

The temperature comes right and the picture falls apart, because a violet ground drags the lit body
violet with it. `shade` is a separate role for a separate job. It SCREENS, which lifts black to
exactly that colour and leaves white exactly white, and it sits above the colour field and below the
pattern, because fill is light and the blind occludes it like any other light.

It is a trade and no number picks the setting: every step darker buys about 4 units of shadow warmth
and spends about 3.5 in the highlights. The judgement in `ref` is that they are not equally visible.
Eight units of r-b in a near-black region is the difference between a brown black and a blue black;
eight units on a highlight of 127 is under 6% and nothing looks different.

#### `through`, and a blind that stops existing in the dark

`sheen` is COLOR-DODGE. It SCALES what is behind an element, and 1.5 times black is black, so
wherever the colour field has drained away the pattern disappears with it. Real backlit blinds do not
do that: some light passes through them everywhere, usually a cooler light than the one making the
bloom, so the slats stay visible against a dark wall.

The reference says so plainly. In the darkest third of `refs/lightfield-ref.jpg` the striping is
STRONGER than in the frame as a whole, and the render's is less than half its own frame average:

| | frame edge | frame swing | dark third: luma | edge | swing |
|---|---|---|---|---|---|
| `refs/lightfield-ref.jpg` | 3.26 | 10.70 | 27.1 | **4.22** | **14.52** |
| render, `through` off | 2.15 | 7.13 | 29.7 | **1.60** | **5.35** |
| render, `through` `#3a3a4c` | 3.40 | 11.10 | 38.7 | 3.06 | 9.86 |

**No existing dial reaches it**, which is why this is a role rather than a preset value. `shade` is
the obvious candidate and fails by construction: it screens the faces and the gaps between them
equally, so brightening it took the dark third's mean luma from 29.7 to 49.6 while the swing moved
only from 5.35 to 6.67. It floods the dark long before the bars arrive.

It SCREENS rather than adding. Plus-lighter matched the reference's striping exactly and cost 3.4
points of block error doing it, because it brightens the lit half of the picture by as much as the
dark half. Screen lifts black to the colour and leaves white alone, which is what light landing on a
surface already brighter than itself looks like.

It is not free on this reference. Every setting that improves the striping also lifts a region the
reference keeps darker than the render already has it, so the mean block error rises: `#181820` costs
1.4 points, `#3a3a4c` costs 4.2. The `ref` preset therefore leaves it off, and the striping gap is
recorded rather than paid for. Looks whose elements have no face (`colonnade`, `sheen: 0`) have
almost nothing for it to draw, and it moves their score by 0.05.

#### `originX` / `originY`, and a layout that was fitted to one photograph

The blob layout under the palette was fitted to `refs/lightfield-ref.jpg` and then imposed on every
field after it: the bloom cluster high, the mid below it, the deep body against the left edge,
whatever palette you hand it. So a generator advertised as general could only ever light a picture
from the top. `refs/ref-a.jpg` is lit from off the bottom-right corner and was unreachable by any
seed: four million layouts were searched and none of them existed, because the search was over jitter
inside a fixed frame rather than over the frame.

The pair moves the light and NOT `deep`, because `deep` is the body the light sits in rather than
part of the light. The defaults are the centres of the fitted ranges, so they shift nothing.

#### `spread`, and a constant that was fitted to one photograph

The bloom is three lobes, and how fast a lobe fades used to be a constant: hold 0.85 out to 30%,
finish by 80%. That was measured against `refs/lightfield-ref.jpg`, which really does have lobes with
edges you can point at, and on that image the tight ramp beat a gentle one.

On any reference whose light is one broad mass it draws three hard ellipses that no palette can hide.
It was the single thing standing between this generator and both of the other two references, and in
each case it showed up as circles nobody asked for. `spread` 0 is that constant exactly, so the field
it was chosen for does not move.

The reference needs `extra`. It carries a dark magenta lane between two orange lobes and a cold blue
corner, and neither of those is a bloom, a mid, a deep or a ground. Naming them as roles would have
meant inventing two roles that mean nothing on any other palette, so they go in a list.

#### `lobes` and `evenness`, the same class of bug one level deeper

`spread` was a constant fitted to one photograph. So was the number of lobes, and so was where they
were allowed to sit. Both were written into an array literal: exactly three blobs, each drawn at a
random x anywhere between 8% and 92% of the width.

Three large blobs can only ever make one soft mass, and independent draws are lumpy however many of
them there are. The two failures those two constants caused are visible in two different references:

* `refs/lightfield-ref.jpg` is a flowing field with several colour regions, and the render was one
  soft lobe that reads as a spotlight on a curtain. That is the COUNT.
* `refs/ref-b.png` has a horizontal profile that is flat from a quarter of the way across to three
  quarters, and the render dipped in the middle, because three independently placed lobes overlapped
  into two humps. That is the PLACEMENT, and adding lobes at random positions only moved the dips.

`lobes` is scaled so the cluster covers the same total area at any count: nine lobes are nine smaller
lobes, never nine times the light, so the dial cannot be used to brighten a field by accident.
`evenness` hands each lobe its own band of the width, from the middle outwards so the largest lobe
takes the centre and the smaller ones fall away to the edges. Handing bands out left to right instead
would ramp the lobe size across the frame and tilt every field to one side.

`lobes` 3 with `evenness` 0 is the fitted cluster exactly, down to the byte.

### shadow

How the light falls off. This is the mood dial: one palette and one pattern read as dawn or as a
cellar depending on it.

| key | range | what it does |
|---|---|---|
| `depth` | 0 to 1 | how dark the far side goes. `0` emits no shadow layer at all, and that is what the reference wants: its colour field already drains to the ground, and a second fall on top measured worse. |
| `softness` | 0 to 1 | how long it takes to get there. `0` is an edge you can point at, `1` crosses the whole frame. |
| `direction` | `left` `right` `top` `bottom` `center` `top-and-bottom` `left-and-right` and the four corners | which way "away" is. The corners are there because light rarely leaves along an axis. The two paired names are a lit BAND: away along one axis and not at all along the other, which `center` cannot say because a radial fall darkens every edge at once. |
| `originX` / `originY` | -50 to 150 | WHERE THE SHADOW IS, as a percentage across and down the frame. `50`/`50` is unmoved. `direction` is a BEARING and this is a PLACE; you need both. |
| `seam` | **-1 to 1** | the line BETWEEN elements. The SIGN is the polarity: positive multiplies (a dark seam), negative dodges (a bright one). `0` emits no seam at all. |
| `seamWidth` | 0 to 1 | how wide that line is, as a fraction of the element it trails. `slats` only. |
| `peak` | 0 to 100 | where the light lands across a lit face, as a percentage from its leading edge. `slats` only. |
| `sheen` | **-1 to 1** | the element's face. Positive dodges (a lit surface), negative multiplies (a silhouette). `0` emits no face at all. |
| `light` | `reflected` `emitted` | what the lit half of the pattern IS: a surface catching light, or a source making it. |

`seam` and `sheen` are two dials because they are two jobs. There used to be one, `relief`, and it
could not raise the seams without dimming the whole picture, which is how the first pass came out
brown and soft at the same time. `relief` is gone: passing it throws, which is the contract working.

#### One spelling for "where", on all three things

The light could be put anywhere in the frame and the shadow could not. `colour.originX/originY` moved
the bloom cluster; `shadow.direction` said only which WAY the dark lay, never how far off centre it
sat; and the silhouette had no position at all, so an author reached for `envelope.kind` and picked a
shape because it happened to peak in the right place. That is choosing a shape for the wrong reason.

Three things now answer the question the same way, in the same units, under the same name:

| dial | places |
|---|---|
| `colour.originX` / `colour.originY` | the LIGHT: the bloom cluster and the mid, rigidly, leaving `deep` alone |
| `shadow.originX` / `shadow.originY` | the DARK: the fall, and the vignette under it |
| `envelope.originX` / `envelope.originY` | the MASS: the silhouette, across the frame and down it |

Percent of the frame in every case, off-frame values legal in every case, and the default in every
case is exactly the unmoved position, so nothing written before they existed moves by a pixel.

What `shadow.origin` reaches depends on the SHAPE `direction` names, and that is a property of the
shapes rather than a limit of the dial:

* `center` is a radial, so the whole vector lands on its centre.
* `top-and-bottom` and `left-and-right` are a lit band with dark at both ends, so placing the dark is
  placing the band: the move along the fall's own axis slides it, and the other axis has nothing to do.
* The eight bearings are a linear gradient, which has a direction and no centre. Only the component
  ALONG the fall can reach it, where it makes the darkness begin earlier or later. The component at
  right angles moves the vignette underneath, which is the radial half of that shape.

`envelope.originY` always moves the silhouette's free edge DOWN the frame as it rises, whichever edge
`anchor` holds, so the dial means one thing from either side.

#### Polarity

Both contrast dials are signed, and the two signs together are what make one structure reach opposite
pictures:

| `seam` | `sheen` | what you get |
|---|---|---|
| `+` | `+` | a backlit blind: lit faces cut by dark seams (`ref`) |
| `0` | `-` | silhouettes on a lit field, nothing between them |
| `-` | `+` | flames: emitted spikes, each with a hot line up its trailing edge (`ember`) |
| `-` | `0` | panels against a bright sky, with the mass carried by the field (`colonnade`) |

#### `light`: reflected or emitted

`reflected` is COLOR-DODGE, and it is right for a blind, a colonnade and a wall: it scales what is
under an element up by one factor, so black stays black and light that is not behind the blind cannot
come through it.

It is also a CEILING. Dodge clamps at about 1.5x, and 1.5 times black is black, so no combination of
`sheen`, `seam`, palette and seed can draw a BRIGHT MARK ON A DARK GROUND. A flame, a filament, a
neon line and a star are all that picture. `ember` was the tonal inverse of its own reference for
three passes for exactly this reason, and no dial value could have fixed it.

`emitted` is PLUS-LIGHTER in `colour.bloom`. An element ADDS light at the strength `sheen` asks for,
so it is bright against black and clips to white where the field beneath it is already hot, which is
how a hot core reads. The two are one word apart because they are one question: does this element
take light, or give it?

#### `peak`: which side of an element the light lands on

A blind is brightest a little way in from the seam it trails, because that seam is the slat's own
shadow. A flame is brightest AT its trailing edge. That was a constant, 22 to 46 percent from the
leading edge, so every lit field this generator could reach was lit from the same side. The default
is the midpoint of the old range and the spread around it is the old range exactly.

A lit face gets a mound of light across it, because that is what a surface catching light looks like.
A silhouette gets a flat fill, because a thing that BLOCKS light is opaque all the way across; given
the mound it came out as a grey smudge fading to a tenth of itself at both edges, which is a lit
surface drawn in black.

`seamWidth` is a dial and not a constant because polarity alone cannot draw the second picture. A
bright seam at the old fixed 16-to-40% of a twelve-panel field is a bright BAND a tenth of the frame
wide, and what a lit colonnade shows is a hairline. The default reproduces the old fixed range exactly.

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

### envelope

The silhouette of each element as a function of WHERE IT SITS. Two references asked for what looked
like two features, a row of spikes whose heights climb left to right and a row of panels whose light
stops at a horizon that dips in the middle. They are one thing: each element has an extent, and that
extent is a curve in the element's position.

| key | range | what it does |
|---|---|---|
| `kind` | `full` `ramp` `arch` `valley` `wave` · `circle` `crescent` `scallops` `hills` | the curve. `full` is 1 everywhere, so the default envelope is no envelope. The four after the dot are round. |
| `from` / `to` | 0 to 1 | the extent at the curve's floor and at its ceiling. `from` ABOVE `to` runs the shape backwards, which is why there is no direction dial. |
| `jitter` | 0 to 1 | how far each element wanders off the curve. |
| `anchor` | `bottom` `top` | which edge the element grows from. The other end is the free one. |
| `originX` / `originY` | -50 to 150 | WHERE THE MASS IS, as a percentage across and down the frame. `50`/`50` is unmoved. Same name and units as `colour.originX/originY`, because it is the same question about the other half of the picture. |
| `taper` | 0 to 1 | how much it narrows towards the free end. `1` ends in a point. |
| `softness` | 0 to 1 | how sharply the extent ENDS. `0` stops dead, which is a bar chart; both references that needed an envelope end soft. With `mass`, it is the blur of the whole silhouette instead. |
| `mass` | 0 to 1 | HAND THE ENVELOPE TO THE FIELD at this strength, instead of to the elements. `0` emits nothing. |

#### The round kinds, and why a sine hump was not one

`arch` was the only curved shape the table had, and a sine hump is not a dome. It leaves the baseline
at a finite slope and its shoulders sag, so a mass built on it reads as a bump. A circle leaves the
baseline UPRIGHT, and that one difference is the whole of what the eye calls round. The four kinds
below are built out of circular arcs and gaussians, so none of them is a polyline and none has a
corner anywhere.

| kind | the maths | what you get |
|---|---|---|
| `circle` | the unit semicircular arc, `sqrt(1 - (2u-1)^2)`. Every point satisfies x² + y² = 1, and the test asserts it rather than trusting it. | a symmetric dome, a planet's limb, an eclipse |
| `crescent` | one circular arc with a second equal arc bitten out of it, offset along x. Both edges are circles. | a moon horn: empty on one side, a concave inner edge, a point at the tip |
| `scallops` | the same semicircle repeated five times. Odd, so one arc sits dead centre and the row is symmetric. | a shallow `from`/`to` is a scalloped horizon; a tall one is an arcade with light between the piers |
| `hills` | three gaussians of unequal width and height at 0.19, 0.5 and 0.82, summed. Gaussians have no edges, so the sum is smooth everywhere and three unequal ones never repeat. | rolling ground: three summits with soft saddles between them |

`crescent` and `hills` are divided by their own peak, so `to` still means "the extent at the curve's
ceiling" for every kind alike. A shape whose ceiling was 0.81 would quietly make `to` mean something
else.

**A round VALLEY is not here, and that is not an omission.** `from` above `to` already runs any curve
backwards, so `circle` with `from: 1, to: 0` is the bowl. A kind that draws a picture another kind
already reaches is a dial nobody needs.

**A lens is not here either, and the reason is the envelope's own shape.** An envelope is anchored to
an edge: it says how far an element reaches from that edge, so it cannot describe anything that
floats. A lens or a vesica is a floating form, and the only part of one an anchored envelope can
express is its upper arc, which is a slightly pointier `circle`. There is no third picture in it.

**The curve is circular in the ENVELOPE's units, not in the frame's.** `u` is a fraction of the width
and the extent is a fraction of the height, so on a 16:9 frame a `circle` draws a wide ellipse, the
same way `arch` is stretched. The generator emits percentages and never learns the aspect, so it
cannot correct for it. If you want a rounder dome on a wide frame, lower `to`.

#### `mass`: a landscape is not a row of boxes

A landscape is ONE curve sampled per column. An envelope is ONE EXTENT PER ELEMENT. A row of twelve
panels each holding its own height is twelve boxes with steps between them, and `refs/ref-b.png` is a
single continuous ridge with the panel seams drawn OVER it. Softness cannot close that gap: softness
blurs an edge, and what is wrong is who owns the edge. Two passes were spent on that dial and both
made the picture worse.

Above `0` the same curve is drawn once, across the whole frame, at 180 columns, with smooth noise
riding on it in place of the per-element jitter. The elements then run the whole frame, which is what
makes their seams full-height panel lines rather than the edges of boxes. The number is the mass's
opacity, so a ridge can be a black cut-out or a haze on the horizon.

`slats` honours all of it. `shards` honours everything but `anchor`, because a ray grows from a pivot
outwards and its far end is already the far end. `rings` honours none of it: a band's position is a
radius, not a place in a row, so `from` and `to` would have nothing to interpolate between. Setting
an envelope on `rings`, or `seamWidth` on anything but `slats`, THROWS and names the patterns that do
take it. Accepting a dial and then ignoring it is the failure this option table exists to prevent.

Both are neutral grey and both blend multiplicatively, and that is the whole reason the field keeps
its colour. `multiply` scales every channel DOWN by one factor; `color-dodge` scales every channel
UP by one factor. One factor per pixel leaves the ratios between R, G and B untouched, so chroma
survives and rises on the lit faces. One `overlay` layer doing both jobs is what turned a crimson
field brown: overlay pulls a mid-tone towards white on one side and towards grey on the other, and
it cannot be asked to stop. `plus-lighter` is the OTHER mode rather than a worse one: it ADDS, so it
lit up the first reference's black right-hand side with bars that should not be there, and it is the
only way to draw a flame. Which one runs is `shadow.light`, and dodge is the default because it
leaves black alone: zero divided by anything is still zero.

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
make lightfield                                  # ref, tide and fern only: the loop in the Makefile
                                                 # is hardcoded and does not yet know about the two
                                                 # new presets. Use the CLI for those.
node scripts/author/lightfield.mjs --preset ember --out formats/scene/_lightfield-ember.html --shot
make lightfield PRESET=tide                      # one preset
make lightfield ARGS='--seed 91 --pattern.kind shards --bloom "#ffd166" --out /tmp/f.html --shot'

node scripts/research/lightfield/lightfield-test.mjs                  # determinism + fail-early, as assertions
node scripts/research/lightfield/lightfield-compare.mjs A.jpg B.png   # measured fidelity, not an opinion
node scripts/research/lightfield/lightfield-seeds.mjs ref.jpg 4000000  # rank millions of layouts, arithmetically
SEEDLIST=<its output> node scripts/research/lightfield/lightfield-fit.mjs ref.jpg   # confirm the shortlist for real
```

Every flag is derived from the option table, so the CLI cannot drift from the generator. Group keys
are dotted (`--pattern.kind`, `--motion.speed`); a leaf name on its own works when it is unambiguous
(`--bloom`, `--seam`, `--count`), and `--kind` is rejected because two groups have one.

`lightfield-shot.mjs` exists because `make preview` centres a fragment in a 1400px box, which is the
wrong page for a full-bleed field: the field is `position:absolute;inset:0` and needs a sized parent.

## The committed fields

| file | palette | pattern | polarity | envelope |
|---|---|---|---|---|
| `formats/scene/_lightfield-ref.html` | orange, magenta, red, navy fill | slats, 58 | dark seam, lit face | none |
| `formats/scene/_lightfield-ember.html` | orange, scarlet, oxblood, black | slats, 40 | bright hairline seam, EMITTED face | ramp, from the bottom, tapered to points |
| `formats/scene/_lightfield-colonnade.html` | amber, ochre, umber, blue fill | slats, 12 | BRIGHT hairline seam, EMITTED, no face | valley, drawn as a field-wide `mass` |
| `formats/scene/_lightfield-tide.html` | ice blue, steel, navy, black | rings, 120 | dark seam, lit face | none |
| `formats/scene/_lightfield-fern.html` | acid green, jade, forest, black | shards, 34 | dark seam, lit face | none |

The first three are all `slats`. That is the point of the table: `ref`, `ember` and `colonnade`
reproduce three photographs that look nothing alike, and none of them is a new structure. What
separates them is the two polarity signs, an envelope, a light origin and whether the lit half of the
pattern reflects light or emits it.

Their option sets are in `core/lightfield/presets.js`, and each one is a worked example of
the API. Nothing about them is special-cased inside the generator: a preset is only an argument.

## Files

| file | what it holds |
|---|---|
| `core/lightfield/index.js` | the generator, the colour field, the shadow, the motion |
| `core/lightfield/options.js` | the option table. The only place that decides what is valid |
| `core/lightfield/patterns.js` | the three structures and the field-wide `mass`. Knows nothing about colour |
| `core/lightfield/colour.js` | hex parsing and mixing |
| `core/lightfield/rng.js` | the seeded generator. Never swap this for `Math.random` |

## How it is measured, and why the old number was wrong

`node scripts/research/lightfield/lightfield-compare.mjs <reference> <render>` prints four things, and the first
two exist because the other two passed a picture a human rejected.

**Tonal bands.** An 8x5 grid, split into shadow, mid and highlight by the REFERENCE's own luma, never
the render's, so a field that lost all its shadows cannot redefine what a shadow is and then pass.
Each band reports its dE, its WORST cell, and warmth as `r - b` for both pictures. Warmth is there
because "warm or cool" is the axis the eye grades a shadow on and dE cannot tell a violet miss from a
green one. The worst cell is printed beside every mean, because a mean is a budget a fit will spend.

**Bands.** How many vertical elements there are and how hard they cut, off one column-luma profile:
average every row away and what is left is the vertical structure alone. `count` is local maxima that
clear a prominence floor set as a fraction of the profile's own range. `hardness` is the mean absolute
gradient of that profile. This is a better number than the `edge` under STRIPING, which is measured
at full resolution and therefore also measures a JPEG reference's compression noise: on
`refs/lightfield-ref.jpg` the full-res edge runs 50% above the column-profile hardness for the same
picture.

**Samples** are four fixed points fitted to `refs/lightfield-ref.jpg` and are only printed for it.
**Block grid** downsamples hard so the slat phase cancels and what is left is the colour field.

The failure this section is named after: the `ref` preset scored a mean sample dE of **12.7** and was
rejected on sight, because all four sample points sat in lit areas and the defect was in the dark
ones. After fixing it the same number went to **12.4**, which is to say it never had an opinion. The
numbers that moved were the ones that did not exist yet.

| `ref`, shadow band | before | after |
|---|---|---|
| warmth error, `r - b` | **+14.8** (warm where the reference is cool) | **+6.5** |
| dE | 28.0 | 27.1 |
| right-edge sample | `#050403`, r-b **+1.5** | `#06060d`, r-b **-7.1** (reference: -9.0) |
| band hardness vs reference | 1.27x | 1.05x |

## Where it stops

1. **The violet lower-left corner of `refs/lightfield-ref.jpg`.** The worst cell is still `#1a0818`
   in the reference against `#5c0817` here, and no fill can reach it: the `deep` blob genuinely sits
   there, so the region is red by layout rather than by palette. 259 alternative seeds were rendered
   and scored and none beat the incumbent, so this is the vocabulary, not the search.
2. **Light that lives INSIDE the elements.** In `refs/ref-a.jpg` each spike carries its own white
   core on pure black. Here an element MODULATES a field: `color-dodge` cannot brighten black, so a
   flame cannot glow where the field behind it is dark. `ember` reaches the shape by inverting the
   picture, drawing the black as tapered wedges and letting the flames be the gaps, which gets the
   silhouette and the rising envelope but not a per-flame core. `plus-lighter` would emit light and
   was rejected for a separate documented reason: it ADDS, so it lit up the reference's black
   right-hand side with bars that should not be there.
3. **A tapered element and its own complement.** A bar carries at most one dark cell and one lit
   cell, and both take the same box and the same taper. `refs/ref-a.jpg` needs the dark to be the
   complement of a tapered lit shape, which is two dark cells per bar and therefore a fourth pattern
   rather than a dial.
4. **Chroma in the mid-tones.** The reference holds a crimson through the fall from orange to dark
   red, and compositing fixed hex stops walks that ramp towards brown. Interpolating `in oklab`
   recovered some. The rest needs more stops than four, which would cost the thing the four are for.

## Turning the dials without a render

The generator is on the site at **`/playground`**. Every control there is built from `SCHEMA` in
`core/lightfield/options.js`, so what you can turn is exactly what the generator accepts, and an
option it refuses says so on the page instead of quietly doing nothing.

It opens on `ref` rather than on the schema's raw defaults. A `def` is the neutral value of one
field, which is not the same as a considered result: the fitted `ref` differs from the defaults on
three colour stops.

Copy the options straight into a scene, copy the HTML, or copy a link that carries only what you
changed. To add another generator to that page, export a `SCHEMA` and a render function and add a
row to `core/layout/generators.js`. The page reads the registry; there is no list to keep on the site.

## The `bands` shader, and the `spectrum` look built on it

`bands` is not a lightfield. It is one branch of `core/surfaces/shaders-ambient.js`, reached from a scene as
`{"type":"shader","shader":"bands"}`, and it shares this page because it answers the same question
with different machinery: a repeating ramp over a scalar field, tinted, with a light behind it.

Two cards in `core/layout/generators.js` sit on that one branch. `bands` is the original look, dark and lit
from behind. `spectrum` is the same shader with the colour running at a right angle to the bands.

### The dials, and why they were renamed

The first set read `count` / `angle` / `glow` / `softness` / `edge` / `warm` / `core` / `deep`, and
every one failed the only test a control has to pass: a person who has not read the shader cannot
tell what it changes. `angle` was in TURNS, so a right angle was `0.25`. `glow` was a radius named
like a switch. They are now in degrees and in percent, and the shader's uniform layout did not move:
`core/layout/generators.js` does the mapping, which is the job that file exists for.

Where a number means a PLACE it uses the spelling this document already settled on for the
lightfield's three origins: percent of the frame, `50`/`50` unmoved, off-frame values legal.

| dial | what it does |
|---|---|
| `shape` | what the bands are cut on: `panels`, `arcs`, `rounded` |
| `bands` | how many fit across the frame at zoom 1. Divided by the aspect on the way to the shader, so it means the same thing on a portrait canvas as on a landscape one |
| `bandAngle` | degrees. 0 stands them upright |
| `bandOffset` | slides the set by a fraction of one band, which is how a seam or a band centre lands on the middle |
| `mirrorBands` | fold the pattern about the field's middle, so each band shades OUTWARD on both sides |
| `zoom` | push into the pattern, around the LIGHT rather than around the middle. It magnifies; it does not change what `bands` counts |
| `lightShape` | `round` · `oval` · `bar` · `cross` · `rounded` · `sweep` |
| `lightWidth` / `lightHeight` | the light's two radii. Equal is a circle, and `round` forces them equal |
| `lightAngle` | degrees. Turns the light, so a bar can lie flat or stand up |
| `lightOriginX` / `lightOriginY` | percent across and down. The light used to be the constant `vec2(0.5, 0.55)` that no caller could reach |
| `lightRing` | put the brightest point at a radius instead of at the centre: a halo, or from a bar a pair of parallel bars |
| `lightPoints` / `lightSpike` | angular spikes on the light. Depth 0 is exactly the unspiked shape |
| `lightEdge` | how abruptly the light stops |
| `lightPolarity` | positive lights the field, negative DARKENS it. On `spectrum`, 0 means no light at all |

`spectrum` adds `gradientAngle` (which way the ramp runs), `converge` (how much less of the ramp each
band shows as it gets further out), `bandLean` (how much of that step happens across a band rather
than on its seam), `bandShading`, and eight ramp stops instead of four named colour roles.

### Eight palette stops

`u_pal` was four and is now eight. Four is right for a mesh gradient built from blobs and wrong for a
RAMP: `refs/colonnade/c6.jpg` runs white, green, yellow-green, pale gold, cyan, blue, white, and no
interpolation between four stops reaches it. The seventeen effects written before this ask for stops
0 to 3 only and `P()` answers those the same either way, so all seventeen are byte-identical after
the change. That was checked by shooting every effect at two clocks with and without a palette,
before and after, and comparing the hashes rather than the pictures.

### Where `spectrum` stops, measured against `refs/colonnade/c6.jpg`

Mean per-channel error **14.2 out of 255** at the reference's own 9:16, on a 120x214 grid, which is
the same measurement `scripts/research/lightfield/lightfield-check.mjs` uses one size up.

The construction is right: eleven bands, evenly spaced, mirror-symmetric, the band edges within a
pixel of the reference's, a spectrum falling down the frame, and each band out from the middle
showing less of that spectrum, which is what makes the picture read as depth rather than as stripes.

What still differs, in one word, is CONTRAST. The reference's dark green is darker and its blue
deeper; ours is the same hue at roughly two thirds the punch, and where the reference's adjacent
columns jump, ours slide. The cause is nameable: the eight stops are EVENLY SPACED along the ramp, and
the reference's dark-green trough is about 6% of the frame height wide, sitting between our stops at
28.6% and 42.9%. The straight leg between two stops cuts that corner off. Closing it needs per-stop
POSITIONS, not more stops, and that is eight more floats than the parameter vectors currently carry.

One smaller residual: the reference's per-band depth is not a clean step. Within each band the depth
recovers slightly toward the band's outer edge, which `bandLean` models but only approximately; the
reference behaves as though the recovery is about half a step and ours is a straight ramp.

### What was measured on the reference

Recorded so the next person does not re-derive it. At 120x214: eleven bands, edges at
`x = 10, 21, 32 … 110`, no jitter. The ramp runs DOWN the frame, perpendicular to the bands. The
centre column, top to bottom, is `(239,251,231) → (206,239,212) → (107,175,144) → (124,185,109) →
(216,235,157) → (137,205,207) → (66,155,213) → (224,239,248) → (240,251,255)`. Each band samples that
ramp at a different vertical SCALE, not a different offset: fitting `(scale, offset)` per column gives
offsets inside ±0.01 everywhere and scales of `1.00, 0.89, 0.78, 0.66, 0.54, 0.44` out from the middle
band. That is a per-band ZOOM on the gradient anchored at its midpoint, and it is the single most
characteristic thing about the picture.
