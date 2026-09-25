// core/layers/kinds.js: which timeline lane each layer type draws in, and each lane's icon.
// One owner. The studio timeline (studio/ui/studio.js, a classic script, keeps a literal copy that
// quality/gates/lib-test.mjs holds equal to this) and the site (site/lib/layer-kinds.json, generated
// by scripts/site/layer-kinds.mjs) both follow it. Captions and sound are drawn by their own rows.
export const KIND = {
  text: 'text', type: 'text', count: 'text', beat: 'text',
  image: 'media', video: 'media', lottie: 'media', clip: 'media',
  rect: 'shape', svg: 'shape', paint: 'shape', glow: 'shape', shader: 'shape', beam: 'shape', canvas: 'shape', cursor: 'shape',
};

export const kindOf = (type) => KIND[type] || 'comp';

export const LANES = ['text', 'media', 'shape', 'comp', 'cap', 'sound'];

export const ICON = {
  text: '<svg viewBox="0 0 16 16"><path d="M3.5 3.5h9M8 3.5v9"/></svg>',
  media: '<svg viewBox="0 0 16 16"><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M2.5 10.5l3-3 3 3 2-2 3 3"/></svg>',
  shape: '<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>',
  comp: '<svg viewBox="0 0 16 16"><path d="M2.5 5.5L8 3l5.5 2.5L8 8z"/><path d="M2.5 10.5L8 13l5.5-2.5"/></svg>',
  cap: '<svg viewBox="0 0 16 16"><rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M4.5 9.5h2M8.5 9.5h3"/></svg>',
  sound: '<svg viewBox="0 0 16 16"><path d="M6 12V3.5l6.5-1.5v8.5"/><circle cx="4.5" cy="12" r="1.6"/><circle cx="11" cy="10.5" r="1.6"/></svg>',
};
