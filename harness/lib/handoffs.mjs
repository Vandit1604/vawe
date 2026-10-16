import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The handoff column of the Board's cut table ("family: object") as data, and the advice it earns.
// The grammar (the twelve families) is taste/craft/transitions.md; the way to choose is skills/vawe-transitions/SKILL.md.
// Pure: Board rows and measured transitions in, advice lines out. Advice only: a board is a plan.
export const MAX_PER_FILM = 2;
export const NEAR_S = 0.15;

// `fade` is no family of the twelve: it is the default that needs a reason. Order matters: the first match wins ("shared element" is a container transform, "shared axis" is not).
const FAMILIES = [
  ['deliberate-cut', /deliberate|hard.?cut|smash|jump.?cut/],
  ['sound-bridge', /sound|audio|[jl].?cut/],
  ['container-transform', /container|shared.?element/],
  ['shared-axis', /axis/],
  ['graphic-match', /graphic/],
  ['action-match', /action/],
  ['object-to-object', /object.?to.?object/],
  ['position-lock', /position/],
  ['flood', /flood|light|colou?r/],
  ['type-driven', /type|letter|glyph|word/],
  ['camera-through', /camera/],
  ['invisible-cut', /invisible|hidden/],
  ['fade', /fade|dissolve/],
];

// Families that put a visible change on screen. One that measures as a one-frame cut was not built.
const SHOWS = new Set(['flood', 'camera-through', 'container-transform', 'shared-axis', 'type-driven']);
const PLAIN = /\b(cross-?fade|dissolve|fade)\b/i;
const REASON = /\b(because|reason)\b/i;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dashed = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** The id of the handoff family a name stands for, or null (`fade` is no family of the twelve). */
export const handoffFamily = (name) => { const id = familyOf(name); return id === 'fade' ? null : id; };
const familyOf = (name) => FAMILIES.find(([, re]) => re.test(name.toLowerCase()))?.[0] ?? null;
const linked = (cell) => [...cell.matchAll(/\[[^\]]*\]\(([^)]*?)([a-z0-9-]+)\.md\)/g)].map((m) => m[2]);

/**
 * Move slugs of the "change between shots" rows of the move index, each with its handoff family when
 * the family table of taste/craft/transitions.md lists it ("moves to copy"), else the slug itself.
 */
export function transitionMoves(root = ROOT) {
  const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
  const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
  const listed = new Map();
  for (const line of read('taste', 'craft', 'transitions.md').split('\n').filter((l) => l.startsWith('|'))) {
    const c = cells(line);
    const id = c.length >= 5 ? familyOf(c[0]) : null;
    if (id) for (const slug of linked(c[4])) listed.set(slug, id);
  }
  const moves = new Map();
  for (const line of read('prompts', 'moves', 'README.md').split('\n')) {
    const c = line.startsWith('|') ? cells(line) : [];
    if (c[0]?.startsWith('change between shots')) for (const slug of linked(c[1] ?? '')) moves.set(slug, listed.get(slug) ?? slug);
  }
  return moves;
}

let moveIndex;
const moves = () => (moveIndex ??= transitionMoves());

function moveFamily(name, exact) {
  const n = dashed(name);
  if (!n) return null;
  for (const [slug, id] of moves()) if (slug === n || (!exact && slug.startsWith(`${n}-`))) return id;
  return null;
}

/** { id, name, object, text } of a handoff cell "family: object". `family` may also be a move of the "change between shots" index: an exact move name wins over a family word in it ("cursor-spotlight" is no flood), a prefix ("iris") is tried after the families. `id` is null for an unknown family, `name` is '' for an empty cell. */
export function parseHandoff(cell) {
  const text = (cell ?? '').trim();
  const colon = text.indexOf(':');
  const name = (colon < 0 ? text : text.slice(0, colon)).trim();
  return { id: moveFamily(name, true) ?? familyOf(name) ?? moveFamily(name, false), name, object: colon < 0 ? '' : text.slice(colon + 1).trim(), text };
}

const label = (i) => `cut ${i + 1}`;

/** Advice on the plan: a handoff per cut, the ledger, the defaults that need a reason. `rows` are board.mjs moveRows. */
export function handoffAdvice(rows) {
  if (!rows.length) return [];
  if (rows.every((r) => r.handoff === null)) return ['transitions: the Board cut table has no "handoff (family: object)" column; add it and plan a handoff per cut (skills/vawe-transitions/SKILL.md)'];
  const lines = [];
  const parsed = rows.map((r) => parseHandoff(r.handoff));
  parsed.forEach((h, i) => {
    if (!h.name) lines.push(`transitions: ${label(i)} has no planned handoff; name "family: object", or "deliberate cut: <reason>" when nothing carries over`);
    else if (!h.id) lines.push(`transitions: ${label(i)} names the family "${h.name}", none of the twelve in taste/craft/transitions.md`);
    if (h.name && PLAIN.test(h.text) && !REASON.test(h.text)) lines.push(`transitions: ${label(i)} is a plain fade or crossfade with no reason; add "because ..." or pick a family that carries something`);
  });
  const counted = parsed.map((h) => (h.id === 'deliberate-cut' ? null : h.id));
  counted.forEach((id, i) => { if (id && id === counted[i - 1]) lines.push(`transitions: cuts ${i} and ${i + 1} both use ${id}; change the family on adjacent cuts`); });
  for (const id of new Set(counted.filter(Boolean))) {
    const n = counted.filter((x) => x === id).length;
    if (n > MAX_PER_FILM) lines.push(`transitions: ${id} is used on ${n} cuts; at most ${MAX_PER_FILM} per film`);
  }
  return lines;
}

/**
 * Advice from the measured film: a planned visible handoff whose cut measures as a hard cut. `transitions` are
 * ref-measure/transition.mjs findTransitions records; `fps` the rate they were decoded at. A cut with no detected change is not judged
 * (a continuous camera has none).
 */
export function measuredAdvice(rows, transitions, fps) {
  const lines = [];
  rows.forEach((r, i) => {
    const { id, name } = parseHandoff(r.handoff);
    if (!SHOWS.has(id) || r.at === null) return;
    const [from, to] = [r.at - NEAR_S, (r.end ?? r.at) + NEAR_S];
    const hit = transitions.find((t) => t.startFrame / fps >= from && t.startFrame / fps <= to);
    if (hit && (hit.type === 'cut' || hit.type === 'match')) lines.push(`transitions: ${label(i)} plans ${name} but the film measures a hard cut at ${Math.round((hit.startFrame / fps) * 100) / 100} s; build the handoff or plan a deliberate cut`);
  });
  return lines;
}
