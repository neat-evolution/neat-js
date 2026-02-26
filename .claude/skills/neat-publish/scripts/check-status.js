#!/usr/bin/env node

/**
 * Check the current branch's PR and release lifecycle status.
 *
 * Beachball publishes directly when merging to main (no Version Packages PR).
 * The lifecycle is simpler than changesets:
 *   PR merged -> release workflow runs -> packages published -> done
 *
 * Usage: node check-status.js [<branch>]
 */

import { getCurrentBranch } from './utils/git.js'
import { getPRForBranch } from './utils/github.js'
import { getLatestReleaseRun } from './utils/workflows.js'

/**
 * @typedef {import('./utils/types.js').StatusResult} StatusResult
 * @typedef {import('./utils/types.js').StatusSummary} StatusSummary
 * @typedef {import('./utils/types.js').PRInfo} PRInfo
 * @typedef {import('./utils/types.js').WorkflowInfo} WorkflowInfo
 */

/**
 * Determine the summary status based on PR and workflow states.
 * @param {PRInfo | null} pr
 * @param {WorkflowInfo | null} workflow
 * @returns {StatusSummary}
 */
function determineSummary(pr, workflow) {
  // No PR exists for this branch
  if (!pr) {
    return 'no_pr'
  }

  // PR is open - work on it or merge it
  if (pr.state === 'OPEN') {
    return 'pr_open'
  }

  // PR closed without merge - abandoned
  if (pr.state === 'CLOSED') {
    return 'pr_closed'
  }

  // PR is merged - check workflow status
  if (pr.state === 'MERGED') {
    if (workflow) {
      if (workflow.status === 'queued' || workflow.status === 'in_progress') {
        return 'release_in_progress'
      }
      if (
        workflow.status === 'completed' &&
        workflow.conclusion !== 'success'
      ) {
        return 'release_failed'
      }
      if (
        workflow.status === 'completed' &&
        workflow.conclusion === 'success'
      ) {
        return 'complete'
      }
    }

    // PR merged but workflow status unknown
    return 'release_in_progress'
  }

  return 'no_pr'
}

/**
 * Get the complete status for a branch.
 * @param {string} branch
 * @returns {Promise<StatusResult>}
 */
async function getStatus(branch) {
  // Get PR for this branch (including closed/merged)
  const pr = await getPRForBranch(branch)

  // Get latest release workflow run if PR is merged
  const prMerged = pr?.state === 'MERGED'
  const workflow = prMerged ? await getLatestReleaseRun() : null

  // Determine summary
  const summary = determineSummary(pr, workflow)

  return {
    branch,
    pr,
    workflow,
    summary,
  }
}

async function main() {
  const args = process.argv.slice(2)
  let branch = args[0]

  // If no branch specified, use current branch
  if (!branch) {
    branch = await getCurrentBranch()
  }

  const status = await getStatus(branch)

  // Output as JSON
  console.log(JSON.stringify(status, null, 2))
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }, null, 2))
  process.exit(1)
})
