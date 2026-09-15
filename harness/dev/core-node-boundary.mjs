// harness/dev/core-node-boundary.mjs: core/ is fetched and evaluated by a browser, so no file under
// it may statically import a node: builtin (node:fs, node:path, node:child_process, ...).
//
//   node harness/dev/core-node-boundary.mjs   report every violation, exit 1 if any
//
// WHY THIS EXISTS. core/audio/kit.mjs imported node:fs and core/audio/select.js imported node:url,
// both for years, and neither ever failed a render: nothing in the browser-loaded path happened to
// import them. A file that cannot run where it claims to run is a bug waiting for the day something
// finally does import it (engine-doctrine/CRAFT/ENGINE-CHANGES.md). This is a boundary, not a gate: it names the
// rule, it does not rewrite anyone's code.
//
// *.test.mjs is exempt: tests run under node directly, never fetched by a browser.
import { execSync } from 'node:child_process';

const raw = execSync("git grep -nE \"^import .* from ['\\\"]node:|require\\\\(['\\\"]node:\" -- 'core' || true",
  { encoding: 'utf8', maxBuffer: 64 << 20 });

const hits = [];
for (const line of raw.split('\n')) {
  if (!line) continue;
  const m = /^([^:]+):(\d+):(.*)$/s.exec(line);
  if (!m) continue;
  const [, file, no, text] = m;
  if (file.endsWith('.test.mjs')) continue;
  hits.push({ file, no, text: text.trim() });
}

if (hits.length) {
  for (const h of hits) console.log(`${h.file}:${h.no}: ${h.text}`);
  console.error(`\ncore-node-boundary: ${hits.length} node: import(s) under core/. core/ is fetched and `
    + 'evaluated by a browser: node:fs, node:path, node:child_process (or any node: builtin) cannot '
    + 'resolve there. Move the I/O to the CLI script that calls this code (it already imports node: '
    + 'builtins itself), and have core/ export a pure function that returns data instead of writing '
    + 'it. If the code only ever runs from a CLI entry point, guard the import behind that check and '
    + 'import it dynamically inside the guard (see core/audio/select.js), never as a static import.');
  process.exit(1);
}
console.log('core-node-boundary: clean, no file under core/ imports a node: builtin');
