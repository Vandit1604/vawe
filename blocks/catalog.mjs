// blocks/catalog.mjs — the REGISTRY MANIFEST. One data row per named block entry. This is the single
// source of truth for (a) what the registry contains, (b) how each renders in `make catalog`, and
// (c) the auto-generated docs/BLOCKS.md table. Adding a block = adding a row here (+ a `variant` branch
// in its family factory if it's a family.variant). No hand-placement, no per-block catalog code.
//
// Entry shape:
//   { name, family, blurb, props }
//   - name    : registry key. Bare ("card") → the raw factory. Namespaced ("card.pricing") → the family
//               called with props merged UNDER call-time opts (so a scene can still override anything).
//   - family  : which factory in blocks/index.mjs renders it.
//   - blurb   : one line for the catalog label + the docs table.
//   - props   : example/default content props (NO x/y/start/dur — the catalog + expander supply those).
//   - overlay : true → a full-frame overlay (captions); skipped in the grid catalog.
//
// Hex literals (not TOKENS) on purpose: index.mjs imports THIS, so this must not import index.mjs.

export const CATALOG = [
  { name: 'card', family: 'card', blurb: 'elevated card · tinted panel · pill tags · CTA arrow',
    props: { w: 540, h: 300, title: 'Layers', desc: 'Text, image, count, cursor.', pills: ['Text', 'Image', 'Count'] } },
  { name: 'codeBlock', family: 'codeBlock', blurb: 'code card; syntax-coloured lines',
    props: { w: 540, dark: true, label: 'scene.json', size: 19, lines: [
      { text: '{', color: '#8898AA' }, { text: '  "module": "scene",', color: '#E8ECF1' },
      { text: '  "theme": "creed",', color: '#3ECF8E' }, { text: '}', color: '#8898AA' }] } },
  { name: 'terminal', family: 'terminal', blurb: 'command prompt; command decodes in, output reveals',
    props: { w: 540, command: 'make video', output: ['rendering 1950 frames...', 'done → out.mp4'] } },
  { name: 'loadingBar', family: 'loadingBar', blurb: 'determinate fill wipes L→R, lands ✓ done',
    props: { w: 340, fillDur: 1.6, label: 'rendering' } },
  { name: 'deploySuccess', family: 'deploySuccess', blurb: 'CI cascade → green "Deployed to production" card',
    props: { w: 520 } },
  { name: 'browserFrame', family: 'browserFrame', blurb: 'window chrome (traffic dots + URL bar)',
    props: { w: 540, h: 300, url: 'stripe.com' } },
  { name: 'pillRow', family: 'pillRow', blurb: 'horizontal row of chip tags',
    props: { items: ['deterministic', 'pure(n)', 'no timeline'] } },
  { name: 'statBig', family: 'statBig', blurb: 'scale-contrast stat — huge count + tiny label',
    props: { to: 1950, label: 'frames', size: 120 } },
  { name: 'colorCycle', family: 'colorCycle', blurb: 'one word cycling through hues',
    props: { word: 'colour', size: 64, each: 0.4 } },
  { name: 'stripeCard', family: 'stripeCard', blurb: 'recognizably-Stripe payments card',
    props: { w: 340 } },
  { name: 'barChart', family: 'barChart', blurb: 'labeled bars scaled to max',
    props: { w: 520, h: 240, data: [
      { label: 'Mon', value: 38 }, { label: 'Tue', value: 66 }, { label: 'Wed', value: 52 },
      { label: 'Thu', value: 80 }, { label: 'Fri', value: 72 }] } },
  { name: 'diff', family: 'diff', blurb: 'code diff card (+/- coloured)',
    props: { w: 520, lines: [
      { sign: '-', text: 'const x = fetch()' }, { sign: '+', text: 'const x = await fetch()' },
      { sign: ' ', text: 'return x.json()' }] } },
  { name: 'quote', family: 'quote', blurb: 'pull quote + attribution',
    props: { w: 540, text: 'One JSON becomes one video.', author: 'shortwave' } },
  { name: 'notification', family: 'notification', blurb: 'toast card (dot + title + body)',
    props: { w: 440, title: 'Render complete', body: 'out.mp4 · 65s · 1950 frames', accent: '#16A34A' } },
  { name: 'kpiRow', family: 'kpiRow', blurb: 'row of stat cells (value + label)',
    props: { items: [{ value: '30fps', label: 'frame rate' }, { value: '2×', label: 'supersample' }, { value: '0', label: 'timelines' }] } },
  { name: 'callout', family: 'callout', blurb: 'info/success/warn strip',
    props: { w: 540, text: 'Same input, byte-identical output.', tone: 'success' } },
  { name: 'comparison', family: 'comparison', blurb: 'two columns (Before/After · Others/Us)',
    props: { w: 560, leftTitle: 'Templates', rightTitle: 'Shortwave', left: ['Fixed slots', 'Same look'], right: ['Open canvas', 'Per-brand'] } },
  { name: 'captions', family: 'captions', overlay: true, blurb: 'timed subtitle chips (bottom overlay)',
    props: { lines: [{ t: 0.2, text: 'every frame fights for its value' }] } },

  // ── namespaced variants: distinct registry entries built PURELY from preset props (no factory code).
  //    This is the cheapest way to grow the arsenal — a data row is a new named block.
  { name: 'codeBlock.light', family: 'codeBlock', blurb: 'code card, light surface',
    props: { w: 540, dark: false, label: 'terminal', size: 19, lines: ['./bin/shortwave video.json', '✓ engine/out/video.mp4'] } },
  { name: 'callout.info', family: 'callout', blurb: 'info strip (blurple)',
    props: { w: 540, text: 'Layers compose from a single canvas.', tone: 'info' } },
  { name: 'callout.warn', family: 'callout', blurb: 'warning strip (terracotta)',
    props: { w: 540, text: 'No em-dashes in on-screen copy.', tone: 'warn' } },
  { name: 'comparison.beforeAfter', family: 'comparison', blurb: 'Before / After columns',
    props: { w: 560, leftTitle: 'Before', rightTitle: 'After', left: ['Hand-timed', 'Drifts per run'], right: ['Pure in n', 'Byte-identical'] } },
  { name: 'notification.warn', family: 'notification', blurb: 'toast, amber accent',
    props: { w: 440, title: 'Grain crawls on text', body: 'opt in only for filmic brands', accent: '#F6A417' } },
  { name: 'statBig.currency', family: 'statBig', blurb: 'stat with a $ unit',
    props: { to: 880, unit: '$B', label: 'market', size: 120 } },

  // ── wave 1: charts + card variants (new factories) ──
  { name: 'lineChart', family: 'lineChart', blurb: 'trend line in a hairline card',
    props: { w: 540, h: 240, label: 'requests / day', data: [
      { label: 'M', value: 32 }, { label: 'T', value: 48 }, { label: 'W', value: 41 },
      { label: 'T', value: 63 }, { label: 'F', value: 58 }, { label: 'S', value: 79 }] } },
  { name: 'lineChart.area', family: 'lineChart', blurb: 'trend line with area fill',
    props: { w: 540, h: 240, area: true, color: '#16A34A', label: 'growth', data: [
      { label: 'Q1', value: 12 }, { label: 'Q2', value: 22 }, { label: 'Q3', value: 30 }, { label: 'Q4', value: 55 }] } },
  { name: 'donutChart', family: 'donutChart', blurb: 'ring segments + legend',
    props: { w: 320, label: 'traffic', segments: [
      { value: 52, color: '#635BFF', label: 'Direct' }, { value: 30, color: '#3ECF8E', label: 'Search' }, { value: 18, color: '#F6A417', label: 'Social' }] } },
  { name: 'stackedBar', family: 'stackedBar', blurb: 'multi-series stacked bars',
    props: { w: 520, h: 260, series: [{ color: '#635BFF' }, { color: '#3ECF8E' }], data: [
      { label: 'Mon', values: [24, 18] }, { label: 'Tue', values: [30, 22] }, { label: 'Wed', values: [20, 28] }, { label: 'Thu', values: [36, 24] }] } },
  { name: 'card.pricing', family: 'pricingCard', blurb: 'plan · price · features · CTA',
    props: { w: 340, plan: 'Pro', price: '$29', features: ['Unlimited renders', 'Every format', '60fps export'], cta: 'Start free', highlight: true } },
  { name: 'card.stat', family: 'statCard', blurb: 'boxed KPI with delta chip',
    props: { w: 340, to: 1950, label: 'frames rendered', delta: '+12%', deltaUp: true } },
  { name: 'card.profile', family: 'profileCard', blurb: 'avatar · name · role',
    props: { w: 360, name: 'Ada Lovelace', role: 'Founding Engineer', initials: 'AL' } },
];
