#!/usr/bin/env node

/**
 * Verify workspace tasks in parallel and return a JSON report.
 *
 * Defaults to running `check`, `format`, `build`, and `test`
 * for workspaces with uncommitted changes.
 *
 * Usage:
 *   node scripts/verify.js
 *   node scripts/verify.js --all
 *   node scripts/verify.js --packages @neat-evolution/core,@neat-evolution/neat
 *   node scripts/verify.js --check --build --concurrency 2
 *   node scripts/verify.js --since origin/main
 */

import { appendFile, writeFile } from 'node:fs/promises'
import os from 'node:os'

import { execa } from 'execa'

const DEFAULT_TASKS = ['check', 'format', 'build', 'test']

/**
 * @typedef {{name: string, location: string}} Workspace
 * @typedef {'passed' | 'failed' | 'skipped'} TaskStatus
 * @typedef {{task: string, command: string, status: TaskStatus, durationMs: number, exitCode: number}} TaskResult
 * @typedef {{name: string, location: string, status: TaskStatus, tasks: TaskResult[]}} PackageResult
 */

function printHelp() {
  console.log(`Usage: node scripts/verify.js [options]

Options:
  --all                     Check all non-root workspaces
  --packages <a,b>          Check only these workspace names
  --include <a,b>           Add workspace names to the computed set
  --exclude <a,b>           Remove workspace names from the computed set
  --check                   Run the check task
  --format                  Run the format task
  --build                   Run the build task
  --test                    Run the test task
  --task <name>             Task to run (repeatable; any task selector replaces the default pipeline)
  --concurrency <n>         Max packages to process in parallel
  --since <ref>             Include files changed since git ref (in addition to uncommitted changes)
  --committed-only          With --since, ignore uncommitted changes
  --include-root            Allow the root workspace in explicit selection
  --fail-fast               Stop scheduling new packages after the first failure
  --output-log <path>       Write combined command output to the given log file
  --help                    Show this help
`)
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {string[] | null} */
  let packages = null
  /** @type {string[]} */
  const include = []
  /** @type {string[]} */
  const exclude = []
  /** @type {string[]} */
  const tasks = []
  let hasTaskSelection = false

  let all = false
  let includeRoot = false
  let failFast = false
  let committedOnly = false
  /** @type {string | null} */
  let outputLog = null
  /** @type {string | null} */
  let since = null
  /** @type {number | null} */
  let concurrency = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--help') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--all') {
      all = true
      continue
    }

    if (arg === '--include-root') {
      includeRoot = true
      continue
    }

    if (arg === '--fail-fast') {
      failFast = true
      continue
    }

    if (arg === '--committed-only') {
      committedOnly = true
      continue
    }

    if (
      arg === '--check' ||
      arg === '--format' ||
      arg === '--build' ||
      arg === '--test'
    ) {
      tasks.push(arg.slice(2))
      hasTaskSelection = true
      continue
    }

    if (
      arg === '--packages' ||
      arg === '--include' ||
      arg === '--exclude' ||
      arg === '--task' ||
      arg === '--concurrency' ||
      arg === '--since' ||
      arg === '--output-log'
    ) {
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`)
      }
      i++

      if (arg === '--packages') {
        packages = splitList(value)
      } else if (arg === '--include') {
        include.push(...splitList(value))
      } else if (arg === '--exclude') {
        exclude.push(...splitList(value))
      } else if (arg === '--task') {
        tasks.push(...splitList(value))
        hasTaskSelection = true
      } else if (arg === '--concurrency') {
        concurrency = Number.parseInt(value, 10)
        if (!Number.isFinite(concurrency) || concurrency < 1) {
          throw new Error('Concurrency must be a positive integer')
        }
      } else if (arg === '--since') {
        since = value
      } else if (arg === '--output-log') {
        outputLog = value
      }
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return {
    all,
    packages,
    include,
    exclude,
    tasks: hasTaskSelection ? dedupe(tasks) : DEFAULT_TASKS,
    concurrency: concurrency ?? Math.max(1, Math.min(os.cpus().length, 4)),
    since,
    committedOnly,
    outputLog,
    includeRoot,
    failFast,
  }
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * @param {string[]} values
 * @returns {string[]}
 */
function dedupe(values) {
  return [...new Set(values)]
}

/**
 * @returns {Promise<Workspace[]>}
 */
async function getWorkspaces() {
  const { stdout } = await execa('yarn', ['workspaces', 'list', '--json'])
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line) => JSON.parse(line))
}

/**
 * @param {string} ref
 * @returns {Promise<string[]>}
 */
async function getCommittedChangedFiles(ref) {
  const { stdout } = await execa(
    'git',
    ['diff', '--name-only', `${ref}...HEAD`],
    {
      reject: false,
    }
  )
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * @returns {Promise<string[]>}
 */
async function getUncommittedFiles() {
  /** @type {Array<[string, string[]]>} */
  const commands = [
    ['git', ['diff', '--name-only']],
    ['git', ['diff', '--name-only', '--cached']],
    ['git', ['ls-files', '--others', '--exclude-standard']],
  ]

  const outputs = await Promise.all(
    commands.map(([cmd, args]) => execa(cmd, args, { reject: false }))
  )

  return dedupe(
    outputs.flatMap((result) =>
      result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
  )
}

/**
 * @param {Workspace[]} workspaces
 * @param {string[]} files
 * @param {boolean} includeRoot
 * @returns {Workspace[]}
 */
function mapFilesToWorkspaces(workspaces, files, includeRoot) {
  const root =
    workspaces.find((workspace) => workspace.location === '.') ?? null
  const candidates = workspaces
    .filter((workspace) => workspace.location !== '.')
    .sort((a, b) => b.location.length - a.location.length)

  /** @type {Workspace[]} */
  const matched = []

  for (const file of files) {
    const workspace = candidates.find(
      (candidate) =>
        file === candidate.location || file.startsWith(`${candidate.location}/`)
    )

    if (workspace) {
      matched.push(workspace)
      continue
    }

    if (includeRoot && root) {
      matched.push(root)
    }
  }

  return dedupeByName(matched)
}

/**
 * @param {Workspace[]} workspaces
 * @returns {Workspace[]}
 */
function dedupeByName(workspaces) {
  const seen = new Set()
  /** @type {Workspace[]} */
  const result = []

  for (const workspace of workspaces) {
    if (seen.has(workspace.name)) {
      continue
    }
    seen.add(workspace.name)
    result.push(workspace)
  }

  return result
}

/**
 * @param {Workspace[]} workspaces
 * @param {string[]} names
 * @param {boolean} includeRoot
 * @returns {Workspace[]}
 */
function selectNamedWorkspaces(workspaces, names, includeRoot) {
  const allowed = includeRoot
    ? workspaces
    : workspaces.filter((workspace) => workspace.location !== '.')
  const byName = new Map(
    allowed.map((workspace) => [workspace.name, workspace])
  )

  /** @type {Workspace[]} */
  const selected = []

  for (const name of names) {
    const workspace = byName.get(name)
    if (!workspace) {
      throw new Error(`Unknown workspace: ${name}`)
    }
    selected.push(workspace)
  }

  return dedupeByName(selected)
}

/**
 * @param {Workspace} workspace
 * @param {string} task
 * @returns {string}
 */
function buildCommand(workspace, task) {
  if (workspace.location === '.') {
    return `yarn ${task}`
  }
  return `yarn turbo run ${task} --filter=${workspace.name}`
}

/**
 * @param {Workspace} workspace
 * @param {string} task
 * @param {string | null} outputLog
 * @returns {Promise<TaskResult>}
 */
async function runTask(workspace, task, outputLog) {
  const command = buildCommand(workspace, task)
  const start = Date.now()
  let result

  if (workspace.location === '.') {
    result = await execa('yarn', [task], { reject: false })
  } else {
    result = await execa(
      'yarn',
      ['turbo', 'run', task, `--filter=${workspace.name}`],
      { reject: false }
    )
  }
  const durationMs = Date.now() - start

  /** @type {TaskResult} */
  const taskResult = {
    task,
    command,
    status: result.exitCode === 0 ? 'passed' : 'failed',
    durationMs,
    exitCode: result.exitCode ?? 1,
  }

  if (outputLog) {
    const header = [
      `=== ${workspace.name} :: ${task} ===`,
      `command: ${command}`,
      `exitCode: ${taskResult.exitCode}`,
      '',
    ].join('\n')
    const body = [result.stdout ?? '', result.stderr ?? '']
      .filter(Boolean)
      .join('\n')
    await appendFile(outputLog, `${header}${body}\n\n`)
  }

  return taskResult
}

/**
 * @param {Workspace} workspace
 * @param {string[]} tasks
 * @param {string | null} outputLog
 * @returns {Promise<PackageResult>}
 */
async function runWorkspaceTasks(workspace, tasks, outputLog) {
  /** @type {TaskResult[]} */
  const taskResults = []

  for (const task of tasks) {
    const taskResult = await runTask(workspace, task, outputLog)
    taskResults.push(taskResult)
    if (taskResult.status === 'failed') {
      break
    }
  }

  const status = taskResults.some((task) => task.status === 'failed')
    ? 'failed'
    : taskResults.length === 0
      ? 'skipped'
      : 'passed'

  return {
    name: workspace.name,
    location: workspace.location,
    status,
    tasks: taskResults,
  }
}

/**
 * @param {number} concurrency
 * @param {Workspace[]} items
 * @param {(item: Workspace) => Promise<PackageResult>} worker
 * @param {boolean} failFast
 * @returns {Promise<PackageResult[]>}
 */
async function runWithConcurrency(concurrency, items, worker, failFast) {
  /** @type {Array<PackageResult | undefined>} */
  const results = new Array(items.length)
  let index = 0
  let stop = false

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        if (stop) {
          return
        }

        const current = index
        index += 1

        if (current >= items.length) {
          return
        }

        const result = await worker(items[current])
        results[current] = result

        if (failFast && result?.status === 'failed') {
          stop = true
        }
      }
    }
  )

  await Promise.all(workers)
  return /** @type {PackageResult[]} */ (results.filter(Boolean))
}

/**
 * @param {ReturnType<typeof parseArgs>} options
 * @returns {Promise<Workspace[]>}
 */
async function resolveTargets(options) {
  const workspaces = await getWorkspaces()
  const nonRoot = workspaces.filter((workspace) => workspace.location !== '.')

  if (options.packages) {
    let selected = selectNamedWorkspaces(
      workspaces,
      options.packages,
      options.includeRoot
    )
    if (options.include.length > 0) {
      selected = dedupeByName([
        ...selected,
        ...selectNamedWorkspaces(
          workspaces,
          options.include,
          options.includeRoot
        ),
      ])
    }
    if (options.exclude.length > 0) {
      const excluded = new Set(options.exclude)
      selected = selected.filter((workspace) => !excluded.has(workspace.name))
    }
    return selected
  }

  if (options.all) {
    let selected = [...nonRoot]
    if (options.include.length > 0) {
      selected = dedupeByName([
        ...selected,
        ...selectNamedWorkspaces(
          workspaces,
          options.include,
          options.includeRoot
        ),
      ])
    }
    if (options.exclude.length > 0) {
      const excluded = new Set(options.exclude)
      selected = selected.filter((workspace) => !excluded.has(workspace.name))
    }
    return selected
  }

  /** @type {string[]} */
  let files = []

  if (options.since) {
    files = files.concat(await getCommittedChangedFiles(options.since))
  }

  if (!options.committedOnly) {
    files = files.concat(await getUncommittedFiles())
  }

  let selected = mapFilesToWorkspaces(
    workspaces,
    dedupe(files),
    options.includeRoot
  )

  if (options.include.length > 0) {
    selected = dedupeByName([
      ...selected,
      ...selectNamedWorkspaces(
        workspaces,
        options.include,
        options.includeRoot
      ),
    ])
  }

  if (options.exclude.length > 0) {
    const excluded = new Set(options.exclude)
    selected = selected.filter((workspace) => !excluded.has(workspace.name))
  }

  return selected
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()

  if (options.outputLog) {
    await writeFile(options.outputLog, '')
  }

  const targets = await resolveTargets(options)

  if (targets.length === 0) {
    console.log(
      JSON.stringify(
        {
          startedAt,
          mode: options.packages
            ? 'packages'
            : options.all
              ? 'all'
              : options.since
                ? 'changed+since'
                : 'changed',
          tasks: options.tasks,
          concurrency: options.concurrency,
          outputLog: options.outputLog,
          packageCount: 0,
          packages: [],
          failures: [],
          summary: {
            passed: 0,
            failed: 0,
            skipped: 0,
            durationMs: Date.now() - startedMs,
          },
        },
        null,
        2
      )
    )
    return
  }

  /** @type {PackageResult[]} */
  const results = await runWithConcurrency(
    options.concurrency,
    targets,
    (workspace) =>
      runWorkspaceTasks(workspace, options.tasks, options.outputLog),
    options.failFast
  )

  const failures = results.flatMap((pkg) =>
    pkg.tasks
      .filter((task) => task.status === 'failed')
      .map((task) => ({
        package: pkg.name,
        task: task.task,
        command: task.command,
        exitCode: task.exitCode,
      }))
  )

  const report = {
    startedAt,
    mode: options.packages
      ? 'packages'
      : options.all
        ? 'all'
        : options.since
          ? 'changed+since'
          : 'changed',
    tasks: options.tasks,
    concurrency: options.concurrency,
    outputLog: options.outputLog,
    packageCount: results.length,
    packages: results,
    failures,
    summary: {
      passed: results.filter((pkg) => pkg.status === 'passed').length,
      failed: results.filter((pkg) => pkg.status === 'failed').length,
      skipped: results.filter((pkg) => pkg.status === 'skipped').length,
      durationMs: Date.now() - startedMs,
    },
  }

  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(
    JSON.stringify(
      {
        error: message,
      },
      null,
      2
    )
  )
  process.exit(1)
})
