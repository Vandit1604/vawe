// studio/ui/page-model.js: the timeline rows, read from the page itself. Animation rows come from the
// live document.getAnimations() (one per animated element) and are linked back to the source literal that
// made them when one matches; table, sound and spectacle rows come straight from the source model.
//
// A key is {t (seconds), label, move(t) -> edits|null, value?}. A row's `timing` holds duration, delay and
// easing, each {value, set(v) -> edits|null}. A null `move` or `set` means the page computes that number.
import { moveTableKey, moveCssStop, moveCue, moveSpectacle, setCssTiming, setAnimateOffset, setAnimateOption, setTableValue } from './page-edit.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function labelOf(el) {
  if (el.id) return `#${el.id}`;
  const cls = [...el.classList][0];
  return el.localName + (cls ? `.${cls}` : '');
}

function cssAnimationRow(a, el, timing, data) {
  const rule = data.animRules.find((r) => r.name === a.animationName && safeMatches(el, r.selector));
  const kf = data.keyframes.find((k) => k.name === a.animationName);
  if (!kf) return null;
  const dur = timing.duration / 1000, delay = timing.delay / 1000;
  const keys = kf.stops.flatMap((s) => s.tokens.map((tok) => ({
    t: delay + tok.offset * dur,
    label: `${tok.text}: ${s.decls.map((d) => `${d.name} ${d.text}`).join('; ')}`.slice(0, 80),
    move: (t) => moveCssStop(tok, clamp((t - delay) / dur, 0, 1)),
    decls: s.decls,
  })));
  const timingSet = (field) => (rule ? (v) => setCssTiming(rule, field, v) : null);
  return {
    kind: 'anim', source: `@keyframes ${kf.name}`, keys,
    span: [delay, delay + dur],
    timing: {
      duration: { value: dur, set: timingSet('duration') },
      delay: { value: delay, set: timingSet('delay') },
      easing: { value: rule?.easing?.text ?? timing.easing, set: timingSet('easing') },
    },
  };
}

function waapiRow(eff, timing, data) {
  const live = eff.getKeyframes();
  const call = data.animates.find((c) => c.keyframes.length === live.length
    && (c.options.duration?.num == null || c.options.duration.num === timing.duration)
    && (c.options.delay?.num == null || c.options.delay.num === timing.delay));
  const dur = timing.duration / 1000, delay = timing.delay / 1000;
  const keys = live.map((k, i) => {
    const src = call?.keyframes[i];
    return {
      t: delay + k.computedOffset * dur,
      label: `${(k.computedOffset * 100).toFixed(1)}%`,
      move: src ? (t) => setAnimateOffset(src, +clamp((t - delay) / dur, 0, 1).toFixed(4)) : null,
    };
  });
  const setOpt = (field, ms) => (call ? (v) => setAnimateOption(call, field, ms ? v * 1000 : v) : null);
  return {
    kind: 'anim', source: call ? `element.animate at line ${call.line}` : 'computed, no literal found', keys,
    span: [delay, delay + dur],
    timing: {
      duration: { value: dur, set: setOpt('duration', true) },
      delay: { value: delay, set: setOpt('delay', true) },
      easing: { value: timing.easing, set: setOpt('easing', false) },
    },
  };
}

function animationRows(win, data) {
  const rows = [];
  for (const a of win.document.getAnimations()) {
    const eff = a.effect;
    if (!eff || !eff.target || typeof eff.getKeyframes !== 'function') continue;
    const timing = eff.getTiming();
    if (typeof timing.duration !== 'number' || !isFinite(timing.duration)) continue;
    const row = a.animationName ? cssAnimationRow(a, eff.target, timing, data) : waapiRow(eff, timing, data);
    if (row) rows.push({ ...row, label: labelOf(eff.target) + (a.animationName ? ` · ${a.animationName}` : '') });
  }
  return rows;
}

function safeMatches(el, selector) {
  try { return el.matches(selector); } catch { return false; }
}

// Frames or seconds: the author's name for the table wins, then whether its keys run past the page's length.
export function guessUnit(table, duration) {
  if (/frame|(^|_)f$|fr$/i.test(table.name || '')) return 'frames';
  const max = table.entries[table.entries.length - 1].key.num;
  return max > duration + 1 ? 'frames' : 'seconds';
}

function tableRows(data, fps, duration, units) {
  return data.tables.map((tb, i) => {
    const id = `table:${i}`;
    const unit = units[id] || guessUnit(tb, duration);
    const perSec = unit === 'frames' ? fps : 1;
    const num = (t) => (unit === 'frames' ? Math.round(t * fps) : Math.round(t * 1000) / 1000);
    const keys = tb.entries.map((e, k) => {
      const prev = tb.entries[k - 1], next = tb.entries[k + 1];
      const gap = unit === 'frames' ? 1 / fps : 0.001;
      return {
        t: e.key.num / perSec,
        label: `${e.key.text}: ${e.value.text}`,
        value: e.value,
        setValue: (text) => setTableValue(e, text),
        move: (t) => {
          const lo = prev ? prev.key.num / perSec + gap : -Infinity;
          const hi = next ? next.key.num / perSec - gap : Infinity;
          return moveTableKey(e, num(clamp(t, lo, hi)));
        },
      };
    });
    return { id, kind: 'table', label: tb.name || `table@${tb.line}`, source: `${unit} table, line ${tb.line}`, unit, keys, span: null };
  });
}

function soundRow(data) {
  const keys = data.audio.filter((c) => c.at).map((c) => ({
    t: c.at.num, label: `${c.label}${c.gain ? ` (${c.gain} dB)` : ''}`, move: (t) => moveCue(c, Math.max(0, t)),
  }));
  return { id: 'sound', kind: 'sound', label: 'sound', source: '<audio data-at>', keys, span: null };
}

function spectacleRow(data) {
  const s = data.meta.spectacle;
  if (!s) return null;
  return { id: 'spectacle', kind: 'spectacle', label: 'spectacle', source: '<meta name="spectacle">', span: null,
    keys: [{ t: s.num, label: 'the one big moment', move: (t) => moveSpectacle(s, Math.max(0, t)) }] };
}

export function buildRows(win, data, { fps, duration, units }) {
  const anims = animationRows(win, data).map((r, i) => ({ ...r, id: `anim:${i}` }));
  anims.sort((a, b) => a.span[0] - b.span[0]);
  return [...anims, ...tableRows(data, fps, duration, units), soundRow(data), spectacleRow(data)].filter(Boolean);
}
