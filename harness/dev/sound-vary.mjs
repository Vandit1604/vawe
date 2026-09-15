// harness/dev/sound-vary.mjs: generate variations of a cue, judge them by ear, keep what survives.
//
// WHY VARY THE SPEC AND NOT THE SEED. A seed only redraws the noise; two seeds of one spec are the same
// sound twice. What makes a cue different is its shape: where it starts, how fast it moves, how long it
// rings. So each variant perturbs the PARAMETERS inside a range chosen per field, and the seed is left
// alone. A variant is therefore reproducible: `vary(name, i)` is a pure function.
//
// THE LOOP THIS SERVES. Round 1 judged the twenty shipped cues and found one rule the notes never said:
// every cue kept had ZERO noise layers (quality/baselines/sound-verdicts.json). That rule came out of sorting
// verdicts against specs, not out of anybody's opinion. This tool exists to run that loop again on a
// wider field: generate many, listen, keep few, then look at what the survivors have in common.
//
//   node harness/dev/sound-vary.mjs [--n 8] [--open]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CUES, renderCue, normalize, encodeWav } from '../../core/audio/kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'out/sound-vary');
const N = +(process.argv[process.argv.indexOf('--n') + 1] || 8);

// THE ROUND IS PART OF THE STORAGE KEY, and leaving it out cost a whole judging pass. Round 2's
// variants were `chime-1`, `chime-2` and so on; round 3 COMPOSES entirely different sounds and reuses
// those same ids, so every old verdict reattached itself to a sound nobody had heard. The page opened
// with most of it already marked, which reads as "already selected" and is worse than blank: it is a
// judgement that was never made, presented as one that was. Bump this whenever the generator changes.
const ROUND = 5;

// The dials worth turning, and the range each may move within. Chosen so a variant is a DIFFERENT sound
// of the same kind rather than a detuned copy or a different cue entirely. `frequency` is multiplicative
// because pitch is, and the range is a little under a fifth either way.
const DIALS = {
  frequency: (v, r) => v * (0.62 + r * 0.85),
  glideTo: (v, r) => v * (0.55 + r * 0.95),
  glideTime: (v, r) => v * (0.4 + r * 1.7),
  attack: (v, r) => Math.max(0.001, v * (0.35 + r * 2.2)),
  decay: (v, r) => v * (0.45 + r * 1.7),
  peak: (v, r) => Math.min(1, v * (0.55 + r * 0.95)),
};

// A tiny deterministic PRNG so variant i of cue X is always the same sound. Math.random is banned in
// this engine for exactly the reason it would be wrong here: a variant you liked must come back.
const prng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

// ---- ROUND 3: COMPOSE A DIFFERENT SOUND, DO NOT NUDGE THE SAME ONE ------------------------------
//
// Round 2 varied the DIALS on one voicing and the judgement was blunt: "you should give me variations,
// not the same type of sounds tweaked". The verdicts agreed with the complaint. Two cues had NOTHING
// survive across eight variants, and where variants did win they won narrowly, because a perturbed
// pitch or decay is the same sound slightly out of tune. Structure is what makes a sound different, and
// the dials never touched it.
//
// So a variant is now BUILT rather than perturbed: a number of partials, the interval between them, the
// waveform, the direction of the glide, and the envelope shape are each drawn from a small set of real
// choices. Two variants of `chime` can now be a struck bell and a soft two-note resolve, which is what
// "a variation" means.
//
// THE ONE RULE CARRIED FORWARD FROM ROUND 1, because it was measured rather than opined: every cue kept
// had ZERO noise layers, and the likelihood of rejection rose with the noise-layer count. So nothing
// here generates noise. That is a finding acting as a constraint, which is the only kind worth having.
// ROUND 4: THE SEARCH SPACE IS THE FINDING. Round 3 composed freely and the verdicts came back with one
// consistent shape across every dimension, so the space is narrowed to it rather than the rule being
// written in a comment nobody reads. Measured over 63 judgements (25 keep, 38 reject):
//
//     partials   1 partial won 56% of keeps; 2 and 3 partials were 82% of REJECTS
//     glide      64% of keeps had none; `up` was 45% of rejects
//     wave       sine 80% of keeps; triangle over-represented in rejects at 39%
//     interval   fifth (1.5) and third (1.25) kept; twelfth (3), 2.5 and two octaves (4) rejected
//     attack     keeps 0.005s, rejects 0.021s   (four times slower)
//     decay      keeps 0.174s, rejects 0.346s   (twice as long)
//
// In one line: short, fast, simple, sine, no glide, and if stacked at all then a NARROW interval.
//
// AND THE NUMBER THAT MATTERS MOST: the shipped hand-designed voicings were kept 6 of 7, while composed
// variants were kept 19 of 56. The generator was losing to the originals by a wide margin, which is not
// a reason to stop generating: it is the measurement that says where to look. A space that produces a
// third as many good sounds is searching the wrong region, and the table above says which region.
const WAVES = ['sine', 'sine', 'sine', 'triangle'];  // sine took 80% of keeps
const INTERVALS = [1.5, 1.25, 1.5, 1.26, 2];         // fifth and third dominate; the octave stays, barely
const SHAPES = [
  { attack: 0.001, decay: 0.09, peak: 0.30 },        // struck
  { attack: 0.002, decay: 0.14, peak: 0.24 },        // plucked
  { attack: 0.004, decay: 0.20, peak: 0.18 },        // rung, short
  { attack: 0.006, decay: 0.26, peak: 0.15 },        // rung, longer: the slowest that survived
];

// The root each cue lives near, so a variant stays recognisably that cue's job: punctuation sits high
// and short, an opening sits mid and long. Read off the shipped voicing rather than chosen.
const rootOf = (name) => {
  const l = (CUES[name].layers || []).find((x) => x.kind === 'tone');
  return l ? l.frequency : 880;
};

export function compose(name, i) {
  const rand = prng(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7919 + i * 104729);
  const S = SPACES[name] || {};
  const root = rootOf(name) * (0.8 + rand() * 0.5) * (S.high || 1);
  const partials = S.partials ? S.partials[Math.floor(rand() * S.partials.length)]
    : (rand() < 0.55 ? 1 : (rand() < 0.75 ? 2 : 3));
  const ratios = S.ratios || INTERVALS;
  const interval = ratios[Math.floor(rand() * ratios.length)];
  const wave = WAVES[Math.floor(rand() * WAVES.length)];
  const shapes = S.shapes ? S.shapes.map((k) => SHAPES[k]) : SHAPES;
  const shape = shapes[Math.floor(rand() * shapes.length)];
  // `glide` is a THRESHOLD test below, so a space's 0 means never and 0.6 means often. Written as the
  // probability it reads as, rather than as the raw comparison, because the comparison inverted once.
  const glide = S.glide === undefined ? rand() : (rand() < S.glide ? 1 : 0);
  const layers = [];
  for (let p = 0; p < partials; p++) {
    const f = root * Math.pow(interval, p);
    const layer = {
      kind: 'tone', waveform: p === 0 ? wave : 'sine', frequency: f,
      attack: shape.attack * (1 + p * 0.4),
      decay: shape.decay * (1 - p * 0.22),
      peak: shape.peak / (p + 1.6),
      offset: p * (S.spread || 0.012) * rand(),      // a stagger, so partials arrive as one event, not a chord
    };
    if (S.smooth) { layer.attack = Math.max(layer.attack, 0.02); }   // the note was "not smooth": no click
    // A GLIDE ON THE ROOT ONLY. Gliding every partial slides the whole harmonic stack and reads as a
    // tape warble rather than as a pitch move.
    if (p === 0 && glide > (S.glide === undefined ? 0.86 : 0.5)) {
      layer.glideTo = f * (S.dir === 'down' ? 0.66 : 1.5);
      layer.glideTime = shape.decay * 0.5;
    }
    layers.push(layer);
  }
  return { masterGain: CUES[name].masterGain ?? 0.5, layers };
}

// ---------------------------------------------------------------- WHERE THIS LOOP STOPS
// THREE CUES THE GENERATOR CANNOT REACH, and this is a result, not a to-do. `chime`, `sparkle` and
// `success` kept their hand-designed voicings through every round, and round 5 is the one that settles
// it: each was given its OWN search space, tuned to its job (chime got inharmonic bell ratios 2.0/2.4/
// 3.0 and the longest envelope; sparkle got three to five short high grains instead of a note), and
// each scored ZERO composed keeps out of seven while the shipped voicing was kept:
//
//     chime    shipped keep · composed 0 of 7
//     sparkle  shipped keep · composed 0 of 7
//     success  shipped keep · composed 0 of 7
//
// The movement family went the other way in the same round, 47 of 49 kept, so the loop works and it is
// not the judging. What separates them is that a whoosh is a shape (a band that moves) and this
// parameter space can express a shape, while a chime is a chord voiced by ear and the space can only
// pick ratios from a list. Running more rounds on these three is spending judgement to re-derive an
// answer already measured three times. If they are ever to improve it will be from a richer primitive
// (per-partial envelopes, a real inharmonic series), not from more search.
//
// ---------------------------------------------------------------- per-cue spaces (round 5)
// ROUND 4 KILLED THE GLOBAL RULE. Round 3's preference (1 partial, no glide, sine, short decay) was
// applied to every cue at once, and the result split hard: `pluck` went 3/9 to 8/9, and `chime` went
// 4/9 to 0 of 9. Both are correct. A pluck IS one short partial; a chime is a BELL, and a bell is its
// partials and its long decay, so the narrowing removed the two things that make it one. One space
// cannot serve seven jobs, which is what "RL it category wise" meant and what I did not do.
//
// So the space is per cue now. Where a cue has a measured preference it is written here; where it does
// not, the round-3 narrow default applies.
const SPACES = {
  pluck:   { partials: [1], shapes: [0, 1], glide: 0 },              // 8/9 in round 4: do not touch it
  chime:   { partials: [2, 3], shapes: [3], glide: 0, ratios: [2.0, 2.4, 3.0] },  // inharmonic: a bell is not a chord
  sparkle: { partials: [3, 4, 5], shapes: [0], glide: 0, spread: 0.05, high: 2.2 }, // 1/19 so far: a scatter of grains, not a note
  droplet: { partials: [1, 2], shapes: [1, 2], glide: 0.6, dir: 'down' },          // a droplet is a pitch FALLING
  bloom:   { partials: [2], shapes: [2, 3], glide: 0 },              // opens: slower and longer
  success: { partials: [3], shapes: [1, 2], glide: 0, ratios: [1.25, 1.5] },       // an arpeggio that resolves upward
  ready:   { partials: [2], shapes: [2, 3], glide: 0, smooth: true },              // note on the shipped one: "not smooth"
};

// ---------------------------------------------------------------- the movement family (round 5)
// EVERY ONE OF THESE WAS REJECTED, and the reason is one sentence: they are stacks of pitched partials
// with no noise in them. They were built that way because when they were built a noise layer's filter
// could not move (core/audio-kit.mjs), so a band could sit but never sweep, and round 1 had rejected
// every static band by ear. That verdict was read as "noise is bad" and written in as a constraint. It
// was never about noise. It was about this engine, and the engine can sweep now.
//
// The notes say the same thing three times: whoosh "move more to low end", riser "more to the low end",
// braam "sounds like bass". A tone stack has no air in it, so it reads as pitch where it should read as
// movement. Each entry below is band-passed noise whose CUTOFF sweeps, plus a tone only where the cue
// genuinely has a pitch (the riser's counter-sub, the drop's fundamental, the braam's stack).
//
// The spans are deliberately lower than the tone-stack versions they replace, because that is the note.
const MOVEMENT = {
  // an object PASSES: a band sweeping up, then a second sweeping down, overlapped so the join is one event
  whoosh: { pass: true, lo: [140, 260], hi: [700, 1500], Q: [1.4, 3.2], up: [0.24, 0.38], down: [0.16, 0.30], sub: [55, 80] },
  // a build INTO something: one band climbing, plus the sub that bends the other way so the low end stays
  riser:  { lo: [120, 200], hi: [900, 1700], Q: [2.0, 4.5], up: [0.7, 1.2], sub: [70, 95], subTo: [36, 46] },
  // arrives and STOPS. Top capped hard: the note on the last one was "ending too squeaky"
  swell:  { lo: [180, 300], hi: [900, 1600], Q: [1.6, 3.0], up: [0.5, 0.8], cut: true },
  // falls to the floor. The END is the number that matters: under 45Hz reads as a drop, 60Hz as a note
  drop:   { tone: [150, 260], toneTo: [28, 42], lo: [600, 1100], hi: [70, 130], Q: [1.2, 2.4], up: [0.7, 1.2] },
  // three bands, and the middle one is the step people leave out: without it an impact is a click on a thump
  impact: { hit: true, click: [2200, 4200], body: [55, 90], mid: [900, 1800], Q: [0.8, 2.0] },
  // WEIGHT, not a bass note. The note was "sounds like bass": it needs grit and beating, not more low
  braam:  { brass: true, root: [48, 78], detune: [6, 30], parts: [4, 6], grit: [260, 900], Q: [0.8, 2.0],
            bite: [0.10, 0.38], swell: [0.10, 0.45] },
};

const pick = (r, [a, b]) => a + r * (b - a);

export function composeMovement(name, i) {
  const M = MOVEMENT[name];
  const rand = prng(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 6151 + i * 92821);
  const layers = [];
  const noise = (f, to, Q, attack, decay, peak, offset = 0) => layers.push({
    kind: 'noise', filterType: 'bandpass', filterFrequency: f, filterGlideTo: to,
    filterGlideTime: attack + decay, filterQ: Q, attack, decay, peak, offset });

  if (M.pass) {
    const lo = pick(rand(), M.lo), hi = pick(rand(), M.hi), Q = pick(rand(), M.Q);
    const up = pick(rand(), M.up), down = pick(rand(), M.down);
    noise(lo, hi, Q, up, 0.05, 0.5);                       // approach: slow in, cut short at the pass
    noise(hi, lo * 1.5, Q, 0.03, down, 0.44, up * 0.9);    // departure, starting BEFORE the approach ends
    layers.push({ kind: 'tone', waveform: 'sine', frequency: pick(rand(), M.sub),
      attack: up * 0.8, decay: 0.12, peak: 0.16 });        // the low end the note asked for
  } else if (M.subTo) {
    const up = pick(rand(), M.up);
    noise(pick(rand(), M.lo), pick(rand(), M.hi), pick(rand(), M.Q), up, 0.10, 0.5);
    layers.push({ kind: 'tone', waveform: 'sine', frequency: pick(rand(), M.sub),
      glideTo: pick(rand(), M.subTo), glideTime: up, attack: up * 0.45, decay: 0.16, peak: 0.26 });
  } else if (M.cut) {
    const up = pick(rand(), M.up);
    noise(pick(rand(), M.lo), pick(rand(), M.hi), pick(rand(), M.Q), up, 0.02, 0.5);  // 20ms: it STOPS
  } else if (M.tone) {
    const up = pick(rand(), M.up);
    layers.push({ kind: 'tone', waveform: 'sine', frequency: pick(rand(), M.tone),
      glideTo: pick(rand(), M.toneTo), glideTime: up, attack: 0.01, decay: up * 0.7, peak: 0.5 });
    noise(pick(rand(), M.lo), pick(rand(), M.hi), pick(rand(), M.Q), 0.02, up * 0.7, 0.22);
  } else if (M.hit) {
    const Q = pick(rand(), M.Q);
    noise(pick(rand(), M.click), pick(rand(), M.click) * 0.6, Q, 0.001, 0.012, 0.42);
    layers.push({ kind: 'tone', waveform: 'sine', frequency: pick(rand(), M.body),
      glideTo: pick(rand(), M.body) * 0.6, glideTime: 0.14, attack: 0.004, decay: 0.15, peak: 0.5 });
    noise(pick(rand(), M.mid), pick(rand(), M.mid) * 0.35, Q, 0.006, 0.13, 0.2, 0.008);
  } else if (M.brass) {
    // A BRAAM IS NOT A BASS NOTE, which was the whole note on the last one. Three things separate them
    // and the first variants had only the first: a low fundamental (yes), detuned partials BEATING
    // against each other, and a band of grit that opens as the note swells. The beating is what the
    // brightness index cannot see and the ear cannot miss, so the detune spread is wide on purpose:
    // these eight variants are meant to disagree with each other, not to average.
    const root = pick(rand(), M.root), cents = pick(rand(), M.detune), n = Math.round(pick(rand(), M.parts));
    const swell = pick(rand(), M.swell);
    for (let k = 0; k < n; k++) layers.push({                // stacked fifths and octaves, each detuned
      kind: 'tone', waveform: k % 2 ? 'saw' : 'tri', frequency: root * [1, 1.5, 2, 3, 4, 6][k],
      detune: (k % 2 ? cents : -cents) * (1 + k * 0.3),      // the top of the stack beats hardest
      attack: swell + k * 0.03, decay: 0.9, peak: 0.30 / (k + 1.4) });
    const g = pick(rand(), M.grit);
    noise(g, g * 3.2, pick(rand(), M.Q), swell + 0.06, 0.7, pick(rand(), M.bite));
  }
  return { masterGain: CUES[name].masterGain ?? 0.5, layers };
}

export function vary(name, i) {
  const spec = structuredClone(CUES[name]);
  if (i === 0) return spec;                    // variant 0 is always the shipped voicing, as the control
  const rand = prng(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 977 + i * 31);
  for (const layer of spec.layers || []) {
    for (const [k, fn] of Object.entries(DIALS)) {
      if (typeof layer[k] === 'number') layer[k] = fn(layer[k], rand());
    }
  }
  return spec;
}

fs.mkdirSync(OUT, { recursive: true });
const names = Object.keys(CUES);
const made = [];
for (const n of names) {
  for (let i = 0; i < N; i++) {
    const id = `${n}-${i}`;
    // i === 0 is the shipped voicing, as the control. Everything above it is COMPOSED, not perturbed.
    const spec = i === 0 ? CUES[n] : (MOVEMENT[n] ? composeMovement(n, i) : compose(n, i));
    fs.writeFileSync(path.join(OUT, `${id}.wav`), encodeWav(normalize(renderCue(spec, 1))));
    made.push({ id, cue: n, i, spec });
  }
}

// EVERY VARIANT'S SPEC, WRITTEN DOWN. Round 3's verdicts became unmeasurable the moment the generator
// changed: the ids still existed but nothing could say what `chime-4` had been, so the one question
// worth asking (why did chime's four keeps work?) has no answer and never will. A round costs nothing
// to record and cannot be reconstructed afterwards.
fs.writeFileSync(path.join(OUT, `specs-r${ROUND}.json`),
  JSON.stringify(Object.fromEntries(made.map((m) => [m.id, m.spec])), null, 1));

// WHAT EACH CUE IS FOR, so a variant is judged against a job rather than in the abstract. "Is this a
// good sound" has no answer; "is this a good sound for a card landing" does. Taken from the cue's own
// comment in core/audio-kit.mjs and from where the engine actually places it (CUT_CUE and SEAM_CUE in
// core/audio-cues.js), never invented: a label that guesses would steer the judging wrongly.
const PURPOSE = {
  thud:    'something with weight ARRIVES. A card hitting its mark, a heavy panel landing. The trick is a low sine falling in pitch: the ear reads a falling fundamental as mass, which is why it works at 60Hz and not 600.',
  riser:   'a build INTO a moment. It has to END where the moment is, so it is placed by hand and led by RISER_LEAD. Judge it by whether it makes you expect something.',
  pluck:   'punctuation. A small element landing, a counter digit ticking over. Quiet on purpose: this is the one that becomes a machine gun if it is loud.',
  droplet: 'placed automatically on a `drop` or `zoom` cut. Something falls into place.',
  bloom:   'placed automatically on an `iris`, `softiris`, `rise` or `riseBlur` cut. Something OPENS.',
  chime:   'a small bright accent. Use where a moment resolves and you want it noticed, not announced.',
  sparkle: 'a scatter of light. Decoration rather than punctuation: it marks a surface, not an event.',
  success: 'a state landing well. The one cue with an explicit emotional job.',
  loading: 'a held, unresolved state. It has to be able to repeat without becoming irritating.',
  ready:   'a state resolving. The note on the shipped one was "not smooth", so listen for the join.',
};

const groups = names.map((n) => `<h2>${n}${CUES[n].layers?.some((l) => l.kind === 'noise') ? ' <em>carries noise</em>' : ''}</h2>
  <p class="purpose">${PURPOSE[n] || ''}</p>
  <div class="grid">${made.filter((m) => m.cue === n).map((m) => `
    <div class="v" data-id="${m.id}">
      <button class="play">▶ ${m.i === 0 ? 'shipped' : 'v' + m.i}</button>
      <div class="j"><button data-v="keep">✓</button><button data-v="reject">✕</button></div>
      <audio preload="none" src="${m.id}.wav"></audio>
    </div>`).join('')}</div>`).join('');

fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Sound variations</title><style>
:root{color-scheme:dark}
body{margin:0;padding:44px 26px 110px;font:15px/1.5 ui-sans-serif,system-ui,sans-serif;background:#0d1017;color:#eef1f7}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:1.35rem;margin:0 0 6px;letter-spacing:-.02em}
p.lede{color:#9aa3b7;max-width:64ch;margin:0 0 26px}
h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8b93a8;margin:26px 0 9px}
h2 em{color:#c98b3a;font-style:normal;text-transform:none;letter-spacing:0;font-size:11px}
.purpose{color:#9aa3b7;font-size:13px;margin:0 0 10px;max-width:74ch;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.v{border:1px solid #232a3a;border-radius:10px;background:#141926;padding:9px;display:flex;
   flex-direction:column;gap:7px}
.v.keep{border-color:#2f9e5f;background:#122018}
.v.reject{border-color:#9e3f3f;background:#1e1315;opacity:.5}
.play{background:#1b2233;border:1px solid #2c3547;color:#eef1f7;border-radius:7px;padding:7px;cursor:pointer;font-size:12px}
.j{display:flex;gap:6px}
.j button{flex:1;padding:5px;border-radius:6px;border:1px solid #2c3547;background:transparent;color:#aab2c4;cursor:pointer}
.j button[aria-pressed=true]{background:#2563eb;border-color:#2563eb;color:#fff}
.bar{position:fixed;left:0;right:0;bottom:0;padding:13px 26px;background:#0d1017ee;border-top:1px solid #232a3a;
     display:flex;gap:14px;align-items:center;backdrop-filter:blur(8px)}
.bar button{padding:9px 16px;border-radius:9px;border:0;background:#2563eb;color:#fff;font:600 13px ui-sans-serif;cursor:pointer}
.bar .ghost{background:transparent;border:1px solid #2c3547;color:#9aa3b7}
#hint{color:#6f7a90;font-size:12px;margin-left:auto}
.v.sel{outline:2px solid #2563eb;outline-offset:2px}
#t{color:#9aa3b7;font-size:13px}
</style><div class="wrap">
<h1>Sound variations</h1>
<p class="lede">${made.length} variants across ${names.length} cues. Variant 0 of each is the shipped
voicing, as a control. Keep the ones you would actually use and reject the rest: what the survivors have
in common is the finding, the same way round one found that every cue you kept had no noise in it.</p>
${groups}</div>
<div class="bar"><button id="copy">Copy verdicts</button><button id="clear" class="ghost">Clear all</button>
<span id="t"></span><span id="hint">click a card then use <b>K</b> keep · <b>R</b> reject · <b>space</b> replay</span></div>
<script>
const KEY='vawe-sound-variations-r${ROUND}';
const st=JSON.parse(localStorage.getItem(KEY)||'{}');
function paint(){
  document.querySelectorAll('.v').forEach(v=>{
    const s=st[v.dataset.id];
    v.className='v'+(s?' '+s:'');
    v.querySelectorAll('.j button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===s)));
  });
  const n=Object.keys(st).length, k=Object.values(st).filter(x=>x==='keep').length;
  document.getElementById('t').textContent=n+' judged, '+k+' kept, of ${made.length}';
}
document.addEventListener('click',e=>{
  const v=e.target.closest('.v'); if(!v) return;
  if(e.target.matches('.play')){const a=v.querySelector('audio');a.currentTime=0;a.play();return;}
  const d=e.target.dataset.v; if(!d) return;
  st[v.dataset.id]= st[v.dataset.id]===d ? undefined : d;
  if(!st[v.dataset.id]) delete st[v.dataset.id];
  localStorage.setItem(KEY,JSON.stringify(st)); paint();
});
let cur=null;
document.addEventListener('click',e=>{
  const v=e.target.closest('.v'); if(!v) return;
  document.querySelectorAll('.v.sel').forEach(x=>x.classList.remove('sel'));
  v.classList.add('sel'); cur=v;
});
document.addEventListener('keydown',e=>{
  if(!cur) return;
  const k=e.key.toLowerCase();
  if(k===' '){ e.preventDefault(); const a=cur.querySelector('audio'); a.currentTime=0; a.play(); return; }
  if(k!=='k'&&k!=='r') return;
  const d=k==='k'?'keep':'reject';
  st[cur.dataset.id]= st[cur.dataset.id]===d ? undefined : d;
  if(!st[cur.dataset.id]) delete st[cur.dataset.id];
  localStorage.setItem(KEY,JSON.stringify(st)); paint(); cur.classList.add('sel');
});
document.getElementById('clear').onclick=()=>{
  if(!confirm('Clear every verdict in this round?')) return;
  for(const k of Object.keys(st)) delete st[k];
  localStorage.setItem(KEY,JSON.stringify(st)); paint();
};
document.getElementById('copy').onclick=async()=>{
  await navigator.clipboard.writeText(JSON.stringify(st,null,1));
  document.getElementById('copy').textContent='copied';
  setTimeout(()=>document.getElementById('copy').textContent='Copy verdicts',1200);
};
paint();
</script>`);

console.log(`\n  ${made.length} variants across ${names.length} cues → out/sound-vary/index.html`);
console.log('  Variant 0 of each is the shipped voicing, as a control.\n');
if (process.argv.includes('--open')) execFileSync('open', [path.join(OUT, 'index.html')]);
