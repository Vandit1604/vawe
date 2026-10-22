import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePage } from '../../studio/page-source.mjs';

test('the studio reads a named ease variable as the easing of an animation shorthand', () => {
  const page = '<style>h1 { animation: rise 0.6s var(--ease-land) both 0.4s; } @keyframes rise { from { opacity: 0 } to { opacity: 1 } }</style><h1>a</h1>';
  const [rule] = parsePage(page).animRules;
  assert.equal(rule.name, 'rise');
  assert.equal(rule.easing.text, 'var(--ease-land)');
});
