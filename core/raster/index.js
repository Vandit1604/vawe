// core/raster/index.js: barrel for the DOM-to-pixels serialiser (was core/resample/raster.js; its own
// header already called itself core/raster.js, since resample was only its second caller).
//
// RASTER_TYPES and UNSAMPLABLE_TYPES are the one place that names which layer types own a raster
// (sampled live) and which cannot be baked at all (their pixels live outside the DOM). Both lists were
// previously hardcoded a second time in core/validate/validate.mjs.
export const RASTER_TYPES = ['image', 'paint', 'shader'];
export const UNSAMPLABLE_TYPES = ['raymarch', 'three', 'globe', 'video'];
export * from './raster.js';
