# Drop your cut-out letter pack here

Unzip a royalty-free ransom / cut-out letter pack into this folder, then run:

    make ransom-sprites

Preferred layout is a folder per character (several variants each is what makes a note look
hand-assembled rather than typed):

    assets/ransom-src/A/a1.png
    assets/ransom-src/A/a2.png
    assets/ransom-src/B/b1.png

Flat files also work (`A.png`, `A-2.png`, `a_3.png`) — the leading character is the key.

Sources must have a TRANSPARENT background: the bake trims each image to its alpha bounding box.
A letter on an opaque white rectangle will bake as a rectangle, not a cutout.

The bake writes `assets/ransom/<CHAR>/<n>.png` + `manifest.json`. Then in a scene:

    { "type": "text", "text": "be KIND", "ransom": { "sprites": true } }

Check the pack's licence before committing anything here — this folder is for assets you have the
right to redistribute in this repo.
