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

import { TOKENS as T, text, box, r2, R, cardChrome, avatarEl, onColor } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'App';


const spacer = () => box({ grow: 1 });

// the block's outer card: kit chrome + position + timing. One definition for all six surfaces.
const surface = ({ x, y, w, start, dur, pad, gap, radius = R.card, layout = 'row', items = 'center', ...chrome }) => ({
  type: 'group', x, y, w, layout, items, gap, pad,
  ...cardChrome({ radius, ...chrome }),
  start, duration: dur, enterDur: 0.45, exitDur: 0.3,
});

// ─────────────────────────────────────────────────────────────────────────────
// feedRow. One item in a social/activity feed: avatar · name · handle · timestamp · body.
// The generic sibling of tweetCard, minus the engagement counts: a feed item is not always a post.
export function feedRow({ x, y, w = 520, avatar = '', initials = '', name = '', sub = '', time = '', body = '',
  start = 0, dur = 4 } = {}) {
  return [{ ...surface({ x, y, w, start, dur, pad: 16, gap: 12, radius: R.soft, items: 'flex-start' }), children: [
    avatarEl({ avatar, initials, name, size: 48 }),
    { type: 'group', layout: 'column', items: 'stretch', gap: 6, grow: 1, children: [
      { type: 'group', layout: 'row', items: 'center', gap: 8, children: [
        text({ text: name, size: 20, weight: 700, color: T.ink }),
        sub && text({ text: sub, font: 'mono', size: 16, color: T.dim }),
        spacer(),                                   // pushes the timestamp to the row's far edge
        time && text({ text: time, font: 'mono', size: 15, color: T.dim }),
      ].filter(Boolean) },
      body && text({ text: body, size: 19, weight: 400, color: T.ink }),
    ].filter(Boolean) },
  ] }];
}

// ─────────────────────────────────────────────────────────────────────────────
// listRow. One row of a generic list (a mail item, a file, a track): leading icon tile · title over
// sub · trailing meta. The workhorse: three of these stacked read as "an app" faster than any card.
export function listRow({ x, y, w = 520, icon = '', title = '', sub = '', meta = '', start = 0, dur = 4 } = {}) {
  return [{ ...surface({ x, y, w, start, dur, pad: '16px 16px', gap: 16 }), children: [
    icon && box({ w: 44, h: 44, radius: R.tight, bg: T.surface, layout: 'row', justify: 'center', items: 'center',
      children: [text({ text: icon, size: 20, weight: 600, color: T.ink })] }),
    { type: 'group', layout: 'column', items: 'flex-start', gap: 2, grow: 1, children: [
      text({ text: title, size: 20, weight: 600, color: T.ink }),
      sub && text({ text: sub, size: 16, color: T.sub }),
    ].filter(Boolean) },
    meta && text({ text: meta, font: 'mono', size: 15, color: T.dim }),
  ].filter(Boolean) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// settingsRow, label (+ optional sub) with a control on the right.
//   control: 'toggle'  → a switch; `value` is its state (anything but `false` reads as on)
//            'chevron' → a disclosure arrow into a sub-screen
//            'value'   → the current setting, as text
export function settingsRow({ x, y, w = 520, label = '', sub = '', control = 'chevron', value = '',
  start = 0, dur = 4 } = {}) {
  const on = value !== false;
  // the track is accent when on and neutral when off; `justify` carries the knob's side, so the two
  // states are one shape with one differing property (a scene can cut between them cleanly).
  const toggle = box({ w: 52, h: 30, radius: 100, bg: on ? T.accent : T.surface, pad: 2,
    layout: 'row', items: 'center', justify: on ? 'flex-end' : 'flex-start',
    children: [box({ w: 24, h: 24, radius: 100, bg: T.card })] });
  const controls = {
    toggle,
    chevron: text({ text: '›', size: 26, weight: 600, color: T.dim }),
    value: text({ text: String(value), size: 18, color: T.sub }),
  };
  return [{ ...surface({ x, y, w, start, dur, pad: '16px 24px', gap: 16 }), children: [
    { type: 'group', layout: 'column', items: 'flex-start', gap: 2, grow: 1, children: [
      text({ text: label, size: 20, weight: 600, color: T.ink }),
      sub && text({ text: sub, size: 16, color: T.sub }),
    ].filter(Boolean) },
    controls[control] || controls.chevron,
  ] }];
}

// ─────────────────────────────────────────────────────────────────────────────
// profileHeader. The top of an account screen: avatar over name · @handle · a small stat row.
// `stats` is [{value, label}] and defaults to empty: a caller with no counts ships no counts.
export function profileHeader({ x, y, w = 460, avatar = '', initials = '', name = '', handle = '',
  stats = [], start = 0, dur = 4 } = {}) {
  return [{ ...surface({ x, y, w, start, dur, pad: 24, gap: 16, radius: R.soft, layout: 'column', items: 'flex-start' }), children: [
    avatarEl({ avatar, initials, name, size: 76 }),
    { type: 'group', layout: 'column', items: 'flex-start', gap: 2, children: [
      text({ text: name, size: 28, weight: 700, color: T.ink, ls: '-0.02em' }),
      handle && text({ text: '@' + handle, font: 'mono', size: 17, color: T.dim }),
    ].filter(Boolean) },
    stats.length && { type: 'group', layout: 'row', gap: 32, items: 'flex-start',
      start: r2(start + 0.18), duration: dur, anim: 'rise', enterDur: 0.35,
      children: stats.map((s) => ({ type: 'group', layout: 'column', items: 'flex-start', gap: 2, children: [
        text({ text: String(s.value), size: 24, weight: 700, color: T.ink }),
        text({ text: s.label, font: 'mono', size: 15, color: T.dim }),
      ] })) },
  ].filter(Boolean) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// onboardCard. One pane of a first-run flow: progress dots · position · title · body · CTA.
// The dots carry the position visually; the mono label states it for anyone counting.
export function onboardCard({ x, y, w = 460, step = 1, of = 1, title = '', body = '', cta = '',
  start = 0, dur = 4 } = {}) {
  const total = Math.max(1, Math.round(of));
  const at = Math.min(Math.max(1, Math.round(step)), total);
  const dots = Array.from({ length: total }, (_, i) => box({
    w: i === at - 1 ? 22 : 8, h: 8, radius: 100, bg: i === at - 1 ? T.accent : T.surface }));
  return [{ ...surface({ x, y, w, start, dur, pad: 24, gap: 16, radius: R.soft, layout: 'column', items: 'stretch' }), children: [
    { type: 'group', layout: 'row', items: 'center', gap: 8, children: [
      ...dots, spacer(), text({ text: `${at} of ${total}`, font: 'mono', size: 15, color: T.dim }),
    ] },
    { type: 'group', layout: 'column', items: 'flex-start', gap: 8, children: [
      text({ text: title, size: 30, weight: 700, color: T.ink, ls: '-0.02em' }),
      body && text({ text: body, size: 19, weight: 400, color: T.sub }),
    ].filter(Boolean) },
    // ink on the accent fill: onColor(T.accent) instead of an assumed white.
    cta && { type: 'group', bg: T.accent, radius: R.tight, pad: '12px 0', layout: 'row', justify: 'center', items: 'center',
      start: r2(start + 0.2), duration: dur, anim: 'rise', enterDur: 0.35,
      children: [text({ text: cta, size: 19, weight: 700, color: onColor(T.accent) })] },
  ].filter(Boolean) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// emptyState. The zero state: an icon tile, a line saying what is missing, a line saying what fills
// it, and the action that does. Dashed chrome and no elevation so the surface itself reads as unfilled.
export function emptyState({ x, y, w = 460, icon = '', title = '', body = '', cta = '', start = 0, dur = 4 } = {}) {
  return [{ ...surface({ x, y, w, start, dur, pad: 32, gap: 16, radius: R.soft, layout: 'column', items: 'center',
      border: `1px dashed ${T.hair}`, elevation: 0 }), children: [
    icon && box({ w: 60, h: 60, radius: R.soft, bg: T.surface, layout: 'row', justify: 'center', items: 'center',
      children: [text({ text: icon, size: 26, weight: 600, color: T.sub })] }),
    { type: 'group', layout: 'column', items: 'center', gap: 6, children: [
      text({ text: title, size: 24, weight: 700, color: T.ink }),
      body && text({ text: body, size: 18, weight: 400, color: T.sub, align: 'center' }),
    ].filter(Boolean) },
    cta && { type: 'group', bg: T.ink, radius: 100, pad: '12px 24px',
      start: r2(start + 0.2), duration: dur, anim: 'rise', enterDur: 0.35,
      children: [text({ text: cta, size: 17, weight: 700, color: T.paper })] },
  ].filter(Boolean) }];
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
