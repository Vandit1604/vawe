import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import remarkTypo from './lib/remark-typo.mjs';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: { postprocess: { includeProcessedMarkdown: { headingIds: false } } },
});

export default defineConfig({
  mdxOptions: { remarkPlugins: [remarkTypo] },
});
