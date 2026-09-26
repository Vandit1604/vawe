// blocks/catalog.mjs: the REGISTRY MANIFEST. One data row per named block entry. This is the single
// source of truth for (a) what the registry contains, (b) how each renders in `make catalog`, and
// (c) the auto-generated engine-doctrine/BLOCKS.md table. Adding a block = adding a row here (+ a `variant` branch
// in its family factory if it's a family.variant). No hand-placement, no per-block catalog code.
//
// Entry shape:
//   { name, family, blurb, props, aka }
//   - name    : registry key. Bare ("card") → the raw factory. Namespaced ("card.pricing") → the family
//               called with props merged UNDER call-time opts (so a scene can still override anything).
//   - family  : which factory in blocks/index.mjs renders it.
//   - blurb   : one line for the catalog label + the docs table.
//   - props   : example/default content props (NO x/y/start/dur, the catalog + expander supply those).
//   - overlay : true → a full-frame overlay (captions); skipped in the grid catalog.
//   - aka     : optional synonyms `make arsenal` should find this row under, for a word the blurb has
//               no honest room for ("caret" for a block whose blurb already says "text cursor"). Never
//               printed, read only by harness/author/arsenal.mjs's block adapter.
//
// Hex literals (not TOKENS) on purpose: index.mjs imports THIS, so this must not import index.mjs.

export const CATALOG = [
  { name: 'codeBlock', family: 'codeBlock', blurb: "a code snippet card: lines of code write themselves in one by one, syntax-coloured, like a syntax-highlighted editor screenshot",
    props: { w: 540, dark: true, label: 'scene.json', size: 19, lines: [
      { text: '{', color: '#8898AA' }, { text: '  "module": "scene",', color: '#E8ECF1' },
      { text: '  "theme": "argus",', color: 'var(--up)' }, { text: '}', color: '#8898AA' }] } },
  { name: 'terminal', family: 'terminal', blurb: "a terminal window: a shell command types itself in character by character, then its output prints below",
    aka: ['caret', 'typing', 'typewriter', 'cursor'],
    props: { w: 540, command: 'make video', output: ['rendering 1950 frames...', 'done → out.mp4'] } },
  // The two halves of the layers-vs-html head-to-head (engine-doctrine/MISTAKES.md #429), kept as a matched pair
  // on purpose: same subject, one built from layer primitives and one as a hand-authored surface.
  { name: 'terminalPro', family: 'terminalPro', blurb: "a full deploy terminal built from real boxes: typed command, a live percent counter over its track, a file diff, a spinner turning into a checkmark",
    aka: ['caret', 'typing', 'typewriter', 'cursor'],
    props: { w: 820, command: 'npm run deploy' } },
  { name: 'terminalHtml', family: 'terminalHtml', blurb: "the same deploy terminal as one hand-drawn console surface: gradient glass, per-word command colouring, a blinking text cursor",
    aka: ['caret', 'typing', 'typewriter'],
    props: { w: 820 } },
  { name: 'loadingBar', family: 'loadingBar', blurb: "a progress bar: a track fills left to right to a set percent and finishes with a green done checkmark",
    props: { w: 340, fillDur: 1.6, label: 'rendering' } },
  { name: 'deploySuccess', family: 'deploySuccess', blurb: "a CI/CD pipeline status: build steps queue then run then check off, ending on a green deployed card with the live URL",
    props: { w: 520 } },
  { name: 'browserFrame', family: 'browserFrame', blurb: "a fake browser window: traffic-light dots and a URL bar framing a screenshot or any content drawn inside it.",
    props: { w: 540, h: 300, url: 'example.com' } },
  { name: 'pillRow', family: 'pillRow', blurb: "a horizontal row of rounded chip tags, for labels, filters, or categories side by side.",
    props: { items: ['deterministic', 'pure(n)', 'no timeline'] } },
  { name: 'statBig', family: 'statBig', blurb: "one huge number with a tiny label under it, for a single headline stat or KPI callout",
    props: { to: 1950, label: 'frames', size: 120 } },
  { name: 'colorCycle', family: 'colorCycle', blurb: "one word that changes colour again and again, repainted through a rainbow of hues in a fixed order",
    props: { word: 'colour', size: 64, each: 0.4 } },
  { name: 'splitFlapBoard', family: 'splitFlapBoard', blurb: "an airport or train station split-flap departure board where each letter flips through the alphabet to land on a word",
    props: { word: 'SHIPPED', label: 'status', size: 88 } },
  { name: 'splitFlapBoard.small', family: 'splitFlapBoard', blurb: 'the board at caption size, no header rail',
    props: { word: 'LIVE', size: 52, steps: 10 } },
  { name: 'barChart', family: 'barChart', blurb: "a bar chart: labeled vertical bars scaled to the tallest one, for comparing values side by side",
    props: { w: 520, h: 240, data: [
      { label: 'Mon', value: 38 }, { label: 'Tue', value: 66 }, { label: 'Wed', value: 52 },
      { label: 'Thu', value: 80 }, { label: 'Fri', value: 72 }] } },
  { name: 'notification', family: 'notification', blurb: "a light system alert card that slides in from the edge, a status dot, a heading and a message, arrives and leaves like a phone banner.",
    props: { w: 440, title: 'Render complete', body: 'out.mp4 is ready', accent: 'var(--up)' } },
  { name: 'kpiRow', family: 'kpiRow', blurb: "a row of numbers side by side, each with a small label under it, and the numbers count up",
    props: { items: [{ value: '30fps', label: 'frame rate' }, { value: '2×', label: 'supersample' }, { value: '0', label: 'timelines' }] } },
  { name: 'callout', family: 'callout', blurb: "a coloured info, success, or warning strip with a solid left bar and one line of text, for a note inline in a page.",
    props: { w: 540, text: 'Same input, byte-identical output.', tone: 'success' } },
  { name: 'comparison', family: 'comparison', blurb: "before and after, or us versus them, shown as two columns of bullet points side by side",
    props: { w: 560, leftTitle: 'Templates', rightTitle: 'Vawe', left: ['Fixed slots', 'Same look'], right: ['Open canvas', 'Per-brand'] } },
  { name: 'captions', family: 'captions', overlay: true, blurb: "subtitles at the bottom of the screen, timed to appear line by line like closed captions",
    props: { lines: [{ t: 0.2, text: 'every frame fights for its value' }] } },

  // ── namespaced variants: distinct registry entries built PURELY from preset props (no factory code).
  //    This is the cheapest way to grow the arsenal, a data row is a new named block.
  { name: 'codeBlock.light', family: 'codeBlock', blurb: 'code card, light surface',
    props: { w: 540, dark: false, label: 'terminal', size: 19, lines: ['./bin/vawe video.json', '✓ out/video.mp4'] } },
  { name: 'callout.info', family: 'callout', blurb: 'info strip (blurple)',
    props: { w: 540, text: 'Layers compose from a single canvas.', tone: 'info' } },
  { name: 'callout.warn', family: 'callout', blurb: 'warning strip (terracotta)',
    props: { w: 540, text: 'No em-dashes in on-screen copy.', tone: 'warn' } },
  { name: 'comparison.beforeAfter', family: 'comparison', blurb: 'Before / After columns',
    props: { w: 560, leftTitle: 'Before', rightTitle: 'After', left: ['Hand-timed', 'Drifts per run'], right: ['Pure in n', 'Byte-identical'] } },
  { name: 'notification.warn', family: 'notification', blurb: 'toast, amber accent',
    props: { w: 440, title: 'Grain crawls on text', body: 'opt in only for filmic brands', accent: 'var(--warn)' } },
  { name: 'statBig.currency', family: 'statBig', blurb: 'stat with a $ unit',
    props: { to: 880, unit: '$B', label: 'market', size: 120 } },

  // ── wave 1: charts + card variants (new factories) ──
  { name: 'lineChart', family: 'lineChart', blurb: "a line graph over time: a trend line in a hairline card, optionally filled to an area chart",
    props: { w: 540, h: 240, label: 'requests / day', data: [
      { label: 'M', value: 32 }, { label: 'T', value: 48 }, { label: 'W', value: 41 },
      { label: 'T', value: 63 }, { label: 'F', value: 58 }, { label: 'S', value: 79 }] } },
  { name: 'lineChart.area', family: 'lineChart', blurb: 'trend line with area fill',
    props: { w: 540, h: 240, area: true, label: 'growth', data: [
      { label: 'Q1', value: 12 }, { label: 'Q2', value: 22 }, { label: 'Q3', value: 30 }, { label: 'Q4', value: 55 }] } },
  { name: 'donutChart', family: 'donutChart', blurb: "a pie chart drawn as a ring: coloured segments of a whole plus a legend of labels",
    props: { w: 320, label: 'traffic', segments: [
      // NO per-segment colours. They used to be [accent, --up, #F6A417], the SEMANTIC green plus a
      // literal amber that no theme can reskin, so the catalog demo overrode SERIES and rendered the
      // stoplight the ramp exists to remove. Omitted, the block uses seriesAt() and follows the brand.
      { value: 52, label: 'Direct' }, { value: 30, label: 'Search' }, { value: 18, label: 'Social' }] } },
  { name: 'stackedBar', family: 'stackedBar', blurb: "a stacked bar chart: multiple series piled in one bar per category to show a total and its parts",
    props: { w: 520, h: 260, series: [{}, {}], data: [
      { label: 'Mon', values: [24, 18] }, { label: 'Tue', values: [30, 22] }, { label: 'Wed', values: [20, 28] }, { label: 'Thu', values: [36, 24] }] } },
  // THESE THREE FAMILIES ARE UNSEARCHABLE AND A BLURB CANNOT FIX IT. `pricingCard`, `statCard` and
  // `profileCard` have only `family.variant` rows, and harness/author/arsenal.mjs indexes BARE rows
  // only, on purpose: a variant's blurb describes the same subject in fewer words, and the two then
  // split the words they share (the retrieval floor fell 97% → 95% the day all 185 rows went in). So
  // the family is in NO search corpus, and `make arsenal Q="a pricing plan card"` answers ABSENT about
  // something the engine has. The blurbs below are rewritten because they are also the catalog label
  // and the engine-doctrine/BLOCKS.md line, but the retrieval hole is upstream of them. Same for `lowerThird` and
  // `searchEngine`. Closing it is a change to arsenal.mjs (index a family with no bare row), not five
  // more rows here: a bare row also needs a poster, a scene and a frame rect, and moves the block
  // count three doc surfaces state by hand.
  { name: 'card.stat', family: 'statCard', blurb: 'a boxed metric: a label, a number counting up, a chip saying how much it went up',
    props: { w: 340, to: 1950, label: 'frames rendered', delta: '+12%', deltaUp: true } },

  // ── wave 2: dev blocks + device/UI chrome ──
  { name: 'fileTree', family: 'fileTree', blurb: "a project file explorer: an indented list of folders and files, rows expanding in top to bottom like a sidebar",
    props: { w: 360, items: [
      { name: 'core', type: 'dir', depth: 0 }, { name: 'layers', type: 'dir', depth: 1 },
      { name: 'lottie.js', type: 'file', depth: 2, active: true }, { name: 'motion.js', type: 'file', depth: 1 },
      { name: 'blocks', type: 'dir', depth: 0 }, { name: 'index.mjs', type: 'file', depth: 1 }] } },
  { name: 'logLines', family: 'logLines', blurb: "a console log feed: timestamped lines stream in fast, colour-coded by info, warning and error level",
    props: { w: 540, lines: [
      { t: '12:04', level: 'info', text: 'capturing 1950 frames' }, { t: '12:04', level: 'ok', text: 'encode done' },
      { t: '12:05', level: 'warn', text: 'grain skipped (opt-in)' }, { t: '12:05', level: 'ok', text: 'out.mp4 written' }] } },
  { name: 'logLines.light', family: 'logLines', blurb: 'log stream on a light surface',
    props: { w: 540, dark: false, lines: [
      { level: 'ok', text: 'validate: 1 ok, 0 failed' }, { level: 'ok', text: 'purity OK · order-independent' }] } },
  { name: 'commitRow', family: 'commitRow', blurb: "a git commit history list: hash, message, author and time per row, like a GitHub commits page",
    props: { w: 540, commits: [
      { hash: 'd417051', msg: 'taste system + block registry', author: 'vandit', time: '2m' },
      { hash: '94b73bd', msg: 'migrate animation to interpolate()', author: 'vandit', time: '1d' }] } },
  { name: 'phoneFrame', family: 'phoneFrame', blurb: "a phone shaped shell: dark bezel, notch, status clock, screen area to draw your app content into for a mobile mockup.",
    props: { w: 230, h: 440 } },
  { name: 'tabBar', family: 'tabBar', blurb: "a row of tabs or a segmented control whose selected pill actually slides from one tab to another.",
    props: { w: 500, active: 1, tabs: ['Design', 'Motion', 'Export'] } },

  // ── wave 3: lists & structure ──
  { name: 'checklist', family: 'checklist', blurb: "a checklist of items with checkboxes ticking off one by one, done rows dim to read as completed.",
    props: { w: 460, items: [
      { text: 'Write scene JSON', done: true }, { text: 'make critique', done: true },
      { text: 'make catalog', done: true }, { text: 'Render', done: false }] } },
  { name: 'table', family: 'table', blurb: "a table of rows and columns: a header plus data rows divided by hairlines, rows fill in one after another.",
    props: { w: 560, cols: ['Format', 'FPS', 'Status'], rows: [
      ['portrait', '30', 'ready'], ['landscape', '60', 'ready'], ['alpha', '30', 'beta']] } },
  { name: 'timeline', family: 'timeline', blurb: "a vertical rail of dated events with dots and a connecting line, each entry lands beside its dot in sequence.",
    props: { w: 460, items: [
      { title: 'Captured frames', meta: '12:04', done: true }, { title: 'Encoded mp4', meta: '12:05', done: true },
      { title: 'Uploaded', meta: 'pending', done: false }] } },
  { name: 'stepFlow', family: 'stepFlow', blurb: "a horizontal row of numbered steps with connectors that fill in as progress moves from one step to the next.",
    props: { w: 560, active: 2, steps: ['Capture', 'Encode', 'Mux', 'Upload'] } },
  { name: 'kanban', family: 'kanban', blurb: "a kanban board: columns of small cards dealt in reading order, for a task board or pipeline view.",
    props: { w: 560, columns: [
      { title: 'Todo', cards: ['captions', 'TTS'] }, { title: 'Doing', cards: ['blocks'] }, { title: 'Done', cards: ['60fps', 'lottie'] }] } },

  // ── wave 4: social & messaging ──
  { name: 'chatBubble', family: 'chatBubble', blurb: "a text message thread, chat bubbles left and right like iMessage or WhatsApp",
    props: { w: 460, messages: [
      { text: 'One JSON becomes one video?' }, { text: 'Yep. Pure in n.', me: true },
      { text: 'No timeline?' }, { text: 'None. Just renderFrame.', me: true }] } },
  { name: 'avatarStack', family: 'avatarStack', blurb: "overlapping circular profile pictures in a row with a +N overflow count",
    props: { extra: 8, avatars: [{ initials: 'AL' }, { initials: 'GH' }, { initials: 'VS' }, { initials: 'KM' }] } },
  { name: 'toast', family: 'toast', blurb: "a dark snackbar with a status dot, a message, and an optional action link, the popup that says something just happened.",
    props: { w: 420, message: 'Video rendered to out.mp4', action: 'Open' } },
  { name: 'reactionBar', family: 'reactionBar', blurb: "emoji reaction pills with counts, like the reactions under a Slack or Discord message",
    props: { reactions: [{ emoji: '🔥', count: 24, mine: true }, { emoji: '👍', count: 12 }, { emoji: '🎉', count: 5 }] } },

  // ── wave 5: brand & motion ──
  { name: 'gauge', family: 'gauge', blurb: "a speedometer-style dial: a semicircular meter needle showing one value against a max",
    props: { w: 300, value: 72, label: 'coverage' } },
  { name: 'progressRing', family: 'progressRing', blurb: "a circular progress ring with the percent complete written in its centre",
    props: { size: 150, value: 68, label: 'render' } },
  { name: 'spinner', family: 'spinner', blurb: "a small looping loading spinner animation for a busy or working state",
    props: { size: 90, label: 'rendering' } },

  // ══ variant-fill pass: distinct presets/states, pure manifest rows (factories already exist) ══
  { name: 'codeBlock.py', family: 'codeBlock', blurb: 'code card, python',
    props: { w: 540, dark: true, label: 'render.py', size: 19, lines: [
      { text: 'from vawe import render', color: '#8898AA' }, { text: 'render("video.json")', color: '#E8ECF1' }] } },
  { name: 'terminal.git', family: 'terminal', blurb: 'git command',
    props: { w: 540, command: 'git push origin main', output: ['Enumerating objects: 12, done.', 'main -> main'] } },
  { name: 'terminal.install', family: 'terminal', blurb: 'install command',
    props: { w: 540, command: 'npm i vawe', output: ['added 1 package', 'added 1 package'] } },
  { name: 'barChart.green', family: 'barChart', blurb: 'bars in success green',
    props: { w: 520, h: 240, color: 'var(--up)', data: [{ label: 'Q1', value: 40 }, { label: 'Q2', value: 55 }, { label: 'Q3', value: 68 }, { label: 'Q4', value: 90 }] } },
  { name: 'lineChart.down', family: 'lineChart', blurb: 'declining trend (red)',
    props: { w: 540, h: 240, color: 'var(--down)', label: 'churn', data: [{ label: 'M', value: 62 }, { label: 'T', value: 55 }, { label: 'W', value: 48 }, { label: 'T', value: 30 }] } },
  { name: 'donutChart.two', family: 'donutChart', blurb: 'two-segment ring',
    props: { w: 320, label: 'pass / fail', segments: [{ value: 88, color: 'var(--up)', label: 'Pass' }, { value: 12, color: 'var(--down)', label: 'Fail' }] } },
  { name: 'stackedBar.three', family: 'stackedBar', blurb: 'three-series stack',
    props: { w: 520, h: 260, series: [{}, {}, {}], data: [
      { label: 'Mon', values: [18, 14, 8] }, { label: 'Tue', values: [22, 16, 10] }, { label: 'Wed', values: [16, 20, 12] }] } },
  { name: 'gauge.warn', family: 'gauge', blurb: 'gauge, low (amber)',
    props: { w: 300, value: 34, color: 'var(--warn)', label: 'health' } },
  { name: 'gauge.full', family: 'gauge', blurb: 'gauge, complete (green)',
    props: { w: 300, value: 100, color: 'var(--up)', label: 'passing' } },
  { name: 'progressRing.done', family: 'progressRing', blurb: 'ring, 100% (green)',
    props: { size: 150, value: 100, color: 'var(--up)', label: 'complete' } },
  { name: 'progressRing.low', family: 'progressRing', blurb: 'ring, low (amber)',
    props: { size: 150, value: 22, color: 'var(--warn)', label: 'battery' } },
  { name: 'kpiRow.money', family: 'kpiRow', blurb: 'KPI row, currency',
    props: { items: [{ value: '$2.4M', label: 'ARR' }, { value: '$89', label: 'ACV' }, { value: '3.2%', label: 'churn' }] } },
  { name: 'statBig.time', family: 'statBig', blurb: 'stat, ms unit',
    props: { to: 1200, unit: 'ms', label: 'render time', size: 120 } },
  { name: 'card.stat.down', family: 'statCard', blurb: 'KPI card, negative delta',
    props: { w: 340, to: 320, label: 'active users', delta: '-8%', deltaUp: false } },
  { name: 'card.stat.plain', family: 'statCard', blurb: 'KPI card, no delta',
    props: { w: 340, to: 57, label: 'blocks', delta: '' } },
  { name: 'notification.error', family: 'notification', blurb: 'toast, error',
    props: { w: 440, title: 'Render failed', body: 'em-dash in on-screen copy', accent: 'var(--down)' } },
  { name: 'checklist.todo', family: 'checklist', blurb: 'checklist, all open',
    props: { w: 460, items: [{ text: 'Add captions' }, { text: 'Wire TTS' }, { text: 'Batch variants' }] } },
  { name: 'table.pricing', family: 'table', blurb: 'table, pricing rows',
    props: { w: 560, cols: ['Plan', 'Price', 'Renders'], rows: [['Free', '$0', '3/day'], ['Pro', '$29', '∞'], ['Team', '$99', '∞']] } },
  { name: 'timeline.release', family: 'timeline', blurb: "dated shipping milestones down a rail, for a changelog or a roadmap",
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
  { name: 'avatarStack.large', family: 'avatarStack', blurb: "the same overlapping profile pictures at a bigger size, for a hero or a title card",
    props: { size: 64, extra: 24, avatars: [{ initials: 'AL' }, { initials: 'GH' }, { initials: 'VS' }, { initials: 'KM' }, { initials: 'JR' }] } },
  { name: 'reactionBar.love', family: 'reactionBar', blurb: 'reactions (love set)',
    props: { reactions: [{ emoji: '❤️', count: 41, mine: true }, { emoji: '😂', count: 9 }, { emoji: '🙌', count: 6 }] } },
  { name: 'spinner.small', family: 'spinner', blurb: 'small looping Lottie',
    props: { size: 56 } },
  { name: 'terminal.build', family: 'terminal', blurb: 'build output',
    props: { w: 560, command: 'make video D=launch.json', output: ['▶ scene : capturing across 8 workers...', '✓ done → out.mp4'] } },
  { name: 'checklist.done', family: 'checklist', blurb: 'checklist, all complete',
    props: { w: 460, items: [{ text: 'Blocks library', done: true }, { text: 'Registry + catalog', done: true }, { text: 'Docs auto-gen', done: true }] } },
  { name: 'kpiRow.time', family: 'kpiRow', blurb: 'latency percentiles',
    props: { items: [{ value: '42ms', label: 'p50' }, { value: '120ms', label: 'p95' }, { value: '380ms', label: 'p99' }] } },
  // ── lower thirds ─────────────────────────────────────────────────────────────
  // Twelve entries, one factory: the layout (name over role) is fixed, the material around it is the
  // variant. Each row's copy suits its chrome, because a BILD block and a soft pill are not the same
  // register, and demoing both with "Jane Doe / Designer" would hide the only thing that differs.
  // Unsearchable for the reason given beside `card.pricing` above: twelve namespaced rows, no bare
  // one, so the whole family is outside `make arsenal`'s corpus whatever these lines say.
  { name: 'lowerThird.cleanBar', family: 'lowerThird', blurb: "a name plate low in the frame: the speaker's name over their job title, on a hairline plate",
    props: { variant: 'cleanBar', name: 'Ana Roth', role: 'Principal engineer, Platform' } },
  { name: 'lowerThird.boldBlock', family: 'lowerThird', blurb: 'name reversed out of a solid accent block',
    props: { variant: 'boldBlock', name: 'Ana Roth', role: 'Principal engineer' } },
  { name: 'lowerThird.bild', family: 'lowerThird', blurb: 'tabloid front page · caps, reversed, loud',
    props: { variant: 'bild', name: 'Sold out', role: 'in four minutes' } },
  { name: 'lowerThird.darkCard', family: 'lowerThird', blurb: 'dark card · the one that survives bright photography',
    props: { variant: 'darkCard', name: 'Kite Studio', role: 'Lisbon, Portugal' } },
  { name: 'lowerThird.sideRule', family: 'lowerThird', blurb: 'thick accent rule, no plate · needs a calm backdrop',
    props: { variant: 'sideRule', name: 'Ana Roth', role: 'Principal engineer' } },
  { name: 'lowerThird.kickerName', family: 'lowerThird', blurb: 'mono kicker above, big name below',
    props: { variant: 'kickerName', name: 'Northwind', role: 'Now in beta' } },
  { name: 'lowerThird.accentUnderline', family: 'lowerThird', blurb: 'underline draws under the name (kinetic)',
    props: { variant: 'accentUnderline', name: 'Ana Roth', role: 'Principal engineer' } },
  { name: 'lowerThird.maskReveal', family: 'lowerThird', blurb: 'name rises out of a clipped baseline, word by word',
    props: { variant: 'maskReveal', name: 'One source', role: 'every ratio' } },
  { name: 'lowerThird.softPill', family: 'lowerThird', blurb: 'soft accent pill · product tours, not news',
    props: { variant: 'softPill', name: 'Northwind', role: 'v2.1' } },
  { name: 'lowerThird.colourBlock', family: 'lowerThird', blurb: 'two offset blocks, ink then accent',
    props: { variant: 'colourBlock', name: 'Ana Roth', role: 'Principal engineer' } },
  { name: 'lowerThird.stackBars', family: 'lowerThird', blurb: 'plate over a short accent bar · reads as a mark',
    props: { variant: 'stackBars', name: 'Ana Roth', role: 'Principal engineer' } },
  { name: 'lowerThird.newsTicker', family: 'lowerThird', blurb: 'accent chip + line · role IS the chip (LIVE/BREAKING)',
    props: { variant: 'newsTicker', name: 'Renders every frame in parallel', role: 'live' } },

  // ── wave 1: code themes + social shapes (see .claude/plans/effects-waves.plan.md) ──
  { name: 'codeBlock.midnight', family: 'codeBlock', blurb: 'code theme · cool dark, blue-first cycling',
    props: {"w": 540, "theme": "midnight", "label": "app.ts", "size": 19, "lines": ["const scene = load('video.json')", "const frames = render(scene)", "encode(frames, 'out.mp4')"]} },
  { name: 'codeBlock.ember', family: 'codeBlock', blurb: 'code theme · warm dark, amber and rose',
    props: {"w": 540, "theme": "ember", "label": "render.py", "size": 19, "lines": ["from vawe import render", "clip = render('launch.json')", "clip.save('out.mp4')"]} },
  { name: 'codeBlock.forest', family: 'codeBlock', blurb: 'code theme · deep green, mossy accents',
    props: {"w": 540, "theme": "forest", "label": "deploy.sh", "size": 19, "lines": ["make video D=launch.json", "make audit", "git push origin main"]} },
  { name: 'codeBlock.ocean', family: 'codeBlock', blurb: 'code theme · deep blue, cyan-led',
    props: {"w": 540, "theme": "ocean", "label": "scene.json", "size": 19, "lines": ["{ \"module\": \"scene\",", "  \"theme\": \"argus\",", "  \"fps\": 30 }"]} },
  { name: 'codeBlock.neon', family: 'codeBlock', blurb: 'code theme · near-black, vivid signage hues',
    props: {"w": 540, "theme": "neon", "label": "worker.js", "size": 19, "lines": ["onmessage = async (e) => {", "  const f = await renderFrame(e.data.n)", "  postMessage(f) }"]} },
  { name: 'codeBlock.paper', family: 'codeBlock', blurb: 'code theme · warm light, print-ink syntax',
    props: {"w": 540, "theme": "paper", "label": "notes.md", "size": 19, "lines": ["## release checklist", "- [x] blocks registry", "- [ ] captions pass"]} },
  { name: 'nowPlaying', family: 'nowPlaying', blurb: "a music player card: album artwork, a scrubbing progress bar, and play/skip transport controls",
    props: {"w": 380, "track": "Golden Hour", "artist": "Field Notes", "progress": 0.62} },
  { name: 'videoLowerThird', family: 'videoLowerThird', blurb: "a YouTube-style creator lower third: avatar, subscriber count, and a red subscribe CTA",
    props: {"w": 520, "channel": "Studio Vawe", "subscribers": "128K subscribers", "cta": "Subscribe"} },
  { name: 'followCard', family: 'followCard', blurb: "a social profile follow card: name over @handle next to a follow button pill",
    props: {"w": 360, "name": "Ana Roth", "handle": "anaroth", "cta": "Follow"} },
  // Unsearchable for the reason given beside `card.pricing` above: no bare row, so no corpus entry.
  { name: 'searchEngine.home', family: 'searchEngine', blurb: 'a search engine home page: a wordmark over a rounded search box, the query typing itself in',
    props: { variant: 'home', w: 540, cps: 11, query: 'deterministic video from json',
      // THE LETTERS WERE GOOGLE'S. The word read "Search", but the six colours were Google's exact
      // brand hexes in Google's exact order (blue, red, yellow, blue, green, red) which is the
      // wordmark's colour signature with the letters swapped. The FACTORY was always clean
      // (`word = null`); only this demo row carried them, and the catalog is the most-copied code in
      // the repo. Same class as the brand recreations already removed from films/scene.
      // The ramp also makes the demo honest: this is a search-engine block, not one company's.
      word: [{ c: 'S' }, { c: 'e' }, { c: 'a' }, { c: 'r' }, { c: 'c' }, { c: 'h' }] } },
  { name: 'searchEngine.results', family: 'searchEngine', blurb: 'the search results page: a ranked list of links, with a cursor clicking one',
    props: { variant: 'results', w: 540, query: 'video from json', clickIndex: 0, results: [
      { url: 'vawe.dev › docs', title: 'One JSON. Any brand.', snippet: 'Same input, same frames, every time.' },
      { url: 'vawe.dev › blocks', title: 'The block registry', snippet: 'Vetted blocks you compose, not author.' }] } },
  // The other six CODE_THEMES. All twelve palettes were authored and WCAG-checked together (the set's
  // minimum is 4.68:1); six of them had no catalog row, so nothing could render them and they were
  // invisible on the site, authored work sitting one manifest line away from being usable.
  { name: 'codeBlock.ink', family: 'codeBlock', blurb: 'code theme · indigo dark, violet-blue syntax',
    props: {"w": 540, "theme": "ink", "label": "scene.ts", "size": 19, "lines": ["export const scene = {", "  module: 'scene',", "  layers: [text, image],", "}"]} },
  { name: 'codeBlock.dusk', family: 'codeBlock', blurb: 'code theme · plum dark, orchid and rose',
    props: {"w": 540, "theme": "dusk", "label": "compose.rb", "size": 19, "lines": ["scene = Scene.load('in.json')", "scene.cuts.each { |c| c.snap! }", "scene.render 'out.mp4'"]} },
  { name: 'codeBlock.slate', family: 'codeBlock', blurb: 'code theme · neutral dark, muted steel syntax',
    props: {"w": 540, "theme": "slate", "label": "main.go", "size": 19, "lines": ["frames := render.All(scene)", "enc := encode.H264(frames)", "enc.WriteTo(\"out.mp4\")"]} },
  { name: 'codeBlock.aurora', family: 'codeBlock', blurb: 'code theme · teal dark, mint and violet',
    props: {"w": 540, "theme": "aurora", "label": "spectrum.js", "size": 19, "lines": ["const spec = bandEnergies(pcm)", "const v = sampleAt(spec, n, 'low')", "return 1 + v * 0.18"]} },
  { name: 'codeBlock.linen', family: 'codeBlock', blurb: 'code theme · warm light, earthen syntax',
    props: {"w": 540, "theme": "linen", "label": "README.md", "size": 19, "lines": ["# vawe", "One JSON. One video.", "Deterministic to the frame."]} },
  { name: 'codeBlock.frost', family: 'codeBlock', blurb: 'code theme · cool light, ice-blue syntax',
    props: {"w": 540, "theme": "frost", "label": "safe.ts", "size": 19, "lines": ["const [w, h] = sceneDims(cfg)", "const box = safeArea(w, h, dest)", "return box.x1 - box.x0"]} },
  // APP SURFACES (blocks/app.mjs). Before these, `nowPlaying` was the only block that depicted the
  // inside of a product, so a product-demo film could only be about a music app. Appended at the END
  // on purpose: the site crops thumbnails by cell index, so inserting mid-list re-cuts every later still.
  { name: 'profileHeader', family: 'profileHeader', blurb: "the top of an account screen: avatar over a name and @handle, with a small row of stat counts below.",
    props: { w: 460, name: 'Wren Alcott', handle: 'wren', stats: [{ value: '0', label: 'posts' }, { value: '0', label: 'lists' }, { value: '0', label: 'saved' }] } },
  { name: 'onboardCard', family: 'onboardCard', blurb: "one pane of a first-run onboarding flow: progress dots, a title, body copy, and a CTA button.",
    props: { w: 460, step: 2, of: 3, title: 'Pick a workspace', body: 'Choose where new drafts are saved. You can change this later.', cta: 'Continue' } },
  { name: 'emptyState', family: 'emptyState', blurb: "a zero state panel with dashed border: an icon, a line saying what is missing, and a button that fills it.",
    props: { w: 460, icon: '☐', title: 'Nothing here yet', body: 'Anything you save shows up in this list.', cta: 'Add the first one' } },
  // INTERACTION (blocks/interact.mjs). The registry could depict interfaces but not USING them: the
  // `cursor` layer type was reachable from exactly one block (searchEngine.results) with its path
  // hardcoded, a touch tap had no shape, and nothing in the library could be pressed. Appended at the
  // END for the same reason as the app surfaces. The site crops thumbnails by cell index.
  { name: 'pointer', family: 'pointer', blurb: "a mouse cursor that travels across the screen to a target and clicks it, with a click ripple.",
    props: { to: { dx: 300, dy: 190 }, clickAt: 1.3, size: 44 } },
  // `at` is late on purpose: a tap is over in half a second, and the sheet samples a block's still at
  // the last moment it is on screen. An early ripple has already faded by then and the thumbnail is
  // a blank square. Tapping near the end of the window puts the ring mid-flight in the still.
  { name: 'tapRipple', family: 'tapRipple', blurb: "a finger tap on a touchscreen: a contact dot and an expanding ring at the point touched, for phone demos.",
    props: { at: 4.2, size: 150 } },
  { name: 'keyboard', family: 'keyboard', blurb: "an on-screen phone keyboard, qwerty keys or a numeric keypad, that slides up from the bottom edge.",
    props: { w: 420, layout: 'qwerty' } },
  { name: 'keyboard.numeric', family: 'keyboard', blurb: 'phone keypad · numeric grid, rises up into frame',
    props: { w: 300, layout: 'numeric' } },
  { name: 'pressButton', family: 'pressButton', blurb: "a CTA button that visibly depresses and springs back when clicked, the payoff for a pointer tap on a button.",
    props: { w: 280, label: 'Start a project', pressAt: 1 } },

  // COMPOSITION, STATE AND PROOF. The gaps an App Showcase storyboard found (engine-doctrine/ROADMAP.md): no
  // container owned a split, no block could move between two states, no screen became another screen,
  // and the proof surfaces proved nothing without a hand-placed caption beside them. Appended at the
  // END for the same reason as every wave before it. The site crops thumbnails by cell index.
  { name: 'splitScreen', family: 'splitScreen', blurb: "the screen divided into two side-by-side panes, or a small inset video in the corner like picture-in-picture",
    props: { w: 540, h: 96, split: 0.5, gap: 32, divider: true,
      left: { block: 'notification', props: { title: 'Weekly digest', body: 'Kite Studio · Today' } },
      right: { block: 'notification', props: { title: 'Drafts', body: 'Fieldwork · Fri' } } } },
  { name: 'splitScreen.pip', family: 'splitScreen', blurb: 'picture-in-picture · an aside inset over the subject',
    props: { w: 540, h: 300, pip: true, pipScale: 0.46, pipInset: 16,
      left: { block: 'onboardCard', props: { w: 540, step: 1, of: 2, title: 'Open canvas', body: 'Compose a beat from the vocabulary.' } },
      right: { block: 'profileHeader', props: { name: 'Ana Roth', handle: 'ana', stats: [{ value: '12', label: 'ships' }] } } } },
  { name: 'screenSwap', family: 'screenSwap', blurb: "one app screen replaces another in the same spot, either a wipe or a slide, like swiping between phone screens",
    props: { w: 460, hold: 2.4, transition: 'wipe', screens: [
      { block: 'emptyState', props: { w: 460, icon: '☐', title: 'Nothing here yet', body: 'Anything you save shows up in this list.', cta: 'Add the first one' } },
      { block: 'notification', props: { w: 460, title: 'Fieldwork draft', body: 'Saved to this list' } },
      { block: 'onboardCard', props: { w: 460, step: 2, of: 3, title: 'Pick a workspace', body: 'Choose where new drafts are saved.', cta: 'Continue' } }] } },
  { name: 'screenSwap.slide', family: 'screenSwap', blurb: 'screen change that reads as travel · enters right, leaves left',
    props: { w: 460, hold: 2.4, transition: 'slide', screens: [
      { block: 'notification', props: { w: 460, title: 'Sync across devices', body: 'Keep every draft current everywhere' } },
      { block: 'notification', props: { w: 460, title: 'Notifications', body: 'Only for shared workspaces' } },
      { block: 'notification', props: { w: 460, title: 'Appearance', body: 'Match the system theme' } }] } },
  { name: 'socialProof', family: 'socialProof', blurb: "an avatar stack next to a trust line, like Trusted by 8,000 teams, for social proof",
    props: { extra: 8, size: 48, caption: 'Trusted by working teams', sub: 'across every plan',
      avatars: [{ initials: 'AL' }, { initials: 'GH' }, { initials: 'VS' }, { initials: 'KM' }] } },
  { name: 'installCard', family: 'installCard', blurb: "an app store listing row: icon, star rating that sweeps in, and an Install button",
    props: { w: 420, icon: '◆', name: 'Fieldwork', sub: 'Productivity', rating: 4.6, ratings: 1204, cta: 'Install' } },
  { name: 'tabBar.switch', family: 'tabBar', blurb: 'the selection SLIDES from one tab to another',
    props: { w: 500, activeFrom: 0, activeTo: 2, switchAt: 1.4, tabs: ['Design', 'Motion', 'Export'] } },
  { name: 'tabBar.icons', family: 'tabBar', blurb: 'app tab bar · icon over label, selection slides',
    props: { w: 500, activeFrom: 0, activeTo: 3, switchAt: 1.4, switchDur: 0.8, tabs: [
      { icon: '⌂', label: 'Home' }, { icon: '⌕', label: 'Search' }, { icon: '✦', label: 'Saved' }, { icon: '◔', label: 'You' }] } },
  { name: 'stepFlow.build', family: 'stepFlow', blurb: 'the track TRAVELS · rings light and connectors fill in sequence',
    props: { w: 560, activeFrom: 0, activeTo: 4, buildAt: 0.5, buildDur: 3, steps: ['Capture', 'Encode', 'Mux', 'Upload'] } },
  { name: 'notification.stack', family: 'notification', blurb: 'alerts that stack and expire, not one that sits',
    props: { w: 420, life: 2.6, step: 1.1, items: [
      { title: 'Draft saved', body: 'Fieldwork · shared workspace', icon: '✓', accent: 'var(--up)' },
      { title: 'New comment', body: 'Wren replied on Motion', icon: '◆' },
      { title: 'Export ready', body: 'The file is in your downloads', icon: '↓', accent: 'var(--up)' }] } },
  { name: 'toast.stack', family: 'toast', blurb: 'snackbars that stack and expire',
    props: { w: 400, life: 2.4, step: 1, items: [
      { title: 'Block added to the scene', action: 'Undo' },
      { title: 'Theme switched', action: 'Undo', icon: '◆', accent: 'var(--accent)' },
      { title: 'Render queued', action: 'View' }] } },
  { name: 'comparison.screens', family: 'comparison', blurb: 'before / after as two SCREENS, not two lists',
    props: { w: 560, gap: 24, leftTitle: 'Before', rightTitle: 'After',
      leftScreen: { block: 'emptyState', props: { icon: '☐', title: 'No drafts', body: 'Nothing has been saved to this list.' } },
      rightScreen: { block: 'notification', props: { title: 'Draft saved', body: 'Fieldwork · now' } } } },

  // SLEEK SURFACES (blocks/sleek.mjs): the movement is a Phase-2 engine effect (a beam layer, an
  // aurora paint behind the glass). Put a living bg behind glass.
  { name: 'borderBeamCard', family: 'borderBeamCard', blurb: "a glass card with a bright line of light chasing around its border, like a loading ring on the edge",
    props: { w: 560, h: 260, title: 'Border beam', desc: 'A light travels the border.' } },
  { name: 'bento', family: 'bento', blurb: "an asymmetric grid of boxes in different sizes, one big hero box and smaller ones around it, like a bento box or an Apple feature grid",
    props: { w: 760, h: 420, cells: [
      { kind: 'mesh', title: 'Hero', desc: 'The big one.' }, { kind: 'glass', title: 'Cell', desc: 'Support.' },
      { kind: 'spotlight', title: 'Cell', desc: 'Support.' }] } },
  // CAMERA CHROME, frame FURNITURE, not camera motion: a viewfinder draws chrome, a camera move
  // returns keyframes. blocks/camera-chrome.mjs says why they are filed here.
  { name: 'camcorderHud', family: 'camcorderHud', blurb: "a camcorder or viewfinder overlay: corner brackets, a blinking REC dot, a running timecode, battery and zoom readout",
    props: { w: 1920, h: 1080, zoom: '2.4', battery: 68, label: 'SP' }, overlay: true },
  { name: 'scanGate', family: 'scanGate', blurb: "an autofocus targeting reticle: a scan line sweeps the frame and brackets snap shut and lock onto the subject",
    props: { w: 760, h: 460, label: 'LOCK · f/1.8' } },

  // DIAGRAM (blocks/diagram.mjs): nodes arrive, then connectors DRAW ON between them in order.
  { name: 'flowchart', family: 'flowchart', blurb: "a flowchart: boxes connected by lines that draw themselves on, with yes/no labels on the branches",
    props: { step: 0.16 } },
  { name: 'flowchart.vertical', family: 'flowchart', blurb: 'the same flow turned 90 degrees for a phone feed · cols run down, lanes across, type raised to the portrait floor',
    props: { variant: 'vertical', step: 0.16 } },
  { name: 'nodeGraph', family: 'nodeGraph', blurb: "a network diagram of nodes and connecting edges, not a top-down tree, with one node highlighted",
    props: { highlight: 'core', step: 0.14 } },

  // GLASS SURFACES (blocks/glass.mjs): frosted panels that BLUR WHAT MOVES BEHIND THEM. Generic frosted
  // vocabulary, no OS and no vendor marks. Every one needs a LIVING bg; over a flat fill they are grey boxes.
  { name: 'glassWidgets', family: 'glassWidgets', blurb: "a cluster of frosted iOS-style widgets: one big showcase panel plus small stat tiles and chips",
    props: { w: 1080, h: 520, title: 'Frosted surfaces', desc: 'The field behind the panel never stops moving.',
      stats: [{ label: 'FRAMES', value: '1.9', unit: 'k', delta: '+12%' }, { label: 'PASSES', value: '3' }],
      chips: ['deterministic', 'seeked', 'pure(n)'] } },
  { name: 'glassNotification', family: 'glassNotification', blurb: "frosted push notifications sliding in from the side and stacking up, like a phone lock screen",
    props: { w: 520, items: [
      { icon: 'bolt', title: 'Render finished', body: '1,920 frames, no dropped seams.', meta: 'now' },
      { icon: 'shield', title: 'Audit clean', body: 'No overlap, no clipped text.', meta: '2m' },
      { icon: 'check', title: 'Ledger updated', body: 'Design recorded.', meta: '5m' }] } },
  { name: 'glassMenu', family: 'glassMenu', blurb: "a frosted right-click or context menu: icon column, list of rows, one row highlighted",
    props: { w: 440, title: 'ACTIONS', highlight: 3, rows: [
      { icon: 'spark', label: 'New surface', hint: 'N' }, { icon: 'layers', label: 'Stack behind', hint: '[' },
      { sep: true }, { icon: 'bolt', label: 'Blur backdrop', hint: 'B' }, { icon: 'clock', label: 'Hold frame', hint: 'H' }] } },
  { name: 'glassControls', family: 'glassControls', blurb: "a frosted media player bar: scrubber, play and transport buttons, a volume or level meter",
    props: { w: 760, track: 'Deterministic render', elapsed: '01:12', total: '03:40', progress: 0.34, bars: 9 } },
  { name: 'glassHome', family: 'glassHome', blurb: "a frosted phone home screen: a grid of app icon tiles plus one wide widget",
    props: { cols: 4, size: 132, widget: { label: 'THIS RUN', value: '1,920', sub: 'frames, all pure in n' },
      tiles: [{ icon: 'cube', label: 'Blocks' }, { icon: 'layers', label: 'Stacks' }, { icon: 'globe', label: 'Fields' },
        { icon: 'braces', label: 'Scenes' }, { icon: 'clock', label: 'Timing' }, { icon: 'plug', label: 'Inputs' },
        { icon: 'file', label: 'Assets' }, { icon: 'link', label: 'Chains' }] } },
  { name: 'glassDock', family: 'glassDock', blurb: "a floating frosted taskbar or dock strip where the icon under the cursor grows bigger, like the macOS dock",
    props: { magnify: 2, items: [{ icon: 'file', label: 'Files' }, { icon: 'braces', label: 'Code' },
      { icon: 'spark', label: 'Compose' }, { icon: 'globe', label: 'Publish' }, { icon: 'clock', label: 'History' }] } },

  // CODE MOTION (blocks/codeanim.mjs): the chrome is dev.mjs's; what is new here is code that MOVES.
  { name: 'codeTyping', family: 'codeTyping', blurb: "code being typed live in an editor: a text cursor runs across the snippet revealing one character at a time",
    aka: ['caret', 'typing', 'typewriter'],
    props: { w: 620, label: 'server.ts', theme: 'midnight', cps: 26, lines: [
      'export function serve(req) {', '  const t = route(req.url);', '  return t.handle(req);', '}'] } },
  { name: 'codeHighlight', family: 'codeHighlight', blurb: "a code editor spotlight: the surrounding lines dim while a highlighted band sweeps down onto one target line",
    props: { w: 620, label: 'server.ts', theme: 'ink', line: 2, lines: [
      'export function serve(req) {', '  const t = route(req.url);', '  return t.handle(req);', '}'] } },
  { name: 'codeScroll', family: 'codeScroll', blurb: "an editor auto-scrolling through a long file until the target line reaches the middle and lights up",
    props: { w: 620, label: 'router.ts', theme: 'ocean', line: 8, rows: 7, lines: [
      'import { match } from "./match";', '', 'const table = new Map();', '',
      'export function add(p, h) {', '  table.set(p, h);', '}', '',
      'export function route(url) {', '  for (const [p, h] of table)', '    if (match(p, url))', '      return h;', '}'] } },
  { name: 'codeDiff', family: 'codeDiff', blurb: "a code edit replayed as it happened: the old line collapses away in red while the new line types in green",
    props: { w: 620, label: 'route.ts', theme: 'forest', lines: [
      '  const t = route(req.url);', { sign: '-', text: '  if (!t) return null;' },
      { sign: '+', text: '  if (!t) return notFound(req);' }, '  return t.handle(req);'] } },
  { name: 'codeMorph', family: 'codeMorph', blurb: "a code refactor shown as a shape-shift: shared words glide into their new position while the rest fades out and in",
    props: { w: 620, label: 'refactor', theme: 'dusk',
      from: ['const out = items.filter(fn);', 'return out;'], to: ['return items.filter(fn);'] } },
  { name: 'codeFlight', family: 'codeFlight', blurb: "separate code snippets fly in from opposite sides of the screen and snap together into one finished file",
    props: { w: 620, label: 'assemble', theme: 'neon', snippets: [
      { label: 'imports', lines: ['import { serve } from "./serve";'] },
      { label: 'state', lines: ['const table = new Map();'] },
      { label: 'entry', lines: ['serve(table);', 'export default table;'] }] } },

  // MAPS (blocks/geo.mjs): d3-geo projects at factory time; the page gets finished `d` strings.
  { name: 'usMapHex', family: 'usMapHex', blurb: "a hex map of the United States: every state drawn as one same-size hexagon so colour reads value, not land area",
    props: { w: 820, legend: 'M', data: [{ code: 'CA', value: 39 }, { code: 'TX', value: 30 }, { code: 'FL', value: 22 }, { code: 'NY', value: 20 }, { code: 'IL', value: 13 }, { code: 'PA', value: 13 }, { code: 'OH', value: 12 }, { code: 'GA', value: 11 }, { code: 'MI', value: 10 }, { code: 'WA', value: 8 }, { code: 'AZ', value: 7 }, { code: 'MA', value: 7 }, { code: 'CO', value: 6 }, { code: 'MN', value: 6 }, { code: 'WY', value: 1 }, { code: 'VT', value: 1 }, { code: 'AK', value: 1 }, { code: 'HI', value: 1 }] } },
  { name: 'usMap', family: 'usMap', blurb: "a map of the United States coloured state by state, a choropleth with a legend and value labels per state",
    props: { w: 820, h: 500, legend: 'M', data: [{ code: 'CA', value: 39 }, { code: 'TX', value: 30 }, { code: 'FL', value: 22 }, { code: 'NY', value: 20 }, { code: 'IL', value: 13 }, { code: 'PA', value: 13 }, { code: 'OH', value: 12 }, { code: 'GA', value: 11 }, { code: 'MI', value: 10 }, { code: 'WA', value: 8 }] } },
  { name: 'worldMap', family: 'worldMap', blurb: "a world map coloured country by country, a global choropleth with a legend for the data shown",
    props: { w: 900, h: 470, legend: 'M', data: [{ code: 'CHN', value: 1410 }, { code: 'IND', value: 1430 }, { code: 'USA', value: 340 }, { code: 'IDN', value: 278 }, { code: 'BRA', value: 216 }, { code: 'NGA', value: 224 }, { code: 'DEU', value: 84 }, { code: 'JPN', value: 124 }] } },
  { name: 'usMapBubble', family: 'usMapBubble', blurb: "a map of the United States with circles sized by value at each city, a proportional bubble map",
    props: { w: 820, h: 500, maxR: 34, points: [{ name: 'New York', value: 8.3 }, { name: 'Los Angeles', value: 3.9 }, { name: 'Chicago', value: 2.7 }, { name: 'Houston', value: 2.3 }] } },
  { name: 'usMapFlow', family: 'usMapFlow', blurb: "a map of the United States with arrows drawn between cities showing flow or movement from an origin to destinations",
    props: { w: 820, h: 500, hub: 'Denver', flows: [{ from: 'Denver', to: 'New York', value: 9 }, { from: 'Denver', to: 'Seattle', value: 6 }, { from: 'Denver', to: 'Miami', value: 5 }, { from: 'Denver', to: 'Dallas', value: 4 }] } },

  // VFX (blocks/vfx.mjs): treatments that are about the MOTION, not the data.
  { name: 'textCursor', family: 'textCursor', blurb: "a blinking text cursor typing a word, with a glowing red/cyan light-fringe on the letters as it lands",
    props: { w: 900, body: 'Ship it', size: 150, cursor: 'block', spread: 18 } },
  { name: 'textCursor.bar', family: 'textCursor', blurb: 'the same treatment with a thin vertical rule instead of a filled cell',
    props: { w: 900, body: 'deterministic', size: 120, cursor: 'bar', spread: 22 } },
  { name: 'parallaxZoom', family: 'parallaxZoom', blurb: "a grid of cards where the centre card zooms to fill the whole frame while the rest slide outward and fade",
    props: { w: 1200, h: 760, title: 'One card takes the frame', caption: 'the neighbours travel outward',
      tiles: [{ label: 'queue' }, { label: 'index' }, { label: 'cache' }, { label: 'edge' },
        { label: 'store' }, { label: 'logs' }, { label: 'auth' }, { label: 'jobs' }] } },
  { name: 'parallaxUnzoom', family: 'parallaxUnzoom', blurb: "the reverse of a zoom-in: one card fills the frame first, then shrinks back into a grid of cards around it",
    props: { w: 1200, h: 760, title: 'and hands it back', caption: 'the same board, run backwards',
      tiles: [{ label: 'queue' }, { label: 'index' }, { label: 'cache' }, { label: 'edge' },
        { label: 'store' }, { label: 'logs' }, { label: 'auth' }, { label: 'jobs' }] } },
  { name: 'morphText', family: 'morphText', blurb: "a gooey word swap: one word melting into the next through a metaball blur, letters with no correspondence",
    props: { w: 900, words: ['ideas', 'drafts', 'inbox', 'shipped'], size: 120, hold: 0.8 } },
  { name: 'uiReveal3d', family: 'uiReveal3d', blurb: "rows of a UI folding upright out of the floor in 3D perspective, one after another",
    props: { w: 680, items: [{ label: 'Frames rendered', value: '1,320' }, { label: 'Workers', value: '8' },
      { label: 'Draft render', value: '31s' }, { label: 'Blocks swept', value: '179' },
      { label: 'Identical', value: '106' }] } },
];
