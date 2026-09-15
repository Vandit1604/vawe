# docs-site/

A standalone fumadocs (Next.js) app that publishes MDX documentation pages. Separate from
`engine-doctrine/`, which is the doctrine an agent reads while authoring; this is the public site build.

Read by: a human browsing the published docs, and Next.js at build/dev time. Not read by the engine or
by an authoring agent.

The one doc: `docs-site/content/docs/`, the MDX source. No gate covers this folder; `npm run build`
inside it is the check (fumadocs 16 + mdx 15 + Next 16 must stay lockstep).

Look first: `docs-site/content/docs/` for the pages, `docs-site/package.json` for the version pins.
