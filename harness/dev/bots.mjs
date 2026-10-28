// vawe-dev bots <dir-or-file> [--days n] [--offline]: AI and search-engine traffic from the site's bot log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IP_LISTS, cidrsFromJson, readEvents, reportLines } from '../lib/bots-report.mjs';

const args = process.argv.slice(2);
const flagAt = (name) => args.indexOf(`--${name}`);
const days = flagAt('days') >= 0 ? Number(args[flagAt('days') + 1]) : undefined;
const offline = args.includes('--offline');
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--days');
if (!target || !fs.existsSync(target)) {
  console.error('vawe-dev bots: give a log directory or file');
  process.exit(2);
}

const CACHE = path.join(os.homedir(), '.cache', 'vawe', 'bot-ips');
const DAY = 86400000;

async function vendorList(url) {
  const file = path.join(CACHE, url.replace(/[^a-z0-9]+/gi, '_'));
  const cached = fs.existsSync(file) ? fs.statSync(file) : null;
  if (!offline && (!cached || Date.now() - cached.mtimeMs > DAY)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        fs.mkdirSync(CACHE, { recursive: true });
        fs.writeFileSync(file, await res.text());
      }
    } catch { /* offline: fall back to the cache */ }
  }
  return fs.existsSync(file) ? cidrsFromJson(JSON.parse(fs.readFileSync(file, 'utf8'))) : null;
}

const events = readEvents(target, { days });
const wanted = new Set(events.filter((e) => e.ip && IP_LISTS[e.bot]).map((e) => e.bot));
const lists = {};
for (const bot of wanted) lists[bot] = await vendorList(IP_LISTS[bot]);
console.log(reportLines(events, lists).join('\n'));
