# moth-photogram: design system

A 12 s 16:9 loop of four 3D moths filmed as a cyanotype photogram. No text. Combo: none (no type).

Skipped builder: no product UI. Skipped type: the film has no text. Skipped colour: the lens `cyanotype` palette is the whole colour system.
Skipped depth: depth comes from a perspective camera and the lens depth of field. Skill frame: vawe rules, four moths, a ground never flat.

## Palette roles (lens PALETTES.cyanotype)

| role | value |
|---|---|
| ground | `#010306` |
| shadow | `#070d13`, `#162432` |
| mid | `#3b4f64` |
| light | `#6f8599`, `#ccd8e4` |

## Ground and light devices

Back-lit additive wings and fur on black: light passes through every layer. The lens adds the palette, grain 0.42, bloom, a cold halation (tint 0.4, 0.6, 1) and depth of field over a tilted plane (near moths low in frame, far moths high). The rack focus at 7.2 s moves the focal plane from the near moth to the far row.

## Parts

Wing (fore and hind, thin meshes bent in a vertex shader), furry body (shell fur), antennae. All are built in `page.html`.
