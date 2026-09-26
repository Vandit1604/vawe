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
