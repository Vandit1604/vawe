import Link from "next/link";

/* Opens the scene in the editor. It used to expand the JSON inline, which was wrong twice over:
 * an accordion mid-page shoves everything below it down, so the thing you were reading jumps away
 * from under your eyes, and reading JSON is not the point anyway. The editor already shows the
 * same source AND renders it live AND lets you edit it, so "view the source" and "go where the
 * source runs" are the same intent, and only one of them costs a layout shift.
 *
 * It is a real <Link>, not a button with a router push: middle-click, cmd-click, open-in-new-tab
 * and "copy link address" all work for free, and it needs no client JS at all.
 */
export function SourceViewer({ name, lines }: { name: string; lines: number }) {
  return (
    // The label sits in its own span, and the accessible name is stated, because a narrow tile can
    // hide the words and keep the chip. A link whose visible text can be hidden must not depend on
    // that text for its name. (This named `.capcard` on /showcase, which was deleted with the
    // capability grid; the rule outlived the page, which is why it is stated here and not there.)
    <Link
      className="srcopen"
      href={`/editor?scene=${encodeURIComponent(name)}`}
      aria-label={`Open the JSON in the editor, ${lines} lines`}
    >
      <span className="srcbrace" aria-hidden="true">
        {"{ }"}
      </span>
      <span className="srclabel">Open the JSON in the editor</span>
      <span className="srcmeta">{lines} lines</span>
      <span className="arw" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
