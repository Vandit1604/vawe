# The vocabulary, and the thermal blur story in full

## Why guessing feels like progress, so you can watch for it

Iterating produces a render you can show. Searching produces nothing to show and has no obvious
stopping point, so under any pressure to make progress it is the step that gets cut. But an
approximation converges on whatever the first guess was near, which is why four attempts can leave you
exactly where one did.

## The thermal blur, the measured failure this skill is built from

`engine-doctrine/MISTAKES.md` #505. A reference frame showed white text with an orange body and a blue
rim. It was built four times by stacking coloured, offset, blurred copies of the same text, and
rejected four times, because a stack of copies cannot make a continuous transition between three
colours. One search returned the answer: the effect is a **thermal blur**, its recipe is white text,
Fast Box Blur, **Colorama**, glow, and the colour comes from a **gradient map on luminance**, not from
paint, so the blur's own grey falloff is remapped, bright to white, mid to orange, dim to blue. That one
fact also explained every symptom the stack could not produce: the continuous transition, the organic
edge, and the letters being eaten, all of which are the ramp acting on the glyph's own edge. Four
renders bought nothing. The name bought everything.

## Some of the vocabulary, so a plain-words description can be turned into a search term

| what you see | what it is called |
|---|---|
| colour that slides through a range with the subject's own falloff | gradient map · Colorama |
| a subject smeared along its own motion | echo · directional blur |
| one shape flowing into another, unreadable in the middle | goo morph · metaball morph |
| colour fringing at the edges | chromatic aberration |
| a texture pushed around by another image | displacement map |
| a shape revealed by another shape's brightness | luma matte |
| motion that steps rather than flows | posterize time · animate on twos |
| a bright subject bleeding light past its edges | bloom · glow |
| a surface that looks lit and carved | emboss · bump map · relief |
