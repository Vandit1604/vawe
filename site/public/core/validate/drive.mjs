// core/validate/drive.mjs: `drive.wiggle` (core/tracks/drive.js) throws a good error naming `prop` and
// the valid values, but only from frame(), called per RENDERED FRAME: a scene missing `prop` passes
// every author-time check clean and only fails deep into `make dev`, after frames have already been
// spent on it. Same constraint (PROPS_DRIVEN, imported not copied), asked at validate time instead.
import { isObj, nearest } from './util.mjs';
import { PROPS_DRIVEN } from '../tracks/drive.js';

function wiggleErrors(spec, at, out) {
  if (!isObj(spec) || Array.isArray(spec)) {
    out.push(`${at} must be an object like { "prop": "rot", "freq": 1.5, "amp": 2 }, got ${JSON.stringify(spec)}.`);
    return;
  }
  if (!PROPS_DRIVEN.includes(spec.prop)) {
    out.push(`${at}.prop must be one of ${PROPS_DRIVEN.join(', ')}, got ${JSON.stringify(spec.prop)}.`
      + `${nearest(String(spec.prop), PROPS_DRIVEN)}`);
  }
}

export function driveErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    if (isObj(L.drive) && L.drive.wiggle != null) {
      const list = Array.isArray(L.drive.wiggle) ? L.drive.wiggle : [L.drive.wiggle];
      const many = Array.isArray(L.drive.wiggle);
      list.forEach((w, j) => wiggleErrors(w, `${at}.drive.wiggle${many ? `[${j}]` : ''}`, out));
    }
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layers[${i}]`));
  return out;
}
