// Invented brands for the move demos, never a real company. A mark is paths in a 24 x 24 box drawn in
// currentColor; a wordmark is [name, weight, face, tracking] and sets at 1em of its parent.
const S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

export const MARKS = {
  relay: '<path d="M2.5 5h4.8l7 7-7 7H2.5l7-7z"/><path d="M10.2 5H15l7 7-7 7h-4.8l7-7z" opacity=".45"/>',
  meridian: '<path d="M3 19.5V5.2l9 7.6 9-7.6v14.3h-3.8v-6.6L12 17.3l-5.2-4.4v6.6z"/>',
  compass: `<circle cx="12" cy="12" r="9" ${S} stroke-width="2"/><path d="M15.8 8.2 13.4 13.4 8.2 15.8l2.4-5.2z"/>`,
  northwind: '<path fill-rule="evenodd" d="M12 2.8 22 20.5H2zm0 7.6-3.9 6.8h7.8z"/>',
  halcyon: '<path fill-rule="evenodd" d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 3.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z"/><circle cx="12" cy="12" r="2.4"/>',
  fernbank: '<rect x="3.5" y="11" width="4.4" height="9.5" rx="1.2"/><rect x="9.8" y="3.5" width="4.4" height="17" rx="1.2"/><rect x="16.1" y="7.5" width="4.4" height="13" rx="1.2" opacity=".45"/>',
  kestrel: '<path d="M2 3.8l10 6 10-6v4.4l-10 6-10-6z"/><path d="M2 12.2l10 6 10-6v3.6l-10 6-10-6z" opacity=".45"/>',
  orbital: `<circle cx="12" cy="12" r="4.2"/><ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-28 12 12)" ${S} stroke-width="1.8"/>`,
  lumen: `<circle cx="12" cy="12" r="4.6"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M18.9 5.1l-1.8 1.8M6.9 17.1l-1.8 1.8" ${S} stroke-width="2"/>`,
  quarry: '<path d="M3.5 3.5h17v11l-6 6h-11z"/><path d="M14.5 20.5v-6h6z" opacity=".45"/>',
  tidewell: `<path d="M2.5 8.5c3.2-3.4 6.3 3.4 9.5 0s6.3 3.4 9.5 0M2.5 15.5c3.2-3.4 6.3 3.4 9.5 0s6.3 3.4 9.5 0" ${S} stroke-width="2.4"/>`,
  parcel: '<path d="M12 2.5 20.5 7 12 11.5 3.5 7z" opacity=".45"/><path d="M3.5 8.4 11.2 12.7v9L3.5 17.4z"/><path d="M20.5 8.4 12.8 12.7v9l7.7-4.3z" opacity=".75"/>',
  mosaic: '<rect x="3" y="3" width="8.2" height="8.2" rx="1.6"/><rect x="12.8" y="3" width="8.2" height="8.2" rx="4.1" opacity=".45"/><rect x="3" y="12.8" width="8.2" height="8.2" rx="4.1" opacity=".45"/><rect x="12.8" y="12.8" width="8.2" height="8.2" rx="1.6"/>',
  ardent: '<path fill-rule="evenodd" d="M12 1.8 21.4 12 12 22.2 2.6 12zm0 5.6L7.8 12l4.2 4.6 4.2-4.6z"/>',
  vantage: '<path d="M2.5 4h4.6l4.9 9.4L16.9 4h4.6L12 21.5z"/><path d="M12 13.4 16.9 4h4.6L14.3 17.2z" opacity=".45"/>',
  aster: '<path d="M12 1.8c.9 5.6 4.6 9.3 10.2 10.2-5.6.9-9.3 4.6-10.2 10.2C11.1 16.6 7.4 12.9 1.8 12 7.4 11.1 11.1 7.4 12 1.8z"/>',
};

export const WORDMARKS = {
  relay: ['Relay', 700, 'Geist', '-0.035em'],
  meridian: ['Meridian', 700, 'Archivo', '-0.03em'],
  compass: ['Compass', 650, 'Manrope', '-0.03em'],
  northwind: ['Northwind', 700, 'Geist', '-0.03em'],
  halcyon: ['halcyon', 400, 'Instrument Serif', '-0.005em'],
  fernbank: ['FERNBANK', 600, 'Unbounded', '0.02em'],
  kestrel: ['kestrel', 500, 'JetBrains Mono', '-0.04em'],
  orbital: ['Orbital', 800, 'Archivo', '-0.03em'],
  lumen: ['Lumen&Co', 700, 'Geist', '-0.02em'],
  quarry: ['Quarry', 800, 'Archivo', '0.01em'],
  tidewell: ['tidewell', 400, 'Instrument Serif', '0'],
  parcel: ['PARCEL', 500, 'Geist Mono', '0.06em'],
  mosaic: ['Mosaic', 700, 'Plus Jakarta Sans', '-0.03em'],
  ardent: ['ardent', 600, 'Manrope', '-0.02em'],
  vantage: ['Vantage', 700, 'Bricolage Grotesque', '-0.03em'],
  aster: ['Aster', 600, 'Plus Jakarta Sans', '-0.02em'],
};

export const mark = (name) => `<svg class="logo-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${MARKS[name]}</svg>`;

export const wordmark = (name) => {
  const [text, weight, face, track] = WORDMARKS[name];
  return `<b class="logo-word" style="font-weight:${weight};font-family:'${face}',sans-serif;letter-spacing:${track}">${text}</b>`;
};

export const lockup = (name) => `<span class="logo-lockup">${mark(name)}${wordmark(name)}</span>`;

// data-logo="kestrel" fills an element with the mark; add data-lockup to append the wordmark as well
document.querySelectorAll('[data-logo]').forEach((el) => {
  const both = 'lockup' in el.dataset;
  if (both) el.classList.add('logo-lockup');
  el.innerHTML = mark(el.dataset.logo) + (both ? wordmark(el.dataset.logo) : '');
});
