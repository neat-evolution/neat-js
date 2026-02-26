#!/usr/bin/env node

/**
 * Merge PR and monitor the release workflow.
 *
 * This script automates the full merge-to-release cycle for beachball:
 * 1. Checks CI status on the current PR
 * 2. Merges the PR with rebase (deletes branch)
 * 3. Watches the release workflow (beachball publish)
 * 4. Syncs local main and cleans up feature branch
 *
 * Beachball is simpler than changesets - there's no "Version Packages" PR.
 * The release workflow runs beachball publish directly on merge to main.
 *
 * The script is resumable - if it times out or is interrupted, re-running
 * will detect the current state and continue from where it left off.
 *
 * Usage: node merge-and-release.js [<pr-number>]
 */

import {
  deleteLocalBranch,
  deleteRemoteBranch,
  getCurrentBranch,
  pullMain,
  pushBranch,
  rebaseFromMain,
  switchToMain,
} from './utils/git.js'
import {
  checkPRMergeable,
  checkPRState,
  checkPRStatus,
  findPRForBranch,
  mergePR,
} from './utils/github.js'
import {
  getActiveReleaseRun,
  getLatestReleaseRun,
  waitForNewReleaseRun,
  watchWorkflowRun,
} from './utils/workflows.js'

const POLL_INTERVAL = 5000 // 5 seconds
const MAX_WAIT_TIME = 300000 // 5 minutes

/**
 * Wait for CI checks to pass
 * @param {number} prNumber
 * @returns {Promise<{success: boolean, output?: string, error?: string}>}
 */
async function waitForCI(prNumber) {
  console.log('\n Checking CI status...')
  const startTime = Date.now()
  let firstCheck = true

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const ciStatus = await checkPRStatus(prNumber)

    if (ciStatus.status === 'pass') {
      console.log('\n CI checks passed')
      return { success: true }
    }

    if (ciStatus.status === 'fail') {
      console.log('\n CI checks failed:')
      console.log(ciStatus.output)
      return { success: false, output: ciStatus.output }
    }

    // Status is pending
    if (firstCheck) {
      console.log(`Waiting: ${ciStatus.output}`)
      firstCheck = false
    }
    process.stdout.write('.')
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }

  console.log('\nTimeout waiting for CI checks')
  return { success: false, error: 'Timeout' }
}

/**
 * Cleanup after successful release: switch to main, pull, delete feature branch
 * @param {string | null} featureBranch
 */
async function cleanup(featureBranch) {
  console.log('\nCleaning up...')

  const currentBranch = await getCurrentBranch()

  // Switch to main if not already there
  if (currentBranch !== 'main') {
    console.log('\nSwitching to main branch...')
    const switchResult = await switchToMain()
    if (switchResult.success) {
      console.log('Switched to main')
    } else {
      console.log(`Could not switch to main: ${switchResult.error}`)
    }
  }

  // Pull latest main
  console.log('\nPulling latest main...')
  const pullResult = await pullMain()
  if (pullResult.success) {
    console.log('Main is up to date')
  } else {
    console.log(`Could not pull main: ${pullResult.error}`)
  }

  // Delete feature branch if provided and not main
  if (featureBranch && featureBranch !== 'main') {
    // Delete local branch
    console.log(`\nDeleting local branch: ${featureBranch}`)
    const localResult = await deleteLocalBranch(featureBranch)
    if (localResult.success) {
      console.log(`Deleted local branch: ${featureBranch}`)
    } else {
      console.log(`Could not delete local branch: ${localResult.error}`)
    }

    // Delete remote branch (may already be deleted by --delete-branch on merge)
    console.log(`\nDeleting remote branch: ${featureBranch}`)
    const remoteResult = await deleteRemoteBranch(featureBranch)
    if (remoteResult.success) {
      console.log(`Deleted remote branch: ${featureBranch}`)
    } else {
      console.log(`Could not delete remote branch: ${remoteResult.error}`)
    }
  }

  console.log('\nRelease complete!')
  console.log('Packages have been published to the registry')
  console.log('You are now on main branch, ready for new work')
}

/**
 * Handle rebasing and pushing when PR has conflicts
 * @returns {Promise<{success: boolean}>}
 */
async function handleConflicts() {
  console.log('\nRebasing from main...')

  const rebaseResult = await rebaseFromMain()
  if (!rebaseResult.success) {
    if (rebaseResult.needsManual) {
      console.log('\nManual conflict resolution required')
      console.log('   Please resolve conflicts, then run this script again.')
    } else {
      console.log(`Failed to rebase: ${rebaseResult.error}`)
    }
    return { success: false }
  }
  console.log('Rebased successfully')

  console.log('\nPushing rebased branch...')
  const pushResult = await pushBranch()
  if (!pushResult.success) {
    console.log(`Failed to push: ${pushResult.error}`)
    return { success: false }
  }
  console.log('Pushed successfully')

  console.log('\nBranch rebased and pushed')
  console.log('Waiting for CI to start on rebased branch...')
  await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10s for CI to register

  return { success: true }
}

/**
 * Watch release workflow after merge
 * @param {number | undefined} previousRunId
 * @param {string | null} featureBranch
 * @returns {Promise<void>}
 */
async function watchReleaseWorkflow(previousRunId, featureBranch) {
  // Wait for and watch release workflow
  console.log('\nWaiting for release workflow to start...')
  const releaseRunId = await waitForNewReleaseRun(previousRunId)
  if (!releaseRunId) {
    console.log('\nRelease workflow did not start')
    process.exit(1)
  }
  console.log(`\nRelease workflow started: ${releaseRunId}`)

  console.log(`\nWatching workflow run ${releaseRunId}...`)
  const releaseResult = await watchWorkflowRun(releaseRunId)
  if (!releaseResult.success) {
    console.log('\nRelease workflow failed')
    if (releaseResult.logs) {
      console.log('\nFailure logs:')
      console.log(releaseResult.logs)
    }
    process.exit(1)
  }
  console.log(`Workflow run ${releaseRunId} completed successfully`)

  // Cleanup
  await cleanup(featureBranch)
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  let prNumber = null
  let featureBranch = null

  // Parse positional PR number argument
  if (args[0] && !args[0].startsWith('-')) {
    prNumber = parseInt(args[0], 10)
    if (Number.isNaN(prNumber)) {
      prNumber = null
    }
  }

  const currentBranch = await getCurrentBranch()
  console.log(`Current branch: ${currentBranch}`)

  // If on main, we might be resuming after the original PR was merged
  if (currentBranch === 'main' && !prNumber) {
    console.log('\nOn main branch - checking for resume state...')

    // Check for active release workflow
    const activeRun = await getActiveReleaseRun()
    if (activeRun && activeRun.status === 'in_progress') {
      console.log(`\nFound in-progress release workflow: ${activeRun.runId}`)
      const result = await watchWorkflowRun(activeRun.runId)
      if (!result.success) {
        console.log('\nRelease workflow failed')
        process.exit(1)
      }
      await cleanup(null)
      process.exit(0)
    }

    // Nothing to resume
    console.log('No active workflows found')
    console.log('   Provide a PR number to start a new release')
    process.exit(0)
  }

  // Find PR for current branch if not specified
  if (!prNumber) {
    featureBranch = currentBranch
    prNumber = await findPRForBranch(currentBranch)
    if (!prNumber) {
      console.log(`No open PR found for branch: ${currentBranch}`)
      process.exit(1)
    }
  }

  console.log(`\nWorking with PR #${prNumber}`)

  // Check if PR is already merged (resuming)
  const prState = await checkPRState(prNumber)
  if (prState) {
    featureBranch = featureBranch || prState.headRefName

    if (prState.state === 'MERGED') {
      console.log(
        `\nPR #${prNumber} is already merged - checking for resume state...`
      )

      // Check for active release workflow
      const activeRun = await getActiveReleaseRun()
      if (activeRun && activeRun.status === 'in_progress') {
        console.log(`\nFound in-progress workflow: ${activeRun.runId}`)
        const result = await watchWorkflowRun(activeRun.runId)
        if (!result.success) {
          console.log('\nWorkflow failed')
          process.exit(1)
        }
      }

      await cleanup(featureBranch)
      process.exit(0)
    }
  }

  // Step 0: Check if PR has conflicts
  const mergeableStatus = await checkPRMergeable(prNumber)
  if (mergeableStatus) {
    if (mergeableStatus.mergeable === 'CONFLICTING') {
      console.log('\nPR has merge conflicts')
      const conflictResult = await handleConflicts()
      if (!conflictResult.success) {
        process.exit(1)
      }
    }
  }

  // Step 1: Wait for CI to pass
  const ciResult = await waitForCI(prNumber)
  if (!ciResult.success) {
    process.exit(1)
  }

  // Get current release run ID to detect new run later
  const previousRun = await getLatestReleaseRun()
  const previousRunId = previousRun?.id

  // Step 2: Merge the PR
  console.log(`\nMerging PR #${prNumber} with rebase...`)
  const mergeResult = await mergePR(prNumber)
  if (!mergeResult.success) {
    console.log(`Failed to merge PR #${prNumber}`)
    console.log(mergeResult.error)
    process.exit(1)
  }
  console.log(`PR #${prNumber} merged successfully`)

  // Step 3: Watch release workflow and cleanup
  await watchReleaseWorkflow(previousRunId, featureBranch)
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`)
  process.exit(1)
})
