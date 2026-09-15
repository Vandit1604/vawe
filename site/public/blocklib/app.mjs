// blocks/app.mjs: APP-SURFACE families. The registry could depict a music player and nothing else:
// `nowPlaying` was the only block describing the INSIDE of a product, so a product-demo film could
// only ever be about a music app. These six are the generic surfaces every app is built from, a feed
// item, a list row, a settings row, a profile header, an onboarding pane, an empty state, so a scene
// can show ANY app instead of the one the vocabulary happened to cover.
//
// Same contract as blocks/index.mjs: a factory is a PURE function props → an ARRAY of scene layers,
// {x,y} is the block's top-left on the 1920×1080 stage, {start,dur} are seconds, and every colour
// comes from the theme tokens so the block reskins per brand. No Date, no random, no DOM.
//
// Built on blocks/kit.mjs, not on index.mjs: the shared vocabulary (tokens, layer primitives, card
// chrome, the one avatar) lives there, so this file adds surfaces without adding a second copy of
// anything and without an import cycle back through the registry.
//
// CONTENT RULE: no figure a caller cannot stand behind. These surfaces carry counts and metadata by
// nature, so every count is a PROP that defaults to empty, the block never invents one.

import { TOKENS as T, R, cardChrome, avatarHtml, onColor } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'App';

// HTML-FIRST: every surface below is one `html` layer, the kit chrome (bg/border/radius/elevation)
// stays a layer prop and only the INTERIOR is markup. Design Read: flat rows, hairline dividers, mono
// for a timestamp/count/meta value and sans for a name or a sentence, never a gradient or a nested
// card. VARIANCE low (these are app chrome, not a film's loud moment); MOTION is the layer's own
// envelope anim, one arrival per surface, `parts` only where a surface's OWN content stages in two
// beats (profileHeader's stat row, onboardCard's CTA). engine-doctrine/CRAFT/HTML-FRAGMENTS.md.

// the block's outer card: kit chrome + position + timing. One definition for all six surfaces.
const surface = ({ x, y, w, start, dur, radius = R.card, ...chrome } = {}) => ({
  type: 'html', x, y, w, ...cardChrome({ radius, ...chrome }),
  start, duration: dur, enterDur: 0.45, exitDur: 0.3,
});

// ─────────────────────────────────────────────────────────────────────────────
// feedRow. One item in a social/activity feed: avatar · name · handle · timestamp · body.
// The generic sibling of tweetCard, minus the engagement counts: a feed item is not always a post.
export function feedRow({ x, y, w = 520, avatar = '', initials = '', name = '', sub = '', time = '', body = '',
  start = 0, dur = 4 } = {}) {
  const html = `<div style="display:flex;align-items:flex-start;gap:12px;padding:16px;box-sizing:border-box;width:${w}px">`
    + avatarHtml({ avatar, initials, name, size: 48 })
    + `<div style="display:flex;flex-direction:column;gap:6px;flex:1;align-items:flex-start;min-width:0">`
    + `<div style="display:flex;align-items:center;gap:8px;width:100%">`
    + `<span style="font:700 20px var(--font-sans);color:${T.ink}">${name}</span>`
    + (sub ? `<span style="font:500 16px var(--font-mono);color:${T.dim}">${sub}</span>` : '')
    + `<span style="flex:1"></span>`                 // pushes the timestamp to the row's far edge
    + (time ? `<span style="font:500 15px var(--font-mono);color:${T.dim}">${time}</span>` : '')
    + '</div>'
    + (body ? `<span style="font:400 19px var(--font-sans);color:${T.ink}">${body}</span>` : '')
    + '</div></div>';
  return [{ ...surface({ x, y, w, start, dur, radius: R.soft }), html }];
}

// ─────────────────────────────────────────────────────────────────────────────
// listRow. One row of a generic list (a mail item, a file, a track): leading icon tile · title over
// sub · trailing meta. The workhorse: three of these stacked read as "an app" faster than any card.
export function listRow({ x, y, w = 520, icon = '', title = '', sub = '', meta = '', start = 0, dur = 4 } = {}) {
  const html = `<div style="display:flex;align-items:center;gap:16px;padding:16px;box-sizing:border-box;width:${w}px">`
    + (icon ? `<div style="width:44px;height:44px;flex:none;border-radius:${R.tight}px;background:${T.surface};`
      + `display:flex;align-items:center;justify-content:center;font:600 20px var(--font-sans);color:${T.ink}">${icon}</div>` : '')
    + `<div style="display:flex;flex-direction:column;gap:2px;flex:1;align-items:flex-start;min-width:0">`
    + `<span style="font:600 20px var(--font-sans);color:${T.ink}">${title}</span>`
    + (sub ? `<span style="font:400 16px var(--font-sans);color:${T.sub}">${sub}</span>` : '') + '</div>'
    + (meta ? `<span style="font:500 15px var(--font-mono);color:${T.dim}">${meta}</span>` : '')
    + '</div>';
  return [{ ...surface({ x, y, w, start, dur }), html }];
}

// ─────────────────────────────────────────────────────────────────────────────
// settingsRow, label (+ optional sub) with a control on the right.
//   control: 'toggle'  → a switch; `value` is its state (anything but `false` reads as on)
//            'chevron' → a disclosure arrow into a sub-screen
//            'value'   → the current setting, as text
export function settingsRow({ x, y, w = 520, label = '', sub = '', control = 'chevron', value = '',
  start = 0, dur = 4 } = {}) {
  const on = value !== false;
  // the track is accent when on and neutral when off; the knob's side carries the state, so the two
  // states are one shape with one differing property (a scene can cut between them cleanly).
  const CONTROLS = {
    toggle: `<div style="width:52px;height:30px;flex:none;border-radius:100px;padding:2px;box-sizing:border-box;`
      + `background:${on ? T.accent : T.surface};display:flex;align-items:center;justify-content:${on ? 'flex-end' : 'flex-start'}">`
      + `<div style="width:24px;height:24px;border-radius:100%;background:${T.card}"></div></div>`,
    chevron: `<span style="font:600 26px var(--font-sans);color:${T.dim};flex:none">›</span>`,
    value: `<span style="font:400 18px var(--font-sans);color:${T.sub};flex:none">${String(value)}</span>`,
  };
  if (!(control in CONTROLS)) throw new Error(`blocks/app.mjs settingsRow: unknown control "${control}". `
    + `Known: ${Object.keys(CONTROLS).join(', ')}`);
  const html = `<div style="display:flex;align-items:center;gap:16px;padding:16px 24px;box-sizing:border-box;width:${w}px">`
    + `<div style="display:flex;flex-direction:column;gap:2px;flex:1;align-items:flex-start;min-width:0">`
    + `<span style="font:600 20px var(--font-sans);color:${T.ink}">${label}</span>`
    + (sub ? `<span style="font:400 16px var(--font-sans);color:${T.sub}">${sub}</span>` : '') + '</div>'
    + CONTROLS[control] + '</div>';
  return [{ ...surface({ x, y, w, start, dur }), html }];
}

// ─────────────────────────────────────────────────────────────────────────────
// profileHeader. The top of an account screen: avatar over name · @handle · a small stat row.
// `stats` is [{value, label}] and defaults to empty: a caller with no counts ships no counts.
export function profileHeader({ x, y, w = 460, avatar = '', initials = '', name = '', handle = '',
  stats = [], start = 0, dur = 4 } = {}) {
  // the stat row lands a beat AFTER the identity above it, `parts` (delay only, no stagger: the row
  // arrives as one unit, matching the original's single `start: start + 0.18` group).
  const statsHtml = stats.length ? `<div data-part style="display:flex;gap:32px;align-items:flex-start">`
    + stats.map((s) => `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">`
      + `<span style="font:700 24px var(--font-sans);color:${T.ink}">${s.value}</span>`
      + `<span style="font:500 15px var(--font-mono);color:${T.dim}">${s.label}</span></div>`).join('') + '</div>' : '';
  const html = `<div style="display:flex;flex-direction:column;gap:16px;align-items:flex-start;`
    + `padding:24px;box-sizing:border-box;width:${w}px">`
    + avatarHtml({ avatar, initials, name, size: 76 })
    + `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">`
    + `<span style="font:700 28px var(--font-sans);letter-spacing:-0.02em;color:${T.ink}">${name}</span>`
    + (handle ? `<span style="font:500 17px var(--font-mono);color:${T.dim}">@${handle}</span>` : '') + '</div>'
    + statsHtml + '</div>';
  return [{ ...surface({ x, y, w, start, dur, radius: R.soft }), html,
    ...(stats.length ? { parts: [{ anim: 'fadeUp', each: 0.35, delay: 0.18 }] } : {}) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// onboardCard. One pane of a first-run flow: progress dots · position · title · body · CTA.
// The dots carry the position visually; the mono label states it for anyone counting.
export function onboardCard({ x, y, w = 460, step = 1, of = 1, title = '', body = '', cta = '',
  start = 0, dur = 4 } = {}) {
  const total = Math.max(1, Math.round(of));
  const at = Math.min(Math.max(1, Math.round(step)), total);
  const dots = Array.from({ length: total }, (_, i) => `<span style="width:${i === at - 1 ? 22 : 8}px;height:8px;`
    + `border-radius:100px;background:${i === at - 1 ? T.accent : T.surface}"></span>`).join('');
  const html = `<div style="display:flex;flex-direction:column;gap:16px;align-items:stretch;`
    + `padding:24px;box-sizing:border-box;width:${w}px">`
    + `<div style="display:flex;align-items:center;gap:8px">` + dots
    + `<span style="flex:1"></span><span style="font:500 15px var(--font-mono);color:${T.dim}">${at} of ${total}</span></div>`
    + `<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">`
    + `<span style="font:700 30px var(--font-sans);letter-spacing:-0.02em;color:${T.ink}">${title}</span>`
    + (body ? `<span style="font:400 19px var(--font-sans);color:${T.sub}">${body}</span>` : '') + '</div>'
    // ink on the accent fill: onColor(T.accent) instead of an assumed white.
    + (cta ? `<div data-part style="background:${T.accent};border-radius:${R.tight}px;padding:12px 0;`
      + `display:flex;align-items:center;justify-content:center">`
      + `<span style="font:700 19px var(--font-sans);color:${onColor(T.accent)}">${cta}</span></div>` : '')
    + '</div>';
  return [{ ...surface({ x, y, w, start, dur, radius: R.soft }), html,
    ...(cta ? { parts: [{ anim: 'fadeUp', each: 0.35, delay: 0.2 }] } : {}) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// emptyState. The zero state: an icon tile, a line saying what is missing, a line saying what fills
// it, and the action that does. Dashed chrome and no elevation so the surface itself reads as unfilled.
export function emptyState({ x, y, w = 460, icon = '', title = '', body = '', cta = '', start = 0, dur = 4 } = {}) {
  const html = `<div style="display:flex;flex-direction:column;gap:16px;align-items:center;`
    + `padding:32px;box-sizing:border-box;width:${w}px">`
    + (icon ? `<div style="width:60px;height:60px;border-radius:${R.soft}px;background:${T.surface};`
      + `display:flex;align-items:center;justify-content:center;font:600 26px var(--font-sans);color:${T.sub}">${icon}</div>` : '')
    + `<div style="display:flex;flex-direction:column;gap:6px;align-items:center">`
    + `<span style="font:700 24px var(--font-sans);color:${T.ink}">${title}</span>`
    + (body ? `<span style="font:400 18px var(--font-sans);color:${T.sub};text-align:center">${body}</span>` : '') + '</div>'
    + (cta ? `<div data-part style="background:${T.ink};border-radius:100px;padding:12px 24px">`
      + `<span style="font:700 17px var(--font-sans);color:${T.paper}">${cta}</span></div>` : '')
    + '</div>';
  return [{ ...surface({ x, y, w, start, dur, radius: R.soft, border: `1px dashed ${T.hair}`, elevation: 0 }), html,
    ...(cta ? { parts: [{ anim: 'fadeUp', each: 0.35, delay: 0.2 }] } : {}) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
//
// CONTENT RULE, restated as a contract: these surfaces carry counts and metadata by nature, so every
// count is a prop that defaults to empty. No table below has a figure in a `def`.
export const APP_SCHEMAS = {
  feedRow: {
    w: { kind: 'int', min: 200, max: 1920, def: 520 },
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    name: { kind: 'str', max: 60, def: '' },
    sub: { kind: 'str', max: 40, def: '' },
    time: { kind: 'str', max: 20, def: '' },
    body: { kind: 'str', max: 280, def: '' },
  },

  listRow: {
    w: { kind: 'int', min: 200, max: 1920, def: 520 },
    // One glyph in a 44px tile. Empty draws no tile and the title takes the row's leading edge.
    icon: { kind: 'str', max: 4, def: '' },
    title: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 80, def: '' },
    meta: { kind: 'str', max: 20, def: '' },
  },

  settingsRow: {
    w: { kind: 'int', min: 200, max: 1920, def: 520 },
    label: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 120, def: '' },
    control: { kind: 'enum', of: ['toggle', 'chevron', 'value'], def: 'chevron' },
    // For `toggle` this is the switch state, where anything but false reads as on. For `value` it is
    // the setting itself, drawn as text. `chevron` ignores it.
    value: { kind: 'oneOf', of: [{ kind: 'bool' }, { kind: 'str', max: 40 }], def: '' },
  },

  profileHeader: {
    w: { kind: 'int', min: 200, max: 1920, def: 460 },
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    name: { kind: 'str', max: 60, def: '' },
    handle: { kind: 'str', max: 40, def: '' },
    // Empty by default: a caller with no counts ships no counts.
    stats: { kind: 'list', of: { kind: 'row', fields: {
      value: { kind: 'str', max: 12 },
      label: { kind: 'str', max: 20 },
    } }, def: [] },
  },

  onboardCard: {
    w: { kind: 'int', min: 200, max: 1920, def: 460 },
    // Both are rounded and clamped inside the factory: `of` to at least 1, `step` into 1..of.
    step: { kind: 'int', min: 1, max: 20, def: 1 },
    of: { kind: 'int', min: 1, max: 20, def: 1 },
    title: { kind: 'str', max: 60, def: '' },
    body: { kind: 'str', max: 200, def: '' },
    cta: { kind: 'str', max: 24, def: '' },
  },

  emptyState: {
    w: { kind: 'int', min: 200, max: 1920, def: 460 },
    icon: { kind: 'str', max: 4, def: '' },
    title: { kind: 'str', max: 60, def: '' },
    body: { kind: 'str', max: 200, def: '' },
    cta: { kind: 'str', max: 24, def: '' },
  },
};
