// scripts/author/lightfield-test.mjs: the contract, as runnable assertions.
//
//   node scripts/author/lightfield-test.mjs
//
// Determinism and failing early are claims, and a claim nobody runs is a comment. These are the two
// properties the generator is for, so they are checked first and loudest.

import { createHash } from 'node:crypto';
import { lightfield, PATTERNS, MOTIONS, DIRECTIONS } from '../../core/lightfield/index.js';
import { PRESETS } from './lightfield-presets.mjs';

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
throws('a short hex', () => lightfield({ colour: { bloom: '#f80' } }), 'colour.bloom must be a 6-digit hex');
throws('a dial out of range', () => lightfield({ shadow: { depth: 1.4 } }), 'shadow.depth must be between 0 and 1');
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
ok('depth 0 emits no shadow layer', !lightfield({ shadow: { depth: 0 } }).includes('class="s"'));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
