---
name: neat-publish
description: Guide for the monorepo release workflow using beachball, conventional commits, and GitHub Actions. Use when making commits, creating PRs, adding change files, or releasing packages. Triggers on requests like "commit these changes", "create a PR", "add change files", "merge the PR", or questions about versioning and releases.
---

# Neat Publish Workflow

Releases happen in phases. Each phase is a discrete step--pause and wait for user direction before proceeding to the next phase.

## Phase 1: Check Status and Prepare

First, check the current branch and PR status:

```bash
node .claude/skills/neat-publish/scripts/check-status.js
```

Based on the summary:

- `no_pr` on main: Create a feature branch first
- `no_pr` on feature branch: Ready to work, will need to create PR later
- `pr_open`: Continue working on existing PR
- `pr_closed`: Branch was abandoned - create new branch from main
- `release_in_progress`: Release in progress - do not push commits
- `complete`: Release finished - switch to main, delete branch, start fresh
- `*_failed`: Investigate the failure before proceeding

If on main and need to start new work, create a feature branch:

```bash
git checkout -b feature/my-feature
```

**Before committing**, always run format and checks:

```bash
yarn format  # Format all files
yarn check   # Build, test, lint, beachball check, manypkg check
```

Fix any errors before committing.

For faster iteration while work is still in progress, use the targeted verifier:

```bash
node .claude/skills/neat-publish/scripts/verify.js
node .claude/skills/neat-publish/scripts/verify.js --check
```

That checks changed workspaces in parallel and returns JSON with exact repro commands for failures.

## Phase 2: Create PR

When ready, push and create PR:

```bash
git push -u origin HEAD
gh pr create --title "..." --body "..."
```

Create a descriptive title and body summarizing the changes. After PR creation, pause--there may be additional commits, review feedback, or CI failures to address.

## Phase 3: Add Change Files

As a final step before merging, generate change files from conventional commits:

```bash
node .claude/skills/neat-publish/scripts/generate-change-files.js
```

The script automatically parses commits since branching from main and creates appropriate beachball change files. Review the generated files, then they are auto-committed and pushed.

Use `--dry-run` to preview without creating files:

```bash
node .claude/skills/neat-publish/scripts/generate-change-files.js --dry-run
```

## Phase 4: Merge and Release

Use the merge-and-release script to automate the entire merge-to-publish cycle:

```bash
node .claude/skills/neat-publish/scripts/merge-and-release.js
```

The script automatically:

1. Checks CI status on the PR
2. Merges the PR with rebase (deletes remote branch)
3. Watches the release workflow (beachball publish)
4. Syncs local main and cleans up feature branch
5. Reports success or errors

For manual control, use individual commands:

```bash
gh pr checks
gh pr merge --rebase --delete-branch
gh run watch <run-id>
```

## Commit Messages

Use conventional commits: `<type>(<scope>): <description>`

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
**Scope:** Package name without `@neat-evolution/` prefix

```
feat(my-utils): add string helpers
fix(core): handle null input
chore: update dependencies
```

## CI Failures

When GitHub Actions fail, investigate the root cause rather than re-running the job. Re-running workflows is almost never helpful--CI failures are rarely intermittent. Instead:

1. Read the error logs to understand what failed
2. Fix the underlying issue in code
3. Push a new commit to trigger a fresh run

## Quick Reference

| Task                | Command                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| Check status        | `node .claude/skills/neat-publish/scripts/check-status.js`             |
| Verify changes      | `node .claude/skills/neat-publish/scripts/verify.js`                   |
| Create PR           | `gh pr create --title "..." --body "..."`                              |
| Generate changes    | `node .claude/skills/neat-publish/scripts/generate-change-files.js`    |
| Merge and release   | `node .claude/skills/neat-publish/scripts/merge-and-release.js`        |
| Check CI            | `gh pr checks`                                                         |
| Merge PR            | `gh pr merge --rebase --delete-branch`                                 |
| Watch workflow      | `gh run watch <run-id>`                                                |
| Manual change file  | `yarn beachball change --no-commit --package <pkg> --type <t> --message "<m>"` |

See [references/beachball.md](references/beachball.md) for beachball details.
See [references/verify.md](references/verify.md) for verifier options and output details.
