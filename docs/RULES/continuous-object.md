---
name: continuous-object
when: deciding what holds a film together across its cuts
holds: gated (scripts/gates/direction-floor.mjs#no-continuous-object; BLOCKS)
answers: "the continuous-object device, the acrossBeats/becomes mechanism, and the waiver a real alternative device needs"
group: crosscutting
---
# One object survives a cut and changes across it, or name what else holds the film

A slideshow is beats born and dying inside their own window: every cut jumps between unrelated shots.
The cheapest fix is a continuous object, one layer marked `acrossBeats: true` (under `sceneUnits`) or
one `becomes`/`matches` handover, that crosses the cut and changes on the far side. `Murch ranks this
device LAST` of six a cut must serve, so name three ways this film could hold its subject and reject
the first one before defaulting to it. A film held by a real alternative (a sound bridge, a motif, an
escalation) waives the gate with a reason instead of faking a continuous object to pass.

| parameter | value |
|---|---|
| the two devices the gate can verify | a continuous object (`acrossBeats`) and a match cut (`becomes`/`matches`) |
| a film with none of either and no waiver | BLOCKS |

Right:
```json
{ "authoring": { "allow": ["no-continuous-object"],
  "_why": { "no-continuous-object": "held by a sound bridge: the voiceover sentence spans the cut" } } }
```

Wrong:
```json
{ "authoring": {} }
```
