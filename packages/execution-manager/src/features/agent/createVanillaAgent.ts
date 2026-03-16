import type { AgentFactory } from './AgentFactory.js'
import { createEpisodicAgent } from './EpisodicAgent.js'

/**
 * Default vanilla agent factory — wraps an executor in an EpisodicAgent
 * with no-op lifecycle hooks and no writeback. Ignores agentFactoryOptions
 * and context.
 */
export const createVanillaAgent: AgentFactory = (
  executor,
  _agentFactoryOptions,
  _context
) => createEpisodicAgent(executor)
