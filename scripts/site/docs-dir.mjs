// Where the docs app is checked out. The docs live in vawe-hq/vawe-docs, a sibling checkout by default.
import path from 'node:path';

export const docsDir = (root) => path.resolve(process.env.DOCS_DIR || path.join(root, '..', 'vawe-docs'));
