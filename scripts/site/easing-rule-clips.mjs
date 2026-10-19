// Render the twelve clips of /blog/easing, one per rule: WRONG on the left, RIGHT on the right, the same move on the
// same frames, so the ease (or the choice the rule names) is the only variable. Drawn with the vawe renderer in the
// blog figure style (scripts/site/blog-style/remix/figure/vawe.css: black ground, hairlines, Geist, IBM Plex Mono, the
// one accent on the RIGHT value) and encoded to 640 px. One render at a time, so the laptop stays cool.
//
//   node scripts/site/easing-rule-clips.mjs [--pages-only] [slug ...]
//   needs ffmpeg; writes site/public/blog/easing/<slug>.{mp4,webp}; the pages live in films/blog-easing-<slug>/ while it runs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'site', 'public', 'blog', 'easing');
const SECONDS = 3;

const CSS = `
  @font-face { font-family: 'Geist'; src: url('/site/public/assets/fonts/Geist.woff2') format('woff2'); font-weight: 100 900; }
  @font-face { font-family: 'IBM Plex Mono'; src: url('/site/public/assets/fonts/IBMPlexMono-400.woff2') format('woff2'); font-weight: 400; }
  :root { --ink: #fff; --ink-2: #ededed; --muted: #a1a1a1; --line: #242424; --line-2: #3a3a3a; --box: #0a0a0a; --raised: #171717; --accent: #3291ff;
    --sans: 'Geist', system-ui, sans-serif; --mono: 'IBM Plex Mono', ui-monospace, monospace; }
  html, body { margin: 0; height: 100%; overflow: clip; background: #000; color: var(--ink); font-family: var(--sans); }
  .half { position: absolute; top: 0; bottom: 0; width: 50vw; overflow: hidden; }
  .half.l { left: 0; }
  .half.r { left: 50vw; }
  .rule { position: absolute; left: 50vw; top: 0; bottom: 0; width: 1px; background: var(--line); }
  .lab { position: absolute; left: 4vw; top: 6vh; display: flex; flex-direction: column; gap: 1.4vh; }
  .lab b { font: 400 3.4vh/1 var(--mono); letter-spacing: .08em; color: var(--muted); }
  .lab span { font: 400 4.6vh/1 var(--mono); color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .r .lab span { color: var(--accent); }
  .stage { position: absolute; inset: 0; }
  .card { position: absolute; width: 28vw; height: 22vh; box-sizing: border-box; padding: 2.2vh 1.6vw; background: var(--box); border: 1px solid var(--line-2); border-radius: 1.4vh; display: flex; flex-direction: column; justify-content: space-between; }
  .card .k { font: 400 3vh/1 var(--mono); letter-spacing: .08em; color: var(--muted); }
  .card b { font: 600 9vh/1 var(--sans); letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
  .chip { position: absolute; box-sizing: border-box; background: var(--box); border: 1px solid var(--line-2); border-radius: 1.2vh; font: 400 3.2vh/1 var(--mono); letter-spacing: .08em; color: var(--ink-2); display: flex; align-items: center; justify-content: center; }
  .hair { position: absolute; background: var(--line-2); }
`;

const card = (style = '', text = '1,822') => `<div class="card" style="${style}"><span class="k">REVENUE</span><b>${text}</b></div>`;
const MID = 'left: 11vw; top: 38vh;';

// Each spec: the stage markup (same on both sides), a play(stage, right) body, and the two labels.
const RULES = [
  {
    slug: 'land', wrong: 'ease-in-out 0.7 s', right: 'EASE.land 0.7 s',
    waive: { 'default-ease': 'world s1 at 0.25 s: the left side is the WRONG case, ease-in-out for 0.70 s' },
    body: card(MID),
    play: `const c = s.querySelector('.card');
      go(c, [{ translate: '0 5vh', scale: '.96' }, { translate: '0 0', scale: '1' }], 700, right ? EASE.land : 'ease-in-out', 250);
      go(c, [{ opacity: 0 }, { opacity: 1 }], 280, 'ease-out', 250);`,
  },
  {
    slug: 'launch', wrong: 'exit 0.5 s, same ease', right: 'EASE.launch 0.3 s',
    body: card(MID),
    play: `const c = s.querySelector('.card');
      go(c, [{ translate: '0 5vh', scale: '.96' }, { translate: '0 0', scale: '1' }], 500, EASE.land, 150);
      go(c, [{ opacity: 0 }, { opacity: 1 }], 200, 'ease-out', 150);
      go(c, [{ translate: '0 0', opacity: 1 }, { translate: '0 -3vh', opacity: 0 }], right ? 300 : 500, right ? EASE.launch : EASE.land, 1500, 'forwards');`,
  },
  {
    slug: 'overshoot', wrong: 'text bounces (pop)', right: 'card pop 15.3%, text land',
    body: card(MID),
    play: `const c = s.querySelector('.card'), n = c.querySelector('b');
      go(c, [{ translate: '0 14vh' }, { translate: '0 0' }], 800, right ? EASE.pop : EASE.land, 200);
      go(c, [{ opacity: 0 }, { opacity: 1 }], 250, 'ease-out', 200);
      if (!right) go(n, [{ translate: '0 4vh' }, { translate: '0 0' }], 800, EASE.pop, 500);
      const to = right ? easeOutExpo : easeFn('pop');
      seeks.push((t) => { n.textContent = Math.round(1822 * to(Math.min(1, Math.max(0, (t - 0.5) / 1.1)))).toLocaleString('en-US'); });`,
  },
  {
    slug: 'named', wrong: 'linear 0.6 s', right: 'EASE.land 0.6 s',
    waive: { 'linear-move': 'world s1 at 0.40 s: the left side is the WRONG case, linear for 0.60 s' },
    body: card('left: 4vw; top: 40vh; width: 9vw; height: 18vh; padding: 1.4vh .8vw;', '').replace('<b></b>', ''),
    play: `const c = s.querySelector('.card'), f = right ? easeFn('land') : (u) => u;
      c.querySelector('.k').textContent = 'TILE';
      go(c, [{ translate: '0 0' }, { translate: '32vw 0' }], 600, right ? EASE.land : 'linear', 400);
      for (let i = 1; i <= 7; i++) {
        const g = document.createElement('div');
        g.className = 'chip';
        g.style.cssText = 'left:' + (4 + 32 * f(i / 8)) + 'vw; top: 40vh; width: 9vw; height: 18vh; border-radius: 1.4vh; background: none;';
        s.insertBefore(g, c);
        go(g, [{ opacity: 0 }, { opacity: 1 }], 1, 'linear', 400 + i * 75);
      }`,
  },
  {
    slug: 'bands', wrong: 'every move 0.45 s', right: '0.25 / 0.8 / 0.25 s',
    body: ['HOOK', 'REVEAL', 'PAYOFF'].map((k, i) => `<div class="chip" style="left: ${3 + i * 15.5}vw; top: 40vh; width: 14vw; height: 18vh;">${k}</div>`).join(''),
    play: `const ms = right ? [250, 800, 250] : [450, 450, 450], at = [250, 800, 1800];
      s.querySelectorAll('.chip').forEach((c, i) => {
        go(c, [{ translate: '0 4vh', scale: '.96' }, { translate: '0 0', scale: '1' }], ms[i], EASE.land, at[i]);
        go(c, [{ opacity: 0 }, { opacity: 1 }], Math.round(ms[i] * 0.4), 'ease-out', at[i]);
      });`,
  },
  {
    slug: 'follow', wrong: 'all stop together', right: 'shadow ends 0.12 s later',
    body: '<div class="card plate" style="left: 12.6vw; top: 41vh; background: var(--raised); border-color: var(--line);"></div>' + card(MID),
    play: `const c = s.querySelector('.card:not(.plate)'), p = s.querySelector('.plate');
      const up = [{ translate: '0 10vh', scale: '.96' }, { translate: '0 0', scale: '1' }];
      go(c, up, 600, EASE.land, 250);
      go(p, up, right ? 720 : 600, EASE.land, 250);
      go(c, [{ opacity: 0 }, { opacity: 1 }], 240, 'ease-out', 250);
      go(p, [{ opacity: 0 }, { opacity: 1 }], 240, 'ease-out', 250);`,
  },
  {
    slug: 'anticipation', wrong: 'no wind-up', right: 'wind-up 20% of travel',
    body: card(MID),
    play: `enter(s.querySelector('.card'), right ? { at: 0.4, duration: 0.7, from: '-18vw 0', anticipate: 0.2 } : { at: 0.4, duration: 0.7, from: '-18vw 0' });`,
  },
  {
    slug: 'stagger', wrong: 'all at once, 0 ms', right: 'EASE.landSoft, 50 ms apart',
    body: [1, 2, 3, 4, 5, 6].map((n, i) => `<div class="chip" style="left: 11vw; top: ${28 + i * 10}vh; width: 28vw; height: 7vh;">ROW ${n}</div>`).join(''),
    play: `const rows = [...s.querySelectorAll('.chip')], o = { at: 0.4, duration: 0.3, from: '0 2vh', ease: 'landSoft' };
      if (right) stagger(rows, { ...o, gap: 0.05 }); else rows.forEach((r) => enter(r, o));`,
  },
  {
    slug: 'camera', wrong: 'every key eased', right: 'eased ends, linear middle',
    body: '<div class="track" style="position: absolute; inset: 0;">' + [0, 1, 2, 3].map((k) => `<div class="chip" style="left: ${18 + k * 18}vw; top: 38vh; width: 14vw; height: 22vh;">${'ABCD'[k]}</div>`).join('') + '</div><div class="hair" style="left: 25vw; top: 30vh; width: 1px; height: 6vh;"></div><div class="hair" style="left: 25vw; top: 62vh; width: 1px; height: 6vh;"></div>',
    play: `const E = 'easyEase';
      keys(s.querySelector('.track'), 'translate', [[0.3, '0 0', E], [1.0, '-18vw 0', right ? undefined : E], [1.7, '-36vw 0', right ? undefined : E], [2.4, '-54vw 0', E]]);`,
  },
  {
    slug: 'one-hero', wrong: 'everything moves', right: 'one mover leads',
    body: '<div class="chip" id="t" style="left: 4vw; top: 24vh; width: 17vw; height: 5vh; border: 0; background: none; justify-content: flex-start; font-size: 3.2vh;">Q3 RESULTS</div><div class="hair" id="h" style="left: 4vw; top: 31vh; width: 42vw; height: 1px;"></div>'
      + card(MID) + '<div class="chip c1" style="left: 5vw; top: 68vh; width: 17vw; height: 7vh;">NEW</div><div class="chip c2" style="left: 28vw; top: 68vh; width: 17vw; height: 7vh;">+12%</div>',
    play: `const q = (x) => s.querySelector(x), c = q('.card');
      if (!right) {
        go(q('#t'), [{ translate: '-6vw 0', opacity: 0 }, { translate: '0 0', opacity: 1 }], 700, EASE.land, 300);
        go(q('#h'), [{ scale: '0 1', transformOrigin: '0 0', opacity: 0 }, { scale: '1 1', opacity: 1 }], 700, EASE.land, 300);
        go(q('.c1'), [{ translate: '-8vw 0', rotate: '-12deg', opacity: 0 }, { translate: '0 0', rotate: '0deg', opacity: 1 }], 700, EASE.land, 300);
        go(q('.c2'), [{ translate: '8vw 0', rotate: '12deg', opacity: 0 }, { translate: '0 0', rotate: '0deg', opacity: 1 }], 700, EASE.land, 300);
      } else {
        go(q('.c2'), [{ opacity: 0 }, { opacity: 1 }], 400, 'ease-out', 1000);
      }
      go(c, [{ translate: '0 8vh', scale: '.96' }, { translate: '0 0', scale: '1' }], 700, EASE.land, 300);
      go(c, [{ opacity: 0 }, { opacity: 1 }], 280, 'ease-out', 300);`,
  },
  {
    slug: 'stops', wrong: 'ease-in 0.5 s', right: 'EASE.land 0.5 s',
    waive: { 'default-ease': 'world s1 at 0.40 s: the left side is the WRONG case, ease-in for 0.50 s' },
    body: '<div class="hair" style="left: 44vw; top: 32vh; width: 1px; height: 42vh;"></div>' + card('left: 4vw; top: 40vh; width: 16vw; height: 18vh; padding: 1.4vh 1vw;', '').replace('<b></b>', '').replace('REVENUE', 'TILE'),
    play: `go(s.querySelector('.card'), [{ translate: '0 0' }, { translate: '24vw 0' }], 500, right ? EASE.land : 'ease-in', 400);`,
  },
  {
    slug: 'surface', wrong: 'rows ease in', right: 'whole rows, no ease',
    body: '<div class="card" style="left: 4vw; top: 30vh; width: 42vw; height: 50vh; padding: 2.4vh 1.6vw; justify-content: flex-start; gap: 3.4vh;"><span class="k">ZSH</span><div class="ln" style="font: 400 4vh/1 var(--mono);"></div>'
      + [0, 1, 2, 3].map(() => '<div class="ln" style="font: 400 4vh/1 var(--mono); color: var(--muted);"></div>').join('') + '</div>',
    play: `const lines = [...s.querySelectorAll('.ln')], cmd = '$ vawe dev page', rows = ['render  3 s', 'checks  12 ok', 'draft   out/film.mp4', 'done    4.1 s'], ease = easeFn('land');
      seeks.push((t) => {
        const n = Math.max(0, Math.floor((t - 0.4) / 0.03));
        lines[0].textContent = cmd.slice(0, n);
        rows.forEach((text, i) => {
          const u = (t - (1.3 + i * 0.07)) / 0.3, el = lines[i + 1];
          const p = right ? (u >= 0 ? 1 : 0) : ease(Math.min(1, Math.max(0, u)));
          el.textContent = text;
          el.style.opacity = p;
          el.style.translate = right ? '0 0' : '0 ' + (1 - p) + 'vh';
        });
      });`,
  },
];

const authoring = (r) => JSON.stringify({ allow: Object.keys(r.waive || {}).concat("no-brief"), _why: { "no-brief": "world s1 is a 3 s figure clip for the easing post, not a film", ...r.waive } });

function page(r) {
  return `<!doctype html>
<html data-aspect="16:9">
<head>
<meta charset="utf-8">
<meta name="duration" content="${SECONDS}">
<meta name="message" content="${r.slug}: ${r.wrong} against ${r.right}">
<title>blog easing ${r.slug}</title>
<script type="application/json" id="authoring">${authoring(r)}</script>
<style>${CSS}</style>
</head>
<body>
<div data-world="s1">
<div class="half l"><div class="lab"><b>WRONG</b><span>${r.wrong}</span></div><div class="stage">${r.body}</div></div>
<div class="half r"><div class="lab"><b>RIGHT</b><span>${r.right}</span></div><div class="stage">${r.body}</div></div>
<div class="rule"></div>
</div>
<script type="module">
import '/core/engine/page-api.js';
import { EASE, easeFn, enter, stagger, keys } from '/core/motion/presets.js';
import { easeOutExpo } from '/core/motion/curves.js';

const seeks = [];
window.seek = (t) => seeks.forEach((f) => f(t));
const go = (el, frames, duration, easing, delay = 0, fill = 'both') => el.animate(frames, { duration, easing, delay, fill });
const play = (s, right) => {
  ${r.play}
};
document.querySelectorAll('.stage').forEach((s, i) => {
  play(s, i === 1);
  go(s, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.88 }, { opacity: 0, offset: 0.96 }, { opacity: 0 }], ${SECONDS * 1000}, 'linear');
});
</script>
</body>
</html>
`;
}

const args = process.argv.slice(2);
const pagesOnly = args.includes('--pages-only');
const wanted = args.filter((a) => !a.startsWith('--'));
const rules = RULES.filter((r) => !wanted.length || wanted.includes(r.slug));
const env = { ...process.env, VAWE_AGENT: 'easing-rule-clips', VAWE_MODEL: 'claude-opus-5-5' };
fs.mkdirSync(OUT, { recursive: true });

for (const r of rules) {
  const dir = path.join(root, 'films', `blog-easing-${r.slug}`);
  const draft = path.join(root, 'out', `blog-easing-${r.slug}-draft.mp4`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.html'), page(r));
  if (pagesOnly) continue;
  execFileSync(path.join(root, 'bin', 'vawe'), ['dev', `films/blog-easing-${r.slug}/page.html`, '--fast', '--no-judge', '--silent', '--out', draft], { cwd: root, env, stdio: 'inherit' });
  const base = path.join(OUT, r.slug);
  const scale = ['-vf', 'scale=640:-2'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', draft, ...scale, '-an', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.6', '-i', draft, '-frames:v', '1', ...scale, '-c:v', 'libwebp', '-quality', '75', `${base}.webp`]);
}
