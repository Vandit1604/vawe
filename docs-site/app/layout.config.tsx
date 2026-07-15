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
  },
  links: [
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'GitHub', url: 'https://github.com/Vandit1604/vawe', external: true },
  ],
};
