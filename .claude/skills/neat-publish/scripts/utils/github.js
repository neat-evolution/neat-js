/**
 * GitHub CLI helper functions for release workflow scripts.
 * @module github
 */

import { $ } from 'execa'

/**
 * @typedef {import('./types.js').GHResult} GHResult
 * @typedef {import('./types.js').PRState} PRState
 * @typedef {import('./types.js').PRInfo} PRInfo
 */

/**
 * Run a gh command and return the result.
 * @param {string[]} args
 * @param {object} [options]
 * @returns {Promise<GHResult>}
 */
export async function gh(args, options = {}) {
  try {
    const result = await $({ reject: false, ...options })`gh ${args}`
    return {
      success: result.exitCode === 0,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: result.exitCode ?? 1,
    }
  } catch (err) {
    return {
      success: false,
      stdout: '',
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
    }
  }
}

/**
 * Find PR number for a branch.
 * @param {string} branch
 * @returns {Promise<number | null>}
 */
export async function findPRForBranch(branch) {
  const result = await gh([
    'pr',
    'list',
    '--head',
    branch,
    '--json',
    'number',
    '--jq',
    '.[0].number',
  ])
  if (result.success && result.stdout) {
    return parseInt(result.stdout, 10)
  }
  return null
}

/**
 * Get full PR info for a branch (including closed/merged PRs).
 * @param {string} branch
 * @returns {Promise<PRInfo | null>}
 */
export async function getPRForBranch(branch) {
  const result = await gh([
    'pr',
    'list',
    '--head',
    branch,
    '--state',
    'all',
    '--json',
    'number,state,title,url',
    '--jq',
    '.[0]',
  ])
  if (result.success && result.stdout) {
    try {
      const data = JSON.parse(result.stdout)
      return {
        number: data.number,
        state: /** @type {PRState} */ (data.state),
        title: data.title,
        url: data.url,
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Check PR CI status.
 * @param {number} prNumber
 * @returns {Promise<{status: 'pass' | 'fail' | 'pending', output: string}>}
 */
export async function checkPRStatus(prNumber) {
  const result = await gh(['pr', 'checks', String(prNumber)])
  const output = result.stdout || result.stderr

  if (result.exitCode === 0) {
    return { status: 'pass', output }
  }

  if (result.exitCode === 8) {
    return { status: 'pending', output }
  }

  if (output.includes('no checks reported')) {
    return {
      status: 'pending',
      output: 'Waiting for checks to be registered...',
    }
  }

  return { status: 'fail', output }
}

/**
 * Check PR state (OPEN, MERGED, CLOSED).
 * @param {number} prNumber
 * @returns {Promise<{state: PRState, headRefName: string} | null>}
 */
export async function checkPRState(prNumber) {
  const result = await gh([
    'pr',
    'view',
    String(prNumber),
    '--json',
    'state,headRefName',
  ])
  if (result.success && result.stdout) {
    try {
      const data = JSON.parse(result.stdout)
      return {
        state: /** @type {PRState} */ (data.state),
        headRefName: data.headRefName,
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Check if PR has conflicts.
 * @param {number} prNumber
 * @returns {Promise<{mergeable: string, mergeStateStatus: string} | null>}
 */
export async function checkPRMergeable(prNumber) {
  const result = await gh([
    'pr',
    'view',
    String(prNumber),
    '--json',
    'mergeable,mergeStateStatus',
  ])
  if (result.success && result.stdout) {
    try {
      const data = JSON.parse(result.stdout)
      return {
        mergeable: data.mergeable,
        mergeStateStatus: data.mergeStateStatus,
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Merge a PR with rebase.
 * @param {number} prNumber
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function mergePR(prNumber) {
  const result = await gh([
    'pr',
    'merge',
    String(prNumber),
    '--rebase',
    '--delete-branch',
  ])
  if (result.success) {
    return { success: true }
  }
  return { success: false, error: result.stderr || result.stdout }
}
