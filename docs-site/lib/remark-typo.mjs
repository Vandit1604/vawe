// Sets the prose of every docs page through site/lib/typo.mjs (curly quotes, nonbreaking units, en dash
// ranges). Code and inline code are other node types, so they keep their straight quotes. The Docker image
// copies site/ and docs-site/ side by side, so the relative import holds there too.
import { smartText } from '../../site/lib/typo.mjs';

function setChildren(node) {
  let before = '';
  for (const child of node.children ?? []) {
    if (child.type === 'text') {
      child.value = smartText(child.value, before);
      before = child.value.slice(-1);
    } else {
      before = 'x';
      setChildren(child);
    }
  }
}

export default function remarkTypo() {
  return (tree) => setChildren(tree);
}
