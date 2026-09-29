// The five canvases a page film renders at, in pixels. Any other "w:h" ratio is fitted to the long edge at 1920.
export const ASPECTS = {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '4:3': [1440, 1080],
};

export function aspectDims(name = '') {
  if (ASPECTS[name]) return ASPECTS[name];
  const [aw, ah] = name.split(':').map(Number);
  if (aw && ah) {
    if (aw === ah) return [1080, 1080];
    return aw > ah ? [1920, Math.round(1920 * ah / aw)] : [Math.round(1920 * aw / ah), 1920];
  }
  return ASPECTS['9:16'];
}
