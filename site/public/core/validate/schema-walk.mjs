import { isObj, typeOf, nearest } from './util.mjs';

// `block`/`beat`/`comp` are build-time sugar (core/engine/expand.js), not layer types the base schema
// describes: a layer naming one carries the factory's own props, checked by `make check GATE=blocks-audit`
// instead. Pulled out to its own function rather than three `||`s inline at each of checkField's two
// call sites, which is what pushed that switch over the complexity ceiling for one extra layer type.
const isSugarType = (t) => t === 'block' || t === 'beat' || t === 'comp';

// Every message here ends the same way, because every one of them has the same consequence: a schema
// error is never a warning. validateData feeds boot.js, which throws before the first frame, and the
// same errors[] feeds `make check GATE=validate`'s exit code. So the fact worth stating once, in every message
// rather than trusted to context, is what happens next: the render refuses to start until this line
// is fixed. (engine-doctrine/MISTAKES.md: a schema error with no stated consequence read as advice.)
const REFUSES = 'the render refuses to start until this is fixed';

function checkNumberField(spec, val, at, errors) {
  if (Number.isNaN(val)) errors.push(`${at} must be a number, not NaN: ${REFUSES}. Check the arithmetic that produced this value.`);
  if (spec.min != null && val < spec.min) errors.push(`${at} is ${val}, below the minimum ${spec.min}: ${REFUSES}. Raise it to ${spec.min} or more.`);
  if (spec.max != null && val > spec.max) errors.push(`${at} is ${val}, above the maximum ${spec.max}: ${REFUSES}. Lower it to ${spec.max} or less.`);
}

function checkStringField(spec, val, at, errors) {
  if (spec.minLength != null && val.length < spec.minLength) errors.push(`${at} is ${val.length} char(s), short of the ${spec.minLength} required: ${REFUSES}. Lengthen the string to at least ${spec.minLength} char(s).`);
  if (spec.enum && !spec.enum.includes(val)) {
    // `block`/`beat`/`comp` are BUILD-TIME sugar, not layer types: core/engine/expand.js resolves them at
    // load, before any real primitive is checked against this enum, so a scene that names one is
    // correct as authored, never an unknown-enum finding.
    if (!(at.endsWith('.type') && isSugarType(val)))
      errors.push(`${at} "${val}" is not valid: ${REFUSES}.${nearest(val, spec.enum)} Use one of: ${spec.enum.join(', ')}`);
  }
  if (spec.pattern && !new RegExp(spec.pattern).test(val)) errors.push(`${at} "${val}" does not match the required shape /${spec.pattern}/: ${REFUSES}. Rewrite the value to match that pattern.`);
}

function checkArrayField(spec, val, at, errors) {
  if (spec.minItems != null && val.length < spec.minItems) errors.push(`${at} has ${val.length} item(s), short of the ${spec.minItems} required: ${REFUSES}${spec.hint ? `, ${spec.hint}` : ''}. Add ${spec.minItems - val.length} more item(s).`);
  if (spec.maxItems != null && val.length > spec.maxItems) errors.push(`${at} has ${val.length} item(s), over the ${spec.maxItems} allowed: ${REFUSES}. Remove ${val.length - spec.maxItems} item(s).`);
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
      // A schema entry's own `hint` already carries the fix (what a good answer looks like, e.g. bg's),
      // so the generic "add this key" instruction is only useful when there is no hint to fall back on.
      if (spec.required) errors.push(`${at} is required: ${REFUSES}${spec.hint ? `, ${spec.hint}` : `. Add \`${key}\` to this object.`}`);
      continue;
    }
    // `type` may be a union like "number|string" (relative coords: 40 or "50%"). Any member matches.
    if (spec.type && !spec.type.split('|').includes(typeOf(val))) {
      errors.push(`${at} must be a ${spec.type}, got a ${typeOf(val)} (${JSON.stringify(val)}): ${REFUSES}. Change the value's type to ${spec.type}.`);
      continue; // type wrong → skip deeper checks
    }
    checkField(spec, val, at, errors);
  }
}

export { isSugarType, walk, checkField };
