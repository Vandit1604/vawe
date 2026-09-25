import { isObj, typeOf, nearest } from './util.mjs';

// `block`/`beat`/`comp` are build-time sugar (core/engine/expand.js), not layer types the base schema
// describes: a layer naming one carries the factory's own props, checked by `make blocks-audit`
// instead. Pulled out to its own function rather than three `||`s inline at each of checkField's two
// call sites, which is what pushed that switch over the complexity ceiling for one extra layer type.
const isSugarType = (t) => t === 'block' || t === 'beat' || t === 'comp';

function checkNumberField(spec, val, at, errors) {
  if (Number.isNaN(val)) errors.push(`${at} must be a number (got NaN)`);
  if (spec.min != null && val < spec.min) errors.push(`${at} must be ≥ ${spec.min} (got ${val})`);
  if (spec.max != null && val > spec.max) errors.push(`${at} must be ≤ ${spec.max} (got ${val})`);
}

function checkStringField(spec, val, at, errors) {
  if (spec.minLength != null && val.length < spec.minLength) errors.push(`${at} must be ≥ ${spec.minLength} chars`);
  if (spec.enum && !spec.enum.includes(val)) {
    // `block`/`beat`/`comp` are BUILD-TIME sugar, not layer types: core/engine/expand.js resolves them at
    // load, before any real primitive is checked against this enum, so a scene that names one is
    // correct as authored, never an unknown-enum finding.
    if (!(at.endsWith('.type') && isSugarType(val)))
      errors.push(`${at} "${val}" is not valid.${nearest(val, spec.enum)} One of: ${spec.enum.join(', ')}`);
  }
  if (spec.pattern && !new RegExp(spec.pattern).test(val)) errors.push(`${at} must match /${spec.pattern}/ (got "${val}")`);
}

function checkArrayField(spec, val, at, errors) {
  if (spec.minItems != null && val.length < spec.minItems) errors.push(`${at} needs ≥ ${spec.minItems} item(s) (got ${val.length})${spec.hint ? `, ${spec.hint}` : ''}`);
  if (spec.maxItems != null && val.length > spec.maxItems) errors.push(`${at} allows ≤ ${spec.maxItems} item(s) (got ${val.length})`);
  // A block/beat/comp layer carries the BLOCK's/BEAT's props (a pointer's `to:{x,y}`, a kpiRow's
  // `items:[…]`), NOT the base layer schema, blocks-audit owns those. The unknown-prop pass already
  // exempts them; this TYPE pass must too, or a valid block prop (`to` object vs the layer's `to`
  // number) fails and the scene cannot boot (this silently broke showcase-spot/flight). Same intent
  // as the note at the layers checkLayer pass below.
  if (isObj(spec.item)) val.forEach((el, i) => {
    if (isObj(el) && isSugarType(el.type)) return;
    walk(spec.item, el, `${at}[${i}].`, errors);
  });
}

function checkObjectField(spec, val, at, errors) {
  if (isObj(spec.fields)) walk(spec.fields, val, `${at}.`, errors);
}

const FIELD_CHECKS = { number: checkNumberField, string: checkStringField, array: checkArrayField, object: checkObjectField };

function checkField(spec, val, at, errors) {
  const fn = FIELD_CHECKS[spec.type];
  if (fn) fn(spec, val, at, errors);
}

function walk(fields, obj, path, errors) {
  for (const [key, spec] of Object.entries(fields)) {
    if (!isObj(spec)) continue;
    const val = obj?.[key];
    const at = `${path}${key}`;
    if (val == null) {
      if (spec.required) errors.push(`${at} is required${spec.hint ? `, ${spec.hint}` : ''}`);
      continue;
    }
    // `type` may be a union like "number|string" (relative coords: 40 or "50%"). Any member matches.
    if (spec.type && !spec.type.split('|').includes(typeOf(val))) {
      errors.push(`${at} must be a ${spec.type} (got ${typeOf(val)})`);
      continue; // type wrong → skip deeper checks
    }
    checkField(spec, val, at, errors);
  }
}

export { isSugarType, walk, checkField };
