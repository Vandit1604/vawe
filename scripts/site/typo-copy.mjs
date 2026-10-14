// The UI copy of a site source file: JSX text, string literals and the text attributes (alt, title,
// aria-label, content, placeholder). One reader for two users: quality/gates/site-typography.mjs finds
// what is wrong, scripts/site/typo-fix.mjs rewrites it through site/lib/typo.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(path.join(ROOT, 'site/package.json'))('typescript');
import { UNIT } from '../../site/lib/typo.mjs';

const ENTITY = /&(?:apos|quot|#39);/g;
export const decode = (t) => t.replace(ENTITY, (e) => (e === '&quot;' ? '"' : "'"));

const TEXT_ATTR = /^(alt|title|aria-label|content|placeholder)$/;

function kindOf(n) {
  const k = ts.SyntaxKind;
  if (n.kind === k.JsxText) return 'jsx';
  if (n.kind === k.StringLiteral) return 'str';
  return null;
}

function isCopy(n, kind) {
  if (ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent)) return false;
  if (ts.isJsxAttribute(n.parent)) return TEXT_ATTR.test(n.parent.name.text);
  const isKey = ts.isPropertyAssignment(n.parent) && n.parent.name === n;
  return !ts.isLiteralTypeNode(n.parent) && !isKey ;
}

function prevIsElement(n) {
  if (n.kind !== ts.SyntaxKind.JsxText) return false;
  const kids = n.parent.children;
  const prev = kids[kids.indexOf(n) - 1];
  return Boolean(prev) && prev.kind !== ts.SyntaxKind.JsxText;
}

export function copyNodes(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (n) => {
    const kind = kindOf(n);
    if (kind && isCopy(n, kind)) {
      const quote = kind === 'str' ? text[n.getStart()] : '';
      out.push({ kind, quote, start: n.getStart(), end: n.getEnd(), text: decode(n.text ?? ''), after: prevIsElement(n) ? 'x' : '', at: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1 });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { source: text, nodes: out };
}

const NUMBER_UNIT = new RegExp('\\d (?:' + UNIT + ')(?![\\w])');
const CODE_LIKE = /[{}=<>]|\b(?:const|function|import|return)\b|^[\w./:#@-]+$/;

export function copyProblem(s) {
  if (!/ /.test(s) || CODE_LIKE.test(s) || /https?:\/\//.test(s)) return null;
  if (/[A-Za-z]'[A-Za-z]/.test(s) || /(^|\s)'[A-Za-z]/.test(s)) return 'a straight apostrophe or single quote';
  if (/(^|[\s(])"[A-Za-z]|[A-Za-z.,]"(\s|$|[.,;:)])/.test(s)) return 'a straight double quote';
  if (/\.\.\./.test(s)) return 'three dots instead of an ellipsis';
  if (NUMBER_UNIT.test(s)) return 'a number and its unit on a plain space (use a nonbreaking space)';
  if (/\d x \d/.test(s)) return 'x between two numbers (use the multiplication sign with nonbreaking spaces)';
  return null;
}
