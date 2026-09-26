#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const MISTAKES_PATH = path.join(ROOT, 'engine-doctrine', 'MISTAKES.md');
const jsonMode = process.argv.includes('--json');

function parseEntries(text) {
  const lines = text.split('\n');
  const entries = [];
  const headingRe = /^## (\d+)\b\s*[.:\u2014\u00b7-]?\s*(.*)$/u;
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(headingRe);
    if (h) {
      current = { num: parseInt(h[1], 10), title: h[2].trim(), holds: null, holdsLine: null };
      entries.push(current);
      continue;
    }
    const holdsM = current && lines[i].match(/^holds:\s*(.*)$/);
    if (holdsM) { current.holds = holdsM[1].trim(); current.holdsLine = i + 1; }
  }
  return entries;
}

function splitRefs(holds) {
  const refs = [];
  let depth = 0, start = 0;
  for (let i = 0; i < holds.length; i++) {
    const c = holds[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { refs.push(holds.slice(start, i).trim()); start = i + 1; }
  }
  refs.push(holds.slice(start).trim());
  return refs.filter(Boolean);
}

function main() {
  const text = readFileSync(MISTAKES_PATH, 'utf8');
  const entries = parseEntries(text).filter((e) => e.holds && e.holds !== 'none');

  const broken = [];
  let checked = 0;
  const gateCache = new Map();
  const readGate = (rel) => {
    if (gateCache.has(rel)) return gateCache.get(rel);
    const abs = path.join(ROOT, rel);
    const exists = existsSync(abs);
    const v = { exists, src: exists ? readFileSync(abs, 'utf8') : null };
    gateCache.set(rel, v);
    return v;
  };

  for (const entry of entries) {
    for (const ref of splitRefs(entry.holds)) {
      const m = ref.match(/^(quality\/gates\/[\w-]+\.mjs)\b\s*(?:\((.*)\))?/);
      if (!m) continue; // not a gate reference: some holds: name docs, core/, harness/, etc. Out of scope.
      checked++;
      const [, gatePath, note] = m;
      const gate = readGate(gatePath);
      if (!gate.exists) {
        broken.push({ num: entry.num, title: entry.title, line: entry.holdsLine, gatePath, reason: 'file does not exist' });
        continue;
      }
      if (!note) continue;
      const codes = [...note.matchAll(/`([^`]+)`/g)].map((mm) => mm[1]);
      for (const lit of codes) {
        if (!gate.src.includes(lit)) {
          broken.push({ num: entry.num, title: entry.title, line: entry.holdsLine, gatePath, reason: `code \`${lit}\` not found in file` });
        }
      }
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify({ checked, entriesWithHolds: entries.length, broken }, null, 2));
    process.exit(broken.length ? 1 : 0);
  }

  console.log(`mistakes-holds-check: ${checked} gate reference(s) checked across ${entries.length} non-none holds: entries.`);
  if (broken.length === 0) {
    console.log('mistakes-holds-check: OK, every holds: gate reference resolves.');
    return;
  }
  console.log(`\n${broken.length} broken holds: claim(s):`);
  for (const b of broken) {
    console.log(`  #${b.num} ${b.title} (engine-doctrine/MISTAKES.md:${b.line}): ${b.gatePath} -- ${b.reason}`);
  }
  process.exit(1);
}

main();
