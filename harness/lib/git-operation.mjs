import fs from 'node:fs';
import path from 'node:path';

/** One line naming the rebase or merge in progress in `gitDir` and how to end it, or '' when none runs. */
export function operationInProgress(gitDir) {
  const has = (name) => fs.existsSync(path.join(gitDir, name));
  const verb = has('rebase-merge') || has('rebase-apply') ? 'rebase' : has('MERGE_HEAD') ? 'merge' : '';
  return verb ? `pre-push blocked: a ${verb} is in progress, so HEAD is not the finished branch. Run \`git ${verb} --continue\` or \`git ${verb} --abort\`, then push.` : '';
}
