#!/usr/bin/env node
// Static hook authoring tool — pure template engine, no network, nothing at runtime.
//
//   node scripts/hooks.mjs --data formats/higherlower/apps.json --slot hook
//     → builds ctx from the JSON, fills every applicable template, drops rule-breakers,
//       prints them grouped by framework with an [index] for --apply.
//   node scripts/hooks.mjs --data … --slot hook --apply 3
//     → writes variant [3] into data.hook  (title/description/comment → engine/out/<name>.meta.json)
//
// ctx overrides: --niche --topic --subject --rival --twist
// Render never depends on this. It's a pre-render authoring step — just don't run it to skip.

import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATES, FRAMEWORKS, validate } from './hooks/library.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.data) {
  console.error('usage: node scripts/hooks.mjs --data <file.json> [--slot hook|title|description|comment] [--niche app] [--apply N]');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(args.data, 'utf8'));
const ctx = buildCtx(data, args);
const slot = args.slot || 'hook';

// fill → validate → keep only the clean ones (stable order = display order = --apply index)
const variants = TEMPLATES
  .filter((t) => t.slot === slot)
  .map((t) => ({ framework: t.framework, pattern: t.pattern, text: t.fill(ctx) }))
  .map((t) => ({ ...t, v: validate(t.text, slot) }))
  .filter((t) => t.v.ok);

if (args.apply != null) {
  apply(variants[Number(args.apply)], slot, args.data, data);
} else {
  print(variants, slot, ctx);
}

// ── ctx from the data JSON ───────────────────────────────────────────────────
function buildCtx(d, a) {
  const rounds = d.rounds || [];
  const count = rounds.length;
  const last = rounds[count - 1] || {};
  const aWins = (last.valA ?? 0) >= (last.valB ?? 0);
  const niche = a.niche || deriveNiche(d.hookSub) || 'one';
  return {
    count,
    niche,
    niches: plural(niche),
    topic: a.topic || stripQ(d.hookSub) || plural(niche),
    subject: a.subject || (aWins ? last.a : last.b) || '',
    rival: a.rival || (aWins ? last.b : last.a) || '',
    twist: a.twist || stripTags(last.fact) || '',
    pct: last.pct ?? null,
    missPct: last.pct != null ? 100 - last.pct : null,
    pair: [rounds[0]?.a, rounds[0]?.b],
  };
}

// ── output ───────────────────────────────────────────────────────────────────
function print(list, slot, ctx) {
  const c = `niche=${ctx.niche} · count=${ctx.count} · subject=${ctx.subject}` + (ctx.pct != null ? ` · pct=${ctx.pct}` : '');
  console.log(`\n${slot.toUpperCase()} — ${path.basename(args.data)}   (${c})`);
  console.log(`${list.length} variants pass the rules. --apply <index> to use one.\n`);
  let i = 0;
  for (const fw of FRAMEWORKS) {
    const rows = list.filter((t) => t.framework === fw);
    if (!rows.length) continue;
    console.log(`${fw}`);
    for (const t of rows) {
      const idx = list.indexOf(t);
      const meta = slot === 'title' ? `${t.v.chars}c` : `${t.v.words}w`;
      console.log(`  [${String(idx).padStart(2)}] ${t.text}   (${meta})`);
      i++;
    }
    console.log('');
  }
}

function apply(v, slot, dataPath, data) {
  if (!v) { console.error('no variant at that index'); process.exit(1); }
  if (slot === 'hook') {
    data.hook = v.text;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`✓ data.hook = ${v.text}\n  (${dataPath})`);
  } else {
    const name = path.basename(dataPath).replace(/\.json$/, '');
    const metaPath = path.join('engine', 'out', `${name}.meta.json`);
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
    meta[slot] = v.text;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    console.log(`✓ ${slot} → ${metaPath}\n  ${v.text}`);
  }
}

// ── tiny helpers (no deps) ───────────────────────────────────────────────────
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    a[k] = val;
  }
  return a;
}
function stripTags(s = '') { return String(s).replace(/<[^>]+>/g, '').replace(/[""]/g, '').trim(); }
function stripQ(s = '') {
  return stripTags(s).replace(/^(which|who|what)\s+/i, '').replace(/\bhas?\s+more\b|\bis\b|\bare\b/gi, '').replace(/\?/g, '').replace(/\s+/g, ' ').trim();
}
function deriveNiche(sub = '') {
  const w = stripTags(sub).toLowerCase()
    .replace(/\b(which|who|what|whats|has|have|had|is|are|was|were|more|most|the|a|an|do|does|of|in)\b/g, ' ')
    .trim().split(/\s+/).filter(Boolean);
  return w[0] ? singular(w[0]) : '';
}
function singular(w) {
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ss')) return w;
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}
function plural(w) {
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|sh|ch|x|z)$/.test(w)) return w + 'es';
  return w + 's';
}
