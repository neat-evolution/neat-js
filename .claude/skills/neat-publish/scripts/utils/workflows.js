/**
 * GitHub Actions workflow helper functions.
 * @module workflows
 */

import { gh } from './github.js'

/**
 * @typedef {import('./types.js').WorkflowInfo} WorkflowInfo
 * @typedef {import('./types.js').WorkflowStatus} WorkflowStatus
 * @typedef {import('./types.js').WorkflowConclusion} WorkflowConclusion
 */

const POLL_INTERVAL = 5000 // 5 seconds
const MAX_WAIT_TIME = 300000 // 5 minutes

/**
 * Get the latest workflow run for a workflow on a branch.
 * @param {string} workflow - Workflow filename (e.g., 'release.yml')
 * @param {string} branch - Branch name
 * @returns {Promise<WorkflowInfo | null>}
 */
export async function getLatestWorkflowRun(workflow, branch) {
  const result = await gh([
    'run',
    'list',
    `--workflow=${workflow}`,
    `--branch=${branch}`,
    '--limit=1',
    '--json',
    'databaseId,status,conclusion',
  ])
  if (result.success && result.stdout) {
    try {
      const runs = JSON.parse(result.stdout)
      const run = runs[0]
      if (run) {
        return {
          id: run.databaseId,
          status: /** @type {WorkflowStatus} */ (run.status),
          conclusion: /** @type {WorkflowConclusion} */ (run.conclusion),
        }
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Get the latest release workflow run on main.
 * @returns {Promise<WorkflowInfo | null>}
 */
export async function getLatestReleaseRun() {
  return getLatestWorkflowRun('release.yml', 'main')
}

/**
 * Get an active (in-progress or recently completed) release workflow run.
 * @returns {Promise<{runId: number, status: string, conclusion?: WorkflowConclusion} | null>}
 */
export async function getActiveReleaseRun() {
  const result = await gh([
    'run',
    'list',
    '--workflow=release.yml',
    '--branch=main',
    '--limit=1',
    '--json',
    'databaseId,status,conclusion,createdAt',
  ])
  if (result.success && result.stdout) {
    try {
      const runs = JSON.parse(result.stdout)
      const run = runs[0]
      if (run && run.status !== 'completed') {
        return { runId: run.databaseId, status: 'in_progress' }
      }
      // Check if completed recently (within last 5 minutes)
      if (run) {
        const createdAt = new Date(run.createdAt)
        const now = new Date()
        const ageMs = now.getTime() - createdAt.getTime()
        if (ageMs < MAX_WAIT_TIME) {
          return {
            runId: run.databaseId,
            status: 'completed',
            conclusion: run.conclusion,
          }
        }
      }
      return null
    } catch {
      return null
    }
  }
  return null
}

/**
 * Watch a workflow run until completion.
 * @param {number} runId
 * @returns {Promise<{success: boolean, conclusion?: string, logs?: string, error?: string}>}
 */
export async function watchWorkflowRun(runId) {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const result = await gh([
      'run',
      'view',
      String(runId),
      '--json',
      'status,conclusion',
    ])

    if (result.success && result.stdout) {
      try {
        const run = JSON.parse(result.stdout)
        if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            return { success: true }
          }
          // Get failure details
          const logResult = await gh([
            'run',
            'view',
            String(runId),
            '--log-failed',
          ])
          return {
            success: false,
            conclusion: run.conclusion,
            logs: logResult.stdout || logResult.stderr,
          }
        }
        process.stdout.write('.')
      } catch {
        // Continue polling
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }

  return { success: false, error: 'Timeout' }
}

/**
 * Wait for a new release workflow run to start after merge.
 * @param {number | undefined} previousRunId
 * @returns {Promise<number | null>}
 */
export async function waitForNewReleaseRun(previousRunId) {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const run = await getLatestReleaseRun()
    if (run && run.id !== previousRunId) {
      return run.id
    }
    process.stdout.write('.')
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }

  return null
}
