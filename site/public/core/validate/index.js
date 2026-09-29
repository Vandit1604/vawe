// core/validate/index.js: barrel for the validate package. validate.mjs is the data + theme
// validator (validateData/validateTheme/validateAll/fxErrors/lintData), a single 1500+ line module
// with no sibling it alone owns: it draws from nearly every other package (type, timeline, motion,
// registry, layout...) rather than the reverse, so nothing else belongs in this package with it. Kept
// as its own dedicated package rather than folded into a consumer, because it has none: everything
// else is its consumer (W9).
export * from './validate.mjs';
