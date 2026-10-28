// The verbs of bin/vawe-dev: tools for working on the framework, not for making a film.
export const DEV_VERBS = [
  {
    name: 'worktrees',
    summary: 'list the agent worktrees with their activity and unlanded work; with --prune, list the merged clean unlocked ones to remove (dry run; --yes removes them and deletes the branch with git branch -d)',
    positional: [],
    flags: [
      { name: 'prune', type: 'bool', help: 'plan the removal of merged worktrees and say why each other one stays' },
      { name: 'yes', type: 'bool', help: 'with --prune: do the removal' },
    ],
    example: 'vawe-dev worktrees --prune   |   vawe-dev worktrees --prune --yes',
    build: (v) => (v.prune
      ? { script: 'harness/dev/worktree-prune.mjs', args: v.yes ? ['--yes'] : [] }
      : { script: 'harness/dev/worktree-status.mjs', args: [] }),
  },
];
