// Write site/lib/blog-added.json: the time each blog post file was first committed. lib/blog.ts uses it
// to order posts that share a `date`, so the order is the order they were written. Run in prebuild.
// Without a repo history (the Docker build) it leaves the committed file alone.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = path.join(root, 'site', 'content', 'blog');
const OUT = path.join(root, 'site', 'lib', 'blog-added.json');

function run(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

let complete = false;
try {
  complete = run(['rev-parse', '--is-shallow-repository']) === 'false';
} catch {}
if (!complete) {
  console.log('~ no full repo history here; using the committed site/lib/blog-added.json');
  process.exit(0);
}

const out = {};
const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
for (const file of files) {
  const times = run(['log', '--diff-filter=A', '--format=%aI', '--', path.join(CONTENT, file)]).split('\n').filter(Boolean);
  if (times.length) out[file.replace(/\.md$/, '')] = times[times.length - 1];
}
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
console.log(`✓ ${Object.keys(out).length} post times -> site/lib/blog-added.json`);
