#!/usr/bin/env node
// Free keyword demand index for the harness queries and the blog plan keywords.
// node scripts/discovery/demand.mjs [--limit N] [--sources google,youtube,github,so,hn,skills,context7,npm,trends]
// Writes runs/demand-<date>.json and .md. No account, no paid API; each source is paced and skipped after 3 blocks in a row.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { get, Blocked } from './channels.mjs';
import { positionIn, renderDemandReport } from './demand-index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_BLOCKS = 3;
const SO_BUDGET = 290;
const run = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plain = (s) => s.replace(/\u2014/g, '-');

const NPM_PACKAGES = ['remotion', 'puppeteer', 'timecut', 'puppeteer-screen-recorder', '@revideo/core', '@motion-canvas/core', 'hyperframes', '@hyperframes/core', 'gsap', 'lottie-web', 'three'];

function loadPhrases() {
  const plan = JSON.parse(fs.readFileSync(path.join(HERE, 'keywords.json'), 'utf8'));
  const harness = JSON.parse(fs.readFileSync(path.join(HERE, 'queries.json'), 'utf8'));
  const seen = new Map();
  for (const [cluster, list] of Object.entries(plan)) for (const p of list) if (!seen.has(p)) seen.set(p, { phrase: p, cluster, inPlan: true });
  for (const p of harness) if (!seen.has(p)) seen.set(p, { phrase: p, cluster: '0 harness only', inPlan: false });
  return [...seen.values()];
}

async function suggest(q, ds) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox${ds ? `&ds=${ds}` : ''}&q=${encodeURIComponent(q)}`;
  const d = await get(url);
  return Array.isArray(d) && Array.isArray(d[1]) ? d[1] : [];
}

async function autocomplete(phrase, ds) {
  const words = phrase.split(/\s+/);
  const own = await suggest(phrase, ds);
  await sleep(600);
  const tailList = await suggest(`${phrase} `, ds);
  const prefixes = {};
  for (let k = 1; k <= Math.min(3, words.length - 1); k++) {
    await sleep(600);
    prefixes[k] = positionIn(await suggest(words.slice(0, k).join(' '), ds), phrase);
  }
  const tail = tailList.filter((s) => s.toLowerCase().trim() !== phrase.toLowerCase()).slice(0, 10);
  return { exact: positionIn(own, phrase), prefixes, tail: tail.length, suggestions: own.map(plain), expansions: tail.map(plain) };
}

async function github(phrase) {
  try {
    const { stdout } = await run('gh', ['api', 'search/repositories', '-X', 'GET', '-f', `q=${phrase}`, '--jq', '.total_count'], { timeout: 30000 });
    return { total: Number(stdout.trim()) };
  } catch (e) {
    if (/rate limit|403|429/i.test(`${e.stderr} ${e.message}`)) throw new Blocked('github rate limit');
    throw e;
  }
}

const state = { soCalls: 0 };
async function stackCount(phrase, fromdate) {
  if (state.soCalls >= SO_BUDGET) throw new Blocked('stackoverflow daily quota budget used');
  state.soCalls += 1;
  const q = `https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(phrase)}&site=stackoverflow&filter=total${fromdate ? `&fromdate=${fromdate}` : ''}`;
  const d = await get(q);
  if (typeof d.total !== 'number') throw new Blocked(`stackoverflow: ${d.error_name || 'no total'}`);
  return d.total;
}

async function stackoverflow(phrase) {
  const yearAgo = Math.floor(Date.now() / 1000) - 365 * 86400;
  const total = await stackCount(phrase, 0);
  await sleep(500);
  return { total, recent: await stackCount(phrase, yearAgo) };
}

async function hackernews(phrase) {
  const yearAgo = Math.floor(Date.now() / 1000) - 365 * 86400;
  const base = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(phrase)}&hitsPerPage=0`;
  const all = await get(base);
  await sleep(300);
  const recent = await get(`${base}&numericFilters=created_at_i>${yearAgo}`);
  return { total: all.nbHits, recent: recent.nbHits };
}

async function skills(phrase) {
  const d = await get(`https://skills.sh/api/search?q=${encodeURIComponent(phrase)}&limit=20`);
  const top = [...d.skills].sort((a, b) => (b.installs || 0) - (a.installs || 0)).slice(0, 5);
  return { installs: top.map((x) => x.installs || 0), top: top.map((x) => x.id) };
}

async function context7(phrase) {
  const d = await get(`https://context7.com/api/v1/search?query=${encodeURIComponent(phrase)}`);
  const top = d.results.slice(0, 3);
  return { trust: top.map((x) => Number(x.trustScore) || 0), top: top.map((x) => x.id) };
}

const SOURCES = {
  google: { fn: (p) => autocomplete(p, ''), delayMs: 800 },
  youtube: { fn: (p) => autocomplete(p, 'yt'), delayMs: 800 },
  github: { fn: github, delayMs: 2500 },
  stackoverflow: { fn: stackoverflow, delayMs: 800 },
  hackernews: { fn: hackernews, delayMs: 500 },
  skills: { fn: skills, delayMs: 3000 },
  context7: { fn: context7, delayMs: 1200 },
};
const ALIAS = { so: 'stackoverflow', hn: 'hackernews' };

async function runSource(name, phrases) {
  const { fn, delayMs } = SOURCES[name];
  const out = {};
  let blocks = 0;
  let failed = 0;
  for (const { phrase } of phrases) {
    if (blocks >= MAX_BLOCKS) { out[phrase] = null; continue; }
    try {
      out[phrase] = await fn(phrase);
      blocks = 0;
    } catch (e) {
      out[phrase] = null;
      failed += 1;
      if (e instanceof Blocked) blocks += 1;
      console.log(`${name} "${phrase}": ${e.message}`);
    }
    if (Object.keys(out).length % 20 === 0) console.log(`${name} ${Object.keys(out).length}/${phrases.length}`);
    await sleep(delayMs);
  }
  const have = Object.values(out).filter(Boolean).length;
  const status = blocks >= MAX_BLOCKS ? `BLOCKED after ${have} of ${phrases.length}` : `ok ${have} of ${phrases.length}${failed ? `, ${failed} failed` : ''}`;
  console.log(`${name} done: ${status}`);
  return { out, status };
}

async function npmDownloads() {
  const out = {};
  for (const pkg of NPM_PACKAGES) {
    try {
      out[pkg] = (await get(`https://api.npmjs.org/downloads/point/last-week/${pkg}`)).downloads;
    } catch { out[pkg] = null; }
    await sleep(500);
  }
  return out;
}

// One try at the public explore endpoint. It returned 429 on 2026-10-16, so it stays a probe and feeds no score.
async function trendsProbe() {
  const req = encodeURIComponent(JSON.stringify({ comparisonItem: [{ keyword: 'html to video', geo: '', time: 'today 12-m' }], category: 0, property: '' }));
  try {
    await get(`https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${req}`, { json: false });
    return 'reachable but not used (the widget token flow is unstable)';
  } catch (e) { return `skipped: ${e.message}`; }
}

function parseArgs(argv) {
  const o = { limit: Infinity, sources: Object.keys(SOURCES) };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--limit') o.limit = Number(argv[i + 1]);
    else if (argv[i] === '--sources') o.sources = argv[i + 1].split(',').map((s) => ALIAS[s] || s);
    else throw new Error(`unknown flag ${argv[i]}`);
  }
  for (const s of o.sources) if (!SOURCES[s]) throw new Error(`unknown source ${s}; known: ${Object.keys(SOURCES).join(', ')}`);
  return o;
}

const opts = parseArgs(process.argv.slice(2));
const list = loadPhrases().slice(0, opts.limit);
const date = new Date().toISOString().slice(0, 10);
const results = await Promise.all(opts.sources.map(async (n) => [n, await runSource(n, list)]));
const raw = Object.fromEntries(results);
const sources = Object.fromEntries(results.map(([n, r]) => [n, r.status]));
sources.trends = await trendsProbe();
const npm = await npmDownloads();
const base = path.join(HERE, 'runs', `demand-${date}`);
const earlier = fs.existsSync(`${base}.json`) && opts.sources.length < Object.keys(SOURCES).length ? JSON.parse(fs.readFileSync(`${base}.json`, 'utf8')) : null;
const data = {
  date,
  sources: { ...earlier?.sources, ...sources },
  npm: earlier?.npm ?? npm,
  phrases: list.map((p) => {
    const before = earlier?.phrases.find((e) => e.phrase === p.phrase)?.raw ?? {};
    return { ...p, raw: Object.fromEntries(Object.keys(SOURCES).map((n) => [n, raw[n] ? raw[n].out[p.phrase] ?? null : before[n] ?? null])) };
  }),
};
fs.mkdirSync(path.dirname(base), { recursive: true });
fs.writeFileSync(`${base}.json`, JSON.stringify(data, null, 1) + '\n');
fs.writeFileSync(`${base}.md`, renderDemandReport(data));
console.log(`wrote ${base}.json and ${base}.md`);
