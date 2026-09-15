// harness/author/batch.mjs: DATA-DRIVEN VARIANTS. One template scene + an array of data rows → N rendered
// videos. Deterministic per row. `{{key}}` placeholders in any string field are substituted from each
// row; `expand-blocks` runs automatically so templates can use {type:"block"} layers.
//
// Usage: node harness/author/batch.mjs <template.json> <data.json> [--render]
//   data.json = [ { "name":"acme", "stat":42 }, { "name":"globex", "stat":88 } ]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as B from '../../blocks/index.mjs';

const [tpl, dataPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const doRender = process.argv.includes('--render');
if (!tpl || !dataPath) { console.error('usage: node harness/author/batch.mjs <template.json> <data.json> [--render]'); process.exit(2); }

const template = fs.readFileSync(tpl, 'utf8');
const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const outDir = 'films/scene/_batch'; fs.mkdirSync(outDir, { recursive: true });
const sub = (s, row) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in row ? String(row[k]) : `{{${k}}}`));
const expand = (d) => { const layers = []; for (const l of d.layers || []) {
  if (l.type === 'block') { const { type, block, ...o } = l; layers.push(...B.BLOCKS[block](o)); } else layers.push(l);
} d.layers = layers; return d; };

rows.forEach((row, i) => {
  const name = (row.name || `v${i}`).replace(/[^a-z0-9_-]/gi, '_');
  const d = expand(JSON.parse(sub(template, row)));
  const file = path.join(outDir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(d, null, 2));
  console.log(`  ${file}`);
  if (doRender) execFileSync('./bin/vawe', [file], { stdio: 'inherit' });
});
console.log(`\n  ${rows.length} variant(s) written to ${outDir}/${doRender ? ' and rendered' : ' (add --render to render)'}`);
