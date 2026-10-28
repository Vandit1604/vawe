// The one line `vawe dev` prints for an auto-length page: the length, how it was found, and whether it sits in the film type's typical range.
import path from 'node:path';
import { readBrief } from './brief-tables.mjs';
import { typicalRangeFor } from '../cli/route.mjs';
import { REPO_ROOT } from './render-harness.mjs';

const num = (n) => +n.toFixed(2);

const requestOf = (brief) => /^## The request\n([\s\S]*?)(?=^## )/m.exec(brief ?? '')?.[1] ?? '';

function rangeAdvice(seconds, pagePath) {
  const type = typicalRangeFor({ request: requestOf(readBrief(pagePath)), name: path.basename(path.dirname(path.resolve(pagePath))) }, REPO_ROOT);
  if (!type) return '';
  const [lo, hi] = type.range;
  return `  ${type.type} range ${lo} to ${hi} s: ${seconds < lo ? 'under' : seconds > hi ? 'over' : 'ok'}`;
}

/** [] for a page that states its length; else the length line, with the range advice. `length` is resolveLength's object. */
export function lengthLines(length, pagePath) {
  if (!length.auto) return [];
  const ignored = length.ignoredInfinite ? '; an endless animation does not set the end' : '';
  return [`length: ${num(length.seconds)} s (auto: last move ends at ${num(length.endS)} s + ${num(length.holdS)} s hold${ignored})${rangeAdvice(length.seconds, pagePath)}`];
}
