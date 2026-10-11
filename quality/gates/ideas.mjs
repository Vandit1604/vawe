// quality/gates/ideas.mjs: does the brief's Ideas ledger show creative thinking? Advice, never a failing exit.
//
//   node quality/gates/ideas.mjs <page.html>    ·   vawe check ideas <page.html>
//
// Reads the "Ideas" table (harness/lib/ideas.mjs, method: guides/IDEATE.md): a beat with no row, every pick literal, one device on
// more than half the rows, a pick that is the most typical idea with no reason, fewer than four ideas or a repeated device, four
// ideas that are one idea reworded. It reads the plan, not the film: the judge and the critic ask whether the frames show the pick.
// Waive with a reason in the page's authoring block under the code each line names (ideas-missing, ideas-literal, ideas-variety,
// ideas-typical, ideas-thin, ideas-reworded).
import { gateFindings } from '../../harness/lib/findings.mjs';
import { readBrief } from '../../harness/lib/brief-tables.mjs';
import { ideasFilled, ideaFindings } from '../../harness/lib/ideas.mjs';
import { pageAuthoring } from '../../harness/lib/motion-stamp.mjs';
import { isWaived } from '../../harness/lib/waivers.mjs';

const [page] = process.argv.slice(2).filter((a) => a !== '--json');
if (!page) { console.error('usage: ideas.mjs <page.html>'); process.exit(2); }

const out = gateFindings();
const brief = readBrief(page);
const authoring = pageAuthoring(page);
if (ideasFilled(brief ?? '') === null) out.note('ideas', 'the brief has no "Ideas" section; nothing to check');
else {
  for (const f of ideaFindings(brief, authoring._worlds ?? null)) {
    if (isWaived(authoring, f.code, f.at)) out.note(f.code, `waived in the page authoring block: ${f.text}`);
    else out.warn(f.code, f.text);
  }
}
out.emit();
