// canvasSource(canvas, { scale }) and htmlSource(element, { scale }) return { size: [w, h] in source px, async upload(gl, texture) }; `scale` is texture px per source px.
// An SVG image cannot load anything outside itself, so htmlSource inlines fonts, <img>, <canvas> and url() backgrounds as data URIs
// and turns text `content` of ::before / ::after into spans; scripts, iframes, video and counters do not carry over.

export function canvasSource(canvas, { scale = 1 } = {}) {
  return {
    size: [canvas.width / scale, canvas.height / scale],
    async upload(gl) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      return { width: canvas.width, height: canvas.height };
    },
  };
}

const NS = 'http://www.w3.org/1999/xhtml';
const dataCache = new Map();

async function toDataUrl(url) {
  if (url.startsWith('data:')) return url;
  if (!dataCache.has(url)) {
    dataCache.set(url, (async () => {
      const blob = await (await fetch(url)).blob();
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    })());
  }
  return dataCache.get(url);
}

let fontCss = null;
async function inlineFonts() {
  if (!fontCss) {
    fontCss = (async () => {
      await document.fonts.ready;
      const loaded = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
      let css = '';
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule.type !== CSSRule.FONT_FACE_RULE || !loaded.has(rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim())) continue;
          const src = rule.style.getPropertyValue('src');
          const m = /url\(["']?([^"')]+)["']?\)/.exec(src);
          if (!m) continue;
          const url = await toDataUrl(new URL(m[1], sheet.href || location.href).href);
          const weight = rule.style.getPropertyValue('font-weight') || 'normal';
          const style = rule.style.getPropertyValue('font-style') || 'normal';
          css += `@font-face{font-family:${rule.style.getPropertyValue('font-family')};src:url(${url});font-weight:${weight};font-style:${style};}`;
        }
      }
      return css;
    })();
  }
  return fontCss;
}

// The SVG image sees none of the page's stylesheets, only the UA defaults of an empty document: so a property is left
// out of the inline style only when the element has the value of a bare element of its tag in such a document AND the
// value of its parent clone, which is what it falls back to whether the property inherits or not.
let bareFrame = null;
const bareStyles = new Map();

function bareStyle(src) {
  const key = `${src.namespaceURI} ${src.localName}`;
  if (!bareStyles.has(key)) {
    if (!bareFrame) {
      bareFrame = document.createElement('iframe');
      bareFrame.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden';
    }
    document.body.appendChild(bareFrame);
    const doc = bareFrame.contentDocument;
    const el = doc.createElementNS(src.namespaceURI, src.localName);
    doc.body.appendChild(el);
    bareStyles.set(key, computedValues(el));
    bareFrame.remove();
  }
  return bareStyles.get(key);
}

function computedValues(src, pseudo) {
  const cs = (src.ownerDocument.defaultView || window).getComputedStyle(src, pseudo);
  const values = new Map();
  for (let i = 0; i < cs.length; i++) values.set(cs[i], cs.getPropertyValue(cs[i]));
  return values;
}

function copyStyle(src, dst, pseudo, parent = null) {
  const values = computedValues(src, pseudo);
  const bare = parent ? bareStyle(dst) : null;
  let css = '';
  for (const [name, value] of values) if (!parent || parent.get(name) !== value || bare.get(name) !== value) css += `${name}:${value};`;
  dst.setAttribute('style', css);
  return values;
}

const textOf = (content) => (content === 'none' || content === 'normal' ? null : content.replace(/^["']|["']$/g, ''));

function pseudoSpan(src, which, parent) {
  const content = textOf(getComputedStyle(src, which).content);
  if (content === null) return null;
  const span = document.createElementNS(NS, 'span');
  copyStyle(src, span, which, parent);
  span.textContent = content;
  return span;
}

async function cloneInlined(src, parent = null) {
  if (src instanceof HTMLCanvasElement) {
    const img = document.createElementNS(NS, 'img');
    copyStyle(src, img, undefined, parent);
    img.setAttribute('src', src.toDataURL());
    return img;
  }
  const dst = src.cloneNode(false);
  let values = null;
  if (src.nodeType === 1) {
    values = copyStyle(src, dst, undefined, parent);
    if (src instanceof HTMLImageElement) dst.setAttribute('src', await toDataUrl(src.currentSrc || src.src));
    const bg = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(src).backgroundImage);
    if (bg && !bg[1].startsWith('data:')) dst.style.backgroundImage = `url(${await toDataUrl(new URL(bg[1], location.href).href)})`;
  }
  const before = src.nodeType === 1 ? pseudoSpan(src, '::before', values) : null;
  if (before) dst.appendChild(before);
  for (const child of src.childNodes) {
    if (child.nodeType === 1 && /^(SCRIPT|STYLE)$/i.test(child.tagName)) continue;
    dst.appendChild(await cloneInlined(child, values));
  }
  const after = src.nodeType === 1 ? pseudoSpan(src, '::after', values) : null;
  if (after) dst.appendChild(after);
  return dst;
}

export function htmlSource(element, { scale = 1 } = {}) {
  Object.assign(element.style, { position: 'fixed', left: '0', top: '0', zIndex: '-1', pointerEvents: 'none' });
  const size = [element.offsetWidth, element.offsetHeight];
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size[0] * scale);
  canvas.height = Math.round(size[1] * scale);
  const ctx = canvas.getContext('2d');
  return {
    size,
    async upload(gl) {
      const clone = await cloneInlined(element);
      clone.style.cssText += ';position:static;left:auto;top:auto;z-index:auto;margin:0;transform:none;translate:none;rotate:none;scale:none;opacity:1;';
      clone.setAttribute('xmlns', NS);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${size[0]} ${size[1]}"><style>${await inlineFonts()}</style><foreignObject width="${size[0]}" height="${size[1]}">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`;
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      return { width: canvas.width, height: canvas.height };
    },
  };
}
