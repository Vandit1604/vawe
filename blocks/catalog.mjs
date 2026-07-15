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
      { text: '  "theme": "creed",', color: 'var(--up)' }, { text: '}', color: '#8898AA' }] } },
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
    props: { w: 540, text: 'One JSON becomes one video.', author: 'vawe' } },
  { name: 'notification', family: 'notification', blurb: 'toast card (dot + title + body)',
    props: { w: 440, title: 'Render complete', body: 'out.mp4 · 65s · 1950 frames', accent: 'var(--up)' } },
  { name: 'kpiRow', family: 'kpiRow', blurb: 'row of stat cells (value + label)',
    props: { items: [{ value: '30fps', label: 'frame rate' }, { value: '2×', label: 'supersample' }, { value: '0', label: 'timelines' }] } },
  { name: 'callout', family: 'callout', blurb: 'info/success/warn strip',
    props: { w: 540, text: 'Same input, byte-identical output.', tone: 'success' } },
  { name: 'comparison', family: 'comparison', blurb: 'two columns (Before/After · Others/Us)',
    props: { w: 560, leftTitle: 'Templates', rightTitle: 'Vawe', left: ['Fixed slots', 'Same look'], right: ['Open canvas', 'Per-brand'] } },
  { name: 'captions', family: 'captions', overlay: true, blurb: 'timed subtitle chips (bottom overlay)',
    props: { lines: [{ t: 0.2, text: 'every frame fights for its value' }] } },

  // ── namespaced variants: distinct registry entries built PURELY from preset props (no factory code).
  //    This is the cheapest way to grow the arsenal — a data row is a new named block.
  { name: 'codeBlock.light', family: 'codeBlock', blurb: 'code card, light surface',
    props: { w: 540, dark: false, label: 'terminal', size: 19, lines: ['./bin/vawe video.json', '✓ engine/out/video.mp4'] } },
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
    props: { w: 540, h: 240, area: true, color: 'var(--up)', label: 'growth', data: [
      { label: 'Q1', value: 12 }, { label: 'Q2', value: 22 }, { label: 'Q3', value: 30 }, { label: 'Q4', value: 55 }] } },
  { name: 'donutChart', family: 'donutChart', blurb: 'ring segments + legend',
    props: { w: 320, label: 'traffic', segments: [
      { value: 52, color: 'var(--accent)', label: 'Direct' }, { value: 30, color: 'var(--up)', label: 'Search' }, { value: 18, color: '#F6A417', label: 'Social' }] } },
  { name: 'stackedBar', family: 'stackedBar', blurb: 'multi-series stacked bars',
    props: { w: 520, h: 260, series: [{ color: 'var(--accent)' }, { color: 'var(--up)' }], data: [
      { label: 'Mon', values: [24, 18] }, { label: 'Tue', values: [30, 22] }, { label: 'Wed', values: [20, 28] }, { label: 'Thu', values: [36, 24] }] } },
  { name: 'card.pricing', family: 'pricingCard', blurb: 'plan · price · features · CTA',
    props: { w: 340, plan: 'Pro', price: '$29', features: ['Unlimited renders', 'Every format', '60fps export'], cta: 'Start free', highlight: true } },
  { name: 'card.stat', family: 'statCard', blurb: 'boxed KPI with delta chip',
    props: { w: 340, to: 1950, label: 'frames rendered', delta: '+12%', deltaUp: true } },
  { name: 'card.profile', family: 'profileCard', blurb: 'avatar · name · role',
    props: { w: 360, name: 'Ada Lovelace', role: 'Founding Engineer', initials: 'AL' } },

  // ── wave 2: dev blocks + device/UI chrome ──
  { name: 'fileTree', family: 'fileTree', blurb: 'indented file/folder tree',
    props: { w: 360, items: [
      { name: 'core', type: 'dir', depth: 0 }, { name: 'layers', type: 'dir', depth: 1 },
      { name: 'lottie.js', type: 'file', depth: 2, active: true }, { name: 'motion.js', type: 'file', depth: 1 },
      { name: 'blocks', type: 'dir', depth: 0 }, { name: 'index.mjs', type: 'file', depth: 1 }] } },
  { name: 'logLines', family: 'logLines', blurb: 'log stream (timestamp + level colour)',
    props: { w: 540, lines: [
      { t: '12:04', level: 'info', text: 'capturing 1950 frames' }, { t: '12:04', level: 'ok', text: 'encode done' },
      { t: '12:05', level: 'warn', text: 'grain skipped (opt-in)' }, { t: '12:05', level: 'ok', text: 'out.mp4 written' }] } },
  { name: 'logLines.light', family: 'logLines', blurb: 'log stream on a light surface',
    props: { w: 540, dark: false, lines: [
      { level: 'ok', text: 'validate: 1 ok, 0 failed' }, { level: 'ok', text: 'purity OK · order-independent' }] } },
  { name: 'commitRow', family: 'commitRow', blurb: 'git history list',
    props: { w: 540, commits: [
      { hash: 'd417051', msg: 'taste system + block registry', author: 'vandit', time: '2m' },
      { hash: '94b73bd', msg: 'migrate animation to interpolate()', author: 'vandit', time: '1d' }] } },
  { name: 'phoneFrame', family: 'phoneFrame', blurb: 'phone shell (draw content on top)',
    props: { w: 230, h: 440 } },
  { name: 'tabBar', family: 'tabBar', blurb: 'segmented control',
    props: { w: 500, active: 1, tabs: ['Design', 'Motion', 'Export'] } },

  // ── wave 3: lists & structure ──
  { name: 'checklist', family: 'checklist', blurb: 'checked / unchecked items',
    props: { w: 460, items: [
      { text: 'Write scene JSON', done: true }, { text: 'make critique', done: true },
      { text: 'make catalog', done: true }, { text: 'Render', done: false }] } },
  { name: 'table', family: 'table', blurb: 'data table (header + rows)',
    props: { w: 560, cols: ['Format', 'FPS', 'Status'], rows: [
      ['portrait', '30', 'ready'], ['landscape', '60', 'ready'], ['alpha', '30', 'beta']] } },
  { name: 'timeline', family: 'timeline', blurb: 'vertical rail of events',
    props: { w: 460, items: [
      { title: 'Captured frames', meta: '12:04', done: true }, { title: 'Encoded mp4', meta: '12:05', done: true },
      { title: 'Uploaded', meta: 'pending', done: false }] } },
  { name: 'stepFlow', family: 'stepFlow', blurb: 'horizontal numbered steps',
    props: { w: 560, active: 2, steps: ['Capture', 'Encode', 'Mux', 'Upload'] } },
  { name: 'kanban', family: 'kanban', blurb: 'columns of cards',
    props: { w: 560, columns: [
      { title: 'Todo', cards: ['captions', 'TTS'] }, { title: 'Doing', cards: ['blocks'] }, { title: 'Done', cards: ['60fps', 'lottie'] }] } },

  // ── wave 4: social & messaging ──
  { name: 'chatBubble', family: 'chatBubble', blurb: 'a message thread',
    props: { w: 460, messages: [
      { text: 'One JSON becomes one video?' }, { text: 'Yep. Pure in n.', me: true },
      { text: 'No timeline?' }, { text: 'None. Just renderFrame.', me: true }] } },
  { name: 'tweetCard', family: 'tweetCard', blurb: 'a post card + counts',
    props: { w: 480, name: 'Vawe', handle: 'vawe', initials: 'SW', likes: '1.2k', reposts: '340',
      text: 'One JSON. One video. Deterministic, no timeline.' } },
  { name: 'avatarStack', family: 'avatarStack', blurb: 'overlapping avatars + overflow',
    props: { extra: 8, avatars: [{ initials: 'AL' }, { initials: 'GH' }, { initials: 'VS' }, { initials: 'KM' }] } },
  { name: 'toast', family: 'toast', blurb: 'dark snackbar + action',
    props: { w: 420, message: 'Video rendered to out.mp4', action: 'Open' } },
  { name: 'reactionBar', family: 'reactionBar', blurb: 'reaction count pills',
    props: { reactions: [{ emoji: '🔥', count: 24, mine: true }, { emoji: '👍', count: 12 }, { emoji: '🎉', count: 5 }] } },

  // ── wave 5: brand & motion ──
  { name: 'logoWall', family: 'logoWall', blurb: 'grid of wordmarks / logos',
    props: { w: 560, logos: [{ text: 'Stripe' }, { text: 'Linear' }, { text: 'Vercel' }, { text: 'Notion' }, { text: 'Figma' }, { text: 'Raycast' }] } },
  { name: 'badge', family: 'badge', blurb: 'CI-shield token (label · value)',
    props: { label: 'build', value: 'passing', tone: 'ok' } },
  { name: 'badge.version', family: 'badge', blurb: 'version badge',
    props: { label: 'vawe', value: 'v2.0', tone: 'accent' } },
  { name: 'gauge', family: 'gauge', blurb: 'semicircular meter',
    props: { w: 300, value: 72, label: 'coverage' } },
  { name: 'progressRing', family: 'progressRing', blurb: 'circular progress + % label',
    props: { size: 150, value: 68, label: 'render' } },
  { name: 'banner', family: 'banner', blurb: 'accent announcement bar',
    props: { w: 560, text: 'Now with 60fps export', cta: 'See how' } },
  { name: 'spinner', family: 'spinner', blurb: 'looping Lottie (deterministic)',
    props: { size: 90, label: 'rendering' } },

  // ══ variant-fill pass — distinct presets/states, pure manifest rows (factories already exist) ══
  { name: 'codeBlock.py', family: 'codeBlock', blurb: 'code card, python',
    props: { w: 540, dark: true, label: 'render.py', size: 19, lines: [
      { text: 'from vawe import render', color: '#8898AA' }, { text: 'render("video.json")', color: '#E8ECF1' }] } },
  { name: 'terminal.git', family: 'terminal', blurb: 'git command',
    props: { w: 540, command: 'git push origin main', output: ['Enumerating objects: 12, done.', 'main -> main'] } },
  { name: 'terminal.install', family: 'terminal', blurb: 'install command',
    props: { w: 540, command: 'npm i vawe', output: ['added 1 package', 'done in 1.2s'] } },
  { name: 'diff.config', family: 'diff', blurb: 'config diff',
    props: { w: 520, lines: [{ sign: '-', text: '"fps": 30' }, { sign: '+', text: '"fps": 60' }, { sign: ' ', text: '"theme": "creed"' }] } },
  { name: 'barChart.green', family: 'barChart', blurb: 'bars in success green',
    props: { w: 520, h: 240, color: 'var(--up)', data: [{ label: 'Q1', value: 40 }, { label: 'Q2', value: 55 }, { label: 'Q3', value: 68 }, { label: 'Q4', value: 90 }] } },
  { name: 'lineChart.down', family: 'lineChart', blurb: 'declining trend (red)',
    props: { w: 540, h: 240, color: 'var(--down)', label: 'churn', data: [{ label: 'M', value: 62 }, { label: 'T', value: 55 }, { label: 'W', value: 48 }, { label: 'T', value: 30 }] } },
  { name: 'donutChart.two', family: 'donutChart', blurb: 'two-segment ring',
    props: { w: 320, label: 'pass / fail', segments: [{ value: 88, color: 'var(--up)', label: 'Pass' }, { value: 12, color: 'var(--down)', label: 'Fail' }] } },
  { name: 'stackedBar.three', family: 'stackedBar', blurb: 'three-series stack',
    props: { w: 520, h: 260, series: [{ color: 'var(--accent)' }, { color: 'var(--up)' }, { color: '#F6A417' }], data: [
      { label: 'Mon', values: [18, 14, 8] }, { label: 'Tue', values: [22, 16, 10] }, { label: 'Wed', values: [16, 20, 12] }] } },
  { name: 'gauge.warn', family: 'gauge', blurb: 'gauge, low (amber)',
    props: { w: 300, value: 34, color: '#F6A417', label: 'health' } },
  { name: 'gauge.full', family: 'gauge', blurb: 'gauge, complete (green)',
    props: { w: 300, value: 100, color: 'var(--up)', label: 'passing' } },
  { name: 'progressRing.done', family: 'progressRing', blurb: 'ring, 100% (green)',
    props: { size: 150, value: 100, color: 'var(--up)', label: 'complete' } },
  { name: 'progressRing.low', family: 'progressRing', blurb: 'ring, low (amber)',
    props: { size: 150, value: 22, color: '#F6A417', label: 'battery' } },
  { name: 'kpiRow.money', family: 'kpiRow', blurb: 'KPI row, currency',
    props: { items: [{ value: '$2.4M', label: 'ARR' }, { value: '$89', label: 'ACV' }, { value: '3.2%', label: 'churn' }] } },
  { name: 'statBig.time', family: 'statBig', blurb: 'stat, ms unit',
    props: { to: 1200, unit: 'ms', label: 'render time', size: 120 } },
  { name: 'card.stat.down', family: 'statCard', blurb: 'KPI card, negative delta',
    props: { w: 340, to: 320, label: 'active users', delta: '-8%', deltaUp: false } },
  { name: 'card.stat.plain', family: 'statCard', blurb: 'KPI card, no delta',
    props: { w: 340, to: 57, label: 'blocks', delta: '' } },
  { name: 'card.pricing.free', family: 'pricingCard', blurb: 'pricing, free tier',
    props: { w: 340, plan: 'Free', price: '$0', features: ['3 renders / day', 'Portrait + landscape', 'Watermarked'], cta: 'Get started', highlight: false } },
  { name: 'card.pricing.team', family: 'pricingCard', blurb: 'pricing, team tier',
    props: { w: 340, plan: 'Team', price: '$99', features: ['Everything in Pro', 'Shared brand kit', 'Priority render'], cta: 'Contact us', highlight: false } },
  { name: 'notification.error', family: 'notification', blurb: 'toast, error',
    props: { w: 440, title: 'Render failed', body: 'em-dash in on-screen copy', accent: 'var(--down)' } },
  { name: 'checklist.todo', family: 'checklist', blurb: 'checklist, all open',
    props: { w: 460, items: [{ text: 'Add captions' }, { text: 'Wire TTS' }, { text: 'Batch variants' }] } },
  { name: 'table.pricing', family: 'table', blurb: 'table, pricing rows',
    props: { w: 560, cols: ['Plan', 'Price', 'Renders'], rows: [['Free', '$0', '3/day'], ['Pro', '$29', '∞'], ['Team', '$99', '∞']] } },
  { name: 'timeline.release', family: 'timeline', blurb: 'release timeline',
    props: { w: 460, items: [{ title: 'v2.0 · registry', meta: 'today', done: true }, { title: 'v1.4 · lottie', meta: '1w', done: true }, { title: 'v2.1 · captions', meta: 'next', done: false }] } },
  { name: 'stepFlow.start', family: 'stepFlow', blurb: 'steps, at start',
    props: { w: 560, active: 0, steps: ['Capture', 'Encode', 'Mux', 'Upload'] } },
  { name: 'stepFlow.done', family: 'stepFlow', blurb: 'steps, all complete',
    props: { w: 560, active: 4, steps: ['Capture', 'Encode', 'Mux', 'Upload'] } },
  { name: 'kanban.two', family: 'kanban', blurb: 'two-column board',
    props: { w: 460, columns: [{ title: 'Backlog', cards: ['SFX', 'Music'] }, { title: 'Shipped', cards: ['Blocks', 'Lottie', '60fps'] }] } },
  { name: 'tabBar.four', family: 'tabBar', blurb: 'four-tab control',
    props: { w: 560, active: 0, tabs: ['Scene', 'Theme', 'Motion', 'Audio'] } },
  { name: 'toast.error', family: 'toast', blurb: 'snackbar, error + retry',
    props: { w: 420, message: 'Upload failed', action: 'Retry', icon: '!', accent: 'var(--down)' } },
  { name: 'toast.info', family: 'toast', blurb: 'snackbar, info',
    props: { w: 420, message: '3 blocks added to the scene', action: 'Undo', icon: 'i', accent: 'var(--accent)' } },
  { name: 'logLines.errors', family: 'logLines', blurb: 'log stream with errors',
    props: { w: 540, lines: [{ t: '12:04', level: 'ok', text: 'validate passed' }, { t: '12:05', level: 'error', text: 'em-dash at layer[7]' }, { t: '12:05', level: 'warn', text: 'retrying' }] } },
  { name: 'chatBubble.support', family: 'chatBubble', blurb: 'support thread',
    props: { w: 460, messages: [{ text: 'My render is grainy' }, { text: 'Grain is opt-in, remove "grain": true', me: true }, { text: 'Fixed, thanks!' }] } },
  { name: 'avatarStack.large', family: 'avatarStack', blurb: 'larger avatar stack',
    props: { size: 64, extra: 24, avatars: [{ initials: 'AL' }, { initials: 'GH' }, { initials: 'VS' }, { initials: 'KM' }, { initials: 'JR' }] } },
  { name: 'reactionBar.love', family: 'reactionBar', blurb: 'reactions (love set)',
    props: { reactions: [{ emoji: '❤️', count: 41, mine: true }, { emoji: '😂', count: 9 }, { emoji: '🙌', count: 6 }] } },
  { name: 'logoWall.four', family: 'logoWall', blurb: 'four logos, 2 cols',
    props: { w: 440, cols: 2, logos: [{ text: 'Stripe' }, { text: 'Linear' }, { text: 'Vercel' }, { text: 'Figma' }] } },
  { name: 'badge.warn', family: 'badge', blurb: 'badge, warning',
    props: { label: 'coverage', value: '62%', tone: 'warn' } },
  { name: 'badge.info', family: 'badge', blurb: 'badge, info',
    props: { label: 'docs', value: 'latest', tone: 'info' } },
  { name: 'banner.info', family: 'banner', blurb: 'banner, info (blurple)',
    props: { w: 560, text: 'Read the migration guide', cta: 'Open', accent: 'var(--accent)', icon: 'i' } },
  { name: 'banner.warn', family: 'banner', blurb: 'banner, warning (amber)',
    props: { w: 560, text: 'Söhne is licensed, do not commit', accent: '#F6A417', icon: '!' } },
  { name: 'spinner.small', family: 'spinner', blurb: 'small looping Lottie',
    props: { size: 56 } },
  { name: 'quote.customer', family: 'quote', blurb: 'customer quote',
    props: { w: 540, text: 'We shipped a launch film in an afternoon.', author: 'a happy user' } },
  { name: 'terminal.build', family: 'terminal', blurb: 'build output',
    props: { w: 560, command: 'make video D=launch.json', output: ['▶ scene : capturing across 8 workers...', '✓ done → out.mp4  (65s, 1950 frames)'] } },
  { name: 'checklist.done', family: 'checklist', blurb: 'checklist, all complete',
    props: { w: 460, items: [{ text: 'Blocks library', done: true }, { text: 'Registry + catalog', done: true }, { text: 'Docs auto-gen', done: true }] } },
  { name: 'kpiRow.time', family: 'kpiRow', blurb: 'latency percentiles',
    props: { items: [{ value: '42ms', label: 'p50' }, { value: '120ms', label: 'p95' }, { value: '380ms', label: 'p99' }] } },
  { name: 'badge.beta', family: 'badge', blurb: 'beta status badge',
    props: { label: 'status', value: 'beta', tone: 'warn' } },
];
