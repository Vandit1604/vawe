// icons.js — inline stroke SVG icons (currentColor, deterministic, no network). Premium 24px grid.
// Use in scenes: svgIcon('bolt', { size: 40, color: '#1f3bff' }). Named separately from lib.js icon()
// (which renders image paths) to avoid collision.
export const ICONS = {
  file: '<path d="M6 2.5h7l5 5V21.5H6z"/><path d="M13 2.5v5h5"/>',
  check: '<path d="M4 12.5l5 5 11-11"/>',
  shield: '<path d="M12 2.5l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  bolt: '<path d="M13 2.5L4.5 14H10l-1 7.5L19.5 10H14z"/>',
  dollar: '<path d="M12 2.5v19M16.5 6.5a4.5 3.5 0 00-4.5-2.5 3.5 3.5 0 000 7 3.5 3.5 0 010 7 4.5 3.5 0 01-4.5-2.5"/>',
  link: '<path d="M9.5 14.5l5-5M8 12l-2.2 2.2a3.1 3.1 0 004.4 4.4L12.5 16M16 12l2.2-2.2a3.1 3.1 0 00-4.4-4.4L11.5 8"/>',
  cube: '<path d="M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z"/><path d="M12 12l8.5-4.75M12 12v9.5M12 12L3.5 7.25"/>',
  agent: '<rect x="4.5" y="7.5" width="15" height="12" rx="3.5"/><path d="M12 3v4.5M9 13.5h.01M15 13.5h.01M9.5 16.5h5"/>',
  braces: '<path d="M8.5 3.5c-2 0-3 1-3 3v2.5l-2 3 2 3V20c0 2 1 3 3 3M15.5 3.5c2 0 3 1 3 3v2.5l2 3-2 3V20c0 2-1 3-3 3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3.2 12h17.6M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>',
  arrowRight: '<path d="M4.5 12h14M12.5 6l6 6-6 6"/>',
  spark: '<path d="M12 2.5l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  plug: '<path d="M8 2.5v6M16 2.5v6M6 8.5h12v3a6 6 0 01-12 0zM12 17.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5M3 16.5l9 5 9-5"/>',
};
export function svgIcon(name, { size = 24, color = 'currentColor', stroke = 1.9, fill = 'none' } = {}) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${ICONS[name] || ''}</svg>`;
}
