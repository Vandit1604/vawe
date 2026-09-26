export { onScreenText, glyphText } from '../../core/type/on-screen-text.js';
import { onScreenText } from '../../core/type/on-screen-text.js';

export const layerText = (l) => (l && (l.type === 'text' || l.type === 'count' || l.type == null) ? onScreenText(l.text) : '');

export const snippet = (s, n = 24) => {
  const t = onScreenText(s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
