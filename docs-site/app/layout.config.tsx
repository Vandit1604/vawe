import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout options (nav title, links) for both the docs and home layouts.
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2 13c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Vawe
      </span>
    ),
    // the wordmark goes home: proxied at /docs under the site's origin, this app is one section of
    // that site, and without this there was no way back to it from here at all.
    url: '/',
  },
  // No GitHub link: the repo is private, so it was a nav item that 404s for every reader. The site
  // dropped the same link for the same reason; this file was missed. These are where a reader of
  // the docs actually wants to go next, and they resolve because the site serves this app.
  links: [
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'Editor', url: '/editor' },
    { text: 'Showcase', url: '/showcase' },
  ],
};
