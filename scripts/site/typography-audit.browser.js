// Runs inside the page (injected by typography-audit.mjs). Sets window.typoAudit().
(() => {
  const SKIP = /^(CODE|PRE|SCRIPT|STYLE|SVG|TEXTAREA|KBD|NOSCRIPT)$/;
  const LITERAL = '.codeblock,.bp-code,pre,code';
  const PUNCT = {
    emdash: /\u2014/g,
    straightDq: /(^|[\s(\[])"|"(?=\w)|\w"/g,
    apos: /\w'\w|\w'(\s|$)|(^|\s)'\w/g,
    dots: /\.\.\./g,
    spacedHyphen: / - /g,
    numUnit: /\d (?:s|ms|px|fps|MB|KB|GB|Hz|dB|kHz|x|%|k|K|min|sec|frames?|seconds?)\b/g,
    hyphenRange: /(?<![\d-])\d{1,3}-\d{1,3}(?![\d-])/g,
  };

  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  }

  function isLiteral(node) {
    for (let p = node.parentElement; p; p = p.parentElement) if (SKIP.test(p.tagName)) return true;
    return Boolean(node.parentElement.closest(LITERAL));
  }

  function textNodes(root) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue.trim() && !isLiteral(n)) out.push(n);
    }
    return out;
  }

  function charsPerLine(el) {
    const lines = new Map();
    const range = document.createRange();
    for (const n of textNodes(el)) {
      for (let i = 0; i < n.nodeValue.length; i++) {
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        const key = Math.round(rect.top / 4);
        lines.set(key, (lines.get(key) || 0) + 1);
      }
    }
    return [...lines.values()];
  }

  function measureBlock(el) {
    const text = el.textContent.trim();
    if (text.length < 40 || el.querySelector('p,li') || el.closest('pre,.codeblock,nav,header,footer')) return null;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / size;
    const counts = charsPerLine(el);
    if (!counts.length) return null;
    return { tag: el.tagName, cls: String(el.className).slice(0, 30), size, lh: +lh.toFixed(2), width: Math.round(el.getBoundingClientRect().width), lines: counts.length, widest: Math.max(...counts), txt: text.slice(0, 40) };
  }

  function measureBlocks() {
    const els = [...document.querySelectorAll('main p, main li, main dd, main blockquote, .lp p, .lp li')].filter(visible).slice(0, 400);
    return els.map(measureBlock).filter(Boolean);
  }

  function measureHeadings() {
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
    const items = hs.slice(0, 60).map((h) => {
      const c = getComputedStyle(h);
      return { t: h.tagName, size: parseFloat(c.fontSize), w: c.fontWeight, ls: c.letterSpacing, lh: c.lineHeight, mt: c.marginTop, mb: c.marginBottom, txt: h.textContent.trim().slice(0, 30) };
    });
    return { levels: [...new Set(hs.map((h) => h.tagName))], items };
  }

  function measurePunct() {
    const counts = {};
    const samples = {};
    for (const n of textNodes(document.body)) {
      for (const [key, re] of Object.entries(PUNCT)) {
        const m = n.nodeValue.match(re);
        if (!m) continue;
        counts[key] = (counts[key] || 0) + m.length;
        samples[key] = samples[key] || [];
        if (samples[key].length < 3) samples[key].push(n.nodeValue.trim().slice(0, 70));
      }
    }
    return { counts, samples };
  }

  function capsOf(el, c) {
    const size = parseFloat(c.fontSize);
    const ls = c.letterSpacing === 'normal' ? 0 : parseFloat(c.letterSpacing) / size;
    return { cls: String(el.className || el.tagName).slice(0, 24), ls: +ls.toFixed(3), size };
  }

  function oddityOf(el, c) {
    const name = el.tagName + '.' + String(el.className || '').slice(0, 20);
    if (c.textDecorationLine.includes('underline') && el.tagName !== 'A' && !el.closest('a')) return 'underline:' + name;
    if (c.fontStyle === 'italic' && parseInt(c.fontWeight, 10) >= 600 && el.textContent.trim()) return 'bold-italic:' + name;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(' ');
    const size = parseFloat(c.fontSize);
    const mono = /mono/i.test(c.fontFamily);
    if (own && size < 12) return 'text-under-12px:' + name + ' ' + size;
    if (own.length >= 40 && !mono && size < 14) return 'sentence-under-14px:' + name + ' ' + size;
    const long = ['P', 'LI'].includes(el.tagName) && el.textContent.length > 120;
    if (c.textAlign === 'center' && long) return 'centered-long:' + name;
    return null;
  }

  function measureStyles() {
    const caps = [];
    const misc = [];
    for (const el of document.querySelectorAll('main *, header *, footer *, .lp *')) {
      if (!visible(el)) continue;
      const c = getComputedStyle(el);
      if (c.textTransform === 'uppercase' && el.textContent.trim()) caps.push(capsOf(el, c));
      const odd = oddityOf(el, c);
      if (odd) misc.push(odd);
    }
    return { caps, misc: [...new Set(misc)] };
  }

  function gapsAround(h) {
    const prev = h.previousElementSibling;
    const next = h.nextElementSibling;
    if (!prev || !next) return null;
    const r = h.getBoundingClientRect();
    return { above: Math.round(r.top - prev.getBoundingClientRect().bottom), below: Math.round(next.getBoundingClientRect().top - r.bottom) };
  }

  function measureGaps() {
    const hs = [...document.querySelectorAll('main h2, main h3, .lp h2')].filter(visible);
    return hs.map((h) => ({ txt: h.textContent.trim().slice(0, 28), ...gapsAround(h) })).filter((g) => g.above !== undefined && g.above <= g.below);
  }

  function measureTables() {
    return [...document.querySelectorAll('table')].filter(visible).map((t) => {
      const td = t.querySelector('td');
      return { tnum: td ? getComputedStyle(td).fontVariantNumeric : '', rows: t.rows.length };
    });
  }

  window.typoAudit = () => {
    const bs = getComputedStyle(document.body);
    const punct = measurePunct();
    const styles = measureStyles();
    return {
      body: { size: parseFloat(bs.fontSize), lh: bs.lineHeight, kerning: bs.fontKerning },
      blocks: measureBlocks(),
      headings: measureHeadings(),
      punct: punct.counts,
      samples: punct.samples,
      caps: styles.caps,
      misc: styles.misc,
      tables: measureTables(),
      gaps: measureGaps(),
      docH: document.documentElement.scrollHeight,
    };
  };
})();
