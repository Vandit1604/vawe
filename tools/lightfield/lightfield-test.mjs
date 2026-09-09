// tools/lightfield/lightfield-test.mjs: the contract, as runnable assertions.
//
//   node tools/lightfield/lightfield-test.mjs
//
// Determinism and failing early are claims, and a claim nobody runs is a comment. These are the two
// properties the generator is for, so they are checked first and loudest.

import { createHash } from 'node:crypto';
import { lightfield, PATTERNS, MOTIONS, DIRECTIONS } from '../../core/lightfield/index.js';
import { PRESETS } from '../../core/lightfield/presets.js';

let failures = 0;
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

function ok(name, cond, detail = '') {
  if (cond) return console.log(`  pass  ${name}`);
  failures++;
  console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`);
}

function throws(name, fn, mustSay) {
  try {
    fn();
  } catch (e) {
    return ok(name, e.message.includes(mustSay), `message was "${e.message}"`);
  }
  failures++;
  console.log(`  FAIL  ${name}  it returned instead of throwing`);
}

console.log('determinism');
for (const [name, opts] of Object.entries(PRESETS)) {
  const a = lightfield(opts);
  const b = lightfield(structuredClone(opts));
  ok(`${name}: same options twice give byte-identical output`, a === b, `${sha(a)} vs ${sha(b)}`);
  console.log(`        ${name} sha256:16 ${sha(a)}  ${a.length} bytes`);
}
ok('a different seed gives different output', lightfield({ seed: 1 }) !== lightfield({ seed: 2 }));
ok('an omitted option set equals the explicit defaults', lightfield() === lightfield({}));

console.log('\nfail early');
throws('unknown top-level key', () => lightfield({ patern: {} }), 'unknown option patern');
throws('unknown key inside a group', () => lightfield({ pattern: { knd: 'slats' } }), 'unknown option pattern.knd');
throws('a bad colour', () => lightfield({ colour: { bloom: 'orange' } }), 'colour.bloom must be a 6-digit hex');
throws('a bad colour in the extra list', () => lightfield({ colour: { extra: ['#112233', 'teal'] } }), 'colour.extra[1] must be a 6-digit hex');
throws('an extra list that is not a list', () => lightfield({ colour: { extra: '#112233' } }), 'colour.extra must be an array');
throws('too many extra colours', () => lightfield({ colour: { extra: ['#111111', '#222222', '#333333', '#444444', '#555555'] } }), 'colour.extra takes at most 4');
throws('a short hex', () => lightfield({ colour: { bloom: '#f80' } }), 'colour.bloom must be a 6-digit hex');
throws('a dial out of range', () => lightfield({ shadow: { depth: 1.4 } }), 'shadow.depth must be between 0 and 1');
throws('the retired relief dial', () => lightfield({ shadow: { relief: 0.5 } }), 'unknown option shadow.relief');
throws('vivid out of range', () => lightfield({ colour: { vivid: 3 } }), 'colour.vivid must be between 0.5 and 2');
throws('a count out of range', () => lightfield({ pattern: { count: 0 } }), 'pattern.count must be between 1 and 400');
throws('a fractional count', () => lightfield({ pattern: { count: 8.5 } }), 'pattern.count must be a whole number');
throws('an unknown pattern', () => lightfield({ pattern: { kind: 'stripes' } }), 'pattern.kind must be one of');
throws('an unknown direction', () => lightfield({ shadow: { direction: 'up' } }), 'shadow.direction must be one of');
throws('a group given a string', () => lightfield({ colour: '#ff0000' }), 'colour must be an object');
throws('options given an array', () => lightfield([]), 'options must be a plain object');
throws('a signed dial past its range', () => lightfield({ shadow: { seam: -1.2 } }), 'shadow.seam must be between -1 and 1');
throws('a signed dial given a string', () => lightfield({ shadow: { sheen: 'bright' } }), 'shadow.sheen must be a number from -1 to 1');
throws('a bad shade colour', () => lightfield({ colour: { shade: '#12' } }), 'colour.shade must be a 6-digit hex');
throws('an unknown envelope shape', () => lightfield({ envelope: { kind: 'sawtooth' } }), 'envelope.kind must be one of');
throws('an unknown envelope key', () => lightfield({ envelope: { phase: 0.5 } }), 'unknown option envelope.phase');
// A dial no structure can honour must SAY so. Accepting it and then ignoring it is the silent
// substitution this whole option table exists to prevent.
throws('rings given an envelope', () => lightfield({ pattern: { kind: 'rings' }, envelope: { kind: 'ramp' } }),
  'pattern.kind "rings" does not honour envelope');
throws('rings given a seam width', () => lightfield({ pattern: { kind: 'rings' }, shadow: { seamWidth: 0.5 } }),
  'pattern.kind "rings" does not honour shadow.seamWidth');
throws('shards given an anchor they cannot use', () => lightfield({ pattern: { kind: 'shards' }, envelope: { anchor: 'top' } }),
  'pattern.kind "shards" does not honour envelope.anchor');

console.log('\nrender contract');
const all = [];
for (const kind of PATTERNS) for (const motion of MOTIONS) all.push(lightfield({ pattern: { kind }, motion: { kind: motion } }));
for (const direction of DIRECTIONS) all.push(lightfield({ shadow: { direction } }));
ok('every pattern, motion and direction builds', all.length === PATTERNS.length * MOTIONS.length + DIRECTIONS.length);
ok('no CSS keyframe anywhere', !all.some((h) => /@keyframes|animation\s*:/.test(h)));
ok('no CSS transition anywhere', !all.some((h) => /transition\s*:/.test(h)));
for (const kind of MOTIONS) {
  const html = lightfield({ motion: { kind } });
  const moves = html.includes('var(--t)');
  ok(`motion "${kind}" ${kind === 'still' ? 'reads no clock' : 'is a function of var(--t)'}`, kind === 'still' ? !moves : moves);
}
ok('speed 0 is as still as still', !lightfield({ motion: { speed: 0 } }).includes('var(--t)'));
ok('two fields on one page cannot collide', lightfield({ seed: 1 }).match(/\.lf\w+\{/)[0] !== lightfield({ seed: 2 }).match(/\.lf\w+\{/)[0]);
ok('vivid 1 emits no filter at all', !lightfield({ colour: { vivid: 1 } }).includes('filter:'));
ok('depth 0 emits no shadow layer', !lightfield({ shadow: { depth: 0 } }).includes('class="s"'));
ok('seams multiply, so a dark line cannot go grey', lightfield().includes('mix-blend-mode:multiply'));
ok('faces dodge, so a lit face cannot go white and black stays black', lightfield().includes('mix-blend-mode:color-dodge'));
ok('sheen 0 emits no lit layer at all', !lightfield({ shadow: { sheen: 0 } }).includes('color-dodge'));

console.log('\npolarity, envelope, taper and fill');
// The sign is the polarity, and the proof is which blend layer the cell lands in. With only a seam
// and no face there is exactly one layer, so the test cannot be fooled by the other one.
const onlySeam = (seam) => lightfield({ shadow: { seam, sheen: 0 } });
ok('a positive seam is a DARK line: it goes to the multiply layer',
  onlySeam(0.6).includes('multiply') && !onlySeam(0.6).includes('color-dodge'));
ok('a negative seam is a BRIGHT line: the same cell goes to the dodge layer',
  onlySeam(-0.6).includes('color-dodge') && !onlySeam(-0.6).includes('multiply'));
ok('seam 0 emits no seam layer at all', !onlySeam(0).includes('<i '));
const onlyFace = (sheen) => lightfield({ shadow: { seam: 0, sheen } });
ok('a negative sheen makes the element a silhouette, in the multiply layer',
  onlyFace(-0.8).includes('multiply') && !onlyFace(-0.8).includes('color-dodge'));
ok('sign flips the layer without changing the geometry', (() => {
  const box = (h) => [...h.matchAll(/left:[\d.]+%;width:[\d.]+%/g)].map((m) => m[0]).join('|');
  return box(onlySeam(0.6)) === box(onlySeam(-0.6));
})());
ok('seamWidth scales the line', (() => {
  const wide = onlySeam(0.6).match(/width:([\d.]+)%/)[1];
  const thin = lightfield({ shadow: { seam: 0.6, sheen: 0, seamWidth: 0.07 } }).match(/width:([\d.]+)%/)[1];
  return Number(thin) < Number(wide) / 3;
})());

ok('the default envelope emits full-height elements', lightfield().includes('top:-2%;height:104%'));
ok('a ramp envelope makes the extent depend on position', (() => {
  const hs = [...lightfield({ envelope: { kind: 'ramp' } }).matchAll(/height:([\d.]+)%/g)].map((m) => Number(m[1]));
  // A ramp rises, so the last element must clear the first by most of the frame.
  return hs.length > 4 && hs[hs.length - 1] - hs[0] > 60;
})());
ok('from above to runs the same shape backwards', (() => {
  const hs = (o) => [...lightfield(o).matchAll(/height:([\d.]+)%/g)].map((m) => Number(m[1]));
  const up = hs({ envelope: { kind: 'ramp', from: 0, to: 1 } });
  const down = hs({ envelope: { kind: 'ramp', from: 1, to: 0 } });
  return up[up.length - 1] > up[0] && down[down.length - 1] < down[0];
})());
ok('anchor decides which edge an element grows from', (() => {
  const o = { kind: 'ramp', from: 0.2, to: 0.4 };
  return lightfield({ envelope: { ...o, anchor: 'top' } }).includes('top:-2%')
    && !lightfield({ envelope: { ...o, anchor: 'bottom' } }).includes('top:-2%;height:2');
})());
ok('taper 0 emits no clip-path', !lightfield().includes('clip-path'));
ok('taper narrows the element towards its free end', lightfield({ envelope: { taper: 0.8 } }).includes('clip-path:polygon'));
ok('envelope softness 0 emits no mask', !lightfield().includes('mask-image'));
ok('envelope softness fades the free end', lightfield({ envelope: { softness: 0.4 } }).includes('mask-image:linear-gradient(0deg'));
ok('a shards field with an envelope shortens its rays',
  /height:1[0-9.]+vmax/.test(lightfield({ pattern: { kind: 'shards' }, envelope: { kind: 'ramp', from: 0.05, to: 0.1 } })));

console.log('\nround shapes');
// The silhouette as a curve, read back out of the markup. `mass` samples the envelope at 180 columns
// and writes `top:${102 - 104 * ext}%`, so this recovers the extent the shape asked for, exactly.
// jitter 0 kills both the per-element jitter and the ridge noise, so nothing random is in the number.
const curveOf = (kind, extra = {}) => {
  const h = lightfield({ envelope: { kind, from: 0, to: 1, jitter: 0, mass: 0.9, ...extra } });
  return [...h.match(/<div class="r">([\s\S]*?)<\/div>/)[1].matchAll(/top:([-0-9.]+)%/g)]
    .map((m, i) => ({ u: (i + 0.5) / 180, ext: (102 - Number(m[1])) / 104 }));
};
for (const kind of ['circle', 'crescent', 'scallops', 'hills']) {
  ok(`${kind} is a legal envelope kind and draws a silhouette`, curveOf(kind).length === 180);
}
ok('an unknown round-sounding kind still throws and lists every shape', (() => {
  try { lightfield({ envelope: { kind: 'sphere' } }); } catch (e) {
    return e.message.includes('"circle"') && e.message.includes('"hills"');
  }
  return false;
})());
ok('circle is an EXACT circular arc: every sample satisfies x squared plus y squared = 1', (() => {
  // Not "close to a hump": the curve is measured against the circle's own equation, and the only
  // slack allowed is the three decimal places the markup is printed to.
  return curveOf('circle').every(({ u, ext }) => Math.abs((2 * u - 1) ** 2 + ext * ext - 1) < 0.002);
})());
ok('circle is symmetric about its centre', (() => {
  const c = curveOf('circle');
  return c.every((p, i) => Math.abs(p.ext - c[179 - i].ext) < 0.002);
})());
ok('circle is NOT arch: a sine hump leaves the baseline at a slope and a circle leaves it upright', (() => {
  const c = curveOf('circle'), a = curveOf('arch');
  // Same peak, and a circle is fatter everywhere else, most of all near the edges.
  return Math.abs(c[89].ext - a[89].ext) < 0.01 && c[4].ext - a[4].ext > 0.2;
})());
ok('crescent is a lune: it is empty on one side and rises to a horn on the other', (() => {
  const c = curveOf('crescent');
  const peak = c.reduce((m, p) => (p.ext > m.ext ? p : m));
  // Nothing at all in the left third, the horn past the middle, and diving back to the baseline at
  // the far edge. It does not reach 0 in the last column, and it should not: both edges of a lune are
  // circles, so it comes down VERTICALLY, and the last sample is taken half a column short of the end.
  return c.slice(0, 60).every((p) => p.ext < 0.01) && peak.u > 0.5 && peak.ext > 0.99
    && c[179].ext < 0.2 && c[179].ext < peak.ext / 5;
})());
ok('scallops is five arcs, so the row is symmetric and has five summits', (() => {
  const c = curveOf('scallops');
  const tops = c.filter((p, i) => i > 0 && i < 179 && p.ext >= c[i - 1].ext && p.ext > c[i + 1].ext);
  return tops.length === 5 && c.every((p, i) => Math.abs(p.ext - c[179 - i].ext) < 0.01);
})());
ok('hills is three unequal summits, none of them a repeat of another', (() => {
  const c = curveOf('hills');
  const tops = c.filter((p, i) => i > 0 && i < 179 && p.ext >= c[i - 1].ext && p.ext > c[i + 1].ext);
  return tops.length === 3 && new Set(tops.map((p) => p.ext.toFixed(2))).size === 3;
})());
ok('every round kind reaches 1 at its ceiling, so `from` and `to` mean the same thing for all of them',
  ['circle', 'crescent', 'scallops', 'hills'].every((k) => {
    const top = Math.max(...curveOf(k).map((p) => p.ext));
    return top > 0.99 && top <= 1.0001;
  }));

console.log('\nplacement: where the light is, where the dark is, where the mass is');
ok('the envelope origin defaults to the unmoved silhouette', (() => {
  const both = { kind: 'circle', from: 0.2, to: 0.9, mass: 0.8 };
  return lightfield({ envelope: { ...both, originX: 50, originY: 50 } }) === lightfield({ envelope: both });
})());
ok('envelope originX slides the crest across the frame', (() => {
  const crest = (originX) => curveOf('circle', { originX }).reduce((m, p) => (p.ext > m.ext ? p : m)).u;
  return Math.abs(crest(50) - 0.5) < 0.01 && Math.abs(crest(75) - 0.75) < 0.01;
})());
ok('envelope originY moves the silhouette DOWN the frame from either anchor', (() => {
  // The free edge is the top of a bottom-anchored mass and the bottom of a top-anchored one, and
  // raising originY has to push both of them down the frame or the dial means two things.
  const edge = (anchor, originY) => {
    const h = lightfield({ envelope: { kind: 'circle', from: 0, to: 0.8, jitter: 0, mass: 0.9, anchor, originY } });
    const tops = [...h.match(/<div class="r">([\s\S]*?)<\/div>/)[1].matchAll(/top:([-0-9.]+)%;height:([0-9.]+)%/g)];
    return anchor === 'top'
      ? Math.max(...tops.map((m) => Number(m[1]) + Number(m[2])))   // the bottom of the tallest column
      : Math.min(...tops.map((m) => Number(m[1])));                 // the top of the tallest column
  };
  return edge('bottom', 70) > edge('bottom', 50) && edge('top', 70) > edge('top', 50);
})());
ok('the shadow origin defaults to the unmoved fall, in every direction family', (() => {
  const at = (d, o) => lightfield({ shadow: { depth: 0.6, direction: d, ...o } });
  return ['center', 'top-and-bottom', 'left-and-right', 'bottom', 'top-left']
    .every((d) => at(d, {}) === at(d, { originX: 50, originY: 50 }));
})());
ok('shadow origin moves the centre of a radial fall', (() => {
  const h = lightfield({ shadow: { depth: 0.6, direction: 'center', originX: 20, originY: 75 } });
  return h.includes('radial-gradient(72% 82% at 20% 75%');
})());
ok('shadow origin moves the LIT BAND of a paired fall along its own axis', (() => {
  const band = (originY) => {
    const s = lightfield({ shadow: { depth: 0.6, direction: 'top-and-bottom', originY } })
      .match(/\.s\{[^}]*background:linear-gradient\(180deg,([^}]*)\)\}/)[1];
    const clear = [...s.matchAll(/rgba\(\d+,\d+,\d+,0\) ([\d.]+)%/g)].map((m) => Number(m[1]));
    return (clear[0] + clear[1]) / 2;
  };
  return Math.abs(band(50) - 50) < 0.01 && Math.abs(band(72) - 72) < 0.01;
})());
ok('shadow origin shifts where a one-way fall BEGINS, along the fall', (() => {
  const start = (o) => Number(lightfield({ shadow: { depth: 0.6, direction: 'bottom', ...o } })
    .match(/linear-gradient\(180deg, rgba\(\d+,\d+,\d+,0\) ([\d.]+)%/)[1]);
  // `bottom` means the dark is below, so pushing the dark further down delays the fall.
  return start({ originY: 80 }) - start({}) > 25 && start({ originY: 20 }) < start({});
})());
ok('the vignette under a one-way fall takes the WHOLE vector, including the part the line cannot', (() => {
  const h = lightfield({ shadow: { depth: 0.6, direction: 'bottom', originX: 30 } });
  return h.includes('radial-gradient(76% 88% at 30% 46%');
})());
ok('a shadow origin off the scale throws and names itself',
  (() => { try { lightfield({ shadow: { originX: 400 } }); } catch (e) { return e.message.includes('shadow.originX must be between -50 and 150'); } return false; })());
ok('an envelope origin off the scale throws and names itself',
  (() => { try { lightfield({ envelope: { originY: -80 } }); } catch (e) { return e.message.includes('envelope.originY must be between -50 and 150'); } return false; })());

ok('shade #000000 is the exact no-op and emits no fill layer', !lightfield().includes('class="sh"'));
ok('a shade colour screens a cool fill under the pattern', (() => {
  const h = lightfield({ colour: { shade: '#04060f' } });
  return h.includes('mix-blend-mode:screen;background:#04060f') && h.includes('<div class="sh">')
    // Fill is light, so the blind occludes it: it must sit ABOVE the field and BELOW the pattern.
    && h.indexOf('class="f"') < h.indexOf('class="sh"') && h.indexOf('class="sh"') < h.indexOf('class="d"');
})());
ok('a slat moves as ONE: its seam and its face take the same transform', (() => {
  const html = lightfield({ pattern: { count: 6 }, motion: { kind: 'shimmer' } });
  const move = (tag) => [...html.matchAll(new RegExp(`<div class="${tag}">([\\s\\S]*?)</div>`, 'g'))]
    .flatMap((m) => [...m[1].matchAll(/translateX\(calc\(([^)]*\))/g)].map((x) => x[1]));
  const d = move('d'), l = move('l');
  return d.length > 0 && d.length === l.length && d.every((v, i) => v === l[i]);
})());

ok('the light origin defaults to the fitted layout and emits the same field', (() => {
  // The pair must be a NO-OP at its defaults, or every committed preset moves when it is added.
  return lightfield({ colour: { originX: 50, originY: 12.5 } }) === lightfield();
})());
ok('the light origin moves the bloom cluster and leaves deep alone', (() => {
  const at = (h) => [...h.matchAll(/radial-gradient\([^)]*?at ([-0-9.]+)% ([-0-9.]+)%/g)].map((m) => [+m[1], +m[2]]);
  const a = at(lightfield()), b = at(lightfield({ colour: { originX: 90, originY: 60 } }));
  // Same number of lobes, the last one (deep) unmoved, at least one of the others moved by the vector.
  return a.length === b.length
    && a[a.length - 1][0] === b[b.length - 1][0] && a[a.length - 1][1] === b[b.length - 1][1]
    && Math.abs(b[1][0] - a[1][0] - 40) < 1e-6 && Math.abs(b[1][1] - a[1][1] - 47.5) < 1e-6;
})());

ok('through #000000 is the exact no-op and emits no transmitted layer at all',
  lightfield({ colour: { through: '#000000' } }) === lightfield()
  && !/class="p"/.test(lightfield()));
ok('through draws the LIT faces again, as light, on a screen layer', (() => {
  const h = lightfield({ colour: { through: '#2a2a34' } });
  const box = (t) => (h.match(new RegExp(`<div class="${t}">([\\s\\S]*?)\\n</div>`)) || [, ''])[1];
  const lit = box('l').split('\n').filter(Boolean).length;
  const thru = box('p').split('\n').filter(Boolean).length;
  // One transmitted element per lit face and not one per cell: a seam is where no light comes
  // through, so it has to be a GAP in this layer or the light reads as a wash instead of as bars.
  return /\.p\{[^}]*mix-blend-mode:screen/.test(h) && thru > 0 && thru === lit
    && box('p').includes('rgba(42,42,52');
})());
ok('the transmitted faces sit exactly where the lit faces sit', (() => {
  // The builder is called a second time rather than the styles being recoloured. If it ever stopped
  // laying out the same geometry, the two layers would drift apart and nothing else would notice.
  const h = lightfield({ colour: { through: '#2a2a34' } });
  const box = (t) => (h.match(new RegExp(`<div class="${t}">([\\s\\S]*?)\\n</div>`)) || [, ''])[1];
  const geom = (s) => s.split('\n').filter(Boolean).map((x) => (x.match(/left:[-0-9.]+%;top:[-0-9.]+%;width:[-0-9.]+%/) || [''])[0]);
  const a = geom(box('l')), b = geom(box('p'));
  return a.length > 0 && a.every((v, i) => v === b[i]);
})());

ok('a paired direction darkens BOTH ends of its axis and leaves the middle alone', (() => {
  const s = (d) => lightfield({ shadow: { depth: 0.8, softness: 0.5, direction: d } }).match(/\.s\{[^}]*\}/)[0];
  const v = s('top-and-bottom'), h = s('left-and-right');
  const alpha = (css) => [...css.matchAll(/rgba\(0,2,2,([0-9.]+)\)/g)].map((m) => +m[1]);
  const a = alpha(v);
  return /linear-gradient\(180deg/.test(v) && /linear-gradient\(90deg/.test(h)
    // full depth at both ends, nothing at all across the middle, and the two halves mirror.
    && a[0] === 0.8 && a[a.length - 1] === 0.8 && a[2] === 0 && a[3] === 0
    && a[1] === a[a.length - 2];
})());
ok('a paired direction takes NOTHING off the axis it is not on', (() => {
  // The failure it exists to fix: `center` cannot darken the top without darkening the sides too.
  const css = lightfield({ shadow: { depth: 0.9, direction: 'top-and-bottom' } }).match(/\.s\{[^}]*\}/)[0];
  return !/radial-gradient/.test(css);
})());

ok('3 lobes and evenness 0 are the fitted cluster exactly, so no committed field moves',
  lightfield({ colour: { lobes: 3, evenness: 0 } }) === lightfield());
ok('the lobe count decides how many bloom stops the field carries', (() => {
  const bloom = (h) => [...h.matchAll(/rgba\(238,124,86/g)].length;
  // Three stops per blob (start, mid, fade) and `mid` is a different colour, so the bloom stop count
  // is 3 per lobe and nothing else.
  return bloom(lightfield({ colour: { lobes: 6 } })) === bloom(lightfield()) + 9;
})());
ok('the cluster keeps its total area as the count rises: more lobes are SMALLER lobes', (() => {
  const area = (h) => [...h.matchAll(/radial-gradient\(([0-9.]+)% ([0-9.]+)%/g)]
    .reduce((t, m) => t + +m[1] * +m[2], 0);
  const a = area(lightfield()), b = area(lightfield({ colour: { lobes: 9 } }));
  // Not equal: `mid`, `deep` and the drawn positions all move with the stream. But nine lobes must
  // not be three times the light, which is what an unscaled count would have given.
  return b < a * 1.35;
})());
ok('evenness spreads the cluster across the frame instead of clumping it', (() => {
  // The x of every bloom lobe, which is every radial stop carrying the bloom colour.
  const xs = (h) => [...h.matchAll(/radial-gradient\([^)]*?at ([-0-9.]+)% [-0-9.]+% in oklab, rgba\(238,124,86/g)].map((m) => +m[1]);
  const spread = (v) => Math.max(...v) - Math.min(...v);
  const flat = xs(lightfield({ colour: { lobes: 8, evenness: 1 } }));
  const clumped = xs(lightfield({ colour: { lobes: 8, evenness: 0 } }));
  // Eight even bands must cover more of the frame than eight independent draws did on this seed,
  // and no two lobes may share a band, so the gaps are bounded by the band width.
  return flat.length === 8 && spread(flat) > spread(clumped)
    && flat.slice().sort((a, b) => a - b).every((v, i, s) => i === 0 || v - s[i - 1] < (92 - 8) / 8 * 2);
})());
ok('evenness 1 still moves with the light origin', (() => {
  const xs = (h) => [...h.matchAll(/radial-gradient\([^)]*?at ([-0-9.]+)% [-0-9.]+% in oklab, rgba\(238,124,86/g)].map((m) => +m[1]);
  const a = xs(lightfield({ colour: { lobes: 6, evenness: 1 } }));
  const b = xs(lightfield({ colour: { lobes: 6, evenness: 1, originX: 70 } }));
  return a.every((v, i) => Math.abs(b[i] - v - 20) < 1e-6);
})());

ok('peak 34 is the old fixed range exactly, so the fitted field does not move',
  lightfield({ shadow: { peak: 34 } }) === lightfield());
ok('peak moves the mound across the face', (() => {
  // The mean position of the mound, because the two fields do not emit the same STOPS: a peak hard
  // against either edge drops the falloff behind it, so the lists are not index-comparable.
  const mean = (h) => {
    const at = [...h.matchAll(/rgb\(\d+,\d+,\d+\) 0%,rgb\(\d+,\d+,\d+\) ([0-9.]+)%/g)].map((m) => +m[1]);
    return at.reduce((a, b) => a + b, 0) / at.length;
  };
  return mean(lightfield({ shadow: { peak: 80 } })) - mean(lightfield({ shadow: { peak: 10 } })) > 60;
})());
ok('a peak hard against the trailing edge drops the falloff behind it, not in front of it', (() => {
  // A three-stop mound at peak 97 puts a dark hairline in the last 3% of the bar, which is exactly
  // where a flame is hottest. The stop is dropped instead.
  const h = lightfield({ shadow: { peak: 97 } });
  return !/ 97[0-9.]*%,rgb\(\d+,\d+,\d+\) 100%/.test(h);
})());

ok('reflected light is the default and dodges', lightfield().includes('mix-blend-mode:color-dodge'));
ok('emitted light adds the bloom colour on a plus-lighter layer', (() => {
  const h = lightfield({ shadow: { light: 'emitted' }, colour: { bloom: '#123456' } });
  return h.includes('mix-blend-mode:plus-lighter') && !h.includes('color-dodge') && h.includes('rgba(18,52,86,');
})());

ok('mass 0 emits no field-wide silhouette at all', !lightfield().includes('class="r"'));
ok('mass draws one continuous silhouette and lets the elements run full frame', (() => {
  const h = lightfield({ envelope: { kind: 'valley', from: 0.3, to: 0.8, mass: 0.9 } });
  const ridge = h.match(/<div class="r">([\s\S]*?)<\/div>/);
  if (!ridge) return false;
  const tops = [...ridge[1].matchAll(/top:([-0-9.]+)%/g)].map((m) => +m[1]);
  // A landscape, not a row of boxes: every column is within a whisker of the one beside it, and the
  // curve genuinely dips and rises across the frame.
  const smooth = tops.every((v, i) => i === 0 || Math.abs(v - tops[i - 1]) < 3);
  // The elements themselves are back to full frame, so their seams are full-height panel lines.
  const bars = h.match(/<div class="d">([\s\S]*?)<\/div>/)[1];
  const full = [...bars.matchAll(/top:([-0-9.]+)%;height:([0-9.]+)%/g)].every((m) => m[1] === '-2' && m[2] === '104');
  return tops.length > 100 && smooth && Math.max(...tops) - Math.min(...tops) > 5 && full;
})());
ok('the silhouette moves as ONE group, never per column', (() => {
  const h = lightfield({ envelope: { mass: 0.9, kind: 'ramp' }, motion: { kind: 'shimmer' } });
  const ridge = h.match(/<div class="r">([\s\S]*?)<\/div>/)[1];
  const moves = new Set([...ridge.matchAll(/translateX\(calc\(([^)]*\))/g)].map((m) => m[1]));
  return moves.size === 1;
})());

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
