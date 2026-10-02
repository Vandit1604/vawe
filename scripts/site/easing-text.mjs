// The words on /easing/<slug>: what each ease is for, and when to leave it alone. Plain data; the
// numbers on the page come from scripts/site/easing.mjs, never from here.

export const VAWE_TEXT = {
  land: {
    blurb: 'An entrance: it leaves fast and arrives on a long, soft stop.',
    use: ['Entrances of titles, cards and panels from 0.4 to 0.9 s. It is the default of enter().', 'A move that must read as arriving: the eye catches the fast start and rests on the stop.'],
    avoid: ['Moves under 0.4 s: the first frame jumps about a quarter of the way. Use land-soft there.', 'Exits and loops. It ends on a dead stop and starts at full speed, so it does not chain.'],
  },
  'land-soft': {
    blurb: 'An entrance for short moves: a gentler start than land, the same long stop.',
    use: ['Entrances of 0.15 to 0.4 s: list rows, labels, small UI.', 'Staggered groups, where a hard first frame on every item reads as flicker.'],
    avoid: ['Hero moves over 0.6 s. The softer start loses the punch that land has.', 'Exits. Use launch or leave.'],
  },
  settle: {
    blurb: 'A heavy move that eases at both ends, with long dead stops.',
    use: ['Big or heavy objects crossing the frame in 0.5 to 1 s: panels, full-width bars, device frames.', 'Moves that start from rest and end at rest, where land would feel too fast at the start.'],
    avoid: ['Small, quick UI. Both ends are slow, so a 0.2 s move spends most of it standing still.', 'Anything that must start the instant the viewer looks: the first frames barely move.'],
  },
  swap: {
    blurb: 'A snappy swap: the value waits at each key and the change happens in the middle.',
    use: ['Replacing one thing with another: a label, a number, a tab, a crop.', 'Camera cuts on the move, where you want a crisp hit and a hold on both sides.'],
    avoid: ['Long travel. The middle is steep, so a big distance becomes a blur.', 'Slow, floating motion. It is the opposite of a drift.'],
  },
  glide: {
    blurb: 'A slow drift: it starts gently and never quite comes to a stop.',
    use: ['Camera pushes and slow scale on a held shot, over 2 s or more.', 'A background layer behind a still title, where motion must be felt and not followed.'],
    avoid: ['Entrances. There is no clear arrival, so the viewer cannot tell when the thing has landed.', 'Short moves. The slow tail needs time to be seen.'],
  },
  carry: {
    blurb: 'It starts gently and is still moving fast at the end, so the next key can carry on.',
    use: ['A move that runs into a cut or a wipe, where the speed should pass to the next shot.', 'Carousels and orbits with keys one after another.'],
    avoid: ['A move that must come to rest. It ends at speed and looks cut off.', 'Moves with no next move to take the speed.'],
  },
  leave: {
    blurb: 'A decelerating exit: it eases away and slows into its end.',
    use: ['Exits of panels and labels that should settle out of the frame rather than snap away.', 'Real exits: in the After Effects data most tuned exits end on this shape.'],
    avoid: ['Exits that must clear the frame fast. It is slow at the end. Use launch.', 'Entrances. It is built to finish, not to start.'],
  },
  launch: {
    blurb: 'An accelerating exit: it starts gently and speeds up, at most 3x average at the cut.',
    use: ['Exits shorter than the entrance (about 0.6 of it), where the element should be gone before the eye follows it.', 'Wipes and clears that hand the frame to the next beat.'],
    avoid: ['Any move that has to land. It ends at speed.', 'Exits the viewer should watch. Real exits in the data slow down at the end; use leave.'],
  },
  pop: {
    blurb: 'A pop: a fast start, then it passes its mark by about 15 per cent and settles back.',
    use: ['A call to action, a check mark, a notification: one small thing that must feel alive.', 'Scale and position of a single focal element.'],
    avoid: ['Text blocks and anything with more than one item moving: overshoot on many things reads as shaking.', 'Opacity. A value past 1 is clamped, so the overshoot does nothing.'],
  },
};

export const FAMILY = {
  sine: { feel: 'The gentlest family: the speed changes slowly, so it reads as breathing, not as a hit.', use: 'ambient loops, slow camera drift and background layers', avoid: 'moves that must hit hard: the gentle stop looks undecided' },
  quad: { feel: 'A mild, even curve: a clear ease without drama.', use: 'small UI changes and hover states where a light ease is enough', avoid: 'hero moves: the stop is too soft to feel designed' },
  cubic: { feel: 'The usual default curve: a firm start or stop that most viewers read as natural.', use: 'general UI and card moves between 200 and 500 ms', avoid: 'long travel across the frame: the stop is abrupt for the distance' },
  quart: { feel: 'A strong ease: most of the travel happens in the fast section.', use: 'panels and overlays that need a clear stop', avoid: 'short moves under 150 ms: the slow part is too short to see' },
  quint: { feel: 'A very strong ease: the curve is almost a wall at the fast end.', use: 'hero entrances and large elements that should settle with weight', avoid: 'small elements: they seem to teleport and then crawl' },
  expo: { feel: 'An extreme ease: the speed changes by orders of magnitude, so one tenth of the time carries most of the travel.', use: 'a title or number that must snap in and then rest', avoid: 'anything the viewer must follow with the eye: the fast section is too short to track' },
  circ: { feel: 'A geometric curve: it starts or stops almost vertically, like a wall.', use: 'mechanical moves and wipes with a hard edge', avoid: 'soft, organic motion: the stop feels cut' },
};

export const DIRECTION = {
  in: { role: 'It starts slowly and ends fast.', use: 'exits and build-ups that leave the frame at speed', avoid: 'entrances: the first frames barely move, so the viewer waits' },
  out: { role: 'It starts fast and ends slowly.', use: 'entrances and replies to a click, where the thing should respond at once and then settle', avoid: 'loops: it stops dead at the end and has no speed to hand on' },
  inOut: { role: 'It is slow at both ends and fast in the middle.', use: 'moves between two resting positions: camera pushes, slides and loops', avoid: 'quick UI feedback under 200 ms: the slow start delays the response' },
};

// back, elastic and bounce are written by hand: the direction decides what they do.
export const SPECIAL = {
  'ease-in-back': { feel: 'It pulls back below its start, then launches.', use: ['An exit that winds up first: the element pulls back, then goes.', 'A button press or a throw, where the pull-back is the message.'], avoid: ['Entrances. The element first moves the wrong way and the viewer sees a glitch.', 'Opacity: a value below 0 is clamped, so the wind-up is lost.'] },
  'ease-out-back': { feel: 'It passes its end value, then settles back.', use: ['A card or badge that arrives and overshoots its place, then settles.', 'Playful UI: toggles, chips and toasts.'], avoid: ['Text blocks and tables: the overshoot reads as a layout error.', 'Opacity: a value above 1 is clamped, so the overshoot does nothing. Use pop on scale.'] },
  'ease-in-out-back': { feel: 'It pulls back at the start and passes the end, then settles.', use: ['A move with a wind-up and an overshoot: a mascot, a sticker, a toy-like object.'], avoid: ['Anything formal: the element moves backward at both ends.'] },
  'ease-in-elastic': { feel: 'It rings around its start, then jumps to the end.', use: ['A charge-up before a release, shown on one element.'], avoid: ['Entrances and exits that must read cleanly: the element swings before it moves.'] },
  'ease-out-elastic': { feel: 'It jumps to the end and rings around it like a rubber band.', use: ['A single logo or badge that lands with a wobble, for a game or a kids brand.'], avoid: ['Text, lists and most product UI: the ringing lasts too long, and it needs 0.8 s or more to be seen.'] },
  'ease-in-out-elastic': { feel: 'It rings at both ends and crosses in the middle.', use: ['A toy-like transition on one object.'], avoid: ['Everything with more than one moving part: the ringing at both ends doubles the noise.'] },
  'ease-in-bounce': { feel: 'It hops with growing height, then leaves fast.', use: ['A wind-up with hops before a fast exit, in a playful film.'], avoid: ['Anything that must look clean: the hops at the start look like frame drops.'] },
  'ease-out-bounce': { feel: 'It drops to the end and rebounds with shrinking hops.', use: ['An object that drops into place and rebounds: a ball, a coin, a sticker.'], avoid: ['UI that should feel quick: the rebounds hold the final value back for most of the move.'] },
  'ease-in-out-bounce': { feel: 'It hops at both ends and crosses in the middle.', use: ['A toy-like pass across the frame that hops at both ends.'], avoid: ['Nearly everything else: two sets of hops make one clean move impossible.'] },
};

export const CSS_TEXT = {
  linear: {
    blurb: 'The straight line: constant speed from start to end.',
    use: ['Rotation spins, progress bars and loops, where a steady speed is the point.', 'Opacity cross-fades between two shots.'],
    avoid: ['Moving a thing across the screen: it starts and stops with no ease, so it reads as mechanical.', 'Any entrance or exit over 0.3 s. Use an EASE name from vawe.'],
  },
  ease: {
    blurb: 'The CSS default: a quick start and a long, soft end.',
    use: ['A first pass on a UI change when you have not chosen a curve.', 'Hover and focus changes under 300 ms.'],
    avoid: ['Film moves over 0.3 s: it is the browser default, not a choice. Use land or settle.', 'Loops. It ends slowly and starts fast, so a repeat shows a seam.'],
  },
  'ease-in': {
    blurb: 'The CSS ease-in keyword: slow start, fast end, with no soft stop.',
    use: ['An element leaving the screen, where it should be fastest as it goes.', 'A build-up before a cut.'],
    avoid: ['Entrances: the start is slow and the viewer waits.', 'A move that must end at rest: it stops dead at full speed.'],
  },
  'ease-out': {
    blurb: 'The CSS ease-out keyword: fast start, slow end.',
    use: ['Entrances and replies to a click, where the response should be at once.', 'Short UI moves of 150 to 300 ms.'],
    avoid: ['Moves over 0.5 s: the long slow tail looks like the element is stuck.', 'Exits: it is slowest as the element leaves.'],
  },
  'ease-in-out': {
    blurb: 'The CSS ease-in-out keyword: slow at both ends, fast in the middle.',
    use: ['Moves between two resting positions: a slide, a camera push, a toggle.', 'Looping back-and-forth motion.'],
    avoid: ['Quick UI feedback: the slow start delays the response.', 'Film entrances. Land gives a clearer arrival.'],
  },
};
