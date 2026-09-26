// Two readers must never disagree: generators/media/audio-bake.mjs writes the files, quality/gates/sfx-audit.mjs grades them; living only in the gate once let the bake voice an alias unchanged, `click` a byte-for-byte copy of `pluck` at 0.696s against a 0.15s cap.
// Importing the gate from the generator made a cycle, and the gate runs its check at import, so the table moved here instead.
export const CLASSES = [
  [/^(press|click)$/,                 0.15, 'a keystroke fires every ~0.09s; longer and the train arrives'],
  [/^key$/,                           0.24, 'a soft keystroke tap rings slightly for a legato train'],
  [/^(tick|release|toggle)$/,         0.60, 'a UI transient is an event, not a sound bed'],
  [/^(whoosh|whisper|droplet|pop|bloom|sparkle|page|loading)$/, 3.0, 'a transition cue rides one cut'],
  [/^(reveal|chime|success|error|ready)$/,                      5.0, 'a sting lands once'],
];

/** capFor(name) -> the seconds this name is allowed to sound for, or null when no class claims it. */
export const capFor = (name) => (CLASSES.find(([re]) => re.test(name)) || [])[1] ?? null;
