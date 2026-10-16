// thumb.html?post=<slug>[&font=<family>][&panel=solid|none]: one 1200x630 blog cover, seeded per post.
const params = new URLSearchParams(location.search);
const displayFont = params.get('font');
if (displayFont) document.documentElement.style.setProperty('--display', `'${displayFont}'`);
const fontLoaded = displayFont ? document.fonts.load(`600 64px '${displayFont}'`) : Promise.resolve();
const post = window.POSTS.find((x) => x.slug === params.get('post'));
if (!post) throw new Error(`no post ${location.search}`);
const panel = params.get('panel');

document.documentElement.style.setProperty('--shade', window.Rays.TONES[post.tone][0].join(','));
document.getElementById('num').textContent = post.line;
document.getElementById('words').textContent = post.sub;
document.getElementById('section').textContent = ({ 'how-to': 'how-to', 'motion-sound': 'motion and sound' })[post.section] || post.section;
if (panel === 'solid') document.querySelector('.chip').classList.add('solid');
if (panel === 'none') document.querySelector('.frame').classList.add('none');
const ground = document.getElementById('ground').getContext('2d');

function fitWidth(el, maxWidth) {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.getBoundingClientRect().width > maxWidth) el.style.fontSize = `${(size -= 2)}px`;
}

// keep(x, y): 0 inside a padded copy of every glyph, rising to 1 over a short distance, so the cut follows the letters.
// Each text is drawn again on an offscreen canvas with a round stroke as wide as twice the pad, then blurred.
function knockOut(els) {
  const mask = document.createElement('canvas');
  mask.width = 1200; mask.height = 630;
  const m = mask.getContext('2d', { willReadFrequently: true });
  m.filter = 'blur(14px)';
  m.fillStyle = m.strokeStyle = '#fff';
  m.lineJoin = 'round';
  for (const el of els) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const pad = 0.42 * 0.7 * size;
    m.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    m.letterSpacing = cs.letterSpacing;
    m.lineWidth = 2 * pad;
    for (const node of el.childNodes) {
      if (node.nodeType === 1) {
        const r = node.getBoundingClientRect();
        m.fillRect(r.left - pad, r.top - pad, r.width + 2 * pad, r.height + 2 * pad);
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      const baseline = r.top + m.measureText(node.textContent).fontBoundingBoxAscent;
      m.strokeText(node.textContent, r.left, baseline);
      m.fillText(node.textContent, r.left, baseline);
    }
  }
  const alpha = m.getImageData(0, 0, 1200, 630).data;
  const smooth = (v) => { const t = Math.min(1, Math.max(0, (v - 0.12) / 0.6)); return t * t * (3 - 2 * t); };
  return (x, y) => 1 - smooth(alpha[(Math.floor(y) * 1200 + Math.floor(x)) * 4 + 3] / 255);
}

fontLoaded.then(() => document.fonts.ready).then(() => {
  const maxWidth = panel === 'none' ? 1088 : 912;
  fitWidth(document.getElementById('num'), maxWidth);
  fitWidth(document.getElementById('words'), maxWidth);
  const keep = panel === 'none' ? knockOut(document.querySelectorAll('#num, #words, .label')) : null;
  window.Rays.draw(ground, 1200, 630, post, { keep });
  window.__ready = true;
});
