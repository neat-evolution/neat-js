/**
 * Git helper functions for release workflow scripts.
 * @module git
 */

import { $ } from 'execa'

/**
 * Get the error message from an unknown error.
 * @param {unknown} err
 * @returns {string}
 */
function getErrorMessage(err) {
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

/**
 * Get the current branch name.
 * @returns {Promise<string>}
 */
export async function getCurrentBranch() {
  const { stdout } = await $`git branch --show-current`
  return stdout.trim()
}

/**
 * Switch to main branch.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function switchToMain() {
  try {
    await $`git checkout main`
    return { success: true }
  } catch (err) {
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Pull latest main with rebase.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function pullMain() {
  try {
    await $`git pull --rebase origin main`
    return { success: true }
  } catch (err) {
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Delete a local branch.
 * @param {string} branchName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLocalBranch(branchName) {
  try {
    await $`git branch -D ${branchName}`
    return { success: true }
  } catch (err) {
    return { success: false, error: getErrorMessage(err) }
  }
}

/**
 * Delete a remote branch.
 * @param {string} branchName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteRemoteBranch(branchName) {
  try {
    await $`git push origin --delete ${branchName}`
    return { success: true }
  } catch (err) {
    const message = getErrorMessage(err)
    // Branch might already be deleted
    if (message.includes('remote ref does not exist')) {
      return { success: true }
    }
    return { success: false, error: message }
  }
}

/**
 * Rebase current branch from main.
 * @returns {Promise<{success: boolean, error?: string, needsManual?: boolean}>}
 */
export async function rebaseFromMain() {
  try {
    await $`git fetch origin main`
  } catch (err) {
    return { success: false, error: getErrorMessage(err) }
  }

  try {
    await $`git rebase origin/main`
    return { success: true }
  } catch (_err) {
    try {
      await $`git rebase --abort`
    } catch {
      // Already aborted
    }
    return { success: false, error: 'Rebase conflicts', needsManual: true }
  }
}

/**
 * Push current branch with force-with-lease.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function pushBranch() {
  try {
    await $`git push --force-with-lease`
    return { success: true }
  } catch (err) {
    return { success: false, error: getErrorMessage(err) }
  }
}
