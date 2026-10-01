#!/usr/bin/env node
// `vawe spec-sync <page>`: writes the times the last draft measured into the brief's Words and Objects tables
// (harness/lib/spec-sync.mjs). Run it after you retimed on purpose; it changes no target (cap, x, y).
import fs from 'node:fs';
import path from 'node:path';
import { lastSpec } from './acceptance-run.mjs';
import { syncSpec } from '../lib/spec-sync.mjs';

const die = (m) => { console.error(`vawe spec-sync: ${m}`); process.exit(1); };

const page = process.argv[2];
if (!page) die('usage: vawe spec-sync <page.html>');
const dir = path.dirname(path.resolve(page));
const name = path.basename(page, '.html') === 'page' ? path.basename(dir) : path.basename(page, '.html');
const briefFile = path.join(dir, 'brief.md');
if (!fs.existsSync(briefFile)) die(`no brief.md next to ${page}`);
const measured = lastSpec(name);
if (!measured) die(`no draft measured the spec for ${name}; run: bin/vawe dev ${page}`);

const { text, changes, missing } = syncSpec(fs.readFileSync(briefFile, 'utf8'), measured);
fs.writeFileSync(briefFile, text);
console.log(changes.length ? [`spec-sync: ${changes.length} cell(s) changed in ${path.relative(process.cwd(), briefFile)}, each marked with * :`, ...changes.map((c) => `  ${c}`)].join('\n') : 'spec-sync: every measured time already matches the brief');
if (missing.length) console.log(`not measured by the last draft (left as written): ${missing.join(', ')}`);
