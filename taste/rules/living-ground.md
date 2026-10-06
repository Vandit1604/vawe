---
id: living-ground
step: look
principle: A ground has depth. Soft colour, light or texture sits behind the content, and it moves. One flat colour behind one element is a slide, not a frame.
limit: no more than half of the frames show one flat ground
range: a gradient, a blurred colour blob, an image or a canvas layer over at least 15 percent of the frame; the reference films show a glow, a blob or a camera on most frames
break-when: a flat ground is the idea (a stark payoff or a title card): declare living-ground in the page with a reason
instead: put two or three large soft blobs behind the content and let them drift: the Grounds moves in prompts/moves/README.md (gradient-mesh-field, aurora-drift, light-pool, grain-field). Keep the text on a calm part of the blob.
check: living-ground
judge: Is there a frame with one element on one flat colour and nothing behind it?
prevents: the side-by-side judge lost our film on craft to Raycast and Linear twice: "Raycast's pink light that blooms on black gives depth and glow; our grounds are flat warm fields", "most of our frames are one element on a flat ground".
status: active
scored: no
numbers: {"ground_layer_area_pct_min":15,"flat_samples_share_max_pct":50}
print-frames: put soft colour blobs behind the content, not one flat fill
digest: A ground is never one flat fill: soft blobs or light behind the content, drifting.
craft: color
---

## Example

Wrong: a warm field with one headline. Right: the same field with two blurred blobs drifting slowly behind the headline.

Draft check: The layout read counts a gradient or image background (also on a `::before` or `::after`), a blur filter, an image, a video or a canvas as a layer. It names every flat frame, and adds the limit when they pass it. SVG is not read. A frame is flat when the layers cover under 15 percent of it. `bin/vawe frames` reads one frame per world; the draft reads its layout samples.

Why and sources: [color](../craft/color.md).
