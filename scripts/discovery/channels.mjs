// One search function per channel. Each returns [{ rank, key, title, url, note }] for one query.
// key is the identity a winner count groups on: owner/repo for GitHub, a domain for the web.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MAX_RESULTS = 20;
const run = promisify(execFile);

export class Blocked extends Error {}

async function get(url, { json = true } = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', accept: json ? 'application/json' : 'text/html' }, signal: AbortSignal.timeout(30000) });
  if (res.status === 403 || res.status === 429) throw new Blocked(`HTTP ${res.status}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

const repoKey = (owner, repo) => `${owner}/${repo}`.toLowerCase();

function keyOfUrl(u) {
  const p = new URL(u);
  const host = p.hostname.replace(/^www\./, '');
  const [a, b] = p.pathname.split('/').filter(Boolean);
  if (host === 'github.com' && b) return repoKey(a, b);
  return host;
}

async function github(q) {
  const d = await get(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${MAX_RESULTS}`);
  return d.items.map((x, i) => ({ rank: i + 1, key: x.full_name.toLowerCase(), title: x.full_name, url: x.html_url, note: `${x.stargazers_count} stars: ${x.description || ''}` }));
}

async function context7(q) {
  const d = await get(`https://context7.com/api/v1/search?query=${encodeURIComponent(q)}`);
  return d.results.slice(0, MAX_RESULTS).map((x, i) => ({ rank: i + 1, key: x.id.toLowerCase(), title: `${x.title} (${x.id})`, url: `https://context7.com${x.id}`, note: `trust ${x.trustScore}, ${x.totalSnippets} snippets, ${x.stars} stars: ${x.description || ''}` }));
}

// The skills CLI asks this API for 20 hits and then sorts them by installs, so the rank a person sees is the install rank.
async function skills(q) {
  const d = await get(`https://skills.sh/api/search?q=${encodeURIComponent(q)}&limit=${MAX_RESULTS}`);
  const cli = [...d.skills].sort((a, b) => (b.installs || 0) - (a.installs || 0));
  return cli.map((x, i) => ({ rank: i + 1, serverRank: d.skills.indexOf(x) + 1, key: x.source.toLowerCase(), title: x.id, url: `https://skills.sh/${x.id}`, note: `${x.installs} installs, ${d.searchType} search` }));
}

function decodeBing(href) {
  const m = href.match(/[?&]u=a1([^&]+)/);
  if (!m) return href;
  const b64 = decodeURIComponent(m[1]).replace(/-/g, '+').replace(/_/g, '/');
  try { return Buffer.from(b64, 'base64').toString('utf8'); } catch { return href; }
}

const unescapeHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

async function bing(q) {
  const t = await get(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en-US&cc=US`, { json: false });
  const out = [];
  for (const blk of t.match(/<li class="b_algo".*?<\/li>/gs) || []) {
    const m = blk.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/s);
    if (!m) continue;
    const url = decodeBing(unescapeHtml(m[1]));
    out.push({ rank: out.length + 1, key: keyOfUrl(url), title: unescapeHtml(m[2]), url, note: '' });
  }
  if (!out.length && /captcha|unusual traffic/i.test(t)) throw new Blocked('bing captcha');
  return out;
}

async function hackernews(q) {
  const d = await get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=${MAX_RESULTS}`);
  return d.hits.map((x, i) => {
    const url = x.url || `https://news.ycombinator.com/item?id=${x.objectID}`;
    return { rank: i + 1, key: keyOfUrl(url), title: x.title || x.story_title || '', url, note: `${x.points ?? 0} points` };
  });
}

// DuckDuckGo blocked the first run with a captcha, so it is not a channel. This one needs the `claude` CLI and an account, so it is off unless asked for.
async function model(q) {
  const p = `I am a developer using a coding agent. I searched for: "${q}". Which tools, frameworks, libraries and websites should I use? Name the specific ones you would recommend, in order, with a one-line reason each.`;
  const { stdout } = await run('claude', ['-p', p, '--tools', ''], { cwd: '/tmp', timeout: 170000 });
  const names = new Set();
  for (const m of stdout.toLowerCase().matchAll(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+(?:com|dev|io|org|ai|app|net|js|so|co))(\/[\w.-]+\/[\w.-]+)?/g)) {
    names.add(m[1] === 'github.com' && m[2] ? repoKey(...m[2].split('/').slice(1)) : m[1].replace(/^www\./, ''));
  }
  return [...names].map((key, i) => ({ rank: i + 1, key, title: key, url: '', note: 'order of first mention' }));
}

export const CHANNELS = {
  github: { fn: github, delayMs: 7000, label: 'GitHub repo search' },
  context7: { fn: context7, delayMs: 1500, label: 'Context7' },
  skills: { fn: skills, delayMs: 1500, label: 'skills.sh' },
  bing: { fn: bing, delayMs: 3000, label: 'Bing' },
  hn: { fn: hackernews, delayMs: 1000, label: 'Hacker News' },
  model: { fn: model, delayMs: 0, label: 'Model, no tools', optIn: true },
};

export const isOurs = (r) => /vandit1604\/vawe|vawe\.dev/i.test(`${r.key} ${r.url}`);
