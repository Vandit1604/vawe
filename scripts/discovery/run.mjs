#!/usr/bin/env node
// Run the generic discovery queries through each channel and write runs/<date>.json and runs/<date>.md.
// node scripts/discovery/run.mjs [--channels github,context7,skills,bing,hn] [--limit N] [--prev runs/file.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHANNELS, Blocked, isOurs } from './channels.mjs';
import { renderReport } from './report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_BLOCKS = 3;

function parseArgs(argv) {
  const o = { channels: Object.keys(CHANNELS).filter((c) => !CHANNELS[c].optIn), limit: Infinity, prev: null };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--channels') o.channels = argv[i + 1].split(',');
    else if (argv[i] === '--limit') o.limit = Number(argv[i + 1]);
    else if (argv[i] === '--prev') o.prev = argv[i + 1];
    else throw new Error(`unknown flag ${argv[i]}`);
  }
  for (const c of o.channels) if (!CHANNELS[c]) throw new Error(`unknown channel ${c}; known: ${Object.keys(CHANNELS).join(', ')}`);
  return o;
}

const plain = (s) => s.replace(/\u2014/g, '-');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runChannel(name, queries) {
  const { fn, delayMs } = CHANNELS[name];
  const out = {};
  let blocks = 0;
  for (const q of queries) {
    if (blocks >= MAX_BLOCKS) {
      out[q] = { results: [], error: 'skipped: channel blocked' };
      continue;
    }
    try {
      const results = await fn(q);
      blocks = 0;
      out[q] = { results: results.map((r) => ({ ...r, title: plain(r.title), note: plain(r.note), ours: isOurs(r) })), error: null };
    } catch (e) {
      if (e instanceof Blocked) blocks += 1;
      out[q] = { results: [], error: String(e.message || e) };
    }
    const r = out[q];
    console.log(`${name} ${Object.keys(out).length}/${queries.length} ${r.results.length} results${r.error ? ' ' + r.error : ''}`);
    await sleep(delayMs);
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
const queries = JSON.parse(fs.readFileSync(path.join(HERE, 'queries.json'), 'utf8')).slice(0, opts.limit);
const date = new Date().toISOString().slice(0, 10);
const data = { date, queries, channels: {} };
for (const name of opts.channels) data.channels[name] = await runChannel(name, queries);

const prev = opts.prev ? JSON.parse(fs.readFileSync(opts.prev, 'utf8')) : null;
const base = path.join(HERE, 'runs', date);
fs.mkdirSync(path.dirname(base), { recursive: true });
fs.writeFileSync(`${base}.json`, JSON.stringify(data, null, 1) + '\n');
fs.writeFileSync(`${base}.md`, renderReport(data, prev));
console.log(`wrote ${base}.json and ${base}.md`);
