// blocks/social.mjs — extracted from blocks/index.mjs (see that file's contract). Pure factories
// (props → array of scene-layer JSON), deterministic, sharing the kit vocabulary. Re-exported by index.mjs.
import {
  TOKENS, SERIES, seriesAt, HAIR, r2, text, rect, box, pill, onColor,
  R, cardChrome, htmlCard, cardInsetY, barWidth, toneColor, avatarEl,
  sweep, stagger, growUp, fillRight, stackWindows,
} from './kit.mjs';
const T = TOKENS;

// profileCard — avatar (image or initials) · name · role. For testimonials / team / "who said it".
// One of the five identity blocks. They all speak the SAME surface now: {name, handle?, sub?, avatar,
// initials}, with each block's old prop name kept as an alias — a shared vocabulary is worth nothing
// if adopting it breaks the callers (MISTAKES #67). `role` is this block's word for `sub`.
export function profileCard({ x, y, w = 360, name = '', sub = '', role = '', avatar = '', initials = '', start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: 22,
    ...cardChrome(), start, duration: dur, enterDur: 0.45, exitDur: 0.3, children: [
      avatarEl({ avatar, initials, name, size: 56 }),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 4, children: [
        text({ text: name, size: 22, weight: 700, color: T.ink }), text({ text: sub || role, size: 18, color: T.sub })] },
    ] }];
}

// chatBubble — a message thread; `me:true` bubbles right in accent, others left in a hairline card.
export function chatBubble({ x, y, w = 480, messages = [], start = 0, dur = 4 } = {}) {
  // BUBBLES ARRIVE IN SEQUENCE, each from its own side — a conversation happening, not a transcript
  // appearing. The bubble is a LEAF carrying its own chrome: the row wrapper that used to hold it is
  // a nested group, and a nested group is built but never registered with the clip driver, so the
  // per-message `start` this block used to set was accepted and silently ignored on all four bubbles.
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 10, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.35,
    children: messages.map((m, i) => ({ type: 'group', layout: 'row', justify: m.me ? 'flex-end' : 'flex-start', children: [
      text({ text: m.text, size: 20, weight: 500, color: m.me ? '#fff' : T.ink,
        bg: m.me ? T.accent : T.card, ...(m.me ? {} : { border: HAIR, elevation: 1 }), radius: R.soft, pad: '12px 18px',
        ...stagger(i, { step: 0.42, delay: 0.2, anim: m.me ? 'slide-right' : 'slide-left', enterDur: 0.35 }) })] })) }];
}

// tweetCard — a post card: avatar · name · @handle · body · repost/like counts.
export function tweetCard({ x, y, w = 480, name = '', handle = '', text: body = '', avatar = '', initials = '', likes = '', reposts = '', start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 14, pad: 22,
    ...cardChrome({ radius: R.soft }), start, duration: dur, enterDur: 0.5, exitDur: 0.35, children: [
      { type: 'group', layout: 'row', items: 'center', gap: 12, children: [avatarEl({ avatar, initials, name, size: 48 }),
        { type: 'group', layout: 'column', items: 'flex-start', gap: 1, children: [
          text({ text: name, size: 20, weight: 700, color: T.ink }), text({ text: '@' + handle, font: 'mono', size: 16, color: T.dim })] }] },
      text({ text: body, size: 21, weight: 400, color: T.ink }),
      { type: 'group', layout: 'row', gap: 28, items: 'center', children: [
        text({ text: '↻ ' + reposts, font: 'mono', size: 16, color: T.dim }),
        text({ text: '♥ ' + likes, font: 'mono', size: 16, color: T.dim })] },
    ] }];
}

// avatarStack — overlapping avatar circles (initials or images) + an optional "+N" overflow.
export function avatarStack({ x, y, avatars = [], extra = 0, size = 48, start = 0, dur = 4 } = {}) {
  // THE AVATARS LAND ONE AFTER ANOTHER, each dropping onto the edge of the last — a team assembling.
  // These are TOP-LEVEL layers, so the stagger is a real `start` (0.07s apart was fast enough to read
  // as one block arriving; 0.14 with a `pop` reads as individual people).
  const step = size * 0.65; const out = [];
  avatars.forEach((a, i) => {
    const common = { x: r2(x + i * step), y, w: size, h: size, radius: 100, border: `2px solid ${T.card}`, start: r2(start + i * 0.14), duration: r2(dur - i * 0.14), anim: 'pop', enterDur: 0.3 };
    const av = typeof a === 'string' ? { avatar: a } : { avatar: a.avatar, initials: a.initials, name: a.name, bg: a.color || T.accentSoft };
    out.push({ ...avatarEl({ size, ...av }), ...common });
  });
  if (extra > 0) out.push({ type: 'group', x: r2(x + avatars.length * step), y, w: size, h: size, radius: 100, bg: T.surface, border: `2px solid ${T.card}`,
    layout: 'row', justify: 'center', items: 'center', start: r2(start + avatars.length * 0.14), duration: r2(dur - avatars.length * 0.14), anim: 'pop', enterDur: 0.3, children: [text({ text: '+' + extra, size: Math.round(size * 0.3), weight: 600, color: T.sub })] });
  return out;
}

// socialProof — the avatar stack AND the line that says what it proves.
//
// `avatarStack` renders circles and a `+N` and stops there, so on its own it asserts nothing: every
// scene that used it hand-placed a text layer beside it at coordinates derived from the stack's own
// step arithmetic, which the block already knows and the author had to re-derive. Two callers, two
// different offsets, and neither one is wrong in a way the author can see. The stack's width is the
// stack's business; this block owns both halves and puts the caption where the stack actually ends.
//
// NO FIGURE IS INVENTED: `caption` and `sub` default to nothing, and the `+N` comes from `extra`,
// which the caller supplies. A social-proof block that ships a number is the exact defect this
// registry has already shipped twice.
export function socialProof({ x, y, avatars = [], extra = 0, size = 44, caption = '', sub = '',
  gap = 18, start = 0, dur = 4 } = {}) {
  const step = size * 0.65;
  const cells = avatars.length + (extra > 0 ? 1 : 0);
  const stackW = cells > 0 ? r2((cells - 1) * step + size) : 0;
  // the caption arrives AFTER the last avatar lands — the stack assembles, then it is named.
  const said = r2(start + cells * 0.14 + 0.12);
  const lines = [
    caption && text({ text: caption, size: 20, weight: 600, color: T.ink }),
    sub && text({ text: sub, font: 'mono', size: 15, color: T.dim }),
  ].filter(Boolean);
  return [
    ...avatarStack({ x, y, avatars, extra, size, start, dur }),
    ...(lines.length ? [{
      type: 'group', x: r2(x + stackW + gap), y, h: size, layout: 'column', items: 'flex-start',
      justify: 'center', gap: 3, children: lines,
      start: said, duration: r2(start + dur - said), anim: 'slide-left', enterDur: 0.35, exitDur: 0.3,
    }] : []),
  ];
}

// reactionBar — a row of reaction count-pills; `mine:true` highlights the one you picked.
export function reactionBar({ x, y, reactions = [], start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, layout: 'row', gap: 10, items: 'center', start, duration: dur, anim: 'rise', enterDur: 0.4, exitDur: 0.3,
    children: reactions.map((r) => ({ type: 'group', layout: 'row', items: 'center', gap: 7, pad: '7px 14px', radius: 100,
      bg: r.mine ? T.accentSoft : T.surface, ...(r.mine ? { border: `1px solid ${T.accent}` } : {}),
      children: [text({ text: r.emoji, size: 19 }), text({ text: String(r.count), size: 17, weight: 600, color: r.mine ? T.accentInk : T.sub, font: 'mono' })] })) }];
}

// nowPlaying — a music-player card: square artwork (accent gradient + initials if no art), title over
// artist, a progress bar, transport glyphs. `progress` is 0..1 of the track.
export function nowPlaying({ x, y, w = 380, name = '', track = '', sub = '', artist = '', avatar = '', art = '',
  initials = '', progress = 0.4, start = 0, dur = 4 } = {}) {
  const p = Math.max(0, Math.min(1, progress));
  const PAD = 22, innerW = w - 2 * PAD;
  const title = name || track, by = sub || artist;
  // The artwork square is the same identity element as the other blocks' avatars, only square.
  const artEl = avatarEl({ avatar: avatar || art, initials, name: title, size: 72, radius: 12,
    // SOLID on purpose. A gradient is a background-IMAGE: the computed background-color under the
    // initials stays transparent, so any contrast probe (ours included) falls through to the white
    // card behind and reads white-on-white — unmeasurable even when it looks fine. A var() colour
    // appended to the shorthand does not survive to a computed background-color either (tried).
    bg: 'color-mix(in srgb, var(--accent) 88%, var(--text))', color: '#fff' });
  return [{
    type: 'group', x, y, w, layout: 'column', items: 'stretch', gap: 16, pad: PAD,
    ...cardChrome({ radius: R.soft, elevation: 2 }), start, duration: dur, enterDur: 0.5, exitDur: 0.35,
    children: [
      { type: 'group', layout: 'row', items: 'center', gap: 16, children: [
        artEl,
        { type: 'group', layout: 'column', items: 'flex-start', gap: 3, grow: 1, children: [
          text({ text: title, size: 22, weight: 700, color: T.ink }),
          text({ text: by, size: 17, color: T.sub }),
        ] },
      ] },
      // the fill is a box INSIDE the track box (rect isn't allowed as a group child); its width IS the progress
      { type: 'group', layout: 'column', items: 'flex-start', gap: 0, start: r2(start + 0.15), duration: dur, anim: 'wipe', enterDur: 0.4,
        children: [box({ w: innerW, h: 5, radius: 100, bg: T.surface, layout: 'row', justify: 'flex-start', items: 'stretch',
          children: [box({ w: r2(innerW * p), h: 5, radius: 100, bg: T.accent })] })] },
      { type: 'group', layout: 'row', justify: 'center', items: 'center', gap: 34,
        start: r2(start + 0.25), duration: dur, anim: 'rise', enterDur: 0.35, children: [
          text({ text: '◁', size: 22, weight: 600, color: T.sub }),
          box({ w: 48, h: 48, radius: 100, bg: T.ink, layout: 'row', justify: 'center', items: 'center',
            children: [text({ text: '▷', size: 20, weight: 700, color: T.paper })] }),
          text({ text: '▷|', size: 22, weight: 600, color: T.sub }),
        ] },
    ],
  }];
}

// videoLowerThird — creator identifier: avatar circle · channel over subscriber count · a CTA chip.
// The chip sits in var(--down): the theme's danger/red token keeps it in the subscribe-red family on
// every brand without hard-coding a platform hex (shape, not lockup — the licence rule again).
export function videoLowerThird({ x, y, w = 520, name = '', channel = '', sub = '', subscribers = '',
  avatar = '', initials = '', cta = 'Subscribe', start = 0, dur = 4 } = {}) {
  const who = name || channel, count = sub || subscribers;
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: '16px 20px',
    ...cardChrome({ elevation: 2 }), start, duration: dur, anim: 'wipe', enterDur: 0.45, exitDur: 0.3,
    children: [
      avatarEl({ avatar, initials, name: who, size: 56 }),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 3, grow: 1, children: [
        text({ text: who, size: 22, weight: 700, color: T.ink }),
        count && text({ text: count, font: 'mono', size: 16, color: T.dim }),
      ].filter(Boolean) },
      { type: 'group', bg: T.down, radius: 100, pad: '10px 22px', start: r2(start + 0.2), duration: dur, anim: 'rise', enterDur: 0.35,
        children: [text({ text: cta, size: 18, weight: 700, color: '#fff' })] },
    ] }];
}

// followCard — name over @handle, a pill CTA on the right. The pill is ink-on-paper inverted (not
// accent) so it reads as THE button of the card, not another tinted chip.
// It speaks the shared identity surface, so it can now carry an avatar. It only draws one when the
// caller supplies `avatar` or `initials`: a card designed without a portrait must not sprout an
// invented circle just because it learned the vocabulary.
export function followCard({ x, y, w = 360, handle = '', name = '', avatar = '', initials = '', cta = 'Follow', start = 0, dur = 4 } = {}) {
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 14, pad: '18px 22px',
    ...cardChrome({ radius: R.soft }), start, duration: dur, enterDur: 0.45, exitDur: 0.3,
    children: [
      ...(avatar || initials ? [avatarEl({ avatar, initials, name, size: 44 })] : []),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 2, grow: 1, children: [
        text({ text: name, size: 21, weight: 700, color: T.ink }),
        text({ text: '@' + handle, font: 'mono', size: 16, color: T.dim }),
      ] },
      { type: 'group', bg: T.ink, radius: 100, pad: '9px 20px', start: r2(start + 0.18), duration: dur, anim: 'rise', enterDur: 0.3,
        children: [text({ text: cta, size: 17, weight: 700, color: T.paper })] },
    ] }];
}

// installCard — the app-store listing row: icon tile · name over category · a star rating that FILLS
// · the rating count · the install button. The registry had no proof surface of this shape at all, so
// a product film could show the app and never show anyone choosing it.
//
// Built on followCard's conventions (identity on the left, a pill CTA on the right, one hairline
// card) because that is the shape it is a sibling of, and a second layout for the same silhouette is
// how a library stops looking like one library.
//
// THE STARS FILL, they are not printed. A rating drawn at its final value is a claim; a rating that
// sweeps to it is the block showing its own reading, which is what the registry's motion rule asks
// for. It is ONE row of five glyphs revealed by a hard-edged mask whose visible fraction is
// `rating / 5`, so a 4.6 lands mid-glyph on the fifth star without anything being redrawn per value.
//
// It is one row and not a lit row over an unlit track because a nested `layout:'free'` group does not
// position its own children: the engine sets `display:block` and marks the children absolute, but
// nothing on the group is positioned, so an absolutely-placed child escapes to the LAYER root. Free
// layout works at top level (a layer root is positioned) and silently misplaces one node down. Noted
// rather than worked around further: this belongs in core/layers/util.js, not in a block.
//
// EVERY FIGURE IS A PROP AND EVERY DEFAULT IS EMPTY: `rating` 0 draws no stars, `ratings` 0 draws no
// count, `cta` empty draws no button. This block cannot ship a number nobody stood behind.
export function installCard({ x, y, w = 400, icon = '', name = '', sub = '', rating = 0, ratings = 0,
  cta = '', start = 0, dur = 4 } = {}) {
  const STARS = '★★★★★';
  const rate = Math.min(5, Math.max(0, +rating || 0));
  const gold = toneColor('warn');
  const strip = rate > 0 ? text({ text: STARS, size: 18, color: gold, ls: '0.06em',
    ...fillRight({ delay: 0.35, dur: 0.8 }), vars: { '--p': [0, r2(rate / 5)] } }) : null;
  // a count is FORMATTED from a number, never accepted as prose: a caller that has 1200 ratings should
  // not have to decide how to write it, and the block should not be able to be handed a sentence.
  const countText = ratings > 0
    ? (ratings >= 1e6 ? r2(ratings / 1e6) + 'M' : ratings >= 1e3 ? r2(ratings / 1e3) + 'K' : String(Math.round(ratings)))
    : '';
  const meta = [strip, countText && text({ text: countText, font: 'mono', size: 15, color: T.dim })].filter(Boolean);
  return [{ type: 'group', x, y, w, layout: 'row', items: 'center', gap: 16, pad: 18,
    ...cardChrome({ radius: R.soft }), start, duration: dur, enterDur: 0.45, exitDur: 0.3, children: [
      box({ w: 62, h: 62, radius: R.card, bg: T.accentSoft, layout: 'row', justify: 'center', items: 'center',
        children: [text({ text: icon, size: 28, weight: 700, color: T.accentInk })] }),
      { type: 'group', layout: 'column', items: 'flex-start', gap: 5, grow: 1, children: [
        text({ text: name, size: 21, weight: 700, color: T.ink }),
        sub && text({ text: sub, size: 16, color: T.sub }),
        meta.length && { type: 'group', layout: 'row', items: 'center', gap: 9, children: meta },
      ].filter(Boolean) },
      cta && { type: 'group', bg: T.accent, radius: 100, pad: '10px 22px',
        start: r2(start + 0.22), duration: dur, anim: 'pop', enterDur: 0.3,
        children: [text({ text: cta, size: 17, weight: 700, color: onColor(T.accent) })] },
    ].filter(Boolean) }];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
//
// The five identity blocks speak ONE surface: {name, handle?, sub?, avatar, initials}. Each block's
// older word for a slot is kept as an alias and declared as one, because a shared vocabulary is worth
// nothing if adopting it breaks the callers.
export const SOCIAL_SCHEMAS = {
  profileCard: {
    w: { kind: 'int', min: 160, max: 1080, def: 360 },
    name: { kind: 'str', max: 60, def: '' },
    sub: { kind: 'str', max: 60, def: '' },
    role: { kind: 'str', max: 60, def: '' },         // alias of sub
    // An image path wins; otherwise the initials are drawn, derived from `name` when not given.
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
  },

  chatBubble: {
    w: { kind: 'int', min: 160, max: 1080, def: 480 },
    messages: { kind: 'list', of: { kind: 'row', fields: {
      text: { kind: 'str', max: 200 },
      // Mine: right, in accent. Theirs: left, in a hairline card.
      me: { kind: 'bool' },
    } }, def: [] },
  },

  tweetCard: {
    w: { kind: 'int', min: 200, max: 1080, def: 480 },
    name: { kind: 'str', max: 40, def: '' },
    handle: { kind: 'str', max: 40, def: '' },
    text: { kind: 'str', max: 280, def: '' },
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    // Counts are strings so a caller can write "1.2k". Empty ships no figure.
    likes: { kind: 'str', max: 12, def: '' },
    reposts: { kind: 'str', max: 12, def: '' },
  },

  avatarStack: {
    avatars: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'row', fields: {
        avatar: { kind: 'str', max: 200 },
        initials: { kind: 'str', max: 3 },
        name: { kind: 'str', max: 60 },
        color: { kind: 'color' },
      } },
    ] }, def: [] },
    // The "+N" overflow. Zero draws no overflow cell.
    extra: { kind: 'int', min: 0, max: 9999, def: 0 },
    // One circle's diameter. The overlap step is 0.65 of it, so the stack's width follows from this.
    size: { kind: 'int', min: 16, max: 300, def: 48 },
  },

  socialProof: {
    avatars: { kind: 'list', of: { kind: 'oneOf', of: [
      { kind: 'str', max: 200 },
      { kind: 'row', fields: {
        avatar: { kind: 'str', max: 200 },
        initials: { kind: 'str', max: 3 },
        name: { kind: 'str', max: 60 },
        color: { kind: 'color' },
      } },
    ] }, def: [] },
    extra: { kind: 'int', min: 0, max: 9999, def: 0 },
    size: { kind: 'int', min: 16, max: 300, def: 44 },
    // Empty by default: a social-proof block that ships a line nobody stood behind is the defect
    // this registry has already shipped twice.
    caption: { kind: 'str', max: 80, def: '' },
    sub: { kind: 'str', max: 80, def: '' },
    // Between the stack's real end and the caption. The stack's width is the block's own arithmetic.
    gap: { kind: 'int', min: 0, max: 200, def: 18 },
  },

  reactionBar: {
    reactions: { kind: 'list', of: { kind: 'row', fields: {
      emoji: { kind: 'str', max: 8 },
      count: { kind: 'num', min: 0, max: 1e9 },
      // The one you picked: accent fill and an accent border.
      mine: { kind: 'bool' },
    } }, def: [] },
  },

  nowPlaying: {
    w: { kind: 'int', min: 200, max: 1080, def: 380 },
    name: { kind: 'str', max: 60, def: '' },
    track: { kind: 'str', max: 60, def: '' },        // alias of name
    sub: { kind: 'str', max: 60, def: '' },
    artist: { kind: 'str', max: 60, def: '' },       // alias of sub
    avatar: { kind: 'str', max: 200, def: '' },
    art: { kind: 'str', max: 200, def: '' },         // alias of avatar
    initials: { kind: 'str', max: 3, def: '' },
    // How far through the track, clamped to 0..1 inside the factory. The fill's width IS this.
    progress: { kind: 'unit', def: 0.4 },
  },

  videoLowerThird: {
    w: { kind: 'int', min: 200, max: 1920, def: 520 },
    name: { kind: 'str', max: 60, def: '' },
    channel: { kind: 'str', max: 60, def: '' },      // alias of name
    sub: { kind: 'str', max: 60, def: '' },
    subscribers: { kind: 'str', max: 60, def: '' },  // alias of sub
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    cta: { kind: 'str', max: 24, def: 'Subscribe' },
  },

  followCard: {
    w: { kind: 'int', min: 160, max: 1080, def: 360 },
    handle: { kind: 'str', max: 40, def: '' },
    name: { kind: 'str', max: 60, def: '' },
    // No portrait is drawn unless one is given: a card designed without one must not sprout an
    // invented circle just because it learned the vocabulary.
    avatar: { kind: 'str', max: 200, def: '' },
    initials: { kind: 'str', max: 3, def: '' },
    cta: { kind: 'str', max: 24, def: 'Follow' },
  },

  installCard: {
    w: { kind: 'int', min: 200, max: 1080, def: 400 },
    icon: { kind: 'str', max: 4, def: '' },
    name: { kind: 'str', max: 40, def: '' },
    sub: { kind: 'str', max: 40, def: '' },
    // Out of five, clamped to 0..5 inside the factory. Zero draws no stars at all.
    rating: { kind: 'num', min: 0, max: 5, def: 0 },
    // The count of ratings, FORMATTED by the block (1204 becomes "1.2K"). Zero draws no count.
    ratings: { kind: 'int', min: 0, max: 1e9, def: 0 },
    cta: { kind: 'str', max: 24, def: '' },
  },
};
