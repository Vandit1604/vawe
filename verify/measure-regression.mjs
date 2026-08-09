// measure-regression.mjs — proves the layout audit measures the THING and not its DECLARATION.
//
// This repo has logged the same measurement error four times: #214 (a `<style>` block counted as
// glyphs in the overlap check), #216 (the identical bug still live in clipped-text), #217 (two more
// consumers), #242 (an ink rect read unclamped by `buried`). Every one was a rule fixed at one call
// site while another consumer went on reading the raw value. Comments do not stop that; a failing
// test does. Each case below is a real reproduction, and each one hard-failed the audit before it was
// fixed. The name of each fixture says what it is measuring.
//   node verify/measure-regression.mjs      ·      make audit-test
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = (fixture) => {
  try { return execFileSync('node', ['verify/audit.mjs', fixture], { cwd: root, encoding: 'utf8' }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); } // the audit exits 1 on a HARD fail
};

let fail = 0;
const ok = (cond, msg, out) => {
  if (cond) { console.log(`✓ ${msg}`); return; }
  console.error(`✗ ${msg}\n${out}`);
  fail++;
};

// 1. OVERLAP is between GLYPHS. `pin` centres a box, so a placed line has to declare a `w`, and that
//    `w` is a wrapping width the copy usually does not fill. Two layers whose declared boxes intersect
//    over that empty slack are not touching on screen. The fixture is a 1200px-wide layer reading "Hi"
//    beside a neighbour 700px away, which reported `[overlap] 400x50px`.
{
  const out = audit('verify/fixtures/measure-slack-overlap.json');
  ok(!out.includes('[overlap]'), 'overlap is measured on the glyphs, not on the declared `w`', out);
}

// 2. A LAYER'S EXTENT is what it draws. On a `group`, `h` sizes the element and nothing need be
//    painted in it, so a group declaring h:400 around a 30px label reported a 400px-tall extent and
//    hard-failed safe-zone on 360px of empty air.
{
  const out = audit('verify/fixtures/measure-group-box.json');
  ok(!out.includes('[safe]'), 'a group is measured by its drawn children, not by its declared `h`', out);
}

// 3. DISPLAY-TYPE CONTRAST belongs to every big headline on the frame. The rule used to judge the
//    single largest text, so an 80px headline at 3.3:1 was a hard fail when it was the biggest thing
//    on screen and reported by nothing at all once a 90px sibling arrived. Same paint, same ratio.
{
  const out = audit('verify/fixtures/measure-two-headlines.json');
  ok(/\[weak-headline\].*Washed headline/.test(out),
    'the washed-out headline is judged even though a bigger sibling shares the frame', out);
}

if (fail) { console.error(`\n✗ measure-regression: ${fail} failed`); process.exit(1); }
console.log('✓ measure-regression: the audit measures drawn ink, not declared boxes');
