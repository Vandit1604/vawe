#!/usr/bin/env node
// Builds site/content/inspiration.json from site/content/inspiration-posts.txt (one X post URL per line).
//
//   nice -n 15 node scripts/site/inspiration.mjs [--jobs 2] [--limit n] [--hints file.json] [--refresh | --ids a,b]
//
// Per new post: the text and creator from X oEmbed; the duration, the full post text and the playback mp4
// from yt-dlp; a poster from one frame (`bin/vawe still`) of a small copy yt-dlp fetches to a temp dir and
// deletes after. "made with" and the prompt come only from the post text. Type tags, a hand title and a
// hand tool are kept on every run. The run resumes: a post already in the JSON is skipped unless
// --refresh (every post) or --ids (these posts), which re-read text, playback and duration. A post
// that fails is skipped and listed.
//
// --hints: an optional JSON map of post id to { toolQuote, promptPublished, saves }. A tool quote is used
// only when the post text contains it; promptPublished only says where to look; saves is a public count.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LIST = path.join(ROOT, 'site/content/inspiration-posts.txt');
const DATA = path.join(ROOT, 'site/content/inspiration.json');
const POSTERS = path.join(ROOT, 'site/public/inspiration');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'inspiration-'));
const sharp = createRequire(path.join(ROOT, 'site/package.json'))('sharp');

const argv = process.argv.slice(2);
const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const REFRESH = argv.includes('--refresh');
const JOBS = Number(arg('--jobs')) || 2;
const LIMIT = Number(arg('--limit')) || Infinity;
const HINTS = arg('--hints') ? JSON.parse(fs.readFileSync(arg('--hints'), 'utf8')) : {};
const POSTER_W = 640;
const POSTER_MAX = 60_000;
const TITLE_MAX = 90;
// X answers 429 when requests come too fast: wait this long, times the attempt, then try again.
const BACKOFF_MS = 30_000;
const ATTEMPTS = 4;
// A pause between two posts of one worker, so X sees a few requests a minute per worker.
const SPACING_MS = 1500;

// Names as a post writes them, longest first so "Claude Code" wins over "Claude".
const TOOLS = [
  /Claude Code/i, /Claude (?:Opus|Sonnet|Haiku) \d(?:\.\d)?/i, /(?:Opus|Sonnet|Haiku) \d(?:\.\d)?/i, /Claude Design/i, /Claude/i,
  /GPT-?\d(?:\.\d)?(?:[- ]?(?:Codex|Pro|mini))?/i, /ChatGPT/i, /Codex/i, /Gemini(?: \d(?:\.\d)?(?: (?:Pro|Flash))?)?/i, /Grok(?: \d)?/i,
  /Cursor/i, /Remotion/i, /HyperFrames/i, /Kimi(?: K\d(?:\.\d)?)?/i, /DeepSeek/i, /Qwen/i, /GLM-?\d(?:\.\d)?/i, /MiniMax/i,
  /three\.js/i, /Lovable/i, /Replit/i, /\bv0\b/, /Windsurf/i, /Manus/i, /Veo ?\d/i, /Seedance/i, /Kling/i,
];

const run = (cmd, args) =>
  new Promise((resolve) => {
    execFile(cmd, args, { cwd: ROOT, maxBuffer: 1 << 26 }, (error, stdout, stderr) => resolve({ ok: !error, stdout: String(stdout), stderr: String(stderr) }));
  });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lastLine = (s) => s.trim().split('\n').at(-1) ?? '';

async function retry(what, fn) {
  for (let i = 1; ; i++) {
    const out = await fn();
    if (out.ok || !out.limited || i === ATTEMPTS) return out;
    console.error(`  ${what}: rate limited, waiting ${(BACKOFF_MS * i) / 1000}s`);
    await wait(BACKOFF_MS * i);
  }
}

const decode = (s) =>
  s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&mdash;/g, ' - ').replace(/&amp;/g, '&');

async function oembed(url) {
  const api = `https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=${encodeURIComponent(url)}`;
  return retry('oembed', async () => {
    const res = await fetch(api).catch(() => null);
    if (!res) return { ok: false, why: 'oembed: no response' };
    if (res.status === 429) return { ok: false, limited: true, why: 'oembed: 429' };
    if (!res.ok) return { ok: false, why: `oembed: HTTP ${res.status} (deleted, private or no longer embeddable)` };
    const j = await res.json();
    const p = /<p[^>]*>([\s\S]*?)<\/p>/.exec(j.html)?.[1] ?? '';
    return { ok: true, text: decode(p.replace(/<br\s*\/?>/g, '\n')), name: j.author_name ?? '', handle: (j.author_url ?? '').split('/').pop() };
  });
}

async function video(url) {
  return retry('yt-dlp', async () => {
    const r = await run('yt-dlp', ['--no-warnings', '--playlist-items', '1', '-f', 'best[protocol=https][ext=mp4]', '--print', '%(duration)s', '--print', '%(url)s', '--print', '%(description)s', url]);
    if (!r.ok) return { ok: false, limited: /429|rate.?limit/i.test(r.stderr), why: `yt-dlp: ${lastLine(r.stderr)}` };
    const [duration, playback, ...rest] = r.stdout.trimEnd().split('\n');
    if (!/^https:\/\/video\.twimg\.com\//.test(playback)) return { ok: false, why: 'yt-dlp: no mp4 on video.twimg.com (a GIF, an image or an embed)' };
    return { ok: true, duration: Math.round(Number(duration) * 10) / 10, playback, description: rest.join('\n') };
  });
}

const clean = (s) => s.replace(/\u2014/g, ' - ').replace(/https?:\/\/\S+|pic\.(?:twitter|x)\.com\/\S+/g, '').replace(/[ \t]+/g, ' ').trim();

function titleFrom(text) {
  const line = clean(text).split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  if (line.length <= TITLE_MAX) return line;
  const cut = line.slice(0, TITLE_MAX);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).replace(/[\s,.;:!-]+$/, '')}…`;
}

function toolFrom(text) {
  const found = [];
  for (const re of TOOLS) {
    const m = re.exec(text);
    if (m && !found.some((f) => f.toLowerCase().includes(m[0].toLowerCase()))) found.push(m[0]);
  }
  return found.join(', ');
}

// A prompt counts only when the post publishes it: the text after a "prompt:" marker, or a long quoted ask.
function promptFrom(text, published) {
  const body = clean(text);
  const marked = /\bprompts?\b[^:\n：]{0,24}[:：]\s*([\s\S]{40,})/i.exec(body);
  if (marked) return marked[1].trim();
  const quoted = /["“「]([^"”」]{60,})["”」]/.exec(body);
  if (quoted) return quoted[1].trim();
  // A post known to publish its prompt with no marker: the post text is the prompt.
  return published && body.length >= 80 ? body : null;
}

function quotedTool(text, quote) {
  if (!quote) return '';
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(text).includes(norm(quote)) ? toolFrom(quote) : '';
}

async function poster(url, id, duration) {
  const out = path.join(POSTERS, `${id}.webp`);
  if (fs.existsSync(out)) return { ok: true };
  const mp4 = path.join(TMP, `${id}.mp4`);
  const got = await retry('yt-dlp download', async () => {
    const r = await run('yt-dlp', ['--no-warnings', '--playlist-items', '1', '-f', 'best[protocol=https][ext=mp4][height<=480]/best[protocol=https][ext=mp4]', '-o', mp4, url]);
    return r.ok ? { ok: true } : { ok: false, limited: /429/.test(r.stderr), why: `download: ${lastLine(r.stderr)}` };
  });
  if (!got.ok) return got;
  const png = path.join(TMP, `${id}.png`);
  const at = Math.min(Math.max(duration * 0.3, 1), 8).toFixed(1);
  const still = await run(path.join(ROOT, 'bin/vawe'), ['still', mp4, '--at', at, '--out', png]);
  fs.rmSync(mp4, { force: true });
  if (!fs.existsSync(png)) return { ok: false, why: `still: ${lastLine(still.stderr || still.stdout)}` };
  for (let q = 80; q >= 40; q -= 10) {
    await sharp(png).resize({ width: POSTER_W, withoutEnlargement: true }).webp({ quality: q, effort: 6 }).toFile(out);
    if (fs.statSync(out).size < POSTER_MAX) break;
  }
  fs.rmSync(png, { force: true });
  return { ok: true };
}

const idOf = (url) => /status\/(\d+)/.exec(url)?.[1];

// Hand fields (title, types, tags, a known tool) survive a rebuild; the rest comes from the post.
function entryOf(id, meta, vid, old = {}, hint = {}) {
  const text = vid.description || meta.text;
  const prompt = promptFrom(text, hint.promptPublished);
  const source = `https://x.com/${meta.handle}/status/${id}`;
  const keptTool = old.tool && old.tool !== 'unknown' ? old.tool : '';
  const saves = Number.isFinite(hint.saves) ? hint.saves : old.saves;
  return {
    id,
    title: old.title || titleFrom(meta.text),
    creator: { name: meta.name, handle: meta.handle },
    url: source,
    types: old.types ?? [],
    tags: old.tags ?? [],
    tool: keptTool || quotedTool(text, hint.toolQuote) || toolFrom(text) || 'unknown',
    ...(prompt ? { prompt: { text: prompt, source } } : {}),
    poster: `/inspiration/${id}.webp`,
    playback: vid.playback,
    duration: vid.duration,
    ...(saves ? { saves } : {}),
  };
}

async function build(url, old) {
  const id = idOf(url);
  const meta = await oembed(url);
  if (!meta.ok) return meta;
  const vid = await video(url);
  if (!vid.ok) return vid;
  const pic = await poster(url, id, vid.duration);
  if (!pic.ok) return pic;
  return { ok: true, entry: entryOf(id, meta, vid, old, HINTS[id]) };
}

async function main() {
  const urls = [...new Set(fs.readFileSync(LIST, 'utf8').split('\n').map((l) => l.trim()).filter((l) => /^https:\/\/x\.com\/\w+\/status\/\d+/.test(l)))];
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const known = new Map(data.posts.map((p) => [p.id, p]));
  const only = arg('--ids')?.split(',');
  const todo = urls.filter((u) => (only ? only.includes(idOf(u)) : REFRESH || !known.has(idOf(u)))).slice(0, LIMIT);
  console.log(`${urls.length} posts listed, ${todo.length} to build, ${JOBS} at a time`);
  const order = new Map(urls.map((u, i) => [idOf(u), i]));
  const failed = [];
  let done = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const r = await build(url, known.get(idOf(url)));
      done++;
      if (r.ok) {
        known.set(r.entry.id, r.entry);
        data.posts = [...known.values()].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
        fs.writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
        console.log(`[${done}/${todo.length}] ok ${url}`);
      } else {
        failed.push(`${url}  ${r.why}`);
        console.log(`[${done}/${todo.length}] skip ${url}: ${r.why}`);
      }
      await wait(SPACING_MS);
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  fs.rmSync(TMP, { recursive: true, force: true });
  const untyped = data.posts.filter((p) => !p.types.length && p.playback).length;
  console.log(`\n${todo.length - failed.length} built, ${failed.length} failed, ${data.posts.length} entries in all, ${untyped} without a type tag`);
  for (const f of failed) console.log(`  failed: ${f}`);
}

main();
