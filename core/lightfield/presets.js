// core/lightfield/presets.js — the committed fields. Each is a full option set, so it doubles as a
// worked example of the API. Nothing here is special-cased inside the generator: a preset is just an
// argument.
//
// This lives in core/ rather than beside the CLI because the BROWSER needs it too. The site's
// playground starts you on a fitted field rather than on the schema's raw defaults, and a preset kept
// in scripts/ could not reach it. One copy, read by the CLI and by the page.

export const PRESETS = {
  // The reference reproduction. Orange bloom high and left of centre, magenta below it, red body,
  // black falling off to the right, seen through a backlit blind.
  ref: {
    // Every number here was FITTED, not chosen: scripts/author/lightfield-seeds.mjs ranked four
    // million layouts against the image, and lightfield-fit.mjs confirmed the shortlist through the
    // real renderer, on the colour field AND on the striping. depth 0 is a result, not an oversight:
    // the colour field already drains to the ground, and every second fall on top measured worse.
    // colour.extra is empty for the same reason. Two accent colours were fitted end to end against
    // this image, a dark magenta and a cold blue, and the field came out 7.5% against 7.3% without
    // them. The list stays in the API because it is cheap and some palettes need it. This one does
    // not, and the number says so.
    seed: 3449610,
    // FITTED, not chosen. The instrumented question was where the saturation is lost, and the answer
    // is the RAMP, not the composite: with seams and sheen at 0 the colour field alone measured
    // g +6.6 / b -8.3 / chroma 0.91x, which is the same brown as the finished field. So the previous
    // two passes were tuning the wrong half. The signature (green high, blue low) is a HUE error, and
    // no amount of saturate() fixes it, because saturate cannot ADD blue: sweeping vivid to 1.75 drove
    // chroma to 1.32x and every sample dE through the roof.
    //   deep  #851b08 -> #900d18   deep-red sample dE 22.9 -> 5.7
    //   mid   #c22d45 -> #96153f   magenta  sample dE 59.1 -> 26.3
    //   bloom #ee7c56 -> #e08050   bloom    sample dE 20.1 -> 11.0
    //
    // `shade` IS THE FIX FOR THE ONE THING EVERY NUMBER MISSED. This preset scored a mean sample dE
    // of 12.7 and was rejected by eye, because all four sample points sat in lit areas: the
    // reference's shadows are cool (right third rgb(0,2,11) navy, dark lower left rgb(23,12,35)
    // violet) and this field's were warm (rgb(11,4,4) and rgb(83,5,12)). Graded on an 8x5 grid split
    // by the reference's own luma, the shadow band was +14.4 warmer than the reference.
    //
    // A cool GROUND cannot fix it, and the measurement is the argument: ground #12082a took the
    // temperature error to -2.6 and the shadow band's dE from 27.7 to 42.2, because `ground` is also
    // the far stop of the body gradient and drags the lit field violet with it. `shade` is a
    // separate ambient fill that screens, so it lifts the blacks and leaves the highlights alone:
    // temperature error +14.8 to +6.5 and shadow dE 28.0 to 27.1.
    //
    // IT IS A TRADE, AND A NUMBER DID NOT PICK IT. The fill is ambient, so it cools the whole
    // picture: every step darker buys about 4 units of shadow warmth and spends about 3.5 in the
    // highlights, and a cost function that sums the two is exactly ambivalent. The judgement is
    // that they are not equally visible. In the shadow band the values are small, so 8 units of
    // r-b is the difference between a brown black and a blue black and you can see it across the
    // room; in the highlight band the same 8 units is under 6% of a value of 127 and nothing looks
    // different. #02030c would have taken the shadow error to 2.9 and was rejected as further than
    // the eye needs, not as wrong.
    //
    // seam and count moved with it. A softer, sparser blind put the band hardness at 1.07x of the
    // reference where it had been 1.27x, and 259 alternative seeds were rendered and scored against
    // this one under the same cost. None beat it, so the layout is unchanged.
    colour: { bloom: '#e08050', mid: '#96153f', deep: '#900d18', ground: '#000202', shade: '#010208' },
    shadow: { depth: 0, softness: 0.3, direction: 'bottom', seam: 0.35, sheen: 0.8 },
    pattern: { kind: 'slats', count: 58, jitter: 0.55 },
    motion: { kind: 'shimmer', speed: 1, amount: 1 },
  },

  // Flame. The same slats, with every polarity reversed and an envelope on top.
  //
  // This is the preset that proves the generator is a generator. Nothing here is a new structure:
  // the elements are the SAME vertical bars, and what makes them a rising row of flames is that the
  // face is a silhouette rather than a lit surface (`sheen` negative), that each bar hangs from the
  // top and narrows to a point (`anchor` top, `taper`), and that how far down it reaches is a
  // function of where it sits (`envelope.kind` ramp, run backwards with `from` above `to`). The
  // flames are the GAPS. Read the picture as black wedges and the construction falls out.
  //
  // `spread` at 0.9 is doing quiet work: at the fitted default the light is three lobes with edges
  // you can point at, and against black those read as three bokeh circles rather than as a fire.
  ember: {
    seed: 72,
    colour: { bloom: '#fff6d8', mid: '#ff8608', deep: '#240400', ground: '#000000', vivid: 1.2, spread: 0.9 },
    shadow: { depth: 1, softness: 0.2, direction: 'top', seam: 0, seamWidth: 0.28, sheen: -1 },
    pattern: { kind: 'slats', count: 40, jitter: 0.1 },
    envelope: { kind: 'ramp', from: 1, to: 0.4, jitter: 0.05, anchor: 'top', taper: 0.75, softness: 0.02 },
    motion: { kind: 'breathe', speed: 0.6, amount: 0.8 },
  },

  // Evening through a colonnade. Wide panels, bright hairlines between them, and a horizon.
  //
  // The third polarity combination, and the one that named the dials. `seam` is NEGATIVE, so the
  // line between two panels is bright rather than dark, which is what a gap between two lit things
  // looks like; `seamWidth` 0.025 makes it a hairline rather than the wide band the fixed width
  // would have drawn across a twelve-panel field. The dark masses are the same silhouette device as
  // `ember` wearing a different envelope: `valley` puts them tall at the edges and low in the
  // middle, `softness` blurs their tops so they read as hills instead of bar charts, and `jitter`
  // stops the row being a formula.
  colonnade: {
    seed: 52,
    // `shade` earns its place a second time, on a palette that has nothing to do with the first.
    // ref-b's dark masses are neutral grey (r-b about 2) and a warm amber field leaves them brown:
    // graded on the shadow band they came out 22.4 too warm. A neutral ground and a faint blue fill
    // took that to 16.2, which is the same dial answering the same question in another colour.
    colour: { bloom: '#ffd15c', mid: '#c97a0d', deep: '#5a3a12', ground: '#0c0d10', vivid: 1.05, shade: '#020308', spread: 1 },
    shadow: { depth: 0.85, softness: 0.5, direction: 'center', seam: -0.6, seamWidth: 0.025, sheen: -1 },
    pattern: { kind: 'slats', count: 12, jitter: 0.08 },
    envelope: { kind: 'valley', from: 0.4, to: 1, jitter: 0.28, anchor: 'bottom', taper: 0, softness: 0.6 },
    motion: { kind: 'drift', speed: 0.35, amount: 0.5 },
  },

  // Cold water. Same idea, opposite temperature and a concentric structure, so the eye travels out
  // from a point instead of across a grille.
  tide: {
    seed: 4021,
    // `extra` earns its place here: a cold sea has a green in it that no role among bloom, mid,
    // deep and ground can name, and naming it as a fifth role would mean nothing on any other palette.
    colour: { bloom: '#8fe8ff', mid: '#2f6ea8', deep: '#10305c', ground: '#01060f', extra: ['#1f7d74'] },
    shadow: { depth: 0.82, softness: 0.95, direction: 'bottom', seam: 0.55, sheen: 0.4 },
    pattern: { kind: 'rings', count: 120, jitter: 0.3 },
    motion: { kind: 'breathe', speed: 0.7, amount: 1.2 },
  },

  // A fan of rays through green, with a hard, near-central falloff. The shadow dial is doing most
  // of the mood here: crisp and centred reads as a spotlight, not as weather.
  fern: {
    seed: 90210,
    colour: { bloom: '#d8f36a', mid: '#2fa06a', deep: '#12402f', ground: '#03110c' },
    shadow: { depth: 0.9, softness: 0.35, direction: 'center', seam: 0.7, sheen: 0.5 },
    pattern: { kind: 'shards', count: 34, jitter: 0.6 },
    motion: { kind: 'drift', speed: 1.4, amount: 0.8 },
  },
};
