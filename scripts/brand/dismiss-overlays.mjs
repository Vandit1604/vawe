// dismiss-overlays: clear the furniture a marketing site puts BETWEEN you and the design.
//
// Newsletter modals, cookie walls, chat bubbles and sticky promo bars are close to universal, and every
// one of them is fixed-position, so it does not scroll away: it sits on top of EVERY section shot and
// every component capture. ramp.com's product-newsletter modal covered all eight of its sections, and
// the crawl reported success with the modal in all eight (engine-doctrine/MISTAKES.md #207).
//
// Two passes, in this order, because the polite one is safer:
//   1. ask, press Escape, then click anything that looks like a close control
//   2. remove, delete what is still covering the page
//
// The remove pass is deliberately conservative, and the first version was not conservative enough: it
// also took `position: sticky`, which is how a scrollytelling section PINS ITSELF while you scroll
// through it. On ramp.com that deleted the body of section 4 and the shot went from 1.1MB to 82KB of
// nothing. Overlays are `fixed`; sticky is a layout technique, and stripping it reflects a page the
// visitor never sees. Anything ambiguous is left alone, a shot with one stray chat bubble is
// recoverable, a shot missing the brand's own content is a lie about the brand.
export async function dismissOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const clicked = await page.evaluate(async () => {
    const CLOSE = [
      '[aria-label*="close" i]', '[aria-label*="dismiss" i]', '[title*="close" i]',
      'button[class*="close" i]', '[data-testid*="close" i]', '[id*="close" i]',
      // consent walls say "accept", and accepting is what makes them go away
      'button[id*="accept" i]', 'button[class*="accept" i]', '[data-testid*="accept" i]',
    ];
    let n = 0;
    for (const sel of CLOSE) {
      for (const el of document.querySelectorAll(sel)) {
        const b = el.getBoundingClientRect();
        if (b.width < 4 || b.height < 4 || b.width > 400) continue;   // a real control, not a banner
        try { el.click(); n++; } catch { /* not clickable, the remove pass will handle it */ }
      }
    }
    return n;
  });
  await new Promise((r) => setTimeout(r, 350));                        // let exit transitions finish

  const removed = await page.evaluate(() => {
    const VW = innerWidth, VH = innerHeight, area = VW * VH;
    const gone = [];
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed') continue;                            // sticky is layout, not furniture
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
      const b = el.getBoundingClientRect();
      if (b.width < 8 || b.height < 8) continue;
      const covers = (b.width * b.height) / area;
      const atTop = b.top <= 4 && b.height < VH * 0.35;                // the site's own sticky header
      if (atTop) continue;
      // a modal/scrim covering a real share of the frame, or a corner widget parked over the content
      const isScrim = covers > 0.12;
      const inCorner = b.bottom > VH - 140 && b.width < 420 && b.height < 420;
      const isBar = b.width > VW * 0.6 && b.height < VH * 0.3 && (b.bottom > VH - 8 || b.top < 8);
      if (!isScrim && !inCorner && !isBar) continue;
      gone.push((el.tagName + (el.id ? '#' + el.id : '') + ' ' + Math.round(covers * 100) + '%').trim());
      el.remove();
    }
    // a modal usually locks the page; unlock it or the scroll-to-mount pass captures one screenful
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    return gone;
  });

  if (clicked || removed.length) {
    console.error(`  · cleared ${clicked} close control(s), removed ${removed.length} overlay(s)${removed.length ? ': ' + removed.slice(0, 4).join(', ') : ''}`);
  }
  return { clicked, removed };
}
