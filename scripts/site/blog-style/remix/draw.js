// thumb.html?post=<slug>[&font=<family>]: one 1200x630 blog cover, seeded per post.
const displayFont = new URLSearchParams(location.search).get('font');
if (displayFont) document.documentElement.style.setProperty('--display', `'${displayFont}'`);
const fontLoaded = displayFont ? document.fonts.load(`800 64px '${displayFont}'`) : Promise.resolve();
const post = window.POSTS.find((x) => x.slug === new URLSearchParams(location.search).get('post'));
if (!post) throw new Error(`no post ${location.search}`);

document.documentElement.style.setProperty('--shade', window.Rays.TONES[post.tone][0].join(','));
document.getElementById('num').textContent = post.line;
document.getElementById('words').textContent = post.sub;
document.getElementById('section').textContent = post.section.replace('-', ' ');
window.Rays.draw(document.getElementById('ground').getContext('2d'), 1200, 630, post);

function fitWidth(el, maxWidth) {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.getBoundingClientRect().width > maxWidth) el.style.fontSize = `${(size -= 2)}px`;
}

fontLoaded.then(() => document.fonts.ready).then(() => {
  fitWidth(document.getElementById('num'), 912);
  fitWidth(document.getElementById('words'), 912);
  window.__ready = true;
});
