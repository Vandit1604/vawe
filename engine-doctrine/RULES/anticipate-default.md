---
name: anticipate-default
when: a layer's first WARPABLE entrance (`up`/`rise`/`pop`/`scale`/`lift`/`slide-*`) is not the film's opening wave
holds: built: core/engine/produce.js applyAnticipateDefault
answers: "why a directional entrance winds up without being asked, and how to turn it off on one layer"
group: look
---
# A directional entrance winds up on its own; `anticipate: false` turns it off

`anticipate` used to be opt-in: an author had to remember the word for the wind-up before a
directional entrance (engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md #5). It is now the reflex. Any layer whose
`anim` already carries travel gets `anticipate` added at boot, amount derived from the theme's own
`bounce` (`anticipateFromMotion`, core/motion/motion.js), so a calm brand winds up less than a bouncy
one instead of every theme getting the same number.

Two exclusions, both from the recipe's own caution ("wrong anywhere the viewer is already looking, and
on anything informational"):

| excluded | why |
|---|---|
| the film's first wave (earliest `start`) | the viewer is watching the frame open, already looking there |
| `type: "count"` | a rolling number is read, not glanced at |

A split or cut layer never gets it either: its entrance is owned elsewhere, and `formats/scene/scene.js`
throws if either carries `anticipate`.

Nothing here starts a still layer moving: it only reshapes the ease curve of an entrance already
authored (`anim`), and the warp is terminal at both ends, so the resting pose is unchanged.

Right, to turn it off on one layer that qualifies but should stay flat:
```json
{ "id": "chip", "anim": "rise", "anticipate": false }
```

Wrong, an authored number written to fight the derived one instead of just using it:
```json
{ "id": "chip", "anim": "rise", "anticipate": 0.15 }
```
(only write a number when the film needs something OTHER than the theme's own derived amount; the
theme already supplies one, and the film should say why if it's overriding it, `authoring.allow`)
