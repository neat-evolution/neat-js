# Verify Script

The `verify.js` helper runs workspace tasks in parallel and returns a JSON report.

It is designed for fast local validation while iterating on changes, especially when you only want to check the workspaces affected by your current edits.

## Default Behavior

By default, the script:

- finds workspaces with uncommitted changes
- runs `check`, then `format`, then `build`, then `test` for each target workspace
- executes package checks in parallel
- prints JSON only

Command:

```bash
node .claude/skills/neat-publish/scripts/verify.js
```

The default per-package verification commands are run in order:

```bash
yarn turbo run check --filter=<workspace-name>
yarn turbo run format --filter=<workspace-name>
yarn turbo run build --filter=<workspace-name>
yarn turbo run test --filter=<workspace-name>
```

## Common Usage

Check all workspaces:

```bash
node .claude/skills/neat-publish/scripts/verify.js --all
```

Check explicit workspaces:

```bash
node .claude/skills/neat-publish/scripts/verify.js --packages @neat-evolution/core,@neat-evolution/neat
```

Run multiple tasks:

```bash
node .claude/skills/neat-publish/scripts/verify.js --check --build
```

Once you pass any task selector (`--check`, `--format`, `--build`, `--test`, or `--task`), the default four-stage pipeline is replaced by the explicitly selected stages.

Check changes since a git ref:

```bash
node .claude/skills/neat-publish/scripts/verify.js --since origin/main
```

Write command output to a log file:

```bash
node .claude/skills/neat-publish/scripts/verify.js --output-log /tmp/neat-verify.log
```

## Flags

- `--all`: target all non-root workspaces
- `--packages <a,b>`: target only the listed workspace names
- `--include <a,b>`: add workspaces to the computed target set
- `--exclude <a,b>`: remove workspaces from the computed target set
- `--check`: run the `check` task
- `--format`: run the `format` task
- `--build`: run the `build` task
- `--test`: run the `test` task
- `--task <name>`: run a workspace task; repeatable, and any explicit task selection replaces the default `check`, `format`, `build`, `test` pipeline
- `--concurrency <n>`: limit how many workspaces are processed at once
- `--since <ref>`: include files changed since a git ref
- `--committed-only`: with `--since`, ignore uncommitted changes
- `--include-root`: allow the root workspace when explicitly selected
- `--fail-fast`: stop scheduling new workspaces after the first failure
- `--output-log <path>`: write combined command output to a log file
- `--help`: print usage

## Report Shape

The script returns a JSON object with:

- `packages`: per-workspace results
- `failures`: compact list of failed tasks
- `summary`: passed/failed/skipped counts

Each failed task includes the exact `command` to rerun manually.
If `--output-log` is set, the report also includes the log file path.

Example:

```json
{
  "failures": [
    {
      "package": "@neat-evolution/des-hyperneat",
      "task": "check",
      "command": "yarn turbo run check --filter=@neat-evolution/des-hyperneat",
      "exitCode": 2
    }
  ]
}
```

## Notes

- This is intentionally package-oriented. It runs separate `turbo` calls per target workspace rather than one large monorepo check.
- That keeps failures isolated and gives a direct repro command for each problem.
- Shared dependency builds may still be repeated across concurrent runs. This is a tradeoff for clearer per-package reporting.
