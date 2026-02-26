/**
 * JSDoc type definitions for release workflow scripts.
 * @module types
 */

/**
 * @typedef {'OPEN' | 'MERGED' | 'CLOSED'} PRState
 */

/**
 * @typedef {Object} PRInfo
 * @property {number} number
 * @property {PRState} state
 * @property {string} title
 * @property {string} url
 */

/**
 * @typedef {'queued' | 'in_progress' | 'completed'} WorkflowStatus
 */

/**
 * @typedef {'success' | 'failure' | 'cancelled' | null} WorkflowConclusion
 */

/**
 * @typedef {Object} WorkflowInfo
 * @property {number} id
 * @property {WorkflowStatus} status
 * @property {WorkflowConclusion} conclusion
 */

/**
 * @typedef {'no_pr' | 'pr_open' | 'pr_closed' | 'release_in_progress' | 'release_failed' | 'complete'} StatusSummary
 */

/**
 * @typedef {Object} StatusResult
 * @property {string} branch
 * @property {PRInfo | null} pr
 * @property {WorkflowInfo | null} workflow
 * @property {StatusSummary} summary
 */

/**
 * @typedef {Object} GHResult
 * @property {boolean} success
 * @property {string} stdout
 * @property {string} stderr
 * @property {number} exitCode
 */

export {}
