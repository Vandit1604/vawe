// scripts/author/lightfield-test.mjs: the contract, as runnable assertions.
//
//   node scripts/author/lightfield-test.mjs
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
ok('a slat moves as ONE: its seam and its face take the same transform', (() => {
  const html = lightfield({ pattern: { count: 6 }, motion: { kind: 'shimmer' } });
  const move = (tag) => [...html.matchAll(new RegExp(`<div class="${tag}">([\\s\\S]*?)</div>`, 'g'))]
    .flatMap((m) => [...m[1].matchAll(/translateX\(calc\(([^)]*\))/g)].map((x) => x[1]));
  const d = move('d'), l = move('l');
  return d.length > 0 && d.length === l.length && d.every((v, i) => v === l[i]);
})());

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
