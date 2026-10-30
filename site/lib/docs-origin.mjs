// The one owner of where the docs app lives. Next bakes rewrites into the build, so next.config.mjs
// reads this at build time; the middleware and llms.txt read it at run time. Both must see the same value.
export const DOCS_ORIGIN = (process.env.DOCS_ORIGIN || 'http://127.0.0.1:3001').replace(/\/+$/, '');
