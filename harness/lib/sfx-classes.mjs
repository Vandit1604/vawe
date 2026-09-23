// harness/lib/sfx-classes.mjs: what duration a cue NAME implies, owned in one place.
//
// Two readers need this and they must never disagree: generators/media/audio-bake.mjs writes the
// files, quality/gates/sfx-audit.mjs grades them. It lived in the gate, so the bake could not see it
// and wrote a voicing under an alias name unchanged: `click` was a byte-for-byte copy of `pluck` at
// 0.696s against a 0.15s cap. An alias must inherit the envelope its own name implies, not the one
// its target happens to have. Importing the gate from the generator made a cycle, and the gate runs
// its check at import, so the table moved here instead.
export const CLASSES = [
  // Cuelume's cues, grouped by what the cue is FOR. `press` is the tightest cap because the typing
  // sound design fires it every ~0.09s; a tail longer than that gap is how a typed line became a drone.
  [/^(press|click)$/,                 0.15, 'a keystroke fires every ~0.09s; longer and the train arrives'],
  // `key` is the soft typing tap: it carries a low body that rings a touch longer than a sharp click on
  // purpose (that body is what makes it pleasant, not buzzy). Still an event, not a bed, capped so it
  // cannot drone even when the default 24cps typing fires it every 0.042s.
  [/^key$/,                           0.24, 'a soft keystroke tap rings slightly for a legato train'],
  [/^(tick|release|toggle)$/,         0.60, 'a UI transient is an event, not a sound bed'],
  [/^(whoosh|whisper|droplet|pop|bloom|sparkle|page|loading)$/, 3.0, 'a transition cue rides one cut'],
  [/^(reveal|chime|success|error|ready)$/,                      5.0, 'a sting lands once'],
];

/** capFor(name) -> the seconds this name is allowed to sound for, or null when no class claims it. */
export const capFor = (name) => (CLASSES.find(([re]) => re.test(name)) || [])[1] ?? null;
