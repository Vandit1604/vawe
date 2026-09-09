// core/lightfield/presets.js: the committed fields. Each is a full option set, so it doubles as a
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
    // Every number here was FITTED, not chosen: scripts/research/lightfield/lightfield-seeds.mjs ranked four
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
    //
    // THE LAYOUT WAS RIGHT AND THE FALLOFF WAS MISSING. The seed search was exhausted: 259
    // alternatives scored worse, and moving the light with `colour.originX/Y` scored worse again
    // (27.2 at x 40, 27.1 at x 60, against 20.0). What was left was the corner the search could not
    // reach, because no layout puts a shadow there: the reference darkens towards the bottom left,
    // and this carried `depth: 0`, so that corner stayed lit crimson where the photograph is a dark
    // violet. Measured on the corner itself, #5a071f against the reference's #1c0b21. A
    // `bottom-left` fall at 0.45 plus a colder `shade` takes it to #340514, and the whole shadow
    // band from +11.3 warmer than the reference to -1.7, which is a brown black turning blue;
    // `vivid` 1.3 pays back the chroma the extra ambient fill costs. Block error 20.0 to 20.0. The
    // mean did not move at all and the picture did, which is the argument for grading the shadows
    // separately from the mean.
    //
    // `spread` was tried again here and is still 0. Every value above it softens the lobe edges,
    // which is the one visible flaw left, and spends more than it earns: 0.12 costs a point of block
    // error and three of shadow warmth, because a longer reach carries warm light into the very
    // corners the reference keeps black.
    colour: { bloom: '#e08050', mid: '#96153f', deep: '#900d18', ground: '#000202', shade: '#030412', vivid: 1.3 },
    shadow: { depth: 0.45, softness: 0.5, direction: 'bottom-left', seam: 0.35, sheen: 0.65 },
    pattern: { kind: 'slats', count: 58, jitter: 0.55 },
    motion: { kind: 'shimmer', speed: 1, amount: 1 },
  },

  // Flame. The same slats, read the other way up, and the one preset that needed the generator to
  // grow rather than to be turned differently.
  //
  // IT USED TO BE THE TONAL INVERSE OF ITS OWN REFERENCE, and the reason is worth keeping. It was
  // written as black wedges hanging from the top, with the flames as the GAPS between them, on the
  // argument that reading the picture as silhouettes made the construction fall out. The
  // construction did fall out; the picture did not. ref-a is black with bright flames on it, and a
  // field of silhouettes is a LIT field with black teeth in it, which is a different photograph.
  // Every pass that followed turned dials inside that reading and scored 64 against the image.
  //
  // Three things had to be true before the right reading was reachable, and none of them was a
  // value:
  //   * `shadow.light: 'emitted'`. Dodge cannot draw a bright mark on black, because 1.5 times
  //     black is black. A flame gives light, so it ADDS `bloom` instead of scaling what is under it,
  //     and clips to white where the field beneath is already hot.
  //   * `colour.originX/Y`. The light in this picture is off the bottom-right corner, and the blob
  //     layout was pinned to one photograph whose light is high and central. No seed could move it.
  //   * `shadow.peak`. Each flame is dark at its leading edge and hot at its trailing one; the mound
  //     on a lit face was nailed near the leading edge, so every lit field was lit from one side.
  // With those three, the rest is the ordinary vocabulary: the elements stand on the bottom
  // (`anchor`), narrow to a point (`taper` 0.9) and get taller to the right (`ramp` from 0.12 to 1),
  // and a thin bright `seam` draws the hot line up each flame's trailing edge.
  //
  // Block error against ref-a: 64.2 to 22.2.
  ember: {
    seed: 72,
    colour: { bloom: '#ff9000', mid: '#ff3c00', deep: '#0a0100', ground: '#000000', vivid: 1.2, spread: 0.8, originX: 118, originY: 112 },
    shadow: { light: 'emitted', depth: 1, softness: 0.65, direction: 'top-left', seam: -0.8, seamWidth: 0.07, peak: 88, sheen: 0.9 },
    pattern: { kind: 'slats', count: 40, jitter: 0.1 },
    envelope: { kind: 'ramp', from: 0.12, to: 1, jitter: 0.04, anchor: 'bottom', taper: 0.9, softness: 0.4 },
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
  //
  // WHAT WAS WRONG WITH IT FOR THREE PASSES: the masses were twelve separate boxes and the reference
  // is ONE continuous ridge with the panel seams drawn over it. That is not a softness value, and
  // turning the softness dial at it twice made the picture worse both times, because softness blurs
  // an edge and what was wrong was who owned the edge. `envelope.mass` hands the curve to the field:
  // the ridge is sampled per column, the elements run full height, and their seams become the
  // full-height hairlines the reference has. Block error against ref-b: 27.3 to 21.5.
  colonnade: {
    seed: 7,
    // `shade` earns its place a second time, on a palette that has nothing to do with the first.
    // ref-b's dark masses are neutral grey (r-b about 2) and a warm amber field leaves them brown:
    // graded on the shadow band they came out 22.4 too warm. A neutral ground and a faint blue fill
    // took that to 16.2, which is the same dial answering the same question in another colour.
    colour: { bloom: '#ffd15c', mid: '#c97a0d', deep: '#5a3a12', ground: '#0c0d10', vivid: 1.05, shade: '#020308', spread: 1, originY: 55 },
    // `sheen` is 0, and that is the point of the rewrite: the elements are no longer the dark thing.
    // The ridge is, and the panels are only the bright hairlines between them.
    //
    // `light` IS `emitted`, AND THE SCHEMA'S OWN NOTE ARGUES FOR THE OTHER ONE. options.js says dodge
    // is right for "a blind, a colonnade and a wall", and that sentence is about a lit PANEL FACE.
    // This preset draws no faces: `sheen` is 0, so the only lit cell left is the SEAM, and a seam is
    // not a surface catching light, it is the gap where the sky itself shows through. The schema's own
    // test settles it: does this element take light, or give it?
    //
    // MEASURED, because the picture was wrong and the words next to it were right. Dodge is
    // field / (1 - source), so 1.5 times black is still black, and every hairline died the moment it
    // crossed the dark ridge. The preset promised "the elements run full height, and their seams
    // become the full-height hairlines the reference has" and the render stopped them at the horizon.
    // Second-derivative energy across the frame, bottom tenth, against ref-b's own 1.29: 0.31 dodged,
    // 2.56 emitted. The reference draws its panel lines over the masses; so does this now.
    //
    // `seam` fell -0.85 to -0.6 with it, and that is arithmetic rather than taste. Plus-lighter ADDS
    // where dodge scaled, so the same magnitude paints a brighter line: at -0.85 the striping swing
    // came out 1.34x the reference, and -0.6 is 1.00x. Block error 18.69 to 18.39.
    // `direction` WAS `center`, and a radial fall could not draw this picture. Measured against the
    // reference at 160x104, the render was 27 units too bright at the top edge (29.9 against 56.8)
    // and 16 too dark at the left edge (39.7 against 23.4) in the same frame, because a radial cannot
    // darken the top without darkening the sides by more. `top-and-bottom` is the missing shape: a
    // lit band with darkness above and below it and nothing taken off the sides. Every depth and
    // softness pair under it beat every pair under `center`, and the best took the block error from
    // 21.5 to 19.1.
    shadow: { light: 'emitted', depth: 0.7, softness: 0.5, direction: 'top-and-bottom', seam: -0.6, seamWidth: 0.025, sheen: 0 },
    pattern: { kind: 'slats', count: 12, jitter: 0.02 },
    envelope: { kind: 'valley', from: 0.42, to: 0.72, jitter: 0.3, anchor: 'bottom', taper: 0, softness: 0.35, mass: 0.93 },
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
