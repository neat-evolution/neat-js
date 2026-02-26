#!/usr/bin/env node

/**
 * Generate beachball change files from conventional commits on the current branch.
 *
 * Parses commits since branching from main, extracts conventional commit info,
 * and creates beachball change files with appropriate version bumps.
 *
 * Validates scopes against actual workspace packages to prevent invalid change files.
 *
 * Usage: node generate-change-files.js [--dry-run]
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { CommitParser } from 'conventional-commits-parser'
import { $ } from 'execa'

const BASE_BRANCH = 'main'
const SCOPE_PREFIX = '@neat-evolution/'

/**
 * @typedef {'patch' | 'minor' | 'major'} BumpType
 */

/**
 * Conventional commit type to bump mapping.
 * @type {Record<string, BumpType | null>}
 */
const BUMP_MAP = {
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  refactor: 'patch',
  // These typically don't need change files
  docs: null,
  style: null,
  test: null,
  build: null,
  ci: null,
  chore: null,
}

/**
 * @type {Record<BumpType, number>}
 */
const BUMP_ORDER = { patch: 1, minor: 2, major: 3 }

const parser = new CommitParser({
  headerPattern: /^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/,
  headerCorrespondence: ['type', 'scope', 'breaking', 'subject'],
})

async function getRepoRoot() {
  const { stdout } = await $`git rev-parse --show-toplevel`
  return stdout.trim()
}

/**
 * Get all valid workspace scopes by reading package.json files from workspace directories.
 * @param {string} repoRoot
 * @returns {Set<string>}
 */
function getWorkspaceScopes(repoRoot) {
  const rootPkg = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')
  )
  const workspaceGlobs = rootPkg.workspaces || []
  const scopes = new Set()

  for (const glob of workspaceGlobs) {
    // Handle simple globs like "packages/*" or ".claude/skills/*"
    const baseDir = glob.replace(/\/\*$/, '')
    const fullPath = path.join(repoRoot, baseDir)

    if (!existsSync(fullPath) || !statSync(fullPath).isDirectory()) {
      continue
    }

    for (const entry of readdirSync(fullPath)) {
      const pkgJsonPath = path.join(fullPath, entry, 'package.json')
      if (!existsSync(pkgJsonPath)) continue

      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
        if (pkg.name) {
          // Extract scope from package name (e.g., "@neat-evolution/foo" -> "foo")
          const scope = pkg.name.startsWith(SCOPE_PREFIX)
            ? pkg.name.slice(SCOPE_PREFIX.length)
            : pkg.name
          scopes.add(scope)
        }
      } catch {
        // Skip invalid package.json files
      }
    }
  }

  return scopes
}

async function getCurrentBranch() {
  const { stdout } = await $`git branch --show-current`
  return stdout.trim()
}

async function getMergeBase() {
  try {
    const { stdout } = await $`git merge-base HEAD origin/${BASE_BRANCH}`
    return stdout.trim()
  } catch {
    // If origin/main doesn't exist, try local main
    const { stdout } = await $`git merge-base HEAD ${BASE_BRANCH}`
    return stdout.trim()
  }
}

/**
 * Get commits since the merge base.
 * @param {string} mergeBase
 * @returns {Promise<string[]>}
 */
async function getCommitsSince(mergeBase) {
  const { stdout } = await $`git log ${mergeBase}..HEAD --format=${'%s'}`
  if (!stdout.trim()) return []
  return stdout.trim().split('\n')
}

/**
 * Parse a conventional commit message.
 * @param {string} message
 * @returns {{ type: string, scope: string | null, breaking: boolean, subject: string } | null}
 */
function parseCommit(message) {
  const parsed = parser.parse(message)
  if (!parsed.type || !parsed.subject) return null
  return {
    type: parsed.type,
    scope: parsed.scope ?? null,
    breaking: parsed.breaking === '!',
    subject: parsed.subject,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const branch = await getCurrentBranch()
  if (branch === BASE_BRANCH) {
    console.error(`Error: Cannot run on ${BASE_BRANCH} branch`)
    process.exit(1)
  }

  const repoRoot = await getRepoRoot()

  // Get valid scopes from workspace packages
  const validScopes = getWorkspaceScopes(repoRoot)

  const mergeBase = await getMergeBase()
  const commits = await getCommitsSince(mergeBase)

  if (commits.length === 0) {
    console.log('No commits found since branching from main')
    process.exit(0)
  }

  console.log(`Found ${commits.length} commit(s) since ${BASE_BRANCH}\n`)

  // Group changes by package
  /** @type {Map<string, { bump: BumpType, descriptions: string[] }>} */
  const packageChanges = new Map()

  for (const message of commits) {
    const parsed = parseCommit(message)
    if (!parsed) {
      console.log(`  Skipping (not conventional): ${message}`)
      continue
    }

    const { type, scope, breaking, subject } = parsed

    // Determine bump type
    /** @type {BumpType | null} */
    const bump = breaking ? 'major' : BUMP_MAP[type]
    if (!bump) {
      console.log(`  Skipping (no release needed): ${message}`)
      continue
    }

    if (!scope) {
      console.log(`  Skipping (no scope): ${message}`)
      continue
    }

    // Validate scope against workspace packages
    if (!validScopes.has(scope)) {
      console.log(`  Skipping (invalid scope "${scope}"): ${message}`)
      console.log(`      Valid scopes: ${[...validScopes].sort().join(', ')}`)
      continue
    }

    const packageName = `${SCOPE_PREFIX}${scope}`

    if (!packageChanges.has(packageName)) {
      packageChanges.set(packageName, { bump: 'patch', descriptions: [] })
    }

    const pkg = /** @type {{ bump: BumpType, descriptions: string[] }} */ (
      packageChanges.get(packageName)
    )

    // Upgrade bump if needed (patch < minor < major)
    if (BUMP_ORDER[bump] > BUMP_ORDER[pkg.bump]) {
      pkg.bump = bump
    }

    pkg.descriptions.push(subject)
    console.log(`  ${type}(${scope}): ${subject} -> ${bump}`)
  }

  if (packageChanges.size === 0) {
    console.log('\nNo packages need change files')
    process.exit(0)
  }

  console.log(
    `\nGenerating change files for ${packageChanges.size} package(s):\n`
  )

  // Generate beachball change files using the CLI
  for (const [packageName, { bump, descriptions }] of packageChanges) {
    const message = descriptions.join('; ')

    console.log(`  ${packageName}: ${bump}`)
    for (const desc of descriptions) {
      console.log(`    - ${desc}`)
    }

    if (!dryRun) {
      await $`yarn beachball change --no-commit --package ${packageName} --type ${bump} --message ${message}`
      console.log(`    Created change file`)
    } else {
      console.log(`    (dry-run, not created)`)
    }
    console.log()
  }

  if (dryRun) {
    console.log('Dry run complete. No files were created.')
  } else {
    // Stage and commit change files, then push
    await $`git add change/`
    await $`git commit -m ${'chore: add change files'}`
    await $`git push`
    console.log('Done. Change files committed and pushed.')
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
